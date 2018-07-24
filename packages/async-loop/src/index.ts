import { EventEmitter } from 'events'

export class AsyncLoop extends EventEmitter {
  private immediateId: any = undefined
  constructor (
    private readonly loop: () => Promise<void>
  ) {
    super()
  }

  public start () {
    const loop = () => {
      this.loop()
        .then(() => { if (this.immediateId) this.immediateId = setImmediate(loop) })
        .catch((e) => { this.emit('error', e); this.stop() })
    }
    this.immediateId = setImmediate(loop)
  }

  public stop () {
    if (this.immediateId) {
      clearImmediate(this.immediateId)
      this.immediateId = undefined
      this.emit('end')
    }
  }
}
