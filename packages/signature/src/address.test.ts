import { Address } from './address'
import { KeyPair } from './cryptography'
import { serialize, deserialize } from '@uniqys/serialize'

describe('Address', () => {
  it('can be made from public key', () => {
    expect(() => { Address.fromPublicKey(new KeyPair().publicKey) }).not.toThrow()
  })
  it('can be made from key pair shorthand', () => {
    const keyPair = new KeyPair()
    expect(keyPair.address.toString()).toBe(Address.fromPublicKey(keyPair.publicKey).toString())
  })
  it('has string representation', () => {
    const address = new KeyPair().address
    const stringRepresentation = address.toString()
    expect(Address.fromString(stringRepresentation).equals(address)).toBeTruthy()
  })
  it('is serializable', () => {
    const address = Address.fromPublicKey(new KeyPair().publicKey)
    expect(deserialize(serialize(address), Address.deserialize).equals(address)).toBeTruthy()
  })
})
