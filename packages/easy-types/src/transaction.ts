import { HttpRequest } from './http-message'
import { Serializable, serialize, BufferReader, BufferWriter, UInt64 } from '@uniqys/serialize'
import { Address, Hashable, Hash, Signature, Signer } from '@uniqys/signature'

export class Transaction implements Hashable, Serializable {
  public readonly hash: Hash
  constructor (
    public readonly nonce: number,
    public readonly request: HttpRequest
  ) {
    this.hash = Hash.fromData(serialize(this))
  }
  public static deserialize (reader: BufferReader): Transaction {
    const nonce = UInt64.deserialize(reader)
    const action = HttpRequest.deserialize(reader)
    return new Transaction(nonce, action)
  }
  public serialize (writer: BufferWriter) {
    UInt64.serialize(this.nonce, writer)
    this.request.serialize(writer)
  }
}

export class SignedTransaction implements Serializable {
  public get nonce () { return this.transaction.nonce }
  public get request () { return this.transaction.request }
  public signer: Address
  constructor (
    public readonly sign: Signature,
    public readonly transaction: Transaction
  ) {
    this.signer = Address.fromPublicKey(this.sign.recover(this.transaction.hash))
  }
  public static sign (signer: Signer, transaction: Transaction): SignedTransaction {
    return new SignedTransaction(signer.sign(transaction.hash), transaction)
  }
  public static deserialize (reader: BufferReader): SignedTransaction {
    const sign = Signature.deserialize(reader)
    const transaction = Transaction.deserialize(reader)
    return new SignedTransaction(sign, transaction)
  }
  public serialize (writer: BufferWriter) {
    this.sign.serialize(writer)
    this.transaction.serialize(writer)
  }
}
