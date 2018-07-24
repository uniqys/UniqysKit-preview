import { MemcachedCompatibleServer } from '.'
import { InMemoryStore } from '@uniqys/store'
import net, { AddressInfo } from 'net'
import split from 'split'

// cSpell:words noreply
const errorRegex = /^(ERROR|SERVER_ERROR .*|CLIENT_ERROR .*)$/

describe('Test memcached compatibility', () => {
  const timeout = 500
  const server = new MemcachedCompatibleServer(new InMemoryStore(), { useCas: true })
  const _socket = new net.Socket()
  const _lines: NodeJS.ReadableStream = _socket.pipe(split())
  const client = { socket: _socket, lines: _lines }
  let connected = false
  let port: number

  beforeAll(done => {
    server.listen()
    server.once('listening', () => {
      port = (server.address() as AddressInfo).port
      done()
    })
    client.socket.setMaxListeners(100) // split handler
    client.socket.on('connect', () => { connected = true })
    client.socket.on('close', () => { connected = false })
  })
  beforeEach(done => {
    function prepare () {
      client.socket.write('set test_exists 0 0 6 noreply\r\nexists\r\n')
      client.socket.write('set test_number 0 0 2 noreply\r\n42\r\n')
      client.socket.write('delete test_not_exists noreply\r\n')
    }
    if (connected) {
      prepare()
      done()
    } else {
      client.socket.connect(port)
      client.socket.once('connect', () => {
        client.lines = client.socket.pipe(split())
        client.lines.pause()
        prepare()
        done()
      })
    }
  })
  afterAll(done => {
    client.socket.end()
    server.close(done)
  })

  describe('memcached compatible', () => {
    describe('unknown', () => {
      it('skip blank line', async () => {
        client.socket.write('\r\n')
        await assertNoMoreResponse(client)
      }, timeout)
      it('returns error', async () => {
        client.socket.write('foo\r\n')
        expect(await readLine(client)).toMatch(errorRegex)
        await assertNoMoreResponse(client)
      }, timeout)
    })
    describe('quit', () => {
      it('accepts no parameter', async () => {
        client.socket.write('quit foo bar\r\n')
        expect(await readLine(client)).toMatch(errorRegex)
        await assertNoMoreResponse(client)
      }, timeout)
      it('does not accept noreply', async () => {
        client.socket.write('quit noreply\r\n')
        expect(await readLine(client)).toMatch(errorRegex)
        await assertNoMoreResponse(client)
      }, timeout)
      it('quits connection', (done) => {
        client.socket.write('quit\r\n')
        client.socket.once('close', (hadError) => {
          expect(hadError).not.toBeTruthy()
          done()
        })
        client.lines.resume()
      }, timeout)
    })
    describe('version', () => {
      it('accepts no parameter', async () => {
        client.socket.write('version foo bar\r\n')
        expect(await readLine(client)).toMatch(errorRegex)
        await assertNoMoreResponse(client)
      }, timeout)
      it('does not accept noreply', async () => {
        client.socket.write('version noreply\r\n')
        expect(await readLine(client)).toMatch(errorRegex)
        await assertNoMoreResponse(client)
      }, timeout)
      it('returns a version', async () => {
        client.socket.write('version\r\n')
        expect(await readLine(client)).toMatch(/VERSION .+/)
        await assertNoMoreResponse(client)
      }, timeout)
    })
    describe('verbosity', () => {
      it('requires one parameter', async () => {
        client.socket.write('verbosity\r\n')
        expect(await readLine(client)).toMatch(errorRegex)
        await assertNoMoreResponse(client)
      }, timeout)
      it('requires a numeric parameter', async () => {
        client.socket.write('verbosity foo\r\n')
        expect(await readLine(client)).toMatch(errorRegex)
        await assertNoMoreResponse(client)
      }, timeout)
      it('accepts a numeric parameter', async () => {
        client.socket.write('verbosity 0\r\n')
        expect(await readLine(client)).toMatch(/OK/)
        await assertNoMoreResponse(client)
      }, timeout)
      it('supports noreply', async () => {
        client.socket.write('verbosity 0 noreply\r\n')
        await assertNoMoreResponse(client)
      }, timeout)
    })
    describe('set', () => {
      it('requires key, expire, flags, bytes', async () => {
        client.socket.write('set test_set\r\n')
        expect(await readLine(client)).toMatch(errorRegex)
        await assertNoMoreResponse(client)
      }, timeout)
      it('requires key as max 250 chars', async () => {
        client.socket.write('set '
          + 'test_set_too_long_key_test_set_too_long_key_test_set_too_long_key_test_set_too_long_key_'
          + 'test_set_too_long_key_test_set_too_long_key_test_set_too_long_key_test_set_too_long_key_'
          + 'test_set_too_long_key_test_set_too_long_key_test_set_too_long_key_test_set_too_long_key'
          + ' 0 0 3\r\n')
        expect(await readLine(client)).toMatch(errorRegex)
        await assertNoMoreResponse(client)
      }, timeout)
      it('sets value of key if not exists', async () => {
        client.socket.write('set test_not_exists 0 0 3\r\nset\r\n')
        expect(await readLine(client)).toMatch(/STORED/)
        await assertExists(client, 'test_not_exists', [0, 'set'])
      }, timeout)
      it('sets value of key if exists', async () => {
        client.socket.write('set test_exists 0 0 3\r\nset\r\n')
        expect(await readLine(client)).toMatch(/STORED/)
        await assertExists(client, 'test_exists', [0, 'set'])
      }, timeout)
      it('sets value with flags', async () => {
        client.socket.write('set test_exists 42 0 3\r\nset\r\n')
        expect(await readLine(client)).toMatch(/STORED/)
        await assertExists(client, 'test_exists', [42, 'set'])
      }, timeout)
      it('does not accept flags bigger than 32bit', async () => {
        client.socket.write('set test_exists 4294967296 0 3\r\nset\r\n')
        expect(await readLine(client)).toMatch(errorRegex)
        await assertNoMoreResponse(client)
      }, timeout)
      it('supports noreply', async () => {
        client.socket.write('set test_set 0 0 3 noreply\r\nset\r\n')
        await assertNoMoreResponse(client)
        await assertExists(client, 'test_set', [0, 'set'])
      }, timeout)
    })
    describe('get', () => {
      it('requires key', async () => {
        client.socket.write('get\r\n')
        expect(await readLine(client)).toMatch(errorRegex)
        await assertNoMoreResponse(client)
      }, timeout)
      it('requires key as max 250 chars', async () => {
        client.socket.write('get '
          + 'test_get_too_long_key_test_get_too_long_key_test_get_too_long_key_test_get_too_long_key_'
          + 'test_get_too_long_key_test_get_too_long_key_test_get_too_long_key_test_get_too_long_key_'
          + 'test_get_too_long_key_test_get_too_long_key_test_get_too_long_key_test_get_too_long_key'
          + '\r\n')
        expect(await readLine(client)).toMatch(errorRegex)
        await assertNoMoreResponse(client)
      }, timeout)
      it('returns value of key if exists', async () => {
        client.socket.write('get test_exists\r\n')
        expect(await readKeyValue(client)).toEqual(['test_exists', [0, 'exists']])
        expect(await readLine(client)).toMatch(/END/)
        await assertNoMoreResponse(client)
      }, timeout)
      it('returns no value of key if not exists', async () => {
        client.socket.write('get test_not_exists\r\n')
        expect(await readLine(client)).toMatch(/END/)
        await assertNoMoreResponse(client)
      }, timeout)
    })
    describe('gets', () => {
      it('returns value with cas uniq of key if exists', async () => {
        client.socket.write('gets test_exists\r\n')
        const [key, value, cas] = await readKeyValueCas(client)
        expect([key, value]).toEqual(['test_exists', [0, 'exists']])
        expect(cas).not.toBeNaN()
        expect(await readLine(client)).toMatch(/END/)
        await assertNoMoreResponse(client)
      }, timeout)
      it('returns no value of key if not exists', async () => {
        client.socket.write('gets test_not_exists\r\n')
        expect(await readLine(client)).toMatch(/END/)
        await assertNoMoreResponse(client)
      }, timeout)
    })
    describe('multiple get', () => {
      it('returns multiple value', async () => {
        client.socket.write('set test_a 42 0 1 noreply\r\na\r\n')
        client.socket.write('set test_b 0 0 1 noreply\r\nb\r\n')
        client.socket.write('delete test_c noreply\r\n')
        client.socket.write('set test_d 17 0 1 noreply\r\nd\r\n')

        client.socket.write('get test_a test_b test_c test_d\r\n')
        const values = new Set([await readKeyValue(client), await readKeyValue(client), await readKeyValue(client)])
        expect(values).toEqual(new Set([['test_a', [42, 'a']], ['test_b', [0, 'b']], ['test_d', [17, 'd']]]))
        expect(await readLine(client)).toMatch(/END/)
        await assertNoMoreResponse(client)
      }, timeout)
    })
    describe('flush', () => {
      it('accepts no parameter', async () => {
        client.socket.write('flush_all\r\n')
        expect(await readLine(client)).toMatch(/OK/)
        await assertNotExists(client, 'test_exists')
      }, timeout)
      it('accepts a numeric parameter', async () => {
        client.socket.write('flush_all 0\r\n')
        expect(await readLine(client)).toMatch(/OK/)
        await assertNotExists(client, 'test_exists')
      }, timeout)
      it('supports noreply', async () => {
        client.socket.write('flush_all noreply\r\n')
        await assertNoMoreResponse(client)
        await assertNotExists(client, 'test_exists')
      }, timeout)
      it('does not accepts other parameters', async () => {
        client.socket.write('flush_all foo\r\n')
        expect(await readLine(client)).toMatch(errorRegex)
        await assertNoMoreResponse(client)
        await assertExists(client, 'test_exists', [0, 'exists'])
      }, timeout)
    })
    describe('add', () => {
      it('adds value of key if not exists', async () => {
        client.socket.write('add test_not_exists 0 0 3\r\nadd\r\n')
        expect(await readLine(client)).toMatch(/STORED/)
        await assertExists(client, 'test_not_exists', [0, 'add'])
      }, timeout)
      it('does not add value of key if exists', async () => {
        client.socket.write('add test_exists 0 0 3\r\nadd\r\n')
        expect(await readLine(client)).toMatch(/NOT_STORED/)
        await assertNoMoreResponse(client)
      }, timeout)
      it('supports noreply', async () => {
        client.socket.write('set test_not_exists 0 0 11 noreply\r\nadd_noreply\r\n')
        await assertNoMoreResponse(client)
        await assertExists(client, 'test_not_exists', [0, 'add_noreply'])
      }, timeout)
    })
    describe('replace', () => {
      it('replaces value of key if exists', async () => {
        client.socket.write('replace test_exists 0 0 7\r\nreplace\r\n')
        expect(await readLine(client)).toMatch(/STORED/)
        await assertExists(client, 'test_exists', [0, 'replace'])
      }, timeout)
      it('does not replace value of key if not exists', async () => {
        client.socket.write('replace test_not_exists 0 0 7\r\nreplace\r\n')
        expect(await readLine(client)).toMatch(/NOT_STORED/)
        await assertNoMoreResponse(client)
      }, timeout)
      it('supports noreply', async () => {
        client.socket.write('replace test_exists 0 0 15 noreply\r\nreplace_noreply\r\n')
        await assertNoMoreResponse(client)
        await assertExists(client, 'test_exists', [0, 'replace_noreply'])
      }, timeout)
    })
    describe('cas', () => {
      it('requires cas unique', async () => {
        client.socket.write('cas test_exists 0 0 3\r\n')
        expect(await readLine(client)).toMatch(errorRegex)
        await assertNoMoreResponse(client)
      }, timeout)
      it('sets value of key if not updated after get', async () => {
        client.socket.write('gets test_exists\r\n')
        const [, , cas] = await readKeyValueCas(client)
        expect(await readLine(client)).toMatch(/END/)
        client.socket.write(`cas test_exists 0 0 3 ${cas}\r\nset\r\n`)
        expect(await readLine(client)).toMatch(/STORED/)
        await assertExists(client, 'test_exists', [0, 'set'])
      }, timeout)
      it('does not set value of key if updated after get', async () => {
        client.socket.write('gets test_exists\r\n')
        const [, , cas] = await readKeyValueCas(client)
        expect(await readLine(client)).toMatch(/END/)
        client.socket.write('set test_exists 0 0 5 noreply\r\ntouch\r\n')
        client.socket.write(`cas test_exists 0 0 3 ${cas}\r\nset\r\n`)
        expect(await readLine(client)).toMatch(/EXISTS/)
        await assertExists(client, 'test_exists', [0, 'touch'])
      }, timeout)
      it('does not set value of key if deleted after get', async () => {
        client.socket.write('gets test_exists\r\n')
        const [, , cas] = await readKeyValueCas(client)
        expect(await readLine(client)).toMatch(/END/)
        client.socket.write('delete test_exists noreply\r\n')
        client.socket.write(`cas test_exists 0 0 3 ${cas}\r\nset\r\n`)
        expect(await readLine(client)).toMatch(/NOT_FOUND/)
        await assertNotExists(client, 'test_exists')
      }, timeout)
    })
    describe('delete', () => {
      it('requires a key', async () => {
        client.socket.write('delete\r\n')
        expect(await readLine(client)).toMatch(errorRegex)
        await assertNoMoreResponse(client)
      }, timeout)
      it('accepts only one key', async () => {
        client.socket.write('delete test_a test_b\r\n')
        expect(await readLine(client)).toMatch(errorRegex)
        await assertNoMoreResponse(client)
      }, timeout)
      it('deletes value of key if exists', async () => {
        client.socket.write('delete test_exists\r\n')
        expect(await readLine(client)).toMatch(/DELETED/)
        await assertNotExists(client, 'test_exists')
      }, timeout)
      it('does not delete value of key if not exists', async () => {
        client.socket.write('delete test_not_exists\r\n')
        expect(await readLine(client)).toMatch(/NOT_FOUND/)
        await assertNoMoreResponse(client)
      }, timeout)
      it('accepts noreply', async () => {
        client.socket.write('delete test_exists noreply\r\n')
        await assertNoMoreResponse(client)
        await assertNotExists(client, 'test_exists')
      }, timeout)
    })
    describe('incr', () => {
      // NOTE: This command implementations violates protocol and saturate to MAX_SAFE_INTEGER.
      it('require key, value', async () => {
        client.socket.write('incr test_number\r\n')
        expect(await readLine(client)).toMatch(errorRegex)
        await assertNoMoreResponse(client)
      }, timeout)
      it('require value as number', async () => {
        client.socket.write('incr test_number foo\r\n')
        expect(await readLine(client)).toMatch(errorRegex)
        await assertNoMoreResponse(client)
      }, timeout)
      it('increments value of key if exists', async () => {
        client.socket.write('incr test_number 4\r\n')
        expect(await readLine(client)).toBe('46')
        await assertNoMoreResponse(client)
      }, timeout)
      it('does not increment value of key if not exists', async () => {
        client.socket.write('incr test_not_exists 4\r\n')
        expect(await readLine(client)).toMatch(/NOT_FOUND/)
        await assertNoMoreResponse(client)
      }, timeout)
      it('supports noreply', async () => {
        client.socket.write('incr test_number 10 noreply\r\n')
        await assertNoMoreResponse(client)
        await assertExists(client, 'test_number', [0, '52'])
      }, timeout)
    })
    describe('decr', () => {
      it('require key, value', async () => {
        client.socket.write('decr test_number\r\n')
        expect(await readLine(client)).toMatch(errorRegex)
        await assertNoMoreResponse(client)
      }, timeout)
      it('require value as number', async () => {
        client.socket.write('decr test_number foo\r\n')
        expect(await readLine(client)).toMatch(errorRegex)
        await assertNoMoreResponse(client)
      }, timeout)
      it('decrements value of key if exists', async () => {
        client.socket.write('decr test_number 4\r\n')
        expect(await readLine(client)).toBe('38')
        await assertNoMoreResponse(client)
      }, timeout)
      it('does not overflow', async () => {
        client.socket.write('decr test_number 100\r\n')
        expect(await readLine(client)).toBe('0')
        await assertNoMoreResponse(client)
      }, timeout)
      it('does not decrement value of key if not exists', async () => {
        client.socket.write('decr test_not_exists 4\r\n')
        expect(await readLine(client)).toMatch(/NOT_FOUND/)
        await assertNoMoreResponse(client)
      }, timeout)
      it('supports noreply', async () => {
        client.socket.write('decr test_number 10 noreply\r\n')
        await assertNoMoreResponse(client)
        await assertExists(client, 'test_number', [0, '32'])
      }, timeout)
    })
    describe('append', () => {
      it('appends value of key if exists', async () => {
        client.socket.write('append test_exists 0 0 7\r\n_append\r\n')
        expect(await readLine(client)).toMatch(/STORED/)
        await assertExists(client, 'test_exists', [0, 'exists_append'])
      }, timeout)
      it('does not set value of key if not exists', async () => {
        client.socket.write('append test_not_exists 0 0 7\r\n_append\r\n')
        expect(await readLine(client)).toMatch(/NOT_STORED/)
        await assertNoMoreResponse(client)
      }, timeout)
      it('supports noreply', async () => {
        client.socket.write('append test_exists 0 0 7 noreply\r\n_append\r\n')
        await assertNoMoreResponse(client)
        await assertExists(client, 'test_exists', [0, 'exists_append'])
      }, timeout)
    })
    describe('prepend', () => {
      it('prepends value of key if exists', async () => {
        client.socket.write('prepend test_exists 0 0 8\r\nprepend_\r\n')
        expect(await readLine(client)).toMatch(/STORED/)
        await assertExists(client, 'test_exists', [0, 'prepend_exists'])
      }, timeout)
      it('does not set value of key if not exists', async () => {
        client.socket.write('prepend test_not_exists 0 0 8\r\nprepend_\r\n')
        expect(await readLine(client)).toMatch(/NOT_STORED/)
        await assertNoMoreResponse(client)
      }, timeout)
      it('supports noreply', async () => {
        client.socket.write('prepend test_exists 0 0 8 noreply\r\nprepend_\r\n')
        await assertNoMoreResponse(client)
        await assertExists(client, 'test_exists', [0, 'prepend_exists'])
      }, timeout)
    })
    describe('stats', () => {
      it('does not accept noreply', async () => {
        client.socket.write('stats noreply\r\n')
        expect(await readLine(client)).toMatch(errorRegex)
        await assertNoMoreResponse(client)
      }, timeout)
      it('returns stats', async () => {
        client.socket.write('stats\r\n')
        let line = await readLine(client)
        while (line !== 'END') {
          expect(line).toMatch(/STAT \S+ \S+/)
        }
        await assertNoMoreResponse(client)
      }, timeout)
    })
  })
})

