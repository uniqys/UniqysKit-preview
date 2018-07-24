import { Dapp, AppState } from '@uniqys/dapp-interface'
import { Transaction as CoreTransaction } from '@uniqys/blockchain'
import { SignedTransaction } from '@uniqys/easy-types'
import { deserialize } from '@uniqys/serialize'
import { State } from './state'
import { SignedRequest, Response } from './packer'
import { URL } from 'url'
import debug from 'debug'
const logger = debug('easy-fw:controller')

export class Controller implements Dapp {
  constructor (
    private readonly app: URL,
    private readonly state: State
  ) { }

  public async connect (): Promise<AppState> {
    await this.state.ready()
    return this.state.appState()
  }
  public async validateTransaction (coreTx: CoreTransaction): Promise<boolean> {
    try {
      const tx = deserialize(coreTx.data, SignedTransaction.deserialize)
      const account = await this.state.getAccount(tx.signer)
      if (tx.nonce <= account.nonce) throw new Error(`transaction nonce is too low: current ${account.nonce}, got ${tx.nonce}`)
      return true
    } catch (err) {
      logger('validate transaction failed: %s', err.message)
      return false
    }
  }
  public async selectTransactions (coreTxs: CoreTransaction[]): Promise<CoreTransaction[]> {
    const selected: CoreTransaction[] = []
    for (const coreTx of coreTxs) {
      const tx = deserialize(coreTx.data, SignedTransaction.deserialize)
      const account = await this.state.getAccount(tx.signer)
      if (tx.nonce === account.nonce + 1) {
        selected.push(coreTx)
      }
    }
    return selected
  }
  public async executeTransactions (coreTxs: CoreTransaction[]): Promise<AppState> {
    for (const coreTx of coreTxs) {
      const tx = deserialize(coreTx.data, SignedTransaction.deserialize)
      const sender = tx.signer
      const account = await this.state.getAccount(sender)
      // skip non continuous nonce transaction
      if (tx.nonce !== account.nonce + 1) continue
      await this.state.setAccount(sender, account.incrementNonce())
      const root = this.state.top.root
      try {
        const res = await SignedRequest.unpack(tx, this.app)
        await this.state.result.set(coreTx.hash, await Response.pack(res))
        if (res.statusCode && 400 <= res.statusCode && res.statusCode < 600) {
          throw new Error(res.statusMessage)
        }
      } catch (err) {
        logger('error in action: %s', err.message)
        await this.state.top.rollback(root)
      }
    }
    await this.state.meta.incrementHeight()
    return this.state.appState()
  }
}
