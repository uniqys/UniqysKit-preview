import { Store, InMemoryStore, LevelDownStore, Namespace } from '.'
import MemDown from 'memdown'

// cSpell:ignore cata
const cat = Buffer.from('cat')
const cata = Buffer.from('cata')
const catalog = Buffer.from('catalog')
const catalyst = Buffer.from('catalyst')
const category = Buffer.from('category')
const meow = Buffer.from('meow')
const foo = Buffer.from('foo')
const bar = Buffer.from('bar')

describe.each([
  ['in memory implementation', () => new InMemoryStore()],
  ['leveldown implementation', () => new LevelDownStore(new MemDown())]
])('store of %s', (_, ctor) => {
  let store: Store<Buffer, Buffer>
  beforeEach(() => {
    store = ctor()
  })
  it('get None if not set', async () => {
    expect((await store.get(cat)).isSome()).not.toBeTruthy()
  })
  it('get Some(value) if set', async () => {
    await store.set(cat, meow)
    expect((await store.get(cat)).match(v => v.equals(meow), () => false)).toBeTruthy()
  })
  it('delete value', async () => {
    await store.set(cat, meow)
    expect((await store.get(cat)).isSome()).toBeTruthy()
    await store.delete(cat)
    expect((await store.get(cat)).isSome()).not.toBeTruthy()
  })
  it('clear all', async () => {
    await store.set(cat, meow)
    await store.set(catalog, foo)
    await store.set(category, bar)
    if (store instanceof LevelDownStore) {
      await expect(store.clear()).rejects.toThrow() // not implemented
    } else {
      await store.clear()
      expect((await store.get(cat)).isSome()).not.toBeTruthy()
      expect((await store.get(catalog)).isSome()).not.toBeTruthy()
      expect((await store.get(category)).isSome()).not.toBeTruthy()
    }
  })
  it('clear prefixed', async () => {
    await store.set(cat, meow)
    await store.set(catalog, foo)
    await store.set(catalyst, bar)
    await store.set(category, foo)
    if (store instanceof LevelDownStore) {
      await expect(store.clear(cata)).rejects.toThrow() // not implemented
    } else {
      await store.clear(cata)
      expect((await store.get(cat)).isSome()).toBeTruthy()
      expect((await store.get(catalog)).isSome()).not.toBeTruthy()
      expect((await store.get(catalyst)).isSome()).not.toBeTruthy()
      expect((await store.get(category)).isSome()).toBeTruthy()
    }
  })
})

describe('namespace', () => {
  let base: Store<Buffer, Buffer>
  let space1: Namespace<Buffer>
  let space2: Namespace<Buffer>
  beforeEach(() => {
    base = new InMemoryStore()
    space1 = new Namespace(base, cata)
    space2 = new Namespace(base, 'foo')
  })
  it('space separated', async () => {
    await space1.set(cat, meow)
    expect((await space1.get(cat)).match(v => v.equals(meow), () => false)).toBeTruthy()
    expect((await space2.get(cat)).isSome()).not.toBeTruthy()
  })
  it('delete value separated', async () => {
    await space1.set(cat, meow)
    await space2.set(cat, meow)
    expect((await space1.get(cat)).isSome()).toBeTruthy()
    expect((await space2.get(cat)).isSome()).toBeTruthy()
    await space1.delete(cat)
    expect((await space1.get(cat)).isSome()).not.toBeTruthy()
    expect((await space2.get(cat)).isSome()).toBeTruthy()
  })
  it('clear separated', async () => {
    await space1.set(cat, meow)
    await space1.set(catalog, foo)
    await space2.set(cat, meow)
    await space2.set(catalog, foo)
    await space1.clear()
    expect((await space1.get(cat)).isSome()).not.toBeTruthy()
    expect((await space1.get(catalog)).isSome()).not.toBeTruthy()
    expect((await space2.get(cat)).isSome()).toBeTruthy()
    expect((await space2.get(catalog)).isSome()).toBeTruthy()
  })
})
