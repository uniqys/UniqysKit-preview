import { MerklePatriciaTrie, KeyValueProof, TrieStore } from '.'
import { Operation, MerkleProof } from '../merkle-proof'
import { Content } from './node'
import { InMemoryStore } from '@uniqys/store'
import { Hash } from '@uniqys/signature'
import { serialize } from '@uniqys/serialize'

async function collect<T> (iter: AsyncIterable<T>): Promise<T[]> {
  let collect = []
  for await (const v of iter) {
    collect.push(v)
  }
  return collect
}

describe('Merkle Patricia Trie', () => {
  const cat = Buffer.from('cat')
  const catalog = Buffer.from('catalog')
  const catalyst = Buffer.from('catalyst')
  const category = Buffer.from('category')
  const cattle = Buffer.from('cattle')
  const meow = Buffer.from('meow')
  const foo = Buffer.from('foo')
  const bar = Buffer.from('bar')

  let mpt = new MerklePatriciaTrie(new TrieStore(new InMemoryStore()))
  beforeEach(async () => {
    await mpt.ready()
    await mpt.clear()
  })

  it('need to make ready', async () => {
    const mpt1 = new MerklePatriciaTrie(new TrieStore(new InMemoryStore()))
    await expect(mpt1.set(cat, meow)).rejects.toThrow('trie is not ready')
  })
  it('can set and get values of key', async () => {
    await mpt.set(cat, meow)
    await mpt.set(catalyst, foo)
    expect((await mpt.get(cat)).match(v => v.equals(meow), () => false)).toBeTruthy()
    expect((await mpt.get(catalyst)).match(v => v.equals(foo), () => false)).toBeTruthy()
  })
  it('return optional when get value', async () => {
    await mpt.set(cat, meow)
    expect((await mpt.get(cat)).isSome()).toBeTruthy()
    expect((await mpt.get(catalog)).isSome()).not.toBeTruthy()
  })
  it('can delete a value of key', async () => {
    await mpt.set(cat, meow)
    expect((await mpt.get(cat)).isSome()).toBeTruthy()
    await mpt.delete(cat)
    expect((await mpt.get(cat)).isSome()).not.toBeTruthy()
  })
  it('can update a value of key', async () => {
    await mpt.set(cat, foo)
    await mpt.set(cat, meow)
    expect((await mpt.get(cat)).match(v => v.equals(meow), () => false)).toBeTruthy()
  })
  it('can rollback', async () => {
    await mpt.set(cat, meow)
    const root = mpt.root
    await mpt.set(cat, bar)
    await mpt.set(catalyst, foo)
    expect((await mpt.get(cat)).match(v => v.equals(bar), () => false)).toBeTruthy()
    expect((await mpt.get(catalyst)).match(v => v.equals(foo), () => false)).toBeTruthy()
    await mpt.rollback(root)
    expect((await mpt.get(cat)).match(v => v.equals(meow), () => false)).toBeTruthy()
    expect((await mpt.get(catalyst)).isSome()).not.toBeTruthy()
  })
  it('can clear values', async () => {
    await mpt.set(cat, meow)
    await mpt.set(catalyst, foo)
    await mpt.clear()
    expect((await mpt.get(cat)).isSome()).not.toBeTruthy()
    expect((await mpt.get(catalyst)).isSome()).not.toBeTruthy()
  })
  it('can clear values of prefix', async () => {
    await mpt.set(cat, meow)
    await mpt.set(catalyst, foo)
    await mpt.set(catalog, bar)
    // cSpell:ignore cata
    await mpt.clear(Buffer.from('cata'))
    expect((await mpt.get(cat)).isSome()).toBeTruthy()
    expect((await mpt.get(catalyst)).isSome()).not.toBeTruthy()
    expect((await mpt.get(catalog)).isSome()).not.toBeTruthy()
  })
  it('iterate empty', async () => {
    expect(await collect(mpt)).toEqual([])
    expect(await collect(mpt.keys())).toEqual([])
    expect(await collect(mpt.values())).toEqual([])
  })
  it('iterate key-values in dictionary order', async () => {
    await mpt.set(category, bar)
    await mpt.set(cat, meow)
    await mpt.set(catalyst, foo)
    await mpt.set(cattle, foo)
    await mpt.set(catalog, bar)
    expect(await collect(mpt)).toEqual([[cat, meow], [catalog, bar], [catalyst, foo], [category, bar], [cattle, foo]])
    expect(await collect(mpt.keys())).toEqual([cat, catalog, catalyst, category, cattle])
    expect(await collect(mpt.values())).toEqual([meow, bar, foo, bar, foo])
  })
  it('can set values in another order', async () => {
    // for another process of constructing
    await mpt.set(catalyst, foo)
    await mpt.set(catalog, bar)
    await mpt.set(cat, meow)
    await mpt.set(cattle, foo)
    await mpt.set(category, bar)
    expect(await collect(mpt)).toEqual([[cat, meow], [catalog, bar], [catalyst, foo], [category, bar], [cattle, foo]])
  })
  it('is hashable on root node', async () => {
    await mpt.set(cat, meow)
    const root = Hash.fromData(serialize(new Content(cat, meow)))

    expect(mpt.root.equals(root)).toBeTruthy()
    expect(mpt.hash.equals(root)).toBeTruthy()
  })
  it('is deterministic', async () => {
    const mpt1 = new MerklePatriciaTrie(new TrieStore(new InMemoryStore()))
    await mpt1.ready()
    await mpt1.set(cat, meow)
    await mpt1.set(catalyst, foo)
    await mpt1.set(cattle, foo)

    const mpt2 = new MerklePatriciaTrie(new TrieStore(new InMemoryStore()))
    await mpt2.ready()
    await mpt2.set(catalyst, meow)
    await mpt2.set(catalog, bar)
    await mpt2.delete(catalog)
    await mpt2.set(cattle, foo)
    await mpt2.set(catalyst, foo)
    await mpt2.set(cat, meow)
    await mpt2.delete(catalog)

    expect(mpt1.root.equals(mpt2.root)).toBeTruthy()
  })
  it('can make and verify merkle proof', async () => {
    await mpt.set(category, bar)
    await mpt.set(cat, meow)
    await mpt.set(catalyst, foo)
    await mpt.set(cattle, foo)
    await mpt.set(catalog, bar)
    // leaf value
    const merkleProof1 = await mpt.prove(catalog)
    expect(merkleProof1.key.equals(catalog)).toBeTruthy()
    expect(merkleProof1.value.equals(bar)).toBeTruthy()
    expect(merkleProof1.verify(mpt.root)).toBeTruthy()

    // branch value
    const merkleProof2 = await mpt.prove(cat)
    expect(merkleProof2.key.equals(cat)).toBeTruthy()
    expect(merkleProof2.value.equals(meow)).toBeTruthy()
    expect(merkleProof2.verify(mpt.root)).toBeTruthy()
  })
  it('can not make invalid merkle proof', async () => {
    await mpt.set(catalyst, foo)
    await mpt.set(catalog, bar)
    await mpt.set(cat, meow)

    await expect(mpt.prove(category)).rejects.toThrow('key does not exist')
  })
  it('reject fake merkle proof', async () => {
    await mpt.set(catalyst, foo)
    await mpt.set(catalog, bar)
    await mpt.set(cat, meow)
    const proof = await mpt.prove(catalog)
    const ops = proof.proof.operations
    for (const i in ops) {
      if (ops[i] instanceof Operation.Value) {
        ops[i] = new Operation.Value(serialize(new Content(catalog, foo)))
      }
    }
    const fake = new KeyValueProof(new MerkleProof(ops))
    expect(fake.verify(mpt.root)).not.toBeTruthy()
    expect(proof.verify(Hash.fromData('foo'))).not.toBeTruthy()
  })
})
