import { Hash, KeyPair, Signature } from './cryptography'
import { Bytes32 } from '@uniqys/types'
import { serialize, deserialize } from '@uniqys/serialize'

/* tslint:disable:no-unused-expression */
describe('Hash', () => {
  it('serialize and deserialize', () => {
    const hash = Hash.fromData(Buffer.from('test'))
    expect(deserialize(serialize(hash), Hash.deserialize)).toEqual(hash)
  })
  it('is keccak256', () => {
    expect(Hash.fromData('The quick brown fox jumps over the lazy dog').buffer.toString('hex'))
      .toBe('4d741b6f1eb29cb2a9b9911c82f56fa8d73b04959d3d9d222895df6c0b28aa15')
  })
  it('can convert to hex string', () => {
    const hash = Hash.fromData('The quick brown fox jumps over the lazy dog')
    expect(Hash.fromHexString(hash.toHexString())).toEqual(hash)
  })
})

describe('KeyPair', () => {
  it('can be made by specific private key', () => {
    const privateKey = new Bytes32(Buffer.from('This is very awesome private key'))
    expect(() => { new KeyPair(privateKey) }).not.toThrow()
  })
  it('can be generate address', () => {
    const privateKey = new Bytes32(Buffer.from('This is very awesome private key'))
    const keyPair = new KeyPair(privateKey)
    expect(keyPair.address.toString()).toEqual('81a451cda4e9e82dfc4fef9cfe291c27aa57a057')
  })
  it('can be made by random generated key', () => {
    expect(() => { new KeyPair() }).not.toThrow()
  })
})

describe('Signature', () => {
  it('serialize and deserialize', () => {
    const signature = new Signature(Buffer.alloc(65))
    expect(deserialize(serialize(signature), Signature.deserialize)).toEqual(signature)
  })
  it('is equatable', () => {
    const message1 = Hash.fromData('The quick brown fox jumps over the lazy dog')
    const message2 = Hash.fromData('The quick brown fox jumps over the lazy dog.')
    const key = new KeyPair()
    const sig1 = key.sign(message1)
    const sig2 = key.sign(message1)
    const sig3 = key.sign(message2)
    expect(sig1.equals(sig2)).toBeTruthy()
    expect(sig1.equals(sig3)).not.toBeTruthy()
  })
  it('throw error when wrong size', () => {
    expect(() => { new Signature(Buffer.alloc(64)) }).toThrow()
  })
  it('sign message and recover', () => {
    const message = Hash.fromData('The quick brown fox jumps over the lazy dog')
    const key = new KeyPair()
    expect(key.sign(message).recover(message).equals(key.publicKey)).toBeTruthy()
  })
  it('can not recover invalid signature', () => {
    const message = Hash.fromData('The quick brown fox jumps over the lazy dog')
    // random key can recover after modified rarely
    const key = new KeyPair(new Bytes32(Buffer.from('cbfde2698ab8d8d3f2ddfea748d972bcc9cd5b74f3152c13d51d9c576e0a15f5', 'hex')))
    const sign = key.sign(message)
    sign.signature.buffer.write('modify')
    expect(() => { sign.recover(message) }).toThrow('couldn\'t recover public key from signature')
  })
})
