import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync, backup } from 'node:sqlite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const defaultDbPath = path.resolve(projectRoot, process.env.API_DB_PATH || './server/data/yijing-demo.sqlite')
const defaultBackupDir = path.resolve(projectRoot, process.env.SQLITE_BACKUP_DIR || './server/backups')
const defaultKeepCount = Number.parseInt(process.env.SQLITE_BACKUP_KEEP ?? '14', 10)
const label = process.env.SQLITE_BACKUP_LABEL || 'yijing-demo'

function getTimestamp() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('')
}

function parseArgs(argv) {
  const options = {
    dbPath: defaultDbPath,
    backupDir: defaultBackupDir,
    keepCount: Number.isFinite(defaultKeepCount) ? defaultKeepCount : 14,
  }

  for (const rawArg of argv) {
    if (rawArg.startsWith('--db=')) {
      options.dbPath = path.resolve(projectRoot, rawArg.slice('--db='.length))
      continue
    }

    if (rawArg.startsWith('--out-dir=')) {
      options.backupDir = path.resolve(projectRoot, rawArg.slice('--out-dir='.length))
      continue
    }

    if (rawArg.startsWith('--keep=')) {
      const parsed = Number.parseInt(rawArg.slice('--keep='.length), 10)
      if (Number.isFinite(parsed) && parsed >= 1) {
        options.keepCount = parsed
      }
    }
  }

  return options
}

function hashFile(filePath) {
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

function pruneOldBackups(backupDir, keepCount) {
  const entries = fs
    .readdirSync(backupDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sqlite'))
    .sort((left, right) => right.name.localeCompare(left.name))

  const removed = []
  for (const entry of entries.slice(keepCount)) {
    const target = path.join(backupDir, entry.name)
    const checksum = `${target}.sha256`
    fs.rmSync(target, { force: true })
    fs.rmSync(checksum, { force: true })
    removed.push(path.basename(target))
  }

  return removed
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (!fs.existsSync(options.dbPath)) {
    throw new Error(`SQLite 数据库文件不存在：${options.dbPath}`)
  }

  fs.mkdirSync(options.backupDir, { recursive: true })

  const timestamp = getTimestamp()
  const backupFile = path.join(options.backupDir, `${label}-${timestamp}.sqlite`)
  const checksumFile = `${backupFile}.sha256`

  const source = new DatabaseSync(options.dbPath)
  try {
    await backup(source, backupFile)
  } finally {
    source.close()
  }

  const checksum = hashFile(backupFile)
  fs.writeFileSync(checksumFile, `${checksum}  ${path.basename(backupFile)}\n`, 'utf8')

  const removed = pruneOldBackups(options.backupDir, options.keepCount)

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        database: options.dbPath,
        backupFile,
        checksumFile,
        keepCount: options.keepCount,
        removed,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  )
  process.exitCode = 1
})
