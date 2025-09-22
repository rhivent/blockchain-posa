
import { keccak256 } from 'ethereum-cryptography/keccak.js'

export function buildBlock(prevHash, number, miner, txs, stateRoot) {
  const header = {
    parentHash: prevHash || '0x' + '00'.repeat(32),
    number,
    timestamp: Date.now(),
    miner,                  // kept for continuity (alias of proposerAddr)
    proposerAddr: miner,
    proposerPub: null,      // hex string set by chain during propose
    sig: null,              // hex signature set by chain during propose
    txRoot: merkleLikeRoot(txs.map(t => t.hash)),
    stateRoot
  }
  const hash = blockHash(header, txs)
  return { header, txs, hash }
 }

export function blockHash(header, txs) {
  const enc = JSON.stringify({ header, txs })
  const h = keccak256(Buffer.from(enc))
  return '0x' + Buffer.from(h).toString('hex')
}

export function merkleLikeRoot(items) {
  // not a real merkle; just keccak of concatenation for demo
  const buf = Buffer.from(items.join(''), 'utf-8')
  const h = keccak256(buf)
  return '0x' + Buffer.from(h).toString('hex')
}
