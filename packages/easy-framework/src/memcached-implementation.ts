import { MemcachedSubset, Response } from './memcached-compatible-server'
import { Serializer, Deserializer, serialize, deserialize, UInt32, UInt64 } from '@uniqys/serialize'
import { Store } from '@uniqys/store'
import { Mutex } from '@uniqys/lock'

class Item {
  constructor (
    public readonly flags: number,
    public readonly casUniq: number,
    public readonly data: Buffer
  ) {}
  public static deserialize: Deserializer<Item> = (reader) => {
    const casUniq = UInt64.deserialize(reader)
    const flags = UInt32.deserialize(reader)
    return new Item(flags, casUniq, reader.buffer)
  }
  public static noCasDeserialize: Deserializer<Item> = (reader) => {
    const flags = UInt32.deserialize(reader)
    return new Item(flags, 0, reader.buffer)
  }

  public static serialize: Serializer<Item> = (item, writer) => {
    UInt64.serialize(item.casUniq, writer)
    UInt32.serialize(item.flags, writer)
    writer.append(item.data)
  }
  public static noCasSerialize: Serializer<Item> = (item, writer) => {
    // skip cas
    UInt32.serialize(item.flags, writer)
    writer.append(item.data)
  }
}

// This implementation supports a read-only mode.
export enum OperationMode { ReadWrite, ReadOnly }

export interface Options {
  useCas?: boolean
  defaultMode?: OperationMode
}

