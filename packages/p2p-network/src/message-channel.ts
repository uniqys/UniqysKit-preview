import { Deserializer, Serializer, deserialize, UInt64, serialize } from '@uniqys/serialize'
import { EventEmitter } from 'events'
import { Duplex as NodeDuplex } from 'stream'
import { Duplex as PullDuplex } from 'pull-stream'
const toStream = require('pull-stream-to-stream')

export class Channel<T> {
  private readonly event = new EventEmitter()
  private readonly stream: NodeDuplex
  private isHandling = false
  constructor (
    connection: PullDuplex<Buffer>,
    private readonly deserializer: Deserializer<T>,
    private readonly serializer: Serializer<T>
  ) {
    this.stream = toStream(connection)
    this.stream.on('end', () => { this.event.emit('end') })
    this.stream.on('error', (err) => { this.event.emit('error', err) })
  }

  public onMessage (listener: (message: T) => void) {
    if (!this.isHandling) { this.handle() }
    this.event.on('message', listener)
  }
  public onError (listener: (err: Error) => void) { this.event.on('error', listener) }
  public onEnd (listener: () => void) { this.event.on('end', listener) }

  public end () { this.stream.end() }

  public sendMessage (message: T): Promise<void> {
    const msgBuff = serialize(message, this.serializer)
    const size = serialize(msgBuff.byteLength, UInt64.serialize)
    if (this.stream.write(Buffer.concat([size, msgBuff]))) {
      return Promise.resolve()
    } else {
      return new Promise((resolve, _) => this.stream.once('drain', () => resolve()))
    }
  }

  private handle (): void {
    // size prefixed message
    const sizeBuff = Buffer.alloc(8)
    let sizeBuffFilled = 0
    let msgBuff: Buffer | undefined = undefined
    let msgBuffFilled = 0

    const handler = (chunk: Buffer) => {
      if (!chunk) return
      let consumed = 0
      if (msgBuff) {
        consumed = chunk.copy(msgBuff, msgBuffFilled)
        msgBuffFilled += consumed
        if (msgBuffFilled === msgBuff.byteLength) {
          const msg = deserialize(msgBuff, this.deserializer)
          this.event.emit('message', msg)
          msgBuff = undefined
          msgBuffFilled = 0
        }
      } else {
        consumed = chunk.copy(sizeBuff, sizeBuffFilled)
        sizeBuffFilled += consumed
        if (sizeBuffFilled === sizeBuff.byteLength) {
          const size = deserialize(sizeBuff, UInt64.deserialize)
          msgBuff = Buffer.alloc(size)
          sizeBuffFilled = 0
        }
      }
      if (chunk.byteLength > consumed) {
        handler(chunk.slice(consumed))
      }
    }

    this.isHandling = true
    this.stream.on('data', handler)
  }
}
