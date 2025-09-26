
import { ensureDataDir, readJSON, writeJSON } from './store.js'
import { newPriv as randomPrivKey, addressFromPriv } from './crypto.js'
import { getState, putState, getMempool, putMempool } from './store.js'
import { buildSignedTx, txHash } from './tx.js'
import { keccak256 } from 'ethereum-cryptography/keccak.js'
import { stake as posaStake, unstake as posaUnstake } from './consensus/posa.js'
import { CHAIN_ID, DEV_FAUCET } from './config.js'

export async function newWallet() {
  await ensureDataDir()
  const {privHex, priv} = randomPrivKey()
  const address = addressFromPriv(priv)
  return { privKeyHex: privHex, address }
}

export async function getBalance(address) {
  const state = await getState()
  const a = state.accounts[address?.toLowerCase()] || { balance: '0', nonce: 0 }
  return BigInt(a.balance)
}

// DEV ONLY: add balance directly
export async function faucet(to, amount) {
  if (!DEV_FAUCET) throw new Error('faucet disabled');
  to = to.toLowerCase()
  const state = await getState()
  const acc = state.accounts[to] || { balance: '0', nonce: 0 }
  acc.balance = (BigInt(acc.balance) + amount).toString()
  state.accounts[to] = acc
  await putState(state)
}

export async function sendTx(fromPrivHex, to, value) {
  const fromPriv = Buffer.from(fromPrivHex.replace(/^0x/, ''), 'hex')
  const from = addressFromPriv(fromPriv).toLowerCase()
  to = to.toLowerCase()
  const state = await getState()
  const nonce = (state.accounts[from]?.nonce) ?? 0
  const tx = {
    nonce,
    to,
    value: value.toString(),
    data: '0x',
    chainId: CHAIN_ID
  }
  const signed = await buildSignedTx(tx, fromPriv)
  // push to mempool
  const mp = await getMempool()
  mp.txs.push(signed)
  await putMempool(mp)
  // // increment local nonce (optimistic)
  // const acc = state.accounts[from] || { balance: '0', nonce: 0 }
  // acc.nonce = nonce + 1
  // state.accounts[from] = acc
  // await putState(state)
  return signed.hash
}
export async function stake(addr, amount) { return posaStake(addr, amount) }
export async function unstake(addr, amount) { return posaUnstake(addr, amount) }