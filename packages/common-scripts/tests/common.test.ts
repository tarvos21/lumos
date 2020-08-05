import test from "ava";
import common from "../src/common";
const { __tests__ } = common;
const { _commonTransfer } = __tests__;
import { CellProvider } from "./cell_provider";
import {
  TransactionSkeleton,
  TransactionSkeletonType,
} from "@ckb-lumos/helpers";
import { Cell } from "@ckb-lumos/base";
import { FromInfo, anyoneCanPay } from "../src";
import { predefined } from "@ckb-lumos/config-manager";
const { AGGRON4, LINA } = predefined;

import {
  bobSecpInputs,
  bobMultisigInputs,
  bobMultisigLockInputs,
  tipHeader,
  bobAcpCells,
  aliceAcpCells,
} from "./inputs";
import { bob, alice } from "./account_info";

const aliceInput: Cell = {
  cell_output: {
    capacity: "0x1d1a3543f00",
    lock: {
      code_hash:
        "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
      hash_type: "type",
      args: "0xe2193df51d78411601796b35b17b4f8f2cd85bd0",
    },
  },
  out_point: {
    tx_hash:
      "0x42300d78faea694e0e1c2316de091964a0d976a4ed27775597bad2d43a3e17da",
    index: "0x1",
  },
  block_hash:
    "0x156ecda80550b6664e5d745b6277c0ae56009681389dcc8f1565d815633ae906",
  block_number: "0x1929c",
  data: "0x",
};

const multisigInput: Cell = {
  cell_output: {
    capacity: "0xba37cb7e00",
    lock: {
      code_hash:
        "0x5c5069eb0857efc65e1bca0c07df34c31663b3622fd3876c876320fc9634e2a8",
      hash_type: "type",
      args: "0x56f281b3d4bb5fc73c751714af0bf78eb8aba0d8",
    },
  },
  out_point: {
    tx_hash:
      "0xc0018c999d6e7d1f830ea645d980a3a9c3c3832d12e72172708ce8461fc5821e",
    index: "0x1",
  },
  block_hash:
    "0x29c8f7d773ccd74724f95f562d049182c2461dd7459ebfc494b7bb0857e8c902",
  block_number: "0x1aed9",
  data: "0x",
};

const cellProvider = new CellProvider([aliceInput].concat([multisigInput]));
let txSkeleton: TransactionSkeletonType = TransactionSkeleton({ cellProvider });

const aliceAddress = "ckt1qyqwyxfa75whssgkq9ukkdd30d8c7txct0gqfvmy2v";

const fromInfo: FromInfo = {
  R: 0,
  M: 1,
  publicKeyHashes: ["0x36c329ed630d6ce750712a477543672adab57f4c"],
};

test("_commonTransfer, only alice", async (t) => {
  const amount: bigint = BigInt(20000 * 10 ** 8);
  const result = await _commonTransfer(
    txSkeleton,
    [aliceAddress],
    amount,
    BigInt(61 * 10 ** 8),
    { config: AGGRON4 }
  );
  txSkeleton = result.txSkeleton;

  t.is(txSkeleton.get("inputs").size, 1);
  t.is(txSkeleton.get("outputs").size, 0);
  t.is(result.capacity, amount - BigInt(aliceInput.cell_output.capacity));
});

test("_commonTransfer, alice and fromInfo", async (t) => {
  const amount: bigint = BigInt(20000 * 10 ** 8);
  const result = await _commonTransfer(
    txSkeleton,
    [aliceAddress, fromInfo],
    amount,
    BigInt(61 * 10 ** 8),
    { config: AGGRON4 }
  );
  txSkeleton = result.txSkeleton;

  const inputCapacity = txSkeleton
    .get("inputs")
    .map((i) => BigInt(i.cell_output.capacity))
    .reduce((result, c) => result + c, BigInt(0));

  t.is(txSkeleton.get("inputs").size, 2);
  t.is(txSkeleton.get("outputs").size, 0);
  t.is(result.capacity, BigInt(0));
  t.is(result.changeCapacity, inputCapacity - amount);
});

