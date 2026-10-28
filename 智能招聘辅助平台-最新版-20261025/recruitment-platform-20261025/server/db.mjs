import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
export const STORAGE_DIR = path.join(ROOT, 'storage');
export const UPLOAD_DIR = path.join(STORAGE_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new DatabaseSync(process.env.DB_PATH || path.join(STORAGE_DIR, 'recruitment.db'));
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export const nowISO = () => new Date().toISOString();
export const uuid = (p = '') => p + crypto.randomUUID();

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  account TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  dept TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'enabled',
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  dept TEXT NOT NULL,
  headcount INTEGER NOT NULL DEFAULT 1,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  owner_id TEXT,
  requester_id TEXT NOT NULL,
  clarify_needed INTEGER NOT NULL DEFAULT 0,
  current_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  closed_at TEXT,
  closed_by TEXT,
  suspend_reason TEXT
);

CREATE TABLE IF NOT EXISTS job_conditions (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  criteria TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  confirmed_by TEXT,
  confirmed_at TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(job_id, version)
);

CREATE TABLE IF NOT EXISTS clarifications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  version INTEGER,
  question TEXT NOT NULL,
  asked_by TEXT NOT NULL,
  asked_at TEXT NOT NULL,
  answer TEXT,
  answered_by TEXT,
  answered_at TEXT,
  state TEXT NOT NULL DEFAULT 'pending',
  parent_id TEXT
);

