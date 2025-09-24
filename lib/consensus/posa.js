import { getValidators, putValidators, getState, putState } from '../store.js'
import { keccak256 } from 'ethereum-cryptography/keccak.js'
import * as noble from '@noble/secp256k1'

// --- Params (tweakable)
export const BLOCK_REWARD = 0n;      // PoSA typically low/0 inflation; keep 0 for demo
export const TX_FEE_FLAT = 1n;       // flat fee per tx for simplicity
export const EPOCH_LENGTH = 200;     // blocks per epoch (just for rotation hooks)

export async function getValidatorSet() {
  const vs = await getValidators();
  return vs.validators || [];
}

export async function setValidatorSet(validators) {
  await putValidators({ validators });
}

export async function ensureValidator(addr) {
  addr = addr.toLowerCase();
  const vs = await getValidatorSet();
  return vs.find(v => v.address === addr && v.active === true) || null;
}

// Simple deterministic round-robin by height
export async function expectedProposer(height) {
  const vs = await getValidatorSet();
  const active = vs.filter(v => v.active);
  if (active.length === 0) return null;
  const h = BigInt(height);
  const idx = Number((h - 1n) % BigInt(active.length));
  return active[idx];
}

// Optional: stake‑weighted schedule (commented out)
// export async function expectedProposer(height) {
//   const vs = await getValidatorSet();
//   const active = vs.filter(v => v.active);
//   if (active.length === 0) return null;
//   const h = BigInt(height);
//   const idx = Number((h - 1n) % BigInt(active.length));
//   return active[idx];
// }

export async function signBlockHash(blockHashBytes, privKeyBytes) {
  const sig = await noble.signAsync(blockHashBytes, privKeyBytes);
  return sig instanceof Uint8Array ? sig : new Uint8Array(sig);
}

export function verifyBlockSig(blockHashBytes, sigBytes, pubOrAddress) {
  // If pubkey provided, verify directly; if address, skip (demo keeps pub in header)
  return noble.verify(sigBytes, blockHashBytes, pubOrAddress);
}

export async function applyTxFeeAndReward(state, proposerAddr, txCount) {
  proposerAddr = proposerAddr.toLowerCase();
  const st = JSON.parse(JSON.stringify(state));
  const prop = st.accounts[proposerAddr] || { balance: '0', nonce: 0 };
  const feeTotal = TX_FEE_FLAT * BigInt(txCount);
  const reward = BLOCK_REWARD + feeTotal;
  prop.balance = (BigInt(prop.balance) + reward).toString();
  st.accounts[proposerAddr] = prop;
  return st;
}

export async function stake(addr, amount) {
  addr = addr.toLowerCase();
  amount = BigInt(amount);
  const st = await getState();
  const acc = st.accounts[addr] || { balance: '0', nonce: 0 };
  if (BigInt(acc.balance) < amount) throw new Error('Insufficient balance to stake');
  acc.balance = (BigInt(acc.balance) - amount).toString();
  st.accounts[addr] = acc;
  await putState(st);

  const vs = await getValidatorSet();
  let v = vs.find(x => x.address === addr);
  if (!v) { v = { address: addr, stake: '0', active: true, pub: null }; vs.push(v); }
  v.stake = (BigInt(v.stake || '0') + amount).toString();
  v.active = true;
  await setValidatorSet(vs);
}

export async function unstake(addr, amount) {
  addr = addr.toLowerCase();
  amount = BigInt(amount);
  const vs = await getValidatorSet();
  const v = vs.find(x => x.address === addr);
  if (!v) throw new Error('Not a validator');
  if (BigInt(v.stake || '0') < amount) throw new Error('Insufficient staked');
  v.stake = (BigInt(v.stake) - amount).toString();
  await setValidatorSet(vs);

  const st = await getState();
  const acc = st.accounts[addr] || { balance: '0', nonce: 0 };
  acc.balance = (BigInt(acc.balance) + amount).toString();
  st.accounts[addr] = acc;
  await putState(st);
}

export async function toggleValidator(addr, active) {
  addr = addr.toLowerCase();
  const vs = await getValidatorSet();
  const v = vs.find(x => x.address === addr);
  if (!v) throw new Error('Not found');
  v.active = !!active;
  await setValidatorSet(vs);
}

export async function slash(addr, amount) {
  addr = addr.toLowerCase();
  amount = BigInt(amount);
  const vs = await getValidatorSet();
  const v = vs.find(x => x.address === addr);
  if (!v) throw new Error('Not a validator');
  v.stake = (BigInt(v.stake || '0') - amount < 0n) ? '0' : (BigInt(v.stake || '0') - amount).toString();
  await setValidatorSet(vs);
}