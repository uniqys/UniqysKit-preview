import { Hash, Hashable } from '@uniqys/signature'
import { Either, Optional } from '@uniqys/types'
import { Serializable, Deserializer, BufferWriter, serialize, UInt32 } from '@uniqys/serialize'
import { MerkleProof } from '../merkle-proof'

export type Key = Key.Alphabet[]
export namespace Key {
  export type Alphabet = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15
  export function keyToBuffer (key: Key): Buffer {
    const bytes: number[] = []
    for (let i = 0; i < key.length / 2; i++) {
      bytes.push(key[i * 2] * 16 + key[i * 2 + 1])
    }
    return Buffer.from(bytes)
  }
  export function bufferToKey (buf: Buffer): Key {
    const key: Key = []
    for (let i = 0; i < buf.byteLength; i++) {
      const byte = buf[i]
      const lowerBits = byte % 16
      key.push((byte - lowerBits) / 16 as Alphabet)
      key.push(lowerBits as Alphabet)
    }
    return key
  }
  export function match (key1: Key, key2: Key): { equal: boolean, prefix: Key, remain1: Key, remain2: Key } {
    let diffIndex = key1.findIndex((v, i) => v !== key2[i])
    diffIndex = diffIndex === -1 ? key1.length : diffIndex
    return {
      equal: key1.length === key2.length && key1.length === diffIndex,
      prefix: key1.slice(0, diffIndex),
      remain1: key1.slice(diffIndex),
      remain2: key2.slice(diffIndex)
    }
  }
}

export class Content implements Serializable {
  private _serialized?: Buffer
  constructor (
    public readonly key: Buffer,
    public readonly value: Buffer
  ) {}

  public static deserialize: Deserializer<Content> = (reader) => {
    const key = reader.consume(UInt32.deserialize(reader))
    const value = reader.consume(UInt32.deserialize(reader))
    return new Content(key, value)
  }
  public serialize (writer: BufferWriter) {
    if (this._serialized === undefined) {
      const w = new BufferWriter()
      UInt32.serialize(this.key.byteLength, w)
      w.append(this.key)
      UInt32.serialize(this.value.byteLength, w)
      w.append(this.value)
      this._serialized = w.buffer
    }
    return writer.append(this._serialized)
  }
}

// Store of node, that can store node and get it by hash
export interface NodeStore {
  get (key: Hash): Promise<Node>
  set (key: Hash, value: Node): Promise<void>
}

export type NodeRef = Either<Hash, Node>
export namespace NodeRef {
  export function ofHash (hash: Hash): NodeRef { return Either.left(hash) }
  export function ofNode (node: Node): NodeRef { return Either.right(node) }
  export function dereference (store: NodeStore, ref: NodeRef): Promise<Node> {
    return ref.match(async h => store.get(h), async n => n)
  }
}

