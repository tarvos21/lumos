"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.Secp256k1Blake160SignableScript = exports.PrivateKeySigner = void 0;
var lumos_1 = require("@ckb-lumos/lumos");
var PrivateKeySigner = /** @class */ (function () {
    function PrivateKeySigner(privateKey) {
        this._privateKey = privateKey;
    }
    PrivateKeySigner.prototype.sign = function (message) {
        return lumos_1.hd.key.signRecoverable(message, this._privateKey);
    };
    return PrivateKeySigner;
}());
exports.PrivateKeySigner = PrivateKeySigner;
var Secp256k1Blake160SignableScript = /** @class */ (function () {
    function Secp256k1Blake160SignableScript(userConfig, userSigner) {
        this._config = userConfig || lumos_1.config.predefined.AGGRON4;
        this._signer = userSigner || new PrivateKeySigner("");
    }
    Secp256k1Blake160SignableScript.prototype.generateSigningEntries = function (txSkeleton) {
        var _a;
        var hasher = new lumos_1.utils.CKBHasher();
        // locks you want to sign
        var signLock = (_a = txSkeleton.inputs.get(0)) === null || _a === void 0 ? void 0 : _a.cell_output.lock;
        var signingEntries = lumos_1.commons.createP2PKHMessageGroup(txSkeleton, [signLock], {
            hasher: {
                update: function (message) { return hasher.update(message.buffer); },
                digest: function () { return new Uint8Array(hasher.digestReader().toArrayBuffer()); }
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
    };
    Secp256k1Blake160SignableScript.prototype.sign = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._signer.sign(message)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return Secp256k1Blake160SignableScript;
}());
exports.Secp256k1Blake160SignableScript = Secp256k1Blake160SignableScript;
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
