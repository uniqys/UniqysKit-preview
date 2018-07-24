import { RemoteNode, RemoteNodeSet } from './remote-node'
import { SyncProtocol } from '@uniqys/p2p-network'
import { promisify } from 'util'

expect.extend({
  toEqualAnyOf (received, argument) {
    const expects = argument as any[]
    const pass = expects.findIndex(e => (this as any).equals(received, e)) !== -1
    return {
      pass,
      message: pass
        ? () => `expected ${received} not to equal any of ${expects.join(', ')}`
        : () => `expected $ {received} to equal any of ${expects.join(', ')}`
    }
  }
})
declare global {
  namespace jest {
    interface Matchers<R> {
      toEqualAnyOf (expects: any[]): R
    }
  }
}

describe('remote node', () => {
  it('can lock for use', (done) => {
    const node = new RemoteNode('peer1', {} as SyncProtocol, 0)
    node.use(async () => {
      await promisify(setTimeout)(50)
    }).then(() => {
      expect(node.isIdle).toBeTruthy()
      done()
    }).catch(err => done.fail(err))
    expect(node.isIdle).not.toBeTruthy()
  })
})

describe('remote node set', () => {
  let node1: RemoteNode
  let node2: RemoteNode
  let node3: RemoteNode
  beforeEach(() => {
    node1 = new RemoteNode('peer1', {} as SyncProtocol, 0)
    node2 = new RemoteNode('peer2', {} as SyncProtocol, 2)
    node3 = new RemoteNode('peer3', {} as SyncProtocol, 1)
  })
  it('is set of remote nodes', () => {
    const set = new RemoteNodeSet()

    expect(set.size).toBe(0)
    set.add(node1)
    set.add(node2)
    set.add(node3)
    expect(set.size).toBe(3)
    expect(set.get('peer3')).toEqual(node3)
    expect(set.get('peer4')).toBeUndefined()
    expect(Array.from(set.nodes())).toEqual([node1, node2, node3])
    set.delete(node3)
    expect(set.get('peer3')).toBeUndefined()
    expect(Array.from(set.nodes())).toEqual([node1, node2])
  })
  it('select best height node', () => {
    const set = new RemoteNodeSet()
    set.add(node1)
    set.add(node2)
    set.add(node3)
    expect(set.bestNode()).toEqual(node2)
    node3.height = 3
    expect(set.bestNode()).toEqual(node3)
  })
  it('select best height node', () => {
    const set = new RemoteNodeSet()
    set.add(node1)
    set.add(node2)
    set.add(node3)
    expect(set.bestNode()).toEqual(node2)
    node3.height = 3
    expect(set.bestNode()).toEqual(node3)
  })
  it('pick provider node', () => {
    const set = new RemoteNodeSet()
    set.add(node1)
    set.add(node2)
    set.add(node3)
    expect(set.pickProvider(3)).toBeUndefined()
    expect(set.pickProvider(2)).toEqualAnyOf([node2])

    // randomly
    for (let i = 0; i < 5; i++) {
      expect(set.pickProvider(1)).toEqualAnyOf([node2, node3])
      expect(set.pickProvider(0)).toEqualAnyOf([node1, node2, node3])
    }
  })
  it('pick idle provider node', (done) => {
    const set = new RemoteNodeSet()
    set.add(node1)
    set.add(node2)
    set.add(node3)

    expect(set.pickIdleProvider(2)).toEqualAnyOf([node2])

    node2.use(async () => {
      await promisify(setTimeout)(100)
    }).catch(err => done.fail(err))
    expect(set.pickIdleProvider(2)).toBeUndefined()
    done()
  })
  it('pick transaction receiver', () => {
    const set = new RemoteNodeSet()
    set.add(node1)
    set.add(node2)
    set.add(node3)

    let receivers: RemoteNode[] = []
    receivers = set.pickTransactionReceivers()
    expect(receivers.length).toBe(3)
    expect(receivers[0]).toEqualAnyOf([node1, node2, node3])
    expect(receivers[1]).toEqualAnyOf([node1, node2, node3])
    expect(receivers[2]).toEqualAnyOf([node1, node2, node3])
    // floor(3 ^ 0.5) = 1
    receivers = set.pickTransactionReceivers(0.5)
    expect(receivers.length).toBe(1)
    expect(receivers[0]).toEqualAnyOf([node1, node2, node3])
    // floor(3 ^ 0.8) = 2
    receivers = set.pickTransactionReceivers(0.8)
    expect(receivers.length).toBe(2)
    expect(receivers[0]).toEqualAnyOf([node1, node2, node3])
    expect(receivers[1]).toEqualAnyOf([node1, node2, node3])
  })
  it('pick block receiver', () => {
    const set = new RemoteNodeSet()
    set.add(node1)
    set.add(node2)
    set.add(node3)

    let receivers: RemoteNode[] = []
    receivers = set.pickBlockReceivers(3)
    expect(receivers.length).toBe(3)
    expect(receivers[0]).toEqualAnyOf([node1, node2, node3])
    expect(receivers[1]).toEqualAnyOf([node1, node2, node3])
    expect(receivers[2]).toEqualAnyOf([node1, node2, node3])
    // floor(3 ^ 0.8) = 2
    receivers = set.pickBlockReceivers(3, 0.8)
    expect(receivers.length).toBe(2)
    expect(receivers[0]).toEqualAnyOf([node1, node2, node3])
    expect(receivers[1]).toEqualAnyOf([node1, node2, node3])
    // not pick node that known the height
    // floor(2 ^ 0.8) = 1
    receivers = set.pickBlockReceivers(2, 0.8)
    expect(receivers.length).toBe(1)
    expect(receivers[0]).toEqualAnyOf([node1, node3])
    // floor(1 ^ 0.8) = 1
    receivers = set.pickBlockReceivers(1, 0.8)
    expect(receivers.length).toBe(1)
    expect(receivers[0]).toEqualAnyOf([node1])
  })
  // TODO: TODO:
})
