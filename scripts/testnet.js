// scripts/testnet.js (robust single-proposer run)
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { addressFromPriv } from '../lib/crypto.js';
import fsAsync from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LOCAL = path.join(ROOT, '.localnet');

const CLEAN = process.env.CLEAN === '1';
if (CLEAN) {
  try { fs.rmSync(LOCAL, { recursive: true, force: true }); } catch {}
}

const N = Number(process.env.N || 3);
const BASE_PORT = Number(process.env.BASE_PORT || 4000);

// Dummy local-only privs if not provided
const PRIVS = (process.env.PRIVS || '').split(',').map(s => s.trim()).filter(Boolean);
function dummyPriv(i) { const hex = (i+1).toString(16).padStart(2,'0').repeat(32); return '0x' + hex; }
const privs = PRIVS.length >= N ? PRIVS.slice(0,N) : Array.from({length:N}, (_,i)=>dummyPriv(i));

// Prepare node dirs and metadata
fs.mkdirSync(LOCAL, { recursive: true });
const nodes = [];
for (let i=0;i<N;i++) {
  const dir = path.join(LOCAL, `node${i}`);
  fs.mkdirSync(dir, { recursive: true });
  const priv = privs[i];
  const addr = addressFromPriv(Buffer.from(priv.slice(2), 'hex')).toLowerCase();
  nodes.push({ dir, port: BASE_PORT + i, priv, addr });
}

const validators = nodes.map(n => ({ address: n.addr, active: true, stake: '0' }));

function spawnNode(i) {
  const n = nodes[i];
  const env = { ...process.env, NODE_PORT: String(n.port) };
  const child = spawn(process.execPath, [path.join(ROOT, 'server', 'node_server.js')], {
    cwd: n.dir, env, stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', d => process.stdout.write(`[node${i}] ${d}`));
  child.stderr.on('data', d => process.stderr.write(`[node${i}] ERR ${d}`));
  return child;
}

const f = (...args) => fetch(...args);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function waitHealthy(base, tries=40, delay=200) {
  for (let t=0;t<tries;t++) {
    try { const r = await f(`${base}/health`); if (r.ok) return true; } catch {}
    await sleep(delay);
  }
  return false;
}
async function syncFromTo(srcNode, dstNode) {
  const files = ['chain.json', 'state.json', 'mempool.json', 'validators.json'];
  for (const f of files) {
    try {
      await fsAsync.copyFile(
        path.join(srcNode.dir, 'data', f),
        path.join(dstNode.dir, 'data', f)
      );
    } catch {}
  }
}

async function postJSON(base, path, body) {
  const r = await f(`${base}${path}`, {
    method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body||{})
  });
  const j = await r.json().catch(()=>({}));
  return { status: r.status, ok: r.ok && j.ok !== false, json: j };
}

async function getJSON(base, path) {
  const r = await f(`${base}${path}`);
  const j = await r.json().catch(()=>({}));
  return { status: r.status, ok: r.ok && j.ok !== false, json: j };
}

(async () => {
  const children = nodes.map((_,i)=>spawnNode(i));
  // Wait healthy & init + set validators
  for (const n of nodes) {
    const base = `http://127.0.0.1:${n.port}`;
    const ok = await waitHealthy(base);
    if (!ok) { console.error(`Node at ${base} not healthy`); process.exit(1); }
    await postJSON(base, '/init');
    await postJSON(base, '/validators/set', { validators });
    const vv = await getJSON(base, '/validators');
    console.log(`validators@${n.port}`, vv.json.validators?.length, 'first=', vv.json.validators?.[0]?.address);
  }

  // Sanity: show head numbers
  for (const n of nodes) {
    const base = `http://127.0.0.1:${n.port}`;
    const head = await getJSON(base, '/head');
    console.log(`head@${n.port}`, head.json.number, head.json.hash);
  }

  for (let h = 1; h <= 3; h++) {
    const proposerIndex = (h - 1) % nodes.length;   // 1→0, 2→1, 3→2
    const n = nodes[proposerIndex];
    const base = `http://127.0.0.1:${n.port}`;
    const r = await postJSON(base, '/propose', { proposerPrivHex: n.priv });
    console.log('propose result', r.ok, 'status=', r.status, 'height=', r.json?.block?.header?.number, 'error=', r.json?.error);

    if (!r.ok) break; // stop kalau fail biar ketahuan penyebabnya

    // === sinkronkan chain & state ke node lain ===
    await Promise.all(
      nodes.map((m, idx) => idx === proposerIndex ? Promise.resolve() : syncFromTo(n, m))
    );
  }

  console.log('testnet run completed. kill nodes.');
  for (const c of children) c.kill();
})();