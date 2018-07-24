import { Hash } from '@uniqys/signature'
import { Bytes32 } from '@uniqys/types'
import { Int64, serialize } from '@uniqys/serialize'

export namespace Operation {
  class Data {
    constructor (
      public readonly data: Buffer
    ) {}
    public toBinary (): Buffer {
      return Buffer.concat([ serialize(this.data.byteLength, Int64.serialize), this.data ])
    }
  }
  export class Load extends Data { }
  export class Value extends Data { }
  export class Hash {
    constructor (
      public readonly consume: number
    ) {}
    public toBinary (): Buffer { return serialize(-this.consume, Int64.serialize) }
  }
}
export type Operation = Operation.Load | Operation.Value | Operation.Hash

export interface ProofBinary {
  raw: Buffer
  valueOffsets: number[]
}

export class MerkleProof {
  public get operations (): Operation[] { return this._operations }
  private _operations: Operation[]
  constructor (
    operations: Operation[] = []
  ) {
    this._operations = operations
  }

  public load (data: Buffer): void { this._operations.push(new Operation.Load(data)) }
  public value (data: Buffer): void { this._operations.push(new Operation.Value(data)) }
  public hash (): void { this._operations.push(new Operation.Hash(this.resultSize())) }
  public append (tail: MerkleProof): void { this._operations = this.operations.concat(tail.operations) }

  public values (): Buffer[] {
    const values: Buffer[] = []
    for (const op of this.operations) {
      if (op instanceof Operation.Value) { values.push(op.data) }
    }
    return values
  }

  public optimize (): void {
    let top: Operation | undefined = undefined
    let ops: Operation[] = []
    // squash load bytes
    for (const op of this.operations) {
      if (top === undefined) {
        top = op
      } else if (top instanceof Operation.Load && op instanceof Operation.Load) {
        top = new Operation.Load(Buffer.concat([top.data, op.data]))
      } else {
        ops.push(top)
        top = op
      }
    }
    if (top) { ops.push(top) }
    this._operations = ops
  }

  public toBinary (): ProofBinary {
    const valueOffsets: number[] = []
    const buffers: Buffer[] = []
    let length = 0
    for (const op of this.operations) {
      if (op instanceof Operation.Value) {
        valueOffsets.push(length)
      }
      const bin = op.toBinary()
      buffers.push(bin)
      length += bin.byteLength
    }

    return {
      raw: Buffer.concat(buffers),
      valueOffsets: valueOffsets
    }
  }

  public verify (expect: Bytes32): boolean {
    return this.calculate().equals(expect.buffer)
  }

  private resultSize (): number {
    let size = 0
    for (const op of this.operations) {
      if (op instanceof Operation.Load) { size += op.data.byteLength }
      if (op instanceof Operation.Value) { size += op.data.byteLength }
      if (op instanceof Operation.Hash) { size += (- op.consume + Hash.serializedLength) }
    }
    return size
  }

  private calculate (): Buffer {
    let stack = Buffer.alloc(0)
    for (const op of this.operations) {
      if (op instanceof Operation.Load || op instanceof Operation.Value) {
        stack = Buffer.concat([stack, op.data])
      }
      if (op instanceof Operation.Hash) {
        const start = stack.byteLength - op.consume
        const hash = Hash.fromData(stack.slice(start, stack.byteLength))
        stack = Buffer.concat([stack.slice(0, start), hash.buffer])
      }
    }
    return stack
  }
}