// Not defined by protocol.
describe('Test no cas mode', () => {
  const timeout = 500
  const server = new MemcachedCompatibleServer(new InMemoryStore(), { useCas: false })
  const _socket = new net.Socket()
  const _lines: NodeJS.ReadableStream = _socket.pipe(split())
  const client = { socket: _socket, lines: _lines }
  let port: number
  beforeAll(done => {
    server.listen()
    server.once('listening', () => {
      port = (server.address() as AddressInfo).port
      client.socket.connect(port)
      client.socket.once('connect', () => {
        client.lines = client.socket.pipe(split())
        client.lines.pause()
        done()
      })
    })
  })
  afterAll(done => {
    client.socket.end()
    server.close(done)
  })

  describe('memcached compatible', () => {
    describe('gets', () => {
      it('returns value with dummy cas uniq of key if exists', async () => {
        client.socket.write('set test_exists 0 0 6 noreply\r\nexists\r\n')
        client.socket.write('gets test_exists\r\n')
        const [key, value, cas] = await readKeyValueCas(client)
        expect([key, value]).toEqual(['test_exists', [0, 'exists']])
        expect(cas).not.toBeNaN()
        expect(await readLine(client)).toMatch(/END/)
        await assertNoMoreResponse(client)
      }, timeout)
      it('returns same cas uniq even if updated', async () => {
        client.socket.write('set test_exists 0 0 6 noreply\r\nexists\r\n')
        client.socket.write('gets test_exists\r\n')
        const [,, cas1] = await readKeyValueCas(client)
        expect(await readLine(client)).toMatch(/END/)
        client.socket.write('set test_exists 0 0 7 noreply\r\nupdated\r\n')
        client.socket.write('gets test_exists\r\n')
        const [,, cas2] = await readKeyValueCas(client)
        expect(await readLine(client)).toMatch(/END/)
        expect(cas1).toBe(cas2)
        await assertNoMoreResponse(client)
      }, timeout)
    })
    describe('cas', () => {
      it('sets value of key if cas unique matched', async () => {
        client.socket.write('gets test_exists\r\n')
        const [, , cas] = await readKeyValueCas(client)
        expect(await readLine(client)).toMatch(/END/)
        client.socket.write(`cas test_exists 0 0 3 ${cas}\r\nset\r\n`)
        expect(await readLine(client)).toMatch(/STORED/)
        await assertExists(client, 'test_exists', [0, 'set'])
      }, timeout)
    })
  })
})

