import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

import { createSeedCases } from './seed-data.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultDbPath = path.join(__dirname, 'data', 'yijing-demo.sqlite')
const databasePath = path.resolve(process.env.API_DB_PATH || defaultDbPath)

const defaultKnowledgeSources = [
  {
    id: 'KB-BUSINESS-001',
    title: 'App 业务知识库',
    category: 'business',
    categoryLabel: '业务知识',
    summary: '沉淀账号体系、蓝牙配对、通知同步和设置中心等核心业务规则，用于生成手机端测试点。',
    updatedAt: '2026-03-17',
    icon: 'smartphone',
    accent: 'blue',
  },
  {
    id: 'KB-HARDWARE-002',
    title: '智能眼镜能力库',
    category: 'hardware',
    categoryLabel: '硬件能力',
    summary: '覆盖显示、语音、麦克风、佩戴检测、低电量和固件能力约束，用于完善设备侧测试内容。',
    updatedAt: '2026-03-16',
    icon: 'visibility',
    accent: 'indigo',
  },
  {
    id: 'KB-FLOW-003',
    title: '交互流程基线',
    category: 'flow',
    categoryLabel: '交互链路',
    summary: '定义 App 与眼镜的配对、同步、通知转发、断连恢复等关键联动链路。',
    updatedAt: '2026-03-15',
    icon: 'monitoring',
    accent: 'teal',
  },
  {
    id: 'KB-HISTORY-004',
    title: '历史缺陷库',
    category: 'history',
    categoryLabel: '缺陷沉淀',
    summary: '沉淀高频缺陷、复现条件与回归建议，便于草案生成时回查历史风险模式。',
    updatedAt: '2026-03-14',
    icon: 'warning',
    accent: 'red',
  },
  {
    id: 'KB-MATRIX-005',
    title: '兼容矩阵',
    category: 'matrix',
    categoryLabel: '兼容矩阵',
    summary: '维护手机机型、系统版本、固件版本和 SDK 组合下的兼容性结论与注意事项。',
    updatedAt: '2026-03-13',
    icon: 'grid_view',
    accent: 'amber',
  },
  {
    id: 'KB-TERMS-006',
    title: '术语与异常码',
    category: 'terms',
    categoryLabel: '术语规范',
    summary: '统一产品术语、链路状态和异常码定义，保证用例、缺陷与导出报告表达一致。',
    updatedAt: '2026-03-12',
    icon: 'book_2',
    accent: 'purple',
  },
]

const defaultUsers = [
  {
    id: 'user-banlin',
    username: 'banlin.huang',
    password: 'Yijing@2026',
    name: 'Banlin Huang',
    roleCode: 'tester',
    roleLabel: '测试设计负责人',
    status: 'active',
  },
  {
    id: 'user-review',
    username: 'review.expert',
    password: 'Review@2026',
    name: '审核专家',
    roleCode: 'reviewer',
    roleLabel: '质量门禁负责人',
    status: 'active',
  },
  {
    id: 'user-admin',
    username: 'admin.root',
    password: 'Admin@2026',
    name: '平台管理员',
    roleCode: 'admin',
    roleLabel: '系统管理员',
    status: 'active',
  },
]

function ensureDirectoryFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function parseJson(value, fallback) {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback
  }

  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex')
  return `scrypt:${salt}:${derivedKey}`
}

export function verifyPasswordHash(password, passwordHash) {
  const [algorithm, salt, storedHash] = String(passwordHash ?? '').split(':')
  if (algorithm !== 'scrypt' || !salt || !storedHash) {
    return false
  }

  const derivedKey = crypto.scryptSync(password, salt, 64)
  const storedBuffer = Buffer.from(storedHash, 'hex')
  if (derivedKey.length !== storedBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(derivedKey, storedBuffer)
}

function caseToRow(caseItem) {
  return {
    id: caseItem.id,
    title: caseItem.title,
    feature: caseItem.feature,
    scope: caseItem.scope,
    priority: caseItem.priority,
    status: caseItem.status,
    owner: caseItem.owner,
    submitter: caseItem.submitter,
    objective: caseItem.objective,
    notes: caseItem.notes,
    tags_json: JSON.stringify(caseItem.tags ?? []),
    preconditions_json: JSON.stringify(caseItem.preconditions ?? []),
    steps_json: JSON.stringify(caseItem.steps ?? []),
    attachments_json: JSON.stringify(caseItem.attachments ?? []),
    activity_json: JSON.stringify(caseItem.activity ?? []),
    review_note: caseItem.reviewNote ?? '',
    updated_at: caseItem.updatedAt,
  }
}

function rowToCase(row) {
  return {
    id: row.id,
    title: row.title,
    feature: row.feature,
    scope: row.scope,
    priority: row.priority,
    status: row.status,
    owner: row.owner,
    submitter: row.submitter,
    objective: row.objective,
    notes: row.notes,
    tags: parseJson(row.tags_json, []),
    preconditions: parseJson(row.preconditions_json, []),
    steps: parseJson(row.steps_json, []),
    attachments: parseJson(row.attachments_json, []),
    activity: parseJson(row.activity_json, []),
    reviewNote: row.review_note ?? '',
    updatedAt: row.updated_at,
  }
}

function rowToKnowledgeSource(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    categoryLabel: row.category_label,
    summary: row.summary,
    updatedAt: row.updated_at,
    icon: row.icon,
    accent: row.accent,
  }
}

