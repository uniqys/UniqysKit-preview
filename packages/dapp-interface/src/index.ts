import { Transaction } from '@uniqys/blockchain'
import { Hash } from '@uniqys/signature'

export class AppState {
  constructor (
    public readonly height: number,
    public readonly hash: Hash
  ) {}
}

export interface Core {
  sendTransaction (transaction: Transaction): Promise<void>
}

export interface Dapp {
  connect (): Promise<AppState>
  validateTransaction (transaction: Transaction): Promise<boolean>
  selectTransactions (transactions: Transaction[]): Promise<Transaction[]>
  executeTransactions (transactions: Transaction[]): Promise<AppState>
}
