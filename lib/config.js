// lib/config.js
import 'dotenv/config'

export const CHAIN_ID = process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : 777392;
export const TREASURY_ADDR = (process.env.TREASURY_ADDR || '0x0000000000000000000000000000000000000000').toLowerCase();
export const MIN_GAS_PRICE = process.env.MIN_GAS_PRICE ? BigInt(process.env.MIN_GAS_PRICE) : 0n;
export const BLOCK_GAS_LIMIT = process.env.BLOCK_GAS_LIMIT ? BigInt(process.env.BLOCK_GAS_LIMIT) : 5_000_000n;
export const MEMPOOL_MAX_TXS = process.env.MEMPOOL_MAX_TXS ? Number(process.env.MEMPOOL_MAX_TXS) : 10_000;
export const MAX_TX_SIZE_BYTES = process.env.MAX_TX_SIZE_BYTES ? Number(process.env.MAX_TX_SIZE_BYTES) : 64 * 1024;
export const PROPOSER_POLICY = process.env.PROPOSER_POLICY || 'round_robin'; // or 'fixed:0xabc..'
export const PROPOSER_FIXED_ADDR = (process.env.PROPOSER_FIXED_ADDR || '').toLowerCase();
export const QUORUM_THRESHOLD_NUM = process.env.QUORUM_N ? Number(process.env.QUORUM_N) : 2; // validators needed
export const QUORUM_THRESHOLD_DEN = process.env.QUORUM_D ? Number(process.env.QUORUM_D) : 3; // out of
export const ENABLE_RPC_WRITE = (process.env.ENABLE_RPC_WRITE || 'true') === 'true'; // toggle write methods
export const RPC_RATE_LIMIT_QPS = process.env.RPC_RATE_LIMIT_QPS ? Number(process.env.RPC_RATE_LIMIT_QPS) : 20;
export const ALLOW_ORIGINS = (process.env.ALLOW_ORIGINS || '*');
export const TX_EXPIRY_SECONDS = process.env.TX_EXPIRY_SECONDS ? Number(process.env.TX_EXPIRY_SECONDS) : 3600; // 1h

export const DEV_FAUCET = (process.env.DEV_FAUCET || 'false') === 'true';
export const FEE_TREASURY_BPS = process.env.FEE_TREASURY_BPS ? Number(process.env.FEE_TREASURY_BPS) : 10000; // out of 10000
