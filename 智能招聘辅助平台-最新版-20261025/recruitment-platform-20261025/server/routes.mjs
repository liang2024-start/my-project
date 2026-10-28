import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import {
  db, get, all, run, uuid, nowISO, audit, transition, notify, getConfig, listConfig, setConfig,
  STORAGE_DIR, UPLOAD_DIR,
} from './db.mjs';
import {
  publicUser, requireAuth, requireCap, hasCap, canViewAll, canViewJob, isJobOwner, isInterviewer,
  canPublishJob, canConfirmCondition, canAssignInterviewer, canDecideFeedback, canEvaluateOutcome, canHireDecide,
  deptManagers, interviewersOf,
  ROLE_LABEL, hashPassword, verifyPassword, createSession, destroySession,
} from './auth.mjs';
import {
  activeCondition, applicationRow, canSeeApplication, jobSummary, parsedOf, recOf,
  visibleJobs, userBrief, APP_STATUS_LABEL, DECISION_LABEL,
} from './shared.mjs';
import { parseResume, draftRecommendation, analyzeJob, llmInfo } from './llm.mjs';
import { extractPdfText, guessCandidateMeta } from './pdf.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
export const api = express.Router();
api.use(express.json({ limit: '2mb' }));

const bad = (res, status, error, code = 'BAD_REQUEST', extra = {}) => res.status(status).json({ error, code, ...extra });
const int = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const str = (v) => (typeof v === 'string' ? v.trim() : '');

/* =====================================================================
   认证
===================================================================== */
api.post('/login', (req, res) => {
  const account = str(req.body?.account).toLowerCase();
  const password = String(req.body?.password ?? '');
  if (!account || !password) return bad(res, 400, '请输入账号与密码', 'MISSING_CREDENTIALS');
  const user = get('SELECT * FROM users WHERE lower(account) = ?', account);
  if (!user || !verifyPassword(password, user.password_hash)) {
    audit({ user: null, action: 'auth.login', objectType: 'user', objectId: account, result: 'denied', detail: { reason: 'bad_credentials' } });
    return bad(res, 401, '账号或密码不正确', 'BAD_CREDENTIALS');
  }
  if (user.status === 'disabled') {
    audit({ user, action: 'auth.login', objectType: 'user', objectId: user.id, result: 'denied', detail: { reason: 'disabled' } });
    return bad(res, 403, '该账号已停用，无法登录，请联系平台管理员', 'ACCOUNT_DISABLED');
  }
  if (user.status !== 'enabled') {
    audit({ user, action: 'auth.login', objectType: 'user', objectId: user.id, result: 'denied', detail: { reason: user.status } });
    return bad(res, 403, '账号尚未激活，无法登录（激活通知已发送）', 'ACCOUNT_' + user.status.toUpperCase());
  }
  run('UPDATE users SET last_login_at = ? WHERE id = ?', nowISO(), user.id);
  const token = createSession(user.id);
  audit({ user, action: 'auth.login', objectType: 'user', objectId: user.id });
  res.json({ token, user: publicUser(user) });
});

api.post('/logout', requireAuth, (req, res) => {
  destroySession(req.token);
  audit({ user: req.user, action: 'auth.logout', objectType: 'user', objectId: req.user.id });
  res.json({ ok: true });
});

api.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user), llm: llmInfo() });
});

api.get('/demo-accounts', (req, res) => {
  const rows = all('SELECT id,name,account,role,dept,status FROM users ORDER BY role, name');
  res.json(rows.map((u) => ({ ...u, roleLabel: ROLE_LABEL[u.role] })));
});

/* ---------------- 个人中心：改账号 / 改密码 ---------------- */
api.patch('/me/profile', requireAuth, (req, res) => {
  const u = req.user;
  const account = str(req.body?.account).toLowerCase() || u.account;
  const name = str(req.body?.name) || u.name;
  if (!account) return bad(res, 400, '账号不能为空');
  if (account !== u.account) {
    const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(account);
    const isPhone = /^1\d{10}$/.test(account);
    if (!isEmail && !isPhone) return bad(res, 400, '账号格式有误：请填写有效邮箱或 11 位手机号');
    if (get('SELECT id FROM users WHERE lower(account) = ? AND id != ?', account, u.id)) {
      return bad(res, 409, '该账号已被占用，请更换', 'DUPLICATE_ACCOUNT');
    }
    run('UPDATE users SET account = ? WHERE id = ?', account, u.id);
  }
  if (name !== u.name) {
    if (name.length > 20) return bad(res, 400, '姓名过长');
    run('UPDATE users SET name = ? WHERE id = ?', name, u.id);
  }
  audit({ user: u, action: 'me.profile.update', objectType: 'user', objectId: u.id, detail: { account, name } });
  res.json({ user: publicUser(get('SELECT * FROM users WHERE id = ?', u.id)) });
});

api.post('/me/password', requireAuth, (req, res) => {
  const oldPassword = String(req.body?.oldPassword ?? '');
  const newPassword = String(req.body?.newPassword ?? '');
  if (!verifyPassword(oldPassword, req.user.password_hash)) {
    audit({ user: req.user, action: 'me.password.change', objectType: 'user', objectId: req.user.id, result: 'denied', detail: { reason: 'bad_old_password' } });
    return bad(res, 400, '当前密码不正确', 'BAD_OLD_PASSWORD');
  }
  if (newPassword.length < 6) return bad(res, 400, '新密码至少 6 位', 'PASSWORD_TOO_SHORT');
  if (newPassword === oldPassword) return bad(res, 400, '新密码不能与当前密码相同');
  run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(newPassword), req.user.id);
  // 其他设备上的会话立即失效，当前会话保留
  run('DELETE FROM sessions WHERE user_id = ? AND token != ?', req.user.id, req.token);
  audit({ user: req.user, action: 'me.password.change', objectType: 'user', objectId: req.user.id });
  res.json({ ok: true });
});

/* =====================================================================
   岗位：列表 / 详情 / 发布 / 条件版本 / 澄清 / 面试官 / 挂起结束
===================================================================== */
api.get('/jobs', requireAuth, requireCap('job.view'), (req, res) => {
  const jobs = visibleJobs(req.user).map((j) => jobSummary(req.user, j));
  res.json({ jobs, canPublish: canPublishJob(req.user), role: req.user.role });
});

api.get('/jobs/:id', requireAuth, (req, res) => {
  const job = get('SELECT * FROM jobs WHERE id = ?', req.params.id);
  if (!job) return bad(res, 404, '岗位不存在', 'NOT_FOUND');
  if (!canViewJob(req.user, job)) {
    audit({ user: req.user, action: 'denied.job.view', objectType: 'job', objectId: job.id, result: 'denied' });
    return bad(res, 403, '无权查看该岗位（岗位维度隔离）', 'FORBIDDEN_SCOPE');
  }
  const cond = activeCondition(job.id);
  const versions = all('SELECT version,status,confirmed_by,confirmed_at,note,created_at FROM job_conditions WHERE job_id = ? ORDER BY version DESC', job.id);
  const clarifications = all('SELECT * FROM clarifications WHERE job_id = ? ORDER BY asked_at DESC', job.id).map((c) => ({
    ...c, askedByUser: userBrief(c.asked_by), answeredByUser: userBrief(c.answered_by),
  }));
  const analysisRow = get('SELECT * FROM job_analyses WHERE job_id = ? ORDER BY created_at DESC LIMIT 1', job.id);
  let analysis = null;
  if (analysisRow) {
    try {
      analysis = {
        ...JSON.parse(analysisRow.content),
        conditionVersion: analysisRow.condition_version,
        createdAt: analysisRow.created_at,
        by: userBrief(analysisRow.created_by)?.name || '',
        stale: analysisRow.condition_version !== (cond?.version || job.current_version),
      };
    } catch { analysis = null; }
  }
  res.json({
    job: {
      ...jobSummary(req.user, job),
      condition: cond ? { version: cond.version, criteria: JSON.parse(cond.criteria), confirmedBy: userBrief(cond.confirmed_by), confirmedAt: cond.confirmed_at, note: cond.note, status: cond.status } : null,
      versions, clarifications, analysis,
      stats: {
        total: get('SELECT COUNT(*) c FROM applications WHERE job_id = ?', job.id).c,
        pendingReview: get("SELECT COUNT(*) c FROM applications WHERE job_id = ? AND status='pending_review'", job.id).c,
        recommended: get("SELECT COUNT(*) c FROM applications WHERE job_id = ? AND status='recommended'", job.id).c,
        hired: get("SELECT COUNT(*) c FROM applications WHERE job_id = ? AND status='hired'", job.id).c,
      },
    },
  });
});

