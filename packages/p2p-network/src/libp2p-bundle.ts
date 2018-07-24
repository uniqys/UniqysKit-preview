import libp2p from 'libp2p'
import PeerInfo from 'peer-info'
import PeerBook from 'peer-book'
import { NetworkOptions } from './network'
// transport
const TCP = require('libp2p-tcp')
// stream multiplexer
const Mplex = require('libp2p-mplex')
// discovery
const Railing = require('libp2p-railing')
const MulticastDNS = require('libp2p-mdns')
// crypto channel
const SECIO = require('libp2p-secio')
// dht (include peer routing, content routing)
const KadDHT = require('libp2p-kad-dht')

export class Libp2pBundle extends libp2p {
  constructor (peerInfo: PeerInfo, peerBook: PeerBook, options: NetworkOptions) {
    const discovery = []
    if (options.bootstrapInterval > 0) { discovery.push(new Railing({ list: options.bootstraps, interval: options.bootstrapInterval })) }
    if (options.mdnsInterval > 0) { discovery.push(new MulticastDNS(peerInfo, { serviceTag: 'uniqys.local', interval: options.mdnsInterval })) }
    const modules = {
      transport: [new TCP()],
      connection: {
        muxer: [Mplex],
        crypto: [SECIO]
      },
      discovery: discovery,
      dht: KadDHT
    }

    super(modules, peerInfo, peerBook)
  }

  public stop (cb: (err: Error | null) => void): void {
    super.stop((err) => {
      if (err) {
        cb(err)
      } else {
        (this as any).modules.discovery.forEach((discovery: any) => {
          // XXX: an ad-hoc for libp2p-railing bug. should fix it.
          if (discovery instanceof Railing) {
            if (discovery._timer) {
              clearInterval(discovery._timer)
              discovery._timer = null
            }
          }
        })
        cb(null)
      }
    })
  }
}
