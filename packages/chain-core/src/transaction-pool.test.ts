import { TransactionPool } from './transaction-pool'
import { Transaction } from '@uniqys/blockchain'

describe('transaction pool', () => {
  let tx1: Transaction
  let tx2: Transaction
  beforeAll(() => {
    tx1 = new Transaction(Buffer.from('The quick brown fox jumps over the lazy dog'))
    tx2 = new Transaction(Buffer.from('Jackdaws love my big sphinx of quartz'))
  })
  it('add transaction to pool and propagate it if valid', (done) => {
    const pool = new TransactionPool(
      async _ => true,
      async txs => txs,
      tx => {
        expect(tx).toEqual(tx1)
        done()
      }
    )
    pool.add(tx1).catch(err => done.fail(err))
  })
  it('care of concurrent addition', async () => {
    const propagate = jest.fn()
    const pool = new TransactionPool(
      async _ => {
        // add same transaction concurrently
        pool['pool'].set(tx1.hash.toHexString(), tx1)
        return true
      },
      async txs => txs,
      propagate
    )
    await pool.add(tx1)
    expect(pool['pool'].size).toBe(1)
    expect(propagate).not.toBeCalled()
  })
  it('does not add transaction to pool if invalid', async () => {
    const propagate = jest.fn()
    const pool = new TransactionPool(
      async _ => false,
      async txs => txs,
      propagate
    )
    await pool.add(tx1)
    expect(pool['pool'].size).toBe(0)
    expect(propagate).not.toBeCalled()
  })
  it('does not add transaction to pool if already known', async () => {
    const propagate = jest.fn()
    const pool = new TransactionPool(
      async _ => true,
      async txs => txs,
      propagate
    )
    await pool.add(tx1)
    expect(pool['pool'].size).toBe(1)
    expect(propagate).toBeCalled()
    propagate.mockClear()
    await pool.add(tx1)
    expect(pool['pool'].size).toBe(1)
    expect(propagate).not.toBeCalled()
  })
  it('does not add transaction to pool if full', async () => {
    const propagate = jest.fn()
    const pool = new TransactionPool(
      async _ => true,
      async txs => txs,
      propagate,
      { maxPooledTransactions: 1 }
    )
    await pool.add(tx1)
    expect(pool['pool'].size).toBe(1)
    expect(propagate).toBeCalled()
    propagate.mockClear()
    await pool.add(tx2)
    expect(pool['pool'].size).toBe(1)
    expect(propagate).not.toBeCalled()
  })
  it('select added transaction', async () => {
    const pool = new TransactionPool(
      async _ => true,
      async txs => txs.length >= 2 ? [txs[1]] : [],
      _ => { /* noop */ }
    )
    const selected1 = await pool.selectTransactions()
    expect(selected1).toEqual([])
    await pool.add(tx1)
    await pool.add(tx2)
    const selected2 = await pool.selectTransactions()
    expect(selected2).toEqual([tx2])
  })
  it('update and filter transactions', async () => {
    let valid = true
    const pool = new TransactionPool(
      async _ => valid,
      async txs => txs,
      _ => { /* noop */ }
    )
    await pool.add(tx1)
    await pool.add(tx2)
    expect(Array.from(pool['pool'].values())).toEqual([tx1, tx2])
    // remove executed txs
    await pool.update([tx1])
    expect(Array.from(pool['pool'].values())).toEqual([tx2])
    // remove invalid txs
    valid = false
    await pool.update([])
    expect(Array.from(pool['pool'].values())).toEqual([])
  })
})
