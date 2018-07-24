import { Channel } from './message-channel'
import { Sink, Source, Through } from 'pull-stream'
import { UInt32 } from '@uniqys/serialize'

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

// split message buffer
function split (size: number): Through<Buffer, Buffer> {
  return (read) => {
    let data = Buffer.alloc(0)
    return (end, cb) => {
      if (data.byteLength === 0) {
        read(end, (end, d) => {
          if (end || !d) return cb(end)
          data = d.slice(Math.min(size, d.byteLength))
          cb(end, d.slice(0, size))
        })
      } else {
        const d = data
        data = d.slice(Math.min(size, d.byteLength))
        cb(end, d.slice(0, size))
      }
    }
  }
}

describe('message channel', () => {
  it('can be added error handler', () => {
    const stream = new ThroughDuplex<Buffer>()
    const channel = new Channel({ source: stream.source, sink: stream.sink }, UInt32.deserialize, UInt32.serialize)
    channel.onError(() => { /* noop */ })
  })
  it('transport message packet through byte stream', (done) => {
    const stream1to2 = new ThroughDuplex<Buffer>()
    const stream2to1 = new ThroughDuplex<Buffer>()
    const channel1 = new Channel({ source: split(3)(stream2to1.source), sink: stream1to2.sink }, UInt32.deserialize, UInt32.serialize)
    const channel2 = new Channel({ source: split(5)(stream1to2.source), sink: stream2to1.sink }, UInt32.deserialize, UInt32.serialize)

    const received1: number[] = []
    const received2: number[] = []
    channel1.onMessage(n => { received1.push(n) })
    channel2.onMessage(n => { received2.push(n) })

    channel2.onEnd(() => {
      expect(received1).toEqual([21, 22])
      expect(received2).toEqual([11, 12, 13])
      done()
    })

    ;(async () => {
      await channel1.sendMessage(11)
      await channel2.sendMessage(21)
      await channel1.sendMessage(12)
      await channel1.sendMessage(13)
      await channel2.sendMessage(22)
      channel1.end()
    })().catch(err => done.fail(err))
  })
})