function validateCriteria(criteria) {
  if (!Array.isArray(criteria) || criteria.length === 0) return '至少配置一条岗位条件';
  let sum = 0;
  for (const c of criteria) {
    // 判定规则改为选填：用人部门只需写清条件名称、类型与权重，细则由专员追问澄清
    if (!str(c.id) || !str(c.name)) return '条件编号与条件名称为必填';
    const w = Number(c.weight);
    if (!Number.isFinite(w) || w <= 0) return '条件权重必须为正数';
    sum += w;
  }
  if (Math.round(sum) !== 100) return `条件权重合计需为 100%（当前 ${Math.round(sum)}%）`;
  return null;
}

/** 条件归一化：判定规则选填，缺省留空（解析时用条件名兜底） */
function normalizeCriteria(criteria) {
  return (criteria || []).map((c) => ({
    id: str(c.id),
    name: str(c.name),
    type: c.type === '加分' ? '加分' : '必备',
    weight: Number(c.weight),
    rule: str(c.rule),
  }));
}

api.post('/jobs', requireAuth, requireCap('job.publish'), (req, res) => {
  if (!canPublishJob(req.user)) return bad(res, 403, '仅用人部门经理可发布岗位需求', 'FORBIDDEN_ROLE');
  const name = str(req.body?.name);
  const description = str(req.body?.description);
  const headcount = int(req.body?.headcount, 0);
  const criteria = req.body?.criteria;
  if (!name || !description) return bad(res, 400, '岗位名称与需求描述为必填');
  if (headcount < 1) return bad(res, 400, '招聘人数需为大于 0 的整数');
  const err = validateCriteria(criteria);
  if (err) return bad(res, 400, err);
  if (req.body?.confirmed !== true) return bad(res, 400, '请先确认条件可作为筛选依据（BR-02）');

  const id = uuid('J-');
  const ts = nowISO();
  const normalized = normalizeCriteria(criteria);
  const ownerId = str(req.body?.ownerId) || null;
  if (ownerId) {
    const owner = get('SELECT * FROM users WHERE id = ?', ownerId);
    if (!owner || owner.role !== 'specialist' || owner.status !== 'enabled') {
      return bad(res, 400, '负责专员必须是状态正常的招聘专员账号');
    }
  }
  run(
    'INSERT INTO jobs (id,code,name,dept,headcount,description,status,owner_id,requester_id,clarify_needed,current_version,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    id, null, name, req.user.dept, headcount, description, 'active', ownerId, req.user.id, 0, 1, ts
  );
  if (ownerId) {
    run('INSERT INTO job_members (id,job_id,user_id,role_on_job,created_at) VALUES (?,?,?,?,?)', uuid('JM'), id, ownerId, 'owner', ts);
    notify({ userIds: [ownerId], type: 'job_assigned', refType: 'job', refId: id, title: '你被指派负责新岗位', body: `${name} · ${req.user.name} 发布并指派你负责筛选与推荐` });
  }
  run('INSERT INTO job_conditions (id,job_id,version,criteria,status,confirmed_by,confirmed_at,note,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    uuid('JC'), id, 1, JSON.stringify(normalized), 'confirmed', req.user.id, ts, '发布时由部门经理确认', ts);
  audit({ user: req.user, action: 'job.publish', objectType: 'job', objectId: id, detail: { name, criteria: normalized } });
  transition({ entityType: 'job', entityId: id, to: 'active', byUser: req.user.id, note: '发布岗位需求' });
  res.status(201).json({ job: jobSummary(req.user, get('SELECT * FROM jobs WHERE id = ?', id)) });
});

api.post('/jobs/:id/conditions', requireAuth, requireCap('job.condition.confirm'), (req, res) => {
  const job = get('SELECT * FROM jobs WHERE id = ?', req.params.id);
  if (!job) return bad(res, 404, '岗位不存在');
  if (!canConfirmCondition(req.user, job)) return bad(res, 403, '仅该部门经理可变更岗位条件', 'FORBIDDEN_SCOPE');
  const err = validateCriteria(req.body?.criteria);
  if (err) return bad(res, 400, err);
  const latest = activeCondition(job.id);
  const version = (latest?.version || 0) + 1;
  const ts = nowISO();
  run('INSERT INTO job_conditions (id,job_id,version,criteria,status,confirmed_by,confirmed_at,note,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    uuid('JC'), job.id, version, JSON.stringify(normalizeCriteria(req.body.criteria)), 'confirmed', req.user.id, ts, str(req.body?.note) || '条件变更', ts);
  run('UPDATE jobs SET current_version = ? WHERE id = ?', version, job.id);
  audit({ user: req.user, action: 'job.condition.change', objectType: 'job', objectId: job.id, detail: { version, note: str(req.body?.note) } });
  res.json({ job: jobSummary(req.user, get('SELECT * FROM jobs WHERE id = ?', job.id)), version });
});

/* ---------------- 岗位画像分析（大模型解读岗位描述 + 条件） ---------------- */
api.post('/jobs/:id/analysis', requireAuth, async (req, res) => {
  const job = get('SELECT * FROM jobs WHERE id = ?', req.params.id);
  if (!job) return bad(res, 404, '岗位不存在');
  if (!canViewJob(req.user, job)) return bad(res, 403, '无权查看该岗位', 'FORBIDDEN_SCOPE');
  const cond = activeCondition(job.id);
  const criteria = cond ? JSON.parse(cond.criteria) : [];
  if (!criteria.length) return bad(res, 400, '该岗位尚未确认条件，无法生成画像');
  const clarifications = all('SELECT * FROM clarifications WHERE job_id = ? ORDER BY asked_at DESC LIMIT 12', job.id);
  try {
    const r = await analyzeJob({
      jobName: job.name, dept: job.dept, description: job.description, criteria, clarifications,
    });
    const id = uuid('JA-');
    run('INSERT INTO job_analyses (id,job_id,condition_version,content,model,created_by,created_at) VALUES (?,?,?,?,?,?,?)',
      id, job.id, cond.version, JSON.stringify(r), r.model || null, req.user.id, nowISO());
    audit({ user: req.user, action: 'job.analysis.generate', objectType: 'job', objectId: job.id, detail: { version: cond.version, source: r.source } });
    res.status(201).json({ analysis: { ...r, conditionVersion: cond.version, createdAt: nowISO(), by: req.user.name, stale: false }, notice: r.source === 'fallback' ? '大模型暂不可用，已用条件兜底生成：' + (r.error || '') : null });
  } catch (e) {
    bad(res, 502, '画像分析失败：' + e.message, 'ANALYSIS_FAILED');
  }
});

api.post('/jobs/:id/clarifications', requireAuth, requireCap('clarify.create'), (req, res) => {
  const job = get('SELECT * FROM jobs WHERE id = ?', req.params.id);
  if (!job) return bad(res, 404, '岗位不存在');
  if (!isJobOwner(req.user, job.id)) return bad(res, 403, '仅负责该岗位的招聘专员可发起追问', 'FORBIDDEN_SCOPE');
  const question = str(req.body?.question);
  if (!question) return bad(res, 400, '追问内容不能为空');
  const parentId = str(req.body?.parentId) || null;
  if (parentId && !get('SELECT id FROM clarifications WHERE id = ? AND job_id = ?', parentId, job.id)) {
    return bad(res, 400, '被追问的记录不属于该岗位');
  }
  const cid = uuid('CL');
  run('INSERT INTO clarifications (id,job_id,version,question,asked_by,asked_at,state,parent_id) VALUES (?,?,?,?,?,?,?,?)',
    cid, job.id, job.current_version, question, req.user.id, nowISO(), 'pending', parentId);
  run('UPDATE jobs SET clarify_needed = 1 WHERE id = ?', job.id);
  // 追问要同时叫上提出人与本部门面试官，避免没人接
  const targets = new Set([
    job.requester_id,
    ...deptManagers(job.dept),
    ...interviewersOf(job.id),
  ].filter(Boolean));
  notify({
    userIds: [...targets], type: 'clarification', refType: 'job', refId: job.id,
    title: parentId ? '招聘专员追问岗位需求' : '岗位需求澄清待回复', body: question,
  });
  audit({ user: req.user, action: parentId ? 'clarification.followup' : 'clarification.create', objectType: 'job', objectId: job.id, detail: { question, parentId } });
  res.status(201).json({ ok: true, id: cid });
});

api.post('/clarifications/:id/reply', requireAuth, (req, res) => {
  const c = get('SELECT * FROM clarifications WHERE id = ?', req.params.id);
  if (!c) return bad(res, 404, '澄清记录不存在');
  const job = get('SELECT * FROM jobs WHERE id = ?', c.job_id);
  // 用人部门的人都可以解答：本部门经理 + 被指派的面试官
  const isDept = req.user.role === 'deptmgr' && req.user.dept === job.dept;
  const isIv = req.user.role === 'interviewer' && req.user.dept === job.dept && isInterviewer(req.user, job.id);
  if (!isDept && !isIv) {
    audit({ user: req.user, action: 'denied.clarification.reply', objectType: 'job', objectId: job.id, result: 'denied' });
    return bad(res, 403, '仅该用人部门的经理或面试官可解答澄清', 'FORBIDDEN_SCOPE');
  }
  const answer = str(req.body?.answer);
  if (!answer) return bad(res, 400, '回复内容不能为空');
  run('UPDATE clarifications SET answer = ?, answered_by = ?, answered_at = ?, state = ? WHERE id = ?', answer, req.user.id, nowISO(), 'answered', c.id);
  const open = get("SELECT COUNT(*) c FROM clarifications WHERE job_id = ? AND state='pending'", job.id).c;
  if (open === 0) run('UPDATE jobs SET clarify_needed = 0 WHERE id = ?', job.id);
  // 回给提问的专员（以及岗位负责人）
  const ownerIds = new Set([
    c.asked_by,
    ...all("SELECT user_id FROM job_members WHERE job_id = ? AND role_on_job='owner'", job.id).map((r) => r.user_id),
  ].filter(Boolean));
  notify({
    userIds: [...ownerIds], type: 'clarification_reply', refType: 'job', refId: job.id,
    title: '用人部门已解答你的追问', body: `${job.name}：${answer.slice(0, 80)}`,
  });
  audit({ user: req.user, action: 'clarification.reply', objectType: 'job', objectId: job.id, detail: { answer } });
  res.json({ ok: true });
});

api.get('/specialists', requireAuth, (req, res) => {
  const rows = all("SELECT id,name,account,dept FROM users WHERE role='specialist' AND status='enabled' ORDER BY name");
  res.json({ specialists: rows });
});

api.get('/dept-members', requireAuth, (req, res) => {
  const members = all("SELECT id,name,account,role,dept FROM users WHERE dept = ? AND status='enabled' ORDER BY role, name", req.user.dept)
    .map((u) => ({ ...u, roleLabel: ROLE_LABEL[u.role] }));
  res.json({ members, dept: req.user.dept });
});

api.post('/jobs/:id/interviewers', requireAuth, requireCap('interviewer.assign'), (req, res) => {
  const job = get('SELECT * FROM jobs WHERE id = ?', req.params.id);
  if (!job) return bad(res, 404, '岗位不存在');
  if (!canAssignInterviewer(req.user, job)) return bad(res, 403, '仅该部门经理可指派本部门面试官', 'FORBIDDEN_SCOPE');
  const ids = Array.isArray(req.body?.userIds) ? req.body.userIds : [];
  const valid = ids.filter((id) => {
    const u = get('SELECT * FROM users WHERE id = ?', id);
    return u && u.dept === req.user.dept && u.status === 'enabled';
  });
  if (valid.length !== ids.length) return bad(res, 400, '只能指派本部门且状态正常的成员', 'CROSS_DEPT_DENIED');
  run("DELETE FROM job_members WHERE job_id = ? AND role_on_job = 'interviewer'", job.id);
  for (const id of valid) {
    run('INSERT INTO job_members (id,job_id,user_id,role_on_job,created_at) VALUES (?,?,?,?,?)', uuid('JM'), job.id, id, 'interviewer', nowISO());
    notify({ userIds: [id], type: 'assignment', refType: 'job', refId: job.id, title: '你被指派为面试官', body: `${job.name} · ${req.user.name} 指派你参与面试与用人结果反馈` });
  }
  audit({ user: req.user, action: 'job.interviewer.assign', objectType: 'job', objectId: job.id, detail: { userIds: valid } });
  res.json({ job: jobSummary(req.user, get('SELECT * FROM jobs WHERE id = ?', job.id)) });
});

api.post('/jobs/:id/status', requireAuth, (req, res) => {
  const job = get('SELECT * FROM jobs WHERE id = ?', req.params.id);
  if (!job) return bad(res, 404, '岗位不存在');
  if (!(req.user.role === 'deptmgr' && req.user.dept === job.dept)) return bad(res, 403, '仅该部门经理可变更需求状态', 'FORBIDDEN_SCOPE');
  const next = str(req.body?.status);
  if (!['active', 'suspended', 'closed'].includes(next)) return bad(res, 400, '非法状态');
  if (next === 'suspended' && !str(req.body?.reason)) return bad(res, 400, '挂起需填写原因（C14 口径待确认，先人工触发）');
  run('UPDATE jobs SET status = ?, suspend_reason = ?, closed_at = ?, closed_by = ? WHERE id = ?',
    next, next === 'suspended' ? str(req.body?.reason) : job.suspend_reason,
    next === 'closed' ? nowISO() : null, next === 'closed' ? req.user.id : null, job.id);
  audit({ user: req.user, action: 'job.status.' + next, objectType: 'job', objectId: job.id, detail: { reason: str(req.body?.reason) } });
  transition({ entityType: 'job', entityId: job.id, from: job.status, to: next, byUser: req.user.id, note: str(req.body?.reason) || null });
  res.json({ job: jobSummary(req.user, get('SELECT * FROM jobs WHERE id = ?', job.id)) });
});

/* =====================================================================
   简历：上传 / 列表 / 详情 / 解析 / 不推荐
===================================================================== */
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    cb(ok ? null : new Error('仅支持 PDF 简历'), ok);
  },
});

