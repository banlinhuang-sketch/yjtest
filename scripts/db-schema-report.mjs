import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getDatabaseMeta, getDatabaseSchemaSnapshot } from '../server/database.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const reportDir = path.resolve(process.env.DB_REPORT_DIR || path.join(appRoot, 'server', 'migration-snapshots'))

function buildTimestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-')
}

fs.mkdirSync(reportDir, { recursive: true })

const schema = getDatabaseSchemaSnapshot()
const meta = getDatabaseMeta()
const timestamp = buildTimestamp()
const filePath = path.join(reportDir, `schema-report-${timestamp}.json`)

const payload = {
  generatedAt: schema.generatedAt,
  storage: meta,
  schema,
}

fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

console.log(
  JSON.stringify(
    {
      status: 'ok',
      reportFile: filePath,
      tables: schema.tables.map((table) => ({
        name: table.name,
        rowCount: table.rowCount,
        columns: table.columns.length,
        indexes: table.indexes.length,
      })),
    },
    null,
    2,
  ),
)
