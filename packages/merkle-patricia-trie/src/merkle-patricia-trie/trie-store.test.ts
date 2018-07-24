import { TrieStore } from './trie-store'
import { Node } from './node'
import { Hash } from '@uniqys/signature'
import { InMemoryStore } from '@uniqys/store'

describe('trie node store', () => {
  let store: TrieStore
  let hash: Hash
  let node: Node
  beforeAll(() => {
    hash = Hash.fromData('foo')
    node = Node.null
  })
  beforeEach(() => {
    store = new TrieStore(new InMemoryStore())
  })
  it('set and get node by hash', async () => {
    await store.set(hash, node)
    expect(await store.get(hash)).toEqual(node)
  })
  it('throw error if not exists', async () => {
    await expect(store.get(hash)).rejects.toThrow()
  })
  it('set and get root hash', async () => {
    await store.setRoot(hash)
    expect(await store.getRoot()).toEqual(hash)
  })
  it('does not throw error if not exists', async () => {
    expect(await store.getRoot()).toBeUndefined()
  })
})