test("transfer, acp => acp", async (t) => {
  const cellProvider = new CellProvider([...bobAcpCells, ...aliceAcpCells]);
  let txSkeleton: TransactionSkeletonType = TransactionSkeleton({
    cellProvider,
  });

  const amount = BigInt(500 * 10 ** 8);
  txSkeleton = await common.transfer(
    txSkeleton,
    [bob.acpTestnetAddress],
    alice.acpTestnetAddress,
    amount,
    undefined,
    undefined,
    { config: AGGRON4 }
  );

  const sumOfInputCapacity = txSkeleton
    .get("inputs")
    .map((i) => BigInt(i.cell_output.capacity))
    .reduce((result, c) => result + c, BigInt(0));

  const sumOfOutputCapcity = txSkeleton
    .get("outputs")
    .map((o) => BigInt(o.cell_output.capacity))
    .reduce((result, c) => result + c, BigInt(0));

  t.is(sumOfInputCapacity, sumOfOutputCapcity);

  t.is(txSkeleton.get("witnesses").size, 2);

  t.is(txSkeleton.get("witnesses").get(0)!, "0x");

  const expectedMessage =
    "0xeb8b009b831ec0db5afb8a2b975e112099a8f2061e2a653c4b659ecb970277e4";

  txSkeleton = common.prepareSigningEntries(txSkeleton, { config: AGGRON4 });

  t.is(txSkeleton.get("signingEntries").size, 1);

  t.is(txSkeleton.get("signingEntries").get(0)!.message, expectedMessage);
});

test("lockScriptInfos", (t) => {
  common.__tests__.resetLockScriptInfos();
  t.is(common.__tests__.getLockScriptInfos().infos.length, 0);
  common.registerCustomLockScriptInfos([
    {
      code_hash: "",
      hash_type: "type",
      lockScriptInfo: anyoneCanPay,
    },
  ]);
  t.is(common.__tests__.getLockScriptInfos().infos.length, 1);

  common.__tests__.resetLockScriptInfos();
  t.is(common.__tests__.getLockScriptInfos().infos.length, 0);
  common.__tests__.generateLockScriptInfos({ config: AGGRON4 });
  t.is(common.__tests__.getLockScriptInfos().infos.length, 3);
  const configCodeHash = common.__tests__.getLockScriptInfos().configHashCode;
  t.not(configCodeHash, 0);

  // run again, won't change
  common.__tests__.generateLockScriptInfos({ config: AGGRON4 });
  t.is(common.__tests__.getLockScriptInfos().infos.length, 3);
  t.is(common.__tests__.getLockScriptInfos().configHashCode, configCodeHash);

  // using LINA
  common.__tests__.generateLockScriptInfos({ config: LINA });
  t.is(common.__tests__.getLockScriptInfos().infos.length, 2);
  t.not(common.__tests__.getLockScriptInfos().configHashCode, configCodeHash);
});

test("transfer secp => secp", async (t) => {
  const cellProvider = new CellProvider([...bobSecpInputs]);
  let txSkeleton: TransactionSkeletonType = TransactionSkeleton({
    cellProvider,
  });

  const amount = BigInt(600 * 10 ** 8);
  txSkeleton = await common.transfer(
    txSkeleton,
    [bob.testnetAddress],
    aliceAddress,
    amount,
    undefined,
    undefined,
    { config: AGGRON4 }
  );

  const sumOfInputCapacity = txSkeleton
    .get("inputs")
    .map((i) => BigInt(i.cell_output.capacity))
    .reduce((result, c) => result + c, BigInt(0));

  const sumOfOutputCapcity = txSkeleton
    .get("outputs")
    .map((o) => BigInt(o.cell_output.capacity))
    .reduce((result, c) => result + c, BigInt(0));

  t.is(sumOfInputCapacity, sumOfOutputCapcity);

  t.is(txSkeleton.get("inputs").size, 1);
  t.is(txSkeleton.get("outputs").size, 2);
  t.is(BigInt(txSkeleton.get("outputs").get(0)!.cell_output.capacity), amount);

  t.is(txSkeleton.get("witnesses").size, 1);

  const expectedMessages = [
    "0x997f7d53307a114104b37c0fcdef97240d250d468189e71632d79e1c3b20a4f9",
  ];

  txSkeleton = common.prepareSigningEntries(txSkeleton, { config: AGGRON4 });

  t.deepEqual(
    txSkeleton
      .get("signingEntries")
      .sort((a, b) => a.index - b.index)
      .map((s) => s.message)
      .toArray(),
    expectedMessages
  );
});

