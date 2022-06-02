import {
  PrivateKeySigner,
  Secp256k1Blake160SignableScript,
} from "../src/index";
import {
  HexString,
  helpers,
  core,
  toolkit,
  config,
  BI,
  hd,
  RPC,
  Indexer,
  Cell,
} from "@ckb-lumos/lumos";
import pTimeout from "p-timeout";
import { SerializeRcLockWitnessLock } from "../generated/omni";

const CONFIG = config.createConfig({
  PREFIX: "ckt",
  SCRIPTS: {
    ...config.predefined.AGGRON4.SCRIPTS,
    // for more about Omni lock, please check https://github.com/XuJiandong/docs-bank/blob/master/omni_lock.md
    OMNI_LOCK: {
      CODE_HASH:
        "0x79f90bb5e892d80dd213439eeab551120eb417678824f282b4ffb5f21bad2e1e",
      HASH_TYPE: "type",
      TX_HASH:
        "0x9154df4f7336402114d04495175b37390ce86a4906d2d4001cf02c3e6d97f39c",
      INDEX: "0x0",
      DEP_TYPE: "code",
    },
  },
});

const ALICE_PRIVATE_KEY =
  "0x96150d7ce108a2dab7c7689d773422fa1a272f85f0ddf4c5a3d807b2b145d3ba";
// const ALICE_ARGS = "0xf1251ee1c665f8771834983dcdb355d9ce1afd51";
// const ALICE_ADDRESS = "ckt1q3uljza4azfdsrwjzdpea6442yfqadqhv7yzfu5zknlmtusm45hpuq9053a0r4xs9628clzljd2p3vhgvv4nv8sqn5eakw";

// const BOB_PRIVATE_KEY = "0xff23deb2cb863c8c51478a14e51a8ed1b0da7fcefbb5fedfc5b0bbf9ac29f132";
// const BOB_ARGS = "0x521571da5d51794e3c7ed1d092eef6c652584a5a";

const BOB_ADDRESS =
  "ckt1q3uljza4azfdsrwjzdpea6442yfqadqhv7yzfu5zknlmtusm45hpuq9tv9dma3hzzt8k7a7ekqpkja4saaf2fecq3l3xmk";

config.initializeConfig(CONFIG);

/*
const capacityOf = async (address: string): Promise<BI> => {
  const collector = indexer.collector({
    lock: helpers.parseAddress(address),
  });

  let balance = BI.from(0);
  for await (const cell of collector.collect()) {
    balance = balance.add(cell.cell_output.capacity);
  }

  return balance;
}
*/

const getBalance = async (lockArgs: string) => {
  const CKB_RPC_URL = "https://testnet.ckb.dev/rpc";
  const CKB_INDEXER_URL = "https://testnet.ckb.dev/indexer";
  const rpc = new RPC(CKB_RPC_URL);
  const indexer = new Indexer(CKB_INDEXER_URL, CKB_RPC_URL);
  const ckbCollector = indexer.collector({
    lock: {
      code_hash: config.predefined.AGGRON4.SCRIPTS.SECP256K1_BLAKE160.CODE_HASH,
      hash_type: config.predefined.AGGRON4.SCRIPTS.SECP256K1_BLAKE160.HASH_TYPE,
      args: lockArgs,
    },
    type: "empty",
    outputDataLenRange: ["0x0", "0x1"],
  });

  let balance = BI.from(0);
  for await (const cell of ckbCollector.collect()) {
    balance = balance.add(cell.cell_output.capacity);
  }
  return balance.div(100000000).toString();
};

