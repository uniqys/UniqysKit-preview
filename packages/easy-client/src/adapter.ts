import { Signer, RequestConfig } from '.'
import { HttpHeaders, HttpRequest, Transaction } from '@uniqys/easy-types'
import { Api } from './api'
import Axios, { AxiosPromise } from 'axios'

export function adapter (signer: Signer, api: Api): (config: RequestConfig) => AxiosPromise {
  return async (config) => {
    delete config.adapter
    // pass
    if (!config.sign) { return Axios(config) }

    // sign and async response
    // method
    config.method = (config.method && config.method.toUpperCase()) || 'GET'

    // params
    const url = new URL(config.url!)
    if (config.params) {
      if (config.paramsSerializer) {
        url.search = config.paramsSerializer(config.params)
      } else if (config.params instanceof URLSearchParams) {
        url.search = config.params.toString()
      } else if (typeof config.params === 'object') {
        for (const key of Object.keys(config.params)) {
          const value = config.params[key]
          if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(key + '[]', v))
          } else {
            url.searchParams.append(key, value)
          }
        }
      }
    }
    config.url = url.href
    delete config.params
    const path = url.pathname + url.search

    // data
    const data = Buffer.isBuffer(config.data) ? config.data : Buffer.from(config.data)
    config.headers['Content-Length'] = data.length

    // include headers
    let include = config.headers['Uniqys-Include-Headers'] || config.headers['uniqys-include-headers']
    if (!include || typeof include !== 'string') {
      include = 'Content-Type'
      config.headers['Uniqys-Include-Headers'] = include
    }
    // case insensitive
    for (const key of ['Content-Type', 'content-type']) {
      if (config.headers[key]) config.headers[key] = config.headers[key].toLowerCase()
    }
    const normalized = (include as string).split(/\s*,\s*/).map(s => s.toLowerCase())
    const headers = HttpHeaders.fromObject(config.headers, key => !(/^uniqys-.+/.test(key) || !normalized.includes(key)))

    // nonce
    const nonce = await api.nonce(signer.address.toString()) + 1

    // make tx and sign
    const tx = new Transaction(nonce, new HttpRequest(config.method, path, headers, data)) // data
    const sign = await signer.sign(tx)

    // set headers
    config.headers['Uniqys-Nonce'] = nonce
    config.headers['Uniqys-Sign'] = sign.buffer.toString('base64')
    delete config.headers['Content-Length']

    // request
    let response = await Axios(config)

    // wait async response
    let wait = 100
    while (response.status === 202 && response.data.id) {
      await new Promise((resolve, _) => setTimeout(resolve, wait))
      wait *= 2
      response = await api.awaiting(response.data.id)
    }
    return response
  }
}
