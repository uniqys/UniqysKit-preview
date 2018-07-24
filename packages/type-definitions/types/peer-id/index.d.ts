
declare module 'peer-id' {
  class PeerId {
    constructor(id: Buffer, privKey: any, pubKey: any);

    readonly id: Buffer;
    privKey: any;
    pubKey: any;
    marshalPubKey(): Buffer;
    marshalPrivKey(): Buffer;
    toPrint(): { id: string, privKey: string, pubKey: string }
    toJSON(): { id: string, privKey: string, pubKey: string }
    toHexString(): string;
    toBytes(): Buffer;
    toB58String(): string;
    isEqual(id: Buffer | PeerId): boolean;
    isValid(callback: (err: Error | null) => void): void;

    static create(opts: any, callback: (err: Error | null, peerId: PeerId) => void): void;
    static create(callback: (err: Error | null, peerId: PeerId) => void): void;

    static createFromB58String(str: string): PeerId;
    static createFromBytes(buf: Buffer): PeerId;
    static createFromHexString(str: string): PeerId;
    static createFromJSON(obj: { id: string, privKey: string, pubKey: string }, callback: (err: Error | null, peerId: PeerId) => void): void;
    static createFromPrivKey(key: Buffer | string, callback: (err: Error | null, peerId: PeerId) => void): void;
    static createFromPubKey(key: Buffer | string, callback: (err: Error | null, peerId: PeerId) => void): void;
    static isPeerId(peerId: any): boolean;
  }
  export = PeerId;
}
