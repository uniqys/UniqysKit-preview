import { Block, Blockchain, TransactionList, Transaction, Consensus } from '@uniqys/blockchain'
import { KeyPair } from '@uniqys/signature'
import * as dapi from '@uniqys/dapp-interface'
import { AsyncLoop } from '@uniqys/async-loop'
import { Node, NodeOptions } from './node'
import PeerInfo from 'peer-info'
import debug from 'debug'
const logger = debug('chain-core:node:validator')

export class ValidatorNode<T extends dapi.Dapp> extends Node<T> {
  private consensusLoop = new AsyncLoop(() => this.proceedConsensus())
  private blockInConsensus?: Block

  constructor (
    dapp: T,
    blockchain: Blockchain,
    peerInfo: PeerInfo,
    private readonly keyPair: KeyPair,
    options?: NodeOptions
  ) {
    super(dapp, blockchain, peerInfo, options)
    this.consensusLoop.on('error', err => this.event.emit('error', err))
  }

  public async start () {
    logger('start validator %s', this.keyPair.address.toString())
    await super.start()
    if (await this.blockchain.height === 0) {
      this.blockInConsensus = this.blockchain.genesisBlock
    }
    this.consensusLoop.start()
  }

  public async stop () {
    this.consensusLoop.stop()
    await super.stop()
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
    this.propagateBlock(block, consensus)

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
