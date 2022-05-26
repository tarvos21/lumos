import {
  HexString,
  helpers,
  commons,
  config,
  utils,
  hd,
} from "@ckb-lumos/lumos";

type SigningEntry = {
  // script: Script;
  index: number;
  // witnessArgItem: HexString;
  // signatureOffset: number;
  // signatureLength: number;
  message: HexString;
};

type Promisible<T> = T | Promise<T>;

type Signature = HexString;

interface SignableScript {
  generateSigningEntries: (
    tx: helpers.TransactionSkeletonType
  ) => Promisible<SigningEntry[]>;
  sign: (message: HexString) => Promisible<Signature>;
}

interface Signer {
  sign: (message: HexString) => Promisible<Signature>;
}

export class PrivateKeySigner implements Signer {
  private _privateKey: HexString;

  constructor(privateKey: HexString) {
    this._privateKey = privateKey;
  }

  sign(message: HexString): Signature {
    return hd.key.signRecoverable(message, this._privateKey);
  }
}

export class Secp256k1Blake160SignableScript implements SignableScript {
  private readonly _config: config.Config;
  private readonly _signer: Signer;

  constructor(userConfig?: config.Config, userSigner?: Signer) {
    this._config = userConfig || (config.predefined.AGGRON4 as config.Config);
    this._signer = userSigner || new PrivateKeySigner("");
  }

  generateSigningEntries(
    txSkeleton: helpers.TransactionSkeletonType
  ): SigningEntry[] {
    const hasher = new utils.CKBHasher();
    // locks you want to sign
    const signLock = txSkeleton.inputs.get(0)?.cell_output.lock!;
    const signingEntries = commons.createP2PKHMessageGroup(
      txSkeleton,
      [signLock],
      {
        hasher: {
          update: (message) => hasher.update(message.buffer),
          digest: () => new Uint8Array(hasher.digestReader().toArrayBuffer()),
        },
      }
    );

    /*
    let signingEntries: SigningEntry[] = [];
    const template = this._config.SCRIPTS['SECP256K1_BLAKE160'];
    const tx = helpers.createTransactionFromSkeleton(txSkeleton);
    const txHash = utils.ckbHash(
      core.SerializeRawTransaction(toolkit.normalizers.NormalizeRawTransaction(tx))
    ).serializeJson();
    const inputs = txSkeleton.get("inputs");
    const witnesses = txSkeleton.get("witnesses");

    for (let i = 0; i < inputs.size; i++) {
      const input = inputs.get(i)!;
      if (
        template.CODE_HASH === input.cell_output.lock.code_hash &&
        template.HASH_TYPE === input.cell_output.lock.hash_type &&
        !processedArgs.has(input.cell_output.lock.args)
      ) {
        processedArgs = processedArgs.add(input.cell_output.lock.args);
        const lockHash = utils.computeScriptHash(input.cell_output.lock)
        const hasher = new utils.CKBHasher();
        hasher.update(txHash);
        if (i >= witnesses.size) {
          throw new Error(`Can't find witness for input ${i}, witnesses are ${witnesses.toArray()}`);
        }
        hashWitness(hasher, witnesses.get(i)!);
        for (let j = i + 1; j < inputs.size && j < witnesses.size; j++) {
          const otherInput = inputs.get(j)!;
          if (
            lockHash.toLowerCase() === utils.computeScriptHash(otherInput.cell_output.lock).toLowerCase()
          ) {
            hashWitness(hasher, witnesses.get(j)!);
          }
        }
        for (let j = inputs.size; j < witnesses.size; j++) {
          hashWitness(hasher, witnesses.get(j)!);
        }
        const signingEntry: SigningEntry = {
          script: input.cell_output.lock,
          index: i,
          witnessArgItem: witnesses.get(i)!,
          signatureOffset: 0,
          signatureLength: 65,
          message: hasher.digestHex(),
        };
        signingEntries = signingEntries.concat(signingEntry);
      }
    }
    */
    return signingEntries;
  }

  async sign(message: string): Promise<HexString> {
    return await this._signer.sign(message);
  }
}

/*
export function hashWitness(hasher: any, witness: HexString): void {
  const lengthBuffer = new ArrayBuffer(8);
  const view = new DataView(lengthBuffer);
  const witnessHexString = BI.from(new toolkit.Reader(witness).length()).toString(16);
  if (witnessHexString.length <= 8) {
    view.setUint32(0, Number("0x" + witnessHexString), true);
    view.setUint32(4, Number("0x" + "00000000"), true);
  }

  if (witnessHexString.length > 8 && witnessHexString.length <= 16) {
    view.setUint32(0, Number("0x" + witnessHexString.slice(-8)), true);
    view.setUint32(4, Number("0x" + witnessHexString.slice(0, -8)), true);
  }
  hasher.update(lengthBuffer);
  hasher.update(witness);
}
*/
