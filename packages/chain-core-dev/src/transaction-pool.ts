import { Transaction } from '@uniqys/blockchain'
import { Hash } from '@uniqys/signature'

export class TransactionPool {
  private pool = new Map<string, Transaction>()
  constructor (
    private readonly validator: (tx: Transaction) => Promise<boolean>,
    private readonly selector: (txs: Transaction[]) => Promise<Transaction[]>
  ) {
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
    return true
  }
}
