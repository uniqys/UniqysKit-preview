import { Consensus, ValidatorSet, Validator } from './consensus'
import { Hash, KeyPair } from '@uniqys/signature'
import { Bytes32 } from '@uniqys/types'
import { serialize, deserialize } from '@uniqys/serialize'

/* tslint:disable:no-unused-expression */
describe('validator set', () => {
  let signer1: KeyPair
  let signer2: KeyPair
  let signer3: KeyPair
  let validatorSet: ValidatorSet
  beforeAll(() => {
    signer1 = new KeyPair()
    signer2 = new KeyPair()
    signer3 = new KeyPair()
    validatorSet = new ValidatorSet([
      new Validator(signer1.address, 10),
      new Validator(signer2.address, 19),
      new Validator(signer3.address, 1)
    ])
  })
  it('contain validators', () => {
    expect(validatorSet.validators.length).toBe(3)
  })
  it('has all power of validators', () => {
    expect(validatorSet.allPower).toBe(30)
  })
  it('can get power of validators', () => {
    expect(validatorSet.powerOf(signer1.address)).toBe(10)
    expect(validatorSet.powerOf(signer2.address)).toBe(19)
    expect(validatorSet.powerOf(signer3.address)).toBe(1)
  })
  it('is serializable', () => {
    expect(deserialize(serialize(validatorSet), ValidatorSet.deserialize).hash.equals(validatorSet.hash)).toBeTruthy()
  })
})

describe('consensus', () => {
  let hash: Hash
  let signer1: KeyPair
  let signer2: KeyPair
  let signer3: KeyPair
  let validatorSet: ValidatorSet
  beforeAll(() => {
    hash = Hash.fromData('foo')
    signer1 = new KeyPair()
    signer2 = new KeyPair()
    signer3 = new KeyPair()
    validatorSet = new ValidatorSet([
      new Validator(signer1.address, 10),
      new Validator(signer2.address, 19),
      new Validator(signer3.address, 1)
    ])
  })
  it('validate if it has more than 2/3 power signature', () => {
    const consensus = new Consensus([signer2.sign(hash), signer3.sign(hash)]) // 2/3
    expect(() => { consensus.validate(hash, validatorSet) }).not.toThrow()
  })
  it('can not validate if it has less than 2/3 power signature', () => {
    const consensus = new Consensus([signer2.sign(hash)]) // < 2/3
    expect(() => { consensus.validate(hash, validatorSet) }).toThrow()
  })
  it('can not validate if it has invalid signature', () => {
    const key = new KeyPair(new Bytes32(Buffer.from('cbfde2698ab8d8d3f2ddfea748d972bcc9cd5b74f3152c13d51d9c576e0a15f5', 'hex')))
    const sign = key.sign(hash)
    sign.signature.buffer.write('modify')
    const consensus = new Consensus([sign, signer2.sign(hash), signer3.sign(hash)]) // 2/3 valid sign
    expect(() => { consensus.validate(hash, validatorSet) }).toThrow()
  })
  it('can not validate if it has unknown signature', () => {
    const signer = new KeyPair()
    const consensus = new Consensus([signer.sign(hash), signer2.sign(hash), signer3.sign(hash)]) // 2/3 valid sign
    expect(() => { consensus.validate(hash, validatorSet) }).toThrow()
  })
  it('is serializable', () => {
    const signer = new KeyPair()
    const consensus = new Consensus([signer.sign(hash), signer2.sign(hash)]) // 2/3 valid sign
    expect(deserialize(serialize(consensus), Consensus.deserialize).hash.equals(consensus.hash)).toBeTruthy()
  })
})
