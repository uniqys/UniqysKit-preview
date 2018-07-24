import { Either } from './either'
import { deserialize, serialize, Serializer, Deserializer, UInt8 } from '@uniqys/serialize'

describe('Either', () => {
  it('can be either value', () => {
    expect(Either.left<number, string>(42)).toBeInstanceOf(Either)
    expect(Either.right<number, string>('foo')).toBeInstanceOf(Either)
  })
  it('can be destructed by match method', () => {
    expect(Either.left(42).match(n => n, _ => 0)).toBe(42)
    expect(Either.right('foo').match(_ => '', s => s)).toBe('foo')
  })
  it('can check that it is', () => {
    expect(Either.left(42).isLeft()).toBeTruthy()
    expect(Either.right('foo').isLeft()).not.toBeTruthy()
    expect(Either.left(42).isRight()).not.toBeTruthy()
    expect(Either.right('foo').isRight()).toBeTruthy()
  })
  describe('serialize', () => {
    const serializer: Serializer<Either<number, string>> = (e, w) => e.serialize(UInt8.serialize, (s, w) => w.append(Buffer.from(s)))(w)
    const deserializer: Deserializer<Either<number, string>> = Either.deserialize(UInt8.deserialize, r => r.buffer.toString())
    it('is serializable', () => {
      const left = Either.left<number, string>(42)
      const right = Either.right<number, string>('foo')
      expect(deserialize(serialize(left, serializer), deserializer).match(v => v, _ => 0)).toBe(42)
      expect(deserialize(serialize(right, serializer), deserializer).match(_ => '', s => s)).toBe('foo')
    })
    it('throw error when deserialize invalid buffer', () => {
      const left = Either.left<number, string>(42)
      const buf = serialize(left, serializer)
      buf.writeUInt8(2, 0) // overwrite label byte
      expect(() => { deserialize(buf, deserializer) }).toThrow()
    })
  })
})
