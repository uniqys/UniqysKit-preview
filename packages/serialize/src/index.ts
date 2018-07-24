export class BufferWriter {
  private _buffer: Buffer
  private _length: number
  public get buffer (): Buffer { return this._buffer.slice(0, this._length) }
  constructor (
    size?: number
  ) {
    this._buffer = Buffer.alloc(size || 64)
    this._length = 0
  }

  public append (buffer: Buffer) {
    this._resize(this._length + buffer.byteLength)
    buffer.copy(this._buffer, this._length)
    this._length += buffer.byteLength
  }

  public ensure (length: number): Buffer {
    this._resize(this._length + length)
    const buf = this._buffer.slice(this._length, this._length + length)
    this._length += length
    return buf
  }

  private _resize (need: number) {
    const current = this._buffer.byteLength
    if (need > current) {
      let next = current
      while (need > next) { next = next * 2 }
      const tmp = this._buffer
      this._buffer = Buffer.alloc(next)
      tmp.copy(this._buffer)
    }
  }
}
export class BufferReader {
  private _buffer: Buffer
  private _start: number
  public get buffer (): Buffer { return this._buffer.slice(this._start) }
  constructor (
    _buffer: Buffer
  ) {
    this._buffer = _buffer
    this._start = 0
  }

  public consume (length: number): Buffer {
    const slice = this._buffer.slice(this._start, this._start + length)
    this._start += length
    return slice
  }
}

export type Serializer<T> = (v: T, writer: BufferWriter) => void
export type Deserializer<T> = (reader: BufferReader) => T
export interface Serializable {
  serialize (writer: BufferWriter): void
}

export function serialize<T> (value: T, serializer: Serializer<T>): Buffer
export function serialize (serializable: Serializable): Buffer
export function serialize (value: any, serializer?: Serializer<any>) {
  const writer = new BufferWriter()
  if (serializer) { serializer(value, writer) } else { value.serialize(writer) }
  return writer.buffer
}
export function deserialize<T> (buffer: Buffer, deserializer: Deserializer<T>): T {
  const reader = new BufferReader(buffer)
  return deserializer(reader)
}

export namespace UInt8 {
  export const deserialize: Deserializer<number> = reader => reader.consume(1).readUInt8(0)
  export const serialize: Serializer<number> = (n, writer) => writer.ensure(1).writeUInt8(n, 0)
}

export namespace UInt32 {
  export const deserialize: Deserializer<number> = reader => reader.consume(4).readUInt32BE(0)
  export const serialize: Serializer<number> = (n, writer) => writer.ensure(4).writeUInt32BE(n, 0)
}

export namespace UInt64 {
  export const deserialize: Deserializer<number> = reader => reader.consume(8).readUIntBE(2, 6)
  export const serialize: Serializer<number> = (n, writer) => {
    if (n > 2 ** 48 - 1) { throw new RangeError('The number is out of 48bit range') }
    writer.ensure(8).writeUIntBE(n, 2, 6)
  }
}

export namespace Int64 {
  export const deserialize: Deserializer<number> = reader => reader.consume(8).readIntBE(2, 6)
  export const serialize: Serializer<number> = (n, writer) => {
    if (n > 2 ** 47 - 1 || n < - (2 ** 47)) { throw new RangeError('The number is out of 48bit range') }
    writer.ensure(8).fill(n < 0 ? 0xff : 0x00).writeIntBE(n, 2, 6)
  }
}

export namespace List {
  export function deserialize<T> (deserializer: Deserializer<T>): Deserializer<T[]> {
    return (reader) => {
      const length = UInt32.deserialize(reader)
      const list: T[] = []
      for (let i = 0; i < length; i++) {
        list.push(deserializer(reader))
      }
      return list
    }
  }
  export function serialize<T> (serializer: Serializer<T>): Serializer<T[]> {
    return (list, writer) => {
      UInt32.serialize(list.length, writer)
      for (const item of list) {
        serializer(item, writer)
      }
    }
  }
}

export namespace SizedBuffer {
  export const deserialize: Deserializer<Buffer> = reader => {
    const byteLength = UInt32.deserialize(reader)
    return reader.consume(byteLength)
  }
  export const serialize: Serializer<Buffer> = (buffer, writer) => {
    UInt32.serialize(buffer.byteLength, writer)
    writer.append(buffer)
  }
}

export namespace String {
  export const deserialize: Deserializer<string> = reader => SizedBuffer.deserialize(reader).toString('utf8')
  export const serialize: Serializer<string> = (s, writer) => SizedBuffer.serialize(Buffer.from(s, 'utf8'), writer)
}