export class EasyMemcached implements MemcachedSubset {
  private readonly useCas: boolean
  private readonly itemSerializer: Serializer<Item>
  private readonly itemDeserializer: Deserializer<Item>
  private readonly mutex = new Mutex()
  private _mode: OperationMode
  constructor (
    private readonly store: Store<Buffer, Buffer>,
    options: Options = {}
  ) {
    this.useCas = options.useCas || false
    this._mode = options.defaultMode || OperationMode.ReadOnly // default is READ ONLY
    if (this.useCas) {
      this.itemSerializer = Item.serialize
      this.itemDeserializer = Item.deserialize
    } else {
      this.itemSerializer = Item.noCasSerialize
      this.itemDeserializer = Item.noCasDeserialize
    }
  }
  public get mode () { return this._mode }
  public changeMode (mode: OperationMode) {
    // NOTE: For performance, there is no lock of mode state.
    this._mode = mode
  }
  public async set (keyString: string, flags: number, data: Buffer): Promise<Response.Stored> {
    this.checkWritable()
    const key = Buffer.from(keyString, 'utf8')
    return this.mutex.use<Response.Stored>(async () => {
      const casUniq = this.useCas
        ? (await this.store.get(key)).match(v => deserialize(v, this.itemDeserializer).casUniq, () => 0)
        : 0
      await this.store.set(key, serialize(new Item(flags, casUniq + 1, data), this.itemSerializer))
      return Response.Stored
    })
  }
  public add (keyString: string, flags: number, data: Buffer): Promise<Response.Stored | Response.NotStored> {
    return this.getAndAct(keyString, async (key, item) => {
      if (item === undefined) {
        await this.store.set(key, serialize(new Item(flags, 1, data), this.itemSerializer))
        return Response.Stored
      } else {
        return Response.NotStored
      }
    })
  }
  public replace (keyString: string, flags: number, data: Buffer): Promise<Response.Stored | Response.NotStored> {
    return this.getAndAct(keyString, async (key, item) => {
      if (item !== undefined) {
        await this.store.set(key, serialize(new Item(flags, item.casUniq + 1, data), this.itemSerializer))
        return Response.Stored
      } else {
        return Response.NotStored
      }
    })
  }
  public append (keyString: string, data: Buffer): Promise<Response.Stored | Response.NotStored> {
    return this.getAndAct(keyString, async (key, item) => {
      if (item !== undefined) {
        await this.store.set(key, serialize(new Item(item.flags, item.casUniq + 1, Buffer.concat([item.data, data])), this.itemSerializer))
        return Response.Stored
      } else {
        return Response.NotStored
      }
    })
  }
  public prepend (keyString: string, data: Buffer): Promise<Response.Stored | Response.NotStored> {
    return this.getAndAct(keyString, async (key, item) => {
      if (item !== undefined) {
        await this.store.set(key, serialize(new Item(item.flags, item.casUniq + 1, Buffer.concat([data, item.data])), this.itemSerializer))
        return Response.Stored
      } else {
        return Response.NotStored
      }
    })
  }
  public cas (keyString: string, flags: number, casUniq: number, data: Buffer): Promise<Response.Stored | Response.Exists | Response.NotFound> {
    return this.getAndAct(keyString, async (key, item) => {
      if (item !== undefined) {
        if (item.casUniq === casUniq) {
          await this.store.set(key, serialize(new Item(flags, item.casUniq + 1, data), this.itemSerializer))
          return Response.Stored
        } else {
          return Response.Exists
        }
      } else {
        return Response.NotFound
      }
    })
  }
  public async * get (keys: string[]): AsyncIterable<Response.Value> {
    for await(const valS of this.gets(keys)) {
      yield { key: valS.key, flags: valS.flags, data: valS.data }
    }
  }
  public async * gets (keys: string[]): AsyncIterable<Response.ValueS> {
    for (const keyString of keys) {
      const key = Buffer.from(keyString, 'utf8')
      const gotten = await this.store.get(key)
      if (gotten.isSome()) {
        const item = deserialize(gotten.value, this.itemDeserializer)
        yield { key: keyString, flags: item.flags, data: item.data, cas: item.casUniq }
      }
    }
  }
  public async delete (keyString: string): Promise<Response.NotFound | Response.Deleted> {
    return this.getAndAct(keyString, async (key, item) => {
      if (item !== undefined) {
        await this.store.delete(key)
        return Response.Deleted
      } else {
        return Response.NotFound
      }
    })
  }
  public incr (keyString: string, value: number): Promise<Response.Number | Response.NotFound> {
    return this.getAndAct(keyString, async (key, item) => {
      if (item !== undefined) {
        const count = parseInt(item.data.toString(), 10)
        // On real memcached, count saturate to max 64bit uint (2^64 - 1).
        // But on this implementation, it is MAX_SAFE_INTEGER (2^53 - 1) in javascript
        const newCount = Math.min(count + value, Number.MAX_SAFE_INTEGER)
        await this.store.set(key, serialize(new Item(item.flags, item.casUniq + 1, Buffer.from(newCount.toString(10))), this.itemSerializer))
        return newCount
      } else {
        return Response.NotFound
      }
    })
  }
  public decr (keyString: string, value: number): Promise<Response.Number | Response.NotFound> {
    return this.getAndAct(keyString, async (key, item) => {
      if (item !== undefined) {
        const count = parseInt(item.data.toString(), 10)
        const newCount = Math.max(count - value, 0)
        await this.store.set(key, serialize(new Item(item.flags, item.casUniq + 1, Buffer.from(newCount.toString(10))), this.itemSerializer))
        return newCount
      } else {
        return Response.NotFound
      }
    })
  }
  public async * stats (...args: any[]): AsyncIterable<Response.Stat> {
    // TODO: return some useful information
    if (args.length > 0) { throw new Error('unsupported argument') }
    return undefined
  }
  public async flush (): Promise<Response.Ok> {
    this.checkWritable()
    await this.store.clear()
    return Response.Ok
  }
  public version (): Promise<Response.Version> {
    return Promise.resolve({ version: '0' })
  }
  public verbosity (_level: number): Promise<Response.Ok> {
    // TODO: set logger enable
    return Promise.resolve<Response.Ok>(Response.Ok)
  }
  public quit (): Promise<void> {
    return Promise.resolve()
  }
  private async getAndAct<T> (keyString: string, action: (key: Buffer, item?: Item) => Promise<T>): Promise<T> {
    this.checkWritable()
    const key = Buffer.from(keyString, 'utf8')
    return this.mutex.use(async () =>
      action(key, (await this.store.get(key)).match(
        v => deserialize(v, this.itemDeserializer),
        () => undefined
      ))
    )
  }
  private checkWritable () {
    if (this.mode === OperationMode.ReadOnly) { throw new Error('current mode is read only') }
  }
}
