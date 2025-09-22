// lib/tx.js
import * as rlp from 'rlp'
import { keccak256 } from 'ethereum-cryptography/keccak.js'
import * as noble from '@noble/secp256k1'
import { signMsgHash, unhex, pubKeyFromPriv } from './crypto.js'
import { addressFromPub } from './crypto.js'

export function encodeTxPayload(tx) {
  // payload TANPA signature (tetap sama)
  const arr = [
    toBuf(tx.nonce),
    toBuf(tx.to),
    toBuf(tx.value),
    toBuf(tx.data || '0x'),
    toBuf(tx.chainId || 1)
  ]
  return rlp.encode(arr)
}

export function txHash(tx) {
  const payload = encodeTxPayload(tx)
  return '0x' + Buffer.from(keccak256(payload)).toString('hex')
}

export async function buildSignedTx(tx, privKey) {
  const payload = encodeTxPayload(tx)
  const msgHash = keccak256(payload)

  // sign (tanpa perlu recid)
  const [sig /*, recid */] = await signMsgHash(msgHash, privKey)

  // sertakan PUB KEY dan FROM dari PUB
  const pub = pubKeyFromPriv(privKey) // 65 bytes uncompressed
  const from = addressFromPub(pub).toLowerCase()

  // r/s/v sederhana (v=27 saja, kita tidak pakai recid)
  const r = '0x' + Buffer.from(sig.slice(0,32)).toString('hex')
  const s = '0x' + Buffer.from(sig.slice(32,64)).toString('hex')
  const v = 27

  // hash tx demo
  const hash = '0x' + Buffer.from(keccak256(Buffer.concat([payload, Buffer.from(sig)]))).toString('hex')
  // simpan pub sebagai hex untuk verifikasi
  const pubHex = '0x' + Buffer.from(pub).toString('hex')
  return { ...tx, v, r, s, from, hash, pub: pubHex }
}

export function verifySignedTx(signed) {
  const payload = encodeTxPayload(signed)
  const msgHash = keccak256(payload)

  const sig = Buffer.concat([toBuf(signed.r), toBuf(signed.s)]) // 64 bytes
  const pub = toBuf(signed.pub) // 65 bytes

  // 1) verifikasi ECDSA
  const ok = noble.verify(sig, msgHash, pub)
  if (!ok) return false

  // 2) alamat dari pub harus sama dengan 'from'
  const addr = addressFromPub(pub).toLowerCase()
  return addr === signed.from.toLowerCase()
}

function toBuf(val) {
  if (typeof val === 'number') {
    if (val === 0) return Buffer.alloc(0)
    return Buffer.from(BigInt(val).toString(16).padStart(2,'0'), 'hex')
  }
  if (typeof val === 'bigint') {
    if (val === 0n) return Buffer.alloc(0)
    return Buffer.from(val.toString(16).padStart(2,'0'), 'hex')
  }
  if (typeof val === 'string') {
    if (val.startsWith('0x')) {
      const s = val.slice(2)
      if (s.length === 0) return Buffer.alloc(0)
      return Buffer.from(s, 'hex')
    } else {
      const n = BigInt(val)
      if (n === 0n) return Buffer.alloc(0)
      return Buffer.from(n.toString(16).padStart(2,'0'), 'hex')
    }
  }
  if (val == null) return Buffer.alloc(0)
  if (val instanceof Uint8Array) return Buffer.from(val)
  throw new Error('Unsupported toBuf type')
}
