import { Block, BlockHeader, BlockBody, Consensus, Transaction } from '@uniqys/blockchain'
import { BufferWriter, BufferReader, Serializable, UInt8, UInt32, UInt64, List } from '@uniqys/serialize'
import { Hash } from '@uniqys/signature'

export type EventMessage = Message.Hello | Message.NewTransaction | Message.NewBlock | Message.NewBlockHeight
export type RequestMessage = Message.GetConsentedHeader | Message.GetHeaders | Message.GetBodies
export type ResponseMessage = Message.ConsentedHeader | Message.Headers | Message.Bodies
export type Message = EventMessage | RequestMessage | ResponseMessage
export namespace Message {
  export enum Type { Event, Request, Response }
  // meta: 0x0X
  // Handshake
  export class Hello implements Serializable {
    public static readonly code = 0x00
    public readonly code = Hello.code
    public readonly type = Type.Event
    constructor (
      public readonly height: number,
      public readonly genesis: Hash
    ) { }
    public static deserialize (reader: BufferReader): Hello {
      const height = UInt64.deserialize(reader)
      const genesis = Hash.deserialize(reader)
      return new Hello(height, genesis)
    }
    public serialize (writer: BufferWriter) {
      UInt64.serialize(this.height, writer)
      this.genesis.serialize(writer)
    }
  }

  // broadcast: 0x1X
  // propagate
  export class NewTransaction implements Serializable {
    public static readonly code = 0x10
    public readonly code = NewTransaction.code
    public readonly type = Type.Event
    constructor (
      public readonly transaction: Transaction
    ) {}
    public static deserialize (reader: BufferReader): NewTransaction {
      const transaction = Transaction.deserialize(reader)
      return new NewTransaction(transaction)
    }
    public serialize (writer: BufferWriter) {
      this.transaction.serialize(writer)
    }
  }
  export class NewBlock {
    public static readonly code = 0x11
    public readonly code = NewBlock.code
    public readonly type = Type.Event
    constructor (
      public readonly block: Block,
      public readonly consensus: Consensus
    ) {}
    public static deserialize (reader: BufferReader): NewBlock {
      const block = Block.deserialize(reader)
      const consensus = Consensus.deserialize(reader)
      return new NewBlock(block, consensus)
    }
    public serialize (writer: BufferWriter) {
      this.block.serialize(writer)
      this.consensus.serialize(writer)
    }
  }

  // announce
  export class NewBlockHeight {
    public static readonly code = 0x12
    public readonly code = NewBlockHeight.code
    public readonly type = Type.Event
    constructor (
      public readonly height: number
    ) {}
    public static deserialize (reader: BufferReader): NewBlockHeight {
      const height = UInt64.deserialize(reader)
      return new NewBlockHeight(height)
    }
    public serialize (writer: BufferWriter) {
      UInt64.serialize(this.height, writer)
    }
  }

  // request -> response: 0x2X -> 0x3X
  export class GetConsentedHeader {
    public static readonly code = 0x20
    public readonly code = GetConsentedHeader.code
    public readonly type = Type.Request
    constructor (
      public readonly height: number
    ) {}
    public static deserialize (reader: BufferReader): GetConsentedHeader {
      const height = UInt64.deserialize(reader)
      return new GetConsentedHeader(height)
    }
    public serialize (writer: BufferWriter) {
      UInt64.serialize(this.height, writer)
    }
  }
  export class ConsentedHeader {
    public static readonly code = 0x30
    public readonly code = ConsentedHeader.code
    public readonly type = Type.Response
    constructor (
      public readonly header: BlockHeader,
      public readonly consensus: Consensus // note: Optional?
    ) {}
    public static deserialize (reader: BufferReader): ConsentedHeader {
      const header = BlockHeader.deserialize(reader)
      const consensus = Consensus.deserialize(reader)
      return new ConsentedHeader(header, consensus)
    }
    public serialize (writer: BufferWriter) {
      this.header.serialize(writer)
      this.consensus.serialize(writer)
    }
  }

  export class GetHeaders {
    public static readonly code = 0x21
    public readonly code = GetHeaders.code
    public readonly type = Type.Request
    constructor (
      public readonly from: number,
      public readonly count: number
    ) {}
    public static deserialize (reader: BufferReader): GetHeaders {
      const from = UInt64.deserialize(reader)
      const count = UInt32.deserialize(reader)
      return new GetHeaders(from, count)
    }
    public serialize (writer: BufferWriter) {
      UInt64.serialize(this.from, writer)
      UInt32.serialize(this.count, writer)
    }
  }
  export class Headers {
    public static readonly code = 0x31
    public readonly code = Headers.code
    public readonly type = Type.Response
    constructor (
      public readonly headers: BlockHeader[]
    ) {}
    public static deserialize (reader: BufferReader): Headers {
      const headers = List.deserialize(BlockHeader.deserialize)(reader)
      return new Headers(headers)
    }
    public serialize (writer: BufferWriter) {
      List.serialize<BlockHeader>((b, w) => b.serialize(w))(this.headers, writer)
    }
  }

  export class GetBodies {
    public static readonly code = 0x22
    public readonly code = GetBodies.code
    public readonly type = Type.Request
    constructor (
      public readonly from: number,
      public readonly count: number
    ) {}
    public static deserialize (reader: BufferReader): GetBodies {
      const from = UInt64.deserialize(reader)
      const count = UInt32.deserialize(reader)
      return new GetBodies(from, count)
    }
    public serialize (writer: BufferWriter) {
      UInt64.serialize(this.from, writer)
      UInt32.serialize(this.count, writer)
    }
  }
  export class Bodies {
    public static readonly code = 0x32
    public readonly code = Bodies.code
    public readonly type = Type.Response
    constructor (
      public readonly bodies: BlockBody[]
    ) {}
    public static deserialize (reader: BufferReader): Bodies {
      const bodies = List.deserialize(BlockBody.deserialize)(reader)
      return new Bodies(bodies)
    }
    public serialize (writer: BufferWriter) {
      List.serialize<BlockBody>((b, w) => b.serialize(w))(this.bodies, writer)
    }
  }

  // TODO: Get Updated Validator Set

  export function serialize (msg: Message, writer: BufferWriter) {
    UInt8.serialize(msg.code, writer)
    msg.serialize(writer)
  }
  export function deserialize (reader: BufferReader): Message {
    const code = UInt8.deserialize(reader)
    switch (code) {
      case Hello.code: return Hello.deserialize(reader)
      case NewTransaction.code: return NewTransaction.deserialize(reader)
      case NewBlock.code: return NewBlock.deserialize(reader)
      case NewBlockHeight.code: return NewBlockHeight.deserialize(reader)
      case GetConsentedHeader.code: return GetConsentedHeader.deserialize(reader)
      case ConsentedHeader.code: return ConsentedHeader.deserialize(reader)
      case GetHeaders.code: return GetHeaders.deserialize(reader)
      case Headers.code: return Headers.deserialize(reader)
      case GetBodies.code: return GetBodies.deserialize(reader)
      case Bodies.code: return Bodies.deserialize(reader)
      default: throw new Error('Unknown message code')
    }
  }
}
