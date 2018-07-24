import { MemcachedSubset } from './implementation'
import net from 'net'
import debug from 'debug'
const logger = debug('easy-fw:memcached-protocol')

// A interface what has Memcached like methods
export enum Response {
  Ok = 'OK',
  Stored = 'STORED',
  NotStored = 'NOT_STORED',
  Exists = 'EXISTS',
  NotFound = 'NOT_FOUND',
  Deleted = 'DELETED',
  Touched = 'TOUCHED'
}
export namespace Response {
  export type Value = {key: string, flags: number, data: Buffer}
  export type ValueS = Value & {cas: number}
  export function isValueS (v: Value | ValueS): v is ValueS {
    return 'cas' in v
  }
  export type Number = number
  export type Stat = {name: string, value: string}
  export type Version = {version: string}
}

export namespace Checker {
  export class CheckError extends Error {
    constructor (m: string) {
      super(m)
      Object.setPrototypeOf(this, new.target.prototype)
    }
  }
  type C<T> = (raw?: string) => T
  export function get (): (params: string[]) => void
  export function get<T1> (c1: C<T1>): (params: string[]) => [T1]
  export function get<T1, T2> (c1: C<T1>, c2: C<T2>): (params: string[]) => [T1, T2]
  export function get<T1, T2, T3> (c1: C<T1>, c2: C<T2>, c3: C<T3>): (params: string[]) => [T1, T2, T3]
  export function get<T1, T2, T3, T4> (c1: C<T1>, c2: C<T2>, c3: C<T3>, c4: C<T4>): (params: string[]) => [T1, T2, T3, T4]
  export function get<T1, T2, T3, T4, T5> (c1: C<T1>, c2: C<T2>, c3: C<T3>, c4: C<T4>, c5: C<T5>): (params: string[]) => [T1, T2, T3, T4, T5]
  export function get<T1, T2, T3, T4, T5, T6> (c1: C<T1>, c2: C<T2>, c3: C<T3>, c4: C<T4>, c5: C<T5>, c6: C<T6>): (params: string[]) => [T1, T2, T3, T4, T5, T6]
  export function get (...cs: C<any>[]): (params: string[]) => any[] {
    return (params) => {
      if (params.length > cs.length) { throw new CheckError('too many parameters') }
      return cs.map((c, i) => c(params[i]))
    }
  }
  export function def (raw?: string): string {
    if (raw === undefined) { throw new CheckError('missing parameter') }
    return raw
  }
  export function number (raw?: string): number {
    const str = def(raw)
    const num = parseInt(str, 10)
    if (isNaN(num)) { throw new CheckError('bad number format: ' + str) }
    return num
  }
  export function key (raw?: string): string {
    const key = def(raw)
    if (key.length > 250) { throw new CheckError('bad key format: ' + key) }
    return key
  }
  export function flags (raw?: string): number {
    const flags = number(raw)
    if (flags < 0 || flags > 0xffffffff) { throw new CheckError('bad flags format: ' + flags) }
    return flags
  }
  export function noReply (raw?: string): boolean {
    if (raw === undefined) { return false }
    if (raw === 'noreply') { return true }
    throw new CheckError('bad noreply format: ' + raw)
  }
}

export namespace ParameterFetcher {
  export const none = Checker.get()
  export const storage = Checker.get(Checker.key, Checker.flags, Checker.number, Checker.number, Checker.noReply)
  export const cas = Checker.get(Checker.key, Checker.flags, Checker.number, Checker.number, Checker.number, Checker.noReply)
  export const get = (params: string[]): [string[]] => {
    if (params.length === 0) { throw new Checker.CheckError('missing keys') }
    return [params.map(Checker.key)]
  }
  export const del = Checker.get(Checker.key, Checker.noReply)
  export const incrDecr = Checker.get(Checker.key, Checker.number, Checker.noReply)
  export const touch = Checker.get(Checker.key, Checker.number, Checker.noReply)
  export const flush = (params: string[]): [number, boolean] =>
    params.length === 0 ? [0, false] :
    params[0] === 'noreply' ? [0, true] :
    [Checker.number(params[0]), Checker.noReply(params[1])]
  export const verb = Checker.get(Checker.number, Checker.noReply)
}

// A implementation of Memcached text protocol
// ref. https://github.com/memcached/memcached/blob/master/doc/protocol.txt
// cSpell:words noreply
const CRLF = '\r\n'
export class MemcachedTextProtocol {
  private buffer: Buffer[] = []
  private remainBytes: number = 0
  private dataHandler?: (data: Buffer) => Promise<void>
  constructor (
    private readonly socket: net.Socket,
    private readonly implementation: MemcachedSubset
  ) { }

  public handle (): void {
    this.socket.on('error', err => {
      if (typeof (err as any)['code'] === 'string') {
        if (/ECONNRESET|EPIPE/.test((err as any).code)) {
          return // don't care of read or write after socket closed
        }
      }
      throw err
    })
    this.socket.on('data', chunk => {
      this.socket.pause()
      this.processChunk(chunk)
        .then(() => {
          this.socket.resume()
        })
        .catch((e) => {
          if (e instanceof Checker.CheckError) {
            this.writeClientError(e.message)
          } else {
            logger('server error: %o', e)
            this.writeServerError(e.message)
          }
          this.socket.resume()
        })
    })
  }