const transferCKB = async (
  senderPrivateKey: HexString,
  receiverLockArgs: string,
  capacity: BI
) => {
  const userConfig = config.createConfig({
    PREFIX: "ckt",
    SCRIPTS: {
      ...config.predefined.AGGRON4.SCRIPTS,
      // for more about Omni lock, please check https://github.com/XuJiandong/docs-bank/blob/master/omni_lock.md
      OMNI_LOCK: {
        CODE_HASH:
          "0x79f90bb5e892d80dd213439eeab551120eb417678824f282b4ffb5f21bad2e1e",
        HASH_TYPE: "type",
        TX_HASH:
          "0x9154df4f7336402114d04495175b37390ce86a4906d2d4001cf02c3e6d97f39c",
        INDEX: "0x0",
        DEP_TYPE: "code",
      },
    },
  });

  const CKB_RPC_URL = "https://testnet.ckb.dev/rpc";
  const CKB_INDEXER_URL = "https://testnet.ckb.dev/indexer";
  const rpc = new RPC(CKB_RPC_URL);
  const indexer = new Indexer(CKB_INDEXER_URL, CKB_RPC_URL);

  const signer = new PrivateKeySigner(senderPrivateKey);

  const signableScript = new Secp256k1Blake160SignableScript(
    userConfig,
    signer
  );

  let txSkeleton = helpers.TransactionSkeleton({ cellProvider: indexer });

  const pubKey = hd.key.privateToPublic(senderPrivateKey);
  const args = hd.key.publicKeyToBlake160(pubKey);
  const lockScript = {
    code_hash: userConfig.SCRIPTS.SECP256K1_BLAKE160.CODE_HASH,
    hash_type: userConfig.SCRIPTS.SECP256K1_BLAKE160.HASH_TYPE,
    args,
  };
  const ckbCollector = indexer.collector({
    lock: lockScript,
    type: "empty",
    outputDataLenRange: ["0x0", "0x1"],
  });

  const collectedCells: Cell[] = [];
  let totalInput = BI.from(0);
  for await (const cell of ckbCollector.collect()) {
    collectedCells.push(cell);
    totalInput = totalInput.add(cell.cell_output.capacity);
  }

  const transferOutput: Cell = {
    cell_output: {
      capacity: capacity.mul(100000000).toHexString(),
      lock: {
        code_hash: userConfig.SCRIPTS.SECP256K1_BLAKE160.CODE_HASH,
        hash_type: userConfig.SCRIPTS.SECP256K1_BLAKE160.HASH_TYPE,
        args: receiverLockArgs,
      },
    },
    data: "0x",
  };

  const changeOutput: Cell = {
    cell_output: {
      capacity: totalInput.sub(capacity.mul(100000000)).sub(1000).toHexString(),
      lock: lockScript,
    },
    data: "0x",
  };

  txSkeleton = txSkeleton.update("inputs", (inputs) =>
    inputs.push(...collectedCells)
  );
  txSkeleton = txSkeleton.update("outputs", (outputs) =>
    outputs.push(transferOutput, changeOutput)
  );
  txSkeleton = txSkeleton.update("cellDeps", (cellDeps) =>
    cellDeps.push({
      out_point: {
        tx_hash: userConfig.SCRIPTS.SECP256K1_BLAKE160.TX_HASH,
        index: userConfig.SCRIPTS.SECP256K1_BLAKE160.INDEX,
      },
      dep_type: userConfig.SCRIPTS.SECP256K1_BLAKE160.DEP_TYPE,
    })
  );
  const witness = new toolkit.Reader(
    core.SerializeWitnessArgs(
      toolkit.normalizers.NormalizeWitnessArgs({
        lock: `0x${"00".repeat(65)}`,
      })
    )
  ).serializeJson();
  txSkeleton = txSkeleton.update("witnesses", (witnesses) =>
    witnesses.push(witness)
  );

  const signingEntries = signableScript.generateSigningEntries(txSkeleton);
  console.log("signingEntries", signingEntries);

  const message = signingEntries[0].message;
  const signature = await signableScript.sign(message);
  console.log("signature", signature);

  const tx = helpers.createTransactionFromSkeleton(txSkeleton);
  /*
  tx.witnesses[0] = new toolkit.Reader(
    core.SerializeWitnessArgs(toolkit.normalizers.NormalizeWitnessArgs({
      lock: signature,
    }))
  ).serializeJson();
  */
  tx.witnesses[0] = new toolkit.Reader(
    core.SerializeWitnessArgs({
      lock: SerializeRcLockWitnessLock({
        signature: new toolkit.Reader(signature),
      }),
    })
  ).serializeJson();
  console.log("tx is:", tx);

  console.log(
    "Before transfer, sender balance is:",
    await getBalance(lockScript.args),
    "reciver balance is:",
    await getBalance(receiverLockArgs)
  );

  const txHash = await rpc.send_transaction(tx, "passthrough");
  console.log("The transaction hash is", txHash);

  const checkTxCommitted = async () => {
    const txPromise = rpc.get_transaction(txHash);
    const tx = await pTimeout(txPromise, 10000);
    if (tx?.tx_status?.status === "committed") {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return false;
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const commited = await checkTxCommitted();
    if (commited) {
      console.log("The tx is commited!!!");
      break;
    }
    console.log("Waiting for the tx to be commited...");
  }

  console.log(
    "After transfer, sender balance is:",
    await getBalance(lockScript.args),
    "reciver balance is:",
    await getBalance(receiverLockArgs)
  );
};

transferCKB(ALICE_PRIVATE_KEY, BOB_ADDRESS, BI.from(100));

/*
test("addition", (t) => {
  const bi = BI.from(1);
  t.is(bi.add(2).toNumber(), 3);
  t.is(bi.add("2").toNumber(), 3);
  t.is(bi.add("0x2").toNumber(), 3);
});
*/
