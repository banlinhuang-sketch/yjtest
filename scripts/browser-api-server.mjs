import fs from 'node:fs/promises'
import path from 'node:path'

const cwd = process.cwd()
const apiPort = process.env.BROWSER_API_PORT ?? '8797'
const apiHost = process.env.BROWSER_API_HOST ?? '127.0.0.1'
const dbPath = process.env.BROWSER_API_DB_PATH ?? path.join(cwd, 'server', 'data', 'browser-regression.sqlite')

await fs.mkdir(path.dirname(dbPath), { recursive: true })
await fs.rm(dbPath, { force: true })

process.env.API_PORT = apiPort
process.env.API_HOST = apiHost
process.env.API_DB_PATH = dbPath

console.log(`[browser-api] starting on http://${apiHost}:${apiPort}`)
console.log(`[browser-api] database: ${dbPath}`)

await import('../server/index.mjs')