type Client = { socket: net.Socket, lines: NodeJS.ReadableStream }
async function assertNoMoreResponse (client: Client): Promise<void> {
  // no more response and health check
  client.socket.write('version\r\n')
  expect(await readLine(client)).toMatch(/VERSION .+/)
}
async function assertExists (client: Client, key: string, expectValue: [number, string]): Promise<void> {
  client.socket.write(`get ${key}\r\n`)
  expect(await readKeyValue(client)).toEqual([key, expectValue])
  expect(await readLine(client)).toMatch(/END/)
}
async function assertNotExists (client: Client, key: string): Promise<void> {
  client.socket.write(`get ${key}\r\n`)
  expect(await readLine(client)).toMatch(/END/)
}
async function readKeyValue (client: Client): Promise<[string, [number, string]]> {
  const result = /VALUE (.*) (\S+) (\S+)/.exec(await readLine(client))
  expect(result).not.toBeNull()
  if (result === null) { throw new Error() }
  const value = await readLine(client)
  return [result[1], [parseInt(result[2], 10), value]]
}
async function readKeyValueCas (client: Client): Promise<[string, [number, string], number]> {
  const result = /VALUE (.*) (\S+) (\S+) (\S+)/.exec(await readLine(client))
  expect(result).not.toBeNull()
  if (result === null) { throw new Error() }
  const value = await readLine(client)
  return [result[1], [parseInt(result[2], 10), value], parseInt(result[4], 10)]
}
function readLine (client: Client): Promise<string> {
  return new Promise((resolve) => {
    client.lines.once('data', (l: string) => { client.lines.pause(); resolve(l) })
    client.lines.resume()
  })
}