function rowToUser(row) {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    name: row.name,
    roleCode: row.role_code,
    roleLabel: row.role_label,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function auditLogToRow(entry) {
  return {
    id: entry.id,
    actor_id: entry.actorId,
    actor_name: entry.actorName,
    actor_role_code: entry.actorRoleCode,
    actor_role_label: entry.actorRoleLabel,
    action: entry.action,
    target_type: entry.targetType,
    target_id: entry.targetId,
    target_title: entry.targetTitle,
    detail: entry.detail,
    metadata_json: JSON.stringify(entry.metadata ?? {}),
    created_at: entry.createdAt,
  }
}

function rowToAuditLog(row) {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorRoleCode: row.actor_role_code,
    actorRoleLabel: row.actor_role_label,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    targetTitle: row.target_title,
    detail: row.detail,
    metadata: parseJson(row.metadata_json, {}),
    createdAt: row.created_at,
  }
}

function exportRecordToRow(entry) {
  return {
    id: entry.id,
    task_id: entry.taskId,
    actor_id: entry.actorId,
    actor_name: entry.actorName,
    actor_role_code: entry.actorRoleCode,
    format: entry.format,
    file_name: entry.fileName,
    file_path: entry.filePath,
    status: entry.status,
    filters_json: JSON.stringify(entry.filters ?? {}),
    error_message: entry.errorMessage ?? '',
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
    completed_at: entry.completedAt ?? null,
  }
}

function rowToExportRecord(row) {
  return {
    id: row.id,
    taskId: row.task_id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    actorRoleCode: row.actor_role_code,
    format: row.format,
    fileName: row.file_name,
    filePath: row.file_path,
    status: row.status,
    filters: parseJson(row.filters_json, {}),
    errorMessage: row.error_message ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? '',
  }
}

ensureDirectoryFor(databasePath)

const database = new DatabaseSync(databasePath)

database.exec(`
  PRAGMA busy_timeout = 5000;
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role_code TEXT NOT NULL,
    role_label TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    feature TEXT NOT NULL,
    scope TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT NOT NULL,
    owner TEXT NOT NULL,
    submitter TEXT NOT NULL,
    objective TEXT NOT NULL,
    notes TEXT NOT NULL,
    tags_json TEXT NOT NULL,
    preconditions_json TEXT NOT NULL,
    steps_json TEXT NOT NULL,
    attachments_json TEXT NOT NULL,
    activity_json TEXT NOT NULL,
    review_note TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS knowledge_sources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    category_label TEXT NOT NULL,
    summary TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    icon TEXT NOT NULL,
    accent TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_role_code TEXT NOT NULL,
    actor_role_label TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_title TEXT NOT NULL,
    detail TEXT NOT NULL,
    metadata_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS export_records (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL UNIQUE,
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_role_code TEXT NOT NULL,
    format TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    status TEXT NOT NULL,
    filters_json TEXT NOT NULL,
    error_message TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
  );
`)

