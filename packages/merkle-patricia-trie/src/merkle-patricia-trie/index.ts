import { Node, Content, Key } from './node'
import { MerkleProof } from '../merkle-proof'
import { TrieStore } from './trie-store'
import { Hash, Hashable } from '@uniqys/signature'
import { Optional } from '@uniqys/types'
import { deserialize } from '@uniqys/serialize'

export { Node, TrieStore }

export class KeyValueProof {
  public readonly key: Buffer
  public readonly value: Buffer
  constructor (
    public readonly proof: MerkleProof
  ) {
    const content = deserialize(proof.values()[0], Content.deserialize)
    this.key = content.key
    this.value = content.value
  }

  public verify (expect: Hash): boolean { return this.proof.verify(expect) }
}

// Merkle Patricia trie implementation.
export class MerklePatriciaTrie implements Hashable, AsyncIterable<[Buffer, Buffer]> {
  get root (): Hash { return this.rootHash }
  get hash (): Hash { return this.rootHash }
  private rootHash = Node.null.hash
  private isReady = false

  constructor (
    private readonly store: TrieStore
  ) { }
  public async ready (): Promise<void> {
    if (this.isReady) { return Promise.resolve() }
    const rootHash = await this.store.getRoot()
    if (rootHash) {
      this.rootHash = rootHash
    } else {
      const nullRoot = Node.null
      await this.store.set(nullRoot.hash, nullRoot)
      await this.store.setRoot(nullRoot.hash)
      this.rootHash = nullRoot.hash
    }
    this.isReady = true
  }
  public [Symbol.asyncIterator] (): AsyncIterableIterator<[Buffer, Buffer]> {
    this.checkReady()
    return this.entries()
  }
  public async *entries (): AsyncIterableIterator<[Buffer, Buffer]> {
    this.checkReady()
    const root = await this.store.get(this.rootHash)
    for await (const content of root.contents(this.store)) {
      yield [content.key, content.value]
    }
  }
  public async *keys (): AsyncIterableIterator<Buffer> {
    this.checkReady()
    for await (const kv of this.entries()) {
      yield kv['0']
    }
  }
  public async *values (): AsyncIterableIterator<Buffer> {
    this.checkReady()
    for await (const kv of this.entries()) {
      yield kv['1']
    }
  }
  public async get (key: Buffer): Promise<Optional<Buffer>> {
    this.checkReady()
    const root = await this.store.get(this.rootHash)
    return (await root.get(this.store, Key.bufferToKey(key))).match(
      c => Optional.some(c.value),
      () => Optional.none()
    )
  }
  public async set (key: Buffer, value: Buffer): Promise<void> {
    this.checkReady()
    const root = await this.store.get(this.rootHash)
    await this.save(await root.set(this.store, Key.bufferToKey(key), new Content(key, value)))
  }
  public async delete (key: Buffer): Promise<void> {
    this.checkReady()
    const root = await this.store.get(this.rootHash)
    await this.save(await root.delete(this.store, Key.bufferToKey(key)))
  }
  public async clear (prefix?: Buffer): Promise<void> {
    this.checkReady()
    const root = await this.store.get(this.rootHash)
    await this.save(await root.clear(this.store, prefix ? Key.bufferToKey(prefix) : []))
  }
  public async rollback (root: Hash) {
    this.checkReady()
    this.rootHash = root
  }
  public async prove (key: Buffer): Promise<KeyValueProof> {
    this.checkReady()
    const root = await this.store.get(this.rootHash)
    const proof = await root.prove(this.store, Key.bufferToKey(key))
    proof.optimize()
    return new KeyValueProof(proof)
  }
  private async save (root: Node): Promise<void> {
    const normalized = await root.normalize(this.store)
    const newRoot = await normalized.match(
      async node => node.save(this.store),
      async () => Node.null
    )
    await this.store.setRoot(newRoot.hash)
    this.rootHash = newRoot.hash
  }
  private checkReady (): void {
    if (!this.isReady) { throw new Error('trie is not ready') }
  }
}
