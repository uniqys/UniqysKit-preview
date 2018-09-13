import * as dapi from '@uniqys/dapp-interface'
import { Blockchain, Block, TransactionList, Transaction, Consensus } from '@uniqys/blockchain'
import { KeyPair } from '@uniqys/signature'
import { AsyncLoop } from '@uniqys/async-loop'
import { TransactionPool } from './transaction-pool'
import { EventEmitter } from 'events'
import debug from 'debug'
const logger = debug('chain-core:core')

export class Local<T extends dapi.Dapp> implements dapi.Core {
  public readonly blockchain: Blockchain
  public readonly transactionPool: TransactionPool
  protected readonly event = new EventEmitter()
  protected lastAppState?: dapi.AppState
  private readonly dapp: T
  private readonly executionLoop = new AsyncLoop(async () => { await this.executeBlockTransactions() })
  private consensusLoop = new AsyncLoop(() => this.proceedConsensus())
  private blockInConsensus?: Block

  constructor (
    dapp: T,
    blockchain: Blockchain,
    private readonly keyPair: KeyPair
  ) {
    this.dapp = dapp
    this.blockchain = blockchain
    this.executionLoop.on('error', err => this.event.emit('error', err))
    this.consensusLoop.on('error', err => this.event.emit('error', err))
    this.transactionPool = new TransactionPool(
      (tx) => this.dapp.validateTransaction(tx),
      (txs) => this.dapp.selectTransactions(txs)
    )
  }

  public onError (listener: (err: Error) => void) { this.event.on('error', listener) }
  public onExecuted (listener: (height: number) => void) { this.event.on('executed', listener) }

  public async start (): Promise<void> {
    logger('start local core %s', this.keyPair.address.toString())
    await this.initialize()
    this.executionLoop.start()
    if (await this.blockchain.height === 0) {
      this.blockInConsensus = this.blockchain.genesisBlock
    }
    this.consensusLoop.start()
  }

  public async stop (): Promise<void> {
    this.consensusLoop.stop()
    this.executionLoop.stop()
  }

  public async sendTransaction (transaction: Transaction) {
    await this.transactionPool.add(transaction)
  }

  private async initialize () {
    const [height, appState] = await Promise.all([
      // make db ready and fetch height
      this.blockchain.ready()
        .then(() => {
          return this.blockchain.height
        }),
      this.dapp.connect() // connect dapp
    ])

    this.lastAppState = appState
    if (this.lastAppState.height > height) throw new Error('need reset app')
    // already know app state hash
    if (this.lastAppState.height < height) {
      const expect = (await this.blockchain.headerOf(this.lastAppState.height + 1)).appStateHash
      if (!this.lastAppState.hash.equals(expect)) throw new Error('app hash mismatch')
    }
    logger(`initialized at block(${this.lastAppState.height})`)
  }

  private async executeBlockTransactions () {
    if (this.lastAppState === undefined) { throw new Error('not initialized') }
    if ((await this.blockchain.height) !== this.lastAppState.height) {
      const height = this.lastAppState.height + 1
      const knownHeight = await this.blockchain.height
      logger(`execute transaction in block(${height})`)
      const block = await this.blockchain.blockOf(height)
      const txs = block.body.transactionList.transactions
      const appState = await this.dapp.executeTransactions(txs)
      if (appState.height !== height) throw new Error('block height mismatch')
      if (appState.height < knownHeight) {
        const expect = (await this.blockchain.headerOf(appState.height + 1)).appStateHash
        if (!this.lastAppState.hash.equals(expect)) throw new Error('app hash mismatch')
      }
      this.lastAppState = appState
      await this.transactionPool.update(txs)
      this.event.emit('executed', height)
    }
  }

  private async proceedConsensus () {
    if (this.lastAppState === undefined) { throw new Error('not initialized') }
    if ((await this.blockchain.height) !== this.lastAppState.height) { return }
    if (this.blockInConsensus) {
      logger('make consensus')
      await this.consentBlock()
      return
    }
    const transactions = await this.transactionPool.selectTransactions()
    if (transactions.length > 0) {
      logger('has transactions')
      await this.constructBlock(transactions)
      return
    }
    if (!this.lastAppState.hash.equals((await this.blockchain.blockOf(await this.blockchain.height)).header.appStateHash)) {
      logger('need appState proof block')
      await this.constructBlock([])
      return
    }
  }

  private async consentBlock () {
    if (!this.blockInConsensus) { throw new Error('consensus is not in progress') }
    const block = this.blockInConsensus
    this.blockInConsensus = undefined

    const consensus = new Consensus([this.keyPair.sign(block.hash)]) // only my signature
    await this.blockchain.blockStore.mutex.use(async () => {
      const knownHeight = await this.blockchain.height
      const height = block.header.height
      if (height === knownHeight + 1) {
        await Promise.all([
          this.blockchain.blockStore.setHeader(height, block.header),
          this.blockchain.blockStore.setBody(height, block.body)
        ])
        await this.blockchain.blockStore.setHeight(height)
        await this.blockchain.blockStore.setLastConsensus(consensus)
      } else {
        // TODO: what happen in consensus algorithm?
      }
    })

    logger(`add block(${block.header.height}): ${block.hash.buffer.toString('hex')}`)
  }

  private async constructBlock (transactions: Transaction[]) {
    if (this.lastAppState === undefined) { throw new Error('not initialized') }
    const height = await this.blockchain.height

    const lastBlockHash = await this.blockchain.hashOf(height)
    const lastBlockConsensus = await this.blockchain.consensusOf(height)
    const nextValidatorSet = await this.blockchain.validatorSetOf(height + 1) // static validator set
    const block = Block.construct(
      height + 1, Math.floor((new Date().getTime()) / 1000), lastBlockHash, this.lastAppState.hash,
      new TransactionList(transactions), lastBlockConsensus, nextValidatorSet
    )

    this.blockInConsensus = block

    logger(`propose block(${block.header.height}): ${block.hash.buffer.toString('hex')}`)
  }
}
