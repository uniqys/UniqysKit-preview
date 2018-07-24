import { Address, Hash, Hashable, Signature } from '@uniqys/signature'
import { MerkleTree } from './merkle-tree'
import { Serializable, UInt64, BufferWriter, BufferReader, List, serialize } from '@uniqys/serialize'

export class Validator implements Hashable, Serializable {
  public get hash (): Hash {
    return Hash.fromData(serialize(this))
  }
  constructor (
    public readonly address: Address,
    public readonly power: number
  ) {
  }
  public static deserialize (reader: BufferReader): Validator {
    const address = Address.deserialize(reader)
    const power = UInt64.deserialize(reader)
    return new Validator(address, power)
  }
  public serialize (writer: BufferWriter) {
    this.address.serialize(writer)
    UInt64.serialize(this.power, writer)
  }
}

export class ValidatorSet implements Hashable, Serializable {
  public get hash () { return MerkleTree.root(this.validators) }
  public readonly allPower: number
  private readonly power: Map<string, number>
  constructor (
    public readonly validators: Validator[]
  ) {
    this.power = new Map(validators.map<[string, number]>(v => [v.address.toString(), v.power]))
    let sum = 0
    for (const v of validators) { sum += v.power }
    this.allPower = sum
  }
  public static deserialize (reader: BufferReader): ValidatorSet {
    return new ValidatorSet(List.deserialize(Validator.deserialize)(reader))
  }
  public serialize (writer: BufferWriter) {
    List.serialize<Validator>((v, w) => v.serialize(w))(this.validators, writer)
  }

  public exists (address: Address) {
    return this.power.get(address.toString()) !== undefined
  }

  public powerOf (address: Address) {
    return this.power.get(address.toString())!
  }
}

export class Consensus implements Hashable, Serializable {
  public get hash () { return MerkleTree.root(this.signatures) }
  constructor (
    public readonly signatures: Signature[]
  ) { }
  public static deserialize (reader: BufferReader): Consensus {
    return new Consensus(List.deserialize(Signature.deserialize)(reader))
  }
  public serialize (writer: BufferWriter) {
    List.serialize<Signature>((s, w) => s.serialize(w))(this.signatures, writer)
  }

  public validate (messageHash: Hash, validatorSet: ValidatorSet) {
    let power = 0
    for (const sign of this.signatures) {
      const address = Address.fromPublicKey(sign.recover(messageHash))
      if (!validatorSet.exists(address)) { throw new Error('not exists in validator set') }
      power += validatorSet.powerOf(address)
    }
    if (!(power * 3 >= validatorSet.allPower * 2)) { throw new Error('signatures power less than 2/3 validator set power') }
  }
}
