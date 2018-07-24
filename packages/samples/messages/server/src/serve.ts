import { URL } from 'url'

import MemDown from 'memdown'

import { Blockchain, BlockStore, GenesisConfig } from '@uniqys/blockchain'
import { Easy } from '@uniqys/easy-framework'
import { Local } from '@uniqys/chain-core-dev'
import { LevelDownStore } from '@uniqys/store'
import { KeyConfig } from '@uniqys/signature'
import { App } from './app'

// set logger enable
import debug from 'debug'
debug.enable('chain-core*,easy*,app*')

function startApp () {
  new App('localhost:56010', 'localhost:56011').listen(56080)
}

async function startEasy () {
  // load config
  const genesis = new GenesisConfig().validateAsBlock(require('../../../config/genesis.json'))
  const keyPair = new KeyConfig().validateAsKeyPair(require('../../../config/validatorKey.json'))
  // state store
  const stateStore = new LevelDownStore(new MemDown())
  const chainStore = new LevelDownStore(new MemDown())
  const easy = new Easy(new URL('http://localhost:56080'), stateStore, (dapp) =>
    new Local(dapp, new Blockchain(new BlockStore(chainStore), genesis), keyPair)
  )
  easy.gateway().listen(8080)
  easy.innerApi().listen(56010)
  easy.innerMemcachedCompatible().listen(56011)
  await easy.start()
}

(async () => {
  startApp()
  await startEasy()
})().catch(err => console.log(err))
