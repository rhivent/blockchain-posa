// server/node_server.js
import http from 'http';
import url from 'url';

import { initGenesis, proposeBlock } from '../lib/chain.js';
import { ENABLE_RPC_WRITE, RPC_RATE_LIMIT_QPS, ALLOW_ORIGINS, CHAIN_ID } from '../lib/config.js'

// basic token bucket per IP
const buckets = new Map();
function allow(ip) {
  const cap = RPC_RATE_LIMIT_QPS;
  const now = Date.now();
  const refill = cap / 1000;
  let b = buckets.get(ip) || { tokens: cap, last: now };
  const elapsed = now - b.last;
  b.tokens = Math.min(cap, b.tokens + elapsed * refill);
  b.last = now;
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  buckets.set(ip, b);
  return true;
}

import { newWallet, getBalance } from '../lib/util.js';
import { getChain, getMempool, putMempool, getState, putState, getValidators, putValidators } from '../lib/store.js';
import { addressFromPriv } from '../lib/crypto.js';

const PORT = Number(process.env.NODE_PORT || 4000);

function send(res, code, data) {
  const body = JSON.stringify(data);
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(body);
}

async function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => raw += chunk);
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOW_ORIGINS);
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
  const ip = (req.socket.remoteAddress || 'unknown');
  if (!allow(ip)) { send(res, 429, { ok:false, error:'rate limited' }); return; }
  const parsedUrl = url.parse(req.url, true);  // ⬅️ this parses query string too
  const { pathname, query } = parsedUrl;
  try {
    if (req.method === 'GET' && pathname === '/health') {
      return send(res, 200, { ok: true });
    }
    if (req.method === 'GET' && pathname === '/chainId') {
      const hex = '0x' + Number(CHAIN_ID).toString(16);
      return send(res, 200, { chainId: CHAIN_ID, chainIdHex: hex });
      return send(res, 200, { ok: true });
    }
    if (req.method === 'POST' && pathname === '/init') {
      await initGenesis();
      return send(res, 200, { ok: true });
    }
    if (req.method === 'POST' && pathname === '/create-wallet') {
      const w = await newWallet();
      return send(res, 200, { ok: true, ...w });
    }
    if (req.method === 'GET' && pathname === '/balance') {
      if(!query?.address) return send(res, 400, { ok:false, error:'query params address required !'});
      const bal = await getBalance(query.address);
      return send(res, 200, { ok: true, balance: bal.toString() });
    }
    if (req.method === 'GET' && pathname === '/head') {
      const chain = await getChain();
      const head = chain.blocks[chain.blocks.length - 1] || null;
      return send(res, 200, { ok: true, number: head?.header?.number ?? 0, hash: head?.hash || null, head });
    }
    if (req.method === 'GET' && pathname === '/validators') {
      const v = await getValidators();
      return send(res, 200, { ok: true, ...v });
    }
    if (req.method === 'POST' && pathname === '/validators/set') {
      const body = await readJson(req);
      // expect { validators: [{address, active:true, stake:"0"}] }
      const { validators } = body || {};
      if (!Array.isArray(validators)) return send(res, 400, { ok:false, error:'validators must be array'});
      await putValidators({ validators });
      return send(res, 200, { ok: true });
    }
    if (req.method === 'POST' && pathname === '/faucet') {
      const { to, amount } = await readJson(req);
      if (!to || amount == null) return send(res, 400, { ok:false, error:'to & amount required'});
      const st = await getState();
      const acct = st.accounts[to.toLowerCase()] || { balance: '0', nonce: 0 };
      acct.balance = (BigInt(acct.balance) + BigInt(amount)).toString();
      st.accounts[to.toLowerCase()] = acct;
      await putState(st);
      return send(res, 200, { ok: true });
    }
    if (req.method === 'POST' && pathname === '/tx') {
      const { tx } = await readJson(req);
      if (!tx) return send(res, 400, { ok:false, error:'tx required'});
      const mp = await getMempool();
      mp.txs.push(tx);
      await putMempool(mp);
      return send(res, 200, { ok: true });
    }
    if (req.method === 'POST' && pathname === '/propose') {
      if (!ENABLE_RPC_WRITE) return send(res, 403, { ok:false, error:'write disabled' });
      const { proposerPrivHex } = await readJson(req);
      if (!proposerPrivHex) return send(res, 400, { ok:false, error:'proposerPrivHex required'});
      const proposerAddr = addressFromPriv(Buffer.from(proposerPrivHex.replace(/^0x/i, ''), 'hex'));
      const block = await proposeBlock(proposerAddr, proposerPrivHex);
      return send(res, 200, { ok: true, block });
    }
    return send(res, 404, { ok: false, error: 'Not found'});
  } catch (e) {
    return send(res, 500, { ok:false, error: e?.message || String(e) });
  }
});

server.listen(PORT, () => {
  console.log(`[node] running on port ${PORT}`);
});