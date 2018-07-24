import { Transaction, TransactionList } from './transaction'
import { MerkleTree } from './merkle-tree'
import { Hash } from '@uniqys/signature'
import { serialize, deserialize } from '@uniqys/serialize'

describe('transaction', () => {
  it('is serializable', () => {
    const transaction = new Transaction(Buffer.from('The quick brown fox jumps over the lazy dog'))
    expect(deserialize(serialize(transaction), Transaction.deserialize).equals(transaction)).toBeTruthy()
  })
  it('is hashable', () => {
    const transaction = new Transaction(Buffer.from('foo'))
    expect(transaction.hash.equals(Hash.fromData('foo'))).toBeTruthy()
  })
})

describe('transaction list', () => {
  let transaction1: Transaction
  let transaction2: Transaction
  beforeAll(() => {
    transaction1 = new Transaction(Buffer.from('transaction1'))
    transaction2 = new Transaction(Buffer.from('transaction2'))
  })
  it('has merkle root', () => {
    const list = new TransactionList([transaction1, transaction2])
    expect(list.hash.equals(MerkleTree.root([transaction1, transaction2]))).toBeTruthy()
    expect(deserialize(serialize(list), TransactionList.deserialize).hash.equals(list.hash)).toBeTruthy()
  })
  it('is serializable', () => {
    const list = new TransactionList([transaction1, transaction2])
    expect(deserialize(serialize(list), TransactionList.deserialize).hash.equals(list.hash)).toBeTruthy()
  })
})
