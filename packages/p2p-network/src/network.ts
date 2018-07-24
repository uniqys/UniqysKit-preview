import { Libp2pBundle } from './libp2p-bundle'
import Node from 'libp2p'
import PeerInfo from 'peer-info'
import { Connection } from 'interface-connection'
import { EventEmitter } from 'events'
import PeerId from 'peer-id'
import Multiaddr from 'multiaddr'
import PeerBook from 'peer-book'
import debug from 'debug'
const logger = debug('p2p:network')

export interface NetworkOptions {
  maxPeers: number
  maxPendingPeers: number
  bootstraps: (String | Buffer | Multiaddr)[],
  bootstrapInterval: number, // 0 is disable
  mdnsInterval: number // 0 is disable
}
export namespace NetworkOptions {
  export const defaults: NetworkOptions = {
    maxPeers: 25,
    maxPendingPeers: 0,
    bootstraps: [],
    bootstrapInterval: 5000, // 5s
    mdnsInterval: 1000 // 1s
  }
}

export interface ProtocolMeta {
  protocol: string
  handshake (info: PeerInfo, conn: Connection, incoming: boolean): void
}

export class Network {
  public get localPeer () { return this.node.peerInfo }
  public get connectedPeers () { return Array.from(this.connectedPeer.values()) }
  private readonly pendingPeers: PeerInfo[] = []
  private readonly event = new EventEmitter()
  private readonly options: NetworkOptions
  private readonly node: Node
  private discoveredPeer = new Set<string>()
  private droppedPeer = new Set<string>()
  private connectedPeer = new Map<string, PeerInfo>()
  constructor (
    peerInfo: PeerInfo,
    options?: Partial<NetworkOptions>
  ) {
    this.options = Object.assign({}, NetworkOptions.defaults, options)
    this.node = new Libp2pBundle(peerInfo, new PeerBook(), this.options)
  }

  public start (): Promise<void> {
    logger('start peer %s', this.localPeer.id.toB58String())
    return new Promise((resolve, reject) => this.node.start(err => {
      /* istanbul ignore if: library internal error */
      if (err) return reject(err)
      this.node.on('peer:discovery', peer => {
        const id = peer.id.toB58String()
        if (this.discoveredPeer.has(id) || this.droppedPeer.has(id) || this.connectedPeer.has(id)) { return }
        logger('discover peer %s', peer.id.toB58String())
        this.discoveredPeer.add(id)
        if (this.connectedPeer.size < this.options.maxPeers) {
          this.event.emit('dial', peer)
        } else if (this.pendingPeers.length < this.options.maxPendingPeers) {
          this.pendingPeers.push(peer)
        }
      })
      this.node.on('peer:connect', peer => {
        const id = peer.id.toB58String()
        this.discoveredPeer.delete(id)
        this.connectedPeer.set(id, peer)
      })
      this.node.on('peer:disconnect', peer => {
        logger('disconnect peer %s', peer.id.toB58String())
        this.connectedPeer.delete(peer.id.toB58String())
        const pend = this.pendingPeers.shift()
        if (pend) {
          this.event.emit('dial', pend)
        }
      })
      resolve()
    }))
  }

  public stop (): Promise<void> {
    logger('stop peer %s', this.localPeer.id.toB58String())
    return new Promise((resolve, reject) => this.node.stop(err => {
      /* istanbul ignore if: library internal error */
      if (err) return reject(err)
      resolve()
    }))
  }

  public addProtocol (meta: ProtocolMeta) {
    if (this.node.isStarted) {
      this._addProtocol(meta)
    } else {
      this.node.on('start', () => {
        this._addProtocol(meta)
      })
    }
  }

  public onError (listener: (err: Error) => void) { this.event.on('error', listener) }

  public dropPeer (id: PeerId) {
    logger('drop peer %s', id.toB58String())
    this.droppedPeer.add(id.toB58String())
    this.node.hangUp(id, (err) => {
      /* istanbul ignore if: library internal error */
      if (err) { this.event.emit('error', err) }
    })
  }

  private _addProtocol (meta: ProtocolMeta) {
    logger('add protocol %s', meta.protocol)
    this.node.handle(meta.protocol, (_protocol, conn) => {
      conn.getPeerInfo((err, peer) => {
        /* istanbul ignore if: library internal error */
        if (err) {
          this.event.emit('error', err)
          return
        }
        const id = peer.id.toB58String()
        if (this.droppedPeer.has(id) || this.discoveredPeer.has(id)) { return }
        logger('handle protocol %s from %s', meta.protocol, peer.id.toB58String())
        meta.handshake(peer, conn, true)
      })
    })
    this.event.on('dial', peer => {
      this.node.dialProtocol(peer, meta.protocol, (err, conn) => {
        logger('dial protocol %s to %s', meta.protocol, peer.id.toB58String())
        /* istanbul ignore if: library internal error */
        if (err) {
          this.event.emit('error', err)
          return
        }
        meta.handshake(peer, conn, false)
      })
    })
  }
}
