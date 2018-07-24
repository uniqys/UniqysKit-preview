declare module 'keccak' {
  import { Hash } from "crypto";
  function keccak(algorithm: string, options?: {}): Hash;
  namespace keccak {
    const prototype: {
    };
  }
  export = keccak;
}
