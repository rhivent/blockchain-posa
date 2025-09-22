// lib/crypto.js
import { randomBytes } from 'crypto'
import { keccak256 } from 'ethereum-cryptography/keccak.js'
import { bytesToHex, hexToBytes } from 'ethereum-cryptography/utils.js'

import * as noble from '@noble/secp256k1'
import { hmac } from '@noble/hashes/hmac'
import { sha256 } from '@noble/hashes/sha2'

// Pasang HMAC untuk Noble
const hmacSync  = (key, ...msgs) => hmac(sha256, key, noble.utils.concatBytes(...msgs))
const hmacAsync = async (key, ...msgs) => hmac(sha256, key, noble.utils.concatBytes(...msgs))
noble.utils.hmacSha256Sync  = hmacSync
noble.utils.hmacSha256Async = hmacAsync

// ========== Keys & Addresses ==========
export function randomPrivKey() {
  let pk
  do { pk = randomBytes(32) } while (pk[0] === 0)
  return pk
}

export function pubKeyFromPriv(priv) {
  // uncompressed public key (65 bytes): 0x04 + X(32) + Y(32)
  return noble.getPublicKey(priv, false)
}

export function addressFromPub(pub) {
  // Ethereum-style: keccak256(pubkey[1:]) -> last 20 bytes
  const h = keccak256(pub.slice(1))
  return '0x' + Buffer.from(h.slice(-20)).toString('hex')
}

export function addressFromPriv(priv) {
  return addressFromPub(pubKeyFromPriv(priv))
}

// ========== Signing ==========
export async function signMsgHash(hash32, privKey) {
  // JANGAN kirim opsi apapun; beberapa versi noble tidak mendukung
  let sig = await noble.signAsync(hash32, privKey); // bisa berupa Uint8Array / hex / Signature

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

// ========== Utils ==========
export function hexlify(u8) { return '0x' + bytesToHex(u8) }
export function unhex(s) {
  if (s.startsWith('0x')) s = s.slice(2)
  return hexToBytes(s)
}
