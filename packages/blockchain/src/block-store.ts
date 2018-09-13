import { Store } from '@uniqys/store'
import { Mutex } from '@uniqys/lock'
import { serialize, deserialize, UInt64 } from '@uniqys/serialize'
import { BlockHeader, BlockBody } from './block'
import { Consensus } from './consensus'

namespace Key {
  const HEADER_PREFIX = 'header:'
  const BODY_PREFIX = 'body:'
  const HEIGHT_KEY = 'height'
  const CONSENSUS_KEY = 'consensus'
  export const height = Buffer.from(HEIGHT_KEY)
  export const consensus = Buffer.from(CONSENSUS_KEY)
  export function header (height: number): Buffer {
    return serialize(height, (h, w) => {
      w.ensure(1).write(HEADER_PREFIX, 0, 1)
      UInt64.serialize(h, w)
    })
  }
  export function body (height: number): Buffer {
    return serialize(height, (h, w) => {
      w.ensure(1).write(BODY_PREFIX, 0, 1)
      UInt64.serialize(h, w)
    })
  }
}
export class BlockStore {
  public readonly mutex = new Mutex()
  private _height: undefined | number // cache
  constructor (
    private readonly store: Store<Buffer, Buffer>
  ) {}

  public async getHeight (): Promise<number> {
    if (this._height) { return Promise.resolve(this._height) }
    return (await this.store.get(Key.height)).match(
      v => deserialize(v, UInt64.deserialize),
      () => 0
    )
  }
  public async getLastConsensus (): Promise<Consensus> {
    return (await this.store.get(Key.consensus)).match(
      v => Promise.resolve(deserialize(v, Consensus.deserialize)),
      () => Promise.reject(new Error('not found'))
    )
  }
  public async getHeader (height: number): Promise<BlockHeader> {
    return (await this.store.get(Key.header(height))).match(
      v => Promise.resolve(deserialize(v, BlockHeader.deserialize)),
      () => Promise.reject(new Error('not found'))
    )
  }
  public async getBody (height: number): Promise<BlockBody> {
    return (await this.store.get(Key.body(height))).match(
      v => Promise.resolve(deserialize(v, BlockBody.deserialize)),
      () => Promise.reject(new Error('not found'))
    )
  }

  public async setHeight (height: number): Promise<void> {
    await this.store.set(Key.height, serialize(height, UInt64.serialize))
    this._height = height
  }
  public async setLastConsensus (consensus: Consensus): Promise<void> {
    await this.store.set(Key.consensus, serialize(consensus))
  }
  public async setHeader (height: number, header: BlockHeader): Promise<void> {
    await this.store.set(Key.header(height), serialize(header))
  }
  public async setBody (height: number, body: BlockBody): Promise<void> {
    await this.store.set(Key.body(height), serialize(body))
  }
}
