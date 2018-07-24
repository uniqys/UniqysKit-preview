import Router from 'koa-router'
import BodyParser from 'koa-bodyparser'
import { State } from './state'
import { Address, Hash } from '@uniqys/signature'

function maybeHash (str: string): Hash | undefined {
  try { return Hash.fromHexString(str) } catch { return undefined }
}
function maybeAddress (str: string): Address | undefined {
  try { return Address.fromString(str) } catch { return undefined }
}

export class OuterApi extends Router {
  constructor (
    protected readonly state: State
  ) {
    super()
    this
      // async result
      .get('/awaiting/:id/', async (ctx, _next) => {
        const hash = maybeHash(ctx.params.id)
        ctx.assert(hash, 400)
        const opt = await this.state.result.get(hash!)
        if (opt.isSome()) {
          const res = opt.value
          ctx.response.status = res.status
          ctx.response.message = res.message
          for (const [key, value] of res.headers.list) {
            ctx.response.append(key, value)
          }
          ctx.response.body = res.body
        } else {
          ctx.status = 202
          ctx.body = {
            id: hash!.toHexString()
          }
        }
      })
      // accounts
      .get('/accounts/:address', async (ctx, _next) => {
        const address = maybeAddress(ctx.params.address)
        ctx.assert(address, 400)
        const account = await this.state.getAccount(address!)
        ctx.body = {
          nonce: account.nonce,
          balance: account.balance
        }
      })
      .get('/accounts/:address/nonce', async (ctx, _next) => {
        const address = maybeAddress(ctx.params.address)
        ctx.assert(address, 400)
        const account = await this.state.getAccount(address!)
        ctx.body = [ account.nonce ]
      })
      .get('/accounts/:address/balance', async (ctx, _next) => {
        const address = maybeAddress(ctx.params.address)
        ctx.assert(address, 400)
        const account = await this.state.getAccount(address!)
        ctx.body = [ account.balance ]
      })
    this.use()
  }
}

export class InnerApi extends OuterApi {
  constructor (
    state: State
  ) {
    super(state)
    this
      .put('/accounts/:address/balance', BodyParser(), async (ctx, _next) => {
        const address = maybeAddress(ctx.params.address)
        ctx.assert(address, 400)
        const [balance] = ctx.request.body as [number]
        ctx.assert(balance && typeof (balance as any) === 'number', 400)
        await this.state.lock(async () => {
          const account = await this.state.getAccount(address!)
          await this.state.setAccount(address!, account.setBalance(balance))
        })
        ctx.body = [ balance ]
      })
      .post('/accounts/:address/transfer', BodyParser(), async (ctx, _next) => {
        const { to, value } = ctx.request.body as { to: string, value: number }
        const fromAddr = maybeAddress(ctx.params.address)
        const toAddr = maybeAddress(to)
        ctx.assert(fromAddr, 400)
        ctx.assert(toAddr, 400)
        ctx.assert(value && typeof (value as any) === 'number', 400)
        await this.state.lock(async () => {
          const fromAccount = await this.state.getAccount(fromAddr!)
          const toAccount = await this.state.getAccount(toAddr!)
          await this.state.setAccount(fromAddr!, fromAccount.decreaseBalance(value))
          await this.state.setAccount(toAddr!, toAccount.increaseBalance(value))
        })
        ctx.status = 200
      })
    this.use()
  }
}
