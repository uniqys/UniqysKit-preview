import { ClientError } from './protocol'

// cSpell:words noreply
namespace Checker {
  type C<T> = (raw?: string) => T
  export function get (): (params: string[]) => void
  export function get<T1> (c1: C<T1>): (params: string[]) => [T1]
  export function get<T1, T2> (c1: C<T1>, c2: C<T2>): (params: string[]) => [T1, T2]
  export function get<T1, T2, T3> (c1: C<T1>, c2: C<T2>, c3: C<T3>): (params: string[]) => [T1, T2, T3]
  export function get<T1, T2, T3, T4> (c1: C<T1>, c2: C<T2>, c3: C<T3>, c4: C<T4>): (params: string[]) => [T1, T2, T3, T4]
  export function get<T1, T2, T3, T4, T5> (c1: C<T1>, c2: C<T2>, c3: C<T3>, c4: C<T4>, c5: C<T5>): (params: string[]) => [T1, T2, T3, T4, T5]
  export function get<T1, T2, T3, T4, T5, T6> (c1: C<T1>, c2: C<T2>, c3: C<T3>, c4: C<T4>, c5: C<T5>, c6: C<T6>): (params: string[]) => [T1, T2, T3, T4, T5, T6]
  export function get (...cs: C<any>[]): (params: string[]) => any[] {
    return (params) => {
      if (params.length > cs.length) { throw new ClientError('too many parameters') }
      return cs.map((c, i) => c(params[i]))
    }
  }
  export function def (raw?: string): string {
    if (raw === undefined) { throw new ClientError('missing parameter') }
    return raw
  }
  export function number (raw?: string): number {
    const str = def(raw)
    const num = parseInt(str, 10)
    if (isNaN(num)) { throw new ClientError('bad number format: ' + str) }
    return num
  }
  export function key (raw?: string): string {
    const key = def(raw)
    if (key.length > 250) { throw new ClientError('bad key format: ' + key) }
    return key
  }
  export function flags (raw?: string): number {
    const flags = number(raw)
    if (flags < 0 || flags > 0xffffffff) { throw new ClientError('bad flags format: ' + flags) }
    return flags
  }
  export function noReply (raw?: string): boolean {
    if (raw === undefined) { return false }
    if (raw === 'noreply') { return true }
    throw new ClientError('bad noreply format: ' + raw)
  }
}

export namespace ParameterFetcher {
  export const none = Checker.get()
  export const storage = Checker.get(Checker.key, Checker.flags, Checker.number, Checker.number, Checker.noReply)
  export const cas = Checker.get(Checker.key, Checker.flags, Checker.number, Checker.number, Checker.number, Checker.noReply)
  export const get = (params: string[]): [string[]] => {
    if (params.length === 0) { throw new ClientError('missing keys') }
    return [params.map(Checker.key)]
  }
  export const del = Checker.get(Checker.key, Checker.noReply)
  export const incrDecr = Checker.get(Checker.key, Checker.number, Checker.noReply)
  export const touch = Checker.get(Checker.key, Checker.number, Checker.noReply)
  export const flush = (params: string[]): [number, boolean] =>
    params.length === 0 ? [0, false] :
    params[0] === 'noreply' ? [0, true] :
    [Checker.number(params[0]), Checker.noReply(params[1])]
  export const verb = Checker.get(Checker.number, Checker.noReply)
}