export class Node implements Serializable, Hashable {
  public static readonly branch: 16 = 16
  public static readonly null = new Node([], Node.emptyBranch(), Optional.none())
  private _hash?: Hash
  constructor (
    public readonly prefix: Key,
    public readonly children: Optional<NodeRef>[],
    public readonly content: Optional<Content>
  ) {
    if (children.length !== Node.branch) { throw new Error('invalid branch count') }
  }
  public static emptyBranch () {
    return new Array<Optional<NodeRef>>(Node.branch).fill(Optional.none())
  }
  public static deserialize: Deserializer<Node> = (reader) => {
    const keyLength = UInt32.deserialize(reader)
    const isEven = keyLength % 2 === 0
    const keyBufSize = (isEven ? keyLength : keyLength + 1) / 2
    const evenKey = Key.bufferToKey(reader.consume(keyBufSize))
    const key = isEven ? evenKey : evenKey.slice(1)
    let children = []
    for (let i = 0; i < Node.branch; i++) {
      const child = Optional.deserialize(Hash.deserialize)(reader)
      children.push(child.match(hash => Optional.some(NodeRef.ofHash(hash)), () => Optional.none<NodeRef>()))
    }
    const value = Optional.deserialize(Content.deserialize)(reader)
    return new Node(key, children, value)
  }
  public serialize (writer: BufferWriter) {
    // TODO: more efficient encode like ethereum
    const isEven = this.prefix.length % 2 === 0
    const evenKey: Key = isEven ? this.prefix : [0, ...this.prefix] // make even length
    UInt32.serialize(this.prefix.length, writer)
    writer.append(Key.keyToBuffer(evenKey))
    this.children.forEach(child => {
      child.serialize(
        (ref, w) => ref.match(hash => hash.serialize(w),
        _ => { throw new Error('need store children before serialize') })
      )(writer)
    })
    this.content.serialize((kv, w) => kv.serialize(w))(writer)
  }
  public async *contents (store: NodeStore): AsyncIterableIterator<Content> {
    if (this.content.isSome()) {
      yield this.content.value
    }

    for (const childRef of this.children) {
      if (childRef.isSome()) {
        const child = await NodeRef.dereference(store, childRef.value)
        for await (const c of child.contents(store)) {
          yield c
        }
      }
    }
  }
  public async get (store: NodeStore, key: Key): Promise<Optional<Content>> {
    const matchResult = Key.match(this.prefix, key)
    if (matchResult.remain1.length !== 0) { return Optional.none() } // not match prefix
    if (matchResult.remain2.length === 0) { return this.content }

    return this.children[matchResult.remain2[0]].match(
      async ref => (await NodeRef.dereference(store, ref)).get(store, matchResult.remain2.slice(1)),
      async () => Optional.none<Content>()
    )
  }
  public async set (store: NodeStore, key: Key, content: Content): Promise<Node> {
    const matchResult = Key.match(this.prefix, key)
    if (matchResult.remain1.length === 0) {
      if (matchResult.remain2.length === 0) {
        return new Node(this.prefix, this.children, Optional.some(content))
      } else {
        const children = this.children.slice()
        children[matchResult.remain2[0]] = await this.children[matchResult.remain2[0]].match(
          async ref => Optional.some(NodeRef.ofNode(await (await NodeRef.dereference(store, ref)).set(store, matchResult.remain2.slice(1), content))),
          async () => Optional.some(NodeRef.ofNode(new Node(matchResult.remain2.slice(1), Node.emptyBranch(), Optional.some(content))))
        )
        return new Node(this.prefix, children, this.content)
      }
    } else {
      const children = Node.emptyBranch()
      children[matchResult.remain1[0]] = Optional.some(NodeRef.ofNode(new Node(matchResult.remain1.slice(1), this.children, this.content)))
      return new Node(matchResult.prefix, children, Optional.none()).set(store, key, content)
    }
  }
  public async delete (store: NodeStore , key: Key): Promise<Node> {
    const matchResult = Key.match(this.prefix, key)
    if (matchResult.remain1.length === 0) {
      if (matchResult.remain2.length === 0) {
        return new Node(this.prefix, this.children, Optional.none())
      } else {
        const children = this.children.slice()
        children[matchResult.remain2[0]] = await this.children[matchResult.remain2[0]].match(
          async ref => Optional.some(NodeRef.ofNode(await (await NodeRef.dereference(store, ref)).delete(store, matchResult.remain2.slice(1)))),
          async () => Optional.none<NodeRef>()
        )
        return new Node(this.prefix, children, this.content)
      }
    } else {
      return this
    }
  }
  public async clear (store: NodeStore , key: Key): Promise<Node> {
    const matchResult = Key.match(this.prefix, key)
    if (matchResult.remain2.length === 0) {
      return Node.null
    }
    if (matchResult.remain1.length === 0) {
      const children = this.children.slice()
      children[matchResult.remain2[0]] = await this.children[matchResult.remain2[0]].match(
        async ref => Optional.some(NodeRef.ofNode(await (await NodeRef.dereference(store, ref)).clear(store, matchResult.remain2.slice(1)))),
        async () => Optional.none<NodeRef>()
      )
      return new Node(this.prefix, children, this.content)
    }
    return this
  }
  public async normalize (store: NodeStore): Promise<Optional<Node>> {
    const normalizedChildren = await Promise.all(this.children.map(child => child.match(
      async ref => ref.match(
        async hash => Optional.some(NodeRef.ofHash(hash)), // hash is normalized
        async node => (await node.normalize(store)).match(node => Optional.some(NodeRef.ofNode(node)), () => Optional.none<NodeRef>())
      ),
      async () => Optional.none<NodeRef>()
    )))
    const existingChildren: { index: number, ref: NodeRef }[] = []
    for (const [i, child] of normalizedChildren.entries()) {
      if (child.isSome()) {
        existingChildren.push({ index: i, ref: child.value })
      }
    }
    if (this.content.isNone()) {
      if (existingChildren.length === 0) {
        return Optional.none() // no content
      }
      if (existingChildren.length === 1) {
        const index = existingChildren[0].index as Key.Alphabet
        const child = await NodeRef.dereference(store, existingChildren[0].ref)
        return Optional.some(new Node([...this.prefix, index, ...child.prefix], child.children, child.content))
      }
    }
    return Optional.some(new Node(this.prefix, normalizedChildren, this.content))
  }
  public async save (store: NodeStore): Promise<Node> {
    const children = await Promise.all(this.children.map(child => child.match(
      async ref => Optional.some(NodeRef.ofHash(await ref.match(async hash => hash, async node => (await node.save(store)).hash))),
      async () => Optional.none<NodeRef>()
    )))
    const node = new Node(this.prefix, children, this.content)
    const hash = node.hash
    await store.set(hash, node)
    return node
  }
  public get hash (): Hash {
    if (this._hash === undefined) {
      const writer = new BufferWriter()

      for (const child of this.children) {
        if (child.isSome()) {
          child.value.match(hash => hash.serialize(writer), node => node.hash.serialize(writer))
        }
      }
      if (this.content.isSome()) {
        this.content.value.serialize(writer)
      }
      this._hash = Hash.fromData(writer.buffer)
    }
    return this._hash
  }
  public async prove (store: NodeStore, key: Key): Promise<MerkleProof> {
    const matchResult = Key.match(this.prefix, key)
    // case of this content proof
    if (matchResult.remain1.length === 0 && matchResult.remain2.length === 0) {
      if (this.content.isSome()) {
        const proof = new MerkleProof()
        for (const child of this.children) {
          if (child.isSome()) {
            proof.load(child.value.match(hash => hash.buffer, node => node.hash.buffer))
          }
        }
        proof.value(serialize(this.content.value))
        proof.hash() // push calc hash operation
        return proof
      }
    }
    // case of child proof
    if (matchResult.remain1.length === 0 && this.children[matchResult.remain2[0]].isSome()) {
      const proof = new MerkleProof()
      for (const [i, child] of this.children.entries()) {
        if (child.isSome()) {
          if (i === matchResult.remain2[0]) {
            const node = await NodeRef.dereference(store, child.value)
            const childProof = await node.prove(store, matchResult.remain2.slice(1))
            proof.append(childProof)
          } else {
            proof.load(child.value.match(hash => hash.buffer, node => node.hash.buffer))
          }
        }
      }
      if (this.content.isSome()) {
        proof.load(serialize(this.content.value))
      }
      proof.hash() // push calc hash operation
      return proof
    }
    throw new Error('key does not exist')
  }
}
