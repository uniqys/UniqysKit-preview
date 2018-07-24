import { Config } from '.'

const schema = {
  'type': 'object',
  'required': ['name', 'age'],
  'properties': {
    'name': {
      'type': 'string'
    },
    'age': {
      'type': 'integer',
      'minimum': 0
    }
  }
}
interface Test {
  name: string
  age: number
}
class TestConfig extends Config<Test> {
  constructor () { super(schema) }
}

describe('Config loader', () => {
  it('validate config', () => {
    const config = new TestConfig().validate({
      'name': 'Alice',
      'age': 10
    })
    expect(config.name).toBe('Alice')
    expect(config.age).toBe(10)
  })
  it('throw error if will load missing parameter config', () => {
    expect(() => {
      new TestConfig().validate({
        'name': 'Charlie'
      })
    }).toThrow()
  })
  it('throw error if will load invalid parameter config', () => {
    expect(() => {
      new TestConfig().validate({
        'name': 'Bob',
        'age': -10
      })
    }).toThrow()
  })
})
