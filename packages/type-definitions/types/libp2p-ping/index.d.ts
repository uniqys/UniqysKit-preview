declare module 'libp2p-ping' {
  import { EventEmitter } from 'events'
  import Node from 'libp2p'

  export default class Ping extends EventEmitter {
    start(): void;
    stop(): void;
    static mount(swarm: Node): void;
    static unmount(swarm: Node): void;
  }
}
