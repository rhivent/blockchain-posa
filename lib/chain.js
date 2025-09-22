
import { getChain, putChain, getState, putState, getMempool, putMempool } from './store.js'
import { buildBlock } from './block.js'
import { verifySignedTx } from './tx.js'
import { expectedProposer, signBlockHash, applyTxFeeAndReward, ensureValidator } from './consensus/posa.js'
import { keccak256 } from 'ethereum-cryptography/keccak.js'

 export async function initGenesis() {
   const chain = await getChain()
   if (chain.blocks.length > 0) return chain
   const state = await getState()
   // genesis: bisa tambah pre-funded accounts via faucet setelah init
   const genesisStateRoot = await computeStateRoot(state)
   const genesis = buildBlock(null, 0, '0x0000000000000000000000000000000000000000', [], genesisStateRoot)
   chain.blocks.push(genesis)
   await putChain(chain)
   await putState(state)
   await putMempool({ txs: [] })
   return chain
 }

export async function getHead() {
  const ch = await getChain()
  return ch.blocks[ch.blocks.length - 1] || null
}

export async function listBlocks(limit=10) {
  const ch = await getChain()
  const start = Math.max(0, ch.blocks.length - limit)
  return ch.blocks.slice(start)
}

async function computeStateRoot(state) {
  // demo: hash dari JSON state
  const data = JSON.stringify(state)
  const { keccak256 } = await import('ethereum-cryptography/keccak.js')
  const h = keccak256(Buffer.from(data))
  return '0x' + Buffer.from(h).toString('hex')
}

// privKeyBytes is needed to sign the block; address derived must match expected proposer
export async function proposeBlock(proposerAddr, proposerPrivHex) {
  const chain = await getChain()
  const state = await getState()
  const mp = await getMempool()
  const head = chain.blocks[chain.blocks.length - 1]
  const number = head.header.number + 1

  // --- PoSA: check schedule
  const expected = await expectedProposer(number)
  if (!expected || expected.address !== proposerAddr.toLowerCase()) {
    throw new Error('Not your turn to propose this block')
  }
  const isAuth = await ensureValidator(proposerAddr)
  if (!isAuth) throw new Error('Address is not an active validator')
  // apply txs in mempool in order
  const newState = JSON.parse(JSON.stringify(state))
  const applied = []
  for (const tx of mp.txs) {
    if (!verifySignedTx(tx)) continue
    const from = tx.from.toLowerCase()
    const to = tx.to.toLowerCase()
    const sender = newState.accounts[from] || { balance: '0', nonce: 0 }
    const receiver = newState.accounts[to] || { balance: '0', nonce: 0 }
    const value = BigInt(tx.value)

    // nonce check
    if (tx.nonce !== sender.nonce) continue

    // balance check incl. flat fee
    const need = value + 1n
    if (BigInt(sender.balance) < need) continue

    sender.balance = (BigInt(sender.balance) - need).toString()
    sender.nonce = sender.nonce + 1
    receiver.balance = (BigInt(receiver.balance) + value).toString()

    // TULIS BALIK KE STATE & MASUKKAN KE DAFTAR APPLIED
    newState.accounts[from] = sender
    newState.accounts[to] = receiver
    applied.push(tx)
  }
  // BERSIHKAN MEMPOOL DARI TX YANG SUDAH MASUK BLOK
  mp.txs = mp.txs.filter(t => !applied.find(a => a.hash === t.hash))
  // add proposer fee/reward
  const newStateWithReward = await applyTxFeeAndReward(newState, proposerAddr, applied.length)
  const stateRoot = await computeStateRoot(newStateWithReward)
  let block = buildBlock(head.hash, number, proposerAddr.toLowerCase(), applied, stateRoot)
  // sign block hash
  const hashBytes = keccak256(Buffer.from(JSON.stringify({ header: block.header, txs: block.txs })))
  const priv = Buffer.from(proposerPrivHex.replace(/^0x/, ''), 'hex')
  const sig = await signBlockHash(hashBytes, priv)
  block.header.sig = '0x' + Buffer.from(sig).toString('hex')
  block.header.proposerPub = null // can be filled if you want to ship pub

  chain.blocks.push(block)
  await putChain(chain)
  await putState(newStateWithReward)
  await putMempool(mp)
  return block
}
