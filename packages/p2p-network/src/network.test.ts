import { Network } from './network'
import PeerInfo from 'peer-info'
import { promisify } from 'util'

// NOTE: This test start the node once, and test case is state-ful. Because to start it take time
describe('network', () => {
  let net1: Network
  let net2: Network
  let net3: Network
  beforeAll(async () => {
    const peer1 = await promisify(PeerInfo.create)()
    const peer2 = await promisify(PeerInfo.create)()
    const peer3 = await promisify(PeerInfo.create)()
    peer1.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
    peer2.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
    peer3.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
    net1 = new Network(peer1, { mdnsInterval: 0, maxPeers: 1, maxPendingPeers: 1 })
    net2 = new Network(peer2, { mdnsInterval: 0 })
    net3 = new Network(peer3, { mdnsInterval: 0 })
    await Promise.all([net1.start(), net2.start(), net3.start()])
  }, 20000)
  afterAll(async () => {
    await net1.stop()
    await net2.stop()
    await net3.stop()
  })
  it('can be added error handler', () => {
    net1.onError(() => { /* noop */ })
  })
  it('can multi protocol handshake', (done) => {
    // tslint:disable:no-use-before-declare
    let called = 0
    const call = () => {
      called++
      if (called === 4) {
        expect(foo1.mock.calls[0][0].id.toB58String()).toBe(net2.localPeer.id.toB58String())
        expect(bar1.mock.calls[0][0].id.toB58String()).toBe(net2.localPeer.id.toB58String())
        expect(foo2.mock.calls[0][0].id.toB58String()).toBe(net1.localPeer.id.toB58String())
        expect(bar2.mock.calls[0][0].id.toB58String()).toBe(net1.localPeer.id.toB58String())
        expect(net1.connectedPeers.map(info => info.id.toB58String())).toEqual([net2.localPeer.id.toB58String()])
        expect(net2.connectedPeers.map(info => info.id.toB58String())).toEqual([net1.localPeer.id.toB58String()])
        done()
      }
    }
    // tslint:enable
    const foo1 = jest.fn(call)
    const bar1 = jest.fn(call)
    net1.addProtocol({ protocol: 'foo', handshake: foo1 })
    net1.addProtocol({ protocol: 'bar', handshake: bar1 })

    const foo2 = jest.fn(call)
    const bar2 = jest.fn(call)
    net2.addProtocol({ protocol: 'foo', handshake: foo2 })
    net2.addProtocol({ protocol: 'bar', handshake: bar2 })

    // discover peer manually
    net1['node'].emit('peer:discovery', net2.localPeer)
  })
  it('limit connect peers and pend it', () => {
    net3.addProtocol({ protocol: 'foo', handshake: () => {/* noop */} })
    net3.addProtocol({ protocol: 'bar', handshake: () => {/* noop */} })
    // discover peer manually
    net1['node'].emit('peer:discovery', net3.localPeer)
    expect(net1['discoveredPeer'].size).toBe(1)
    expect(net1['connectedPeer'].size).toBe(1)
    expect(Array.from(net1['connectedPeer'].values())[0].id.toB58String()).toBe(net2.localPeer.id.toB58String())
    expect(net1['pendingPeers'].length).toBe(1)
    expect(net1['pendingPeers'][0].id.toB58String()).toBe(net3.localPeer.id.toB58String())
  })
  it('not connect dropped peer', (done) => {
    net1.dropPeer(net2.localPeer.id)
    net1['node'].once('peer:disconnect', peer => {
      expect(peer.id.toB58String()).toBe(net2.localPeer.id.toB58String())
      const fn = jest.fn()
      net1['event'].on('dial', fn)
      net1['node'].emit('peer:discovery', net2.localPeer)
      expect(fn).not.toBeCalled()
      setTimeout(done, 1000)
    })
  })
})