test("transfer secp & multisig => secp", async (t) => {
  const cellProvider = new CellProvider([
    ...bobSecpInputs,
    ...bobMultisigInputs,
  ]);
  let txSkeleton: TransactionSkeletonType = TransactionSkeleton({
    cellProvider,
  });

  const amount = BigInt(1500 * 10 ** 8);
  txSkeleton = await common.transfer(
    txSkeleton,
    [bob.testnetAddress, bob.fromInfo],
    aliceAddress,
    amount,
    undefined,
    undefined,
    { config: AGGRON4 }
  );

  const sumOfInputCapacity = txSkeleton
    .get("inputs")
    .map((i) => BigInt(i.cell_output.capacity))
    .reduce((result, c) => result + c, BigInt(0));

  const sumOfOutputCapcity = txSkeleton
    .get("outputs")
    .map((o) => BigInt(o.cell_output.capacity))
    .reduce((result, c) => result + c, BigInt(0));

  t.is(sumOfInputCapacity, sumOfOutputCapcity);

  t.is(txSkeleton.get("inputs").size, 2);
  t.is(txSkeleton.get("outputs").size, 2);
  t.is(BigInt(txSkeleton.get("outputs").get(0)!.cell_output.capacity), amount);

  t.is(txSkeleton.get("witnesses").size, 2);

  const expectedMessages = [
    "0x45e7955cbc1ae0f8c2fbb3392a3afcea9ae1ae83c48e4355f131d751325ea615",
    "0x051a18a11dacfd6573a689328ea7ee0cc3f2533de9c15e4f9e12f0e4a6e9691c",
  ];

  txSkeleton = common.prepareSigningEntries(txSkeleton, { config: AGGRON4 });

  t.deepEqual(
    txSkeleton
      .get("signingEntries")
      .sort((a, b) => a.index - b.index)
      .map((s) => s.message)
      .toArray(),
    expectedMessages
  );
});

test("transfer multisig lock => secp", async (t) => {
  const cellProvider = new CellProvider([...bobMultisigLockInputs]);
  let txSkeleton: TransactionSkeletonType = TransactionSkeleton({
    cellProvider,
  });

  class LocktimePoolCellCollector {
    async *collect() {
      yield {
        ...bobMultisigLockInputs[0],
        since: "0x0",
        depositBlockHash: undefined,
        withdrawBlockHash: undefined,
        sinceBaseValue: undefined,
      };
    }
  }

  const amount = BigInt(600 * 10 ** 8);
  txSkeleton = await common.transfer(
    txSkeleton,
    [bob.fromInfo],
    alice.testnetAddress,
    amount,
    undefined,
    tipHeader,
    {
      config: AGGRON4,
      LocktimePoolCellCollector,
    }
  );

  const sumOfInputCapacity = txSkeleton
    .get("inputs")
    .map((i) => BigInt(i.cell_output.capacity))
    .reduce((result, c) => result + c, BigInt(0));

  const sumOfOutputCapcity = txSkeleton
    .get("outputs")
    .map((o) => BigInt(o.cell_output.capacity))
    .reduce((result, c) => result + c, BigInt(0));

  t.is(sumOfInputCapacity, sumOfOutputCapcity);

  t.is(txSkeleton.get("inputs").size, 1);
  t.is(txSkeleton.get("outputs").size, 2);
  t.is(BigInt(txSkeleton.get("outputs").get(0)!.cell_output.capacity), amount);

  t.is(txSkeleton.get("witnesses").size, 1);

  const expectedMessages = [
    "0x54f766189f91dcf10a23833c5b1f0d318044c7237a2a703ad77ea46990190b8b",
  ];

  txSkeleton = common.prepareSigningEntries(txSkeleton, { config: AGGRON4 });

  t.deepEqual(
    txSkeleton
      .get("signingEntries")
      .sort((a, b) => a.index - b.index)
      .map((s) => s.message)
      .toArray(),
    expectedMessages
  );
});

