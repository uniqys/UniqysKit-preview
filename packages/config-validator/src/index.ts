import Ajv from 'ajv'

export class Config<T> {
  private _validate: any
  constructor (
    schema: object
  ) {
    let ajv = new Ajv()
    this._validate = ajv.compile(schema)
  }

  public validate (config: {}): T {
    if (!this._validate(config)) { throw new Error(this._validate.errors[0].message) }
    return config as T
  }
}
