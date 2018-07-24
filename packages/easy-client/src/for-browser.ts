import { EasyClient } from './client'
import { KeyPair, Signature } from '@uniqys/signature'
import { Transaction } from '@uniqys/easy-types'
import { Bytes32 } from '@uniqys/types'

function checkLocalStorage () {
  try {
    localStorage.setItem('__localStorage_test__', '__test__')
    localStorage.removeItem('__localStorage_test__')
    return true
  } catch (e) {
    return false
  }
}

// This implementation is only for development use.
// It is NOT secure, because it save private key in localStorage.
const key = 'easy_private_key'
export class EasyClientForBrowser extends EasyClient {
  constructor (base: string) {
    if (!checkLocalStorage()) { throw new Error('available localStorage required') }

    const privateKeyString = localStorage.getItem(key)
    const privateKey = privateKeyString
      ? new Bytes32(Buffer.from(privateKeyString, 'hex'))
      : (() => {
        const privateKey = KeyPair.generatePrivateKey()
        localStorage.setItem(key, privateKey.buffer.toString('hex'))
        return privateKey
      })()
    const keyPair = new KeyPair(privateKey)
    console.log(`easy address: ${keyPair.address.toString()}`)

    const signer = {
      address: keyPair.address,
      sign: async (tx: Transaction) => {
        const msg = `
Accept to sign this post?
nonce: ${tx.nonce}
method: ${tx.request.method}
path: ${tx.request.path}
headers:
${tx.request.headers.list.map(kv => `  ${kv['0']}: ${kv['1']}`).join('\n')}
body:
${tx.request.body.toString()}
`
        return new Promise<Signature>((resolve, reject) => {
          if (confirm(msg)) {
            resolve(keyPair.sign(tx.hash))
          } else {
            reject(new Error('sign rejected'))
          }
        })
      }
    }

    super(signer, { baseURL: base })
  }
}
