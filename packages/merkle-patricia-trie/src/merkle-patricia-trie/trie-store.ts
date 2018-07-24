import { Node } from './node'
import { Store } from '@uniqys/store'
import { Hash } from '@uniqys/signature'
import { serialize, deserialize } from '@uniqys/serialize'

namespace Key {
  const NODE_PREFIX = 'node:'
  const ROOT_KEY = 'root'
  export const root = Buffer.from(ROOT_KEY)
  export function node (key: Hash): Buffer {
    return serialize(key, (k, w) => {
      w.ensure(1).write(NODE_PREFIX, 0, 1)
      w.append(k.buffer)
    })
  }
}
export class TrieStore {
  constructor (
    private readonly store: Store<Buffer, Buffer>
  ) {}

  public async get (key: Hash): Promise<Node> {
    return (await this.store.get(Key.node(key))).match(
      v => Promise.resolve(deserialize(v, Node.deserialize)),
      () => Promise.reject(new Error('not found'))
    )
  }
  public async set (key: Hash, value: Node): Promise<void> {
    await this.store.set(Key.node(key), serialize(value))
  }
  public async getRoot (): Promise<Hash | undefined> {
    return (await this.store.get(Key.root)).match(
      v => deserialize(v, Hash.deserialize),
      () => undefined
    )
  }
  public async setRoot (hash: Hash): Promise<void> {
    await this.store.set(Key.root, serialize(hash))
  }
}