api.get('/applications', requireAuth, requireCap('resume.view'), (req, res) => {
  const jobs = visibleJobs(req.user);
  const allowed = new Set(jobs.map((j) => j.id));
  let rows = all('SELECT * FROM applications ORDER BY created_at DESC');
  if (req.query.jobId) rows = rows.filter((r) => r.job_id === req.query.jobId);
  rows = rows.filter((r) => allowed.has(r.job_id));
  res.json({
    applications: rows.map((r) => applicationRow(req.user, r)),
    jobs: jobs.map((j) => ({ id: j.id, name: j.name, dept: j.dept, status: j.status, version: j.current_version })),
  });
});

api.get('/applications/:id', requireAuth, (req, res) => {
  const app = get('SELECT * FROM applications WHERE id = ?', req.params.id);
  if (!app) return bad(res, 404, '简历不存在');
  if (!canSeeApplication(req.user, app)) {
    audit({ user: req.user, action: 'denied.resume.view', objectType: 'application', objectId: app.id, result: 'denied' });
    return bad(res, 403, '无权查看该简历（岗位维度隔离：仅本人负责岗位可见）', 'FORBIDDEN_SCOPE');
  }
  const job = get('SELECT * FROM jobs WHERE id = ?', app.job_id);
  const parsed = parsedOf(app.id);
  const rec = recOf(app.id);
  const timeline = all('SELECT * FROM state_transitions WHERE entity_type = ? AND entity_id = ? ORDER BY at', 'application', app.id)
    .map((t) => ({ ...t, byUser: userBrief(t.by_user)?.name || t.by_user }));
  res.json({
    application: applicationRow(req.user, app),
    resumeText: app.resume_text,
    job: jobSummary(req.user, job),
    parsed: parsed ? { ...parsed, criteria: parsed.criteria, questions: parsed.questions } : null,
    recommendation: rec,
    timeline,
    can: {
      parse: req.user.role === 'specialist' && isJobOwner(req.user, job.id) && app.parse_status !== 'parsing',
      recommend: req.user.role === 'specialist' && isJobOwner(req.user, job.id) && ['pending_review', 'need_info'].includes(app.status),
      notRecommend: req.user.role === 'specialist' && isJobOwner(req.user, job.id) && ['pending_review', 'need_info'].includes(app.status),
        interview: req.user.role === 'specialist' && isJobOwner(req.user, job.id) && app.status === 'interview_pending',
      offer: req.user.role === 'specialist' && isJobOwner(req.user, job.id) && app.status === 'interviewed',
      onboard: req.user.role === 'specialist' && isJobOwner(req.user, job.id) && app.status === 'offered',
    },
  });
});

api.get('/applications/:id/file', requireAuth, (req, res) => {
  const app = get('SELECT * FROM applications WHERE id = ?', req.params.id);
  if (!app) return bad(res, 404, '简历不存在');
  if (!canSeeApplication(req.user, app)) {
    audit({ user: req.user, action: 'denied.resume.file', objectType: 'application', objectId: app.id, result: 'denied' });
    return bad(res, 403, '无权查看该简历原件（岗位维度隔离）', 'FORBIDDEN_SCOPE');
  }
  const abs = path.resolve(ROOT, app.file_path);
  if (!fs.existsSync(abs)) return bad(res, 404, '简历文件已丢失');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(app.file_name || 'resume.pdf')}"`);
  fs.createReadStream(abs).pipe(res);
});

