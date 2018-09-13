export interface Lock {
  lock (task: (unlock: () => void) => void): void
  use<T> (task: () => Promise<T>): Promise<T>
  locked: boolean
}

// mutex
export class Mutex implements Lock {
  private _locked = false
  private _queue: (() => void)[] = []

  public lock (task: (unlock: () => void) => void): void {
    if (this._locked) {
      this._queue.push(() => this.lock(task))
    } else {
      this._locked = true
      process.nextTick(() => task(() => this._unlock()))
    }
  }

  private _unlock (): void {
    this._locked = false
    const queued = this._queue.shift()
    if (queued) { queued() }
  }

  public use<T> (task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => this.lock(unlock => task().finally(unlock).then(resolve, reject)))
  }

  public get locked () { return this._locked }
}

// read/write lock
interface LockState {
  readers: number
  locked: boolean
  writeQueue: (() => void)[]
  readQueue: (() => void)[]
}

class ReadLock implements Lock {
  public constructor (
    private readonly _state: LockState
  ) {}

  public lock (task: (unlock: () => void) => void): void {
    if (this._state.locked || this._state.writeQueue.length > 0) {
      this._state.readQueue.push(() => this.lock(task))
    } else {
      this._state.readers++
      process.nextTick(() => task(() => this._unlock()))
    }
  }

  private _unlock (): void {
    this._state.readers--
    if (this._state.readers > 0) { return }

    const writer = this._state.writeQueue.shift()
    if (writer) { writer() }
  }

  public use<T> (task: () => Promise<T>): Promise< T> {
    return new Promise<T>((resolve, reject) => this.lock(unlock => task().finally(unlock).then(resolve, reject)))
  }

  public get locked () { return this._state.readers > 0 }
}

class WriteLock implements Lock {
  public constructor (
    private readonly _state: LockState
  ) {}

  public lock (task: (unlock: () => void) => void): void {
    if (this._state.locked || this._state.readers > 0) {
      this._state.writeQueue.push(() => this.lock(task))
    } else {
      this._state.locked = true
      process.nextTick(() => task(() => this._unlock()))
    }
  }

  private _unlock (): void {
    this._state.locked = false

    const writer = this._state.writeQueue.shift()
    if (writer) {
      writer()
    } else {
      const readers = this._state.readQueue
      this._state.readQueue = []
      readers.forEach(reader => reader())
    }
  }

  public use<T> (task: () => Promise<T>): Promise< T> {
    return new Promise<T>((resolve, reject) => this.lock(unlock => task().finally(unlock).then(resolve, reject)))
  }

  public get locked () { return this._state.locked }
}

export class ReadWriteLock {
  public readonly readLock: Lock
  public readonly writeLock: Lock
  public constructor () {
    const state: LockState = { readers: 0, locked: false, readQueue: [], writeQueue: [] }
    this.readLock = new ReadLock(state)
    this.writeLock = new WriteLock(state)
  }
}
