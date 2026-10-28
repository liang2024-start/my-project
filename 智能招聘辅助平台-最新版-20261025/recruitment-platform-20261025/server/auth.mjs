import crypto from 'node:crypto';
import { get, all as dbAll, run, nowISO, uuid, audit } from './db.mjs';

export const ROLE_LABEL = {
  admin: '平台管理员',
  manager: '招聘经理',
  specialist: '招聘专员',
  deptmgr: '用人部门经理',
  interviewer: '用人部门面试官',
};

/** 能力点矩阵：服务端唯一依据，前端只做入口显隐 */
export const ROLE_CAPS = {
  admin: ['job.view', 'job.view.all', 'resume.view', 'feedback.view', 'outcome.view', 'report.view', 'audit.view', 'user.manage', 'config.manage'],
  manager: ['job.view', 'job.view.all', 'resume.view', 'feedback.view', 'outcome.view', 'report.view', 'urge', 'owner.assign'],
  specialist: ['job.view', 'resume.view', 'resume.upload', 'resume.parse', 'recommend.submit', 'recommend.withdraw', 'clarify.create', 'feedback.view', 'urge', 'report.view'],
  deptmgr: ['job.view', 'job.publish', 'job.condition.confirm', 'job.suspend', 'job.close', 'interviewer.assign', 'resume.view', 'feedback.view', 'feedback.decide', 'outcome.evaluate', 'report.view', 'urge'],
  interviewer: ['job.view', 'resume.view', 'feedback.view', 'outcome.evaluate', 'report.view'],
};

export function capsOf(user) {
  return ROLE_CAPS[user?.role] || [];
}
export function hasCap(user, cap) {
  return capsOf(user).includes(cap);
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}
export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
}

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
  run('INSERT INTO sessions (token,user_id,created_at,expires_at) VALUES (?,?,?,?)', token, userId, nowISO(), expires);
  return token;
}
export function destroySession(token) {
  run('DELETE FROM sessions WHERE token = ?', token);
}
export function userFromToken(token) {
  if (!token) return null;
  const s = get('SELECT * FROM sessions WHERE token = ?', token);
  if (!s) return null;
  if (new Date(s.expires_at).getTime() < Date.now()) {
    run('DELETE FROM sessions WHERE token = ?', token);
    return null;
  }
  return get('SELECT * FROM users WHERE id = ?', s.user_id) || null;
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.cookies?.token;
  const user = userFromToken(token);
  if (!user) return res.status(401).json({ error: '未登录或会话已过期', code: 'UNAUTHENTICATED' });
  if (user.status !== 'enabled') {
    destroySession(token);
    audit({ user, action: 'auth.blocked', objectType: 'user', objectId: user.id, result: 'denied', detail: { status: user.status } });
    return res.status(403).json({ error: '账号状态异常，无法继续操作', code: 'ACCOUNT_' + user.status.toUpperCase() });
  }
  req.user = user;
  req.token = token;
  next();
}

export function requireCap(cap) {
  return (req, res, next) => {
    if (!hasCap(req.user, cap)) {
      audit({ user: req.user, action: 'denied.' + cap, objectType: 'capability', objectId: cap, result: 'denied' });
      return res.status(403).json({ error: '权限不足：当前角色不可执行该操作', code: 'FORBIDDEN', capability: cap });
    }
    next();
  };
}

/* ---------------- 数据范围（岗位 / 部门） ---------------- */
export function isJobOwner(user, jobId) {
  return !!get('SELECT 1 AS x FROM job_members WHERE job_id = ? AND user_id = ? AND role_on_job = ?', jobId, user.id, 'owner');
}
export function isInterviewer(user, jobId) {
  return !!get('SELECT 1 AS x FROM job_members WHERE job_id = ? AND user_id = ? AND role_on_job = ?', jobId, user.id, 'interviewer');
}
export function canViewAll(user) {
  return user.role === 'admin' || user.role === 'manager';
}
export function canViewJob(user, job) {
  if (!job) return false;
  if (canViewAll(user)) return true;
  if (user.role === 'specialist') return isJobOwner(user, job.id);
  if (user.role === 'deptmgr' || user.role === 'interviewer') return job.dept === user.dept;
  return false;
}
export function canProcessJob(user, job) {
  return user.role === 'specialist' && isJobOwner(user, job.id);
}
export function canPublishJob(user) {
  return user.role === 'deptmgr';
}
export function canConfirmCondition(user, job) {
  return user.role === 'deptmgr' && job.dept === user.dept;
}
export function canAssignInterviewer(user, job) {
  return user.role === 'deptmgr' && job.dept === user.dept;
}
export function canDecideFeedback(user, job) {
  return user.role === 'deptmgr' && job.dept === user.dept;
}
export function canEvaluateOutcome(user, job) {
  return (user.role === 'deptmgr' || user.role === 'interviewer') && job.dept === user.dept;
}
/**
 * 录用决定：候选人经用人部门同意面试后，由本部门面试官（或本部门经理）决定是否录用。
 * 录用的候选人进入「已入职候选人」，后续由本部门做用人结果评价。
 */
export function canHireDecide(user, job) {
  if (!job || job.dept !== user.dept) return false;
  if (user.role === 'deptmgr') return true;
  if (user.role === 'interviewer') return isInterviewer(user, job.id);
  return false;
}

export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id, name: u.name, account: u.account, role: u.role, roleLabel: ROLE_LABEL[u.role],
    dept: u.dept, status: u.status, createdAt: u.created_at, lastLoginAt: u.last_login_at,
    capabilities: capsOf(u),
  };
}

export function referrersForJob(jobId) {
  return dbAll('SELECT user_id FROM job_members WHERE job_id = ? AND role_on_job = ?', jobId, 'owner').map((r) => r.user_id);
}
export function managers() {
  return dbAll("SELECT id FROM users WHERE role = 'manager' AND status = 'enabled'").map((r) => r.id);
}
export function deptManagers(dept) {
  return dbAll("SELECT id FROM users WHERE role = 'deptmgr' AND dept = ? AND status = 'enabled'", dept).map((r) => r.id);
}
export function interviewersOf(jobId) {
  return dbAll('SELECT user_id FROM job_members WHERE job_id = ? AND role_on_job = ?', jobId, 'interviewer').map((r) => r.user_id);
}
