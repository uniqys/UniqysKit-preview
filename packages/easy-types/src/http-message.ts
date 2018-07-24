import { Serializable, BufferReader, BufferWriter, String, SizedBuffer, List, UInt32 } from '@uniqys/serialize'

export class HttpHeaders {
  constructor (
    public readonly list: [string, string][]
  ) { }
  public static fromObject (object: { [key: string]: string | string[] | undefined }, filter: (key: string) => boolean = () => true): HttpHeaders {
    const headers: [string, string][] = []
    for (const key of Object.keys(object).sort()) {
      const normalized = key.toLowerCase()
      if (filter(normalized)) {
        const val = object[key]
        if (val) {
          if (Array.isArray(val)) {
            headers.push(...val.map<[string, string]>(v => [normalized, v]))
          } else {
            headers.push([normalized, val])
          }
        }
      }
    }
    return new HttpHeaders(headers)
  }
  public static deserialize (reader: BufferReader): HttpHeaders {
    const headers = List.deserialize<[string, string]>(r => {
      const key = String.deserialize(r)
      const value = String.deserialize(r)
      return [key, value]
    })(reader)
    return new HttpHeaders(headers)
  }
  public toObject (): { [key: string]: string | string[] } {
    const object: { [key: string]: string | string[] } = {}
    for (const [field, value] of this.list) {
      let exists = object[field]
      if (exists) {
        if (!Array.isArray(exists)) {
          exists = [exists]
          object[field] = exists
        }
        exists.push(value)
      } else {
        object[field] = value
      }
    }
    return object
  }
  public serialize (writer: BufferWriter) {
    List.serialize<[string, string]>((kv, w) => {
      String.serialize(kv['0'], w)
      String.serialize(kv['1'], w)
    })(this.list, writer)
  }
}
export class HttpRequest implements Serializable {
  public readonly method: string
  public readonly path: string
  public readonly headers: HttpHeaders
  public readonly body: Buffer
  constructor (
    method: string,
    path: string,
    headers?: HttpHeaders,
    body?: Buffer
  ) {
    this.method = method
    this.path = path
    this.headers = headers ? headers : new HttpHeaders([])
    this.body = body ? body : Buffer.alloc(0)
  }
  public static deserialize (reader: BufferReader): HttpRequest {
    const method = String.deserialize(reader)
    const path = String.deserialize(reader)
    const headers = HttpHeaders.deserialize(reader)
    const body = SizedBuffer.deserialize(reader)
    return new HttpRequest(method, path, headers, body)
  }
  public serialize (writer: BufferWriter) {
    String.serialize(this.method, writer)
    String.serialize(this.path, writer)
    this.headers.serialize(writer)
    SizedBuffer.serialize(this.body, writer)
  }
}
export class HttpResponse implements Serializable {
  public readonly status: number
  public readonly message: string
  public readonly headers: HttpHeaders
  public readonly body: Buffer
  constructor (
    status: number,
    message: string,
    headers?: HttpHeaders,
    body?: Buffer
  ) {
    this.status = status
    this.message = message
    this.headers = headers ? headers : new HttpHeaders([])
    this.body = body ? body : Buffer.alloc(0)
  }
  public static deserialize (reader: BufferReader): HttpResponse {
    const status = UInt32.deserialize(reader)
    const message = String.deserialize(reader)
    const headers = HttpHeaders.deserialize(reader)
    const body = SizedBuffer.deserialize(reader)
    return new HttpResponse(status, message, headers, body)
  }
  public serialize (writer: BufferWriter) {
    UInt32.serialize(this.status, writer)
    String.serialize(this.message, writer)
    this.headers.serialize(writer)
    SizedBuffer.serialize(this.body, writer)
  }
}
