import libp2p, { Options } from 'libp2p'
import PeerInfo from 'peer-info'
import PeerBook from 'peer-book'
import { NetworkOptions } from './network'
// transport
const TCP = require('libp2p-tcp')
// stream multiplexer
const Mplex = require('libp2p-mplex')
// discovery
const Bootstrap = require('libp2p-bootstrap')
const MulticastDNS = require('libp2p-mdns')
// crypto channel
const SECIO = require('libp2p-secio')
// dht (include peer routing, content routing)
const KadDHT = require('libp2p-kad-dht')

export class Libp2pBundle extends libp2p {
  constructor (peerInfo: PeerInfo, peerBook: PeerBook, options: NetworkOptions) {
    const discovery = []
    if (options.bootstrapInterval > 0) { discovery.push(new Bootstrap({ list: options.bootstraps, interval: options.bootstrapInterval })) }
    if (options.mdnsInterval > 0) { discovery.push(new MulticastDNS(peerInfo, { serviceTag: 'uniqys.local', interval: options.mdnsInterval })) }
    const _options: Options = {
      peerInfo: peerInfo,
      peerBook: peerBook,
      modules: {
        transport: [new TCP()],
        streamMuxer: [Mplex],
        connEncryption: [SECIO],
        peerDiscovery: discovery,
        dht: KadDHT
      }
    }

    super(_options)
  }
}