const countUsersStatement = database.prepare('SELECT COUNT(*) AS count FROM users')
const countCasesStatement = database.prepare('SELECT COUNT(*) AS count FROM cases')
const countKnowledgeStatement = database.prepare('SELECT COUNT(*) AS count FROM knowledge_sources')
const countAuditLogsStatement = database.prepare('SELECT COUNT(*) AS count FROM audit_logs')
const countExportRecordsStatement = database.prepare('SELECT COUNT(*) AS count FROM export_records')
const selectUserByIdStatement = database.prepare('SELECT * FROM users WHERE id = ?')
const selectUserByUsernameStatement = database.prepare('SELECT * FROM users WHERE username = ?')
const selectAllUsersStatement = database.prepare(`
  SELECT * FROM users
  ORDER BY created_at ASC, id ASC
`)
const upsertUserStatement = database.prepare(`
  INSERT INTO users (
    id, username, password_hash, name, role_code, role_label, status, created_at, updated_at
  ) VALUES (
    @id, @username, @password_hash, @name, @role_code, @role_label, @status, @created_at, @updated_at
  )
  ON CONFLICT(id) DO UPDATE SET
    username = excluded.username,
    password_hash = excluded.password_hash,
    name = excluded.name,
    role_code = excluded.role_code,
    role_label = excluded.role_label,
    status = excluded.status,
    updated_at = excluded.updated_at
`)
const selectAllCasesStatement = database.prepare('SELECT * FROM cases')
const selectCaseByIdStatement = database.prepare('SELECT * FROM cases WHERE id = ?')
const upsertCaseStatement = database.prepare(`
  INSERT INTO cases (
    id, title, feature, scope, priority, status, owner, submitter,
    objective, notes, tags_json, preconditions_json, steps_json,
    attachments_json, activity_json, review_note, updated_at
  ) VALUES (
    @id, @title, @feature, @scope, @priority, @status, @owner, @submitter,
    @objective, @notes, @tags_json, @preconditions_json, @steps_json,
    @attachments_json, @activity_json, @review_note, @updated_at
  )
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    feature = excluded.feature,
    scope = excluded.scope,
    priority = excluded.priority,
    status = excluded.status,
    owner = excluded.owner,
    submitter = excluded.submitter,
    objective = excluded.objective,
    notes = excluded.notes,
    tags_json = excluded.tags_json,
    preconditions_json = excluded.preconditions_json,
    steps_json = excluded.steps_json,
    attachments_json = excluded.attachments_json,
    activity_json = excluded.activity_json,
    review_note = excluded.review_note,
    updated_at = excluded.updated_at
`)
const selectAllKnowledgeSourcesStatement = database.prepare(
  'SELECT * FROM knowledge_sources ORDER BY updated_at DESC, id ASC',
)
const upsertKnowledgeSourceStatement = database.prepare(`
  INSERT INTO knowledge_sources (
    id, title, category, category_label, summary, updated_at, icon, accent
  ) VALUES (
    @id, @title, @category, @category_label, @summary, @updated_at, @icon, @accent
  )
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    category = excluded.category,
    category_label = excluded.category_label,
    summary = excluded.summary,
    updated_at = excluded.updated_at,
    icon = excluded.icon,
    accent = excluded.accent
`)
const selectAuditLogsStatement = database.prepare(`
  SELECT * FROM audit_logs
  ORDER BY created_at DESC, id DESC
  LIMIT ?
`)
const insertAuditLogStatement = database.prepare(`
  INSERT INTO audit_logs (
    id, actor_id, actor_name, actor_role_code, actor_role_label,
    action, target_type, target_id, target_title, detail, metadata_json, created_at
  ) VALUES (
    @id, @actor_id, @actor_name, @actor_role_code, @actor_role_label,
    @action, @target_type, @target_id, @target_title, @detail, @metadata_json, @created_at
  )
`)
const selectExportRecordByTaskIdStatement = database.prepare('SELECT * FROM export_records WHERE task_id = ?')
const selectAllExportRecordsStatement = database.prepare(`
  SELECT * FROM export_records
  ORDER BY created_at DESC, id DESC
  LIMIT ?
`)
const selectExportRecordsByActorStatement = database.prepare(`
  SELECT * FROM export_records
  WHERE actor_id = ?
  ORDER BY created_at DESC, id DESC
  LIMIT ?
`)
const selectSchemaTablesStatement = database.prepare(`
  SELECT name, sql
  FROM sqlite_master
  WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
  ORDER BY name ASC
`)
const selectSchemaIndexesByTableStatement = database.prepare(`
  SELECT name, sql
  FROM sqlite_master
  WHERE type = 'index' AND tbl_name = ? AND name NOT LIKE 'sqlite_%'
  ORDER BY name ASC
`)
const upsertExportRecordStatement = database.prepare(`
  INSERT INTO export_records (
    id, task_id, actor_id, actor_name, actor_role_code, format,
    file_name, file_path, status, filters_json, error_message,
    created_at, updated_at, completed_at
  ) VALUES (
    @id, @task_id, @actor_id, @actor_name, @actor_role_code, @format,
    @file_name, @file_path, @status, @filters_json, @error_message,
    @created_at, @updated_at, @completed_at
  )
  ON CONFLICT(task_id) DO UPDATE SET
    actor_id = excluded.actor_id,
    actor_name = excluded.actor_name,
    actor_role_code = excluded.actor_role_code,
    format = excluded.format,
    file_name = excluded.file_name,
    file_path = excluded.file_path,
    status = excluded.status,
    filters_json = excluded.filters_json,
    error_message = excluded.error_message,
    updated_at = excluded.updated_at,
    completed_at = excluded.completed_at
`)

