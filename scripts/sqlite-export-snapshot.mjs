import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  getDatabaseMeta,
  getDatabaseSchemaSnapshot,
  listStoredAuditLogs,
  listStoredCases,
  listStoredExportRecords,
  listStoredKnowledgeSources,
  listStoredUsers,
} from '../server/database.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const snapshotDir = path.resolve(process.env.DB_SNAPSHOT_DIR || path.join(appRoot, 'server', 'migration-snapshots'))

function buildTimestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '').replace('T', '-')
}

fs.mkdirSync(snapshotDir, { recursive: true })

const timestamp = buildTimestamp()
const filePath = path.join(snapshotDir, `sqlite-snapshot-${timestamp}.json`)
const exportRecords = listStoredExportRecords({ limit: 10000 })
const databaseMeta = getDatabaseMeta()

const payload = {
  generatedAt: new Date().toISOString(),
  source: {
    engine: databaseMeta.engine,
    filePath: databaseMeta.filePath,
  },
  counts: {
    users: databaseMeta.users,
    cases: databaseMeta.cases,
    knowledgeSources: databaseMeta.knowledgeSources,
    auditLogs: databaseMeta.auditLogs,
    exportRecords: databaseMeta.exportRecords,
  },
  schema: getDatabaseSchemaSnapshot(),
  data: {
    users: listStoredUsers(),
    cases: listStoredCases(),
    knowledgeSources: listStoredKnowledgeSources(),
    auditLogs: listStoredAuditLogs(100000),
    exportRecords,
  },
}

fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

console.log(
  JSON.stringify(
    {
      status: 'ok',
      snapshotFile: filePath,
      counts: payload.counts,
    },
    null,
    2,
  ),
)
