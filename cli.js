
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { initGenesis, getHead, listBlocks, proposeBlock } from './lib/chain.js'
import { newWallet, getBalance, faucet, sendTx, stake, unstake } from './lib/util.js'
import { getValidators, putValidators } from './lib/store.js'
import { toggleValidator, slash } from './lib/consensus/posa.js'

yargs(hideBin(process.argv))
  .scriptName('jschain')
  .command('init', 'Initialize genesis chain', {}, async () => {
    await initGenesis()
    console.log('Genesis initialized.')
  })
  .command('new-wallet', 'Create new wallet (privkey + address)', {}, async () => {
    const w = await newWallet()
    console.log('Private Key:', w.privKeyHex)
    console.log('Address   :', w.address)
  })
  .command('faucet', 'Give dev coins (DEV ONLY)', (y) => y
    .option('to', { type: 'string', demandOption: true })
    .option('amount', { type: 'number', default: 1000 })
  , async (argv) => {
    await faucet(argv.to, BigInt(argv.amount))
    console.log('Faucet done.')
  })
  .command('balance', 'Check balance', (y) => y
    .option('address', { type: 'string', demandOption: true })
  , async (argv) => {
    const bal = await getBalance(argv.address)
    console.log('Balance:', bal.toString())
  })
  .command('send', 'Send value transaction', (y) => y
    .option('from-priv', { type: 'string', demandOption: true })
    .option('to', { type: 'string', demandOption: true })
    .option('value', { type: 'number', demandOption: true })
  , async (argv) => {
    const hash = await sendTx(argv['from-priv'], argv.to, BigInt(argv.value))
    console.log('Tx queued (mempool). Hash:', hash)
  })
  .command('propose', 'Propose a new block (PoSA)', (y) => y
    .option('proposer', { type: 'string', demandOption: true })
    .option('priv', { type: 'string', demandOption: true })
  , async (argv) => {
    const b = await proposeBlock(argv.proposer, argv.priv)
    console.log('New block proposed:', b.header.number, b.hash)
  })
  .command('stake', 'Stake coins to become/boost validator', (y) => y
    .option('address', { type: 'string', demandOption: true })
    .option('amount', { type: 'number', demandOption: true })
  , async (argv) => {
    await stake(argv.address, BigInt(argv.amount))
    console.log('Staked.')
  })
  .command('unstake', 'Unstake coins', (y) => y
    .option('address', { type: 'string', demandOption: true })
    .option('amount', { type: 'number', demandOption: true })
  , async (argv) => {
    await unstake(argv.address, BigInt(argv.amount))
    console.log('Unstaked.')
  })
  .command('validators', 'List validator set', {}, async () => {
    const vs = await getValidators()
    console.log(JSON.stringify(vs, null, 2))
  })
  .command('set-validator', 'Activate/Deactivate validator', (y) => y
    .option('address', { type: 'string', demandOption: true })
    .option('active', { type: 'boolean', default: true })
  , async (argv) => {
    await toggleValidator(argv.address, argv.active)
    console.log('Updated validator status.')
  })
  .command('slash', 'Slash validator stake', (y) => y
    .option('address', { type: 'string', demandOption: true })
    .option('amount', { type: 'number', demandOption: true })
  , async (argv) => {
    await slash(argv.address, BigInt(argv.amount))
    console.log('Slashed.')
  })
  .command('head', 'Print head block', {}, async () => {
    const h = await getHead()
    console.log(JSON.stringify(h, null, 2))
  })
  .command('blocks', 'List last 10 blocks', {}, async () => {
    const bs = await listBlocks(10)
    bs.forEach(b => console.log(`#${b.header.number} ${b.hash} txs=${b.txs.length} time=${new Date(b.header.timestamp).toISOString()}`))
  })
  .demandCommand(1)
  .help()
  .argv
