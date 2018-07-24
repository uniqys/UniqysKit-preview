import { MerkleTree } from './merkle-tree'
import { Hash, Hashable } from '@uniqys/signature'
import { Serializable, BufferWriter, BufferReader, SizedBuffer, List } from '@uniqys/serialize'

export class Transaction implements Hashable, Serializable {
  public readonly hash: Hash
  constructor (
    public readonly data: Buffer
  ) {
    this.hash = Hash.fromData(this.data)
  }
  public static deserialize (reader: BufferReader): Transaction {
    return new Transaction(SizedBuffer.deserialize(reader))
  }
  public serialize (writer: BufferWriter) {
    SizedBuffer.serialize(this.data, writer)
  }
  public equals (other: Transaction) {
    return this.data.equals(other.data)
  }
}

export class TransactionList implements Hashable, Serializable, Iterable<Transaction> {
  public get hash () { return MerkleTree.root(this.transactions) }
  constructor (
    public readonly transactions: Transaction[]
  ) { }
  public static deserialize (reader: BufferReader): TransactionList {
    return new TransactionList(List.deserialize(Transaction.deserialize)(reader))
  }
  public serialize (writer: BufferWriter) {
    List.serialize<Transaction>((t, w) => t.serialize(w))(this.transactions, writer)
  }
  public [Symbol.iterator] (): Iterator<Transaction> {
    return this.transactions[Symbol.iterator]()
  }
}
