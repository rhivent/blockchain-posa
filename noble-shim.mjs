import * as noble from '@noble/secp256k1'
import { hmac } from '@noble/hashes/hmac'
import { sha256 } from '@noble/hashes/sha2'

// Pasang HMAC untuk Noble
const hmacSync  = (key, ...msgs) => hmac(sha256, key, noble.utils.concatBytes(...msgs))
const hmacAsync = async (key, ...msgs) => hmac(sha256, key, noble.utils.concatBytes(...msgs))
noble.utils.hmacSha256Sync  = hmacSync
noble.utils.hmacSha256Async = hmacAsync
