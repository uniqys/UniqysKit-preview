import { Transaction } from '@uniqys/blockchain'
import { Hash } from '@uniqys/signature'
import debug from 'debug'
const logger = debug('chain-core:tx-pool')

export interface TransactionPoolOptions {
  maxPooledTransactions: number // count
}
export namespace TransactionPoolOptions {
  export const defaults: TransactionPoolOptions = {
    maxPooledTransactions: 1000
  }
}

export class TransactionPool {
  private readonly options: TransactionPoolOptions
  private pool = new Map<string, Transaction>()
  constructor (
    private readonly validator: (tx: Transaction) => Promise<boolean>,
    private readonly selector: (txs: Transaction[]) => Promise<Transaction[]>,
    private readonly propagator: (tx: Transaction) => void,
    options?: Partial<TransactionPoolOptions>
  ) {
    this.options = Object.assign({}, TransactionPoolOptions.defaults, options)
  }

  public has (hash: Hash) {
    return this.pool.has(hash.toHexString())
  }

  public async add (tx: Transaction): Promise<void> {
    const key = tx.hash.toHexString()
    if (!this.canAdd(key)) return

    if (await this.validator(tx)) {
      if (!this.canAdd(key)) return // re-check
      this.pool.set(key, tx)
      this.propagator(tx)
    }
  }

  public async update (executed: Transaction[]): Promise <void> {
    // remove executed txs
    executed.forEach(tx => this.pool.delete(tx.hash.toHexString()))

    const pooled = Array.from(this.pool.values())
    await Promise.all(pooled.map(
      tx => this.validator(tx)
        .then(ok => {
          if (!ok) { this.pool.delete(tx.hash.toHexString()) }
        })
    ))
  }

  public selectTransactions (): Promise<Transaction[]> {
    return this.pool.size === 0 ? Promise.resolve([]) : this.selector(Array.from(this.pool.values()))
  }

  private canAdd (key: string): boolean {
    if (this.pool.has(key)) return false
    if (this.pool.size >= this.options.maxPooledTransactions) {
      logger('transaction pool is full')
      return false
    }
    return true
  }
}
