import levelup from 'levelup'
import { AbstractLevelDOWN } from 'abstract-leveldown'
import { Optional } from '@uniqys/types'

export interface Store<K, V> {
  get (key: K): Promise<Optional<V>>
  set (key: K, value: V): Promise<void>
  delete (key: K): Promise<void>
  clear (prefix?: K): Promise<void>
}

export class InMemoryStore<V = Buffer> implements Store<Buffer, V> {
  private store = new Map<string, V>()
  public async get (key: Buffer): Promise<Optional<V>> {
    const value = this.store.get(key.toString('hex'))
    return value ? Optional.some(value) : Optional.none()
  }
  public async set (key: Buffer, value: V): Promise<void> {
    this.store.set(key.toString('hex'), value)
    return
  }
  public async delete (key: Buffer): Promise<void> {
    this.store.delete(key.toString('hex'))
    return
  }
  public async clear (prefix?: Buffer): Promise<void> {
    if (prefix) {
      const regex = new RegExp(`^${prefix.toString('hex')}`)
      for (const key of this.store.keys()) {
        if (regex.test(key)) {
          this.store.delete(key)
        }
      }
    } else {
      this.store.clear()
    }
    return
  }
}

export class LevelDownStore implements Store<Buffer, Buffer> {
  private readonly db: levelup.LevelUp<Buffer, Buffer>
  constructor (
    db: AbstractLevelDOWN<Buffer, Buffer>
  ) {
    this.db = levelup(db)
  }
  public async get (key: Buffer): Promise<Optional<Buffer>> {
    try {
      const value = await this.db.get(key)
      return Optional.some(value)
    } catch (err) {
      /* istanbul ignore else: back-end error */
      if (err instanceof levelup.errors.NotFoundError) {
        return Optional.none()
      } else {
        throw err
      }
    }
  }
  public async set (key: Buffer, value: Buffer): Promise<void> {
    await this.db.put(key, value)
    return
  }
  public async delete (key: Buffer): Promise<void> {
    await this.db.del(key)
    return
  }
  public async clear (_?: Buffer): Promise<void> {
    throw new Error('not supported by level down')
  }
}

export class Namespace<V> implements Store<Buffer, V> {
  private readonly prefix: Buffer
  constructor (
    private readonly base: Store<Buffer, V>,
    prefix: Buffer | string
  ) {
    this.prefix = typeof prefix === 'string' ? Buffer.from(prefix) : prefix
  }
  public fullKey (key: Buffer): Buffer {
    return Buffer.concat([this.prefix, key])
  }
  public get (key: Buffer): Promise<Optional<V>> {
    return this.base.get(this.fullKey(key))
  }
  public set (key: Buffer, value: V): Promise<void> {
    return this.base.set(this.fullKey(key), value)
  }
  public delete (key: Buffer): Promise<void> {
    return this.base.delete(this.fullKey(key))
  }
  public clear (prefix?: Buffer): Promise<void> {
    return this.base.clear(prefix ? this.fullKey(prefix) : this.prefix)
  }
}
