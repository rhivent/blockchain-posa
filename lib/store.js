
import fs from 'fs-extra'
import path from 'path'

 const dataDir = path.join(process.cwd(), 'data')
 const chainFile = path.join(dataDir, 'chain.json')
 const stateFile = path.join(dataDir, 'state.json')
 const mempoolFile = path.join(dataDir, 'mempool.json')
 const validatorsFile = path.join(dataDir, 'validators.json')

export async function ensureDataDir() {
  await fs.ensureDir(dataDir)
}

export async function readJSON(file, fallback) {
  try {
    const exists = await fs.pathExists(file)
    if (!exists) return fallback
    return JSON.parse(await fs.readFile(file, 'utf-8'))
  } catch {
    return fallback
  }
}

export async function writeJSON(file, data) {
  await fs.ensureFile(file)
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf-8')
}

export async function getChain() {
  await ensureDataDir()
  return await readJSON(chainFile, { blocks: [] })
}
export async function putChain(ch) { await writeJSON(chainFile, ch) }

export async function getState() {
  await ensureDataDir()
  return await readJSON(stateFile, { accounts: {} })
}
export async function putState(st) { await writeJSON(stateFile, st) }

export async function getMempool() {
  await ensureDataDir()
  return await readJSON(mempoolFile, { txs: [] })
}
export async function putMempool(mp) { await writeJSON(mempoolFile, mp) }

export async function getValidators() {
  await ensureDataDir()
  return await readJSON(validatorsFile, { validators: [] })
}
export async function putValidators(v) { await writeJSON(validatorsFile, v) }