import { Hash, Hashable } from '@uniqys/signature'

// Basic Merkle Tree
// But, doesn't copy leaf for fix CVE-2012-2459
export namespace MerkleTree {
  export function root<T extends Hashable> (items: T[]): Hash {
    if (items.length === 0) { return Hash.fromData(Buffer.alloc(0)) }
    if (items.length === 1) { return items[0].hash }

    const split = splitPoint(items.length)
    return Hash.fromData(Buffer.concat([
      root(items.slice(0, split)).buffer,
      root(items.slice(split)).buffer
    ]))
  }
  function splitPoint (x: number): number {
    // it use: i = 2^n, i < x <= 2i
    // also an option: i = n, x/2 <= i < x/2 + 1
    let i = 1
    while (i < x) { i <<= 1 }
    return i >> 1
  }
}
