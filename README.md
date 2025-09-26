# jschain-basic — POSA (Proof‑of‑Stake Authority) Upgrade

This patch converts the current single-node demo chain into a **PoSA-style** chain (à la BSC) with:

* A **validator set** (authorized addresses) with staked amounts
* **Round‑robin block proposing** per height (weighted by stake optional)
* **Block signatures** by the proposer (no PoW)
* **Tx fees** and **block rewards** distribution to the proposer
* Simple **staking / un-staking**, **slashing**, and **epoch** rotation hooks
* Persistent **mempool** (already present), **state**, and **validator set** on disk

> Scope: educational, single‑process, single‑node demo. *Networking, finality gadgets, and full BFT voting (e.g., Tendermint/HotStuff) are out of scope*.


## README.md (How to Run)

````md
# jschain-basic (PoSA demo)

A minimal single-process **Proof-of-Stake Authority** chain for education/testing. It has:
- Authorized **validators** with stake
- Deterministic **round-robin** block proposing (no PoW)
- **Signed blocks**, **tx fees**, simple **staking/unstaking**, and **slashing**

> ⚠️ No p2p networking or BFT voting — not production ready.

## Install

```bash
npm i
````

## Initialize chain

```bash
node cli.js init
```

This creates `data/chain.json`, `data/state.json`, `data/mempool.json`, `data/validators.json`.

## Create wallets

```bash
node cli.js new-wallet
# Copy Private Key (0x...) and Address (0x...)
```

Fund an address (dev faucet):

```bash
node cli.js faucet --to 0xYOURADDR --amount 100000
```

## Become a validator (stake)

```bash
# Stake from your account balance (moves coins from balance to staked)
node cli.js stake --address 0xYOURADDR --amount 50000

# (optional) See validator set
node cli.js validators
```

## Send a transaction

```bash
node cli.js send \
  --from-priv 0xSENDER_PRIV \
  --to 0xRECEIVER_ADDR \
  --value 25
```

Each tx pays a flat fee of `1` that goes to the block proposer.

## Propose blocks (PoSA)

Find your turn: the expected proposer for height **h = head.number + 1** is picked **round‑robin** from active validators.

```bash
# Propose the next block using your validator address + privkey
node cli.js propose \
  --proposer 0xYOURADDR \
  --priv 0xYOUR_PRIV
```

If it’s not your turn, the command throws `Not your turn to propose this block`.

Repeat `propose` to include queued mempool txs. Verify:

```bash
node cli.js head
node cli.js blocks
node cli.js balance --address 0xRECEIVER_ADDR
```

## Unstake / Deactivate / Slash

```bash
# return stake back to balance
node cli.js unstake --address 0xYOURADDR --amount 10000

# deactivate or reactivate (admin / demo)
node cli.js set-validator --address 0xADDR --active=false

# slash (admin / demo)
node cli.js slash --address 0xADDR --amount 500
```

## Files

* `data/state.json` — account balances & nonces
* `data/mempool.json` — pending transactions
* `data/validators.json` — validator set & stake
* `data/chain.json` — block history

## Notes

* Block reward is `0` by default; only tx fees are paid to proposers.
* Replace round‑robin with a stake‑weighted schedule if desired.
* This is a teaching scaffold; add networking and BFT voting for real consensus.

```

---

## 3) Why the old code wasn’t PoSA
- **Mining** was called `mineBlock` and accepted any `miner` string without schedule/authority checks; effectively anyone could “mine” a block locally, i.e., not PoS/PoA (
see `mineBlock` flow).
- **No validator set / stake** — there was no list of authorized proposers or staking logic.
- **No block signature** — blocks weren’t signed by a validator key.

The upgrade above adds these PoSA essentials while keeping your existing tx format, mempool persistence, and storage layout.

## 4) Next steps (optional)
- Add **epoch‑based validator rotation** (top‑N by stake each epoch)
- Persist **pubkeys** for validators and attach `proposerPub` to each block
- Add **double‑sign detection** and automatic slashing
- Implement **gas** and per‑op costs instead of flat tx fee
- Network & BFT voting (e.g., simple 2/3 precommit) for multi‑node testing
```



contohnya sample sudah running 
```
node cli.js init
Genesis initialized.

Lenovo@DESKTOP-6TK7HGO MINGW64 /d/projects/jschain-basic
$ node cli.js new-wallet
Private Key: 0xf333dfcd1b90ab346c29cd06cc9c52382a6405ebe920dda10ea4fee425543c90
Address   : 0xcaebc73af1c0888ec21a2039ad10efa0037b17d7

Lenovo@DESKTOP-6TK7HGO MINGW64 /d/projects/jschain-basic
$ node cli.js new-wallet
Private Key: 0x0a5b79704de862b573f81edfe858af449e83659dfc21d3949b01bed7be15b38b
Address   : 0x99ab3c99aa70dc1f1a5716f65b5391a0dbe4c33f

