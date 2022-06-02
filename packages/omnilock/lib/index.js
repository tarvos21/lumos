"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Secp256k1Blake160SignableScript = exports.PrivateKeySigner = void 0;

var _base = require("@ckb-lumos/base");

var _hd = _interopRequireDefault(require("@ckb-lumos/hd"));

var _configManager = _interopRequireDefault(require("@ckb-lumos/config-manager"));

var _commonScripts = require("@ckb-lumos/common-scripts");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class PrivateKeySigner {
  constructor(privateKey) {
    this._privateKey = privateKey;
  }

  sign(message) {
    return _hd.default.key.signRecoverable(message, this._privateKey);
  }

}

exports.PrivateKeySigner = PrivateKeySigner;

class Secp256k1Blake160SignableScript {
  constructor(userConfig, userSigner) {
    this._config = userConfig || _configManager.default.predefined.AGGRON4;
    this._signer = userSigner || new PrivateKeySigner("");
  }

  generateSigningEntries(txSkeleton) {
    var _txSkeleton$inputs$ge;

    const hasher = new _base.utils.CKBHasher(); // locks you want to sign

    const signLock = (_txSkeleton$inputs$ge = txSkeleton.inputs.get(0)) === null || _txSkeleton$inputs$ge === void 0 ? void 0 : _txSkeleton$inputs$ge.cell_output.lock;
    const signingEntries = (0, _commonScripts.createP2PKHMessageGroup)(txSkeleton, [signLock], {
      hasher: {
        update: message => hasher.update(message.buffer),
        digest: () => new Uint8Array(hasher.digestReader().toArrayBuffer())
      }
    });
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

  async sign(message) {
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


exports.Secp256k1Blake160SignableScript = Secp256k1Blake160SignableScript;
//# sourceMappingURL=index.js.map