api.post('/applications', requireAuth, requireCap('resume.upload'), upload.single('file'), async (req, res) => {
  try {
    const job = get('SELECT * FROM jobs WHERE id = ?', req.body?.jobId);
    if (!job) {
      if (req.file) fs.unlinkSync(req.file.path);
      return bad(res, 404, '岗位不存在');
    }
    if (!isJobOwner(req.user, job.id)) {
      if (req.file) fs.unlinkSync(req.file.path);
      audit({ user: req.user, action: 'denied.resume.upload', objectType: 'job', objectId: job.id, result: 'denied' });
      return bad(res, 403, '仅该岗位负责专员可上传简历', 'FORBIDDEN_SCOPE');
    }
    if (String(req.body?.intentConfirmed) !== 'true') {
      if (req.file) fs.unlinkSync(req.file.path);
      return bad(res, 400, '未确认候选人面试意向，不得进入录入流程（R33/E10）', 'INTENT_REQUIRED');
    }
    if (!req.file) return bad(res, 400, '请选择 PDF 简历文件');
    const text = await extractPdfText(req.file.path);
    if (!text || text.length < 30) {
      fs.unlinkSync(req.file.path);
      return bad(res, 422, '未能从该 PDF 提取到有效文本（可能是扫描件），请先转为可复制文本的 PDF 或人工录入关键信息', 'PDF_UNREADABLE');
    }
    const fallback = str(req.body?.candidateName) || req.file.originalname;
    const meta = guessCandidateMeta(text, fallback);
    // 专员手动填写的信息优先于自动识别结果（留空则用识别值）
    const finalName = str(req.body?.candidateName) || meta.name;
    const finalPhone = str(req.body?.phone) || meta.phone;
    const finalEmail = str(req.body?.email) || meta.email;
    const rel = path.relative(ROOT, req.file.path).replace(/\\/g, '/');
    const dupe = get('SELECT id,candidate_name FROM applications WHERE job_id = ? AND candidate_name = ?', job.id, finalName);
    const id = uuid('A-');
    run(
      `INSERT INTO applications (id,job_id,candidate_name,candidate_email,phone,file_path,file_name,version,intent_confirmed,intent_method,intent_at,status,parse_status,resume_text,dupe_hint,uploaded_by,source,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id, job.id, finalName, finalEmail, finalPhone, rel, req.file.originalname, 1, 1, str(req.body?.intentMethod) || '电话', nowISO(),
      'waiting_parse', 'pending', text, dupe ? `同岗位已存在同名候选人「${dupe.candidate_name}」，请人工核对是否重复，系统不自动合并（R24/E8）` : null, req.user.id, str(req.body?.source) || null, nowISO()
    );
    audit({ user: req.user, action: 'resume.upload', objectType: 'application', objectId: id, detail: { jobId: job.id, name: finalName, source: str(req.body?.source) || null } });
    res.status(201).json({ application: applicationRow(req.user, get('SELECT * FROM applications WHERE id = ?', id)), dupeHint: dupe ? true : false });
  } catch (e) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: '上传失败：' + e.message, code: 'UPLOAD_FAILED' });
  }
});

api.post('/applications/:id/parse', requireAuth, requireCap('resume.parse'), async (req, res) => {
  const app = get('SELECT * FROM applications WHERE id = ?', req.params.id);
  if (!app) return bad(res, 404, '简历不存在');
  const job = get('SELECT * FROM jobs WHERE id = ?', app.job_id);
  if (!isJobOwner(req.user, job.id)) return bad(res, 403, '仅该岗位负责专员可触发解析', 'FORBIDDEN_SCOPE');
  if (app.parse_status === 'parsing') return bad(res, 409, '该简历正在解析中，请稍后刷新');
  const cond = activeCondition(job.id);
  if (!cond) return bad(res, 400, '该岗位尚未确认条件版本，不能解析（BR-02）');
  run("UPDATE applications SET parse_status='parsing',status='parsing',parse_error=NULL WHERE id=?", app.id);
  try {
    const r = await parseResume({ jobName: job.name, criteria: JSON.parse(cond.criteria), resumeText: app.resume_text });
    run(
      `INSERT INTO parsed_results (id,application_id,condition_version,score,grade,tags,criteria,questions,model,prompt_version,evidence_missing,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      uuid('PR'), app.id, cond.version, r.score, r.grade, JSON.stringify(r.tags), JSON.stringify(r.criteria),
      JSON.stringify(r.questions), r.model, r.promptVersion, r.evidenceMissing ? 1 : 0, nowISO()
    );
    run("UPDATE applications SET parse_status='done',status='pending_review' WHERE id=?", app.id);
    transition({ entityType: 'application', entityId: app.id, from: 'parsing', to: 'pending_review', byUser: req.user.id, note: `解析完成，条件版本 v${cond.version}` });
    audit({ user: req.user, action: 'resume.parse', objectType: 'application', objectId: app.id, detail: { score: r.score, grade: r.grade, warnings: r.warnings } });
    res.json({ ok: true, parsed: parsedOf(app.id), warnings: r.warnings });
  } catch (e) {
    run("UPDATE applications SET parse_status='failed',status='waiting_parse',parse_error=? WHERE id=?", String(e.message).slice(0, 500), app.id);
    audit({ user: req.user, action: 'resume.parse', objectType: 'application', objectId: app.id, result: 'failed', detail: { error: e.message } });
    bad(res, 502, '解析失败：' + e.message, 'PARSE_FAILED');
  }
});

api.post('/applications/:id/not-recommend', requireAuth, (req, res) => {
  const app = get('SELECT * FROM applications WHERE id = ?', req.params.id);
  if (!app) return bad(res, 404, '简历不存在');
  const job = get('SELECT * FROM jobs WHERE id = ?', app.job_id);
  if (!isJobOwner(req.user, job.id)) return bad(res, 403, '仅该岗位负责专员可操作', 'FORBIDDEN_SCOPE');
  const reason = str(req.body?.reason);
  if (!reason) return bad(res, 400, '请填写不推荐原因（人工决策留痕，非 AI 淘汰）');
  run("UPDATE applications SET status='not_recommended' WHERE id=?", app.id);
  transition({ entityType: 'application', entityId: app.id, from: app.status, to: 'not_recommended', byUser: req.user.id, note: reason });
  audit({ user: req.user, action: 'resume.not_recommend', objectType: 'application', objectId: app.id, detail: { reason } });
  res.json({ ok: true });
});

/* =====================================================================
   推荐：草稿 / 提交 / 撤回 / 详情
===================================================================== */
api.post('/applications/:id/recommend/draft', requireAuth, requireCap('recommend.submit'), async (req, res) => {
  const app = get('SELECT * FROM applications WHERE id = ?', req.params.id);
  if (!app) return bad(res, 404, '简历不存在');
  const job = get('SELECT * FROM jobs WHERE id = ?', app.job_id);
  if (!isJobOwner(req.user, job.id)) return bad(res, 403, '仅该岗位负责专员可生成推荐草稿', 'FORBIDDEN_SCOPE');
  const parsed = parsedOf(app.id);
  if (!parsed) return bad(res, 400, '请先完成 AI 解析，再生成推荐草稿');
  const draft = await draftRecommendation({ candidate: app.candidate_name, jobName: job.name, parsed });
  res.json({
    draft: { ...draft, questions: parsed.questions },
    notice: draft.source === 'fallback' ? '大模型草稿生成失败，已用解析结论拼装草稿：' + (draft.error || '') : null,
  });
});

api.post('/applications/:id/recommend', requireAuth, requireCap('recommend.submit'), (req, res) => {
  const app = get('SELECT * FROM applications WHERE id = ?', req.params.id);
  if (!app) return bad(res, 404, '简历不存在');
  const job = get('SELECT * FROM jobs WHERE id = ?', app.job_id);
  if (!isJobOwner(req.user, job.id)) return bad(res, 403, '仅该岗位负责专员可提交推荐', 'FORBIDDEN_SCOPE');
  if (!app.intent_confirmed) return bad(res, 400, '候选人面试意向未确认，无法提交推荐（R33）', 'INTENT_REQUIRED');
  if (!['pending_review', 'need_info'].includes(app.status)) return bad(res, 409, `当前状态（${APP_STATUS_LABEL[app.status]}）不可提交推荐`);
  const parsed = parsedOf(app.id);
  if (!parsed) return bad(res, 400, '未完成解析，不能提交推荐');
  const reason = str(req.body?.reason);
  const gap = str(req.body?.gap);
  if (!reason || !gap) return bad(res, 400, '推荐理由与差距说明均为必填');
  const recId = uuid('R-');
  run(`INSERT INTO recommendations (id,application_id,job_id,reason,gap,questions,draft_source,submitted_by,submitted_at,status)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    recId, app.id, job.id, reason, gap, JSON.stringify(parsed.questions), str(req.body?.draftSource) || 'manual', req.user.id, nowISO(), 'pending');
  run("UPDATE applications SET status='recommended' WHERE id=?", app.id);
  transition({ entityType: 'application', entityId: app.id, from: app.status, to: 'recommended', byUser: req.user.id, note: '人工提交推荐' });
  const deptMgrIds = all("SELECT id FROM users WHERE role='deptmgr' AND dept=? AND status='enabled'", job.dept).map((r) => r.id);
  notify({ userIds: deptMgrIds, type: 'recommendation', refType: 'recommendation', refId: recId, title: '新的推荐待反馈', body: `${app.candidate_name} · ${job.name}` });
  audit({ user: req.user, action: 'recommendation.submit', objectType: 'recommendation', objectId: recId, detail: { applicationId: app.id } });
  res.status(201).json({ recommendation: recOf(app.id) });
});

api.post('/recommendations/:id/withdraw', requireAuth, requireCap('recommend.withdraw'), (req, res) => {
  const rec = get('SELECT * FROM recommendations WHERE id = ?', req.params.id);
  if (!rec) return bad(res, 404, '推荐不存在');
  const job = get('SELECT * FROM jobs WHERE id = ?', rec.job_id);
  if (rec.submitted_by !== req.user.id) return bad(res, 403, '仅推荐提交人可撤回', 'FORBIDDEN_SCOPE');
  if (rec.status !== 'pending') return bad(res, 409, '部门已反馈，无法撤回；如需调整请与部门沟通或要求补充信息', 'CANNOT_WITHDRAW');
  const reason = str(req.body?.reason);
  if (!reason) return bad(res, 400, '撤回需填写原因');
  run("UPDATE recommendations SET status='withdrawn',withdrawn_at=?,withdraw_reason=? WHERE id=?", nowISO(), reason, rec.id);
  run("UPDATE applications SET status='pending_review' WHERE id=?", rec.application_id);
  audit({ user: req.user, action: 'recommendation.withdraw', objectType: 'recommendation', objectId: rec.id, detail: { reason } });
  transition({ entityType: 'application', entityId: rec.application_id, from: 'recommended', to: 'pending_review', byUser: req.user.id, note: '撤回推荐：' + reason });
  res.json({ ok: true });
});

api.get('/recommendations/:id', requireAuth, (req, res) => {
  const rec = get('SELECT * FROM recommendations WHERE id = ?', req.params.id);
  if (!rec) return bad(res, 404, '推荐不存在');
  const app = get('SELECT * FROM applications WHERE id = ?', rec.application_id);
  if (!canSeeApplication(req.user, app)) return bad(res, 403, '无权查看该推荐材料', 'FORBIDDEN_SCOPE');
  const job = get('SELECT * FROM jobs WHERE id = ?', rec.job_id);
  const parsed = parsedOf(app.id);
  const feedbacks = all('SELECT * FROM feedbacks WHERE recommendation_id = ? ORDER BY created_at DESC', rec.id)
    .map((f) => ({ ...f, byUser: userBrief(f.by_user)?.name, decisionLabel: DECISION_LABEL[f.decision] }));
  res.json({
    recommendation: {
      ...recOf(app.id),
      feedbacks,
    },
    application: applicationRow(req.user, app),
    resumeText: app.resume_text,
    file: `/api/applications/${app.id}/file`,
    job: jobSummary(req.user, job),
    parsed,
    can: {
      decide: canDecideFeedback(req.user, job) && rec.status === 'pending',
      evaluate: canEvaluateOutcome(req.user, job),
      withdraw: rec.submitted_by === req.user.id && rec.status === 'pending',
      // 同意面试后，由本部门面试官/经理做录用决定（已录用/已入职则不再重复决定）
      hireDecide: canHireDecide(req.user, job) && rec.status === 'agreed' && app.status !== 'hired' && app.status !== 'offer_failed',
      interviewStage: rec.status === 'agreed',
      decided: ['hired', 'offer_failed'].includes(app.status),
    },
    hired: app.status === 'hired',
    onboardingId: get('SELECT id FROM onboardings WHERE application_id = ?', app.id)?.id || null,
    appStatus: app.status,
    appStatusLabel: APP_STATUS_LABEL[app.status] || app.status,
  });
});

/* =====================================================================
   部门反馈：列表 / 决策
===================================================================== */
api.get('/feedbacks', requireAuth, requireCap('feedback.view'), (req, res) => {
  const jobs = visibleJobs(req.user);
  const allowed = new Set(jobs.map((j) => j.id));
  const rows = all('SELECT * FROM recommendations WHERE status != ? ORDER BY submitted_at DESC', 'withdrawn')
    .filter((r) => allowed.has(r.job_id));
  const workdays = (iso) => {
    const start = new Date(iso).getTime();
    let days = Math.max(0, Math.floor((Date.now() - start) / 86400000));
    return days;
  };
  const items = rows.map((r) => {
    const app = get('SELECT * FROM applications WHERE id = ?', r.application_id);
    const job = get('SELECT * FROM jobs WHERE id = ?', r.job_id);
    const fb = get('SELECT * FROM feedbacks WHERE recommendation_id = ? ORDER BY created_at DESC LIMIT 1', r.id);
    return {
      id: r.id, candidate: app.candidate_name, jobId: job.id, jobName: job.name, dept: job.dept,
      status: r.status, submittedAt: r.submitted_at, submittedBy: userBrief(r.submitted_by)?.name,
      appStatus: app.status, decided: ['hired', 'offer_failed'].includes(app.status),
      waitDays: workdays(r.submitted_at),
      feedback: fb ? { decision: fb.decision, decisionLabel: DECISION_LABEL[fb.decision], reason: fb.reason, detail: fb.detail, request: fb.request, by: userBrief(fb.by_user)?.name, at: fb.created_at } : null,
      canDecide: canDecideFeedback(req.user, job) && r.status === 'pending',
    };
  });
  res.json({ items, role: req.user.role });
});

api.post('/recommendations/:id/feedback', requireAuth, requireCap('feedback.decide'), (req, res) => {
  const rec = get('SELECT * FROM recommendations WHERE id = ?', req.params.id);
  if (!rec) return bad(res, 404, '推荐不存在');
  const job = get('SELECT * FROM jobs WHERE id = ?', rec.job_id);
  if (!canDecideFeedback(req.user, job)) {
    audit({ user: req.user, action: 'denied.feedback.decide', objectType: 'recommendation', objectId: rec.id, result: 'denied' });
    return bad(res, 403, '面试决定仅由该用人部门经理做出（R4）', 'FORBIDDEN_ROLE');
  }
  if (rec.status !== 'pending') return bad(res, 409, '该推荐已完成反馈，不能重复提交');
  const decision = str(req.body?.decision);
  if (!['agree', 'reject', 'need_info'].includes(decision)) return bad(res, 400, '请选择反馈结论：同意面试 / 拒绝面试 / 需要补充信息');
  const reason = str(req.body?.reason);
  const detail = str(req.body?.detail);
  const request = str(req.body?.request);
  if (decision === 'reject' && !reason) return bad(res, 400, '拒绝面试必须填写原因（R18）', 'REASON_REQUIRED');
  if (decision === 'need_info' && !request) return bad(res, 400, '请填写需要补充的材料或说明');
  if (decision === 'agree' && !detail) return bad(res, 400, '请填写面试反馈或安排说明，便于专员跟进排期');

  run('INSERT INTO feedbacks (id,recommendation_id,decision,reason,detail,expect_time,request,by_user,by_role,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    uuid('F-'), rec.id, decision, reason || null, detail || null, str(req.body?.expectTime) || null, request || null, req.user.id, req.user.role, nowISO());
  const recStatus = { agree: 'agreed', reject: 'rejected', need_info: 'need_info' }[decision];
  const appStatus = { agree: 'interview_pending', reject: 'rejected', need_info: 'need_info' }[decision];
  run('UPDATE recommendations SET status = ? WHERE id = ?', recStatus, rec.id);
  run('UPDATE applications SET status = ? WHERE id = ?', appStatus, rec.application_id);
  transition({ entityType: 'application', entityId: rec.application_id, to: appStatus, byUser: req.user.id, note: DECISION_LABEL[decision] + (reason ? '：' + reason : '') });

  const app = get('SELECT * FROM applications WHERE id = ?', rec.application_id);
  const recipients = [
    ...all("SELECT user_id FROM job_members WHERE job_id = ? AND role_on_job='owner'", job.id).map((r) => r.user_id),
    ...all("SELECT id FROM users WHERE role='manager' AND status='enabled'").map((r) => r.id),
  ];
  notify({
    userIds: recipients, type: 'dept_feedback', refType: 'recommendation', refId: rec.id,
    title: `部门反馈：${DECISION_LABEL[decision]}`,
    body: `${app.candidate_name} · ${job.name}${reason ? '｜原因：' + reason : ''}${detail ? '｜' + detail : ''}${request ? '｜补充要求：' + request : ''}`,
  });
  audit({ user: req.user, action: 'feedback.decide', objectType: 'recommendation', objectId: rec.id, detail: { decision, reason, detail, request } });
  res.status(201).json({ ok: true, status: recStatus });
});

/* =====================================================================
   结果回录：面试 / Offer / 入职 / 用人结果
===================================================================== */
api.post('/recommendations/:id/interview', requireAuth, (req, res) => {
  const rec = get('SELECT * FROM recommendations WHERE id = ?', req.params.id);
  if (!rec) return bad(res, 404, '推荐不存在');
  const job = get('SELECT * FROM jobs WHERE id = ?', rec.job_id);
  if (!isJobOwner(req.user, job.id)) return bad(res, 403, '仅该岗位负责专员可回录面试结果', 'FORBIDDEN_SCOPE');
  if (rec.status !== 'agreed') return bad(res, 409, '仅「已反馈-待面试」的推荐可回录面试结果');
  const result = str(req.body?.result);
  if (!['pass', 'fail'].includes(result)) return bad(res, 400, '请选择面试结果');
  run('INSERT INTO interviews (id,recommendation_id,result,note,recorded_by,created_at) VALUES (?,?,?,?,?,?)',
    uuid('IV-'), rec.id, result, str(req.body?.note) || null, req.user.id, nowISO());
  const next = result === 'pass' ? 'interviewed' : 'offer_failed';
  run('UPDATE applications SET status = ? WHERE id = ?', next, rec.application_id);
  transition({ entityType: 'application', entityId: rec.application_id, to: next, byUser: req.user.id, note: result === 'pass' ? '面试通过' : '面试未通过' });
  audit({ user: req.user, action: 'interview.record', objectType: 'recommendation', objectId: rec.id, detail: { result } });
  res.json({ ok: true, status: next });
});

api.post('/recommendations/:id/offer', requireAuth, (req, res) => {
  const rec = get('SELECT * FROM recommendations WHERE id = ?', req.params.id);
  if (!rec) return bad(res, 404, '推荐不存在');
  const job = get('SELECT * FROM jobs WHERE id = ?', rec.job_id);
  if (!isJobOwner(req.user, job.id)) return bad(res, 403, '仅该岗位负责专员可回录 Offer 结果', 'FORBIDDEN_SCOPE');
  if (rec.status !== 'agreed') return bad(res, 409, '当前状态不可回录 Offer');
  const result = str(req.body?.result);
  if (!['accepted', 'declined'].includes(result)) return bad(res, 400, '请选择 Offer 实际结果');
  run('INSERT INTO offers (id,recommendation_id,result,note,recorded_by,created_at) VALUES (?,?,?,?,?,?)',
    uuid('OF-'), rec.id, result, str(req.body?.note) || null, req.user.id, nowISO());
  const next = result === 'accepted' ? 'offered' : 'offer_failed';
  run('UPDATE applications SET status = ? WHERE id = ?', next, rec.application_id);
  transition({ entityType: 'application', entityId: rec.application_id, to: next, byUser: req.user.id, note: 'Offer 结果回录（平台不生成 Offer）' });
  audit({ user: req.user, action: 'offer.record', objectType: 'recommendation', objectId: rec.id, detail: { result } });
  res.json({ ok: true, status: next });
});

/**
 * 录用决定：本部门面试官（或本部门经理）在部门「同意面试」后决定是否录用。
 * 录用 = 面试通过 + 登记实际入职，候选人立刻进入「已入职候选人」，可随时回评用人结果。
 */
api.post('/recommendations/:id/hire-decision', requireAuth, (req, res) => {
  const rec = get('SELECT * FROM recommendations WHERE id = ?', req.params.id);
  if (!rec) return bad(res, 404, '推荐不存在');
  const job = get('SELECT * FROM jobs WHERE id = ?', rec.job_id);
  const app = get('SELECT * FROM applications WHERE id = ?', rec.application_id);
  if (!canHireDecide(req.user, job)) {
    audit({ user: req.user, action: 'denied.hire.decide', objectType: 'recommendation', objectId: rec.id, result: 'denied' });
    return bad(res, 403, '只有该岗位的本部门面试官或部门经理可做录用决定', 'FORBIDDEN_ROLE');
  }
  if (rec.status !== 'agreed') {
    return bad(res, 409, '仅「已同意面试」的候选人可做录用决定', 'HIRE_STAGE_INVALID');
  }
  if (['hired', 'offer_failed'].includes(app.status)) {
    return bad(res, 409, '该候选人的录用结果已确定，不能重复决定', 'HIRE_ALREADY_DECIDED');
  }
  const decision = str(req.body?.decision);
  if (!['hire', 'no_hire'].includes(decision)) return bad(res, 400, '请选择录用或不录用');
  const note = str(req.body?.note);
  const ts = nowISO();

  if (decision === 'hire') {
    const date = str(req.body?.onboardDate) || ts.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad(res, 400, '请填写实际入职日期（YYYY-MM-DD）');
    run('INSERT INTO interviews (id,recommendation_id,result,note,recorded_by,created_at) VALUES (?,?,?,?,?,?)',
      uuid('IV-'), rec.id, 'pass', note || '面试通过并确认录用', req.user.id, ts);
    run("UPDATE applications SET status='hired' WHERE id=?", app.id);
    transition({ entityType: 'application', entityId: app.id, from: app.status, to: 'hired', byUser: req.user.id, note: '面试官决定录用并确认入职' });
    const onboardingId = uuid('ON-');
    run('INSERT INTO onboardings (id,recommendation_id,application_id,job_id,onboard_date,created_by,created_at) VALUES (?,?,?,?,?,?,?)',
      onboardingId, rec.id, app.id, job.id, date, req.user.id, ts);
    const recipients = [rec.submitted_by, job.requester_id, ...deptManagers(job.dept)].filter(Boolean);
    notify({
      userIds: [...new Set(recipients)], type: 'hired', refType: 'onboarding', refId: onboardingId,
      title: '候选人已录用入职', body: `${app.candidate_name} · ${job.name} · 入职日期 ${date}${note ? '｜' + note : ''}`,
    });
    audit({ user: req.user, action: 'hire.decide', objectType: 'recommendation', objectId: rec.id, detail: { decision, date } });
    return res.status(201).json({ ok: true, decision, onboardingId, onboardDate: date });
  }

  if (!note) return bad(res, 400, '不录用需填写原因', 'REASON_REQUIRED');
  run('INSERT INTO interviews (id,recommendation_id,result,note,recorded_by,created_at) VALUES (?,?,?,?,?,?)',
    uuid('IV-'), rec.id, 'fail', note, req.user.id, ts);
  run("UPDATE applications SET status='offer_failed' WHERE id=?", app.id);
  transition({ entityType: 'application', entityId: app.id, from: app.status, to: 'offer_failed', byUser: req.user.id, note: '面试后决定不录用' });
  notify({
    userIds: [...new Set([rec.submitted_by, job.requester_id].filter(Boolean))], type: 'hiring_result', refType: 'recommendation', refId: rec.id,
    title: '面试结果：不予录用', body: `${app.candidate_name} · ${job.name}｜原因：${note}`,
  });
  audit({ user: req.user, action: 'hire.decide', objectType: 'recommendation', objectId: rec.id, detail: { decision, note } });
  res.status(201).json({ ok: true, decision });
});

api.post('/recommendations/:id/onboard', requireAuth, (req, res) => {
  const rec = get('SELECT * FROM recommendations WHERE id = ?', req.params.id);
  if (!rec) return bad(res, 404, '推荐不存在');
  const job = get('SELECT * FROM jobs WHERE id = ?', rec.job_id);
  if (!isJobOwner(req.user, job.id)) return bad(res, 403, '仅该岗位负责专员可登记入职', 'FORBIDDEN_SCOPE');
  const app = get('SELECT * FROM applications WHERE id = ?', rec.application_id);
  if (app.status !== 'offered') return bad(res, 409, '仅「已发 Offer」状态可登记实际入职（接受 Offer ≠ 实际入职，R31）', 'ONBOARD_INVALID');
  const date = str(req.body?.onboardDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return bad(res, 400, '请填写实际入职日期（YYYY-MM-DD）');
  run('INSERT INTO onboardings (id,recommendation_id,application_id,job_id,onboard_date,created_by,created_at) VALUES (?,?,?,?,?,?,?)',
    uuid('ON-'), rec.id, app.id, job.id, date, req.user.id, nowISO());
  run("UPDATE applications SET status='hired' WHERE id=?", app.id);
  transition({ entityType: 'application', entityId: app.id, from: 'offered', to: 'hired', byUser: req.user.id, note: '核实实际入职' });
  notify({ userIds: [job.requester_id], type: 'onboard', refType: 'job', refId: job.id, title: '有候选人已实际入职', body: `${app.candidate_name} 已入职 ${job.name}` });
  audit({ user: req.user, action: 'onboarding.register', objectType: 'application', objectId: app.id, detail: { date } });
  res.status(201).json({ ok: true });
});

api.get('/onboardings', requireAuth, (req, res) => {
  const jobs = visibleJobs(req.user);
  const allowed = new Set(jobs.map((j) => j.id));
  const observeDays = Number(getConfig('outcome_observe_days')?.parsed ?? 30);
  const rows = all('SELECT * FROM onboardings ORDER BY onboard_date DESC').filter((o) => allowed.has(o.job_id));
  const items = rows.map((o) => {
    const app = get('SELECT * FROM applications WHERE id = ?', o.application_id);
    const job = get('SELECT * FROM jobs WHERE id = ?', o.job_id);
    const outcome = get('SELECT * FROM hiring_outcomes WHERE onboarding_id = ?', o.id);
    const days = Math.floor((Date.now() - new Date(o.onboard_date).getTime()) / 86400000);
    const rec = get('SELECT * FROM recommendations WHERE id = ?', o.recommendation_id);
    const feedbacks = rec ? all('SELECT * FROM feedbacks WHERE recommendation_id = ? ORDER BY created_at DESC', rec.id) : [];
    const evalDays = outcome ? Math.floor((new Date(outcome.created_at) - new Date(o.onboard_date)) / 86400000) : null;
    return {
      id: o.id, candidate: app.candidate_name, jobId: job.id, jobName: job.name, dept: job.dept,
      onboardDate: o.onboard_date, days,
      referrer: userBrief(rec?.submitted_by),
      interviewNote: get('SELECT note, recorded_by, created_at FROM interviews WHERE recommendation_id = ? ORDER BY created_at DESC LIMIT 1', rec?.id)?.note || '',
      deptFeedback: feedbacks[0] ? { decision: feedbacks[0].decision, label: DECISION_LABEL[feedbacks[0].decision], detail: feedbacks[0].detail || '', reason: feedbacks[0].reason || '' } : null,
      outcome: outcome ? { ...outcome, byName: userBrief(outcome.by_user)?.name, early: evalDays < observeDays, evalDays } : null,
      observeDays, early: days < observeDays, daysToObserve: Math.max(0, observeDays - days),
      // 观察期只做提示，不阻断回评：新人刚入职也需要留下阶段性评价
      canEvaluate: canEvaluateOutcome(req.user, job) && !outcome,
    };
  });
  res.json({ items, observeDays });
});

api.post('/onboardings/:id/outcome', requireAuth, requireCap('outcome.evaluate'), (req, res) => {
  const o = get('SELECT * FROM onboardings WHERE id = ?', req.params.id);
  if (!o) return bad(res, 404, '入职记录不存在');
  const job = get('SELECT * FROM jobs WHERE id = ?', o.job_id);
  if (!canEvaluateOutcome(req.user, job)) {
    audit({ user: req.user, action: 'denied.outcome.evaluate', objectType: 'onboarding', objectId: o.id, result: 'denied' });
    return bad(res, 403, '只有本部门的经理或面试官可提交用人结果反馈', 'FORBIDDEN_ROLE');
  }
  if (get('SELECT id FROM hiring_outcomes WHERE onboarding_id = ?', o.id)) return bad(res, 409, '该候选人已完成用人结果反馈');
  const observeDays = Number(getConfig('outcome_observe_days')?.parsed ?? 30);
  const days = Math.floor((Date.now() - new Date(o.onboard_date).getTime()) / 86400000);
  // 观察期阈值待业务确认：未满观察期允许评价，但会标记为「早期评价」并在流水与通知中注明
  const early = days < observeDays;
  const rating = str(req.body?.rating);
  const evaluation = str(req.body?.evaluation);
  const alignment = str(req.body?.alignment);
  if (!['优秀', '符合预期', '基本符合', '不符合期望'].includes(rating)) return bad(res, 400, '请选择用人结果评级');
  if (!evaluation) return bad(res, 400, '请填写具体评价');
  if (!['与面试判断一致', '部分偏差', '明显偏差'].includes(alignment)) return bad(res, 400, '请选择与面试判断的一致性');
  run('INSERT INTO hiring_outcomes (id,onboarding_id,rating,evaluation,alignment,by_user,created_at) VALUES (?,?,?,?,?,?,?)',
    uuid('HO-'), o.id, rating, evaluation, alignment, req.user.id, nowISO());
  const app = get('SELECT * FROM applications WHERE id = ?', o.application_id);
  const rec = get('SELECT * FROM recommendations WHERE id = ?', o.recommendation_id);
  const recipients = [
    rec?.submitted_by,
    ...all("SELECT id FROM users WHERE role='manager' AND status='enabled'").map((r) => r.id),
  ];
  notify({ userIds: recipients, type: 'hiring_outcome', refType: 'onboarding', refId: o.id, title: '用人结果反馈已提交', body: `${app.candidate_name} · ${rating} · ${alignment}${early ? `（入职第 ${days} 天，早期评价）` : ''}` });
  audit({ user: req.user, action: 'outcome.evaluate', objectType: 'onboarding', objectId: o.id, detail: { rating, alignment, early, days } });
  res.status(201).json({ ok: true, early });
});

/* =====================================================================
   通知
===================================================================== */
api.get('/notifications', requireAuth, (req, res) => {
  const rows = all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', req.user.id);
  res.json({ items: rows, unread: rows.filter((r) => !r.read_at).length });
});
api.post('/notifications/read', requireAuth, (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  if (ids.length) {
    for (const id of ids) run('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?', nowISO(), id, req.user.id);
  } else {
    run('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL', nowISO(), req.user.id);
  }
  res.json({ ok: true });
});

/* =====================================================================
   看板
===================================================================== */
api.get('/dashboard', requireAuth, requireCap('report.view'), (req, res) => {
  const jobs = visibleJobs(req.user);
  const jobIds = jobs.map((j) => j.id);
  const inJobs = (list) => list.filter((x) => jobIds.includes(x.job_id));
  const apps = inJobs(all('SELECT * FROM applications'));
  const recs = inJobs(all('SELECT * FROM recommendations'));
  const onbs = inJobs(all('SELECT * FROM onboardings'));
  const outcomes = onbs.map((o) => get('SELECT * FROM hiring_outcomes WHERE onboarding_id = ?', o.id)).filter(Boolean);
  const pending = recs.filter((r) => r.status === 'pending');
  const waitDays = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
  // 已反馈的按"提交→反馈"计算，未反馈的按"至今"计算（否则历史记录会虚增等待天数）
  const waitOfRec = (r) => {
    const fb = get('SELECT created_at FROM feedbacks WHERE recommendation_id = ? ORDER BY created_at LIMIT 1', r.id);
    const end = fb ? new Date(fb.created_at).getTime() : Date.now();
    return Math.max(0, Math.floor((end - new Date(r.submitted_at).getTime()) / 86400000));
  };
  const avgWait = recs.length ? +(recs.reduce((s, r) => s + waitOfRec(r), 0) / recs.length).toFixed(1) : 0;
  const sla = Number(getConfig('feedback_sla_workdays')?.parsed ?? 3);
  const metricDef = getConfig('metric_definitions');

  const stage = (st) => apps.filter((a) => a.status === st).length;
  const hired = stage('hired');
  const totalHead = jobs.reduce((s, j) => s + j.headcount, 0) || 1;

  const perJob = jobs.map((j) => {
    const ja = apps.filter((a) => a.job_id === j.id);
    const jh = ja.filter((a) => a.status === 'hired').length;
    return {
      id: j.id, name: j.name, dept: j.dept, headcount: j.headcount,
      applications: ja.length, hired: jh,
      fillRate: Math.min(100, Math.round((jh / (j.headcount || 1)) * 100)),
      pending: pending.filter((r) => r.job_id === j.id).length,
    };
  });

  const deptMap = new Map();
  for (const r of recs) {
    const job = jobs.find((j) => j.id === r.job_id);
    if (!job) continue;
    const arr = deptMap.get(job.dept) || [];
    arr.push(waitOfRec(r));
    deptMap.set(job.dept, arr);
  }
  const perDept = [...deptMap.entries()].map(([dept, arr]) => ({
    dept, avgWait: +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1),
  })).sort((a, b) => b.avgWait - a.avgWait);

  const alerts = pending.filter((r) => waitDays(r.submitted_at) > sla).map((r) => {
    const app = get('SELECT * FROM applications WHERE id = ?', r.application_id);
    const job = get('SELECT * FROM jobs WHERE id = ?', r.job_id);
    return {
      recommendationId: r.id, candidate: app?.candidate_name, jobName: job?.name, dept: job?.dept,
      waitDays: waitDays(r.submitted_at), submittedAt: r.submitted_at,
      canUrge: hasCap(req.user, 'urge'),
    };
  });

  res.json({
    kpis: {
      openJobs: jobs.filter((j) => j.status === 'active').length,
      totalApplications: apps.length,
      pendingDecisions: pending.length,
      avgWaitDays: avgWait,
      hired,
      fulfillRate: Math.min(100, Math.round((hired / totalHead) * 100)),
    },
    funnel: [
      { key: 'uploaded', label: '简历导入', value: apps.length },
      { key: 'parsed', label: '解析完成', value: apps.filter((a) => a.parse_status === 'done').length },
      { key: 'reviewed', label: '人工核对', value: apps.filter((a) => !['waiting_parse', 'parsing'].includes(a.status)).length },
      { key: 'recommended', label: '提交推荐', value: recs.length },
      { key: 'agreed', label: '部门同意面试', value: recs.filter((r) => ['agreed', 'pending'].includes(r.status) && get('SELECT decision FROM feedbacks WHERE recommendation_id=? ORDER BY created_at DESC LIMIT 1', r.id)?.decision === 'agree').length },
      { key: 'hired', label: '实际入职', value: hired },
    ],
    perJob, perDept, alerts,
    outcomeStats: {
      evaluated: outcomes.length,
      aligned: outcomes.filter((o) => o.alignment === '与面试判断一致').length,
      pending: onbs.length - outcomes.length,
    },
    meta: {
      sla: { value: sla, status: getConfig('feedback_sla_workdays')?.status },
      metricDefinitions: { status: metricDef?.status, note: metricDef?.note },
      autoEliminate: { value: getConfig('auto_eliminate_enabled')?.parsed, status: 'locked' },
      weights: getConfig('condition_weights_default')?.parsed,
      weightsStatus: getConfig('condition_weights_default')?.status,
      observeDays: Number(getConfig('outcome_observe_days')?.parsed ?? 30),
      generatedAt: nowISO(),
    },
  });
});

api.post('/alerts/urge', requireAuth, requireCap('urge'), (req, res) => {
  const rec = get('SELECT * FROM recommendations WHERE id = ?', req.body?.recommendationId);
  if (!rec) return bad(res, 404, '推荐不存在');
  const job = get('SELECT * FROM jobs WHERE id = ?', rec.job_id);
  if (!canViewJob(req.user, job)) return bad(res, 403, '无权催办该岗位', 'FORBIDDEN_SCOPE');
  notify({ userIds: [job.requester_id], type: 'urge', refType: 'recommendation', refId: rec.id, title: '催办：推荐待反馈', body: `${job.name} · ${req.user.name} 提醒尽快反馈面试决定` });
  audit({ user: req.user, action: 'alert.urge', objectType: 'recommendation', objectId: rec.id });
  res.json({ ok: true });
});

/* =====================================================================
   平台管理：用户 / 审计 / 配置
===================================================================== */
api.get('/users', requireAuth, requireCap('user.manage'), (req, res) => {
  res.json({ users: all('SELECT * FROM users ORDER BY role, name').map(publicUser) });
});

api.post('/users', requireAuth, requireCap('user.manage'), (req, res) => {
  const name = str(req.body?.name);
  const account = str(req.body?.account).toLowerCase();
  const role = str(req.body?.role);
  const dept = str(req.body?.dept);
  const password = str(req.body?.password) || '123456';
  if (!name || !account || !role || !dept) return bad(res, 400, '姓名、账号、角色与部门均为必填');
  if (!['admin', 'manager', 'specialist', 'deptmgr', 'interviewer'].includes(role)) return bad(res, 400, '角色不合法');
  const isEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(account);
  const isPhone = /^1\d{10}$/.test(account);
  if (!isEmail && !isPhone) return bad(res, 400, '账号格式有误：请填写有效邮箱或 11 位手机号');
  if (get('SELECT id FROM users WHERE lower(account) = ?', account)) return bad(res, 409, '该账号已存在，请更换邮箱或手机号', 'DUPLICATE_ACCOUNT');
  const id = uuid('U-');
  run('INSERT INTO users (id,name,account,password_hash,role,dept,status,created_at) VALUES (?,?,?,?,?,?,?,?)',
    id, name, account, hashPassword(password), role, dept, 'enabled', nowISO());
  audit({ user: req.user, action: 'user.create', objectType: 'user', objectId: id, detail: { name, role, dept } });
  res.status(201).json({ user: publicUser(get('SELECT * FROM users WHERE id = ?', id)) });
});

api.patch('/users/:id/role', requireAuth, requireCap('user.manage'), (req, res) => {
  const u = get('SELECT * FROM users WHERE id = ?', req.params.id);
  if (!u) return bad(res, 404, '用户不存在');
  if (u.id === req.user.id) return bad(res, 400, '不能修改本人账号角色，避免治理入口丢失');
  const role = str(req.body?.role);
  if (!['admin', 'manager', 'specialist', 'deptmgr', 'interviewer'].includes(role)) return bad(res, 400, '角色不合法');
  const reason = str(req.body?.reason) || '未填写原因';
  run('UPDATE users SET role = ? WHERE id = ?', role, u.id);
  audit({ user: req.user, action: 'user.role.change', objectType: 'user', objectId: u.id, detail: { from: u.role, to: role, reason } });
  res.json({ user: publicUser(get('SELECT * FROM users WHERE id = ?', u.id)) });
});

api.post('/users/:id/status', requireAuth, requireCap('user.manage'), (req, res) => {
  const u = get('SELECT * FROM users WHERE id = ?', req.params.id);
  if (!u) return bad(res, 404, '用户不存在');
  if (u.id === req.user.id) return bad(res, 400, '不能停用本人账号');
  const status = str(req.body?.status);
  if (!['enabled', 'disabled'].includes(status)) return bad(res, 400, '状态不合法');
  if (status === 'disabled' && !str(req.body?.reason)) return bad(res, 400, '停用原因必填（用于审计追溯）');
  run('UPDATE users SET status = ? WHERE id = ?', status, u.id);
  if (status === 'disabled') run('DELETE FROM sessions WHERE user_id = ?', u.id);
  audit({ user: req.user, action: 'user.status.' + status, objectType: 'user', objectId: u.id, detail: { reason: str(req.body?.reason) } });
  res.json({ user: publicUser(get('SELECT * FROM users WHERE id = ?', u.id)) });
});

api.post('/users/:id/reset-password', requireAuth, requireCap('user.manage'), (req, res) => {
  const u = get('SELECT * FROM users WHERE id = ?', req.params.id);
  if (!u) return bad(res, 404, '用户不存在');
  const temp = 'Xinghe@' + Math.floor(100000 + Math.random() * 900000);
  run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(temp), u.id);
  run('DELETE FROM sessions WHERE user_id = ?', u.id);
  audit({ user: req.user, action: 'user.password.reset', objectType: 'user', objectId: u.id });
  res.json({ ok: true, temporaryPassword: temp });
});

api.get('/audit', requireAuth, requireCap('audit.view'), (req, res) => {
  const limit = Math.min(500, int(req.query.limit, 100));
  let rows = all('SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?', limit);
  if (req.query.objectType) rows = rows.filter((r) => r.object_type === req.query.objectType);
  res.json({ logs: rows });
});

api.get('/config', requireAuth, requireCap('config.manage'), (req, res) => {
  res.json({ config: listConfig() });
});

api.patch('/config/:key', requireAuth, requireCap('config.manage'), (req, res) => {
  const key = req.params.key;
  const cur = getConfig(key);
  if (!cur) return bad(res, 404, '配置项不存在');
  if (cur.status === 'locked') {
    audit({ user: req.user, action: 'denied.config.locked', objectType: 'config', objectId: key, result: 'denied', detail: { value: req.body?.value } });
    return bad(res, 403, '该配置受合规红线锁定，不可修改（AI 仅辅助初筛，R1/R3）', 'CONFIG_LOCKED');
  }
  if (key === 'auto_eliminate_enabled') {
    audit({ user: req.user, action: 'denied.config.auto_eliminate', objectType: 'config', objectId: key, result: 'denied' });
    return bad(res, 403, '自动淘汰能力在产品层永久关闭，不允许开启（R1/R3）', 'AUTO_ELIMINATE_FORBIDDEN');
  }
  const updated = setConfig(key, req.body?.value, { status: req.body?.status, note: req.body?.note, user: req.user });
  if (updated?.locked) return bad(res, 403, '该配置受合规红线锁定', 'CONFIG_LOCKED');
  res.json({ config: updated });
});

export default api;
