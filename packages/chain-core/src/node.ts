import { Blockchain, Block, BlockBody, BlockHeader, Transaction, Consensus } from '@uniqys/blockchain'
import { Network, NetworkOptions, SyncProtocol, SyncProtocolMeta, Message } from '@uniqys/p2p-network'
import * as dapi from '@uniqys/dapp-interface'
import { AsyncLoop } from '@uniqys/async-loop'
import { EventEmitter } from 'events'
import { Synchronizer } from './synchronizer'
import { TransactionPool } from './transaction-pool'
import { RemoteNodeSet, RemoteNode } from './remote-node'
import PeerInfo from 'peer-info'
import PeerId from 'peer-id'
import debug from 'debug'
const logger = debug('chain-core:node')

export interface NodeOptions extends NetworkOptions {
  propagateRateExponent: number // count ^ R
  handshakeTimeout: number
}
export namespace NodeOptions {
  export const defaults: NodeOptions = Object.assign({
    propagateRateExponent: 0.5,
    handshakeTimeout: 100
  }, NetworkOptions.defaults)
}

export class Node<T extends dapi.Dapp> implements dapi.Core {
  public readonly blockchain: Blockchain
  public readonly transactionPool: TransactionPool
  protected readonly event = new EventEmitter()
  protected lastAppState?: dapi.AppState
  private readonly dapp: T
  private readonly network: Network
  private readonly remoteNode = new RemoteNodeSet()
  private readonly options: NodeOptions
  private readonly executionLoop = new AsyncLoop(async () => { await this.executeBlockTransactions() })
  private readonly synchronizer: Synchronizer

  constructor (
    dapp: T,
    blockchain: Blockchain,
    peerInfo: PeerInfo,
    options?: Partial<NodeOptions>
  ) {
    this.dapp = dapp
    this.blockchain = blockchain
    this.options = Object.assign({}, NodeOptions.defaults, options)

    this.executionLoop.on('error', err => this.event.emit('error', err))

    this.network = new Network(peerInfo, this.options)
    this.network.onError(err => {
      if (err.message === 'underlying socket has been closed') { return } // TODO: OK?
      this.event.emit('error', err)
    })
    this.network.addProtocol(new SyncProtocolMeta({
      handshake: (protocol, incoming) => this.handshake(protocol, incoming),
      hello: (msg, protocol) => this.hello(msg, protocol),
      newTransaction: (msg, protocol) => this.newTransaction(msg, protocol),
      newBlock: (msg, protocol) => this.newBlock(msg, protocol),
      newBlockHeight: (msg, protocol) => this.newBlockHeight(msg, protocol),
      getConsentedHeader: (msg, protocol) => this.getConsentedHeader(msg, protocol),
      getHeaders: (msg, protocol) => this.getHeaders(msg, protocol),
      getBodies: (msg, protocol) => this.getBodies(msg, protocol)
    }))

    this.synchronizer = new Synchronizer(
      this.blockchain,
      this.remoteNode,
      (node) => this.dropRemoteNode(node),
      (block, consensus) => this.propagateBlock(block, consensus)
    )
    this.synchronizer.onError(err => this.event.emit('error', err))

    this.transactionPool = new TransactionPool(
      (tx) => this.dapp.validateTransaction(tx),
      (txs) => this.dapp.selectTransactions(txs),
      (tx) => this.propagateTransaction(tx)
    )
  }

  public onError (listener: (err: Error) => void) { this.event.on('error', listener) }
  public onExecuted (listener: (height: number) => void) { this.event.on('executed', listener) }

  public async start (): Promise<void> {
    await this.initialize()
    this.executionLoop.start()
    this.synchronizer.start()
    await this.network.start()
  }

  public async stop (): Promise<void> {
    for (const node of this.remoteNode.nodes()) { node.syncProtocol.end() }
    await this.network.stop()
    this.synchronizer.stop()
    this.executionLoop.stop()
  }

  public async sendTransaction (transaction: Transaction) {
    await this.transactionPool.add(transaction)
  }

  protected propagateBlock (block: Block, consensus: Consensus) {
    this._propagateBlock(block, consensus).catch(err => this.event.emit('error', err))
  }

  private getRemoteNode (protocol: SyncProtocol): RemoteNode {
    const node = this.remoteNode.get(protocol.peerId)
    if (!node) throw new Error('Remote node disappeared')
    return node
  }