Lenovo@DESKTOP-6TK7HGO MINGW64 /d/projects/jschain-basic
$ node cli.js faucet --to 0xcaebc73af1c0888ec21a2039ad10efa0037b17d7 --amount 100000
Faucet done.

Lenovo@DESKTOP-6TK7HGO MINGW64 /d/projects/jschain-basic
$ node cli.js stake --address 0xcaebc73af1c0888ec21a2039ad10efa0037b17d7 --amount 50000
Staked.

Lenovo@DESKTOP-6TK7HGO MINGW64 /d/projects/jschain-basic
$ node cli.js validators
{
  "validators": [
    {
      "address": "0xcaebc73af1c0888ec21a2039ad10efa0037b17d7",
      "stake": "50000",
      "active": true,
      "pub": null
    }
  ]
}

Lenovo@DESKTOP-6TK7HGO MINGW64 /d/projects/jschain-basic
$ node cli.js send --from-priv 0xf333dfcd1b90ab346c29cd06cc9c52382a6405ebe920dda10ea4fee425543c90 --to 0x99ab3c99aa70dc1f1a5716f65b5391a0dbe4c33f --value 25
Tx queued (mempool). Hash: 0x91faea4cf035ea53656d024586451d6e324a25b093c2d4466d061813d8698443

Lenovo@DESKTOP-6TK7HGO MINGW64 /d/projects/jschain-basic
$ node cli.js propose --proposer 0xcaebc73af1c0888ec21a2039ad10efa0037b17d7 --priv 0xf333dfcd1b90ab346c29cd06c
c9c52382a6405ebe920dda10ea4fee425543c90
New block proposed: 1 0x3854da0aea512cff77d4f6f24a8c078a6fe2b9e4b39a05b1a5fee7543fddd2a4

Lenovo@DESKTOP-6TK7HGO MINGW64 /d/projects/jschain-basic
$ node cli.js head 
{
  "header": {
    "parentHash": "0xce8ea3072446a3f2ba69b1e5ce3d92d3a53b31fd11bff6a4f23c7a9b88e1a2b7",
    "number": 1,
    "timestamp": 1758527466400,
    "miner": "0xcaebc73af1c0888ec21a2039ad10efa0037b17d7",
    "proposerAddr": "0xcaebc73af1c0888ec21a2039ad10efa0037b17d7",
    "proposerPub": null,
    "sig": "0x",
    "txRoot": "0xc3fdf089275b64ecf55eb3cbcdd8a6d4be9263bac4d3e1241e337b376c34dcc5",
    "stateRoot": "0xcaef5703c2b4e0089d239f3003a1f925a459e740efb6af06e2aaff6817a53ebc"
  },
  "txs": [
    {
      "nonce": 0,
      "to": "0x99ab3c99aa70dc1f1a5716f65b5391a0dbe4c33f",
      "value": "25",
      "data": "0x",
      "chainId": 1337,
      "v": 27,
      "r": "0x78b1d1fef1bcb248d95b6003cfdeac39787beaf7e0e8596d0a00284411b22ab0",
      "s": "0x127314fb7c0c2cba8bd3de3bb11d04bbc9cccb7210633870358db49b1d193b48",
      "from": "0xcaebc73af1c0888ec21a2039ad10efa0037b17d7",
      "hash": "0x91faea4cf035ea53656d024586451d6e324a25b093c2d4466d061813d8698443",
      "pub": "0x0467c3c0c74e516684ee3443ea0735308887c20c56b06f2f56936a8af5774bdf49e509e27922e9a1423328f010b472
a566c8d84a9441673be9ae418ee5865cc4d6"
    }
  ],
  "hash": "0x3854da0aea512cff77d4f6f24a8c078a6fe2b9e4b39a05b1a5fee7543fddd2a4"
}

Lenovo@DESKTOP-6TK7HGO MINGW64 /d/projects/jschain-basic
$ node cli.js blocks
#0 0xce8ea3072446a3f2ba69b1e5ce3d92d3a53b31fd11bff6a4f23c7a9b88e1a2b7 txs=0 time=2025-09-22T07:46:39.184Z     
#1 0x3854da0aea512cff77d4f6f24a8c078a6fe2b9e4b39a05b1a5fee7543fddd2a4 txs=1 time=2025-09-22T07:51:06.400Z     

Lenovo@DESKTOP-6TK7HGO MINGW64 /d/projects/jschain-basic
$ node cli.js balance --address 0x99ab3c99aa70dc1f1a5716f65b5391a0dbe4c33f
Balance: 25
```


## Milestone 1 notes
- Optional `genesis.alloc.json` to pre-fund accounts at genesis.
- Fees: flat TX fee goes to Treasury by default (configurable split via `FEE_TREASURY_BPS`).
- Faucet is **disabled** by default unless `DEV_FAUCET=true` in `.env.local`.
- `GET /chainId` returns decimal & hex for clients. For EVM JSON-RPC, implement `eth_chainId` later (Milestone 5).
