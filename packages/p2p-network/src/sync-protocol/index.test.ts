import { SyncProtocolHandler, SyncProtocol, Message, SyncProtocolMeta } from '.'
import { Channel } from '../message-channel'
import { Block, TransactionList, Transaction, Consensus, ValidatorSet } from '@uniqys/blockchain'
import { Hash } from '@uniqys/signature'
import { Source, Sink } from 'pull-stream'
import PeerInfo from 'peer-info'
import PeerId from 'peer-id'

const noop: SyncProtocolHandler = {
  handshake: () => { /* noop */ },
  hello: () => { /* noop */ },
  newTransaction: () => { /* noop */ },
  newBlock: () => { /* noop */ },
  newBlockHeight: () => { /* noop */ },
  getConsentedHeader: () => Promise.reject(new Error('not implemented')),
  getHeaders: () => Promise.reject(new Error('not implemented')),
  getBodies: () => Promise.reject(new Error('not implemented'))
}

function makeHandler (partial: Partial<SyncProtocolHandler>) {
  return Object.assign(noop, partial)
}

class ThroughDuplex<T> {
  private _source?: Source<T>
  private _pending?: { end: null | true | Error, cb: (end: null | true | Error, data?: T) => void }
  public sink: Sink<T> = (source) => {
    this._source = source
    if (this._pending) {
      const pend = this._pending
      this._pending = undefined
      this._source(pend.end, pend.cb)
    }
  }
  public source: Source<T> = (end, cb) => {
    if (this._source) {
      this._source(end, cb)
    } else {
      this._pending = { end, cb }
    }
  }
}

