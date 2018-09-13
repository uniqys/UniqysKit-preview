import net from 'net'
import { MemcachedTextProtocol, MemcachedSubset, Response } from './protocol'

export { MemcachedSubset, Response }

export class MemcachedCompatibleServer extends net.Server {
  constructor (
    impl: MemcachedSubset
  ) {
    super(socket => new MemcachedTextProtocol(socket, impl).handle())
  }
}
