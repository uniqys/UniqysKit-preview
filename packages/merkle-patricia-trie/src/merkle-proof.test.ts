import { Operation, MerkleProof } from './merkle-proof'
import { Hash } from '@uniqys/signature'

describe('Merkle Proof', () => {
  const foo = Buffer.from('foo')
  const buzz = Buffer.from('buzz')
  it('makes operation stream', () => {
    const proof = new MerkleProof()
    proof.load(foo)
    proof.value(buzz)
    proof.hash()
    expect(proof.operations).toEqual([
      new Operation.Load(foo),
      new Operation.Value(buzz),
      new Operation.Hash(7) // 'foo' + 'buzz'
    ])
  })
  it('calculates and verify root hash', () => {
    const proof = new MerkleProof()
    proof.load(foo)
    proof.value(buzz)
    proof.hash()
    const root = Hash.fromData(Buffer.concat([foo, buzz]))
    expect(proof.verify(root)).toBeTruthy()
  })
  it('can convert to binary representation', async () => {
    const proof = new MerkleProof()
    proof.load(foo)
    proof.value(buzz)
    proof.hash()
    const binary = proof.toBinary()
    expect(Array.from(binary.raw)).toEqual([
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, // load 3 bytes
      0x66, 0x6f, 0x6f, // 'foo'
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, // load 4 bytes
      0x62, 0x75, 0x7a, 0x7a, // 'buzz'
      0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xf9 // calculate hash of 7 bytes
    ])
    expect(binary.valueOffsets).toEqual([11]) // start offset of value(length + data)
  })
})
