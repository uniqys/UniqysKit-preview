declare module 'libp2p' {

  import { EventEmitter } from 'events'
  import PeerId from 'peer-id'
  import PeerInfo from 'peer-info'
  import PeerBook from 'peer-book'
  import Multiaddr from 'multiaddr'
  import Ping from 'libp2p-ping'
  import { Connection } from 'interface-connection'

  export type Options = {
    peerInfo: PeerInfo,
    peerBook?: PeerBook,
    modules: {
      transport: any[],
      streamMuxer?: any[],
      connEncryption?: any[],
      peerDiscovery?: any[],
      dht?: any
    },
    config?: {
      peerDiscovery?: {},
      relay?: {
        enabled?: boolean,
        hop?: {
          enabled?: boolean,
          active?: boolean
        }
      },
      dht?: {
        kBucketSize?: number
      },
      EXPERIMENTAL?: {
        pubsub?: boolean,
        dht?: boolean
      }
    }
  }

  export type PubSubMessage = {
    from: String,
    seqno: Buffer,
    data: Buffer,
    topicIDs: String[]
  }

  export class PubSub {
    subscribe(topic: string, options: { discover: boolean }, handler: (msg: PubSubMessage) => void, callback: (err: Error | null) => void): void;
    subscribe(topic: string, handler: (msg: PubSubMessage) => void, callback: (err: Error | null) => void): void;
    unsubscribe(topic: string, handler: (msg: PubSubMessage) => void): void;
    publish(topic: string, data: Buffer, callback: (err: Error | null) => void): void;
    ls(callback: (err: Error | null, topics: string[]) => void): void;
    peers(topic: string, callback: (err: Error | null, peerIds: string[]) => void): void;
    setMaxListeners(n: number): EventEmitter;
  }

  export default class Node extends EventEmitter {
    constructor(_options: Options);

    start(callback: (err: Error | null) => void): void;
    stop(callback: (err: Error | null) => void): void;
    isStarted(): boolean;

    dial(peer: PeerInfo | PeerId | Multiaddr | string, callback: (err: Error | null) => void): void;
    dialProtocol(peer: PeerInfo | PeerId | Multiaddr | string, protocol: string, callback: (err: Error | null, conn: Connection) => void): void;
    hangUp(peer: PeerInfo | PeerId | Multiaddr | string, callback: (err: Error | null) => void): void;
    ping(peer: PeerInfo | PeerId | Multiaddr | string, callback: (err: Error | null, ping: Ping) => void): void;
    handle(protocol: string, handlerFunc: (protocol: string, conn: Connection) => void,
      matchFunc?: (myProtocol: string, senderProtocol: string, cb: (err: Error | null, result: boolean) => void) => void): void;
    unhandle(protocol: string): void;

    on(event: 'start', listener: () => void): this;
    on(event: 'stop', listener: () => void): this;
    on(event: 'peer:disconnect', listener: (peer: PeerInfo) => void): this;
    on(event: 'peer:discovery', listener: (peer: PeerInfo) => void): this;
    on(event: 'peer:connect', listener: (peer: PeerInfo) => void): this;
    on(event: 'peer:disconnect', listener: (peer: PeerInfo) => void): this;

    readonly peerInfo: PeerInfo;
    readonly peerBook: PeerBook;
    readonly pubsub: PubSub;

    // loose
    readonly stats: any;
    readonly dht: any;
    readonly peerRouting: any;
    readonly contentRouting: any;
  }
}
