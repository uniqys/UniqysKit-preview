import { BufferReader, BufferWriter, Serializable, UInt64 } from '@uniqys/serialize'

export class Account implements Serializable {
  public static readonly default = new Account(0, 0)
  constructor (
    public readonly nonce: number,
    public readonly balance: number
    // NOTE: support multi tokens?
    // e.g. private readonly tokens: Map<id, balance>
  ) {}

  public static deserialize (reader: BufferReader): Account {
    const nonce = UInt64.deserialize(reader)
    const balance = UInt64.deserialize(reader)
    return new Account(nonce, balance)
  }
  public serialize (writer: BufferWriter) {
    UInt64.serialize(this.nonce, writer)
    UInt64.serialize(this.balance, writer)
  }
  public incrementNonce () {
    return new Account(this.nonce + 1, this.balance)
  }
  public setBalance (balance: number) {
    return new Account(this.nonce, balance)
  }
  public decreaseBalance (value: number) {
    if (this.balance < value) throw new Error('insufficient balance')
    return new Account(this.nonce, this.balance - value)
  }
  public increaseBalance (value: number) {
    return new Account(this.nonce, this.balance + value)
  }
}