  private async handshake (protocol: SyncProtocol, incoming: boolean) {
    logger('handshake %s %s %s', this.network.localPeer.id.toB58String() , incoming ? '<--' : '-->', protocol.peerId)
    protocol.onError(err => {
      if (err.message === 'underlying socket has been closed') { return } // TODO: OK?
      this.event.emit('error', err)
    })
    // drop the peer that can not connect before timeout
    protocol.start()
    await protocol.sendHello(new Message.Hello((await this.blockchain.height), this.blockchain.genesisBlock.hash))

    setTimeout(() => {
      if (!this.remoteNode.get(protocol.peerId)) {
        this.dropPeer(protocol.peerId)
      }
    }, this.options.handshakeTimeout)
  }

  private hello (msg: Message.Hello, protocol: SyncProtocol): void {
    if (msg.genesis.equals(this.blockchain.genesisBlock.hash)) {
      logger('success handshake with %s height: %d genesis: %s ', protocol.peerId, msg.height, msg.genesis.buffer.toString('hex'))
      const node = new RemoteNode(protocol.peerId, protocol, msg.height)
      this.addRemoteNode(node)
      protocol.onEnd(() => {
        logger('goodby %s', node.peerId)
        this.remoteNode.delete(node)
      })
    } else {
      this.dropPeer(protocol.peerId) // this peer is on another chain
    }
  }

  private addRemoteNode (node: RemoteNode) {
    this.remoteNode.add(node)
    this.synchronizer.newNode()
  }

  private dropRemoteNode (node: RemoteNode) {
    this.remoteNode.delete(node)
    this.dropPeer(node.peerId)
  }

  private dropPeer (id: string) {
    this.network.dropPeer(PeerId.createFromB58String(id))
  }

  private newTransaction (msg: Message.NewTransaction, _: SyncProtocol) {
    this.transactionPool.add(msg.transaction).catch(err => this.event.emit('error', err))
  }

  private newBlock (msg: Message.NewBlock, protocol: SyncProtocol) {
    const node = this.getRemoteNode(protocol)
    this.synchronizer.newBlock(msg, node)
  }

  private newBlockHeight (msg: Message.NewBlockHeight, protocol: SyncProtocol) {
    const node = this.getRemoteNode(protocol)
    this.synchronizer.newBlockHeight(msg, node)
  }

  private async getConsentedHeader (msg: Message.GetConsentedHeader, _: SyncProtocol): Promise <Message.ConsentedHeader> {
    const header = await this.blockchain.headerOf(msg.height)
    const consensus = await this.blockchain.consensusOf(msg.height)
    return new Message.ConsentedHeader(header, consensus)
  }

  private async getHeaders (msg: Message.GetHeaders, _: SyncProtocol): Promise < Message.Headers > {
    const i = msg.from
    const last = Math.min(await this.blockchain.height, i + msg.count - 1)
    const headers: BlockHeader[] = []
    for (let i = msg.from; i <= last; i++) {
      headers.push(await this.blockchain.headerOf(i))
    }
    return new Message.Headers(headers)
  }

  private async getBodies (msg: Message.GetBodies, _: SyncProtocol): Promise < Message.Bodies > {
    const i = msg.from
    const last = Math.min(await this.blockchain.height, i + msg.count - 1)
    const bodies: BlockBody[] = []
    for (let i = msg.from; i <= last; i++) {
      bodies.push(await this.blockchain.bodyOf(i))
    }
    return new Message.Bodies(bodies)
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

  private async _propagateBlock (block: Block, consensus: Consensus): Promise < void > {
    const height = block.header.height
    logger('propagate block (%d)', height)
    const newBlockMsg = new Message.NewBlock(block, consensus)
    const newBlockHeightMsg = new Message.NewBlockHeight(height)
    await Promise.all(this.remoteNode.pickBlockReceivers(height, this.options.propagateRateExponent)
      .map(node => node.syncProtocol.sendNewBlock(newBlockMsg)))
    await Promise.all(this.remoteNode.pickBlockReceivers(height)
      .map(node => node.syncProtocol.sendNewBlockHeight(newBlockHeightMsg)))
  }

  private propagateTransaction (tx: Transaction) {
    this._propagateTransaction(tx).catch(err => this.event.emit('error', err))
  }

  private async _propagateTransaction (tx: Transaction): Promise < void > {
    logger('propagate transaction %s', tx.hash.toHexString())
    const newTransactionMsg = new Message.NewTransaction(tx)
    await Promise.all(this.remoteNode.pickTransactionReceivers(this.options.propagateRateExponent)
      .map(node => node.syncProtocol.sendNewTransaction(newTransactionMsg)))
  }

}
