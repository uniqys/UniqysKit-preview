import { serialize, deserialize, UInt8, UInt32, UInt64, Int64, List, SizedBuffer, String } from '.'

describe('UInt8', () => {
  it('serialize and deserialize from number of 8bit unsigned integer', () => {
    expect(deserialize(serialize(255, UInt8.serialize), UInt8.deserialize)).toBe(255)
  })
  it('throw error when over 8bit unsigned integer', () => {
    expect(() => { serialize(256, UInt8.serialize) }).toThrow()
  })
})

describe('UInt32', () => {
  it('serialize and deserialize from number of 32bit unsigned integer', () => {
    expect(deserialize(serialize(4294967295, UInt32.serialize), UInt32.deserialize)).toBe(4294967295)
  })
  it('throw error when over 32bit unsigned integer', () => {
    expect(() => { serialize(4294967296, UInt32.serialize) }).toThrow()
  })
})

describe('UInt64', () => {
  it('serialize and deserialize from number of 48bit unsigned integer for safe', () => {
    expect(deserialize(serialize(281474976710655, UInt64.serialize), UInt64.deserialize)).toBe(281474976710655)
  })
  it('throw error when over 48bit unsigned integer', () => {
    expect(() => { serialize(281474976710656, UInt64.serialize) }).toThrow()
  })
})

describe('Int64', () => {
  it('serialize and deserialize from number of 48bit signed integer for safe', () => {
    expect(deserialize(serialize(140737488355327, Int64.serialize), Int64.deserialize)).toBe(140737488355327)
    expect(deserialize(serialize(-140737488355328, Int64.serialize), Int64.deserialize)).toBe(-140737488355328)
  })
  it('throw error when over 48bit signed integer', () => {
    expect(() => { serialize(140737488355328, Int64.serialize) }).toThrow()
    expect(() => { serialize(-140737488355329, Int64.serialize) }).toThrow()
  })
})

describe('List', () => {
  it('serialize and deserialize list', () => {
    expect(deserialize(serialize([23, 45], List.serialize(UInt32.serialize)), List.deserialize(UInt32.deserialize))).toEqual([23, 45])
  })
})

describe('SizedBuffer', () => {
  it('serialize and deserialize sized buffer', () => {
    expect(deserialize(serialize(Buffer.from('foo bar'), SizedBuffer.serialize), SizedBuffer.deserialize)).toEqual(Buffer.from('foo bar'))
  })
})

describe('String', () => {
  it('serialize and deserialize string', () => {
    expect(deserialize(serialize('foo bar', String.serialize), String.deserialize)).toEqual('foo bar')
  })
})
