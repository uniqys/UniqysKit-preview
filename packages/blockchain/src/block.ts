import { Serializable, UInt64, BufferWriter, BufferReader, serialize } from '@uniqys/serialize'
import { Hash, Hashable } from '@uniqys/signature'
import { TransactionList } from './transaction'
import { Consensus, ValidatorSet } from './consensus'

export class BlockHeader implements Hashable, Serializable {
  public readonly hash: Hash

  constructor (
    // TODO: consensus round in header
    // public readonly round: number,
    public readonly height: number,
    public readonly timestamp: number,
    public readonly lastBlockHash: Hash,
    public readonly transactionRoot: Hash,
    public readonly lastBlockConsensusRoot: Hash,
    public readonly nextValidatorSetRoot: Hash,
    public readonly appStateHash: Hash
  ) {
    this.hash = Hash.fromData(serialize(this))
  }
  public static deserialize (reader: BufferReader): BlockHeader {
    const height = UInt64.deserialize(reader)
    const timestamp = UInt64.deserialize(reader)
    const lastBlockHash = Hash.deserialize(reader)
    const transactionRoot = Hash.deserialize(reader)
    const lastBlockConsensusRoot = Hash.deserialize(reader)
    const nextValidatorSetRoot = Hash.deserialize(reader)
    const appStateHash = Hash.deserialize(reader)
    return new BlockHeader(
      height, timestamp, lastBlockHash,
      transactionRoot,
      lastBlockConsensusRoot,
      nextValidatorSetRoot,
      appStateHash
    )
  }
  public serialize (writer: BufferWriter) {
    UInt64.serialize(this.height, writer)
    UInt64.serialize(this.timestamp, writer)
    this.lastBlockHash.serialize(writer)
    this.transactionRoot.serialize(writer)
    this.lastBlockConsensusRoot.serialize(writer)
    this.nextValidatorSetRoot.serialize(writer)
    this.appStateHash.serialize(writer)
  }
}

export class BlockBody implements Serializable {
  constructor (
    public readonly transactionList: TransactionList,
    public readonly lastBlockConsensus: Consensus,
    public readonly nextValidatorSet: ValidatorSet // TODO: Optional?
  ) { }
  public static deserialize (reader: BufferReader): BlockBody {
    const transactions = TransactionList.deserialize(reader)
    const consensus = Consensus.deserialize(reader)
    const validatorSet = ValidatorSet.deserialize(reader)
    return new BlockBody(transactions, consensus, validatorSet)
  }
  public serialize (writer: BufferWriter) {
    this.transactionList.serialize(writer)
    this.lastBlockConsensus.serialize(writer)
    this.nextValidatorSet.serialize(writer)
  }
  public validate (header: BlockHeader) {
    if (!header.transactionRoot.equals(this.transactionList.hash)) { throw new Error('invalid transactionRoot') }
    if (!header.lastBlockConsensusRoot.equals(this.lastBlockConsensus.hash)) { throw new Error('invalid lastBlockConsensusHash') }
    if (!header.nextValidatorSetRoot.equals(this.nextValidatorSet.hash)) { throw new Error('invalid nextValidatorSetRoot') }
  }
}

export class Block implements Hashable, Serializable {
  public readonly hash: Hash
  constructor (
    public readonly header: BlockHeader,
    public readonly body: BlockBody
  ) {
    this.hash = header.hash
  }
  public static construct (
    height: number,
    timestamp: number,
    lastBlockHash: Hash,
    appStateHash: Hash,
    transactions: TransactionList,
    lastBlockConsensus: Consensus,
    nextValidatorSet: ValidatorSet
  ): Block {
    const body = new BlockBody(transactions, lastBlockConsensus, nextValidatorSet)
    const header = new BlockHeader(height, timestamp, lastBlockHash,
      body.transactionList.hash, body.lastBlockConsensus.hash, body.nextValidatorSet.hash, appStateHash)
    return new Block(header, body)
  }
  public static deserialize (reader: BufferReader): Block {
    const header = BlockHeader.deserialize(reader)
    const body = BlockBody.deserialize(reader)
    return new Block(header, body)
  }
  public serialize (writer: BufferWriter) {
    this.header.serialize(writer)
    this.body.serialize(writer)
  }

  public validate () {
    this.body.validate(this.header)
  }
}
