import { SyncProtocol } from '@uniqys/p2p-network'
import { Mutex } from '@uniqys/lock'

export class RemoteNode {
  private readonly mutex = new Mutex()
  constructor (
    public readonly peerId: string,
    public readonly syncProtocol: SyncProtocol,
    public height: number
  ) { }

  public get isIdle () {
    return !this.mutex.locked
  }

  public use<T> (task: () => Promise<T>): Promise<T> {
    return this.mutex.use(task)
  }
}

export class RemoteNodeSet {
  private readonly dict = new Map<string, RemoteNode>()

  public get size (): number {
    return this.dict.size
  }

  public nodes () {
    return this.dict.values()
  }

  public add (node: RemoteNode) {
    this.dict.set(node.peerId, node)
  }

  public get (peerId: string) {
    return this.dict.get(peerId)
  }

  public delete (node: RemoteNode) {
    this.dict.delete(node.peerId)
  }

  public bestNode () {
    let best: RemoteNode | undefined
    for (const node of this.dict.values()) {
      if (!best || best.height < node.height) {
        best = node
      }
    }
    return best
  }

  public pickTransactionReceivers (rate?: number): RemoteNode[] {
    return this._pickRandomly(all => (rate ? Math.floor(Math.pow(all, rate)) : all), _ => true)
  }

  public pickBlockReceivers (height: number, rate?: number): RemoteNode[] {
    return this._pickRandomly(all => (rate ? Math.floor(Math.pow(all, rate)) : all), node => node.height < height)
  }

  public pickProvider (height: number): RemoteNode | undefined {
    return this._pickRandomly(_ => 1, node => node.height >= height)[0]
  }

  public pickIdleProvider (height: number): RemoteNode | undefined {
    return this._pickRandomly(_ => 1, node => node.height >= height && node.isIdle)[0]
  }

  private _pickRandomly (rate: (all: number) => number, condition: (node: RemoteNode) => boolean): RemoteNode[] {
    const candidates = Array.from(this.dict.values()).filter(condition)
    if (candidates.length === 0) { return [] }
    const all = candidates.length
    const count = rate(all)
    if (count === all) { return candidates }
    // Randomize the first n nodes (Fisher–Yates shuffle)
    for (let i = 0; i < count; i++) {
      const r = Math.floor(Math.random() * (all - i) + i)
      const temp = candidates[i]
      candidates[i] = candidates[r]
      candidates[r] = temp
    }
    return candidates.slice(0, count)
  }
}
