import { Blockchain } from './blockchain'
import { Hash, KeyPair } from '@uniqys/signature'
import { Block } from './block'
import { Consensus, ValidatorSet, Validator } from './consensus'
import { TransactionList } from './transaction'
import { BlockStore } from './block-store'
import { InMemoryStore } from '@uniqys/store'

async function setBlock (blockchain: Blockchain, block: Block, consensus: Consensus): Promise<void> {
  const height = block.header.height
  await Promise.all([
    blockchain.blockStore.setHeader(height, block.header),
    blockchain.blockStore.setBody(height, block.body)
  ])
  await blockchain.blockStore.setHeight(height)
  await blockchain.blockStore.setLastConsensus(consensus)
}

/* tslint:disable:no-unused-expression */
describe('blockchain', () => {
  let signer: KeyPair
  let validatorSet: ValidatorSet
  let genesis: Block
  let genesisConsensus: Consensus
  beforeAll(() => {
    signer = new KeyPair()
    validatorSet = new ValidatorSet([ new Validator(signer.address, 100) ])
    genesis = Block.construct(1, 100, Hash.fromData('genesis'), Hash.fromData('state'),
      new TransactionList([]), new Consensus([]), validatorSet)
    genesisConsensus = new Consensus([signer.sign(genesis.hash)])
  })
  it('can create', () => {
    expect(() => { new Blockchain(new BlockStore(new InMemoryStore()), genesis) }).not.toThrow()
  })
  it('need to make ready', async () => {
    const blockchain = new Blockchain(new BlockStore(new InMemoryStore()), genesis)
    await expect(blockchain.height).rejects.toThrow()
    await blockchain.ready()
    await expect(blockchain.height).resolves.toBe(0)
    await expect(blockchain.ready()).resolves.not.toThrow()
  })
  it('restore from block store', async () => {
    const store = new BlockStore(new InMemoryStore())
    const blockchain = new Blockchain(store, genesis)
    await blockchain.ready()
    expect(await blockchain.height).toBe(0)
    await setBlock(blockchain, genesis, genesisConsensus)
    expect(await blockchain.height).toBe(1)

    const restoreChain = new Blockchain(store, genesis)
    await restoreChain.ready()
    expect(await restoreChain.height).toBe(1)
  })
  it('throw if stored other chain', async () => {
    const otherGenesis = Block.construct(1, 100, Hash.fromData('foobar'), Hash.fromData('state'),
      new TransactionList([]), new Consensus([]), validatorSet)
    const store = new BlockStore(new InMemoryStore())
    const otherChain = new Blockchain(store, otherGenesis)
    await otherChain.ready()
    await setBlock(otherChain, otherGenesis, new Consensus([signer.sign(otherGenesis.hash)]))
    const blockchain = new Blockchain(store, genesis)
    await expect(blockchain.ready()).rejects.toThrow()
  })
  describe('accessor', () => {
    let blockchain: Blockchain
    let block2: Block
    let consensus2: Consensus
    beforeAll(async () => {
      blockchain = new Blockchain(new BlockStore(new InMemoryStore()), genesis)
      await blockchain.ready()
      await setBlock(blockchain, genesis, genesisConsensus)

      const nextValidatorSet = new ValidatorSet([ new Validator(signer.address, 200) ])
      block2 = Block.construct(2, 110, genesis.hash, Hash.fromData('state'), new TransactionList([]), genesisConsensus, nextValidatorSet)
      consensus2 = new Consensus([signer.sign(block2.hash)])
      await setBlock(blockchain, block2, consensus2)
    })
    it('can get chain height', async () => {
      expect(await blockchain.height).toBe(2)
    })
    it('can get header of height', async () => {
      expect(await blockchain.headerOf(1)).toEqual(genesis.header)
      expect(await blockchain.headerOf(2)).toEqual(block2.header)
      await expect(blockchain.headerOf(3)).rejects.toThrow()
    })
    it('can get body of height', async () => {
      expect(await blockchain.bodyOf(1)).toEqual(genesis.body)
      expect(await blockchain.bodyOf(2)).toEqual(block2.body)
      await expect(blockchain.bodyOf(3)).rejects.toThrow()
    })
    it('can get hash of height', async () => {
      expect(await blockchain.hashOf(1)).toEqual(genesis.hash)
      expect(await blockchain.hashOf(2)).toEqual(block2.hash)
      await expect(blockchain.hashOf(3)).rejects.toThrow()
    })
    it('can get block of height', async () => {
      expect(await blockchain.blockOf(1)).toEqual(genesis)
      expect(await blockchain.blockOf(2)).toEqual(block2)
      await expect(blockchain.blockOf(3)).rejects.toThrow()
    })
    it('can get validator set of height', async () => {
      expect(await blockchain.validatorSetOf(1)).toEqual(genesis.body.nextValidatorSet)
      expect(await blockchain.validatorSetOf(2)).toEqual(genesis.body.nextValidatorSet)
      expect(await blockchain.validatorSetOf(3)).toEqual(block2.body.nextValidatorSet)
      await expect(blockchain.validatorSetOf(4)).rejects.toThrow()
    })
    it('can get consensus of height', async () => {
      expect(await blockchain.consensusOf(1)).toEqual(genesisConsensus)
      expect(await blockchain.consensusOf(2)).toEqual(consensus2)
      await expect(blockchain.consensusOf(3)).rejects.toThrow()
    })
  })
})
