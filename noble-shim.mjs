import * as noble from '@noble/secp256k1'
import { hmac } from '@noble/hashes/hmac'
import { sha256 } from '@noble/hashes/sha2'

const sync  = (key, ...msgs) => hmac(sha256, key, noble.utils.concatBytes(...msgs))
const asyncH = async (key, ...msgs) => hmac(sha256, key, noble.utils.concatBytes(...msgs))

noble.utils.hmacSha256Sync = sync
noble.utils.hmacSha256Async = asyncH
noble.hashes = noble.hashes || {}
noble.hashes.hmacSha256Sync = sync
noble.hashes.hmacSha256Async = asyncH
