import { MerkleTree } from './merkle-tree'
import { Hash, Hashable } from '@uniqys/signature'

class MockHashable implements Hashable {
  public readonly hash: Hash
  constructor (
    public readonly label: string
  ) {
    this.hash = Hash.fromData(label)
  }
}

const concatHash = (a: Hash, b: Hash): Hash => Hash.fromData(Buffer.concat([a.buffer, b.buffer]))

describe('MerkleTree', () => {
  it('root is H(a) if items are [a]', () => {
    const a = new MockHashable('The quick brown fox jumps over the lazy dog')
    const root = MerkleTree.root([a])
    expect(root.equals(a.hash)).toBeTruthy()
  })
  it('root is H(H(a);H(b)) if items are [a, b]', () => {
    const a = new MockHashable('a')
    const b = new MockHashable('b')
    const root = MerkleTree.root([a, b])
    expect(root.equals(concatHash(a.hash, b.hash))).toBeTruthy()
  })
  /*
  expect:
     __|__
   _|_    |
  |   |   c
  a   b
  */
  it('root is H(H(H(a);H(b));H(c)) if items are [a, b, c]', () => {
    const a = new MockHashable('a')
    const b = new MockHashable('b')
    const c = new MockHashable('c')
    const root = MerkleTree.root([a, b, c])
    expect(root.equals(concatHash(concatHash(a.hash, b.hash), c.hash))).toBeTruthy()
  })
  /*
  expect:
         ____|____
     ___|___      |
   _|_     _|_    e
  |   |   |   |
  a   b   c   d

  not:
        ___|____
     __|__     _|_
   _|_    |   |   |
  |   |   c   d   e
  a   b
  */
  it('root is H( H( H(H(a);H(b)) ; H(H(c);H(d)) ) ; H(e) ) if items are [a, b, c, d, e]', () => {
    const a = new MockHashable('a')
    const b = new MockHashable('b')
    const c = new MockHashable('c')
    const d = new MockHashable('d')
    const e = new MockHashable('e')
    const root = MerkleTree.root([a, b, c, d, e])
    expect(root.equals(
      concatHash(
        concatHash(
          concatHash(a.hash, b.hash),
          concatHash(c.hash, d.hash)
        ),
        e.hash
      )
    )).toBeTruthy()
  })
})
