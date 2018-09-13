
declare module 'memdown' {
  import { AbstractLevelDOWN } from 'abstract-leveldown'
  export interface MemDown<K=any, V=any>
    extends AbstractLevelDOWN<K, V> {
  }

  interface MemDownConstructor {
    new <K=any, V=any>(): MemDown<K, V>
    <K=any, V=any>(): MemDown<K, V>
  }
  export interface MemDownGetOptions {
    asBuffer?: boolean
  }
  export interface MemDownIteratorOptions {
    keyAsBuffer?: boolean
    valueAsBuffer?: boolean
  }
  export const MemDown: MemDownConstructor
  export default MemDown
}
