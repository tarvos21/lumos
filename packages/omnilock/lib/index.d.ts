import { HexString } from "@ckb-lumos/base";
import helpers from "@ckb-lumos/helpers";
import config from "@ckb-lumos/config-manager";
declare type SigningEntry = {
    index: number;
    message: HexString;
};
declare type Promisible<T> = T | Promise<T>;
declare type Signature = HexString;
interface SignableScript {
    generateSigningEntries: (tx: helpers.TransactionSkeletonType) => Promisible<SigningEntry[]>;
    sign: (message: HexString) => Promisible<Signature>;
}
interface Signer {
    sign: (message: HexString) => Promisible<Signature>;
}
export declare class PrivateKeySigner implements Signer {
    private _privateKey;
    constructor(privateKey: HexString);
    sign(message: HexString): Signature;
}
export declare class Secp256k1Blake160SignableScript implements SignableScript {
    private readonly _config;
    private readonly _signer;
    constructor(userConfig?: config.Config, userSigner?: Signer);
    generateSigningEntries(txSkeleton: helpers.TransactionSkeletonType): SigningEntry[];
    sign(message: string): Promise<HexString>;
}
export {};
