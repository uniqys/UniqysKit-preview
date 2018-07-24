declare module 'peer-info' {

  import PeerId from 'peer-id'
  import Multiaddr from 'multiaddr'

  class PeerInfo {
    constructor(peerId: PeerId);
    connect(ma: Multiaddr): void;
    disconnect(): void;
    isConnected(): undefined | Multiaddr;
    id: PeerId
    multiaddrs: any // MultiaddrSet
    protocols: Set<any>

    static create(peerId: PeerId, callback: (err: Error | null, peerInfo: PeerInfo) => void): void;
    static create(callback: (err: Error | null, peerInfo: PeerInfo) => void): void;

    static isPeerInfo(peerInfo: any): boolean;
  }

  export = PeerInfo
}
