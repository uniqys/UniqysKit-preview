import { Byte, Bytes4, Bytes8, Bytes20, Bytes32, Bytes64 } from './bytes'
import { serialize, deserialize } from '@uniqys/serialize'

/* tslint:disable:no-unused-expression */
describe('Byte', () => {
  it('can create from 1 byte buffer', () => {
    expect(() => { new Byte(Buffer.alloc(1)) }).not.toThrow()
  })
  it('throw error when wrong size', () => {
    expect(() => { new Byte(Buffer.alloc(2)) }).toThrow()
  })
  it('is equatable', () => {
    expect(new Byte(Buffer.from('a')).equals(new Byte(Buffer.from('a')))).toBeTruthy()
  })
  it('is serializable', () => {
    const object = new Byte(Buffer.from('a'))
    expect(deserialize(serialize(object), Byte.deserialize).equals(object)).toBeTruthy()
  })
})

describe('Bytes4', () => {
  it('can create from 4 byte buffer', () => {
    expect(() => { new Bytes4(Buffer.alloc(4)) }).not.toThrow()
  })
  it('throw error when wrong size', () => {
    expect(() => { new Bytes4(Buffer.alloc(1)) }).toThrow()
  })
  it('is equatable', () => {
    expect(new Bytes4(Buffer.from('buzz')).equals(new Bytes4(Buffer.from('buzz')))).toBeTruthy()
  })
  it('is serializable', () => {
    const object = new Bytes4(Buffer.from('buzz'))
    expect(deserialize(serialize(object), Bytes4.deserialize).equals(object)).toBeTruthy()
  })
})

describe('Bytes8', () => {
  it('can create from 8 byte buffer', () => {
    expect(() => { new Bytes8(Buffer.alloc(8)) }).not.toThrow()
  })
  it('throw error when wrong size', () => {
    expect(() => { new Bytes8(Buffer.alloc(1)) }).toThrow()
  })
  it('is equatable', () => {
    expect(new Bytes8(Buffer.from('fizzBuzz')).equals(new Bytes8(Buffer.from('fizzBuzz')))).toBeTruthy()
  })
  it('is serializable', () => {
    const object = new Bytes8(Buffer.from('fizzBuzz'))
    expect(deserialize(serialize(object), Bytes8.deserialize).equals(object)).toBeTruthy()
  })
})

describe('Bytes20', () => {
  it('can create from 20 byte buffer', () => {
    expect(() => { new Bytes20(Buffer.alloc(20)) }).not.toThrow()
  })
  it('throw error when wrong size', () => {
    expect(() => { new Bytes20(Buffer.alloc(1)) }).toThrow()
  })
  it('is equatable', () => {
    expect(new Bytes20(Buffer.from('This has no meaning.'))
      .equals(new Bytes20(Buffer.from('This has no meaning.')))).toBeTruthy()
  })
  it('is serializable', () => {
    const object = new Bytes20(Buffer.from('This has no meaning.'))
    expect(deserialize(serialize(object), Bytes20.deserialize).equals(object)).toBeTruthy()
  })
})

describe('Bytes32', () => {
  it('can create from 32 byte buffer', () => {
    expect(() => { new Bytes32(Buffer.alloc(32)) }).not.toThrow()
  })
  it('throw error when wrong size', () => {
    expect(() => { new Bytes32(Buffer.alloc(1)) }).toThrow()
  })
  it('is equatable', () => {
    expect(new Bytes32(Buffer.from('This sentence has no meaning yet'))
      .equals(new Bytes32(Buffer.from('This sentence has no meaning yet')))).toBeTruthy()
  })
  it('is serializable', () => {
    const object = new Bytes32(Buffer.from('This sentence has no meaning yet'))
    expect(deserialize(serialize(object), Bytes32.deserialize).equals(object)).toBeTruthy()
  })
})

describe('Bytes64', () => {
  it('can create from 32 byte buffer', () => {
    expect(() => { new Bytes64(Buffer.alloc(64)) }).not.toThrow()
  })
  it('throw error when wrong size', () => {
    expect(() => { new Bytes64(Buffer.alloc(1)) }).toThrow()
  })
  it('is equatable', () => {
    expect(new Bytes64(Buffer.from('This sentence had no meaning, this sentence still has no meaning'))
      .equals(new Bytes64(Buffer.from('This sentence had no meaning, this sentence still has no meaning')))).toBeTruthy()
  })
  it('is serializable', () => {
    const object = new Bytes64(Buffer.from('This sentence had no meaning, this sentence still has no meaning'))
    expect(deserialize(serialize(object), Bytes64.deserialize).equals(object)).toBeTruthy()
  })
})
