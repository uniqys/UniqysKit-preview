
type Item<T> = {priority: number, value: T}
export class PriorityQueue<T> {
  private _memory: (Item<T> | undefined)[] = []
  private _size = 0

  public enqueue (priority: number, value: T) {
    this._memory[this._size] = { priority, value }
    this._size++
    for (let i = this._size - 1; i > 0;) {
      const parent = (i - 1) >> 1
      if (this._memory[i]!.priority > this._memory[parent]!.priority) { break }
      const tmp = this._memory[i]
      this._memory[i] = this._memory[parent]
      this._memory[parent] = tmp
      i = parent
    }
  }

  public peek (): Item<T> | undefined {
    if (this._size === 0) { return undefined }
    return this._memory[0]
  }

  public peekValue (): T | undefined {
    if (this._size === 0) { return undefined }
    return this._memory[0]!.value
  }

  public dequeue (): Item<T> | undefined {
    if (this._size === 0) { return undefined }
    const ret = this._memory[0]
    this._size--
    this._memory[0] = this._memory[this._size]
    this._memory[this._size] = undefined
    if (this._size === 0) { return ret }
    const stop = this._size >> 1
    for (let i = 0; i < stop;) {
      const left = (i << 1) + 1
      const right = left + 1
      const child = (right >= this._size || this._memory[left]!.priority < this._memory[right]!.priority) ? left : right
      if (this._memory[i]!.priority < this._memory[child]!.priority) { break }
      const tmp = this._memory[i]
      this._memory[i] = this._memory[child]
      this._memory[child] = tmp
      i = child
    }
    return ret
  }

  public dequeueValue (): T | undefined {
    const item = this.dequeue()
    return item && item.value
  }
}