describe('sync protocol', () => {
  let channel1: Channel<Message>
  let channel2: Channel<Message>
  let transaction: Transaction
  let block: Block
  let consensus: Consensus
  beforeEach(() => {
    const stream1to2 = new ThroughDuplex<Buffer>()
    const stream2to1 = new ThroughDuplex<Buffer>()
    channel1 = new Channel({ source: stream2to1.source, sink: stream1to2.sink }, Message.deserialize, Message.serialize)
    channel2 = new Channel({ source: stream1to2.source, sink: stream2to1.sink }, Message.deserialize, Message.serialize)
    transaction = new Transaction(Buffer.alloc(0))
    block = Block.construct(1, 100, Hash.fromData('genesis'), Hash.fromData('state'),
        new TransactionList([]), new Consensus([]), new ValidatorSet([]))
    consensus = new Consensus([])
  })
  it('send and receive hello event', (done) => {
    const protocol1 = new SyncProtocol('peer1', channel1, makeHandler({
      hello: (msg) => {
        expect(msg.height).toBe(42)
        expect(msg.genesis.toHexString()).toBe(Hash.fromData('foo').toHexString())
        done()
      }
    }))
    protocol1.start()
    const protocol2 = new SyncProtocol('peer2', channel2, noop)
    protocol2.start()
    protocol2.sendHello(new Message.Hello(42, Hash.fromData('foo'))).catch(err => done.fail(err))
  })
  it('send and receive newTransaction event', (done) => {
    const protocol1 = new SyncProtocol('peer1', channel1, makeHandler({
      newTransaction: (msg) => {
        expect(msg.transaction.hash.equals(transaction.hash)).toBeTruthy()
        done()
      }
    }))
    protocol1.start()
    const protocol2 = new SyncProtocol('peer2', channel2, noop)
    protocol2.start()
    protocol2.sendNewTransaction(new Message.NewTransaction(transaction)).catch(err => done.fail(err))
  })
  it('send and receive newBlock event', (done) => {
    const protocol1 = new SyncProtocol('peer1', channel1, makeHandler({
      newBlock: (msg) => {
        expect(msg.block.hash.equals(block.hash)).toBeTruthy()
        expect(msg.consensus.hash.equals(consensus.hash))
        done()
      }
    }))
    protocol1.start()
    const protocol2 = new SyncProtocol('peer2', channel2, noop)
    protocol2.start()
    protocol2.sendNewBlock(new Message.NewBlock(block, consensus)).catch(err => done.fail(err))
  })
  it('send and receive newBlockHeight event', (done) => {
    const protocol1 = new SyncProtocol('peer1', channel1, makeHandler({
      newBlockHeight: (msg) => {
        expect(msg.height).toBe(37)
        done()
      }
    }))
    protocol1.start()
    const protocol2 = new SyncProtocol('peer2', channel2, noop)
    protocol2.start()
    protocol2.sendNewBlockHeight(new Message.NewBlockHeight(37)).catch(err => done.fail(err))
  })
  it('fetch consentedHeader', async () => {
    const protocol1 = new SyncProtocol('peer1', channel1, makeHandler({
      getConsentedHeader: (msg) => {
        expect(msg.height).toBe(17)
        return Promise.resolve(new Message.ConsentedHeader(block.header, consensus))
      }
    }))
    protocol1.start()
    const protocol2 = new SyncProtocol('peer2', channel2, noop)
    protocol2.start()
    const msg = await protocol2.fetchConsentedHeader(new Message.GetConsentedHeader(17))
    expect(msg.header.hash.equals(block.header.hash)).toBeTruthy()
    expect(msg.consensus.hash.equals(consensus.hash)).toBeTruthy()
  })
  it('fetch headers', async () => {
    const protocol1 = new SyncProtocol('peer1', channel1, makeHandler({
      getHeaders: (msg) => {
        expect(msg.from).toBe(42)
        expect(msg.count).toBe(3)
        return Promise.resolve(new Message.Headers([block.header, block.header, block.header]))
      }
    }))
    protocol1.start()
    const protocol2 = new SyncProtocol('peer2', channel2, noop)
    protocol2.start()
    const msg = await protocol2.fetchHeaders(new Message.GetHeaders(42, 3))
    expect(msg.headers.map(h => h.hash.equals(block.header.hash))).toEqual([true, true, true])
  })
  it('fetch bodies', async () => {
    const protocol1 = new SyncProtocol('peer1', channel1, makeHandler({
      getBodies: (msg) => {
        expect(msg.from).toBe(42)
        expect(msg.count).toBe(3)
        return Promise.resolve(new Message.Bodies([block.body, block.body, block.body]))
      }
    }))
    protocol1.start()
    const protocol2 = new SyncProtocol('peer2', channel2, noop)
    protocol2.start()
    const msg = await protocol2.fetchBodies(new Message.GetBodies(42, 3))
    expect(msg.bodies.length).toBe(3)
    expect(() => { msg.bodies.forEach(b => b.validate(block.header)) }).not.toThrow()
  })
  it('emit end if channel ended', (done) => {
    const protocol1 = new SyncProtocol('peer1', channel1, noop)
    protocol1.onEnd(() => { done() })
    protocol1.start()
    const protocol2 = new SyncProtocol('peer2', channel2, noop)
    protocol2.start()
    protocol2.end()
  })
  it('emit error if response is not requested ', (done) => {
    const protocol1 = new SyncProtocol('peer1', channel1, noop)
    protocol1.onError(err => {
      expect(err.message).toBe('unexpected response')
      done()
    })
    protocol1.start()
    const protocol2 = new SyncProtocol('peer2', channel2, noop)
    protocol2.start()
    protocol2['channel'].sendMessage(new Message.Headers([])).catch(err => done.fail(err))
  })
  it('emit error invalid response type', async () => {
    const protocol2 = new SyncProtocol('peer2', channel2, makeHandler({
      getConsentedHeader: async () => {
        await protocol2['channel'].sendMessage(new Message.Headers([]))
        return new Message.ConsentedHeader(block.header, consensus)
      }
    }))
    protocol2.start()
    const protocol1 = new SyncProtocol('peer1', channel1, noop)
    protocol1.onError(() => {/* ignore */})
    protocol1.start()
    await expect(protocol1.fetchConsentedHeader(new Message.GetConsentedHeader(10))).rejects.toThrowError('unexpected response')
  })
  it('emit error when reject in get consented header', (done) => {
    const protocol1 = new SyncProtocol('peer1', channel1, makeHandler({
      getConsentedHeader: () => Promise.reject(new Error('foo'))
    }))
    protocol1.onError(err => {
      expect(err.message).toBe('foo')
      done()
    })
    protocol1.start()
    const protocol2 = new SyncProtocol('peer2', channel2, noop)
    protocol2.start()
    protocol2.fetchConsentedHeader(new Message.GetConsentedHeader(10)).catch(err => done.fail(err))
  })
  it('emit error when reject in get headers', (done) => {
    const protocol1 = new SyncProtocol('peer1', channel1, makeHandler({
      getHeaders: () => Promise.reject(new Error('foo'))
    }))
    protocol1.onError(err => {
      expect(err.message).toBe('foo')
      done()
    })
    protocol1.start()
    const protocol2 = new SyncProtocol('peer2', channel2, noop)
    protocol2.start()
    protocol2.fetchHeaders(new Message.GetHeaders(10, 1)).catch(err => done.fail(err))
  })
  it('emit error when reject in get bodies', (done) => {
    const protocol1 = new SyncProtocol('peer1', channel1, makeHandler({
      getBodies: () => Promise.reject(new Error('foo'))
    }))
    protocol1.onError(err => {
      expect(err.message).toBe('foo')
      done()
    })
    protocol1.start()
    const protocol2 = new SyncProtocol('peer2', channel2, noop)
    protocol2.start()
    protocol2.fetchBodies(new Message.GetBodies(10, 1)).catch(err => done.fail(err))
  })
})

describe('sync protocol meta', () => {
  it('is uniqys sync protocol', () => {
    const meta = new SyncProtocolMeta(noop)
    expect(meta.protocol).toBe('uniqys/sync/v1')
  })
  it('handshake with protocol', (done) => {
    const id = PeerId.createFromB58String('QmaJ36YM18pckNBmqyXrUzAwQwwkLSeL11t6WPBzQjCYBF')
    const info = new PeerInfo(id)
    const meta = new SyncProtocolMeta(makeHandler({
      handshake: (protocol, incoming) => {
        expect(protocol.peerId).toBe(info.id.toB58String())
        expect(incoming).toBe(true)
        done()
      }
    }))
    meta.handshake(info, new ThroughDuplex(), true)
  })
})
