declare module 'peer-book' {

  import PeerId from 'peer-id'
  import PeerInfo from 'peer-info'
  import Multiaddr from 'multiaddr'

  export default class PeerBook {
    constructor();

    has(peer: PeerId | PeerInfo | string): boolean;
    put(peerInfo: PeerInfo, replace: boolean): PeerInfo;
    get(peer: PeerId | PeerInfo | string): PeerInfo;
    getAll(): { [index: string]: PeerInfo };
    getAllArray(): PeerInfo[];
    getMultiaddrs(peer: PeerId | PeerInfo | string): Multiaddr[];
    remove(peer: PeerId | PeerInfo | string): void;
  }
}
