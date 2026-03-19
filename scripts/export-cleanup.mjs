import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const exportRootDir = path.resolve(process.env.API_EXPORT_DIR || path.join(appRoot, 'server', 'exports'))
const retentionDays = Math.max(Number.parseInt(process.env.EXPORT_CLEANUP_RETENTION_DAYS ?? '14', 10) || 14, 1)
const dryRun = process.argv.includes('--dry-run')

function collectExpiredFiles(rootDir, maxAgeMs) {
  if (!fs.existsSync(rootDir)) {
    return []
  }

  const now = Date.now()
  return fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const filePath = path.join(rootDir, entry.name)
      const stats = fs.statSync(filePath)
      return {
        fileName: entry.name,
        filePath,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        ageMs: now - stats.mtimeMs,
      }
    })
    .filter((entry) => entry.ageMs > maxAgeMs)
    .sort((left, right) => right.ageMs - left.ageMs)
}

function main() {
  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000
  const expiredFiles = collectExpiredFiles(exportRootDir, maxAgeMs)

  let deletedCount = 0
  let deletedBytes = 0

  if (!dryRun) {
    for (const entry of expiredFiles) {
      fs.rmSync(entry.filePath, { force: true })
      deletedCount += 1
      deletedBytes += entry.size
    }
  }

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        dryRun,
        retentionDays,
        exportRootDir,
        matchedCount: expiredFiles.length,
        deletedCount,
        deletedBytes,
        files: expiredFiles.map((entry) => ({
          fileName: entry.fileName,
          modifiedAt: entry.modifiedAt,
          size: entry.size,
        })),
      },
      null,
      2,
    ),
  )
}

main()
