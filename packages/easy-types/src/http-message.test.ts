import { HttpRequest, HttpHeaders, HttpResponse } from './http-message'
import { serialize, deserialize } from '@uniqys/serialize'

describe('http headers', () => {
  it('can be construct from object', () => {
    const headers = HttpHeaders.fromObject({ foo: 'bar', fizz: ['buzz', 'biz'], ignore: 'something', undef: undefined }, key => key !== 'ignore')
    expect(headers.list).toEqual([['fizz', 'buzz'], ['fizz', 'biz'], ['foo', 'bar']])
  })
  it('convert to object', () => {
    const headers = new HttpHeaders([['fizz', 'buzz'], ['fizz', 'bee'], ['fizz', 'biz'], ['foo', 'bar']])
    expect(headers.toObject()).toEqual({ fizz: ['buzz', 'bee', 'biz'], foo: 'bar' })
  })
  it('is serializable', () => {
    const headers = new HttpHeaders([['foo', 'bar'], ['fizz', 'buzz']])
    expect(deserialize(serialize(headers), HttpHeaders.deserialize)).toEqual(headers)
  })
})

describe('http request', () => {
  it('construct with optional parameter', () => {
    const request = new HttpRequest('GET', '/foo')
    expect(request.method).toEqual('GET')
    expect(request.path).toEqual('/foo')
    expect(request.headers).toEqual(new HttpHeaders([]))
    expect(request.body).toEqual(Buffer.alloc(0))
  })
  it('is serializable', () => {
    const request = new HttpRequest('GET', '/foo', new HttpHeaders([]), Buffer.from('bar'))
    expect(deserialize(serialize(request), HttpRequest.deserialize)).toEqual(request)
  })
})

describe('http response', () => {
  it('construct with optional parameter', () => {
    const response = new HttpResponse(200, 'OK')
    expect(response.status).toEqual(200)
    expect(response.message).toEqual('OK')
    expect(response.headers).toEqual(new HttpHeaders([]))
    expect(response.body).toEqual(Buffer.alloc(0))
  })
  it('is serializable', () => {
    const response = new HttpResponse(200, 'OK', new HttpHeaders([]), Buffer.from('bar'))
    expect(deserialize(serialize(response), HttpResponse.deserialize)).toEqual(response)
  })
})
