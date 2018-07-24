declare module 'pull-stream' {

  type End = null | true | Error
  export type Source<T> = (end: End, cb: (end: End, data?: T) => void) => void
  export type Sink<T, U = void> = (read: Source<T>) => U
  export type Through<T, U> = Sink<T, Source<U>>
  export type Duplex<T> = { source: Source<T>, sink: Sink<T> }

  export default function pull(...args: any[]): any

  // source
  export function keys(...args: any[]): Source<any>
  export function once(...args: any[]): Source<any>
  export function values(...args: any[]): Source<any>
  export function count(...args: any[]): Source<any>
  export function infinite(...args: any[]): Source<any>
  export function empty(...args: any[]): Source<any>
  export function error(...args: any[]): Source<any>

  // through
  export function through<T>(...args: any[]): Through<T, T>
  export function map(...args: any[]): Through<any, any>
  export function asyncMap(...args: any[]): Through<any, any>
  export function filter(...args: any[]): Through<any, any>
  export function filterNot(...args: any[]): Through<any, any>
  export function take(...args: any[]): Through<any, any>
  export function unique(...args: any[]): Through<any, any>
  export function nonUnique(...args: any[]): Through<any, any>
  export function flatten(...args: any[]): Through<any, any>

  // sink
  export function drain(...args: any[]): Sink<any>
  export function onEnd(...args: any[]): Sink<any>
  export function log(...args: any[]): Sink<any>
  export function find(...args: any[]): Sink<any>
  export function reduce(...args: any[]): Sink<any>
  export function collect(...args: any[]): Sink<any>
  export function concat(...args: any[]): Sink<any>
}
