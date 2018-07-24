// @types/levelup is no longer correct.
// NOTE: Maybe soon, levelup will include type definition officially.
declare module 'levelup' {
  import { AbstractLevelDOWN, AbstractIteratorOptions, Batch } from 'abstract-leveldown'
  import levelErrors from 'level-errors'
  import { EventEmitter } from 'events'

  export namespace levelup {
    export interface LevelUp<K=any, V=any, O=any, PO=any, GO=any, DO=any, IO=any, BO=any> extends EventEmitter {
      open(callback: (err: any) => void): void
      open(): Promise<void>

      close(callback: (err: any) => void): void
      close(): Promise<void>

      put(key: K, value: V, options: PO, callback: (err: any) => void): void
      put(key: K, value: V, callback: (err: any) => void): void
      put(key: K, value: V, options?: PO): Promise<void>

      get(key: K, options: GO, callback: (err: any, value: V) => void): void
      get(key: K, callback: (err: any, value: V) => void): void
      get(key: K, options?: GO): Promise<V>

      del(key: K, options: DO, callback: (err: any) => void): void
      del(key: K, callback: (err: any) => void): void
      del(key: K, options?: DO): Promise<void>

      batch(array: Batch<K, V>[], options: BO, callback: (err: any) => void): void
      batch(array: Batch<K, V>[], callback: (err: any) => void): void
      batch(array: Batch<K, V>[], options?: BO): Promise<void>
      batch(): ChainedBatch<K, V>

      isOpen(): boolean
      isClosed(): boolean

      createReadStream(options?: IO & AbstractIteratorOptions<K>): NodeJS.ReadableStream
      createKeyStream(options?: IO & AbstractIteratorOptions<K>): NodeJS.ReadableStream
      createValueStream(options?: IO & AbstractIteratorOptions<K>): NodeJS.ReadableStream
    }

    export interface ChainedBatch<K, V> {
      put(key: K, value: V): this
      del(key: K): this
      clear(): this
      write(callback: (err: any) => any): void
      write(): Promise<void>
      length: number
    }

    export const errors: typeof levelErrors
  }
  export function levelup<K=any, V=any, O=any, PO=any, GO=any, DO=any, IO=any, BO=any>(
    db: AbstractLevelDOWN<K, V, O, PO, GO, DO, IO, BO>,
    options: O,
    callback?: (err: any) => void
  ): levelup.LevelUp<K, V, O, PO, GO, DO, IO, BO>

  export function levelup<K=any, V=any, O=any, PO=any, GO=any, DO=any, IO=any, BO=any>(
    db: AbstractLevelDOWN<K, V, O, PO, GO, DO, IO, BO>,
    callback?: (err: any) => void
  ): levelup.LevelUp<K, V, O, PO, GO, DO, IO, BO>

  export default levelup
}