function seedIfEmpty() {
  const userCount = Number(countUsersStatement.get().count ?? 0)
  if (userCount === 0) {
    const now = new Date().toISOString()
    for (const item of defaultUsers) {
      upsertUserStatement.run({
        id: item.id,
        username: item.username,
        password_hash: createPasswordHash(item.password),
        name: item.name,
        role_code: item.roleCode,
        role_label: item.roleLabel,
        status: item.status,
        created_at: now,
        updated_at: now,
      })
    }
  }

  const caseCount = Number(countCasesStatement.get().count ?? 0)
  if (caseCount === 0) {
    for (const item of createSeedCases()) {
      upsertCaseStatement.run(caseToRow(item))
    }
  }

  const knowledgeCount = Number(countKnowledgeStatement.get().count ?? 0)
  if (knowledgeCount === 0) {
    for (const item of defaultKnowledgeSources) {
      upsertKnowledgeSourceStatement.run({
        id: item.id,
        title: item.title,
        category: item.category,
        category_label: item.categoryLabel,
        summary: item.summary,
        updated_at: item.updatedAt,
        icon: item.icon,
        accent: item.accent,
      })
    }
  }
}

seedIfEmpty()

export function getStoredUserById(userId) {
  const row = selectUserByIdStatement.get(userId)
  return row ? rowToUser(row) : null
}

export function getStoredUserByUsername(username) {
  const row = selectUserByUsernameStatement.get(username)
  return row ? rowToUser(row) : null
}

export function listStoredUsers() {
  return selectAllUsersStatement.all().map(rowToUser)
}

export function listStoredCases() {
  return selectAllCasesStatement.all().map(rowToCase)
}

export function getStoredCaseById(caseId) {
  const row = selectCaseByIdStatement.get(caseId)
  return row ? rowToCase(row) : null
}

export function saveStoredCase(caseItem) {
  upsertCaseStatement.run(caseToRow(caseItem))
  return getStoredCaseById(caseItem.id)
}

export function listStoredKnowledgeSources() {
  return selectAllKnowledgeSourcesStatement.all().map(rowToKnowledgeSource)
}

export function insertStoredAuditLog(entry) {
  insertAuditLogStatement.run(auditLogToRow(entry))
  return entry
}

export function listStoredAuditLogs(limit = 200) {
  const safeLimit = Math.max(Number.parseInt(String(limit), 10) || 200, 1)
  return selectAuditLogsStatement.all(safeLimit).map(rowToAuditLog)
}

export function upsertStoredExportRecord(entry) {
  upsertExportRecordStatement.run(exportRecordToRow(entry))
  return getStoredExportRecordByTaskId(entry.taskId)
}

export function getStoredExportRecordByTaskId(taskId) {
  const row = selectExportRecordByTaskIdStatement.get(taskId)
  return row ? rowToExportRecord(row) : null
}

export function listStoredExportRecords({ limit = 100, actorId = '' } = {}) {
  const safeLimit = Math.max(Number.parseInt(String(limit), 10) || 100, 1)
  const rows = actorId
    ? selectExportRecordsByActorStatement.all(actorId, safeLimit)
    : selectAllExportRecordsStatement.all(safeLimit)

  return rows.map(rowToExportRecord)
}

export function getDatabaseMeta() {
  return {
    engine: 'sqlite',
    filePath: databasePath,
    users: Number(countUsersStatement.get().count ?? 0),
    cases: Number(countCasesStatement.get().count ?? 0),
    knowledgeSources: Number(countKnowledgeStatement.get().count ?? 0),
    auditLogs: Number(countAuditLogsStatement.get().count ?? 0),
    exportRecords: Number(countExportRecordsStatement.get().count ?? 0),
  }
}

export function getDatabaseSchemaSnapshot() {
  const tables = selectSchemaTablesStatement.all().map((tableRow) => {
    const rowCountStatement = database.prepare(`SELECT COUNT(*) AS count FROM ${tableRow.name}`)
    const rowCount = Number(rowCountStatement.get().count ?? 0)
    const columns = database
      .prepare(`PRAGMA table_info(${tableRow.name})`)
      .all()
      .map((column) => ({
        cid: Number(column.cid),
        name: column.name,
        type: column.type,
        notnull: Number(column.notnull) === 1,
        defaultValue: column.dflt_value,
        primaryKey: Number(column.pk) === 1,
      }))
    const indexes = selectSchemaIndexesByTableStatement.all(tableRow.name).map((indexRow) => ({
      name: indexRow.name,
      sql: indexRow.sql,
    }))

    return {
      name: tableRow.name,
      rowCount,
      sql: tableRow.sql,
      columns,
      indexes,
    }
  })

  return {
    engine: 'sqlite',
    databasePath,
    generatedAt: new Date().toISOString(),
    tables,
  }
}
