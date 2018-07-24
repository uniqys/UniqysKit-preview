declare module 'interface-connection' {
  import PeerInfo from 'peer-info'
  import Multiaddr from 'multiaddr'
  import { Duplex } from 'pull-stream'

  export interface Connection extends Duplex<Buffer> {
    getPeerInfo(callback: (err: Error | null, peerInfo: PeerInfo) => void): void;
    setPeerInfo(peerInfo: PeerInfo): void;
    getObservedAddrs(callback: (err: Error | null, multiaddrs: Multiaddr[]) => void): void;
  }
}
