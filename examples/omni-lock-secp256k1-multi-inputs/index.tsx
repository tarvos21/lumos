import React, { useEffect, useState } from "react";
import { helpers, Script } from "@ckb-lumos/lumos";
import { key } from '@ckb-lumos/hd';
import { ec as EC } from "elliptic";
import ReactDOM from "react-dom";
import { capacityOf, CONFIG, buildTransfer, signByPrivateKey, sendTransaction } from "./lib";

const app = document.getElementById("root");
ReactDOM.render(<App />, app);

const ec = new EC("secp256k1");

interface ConnectProps {
  onConnect: (privateKey: string, index: number) => any;
  addressIndex: number;
}

export function Connect({ onConnect, addressIndex }: ConnectProps) {
  const [privateKey, setPrivateKey] = useState("0x96150d7ce108a2dab7c7689d773422fa1a272f85f0ddf4c5a3d807b2b145d3ba");

  useEffect(() => {
    if(addressIndex === 2) {
      setPrivateKey("0xff23deb2cb863c8c51478a14e51a8ed1b0da7fcefbb5fedfc5b0bbf9ac29f132");
    }
  },[privateKey])

  const genRandomKeyPair = () => {
    const key = ec.genKeyPair();
    setPrivateKey(`0x${key.getPrivate().toString("hex")}`);
  };

  return (
    <div>
      <input value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} placeholder="0x..." />

      <button 
        onClick={genRandomKeyPair} 
        style={{ marginLeft: 8 }}
        disabled={addressIndex === 2}
      >
        generatePrivateKey
      </button>
      <button
        onClick={() => onConnect(privateKey, addressIndex)}
        disabled={privateKey === ""}
        style={{ marginLeft: 8 }}
      >
        Connect
      </button>
    </div>
  );
}

export function App() {
  const [privateKey1, setPrivateKey1] = useState("");
  const [omniAddr1, setOmniAddr1] = useState("");
  const [omniLock1, setOmniLock1] = useState<Script>();
  const [balance1, setBalance1] = useState("-");

  const [privateKey2, setPrivateKey2] = useState("");
  const [omniAddr2, setOmniAddr2] = useState("");
  const [omniLock2, setOmniLock2] = useState<Script>();
  const [balance2, setBalance2] = useState("-");

  const [transferAddr, setTransferAddress] = useState("ckt1q3uljza4azfdsrwjzdpea6442yfqadqhv7yzfu5zknlmtusm45hpuq9tv9dma3hzzt8k7a7ekqpkja4saaf2fecq3l3xmk");
  const [transferAmount1, setTransferAmount1] = useState("9000000000");
  const [transferAmount2, setTransferAmount2] = useState("11000000000");

  const [isSendingTx, setIsSendingTx] = useState(false);
  const [txHash, setTxHash] = useState("");

  function connectByPrivateKey(pk: string, index: number) {
    const pubkeyHash = key.privateKeyToBlake160(pk);

    const omniLock: Script = {
      code_hash: CONFIG.SCRIPTS.OMNI_LOCK.CODE_HASH,
      hash_type: CONFIG.SCRIPTS.OMNI_LOCK.HASH_TYPE,
      // omni flag       pubkey hash   omni lock flags
      // chain identity   eth addr      function flag()
      // 00: Nervos       👇            00: owner
      // 01: Ethereum     👇            01: administrator
      //      👇          👇            👇
      args: `0x00${pubkeyHash.substring(2)}00`,
    };

    console.log(index)
    console.log(omniLock)

    if (index === 1) {
      const omniAddr1 = helpers.generateAddress(omniLock);
      setPrivateKey1(pk);
      setOmniAddr1(omniAddr1);
      setOmniLock1(omniLock);
      capacityOf(omniAddr1).then(balance => setBalance1(balance.div(10 ** 8).toString() + " CKB"))
    }

    if (index === 2) {
      const omniAddr2 = helpers.generateAddress(omniLock);
      setPrivateKey2(pk);
      setOmniAddr2(omniAddr2);
      setOmniLock2(omniLock);
      capacityOf(omniAddr2).then(balance => setBalance2(balance.div(10 ** 8).toString() + " CKB"))
    }
  }

  async function transfer(): Promise<string> {
    const unsigned = await buildTransfer([
      { amount: transferAmount1, from: omniAddr1, to: transferAddr },
      { amount: transferAmount2, from: omniAddr2, to: transferAddr },
    ]);

    const signed1 = await signByPrivateKey(unsigned, privateKey1, 1);
    console.log({signed1})
    const signed2 = await signByPrivateKey(signed1, privateKey2, 2);
    console.log({signed2})

    const txHash = await sendTransaction(signed2)

    return txHash;
  }

  async function onTransfer() {
    if (isSendingTx) return;
    setIsSendingTx(true);
  
    transfer()
      .then(setTxHash)
      .catch((e) => alert(e.message || JSON.stringify(e)))
      .finally(() => setIsSendingTx(false));
  }

  if (!omniAddr1 || !omniAddr2) return (
    <>
      <Connect onConnect={(key: string) => connectByPrivateKey(key, 1)} addressIndex={1} />
      <Connect onConnect={(key: string) => connectByPrivateKey(key, 2)} addressIndex={2}/>
    </>
  )

  return (
    <div>
      <ul>
        <li>privateKey 1: {privateKey1}</li>
        <li>Nervos Address(Omni) 1: {omniAddr1}</li>
        <li>
          Current Omni lock script 1:
          <pre>{JSON.stringify(omniLock1, null, 2)}</pre>
        </li>

        <li>Balance 1: {balance1}</li>

        <button onClick={() => setOmniAddr1('')}>disconnect</button>
      </ul>
      <ul>
        <li>privateKey 2: {privateKey2}</li>
        <li>Nervos Address(Omni) 2: {omniAddr2}</li>
        <li>
          Current Omni lock script 2:
          <pre>{JSON.stringify(omniLock2, null, 2)}</pre>
        </li>

        <li>Balance 2: {balance2}</li>

        <button onClick={() => setOmniAddr2('')}>disconnect</button>
      </ul>

      <div>
        <h2>Transfer to</h2>
        <label htmlFor="address">Address</label>&nbsp;
        <input value={transferAddr} onChange={(e) => setTransferAddress(e.target.value)} placeholder="ckt1..." />

        <br />
        <label htmlFor="amount">Amount 1</label>
        &nbsp;
        <input value={transferAmount1} onChange={(e) => setTransferAmount1(e.target.value)} placeholder="shannon" />
        <br />
        <label htmlFor="amount">Amount 2</label>
        &nbsp;
        <input value={transferAmount2} onChange={(e) => setTransferAmount2(e.target.value)} placeholder="shannon" />
        <br />

        <button onClick={onTransfer} disabled={isSendingTx}>
          Transfer
        </button>
        <p>Tx Hash: {txHash !== '' && <a target='_blank' href={`https://explorer.nervos.org/aggron/transaction/${txHash}`}>{txHash}</a>} </p>
      </div>
    </div>
  );
}
