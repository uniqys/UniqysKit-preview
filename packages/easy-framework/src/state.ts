import { Store, Namespace } from '@uniqys/store'
import { TrieStore, MerklePatriciaTrie } from '@uniqys/merkle-patricia-trie'
import { AppState } from '@uniqys/dapp-interface'
import { HttpResponse } from '@uniqys/easy-types'
import { Address, Hash } from '@uniqys/signature'
import { Account } from './account'
import { Optional } from '@uniqys/types'
import { UInt64, deserialize, serialize } from '@uniqys/serialize'
import { ReadWriteLock } from '@uniqys/lock'

namespace MetaKey {
  export const height = Buffer.from('height')
}
class MetaState {
  constructor (
    private readonly store: Store<Buffer, Buffer>
  ) { }

  public async getHeight () {
    return (await this.store.get(MetaKey.height)).match(
      v => deserialize(v, UInt64.deserialize),
      () => 0
    )
  }
  public async incrementHeight () {
    const height = await this.getHeight()
    await this.store.set(MetaKey.height, serialize(height + 1, UInt64.serialize))
  }
}

export class TransactionResult {
  constructor (
    private readonly store: Store<Buffer, Buffer>
  ) {}

  public async set (tx: Hash, response: HttpResponse) {
    await this.store.set(tx.buffer, serialize(response))
  }

  public async get (tx: Hash): Promise<Optional<HttpResponse>> {
    return (await this.store.get(tx.buffer)).match(
      b => Optional.some(deserialize(b, HttpResponse.deserialize)),
      () => Optional.none()
    )
  }
}

export class State {
  public readonly meta: MetaState
  public readonly result: TransactionResult
  public readonly top: MerklePatriciaTrie
  public readonly app: Store<Buffer, Buffer>
  public readonly rwLock: ReadWriteLock

  constructor (
    private readonly store: Store<Buffer, Buffer>
  ) {
    this.meta = new MetaState(new Namespace(this.store, 'meta:'))
    this.result = new TransactionResult(new Namespace(this.store, 'results:'))
    this.top = new MerklePatriciaTrie(new TrieStore(new Namespace(this.store, 'app:')))
    this.app = new Namespace(this.top, Address.zero.buffer)
    this.rwLock = new ReadWriteLock()
  }
  public async ready (): Promise<void> {
    await this.top.ready()
  }
  public async appState (): Promise<AppState> {
    const root = this.top.root
    const height = await this.meta.getHeight()
    return new AppState(height, root)
  }
  public async getAccount (address: Address): Promise<Account> {
    return (await this.top.get(address.buffer)).match(
        v => deserialize(v, Account.deserialize),
        () => Account.default
    )
  }
  public async setAccount (address: Address, account: Account): Promise<void> {
    await this.top.set(address.buffer, serialize(account))
  }
}