CREATE TABLE IF NOT EXISTS job_analyses (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  condition_version INTEGER NOT NULL,
  content TEXT NOT NULL,
  model TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_members (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role_on_job TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(job_id, user_id, role_on_job)
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  candidate_name TEXT NOT NULL,
  candidate_email TEXT,
  phone TEXT,
  file_path TEXT,
  file_name TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  intent_confirmed INTEGER NOT NULL DEFAULT 0,
  intent_method TEXT,
  intent_at TEXT,
  status TEXT NOT NULL DEFAULT 'waiting_parse',
  parse_status TEXT NOT NULL DEFAULT 'pending',
  parse_error TEXT,
  resume_text TEXT,
  dupe_hint TEXT,
  uploaded_by TEXT,
  source TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS parsed_results (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  condition_version INTEGER NOT NULL,
  score INTEGER,
  grade TEXT,
  tags TEXT,
  criteria TEXT,
  questions TEXT,
  model TEXT,
  prompt_version TEXT,
  evidence_missing INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  reason TEXT,
  gap TEXT,
  questions TEXT,
  draft_source TEXT,
  submitted_by TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  withdrawn_at TEXT,
  withdraw_reason TEXT
);

CREATE TABLE IF NOT EXISTS feedbacks (
  id TEXT PRIMARY KEY,
  recommendation_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT,
  detail TEXT,
  expect_time TEXT,
  request TEXT,
  by_user TEXT NOT NULL,
  by_role TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS interviews (
  id TEXT PRIMARY KEY,
  recommendation_id TEXT NOT NULL,
  result TEXT NOT NULL,
  note TEXT,
  recorded_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  recommendation_id TEXT NOT NULL,
  result TEXT NOT NULL,
  note TEXT,
  recorded_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS onboardings (
  id TEXT PRIMARY KEY,
  recommendation_id TEXT NOT NULL,
  application_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  onboard_date TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hiring_outcomes (
  id TEXT PRIMARY KEY,
  onboarding_id TEXT NOT NULL,
  rating TEXT NOT NULL,
  evaluation TEXT NOT NULL,
  alignment TEXT NOT NULL,
  by_user TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  title TEXT NOT NULL,
  body TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  user_id TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  object_type TEXT,
  object_id TEXT,
  result TEXT NOT NULL DEFAULT 'success',
  detail TEXT
);

CREATE TABLE IF NOT EXISTS state_transitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT NOT NULL,
  by_user TEXT,
  at TEXT NOT NULL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  note TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_job ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_rec_app ON recommendations(application_id);
CREATE INDEX IF NOT EXISTS idx_rec_status ON recommendations(status);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_logs(at);
`);

// 老库补列（SQLite 不支持 ADD COLUMN IF NOT EXISTS，用 try 兜住）
try { db.exec('ALTER TABLE clarifications ADD COLUMN parent_id TEXT'); } catch { /* 已存在 */ }
try { db.exec('ALTER TABLE applications ADD COLUMN source TEXT'); } catch { /* 已存在 */ }


export function get(sql, ...params) {
  return db.prepare(sql).get(...params);
}
export function all(sql, ...params) {
  return db.prepare(sql).all(...params);
}
export function run(sql, ...params) {
  return db.prepare(sql).run(...params);
}

export function audit({ user, action, objectType, objectId, result = 'success', detail = null }) {
  run(
    'INSERT INTO audit_logs (at,user_id,user_name,action,object_type,object_id,result,detail) VALUES (?,?,?,?,?,?,?,?)',
    nowISO(), user?.id || null, user?.name || 'anonymous', action, objectType || null,
    objectId || null, result, detail ? JSON.stringify(detail) : null
  );
}

export function transition({ entityType, entityId, from, to, byUser, note = null }) {
  run(
    'INSERT INTO state_transitions (entity_type,entity_id,from_state,to_state,by_user,at,note) VALUES (?,?,?,?,?,?,?)',
    entityType, entityId, from || null, to, byUser || null, nowISO(), note
  );
}

const DEFAULT_CONFIG = [
  ['auto_eliminate_enabled', 'false', 'locked', '合规红线：AI 仅辅助初筛，禁止自动淘汰（R1/R3），产品层不可开启'],
  ['score_threshold_enabled', 'false', 'pending', '是否设分数淘汰线（C3）——确认前不得作为过滤条件'],
  ['feedback_sla_workdays', '3', 'pending', '部门反馈时效阈值（C4：3 个工作日口径待招聘经理确认）'],
  ['condition_weights_default', '{"tech":40,"proj":30,"soft":30}', 'pending', '条件权重建议值（C2：是否全岗位通用待确认）'],
  ['grade_form', 'score_and_grade', 'pending', '评分/分级形态（C2）'],
  ['push_ratio', '1:1.5', 'pending', '推送比例建议值（C5）'],
  ['metric_definitions', 'pending', 'pending', '报表指标分子分母定义（C10）——未确认时报表只展示参考口径'],
  ['resume_retention_months', '24', 'pending', '简历数据保留期（C16；法务确认前不入库执行删除）'],
  ['outcome_observe_days', '30', 'pending', '用人结果回评观察期建议值（待业务确认）'],
  ['feishu_scheduling', 'false', 'confirmed', '不接飞书排期（R29/C12）'],
  ['offer_flow', 'external', 'confirmed', 'Offer 生成/审批/发送不在平台内（R30）'],
];
export function seedDefaultConfig() {
  const exists = get('SELECT COUNT(*) AS c FROM config');
  if (exists.c > 0) return;
  for (const [key, value, status, note] of DEFAULT_CONFIG) {
    run('INSERT INTO config (key,value,status,note,updated_at) VALUES (?,?,?,?,?)', key, value, status, note, nowISO());
  }
}
seedDefaultConfig();

export function getConfig(key) {
  const row = get('SELECT * FROM config WHERE key = ?', key);
  if (!row) return null;
  try {
    return { ...row, parsed: JSON.parse(row.value) };
  } catch {
    return { ...row, parsed: row.value };
  }
}
export function listConfig() {
  return all('SELECT * FROM config ORDER BY key').map((r) => {
    let parsed = r.value;
    try { parsed = JSON.parse(r.value); } catch {}
    return { ...r, parsed };
  });
}
export function setConfig(key, value, { status, note, user } = {}) {
  const cur = get('SELECT * FROM config WHERE key = ?', key);
  if (!cur) return null;
  if (cur.status === 'locked') return { locked: true };
  run(
    'UPDATE config SET value = ?, status = COALESCE(?, status), note = COALESCE(?, note), updated_at = ? WHERE key = ?',
    typeof value === 'string' ? value : JSON.stringify(value), status ?? null, note ?? null, nowISO(), key
  );
  audit({ user, action: 'config.update', objectType: 'config', objectId: key, detail: { from: cur.value, to: value } });
  return getConfig(key);
}

export function notify({ userIds, type, refType, refId, title, body }) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  for (const uid of ids) {
    run(
      'INSERT INTO notifications (id,user_id,type,ref_type,ref_id,title,body,created_at) VALUES (?,?,?,?,?,?,?,?)',
      uuid('N'), uid, type, refType || null, refId || null, title, body || null, nowISO()
    );
  }
  return ids.length;
}