test("transfer secp => acp", async (t) => {
  const cellProvider = new CellProvider([...bobSecpInputs, ...aliceAcpCells]);
  let txSkeleton: TransactionSkeletonType = TransactionSkeleton({
    cellProvider,
  });

  const amount = BigInt(600 * 10 ** 8);
  txSkeleton = await common.transfer(
    txSkeleton,
    [bob.testnetAddress],
    alice.acpTestnetAddress,
    amount,
    undefined,
    undefined,
    { config: AGGRON4 }
  );

  const sumOfInputCapacity = txSkeleton
    .get("inputs")
    .map((i) => BigInt(i.cell_output.capacity))
    .reduce((result, c) => result + c, BigInt(0));

  const sumOfOutputCapcity = txSkeleton
    .get("outputs")
    .map((o) => BigInt(o.cell_output.capacity))
    .reduce((result, c) => result + c, BigInt(0));

  t.is(sumOfInputCapacity, sumOfOutputCapcity);

  t.is(txSkeleton.get("inputs").size, 2);
  t.is(txSkeleton.get("outputs").size, 2);
  t.is(
    BigInt(txSkeleton.get("outputs").get(0)!.cell_output.capacity) -
      BigInt(aliceAcpCells[0]!.cell_output.capacity),
    amount
  );

  const expectedWitnesses = [
    "0x",
    "0x55000000100000005500000055000000410000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
  ];
  t.deepEqual(txSkeleton.get("witnesses").toJS(), expectedWitnesses);

  const expectedMessages = [
    "0x8bcb37f6a098de84cb2349f76e09af71e786ccac68a1f9b594468d3507d2449a",
  ];

  txSkeleton = common.prepareSigningEntries(txSkeleton, { config: AGGRON4 });

  t.deepEqual(
    txSkeleton
      .get("signingEntries")
      .sort((a, b) => a.index - b.index)
      .map((s) => s.message)
      .toArray(),
    expectedMessages
  );
});

test("transfer acp => secp, destroy", async (t) => {
  const cellProvider = new CellProvider([...bobAcpCells]);
  let txSkeleton: TransactionSkeletonType = TransactionSkeleton({
    cellProvider,
  });

  const amount = BigInt(1000 * 10 ** 8);
  txSkeleton = await common.transfer(
    txSkeleton,
    [
      {
        address: bob.acpTestnetAddress,
        destroyable: true,
      },
    ],
    bob.testnetAddress,
    amount,
    undefined,
    undefined,
    { config: AGGRON4 }
  );

  const sumOfInputCapacity = txSkeleton
    .get("inputs")
    .map((i) => BigInt(i.cell_output.capacity))
    .reduce((result, c) => result + c, BigInt(0));

  const sumOfOutputCapcity = txSkeleton
    .get("outputs")
    .map((o) => BigInt(o.cell_output.capacity))
    .reduce((result, c) => result + c, BigInt(0));

  t.is(sumOfInputCapacity, sumOfOutputCapcity);

  t.is(txSkeleton.get("inputs").size, 1);
  t.is(txSkeleton.get("outputs").size, 1);
  t.is(BigInt(txSkeleton.get("outputs").get(0)!.cell_output.capacity), amount);

  t.is(txSkeleton.get("witnesses").size, 1);

  const expectedMessages = [
    "0x023d971a9519417e2f3f49985f23bc641ab1adee4cafa063368a96242d0fba1a",
  ];

  txSkeleton = common.prepareSigningEntries(txSkeleton, { config: AGGRON4 });

  t.deepEqual(
    txSkeleton
      .get("signingEntries")
      .sort((a, b) => a.index - b.index)
      .map((s) => s.message)
      .toArray(),
    expectedMessages
  );
});
