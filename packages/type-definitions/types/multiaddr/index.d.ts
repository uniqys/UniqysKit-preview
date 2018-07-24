// too loose

declare module 'multiaddr' {

  export default class Multiaddr {
    constructor(args: any);

    decapsulate(addr: any): any;

    encapsulate(addr: any): any;

    equals(addr: any): any;

    fromStupidString(str: any): void;

    getPeerId(): any;

    inspect(): any;

    isThinWaistAddress(addr: any): any;

    nodeAddress(): any;

    protoCodes(): any;

    protoNames(): any;

    protos(): any;

    stringTuples(): any;

    toOptions(): any;

    toString(): any;

    tuples(): any;

    static fromNodeAddress(addr: any, transport: any): any;

    static isMultiaddr(obj: any): void;

    static isName(addr: any): any;

    static protocols(proto: any): any;

    static resolve(addr: any, callback: any): any;

  }
}
