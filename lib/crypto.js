// lib/crypto.js
import { randomBytes } from 'crypto'
import * as secp from '@noble/secp256k1'
import { keccak256 } from 'ethereum-cryptography/keccak'
import { hexToBytes, bytesToHex } from 'ethereum-cryptography/utils.js'
import './noble-register.js'
import { CHAIN_ID } from './config.js'

export function randomPrivKey() {
  let pk
  do { pk = randomBytes(32) } while (pk[0] === 0)
  return pk
}
export function newPriv() {
  const randPriv = randomPrivKey();
  const h= '0x' + Buffer.from(randPriv).toString('hex')
  return {privHex :h, priv: randPriv}
}

export function addressFromPriv(privBuf) {
  const pub = secp.getPublicKey(privBuf, false) // uncompressed
  const hash = keccak256(Buffer.from(pub.slice(1)))
  return '0x' + Buffer.from(hash.slice(-20)).toString('hex')
}

export function recoverAddress(msgHash, sig) {
  // sig: 65 bytes [r(32), s(32), v(1)]
  const r = sig.slice(0, 32)
  const s = sig.slice(32, 64)
  let v = sig[64]
  // Accept both EIP-155 and raw v
  if (v >= 27) v = v - 27
  const pub = secp.recoverPublicKey(msgHash, Buffer.concat([r, s]), v)
  const hash = keccak256(Buffer.from(pub.slice(1)))
  return '0x' + Buffer.from(hash.slice(-20)).toString('hex')
}

export function signHash(hash, privBuf, chainId = CHAIN_ID) {
  const [sig, recid] = secp.signSync(hash, privBuf, { recovered: true, der: false })
  // EIP-155 style v
  const v = 27 + recid + (chainId ? (chainId * 2 + 8) : 0)
  return Buffer.concat([Buffer.from(sig), Buffer.from([v])])
}

export function txHashForSigning(tx) {
  // EIP-155 like: hash of minimal fields
  const data = JSON.stringify({
    chainId: tx.chainId ?? CHAIN_ID,
    from: tx.from?.toLowerCase(),
    to: (tx.to || '').toLowerCase(),
    nonce: Number(tx.nonce || 0),
    value: String(tx.value || 0),
    gasLimit: String(tx.gasLimit || 0),
    gasPrice: String(tx.gasPrice || 0),
    data: tx.data ? bytesToHex(tx.data) : '',
    type: tx.type || 'legacy'
  })
  return keccak256(Buffer.from(data))
}

export function keccakHex(buf) {
  const h = keccak256(buf)
  return '0x' + Buffer.from(h).toString('hex')
}

// --- Back-compat helpers expected by tx.js ---
export function unhex(hex) {
  return Buffer.from(hex.replace(/^0x/i, ''), 'hex')
}
export function pubKeyFromPriv(privKey) {
  const buf = privKey instanceof Uint8Array ? Buffer.from(privKey) : Buffer.from(privKey)
  return Buffer.from(secp.getPublicKey(buf, false)) // 65 bytes, uncompressed
}
export function addressFromPub(pub) {
  const hash = keccak256(Buffer.from(pub.slice(1)))
  return '0x' + Buffer.from(hash.slice(-20)).toString('hex')
}
export async function signMsgHash(hash32, privKey) {
  // JANGAN kirim opsi apapun; beberapa versi noble tidak mendukung
  let sig = await secp.signAsync(hash32, privKey); // bisa berupa Uint8Array / hex / Signature

  // --- Normalisasi ke Uint8Array(64) ---
  if (typeof sig === 'string') {
    sig = Buffer.from(sig.replace(/^0x/, ''), 'hex');
  } else if (!(sig instanceof Uint8Array)) {
    // kemungkinan Signature object
    if (sig && typeof sig.toRawBytes === 'function') {
      sig = sig.toRawBytes();                 // 64 bytes (R||S)
    } else if (sig && typeof sig.toCompactRawBytes === 'function') {
      sig = sig.toCompactRawBytes();          // 64 bytes
    } else if (sig && typeof sig.toCompactHex === 'function') {
      sig = Buffer.from(sig.toCompactHex().replace(/^0x/, ''), 'hex');
    } else {
      throw new Error('Unsupported signature type from noble.signAsync');
    }
  }

  // pastikan benar-benar Uint8Array
  if (!(sig instanceof Uint8Array)) sig = new Uint8Array(sig);

  // kita tidak pakai recid lagi (recovery dihapus), kembalikan dummy 0
  return [sig, 0];
}