import { Message, EventMessage, RequestMessage, ResponseMessage } from './message'
import { ProtocolMeta as Meta } from '../network'
import { Channel } from '../message-channel'
import { Duplex } from 'pull-stream'
import { EventEmitter } from 'events'
import PeerInfo from 'peer-info'

export { Message }

export interface SyncProtocolHandler {
  handshake (protocol: SyncProtocol, incoming: boolean): void
  hello (message: Message.Hello, protocol: SyncProtocol): void
  newTransaction (message: Message.NewTransaction, protocol: SyncProtocol): void
  newBlock (message: Message.NewBlock, protocol: SyncProtocol): void
  newBlockHeight (message: Message.NewBlockHeight, protocol: SyncProtocol): void
  getConsentedHeader (message: Message.GetConsentedHeader, protocol: SyncProtocol): Promise<Message.ConsentedHeader>
  getHeaders (message: Message.GetHeaders, protocol: SyncProtocol): Promise<Message.Headers>
  getBodies (message: Message.GetBodies, protocol: SyncProtocol): Promise<Message.Bodies>
}

export class SyncProtocol {
  private receiver?: (msg: ResponseMessage) => void // parallel request is not allowed
  private readonly event = new EventEmitter()
  constructor (
    public readonly peerId: string,
    private readonly channel: Channel<Message>,
    private readonly handler: SyncProtocolHandler
  ) {
    this.channel.onError(err => this.event.emit('error', err))
    this.channel.onEnd(() => this.event.emit('end'))
  }

  public start (): void {
    this.channel.onMessage(msg => {
      if (msg.type === Message.Type.Event) {
        this.handleEvent(msg)
      }
      if (msg.type === Message.Type.Request) {
        this.handleRequest(msg)
      }
      if (msg.type === Message.Type.Response) {
        this.handleResponse(msg)
      }
    })
  }

  public end (): void {
    this.channel.end()
  }

  public onError (listener: (err: Error) => void) { this.event.on('error', listener) }
  public onEnd (listener: () => void) { this.event.on('end', listener) }

  public sendHello (message: Message.Hello): Promise<void> {
    return this.channel.sendMessage(message)
  }
  public sendNewTransaction (message: Message.NewTransaction): Promise<void> {
    return this.channel.sendMessage(message)
  }
  public sendNewBlock (message: Message.NewBlock): Promise<void> {
    return this.channel.sendMessage(message)
  }
  public sendNewBlockHeight (message: Message.NewBlockHeight): Promise<void> {
    return this.channel.sendMessage(message)
  }
  public fetchConsentedHeader (message: Message.GetConsentedHeader): Promise<Message.ConsentedHeader> {
    return this.fetch(message, Message.ConsentedHeader)
  }
  public fetchHeaders (message: Message.GetHeaders): Promise<Message.Headers> {
    return this.fetch(message, Message.Headers)
  }
  public fetchBodies (message: Message.GetBodies): Promise<Message.Bodies> {
    return this.fetch(message, Message.Bodies)
  }

  private handleEvent (msg: EventMessage): void {
    if (msg instanceof Message.Hello) return this.handler.hello(msg, this)
    if (msg instanceof Message.NewTransaction) return this.handler.newTransaction(msg, this)
    if (msg instanceof Message.NewBlock) return this.handler.newBlock(msg, this)
    /* istanbul ignore else */
    if (msg instanceof Message.NewBlockHeight) return this.handler.newBlockHeight(msg, this)
    /* istanbul ignore next: type checked */
    this.unexpected(msg)
  }
  private handleRequest (msg: RequestMessage): void {
    if (msg instanceof Message.GetConsentedHeader) {
      this.handler.getConsentedHeader(msg, this)
        .then(msg => this.channel.sendMessage(msg), err => this.event.emit('error', err))
      return
    }
    if (msg instanceof Message.GetHeaders) {
      this.handler.getHeaders(msg, this)
        .then(msg => this.channel.sendMessage(msg), err => this.event.emit('error', err))
      return
    }
    /* istanbul ignore else */
    if (msg instanceof Message.GetBodies) {
      this.handler.getBodies(msg, this)
        .then(msg => this.channel.sendMessage(msg), err => this.event.emit('error', err))
      return
    }
    /* istanbul ignore next: type checked */
    this.unexpected(msg)
  }
  private handleResponse (msg: ResponseMessage): void {
    if (this.receiver) {
      this.receiver(msg)
    } else {
      this.event.emit('error', new Error('unexpected response'))
    }
  }
  private async fetch<T> (message: RequestMessage, ctor: { new (...args: any[]): T }): Promise<T> {
    const response = new Promise<T>((resolve, reject) => {
      this.receiver = (msg => {
        this.receiver = undefined
        if (msg instanceof ctor) {
          resolve(msg)
        } else {
          const err = new Error('unexpected response')
          this.event.emit('error', err)
          reject(err)
        }
      })
    })
    await this.channel.sendMessage(message)
    return response
  }

  /* istanbul ignore next: type checked */
  private unexpected (msg: never) { this.event.emit('error', new Error(`unexpected message ${msg}`)) }
}

export class SyncProtocolMeta implements Meta {
  public protocol = 'uniqys/sync/v1'
  constructor (
    private readonly handler: SyncProtocolHandler
  ) { }

  handshake (info: PeerInfo, conn: Duplex<Buffer>, incoming: boolean): void {
    const protocol = new SyncProtocol(info.id.toB58String(), new Channel(conn, Message.deserialize, Message.serialize), this.handler)
    this.handler.handshake(protocol, incoming)
  }
}