  protected async processCommand (command: string, params: string[]): Promise<void> {
    logger('command: %s %o', command, params)
    switch (command) {
      case '': {
        break
      } case 'set': {
        const [key, flags, , bytes, noReply] = ParameterFetcher.storage(params)
        this.setDataHandler(bytes, async (data) => this.writeResponse(noReply, await this.implementation.set(key, flags, data)))
        break
      } case 'add': {
        const [key, flags, , bytes, noReply] = ParameterFetcher.storage(params)
        this.setDataHandler(bytes, async (data) => this.writeResponse(noReply, await this.implementation.add(key, flags, data)))
        break
      } case 'replace': {
        const [key, flags, , bytes, noReply] = ParameterFetcher.storage(params)
        this.setDataHandler(bytes, async (data) => this.writeResponse(noReply, await this.implementation.replace(key, flags, data)))
        break
      } case 'append': {
        const [key, , , bytes, noReply] = ParameterFetcher.storage(params)
        this.setDataHandler(bytes, async (data) => this.writeResponse(noReply, await this.implementation.append(key, data)))
        break
      } case 'prepend': {
        const [key, , , bytes, noReply] = ParameterFetcher.storage(params)
        this.setDataHandler(bytes, async (data) => this.writeResponse(noReply, await this.implementation.prepend(key, data)))
        break
      } case 'cas': {
        const [key, flags, , bytes, cas, noReply] = ParameterFetcher.cas(params)
        this.setDataHandler(bytes, async (data) => this.writeResponse(noReply, await this.implementation.cas(key, flags, cas, data)))
        break
      } case 'get': {
        const [keys] = ParameterFetcher.get(params)
        for await (const value of this.implementation.get(keys)) { this.writeValue(value) }
        this.writeEnd()
        break
      } case 'gets': {
        const [keys] = ParameterFetcher.get(params)
        for await (const value of this.implementation.gets(keys)) { this.writeValue(value) }
        this.writeEnd()
        break
      } case 'delete': {
        const [key, noReply] = ParameterFetcher.del(params)
        this.writeResponse(noReply, await this.implementation.delete(key))
        break
      } case 'incr': {
        const [key, value, noReply] = ParameterFetcher.incrDecr(params)
        const res = await this.implementation.incr(key, value)
        if (res === Response.NotFound) {
          this.writeResponse(noReply, res)
        } else {
          this.writeNumber(noReply, res)
        }
        break
      } case 'decr': {
        const [key, value, noReply] = ParameterFetcher.incrDecr(params)
        const res = await this.implementation.decr(key, value)
        if (res === Response.NotFound) {
          this.writeResponse(noReply, res)
        } else {
          this.writeNumber(noReply, res)
        }
        break
      } case 'stats': {
        for await (const stat of this.implementation.stats(...params)) { this.writeStat(stat) }
        this.writeEnd()
        break
      } case 'flush_all': {
        const [, noReply] = ParameterFetcher.flush(params)
        this.writeResponse(noReply, await this.implementation.flush())
        break
      } case 'version': {
        ParameterFetcher.none(params)
        this.writeVersion(await this.implementation.version())
        break
      } case 'verbosity': {
        const [level, noReply] = ParameterFetcher.verb(params)
        this.writeResponse(noReply, await this.implementation.verbosity(level))
        break
      } case 'quit': {
        ParameterFetcher.none(params)
        await this.implementation.quit()
        this.closeSocket()
        break
      } default: {
        logger('unknown command: %s %o', command, params)
        this.writeError()
      }
    }
  }

  protected setDataHandler (bytes: number, handler: (data: Buffer) => Promise<void>) {
    this.remainBytes = bytes
    this.dataHandler = async (data) => {
      this.dataHandler = undefined
      await handler(data)
    }
  }

  protected writeResponse (noReply: boolean, response: Response): void {
    if (noReply) { return }
    this.socket.write(`${response}${CRLF}`)
  }
  protected writeNumber (noReply: boolean, num: Response.Number): void {
    if (noReply) { return }
    this.socket.write(`${num.toString(10)}${CRLF}`)
  }
  protected writeValue (value: Response.Value | Response.ValueS): void {
    this.socket.write(`VALUE ${value.key} ${value.flags} ${value.data.byteLength}`
      + `${Response.isValueS(value) ? ` ${value.cas}` : ''}${CRLF}`)
    this.socket.write(value.data)
    this.socket.write(`${CRLF}`)
  }
  protected writeStat (stat: Response.Stat): void {
    this.socket.write(`STAT ${stat.name} ${stat.value}${CRLF}`)
  }
  protected writeVersion (version: Response.Version): void {
    this.socket.write(`VERSION ${version.version}${CRLF}`)
  }
  protected writeEnd () {
    this.socket.write(`END${CRLF}`)
  }
  protected writeError () {
    this.socket.write(`ERROR${CRLF}`)
  }
  protected writeServerError (message: string) {
    this.socket.write(`SERVER_ERROR ${message}${CRLF}`)
  }
  protected writeClientError (message: string) {
    this.socket.write(`CLIENT_ERROR ${message}${CRLF}`)
  }
  protected closeSocket () {
    this.socket.end()
  }

  private async processChunk (chunk: Buffer): Promise<void> {
    if (this.dataHandler === undefined) {
      for (let i = 0; i < chunk.byteLength - 1; i++) {
        if (chunk.readUInt8(i) === CRLF.charCodeAt(0) && chunk.readUInt8(i + 1) === CRLF.charCodeAt(1)) {
          const line = Buffer.concat(this.buffer.concat(chunk.slice(0, i))).toString()
          this.buffer = []
          const [command = '', ...params] = line.split(' ')
          await this.processCommand(command, params)
          await this.processChunk(chunk.slice(i + 2))
          return
        }
      }
    } else {
      if (chunk.byteLength >= this.remainBytes) {
        const data = Buffer.concat(this.buffer.concat(chunk.slice(0, this.remainBytes)))
        this.buffer = []
        await this.dataHandler(data)
        await this.processChunk(chunk.slice(this.remainBytes))
        return
      }
      this.remainBytes -= chunk.byteLength
    }
    this.buffer.push(chunk)
  }
}
