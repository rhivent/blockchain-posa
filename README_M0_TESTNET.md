# Milestone 0 Patch — PoSA foundation hardening (2025‑09‑23)

This patch keeps your original consensus code and adjusts only what’s needed for **real-case testnet** runs:

## What changed
- `lib/consensus/posa.js`
  - `expectedProposer(height)` now picks **validator index 0** at **height 1** (node0 starts), then round‑robin.
- **Added** a minimal HTTP node:
  - `server/node_server.js` (no Express dependency; Node’s `http` only)
  - Endpoints: `/health`, `/init`, `/head`, `/validators` (GET), `/validators/set` (POST), `/faucet` (POST), `/tx` (POST), `/propose` (POST)
- **Added** production‑like testnet harness:
  - `scripts/testnet.js` spawns N nodes into `.localnet/node{0..N-1}` with different CWDs so each node has its own `data/` folder (as your `store.js` expects). It then initializes genesis and sets validator set from the spawned nodes’ addresses. Finally it proposes a few blocks with node0 as the first proposer.
- No other files were touched.

## Quick start
```bash
# from project root
node scripts/testnet.js

# with environment
CLEAN=1 BASE_PORT=4001 node scripts/testnet.js
```
By default it spawns 3 nodes on ports 4000..4002 with dummy private keys (for local only).  
You can override:
```bash
N=3 BASE_PORT=5000 PRIVS=0x<priv0>,0x<priv1>,0x<priv2> node scripts/testnet.js
```

## Notes
- Your `store.js` writes into `./data/`, so we isolate nodes by changing **working directory** per process (`.localnet/nodeX`).
- Block proposing uses your existing `proposeBlock(proposerAddr, proposerPrivHex)` flow, fee policy (`TX_FEE_FLAT = 1n`) and `applyTxFeeAndReward` untouched.
- If you later want multi‑signature commit (quorum), we can extend the server with a `/sign` & `/commit` flow without altering your current PoSA base.

If anything doesn’t match your earlier “Merapikan fondasi PoSA” expectations, point me to the exact steps and I’ll tailor this harness to them without replacing your core modules.