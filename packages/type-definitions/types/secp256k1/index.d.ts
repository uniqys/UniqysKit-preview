declare module 'secp256k1' {

  export const path: string;

  export function ecdh(): any;

  export function ecdhUnsafe(): any;

  export function privateKeyExport(): any;

  export function privateKeyImport(): any;

  export function privateKeyModInverse(): any;

  export function privateKeyNegate(): any;

  export function privateKeyTweakAdd(): any;

  export function privateKeyTweakMul(): any;

  export function privateKeyVerify(privateKey: Buffer): boolean;

  export function publicKeyCombine(): any;

  export function publicKeyConvert(): any;

  export function publicKeyCreate(privateKey: Buffer, compressed?: boolean): Buffer;

  export function publicKeyTweakAdd(): any;

  export function publicKeyTweakMul(): any;

  export function publicKeyVerify(): any;

  export function recover(message: Buffer, signature: Buffer, recovery: number, compressed?: boolean): Buffer;

  export function sign(message: Buffer, privateKey: Buffer, options?: any): { signature: Buffer, recovery: number };

  export function signatureExport(): any;

  export function signatureImport(): any;

  export function signatureImportLax(): any;

  export function signatureNormalize(): any;

  export function verify(): any;

  export namespace ecdh {
    const prototype: {
    };

  }

  export namespace ecdhUnsafe {
    const prototype: {
    };

  }

  export namespace privateKeyExport {
    const prototype: {
    };

  }

  export namespace privateKeyImport {
    const prototype: {
    };

  }

  export namespace privateKeyModInverse {
    const prototype: {
    };

  }

  export namespace privateKeyNegate {
    const prototype: {
    };

  }

  export namespace privateKeyTweakAdd {
    const prototype: {
    };

  }

  export namespace privateKeyTweakMul {
    const prototype: {
    };

  }

  export namespace privateKeyVerify {
    const prototype: {
    };

  }

  export namespace publicKeyCombine {
    const prototype: {
    };

  }

  export namespace publicKeyConvert {
    const prototype: {
    };

  }

  export namespace publicKeyCreate {
    const prototype: {
    };

  }

  export namespace publicKeyTweakAdd {
    const prototype: {
    };

  }

  export namespace publicKeyTweakMul {
    const prototype: {
    };

  }

  export namespace publicKeyVerify {
    const prototype: {
    };

  }

  export namespace recover {
    const prototype: {
    };

  }

  export namespace sign {
    const prototype: {
    };

  }

  export namespace signatureExport {
    const prototype: {
    };

  }

  export namespace signatureImport {
    const prototype: {
    };

  }

  export namespace signatureImportLax {
    const prototype: {
    };

  }

  export namespace signatureNormalize {
    const prototype: {
    };

  }

  export namespace verify {
    const prototype: {
    };

  }

}
