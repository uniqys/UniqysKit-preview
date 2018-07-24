import { Optional } from './optional'
import { Serializer, Deserializer, serialize, deserialize, UInt8 } from '@uniqys/serialize'

describe('Optional', () => {
  it('can be some value', () => {
    expect(Optional.some(42)).toBeInstanceOf(Optional)
  })
  it('can be none', () => {
    expect(Optional.none()).toBeInstanceOf(Optional)
  })
  it('can be destructed by match method', () => {
    expect(Optional.some(42).match(v => v, () => 0)).toBe(42)
    expect(Optional.none().match(v => v, () => 0)).toBe(0)
  })
  it('can check that it is', () => {
    expect(Optional.some(42).isSome()).toBeTruthy()
    expect(Optional.none().isSome()).not.toBeTruthy()
    expect(Optional.some(42).isNone()).not.toBeTruthy()
    expect(Optional.none().isNone()).toBeTruthy()
  })
  describe('serialize', () => {
    const serializer: Serializer<Optional<number>> = (o, w) => o.serialize(UInt8.serialize)(w)
    const deserializer: Deserializer<Optional<number>> = Optional.deserialize(UInt8.deserialize)
    it('is serializable', () => {
      const some = Optional.some(42)
      const none = Optional.none<number>()
      expect(deserialize(serialize(some, serializer), deserializer).match(v => v, () => 0)).toBe(42)
      expect(deserialize(serialize(none, serializer), deserializer).match(v => v, () => 0)).toBe(0)
    })
    it('throw error when deserialize invalid buffer', () => {
      const some = Optional.some(42)
      const buf = serialize(some, serializer)
      buf.writeUInt8(2, 0) // overwrite label byte
      expect(() => { deserialize(buf, deserializer) }).toThrow()
    })
  })
})
