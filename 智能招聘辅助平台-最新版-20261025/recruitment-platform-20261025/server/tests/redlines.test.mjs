/**
 * 合规红线与权限基线测试
 * 覆盖：账号状态、角色权限、拒绝原因必填、意向确认前置、岗位隔离、无自动淘汰、用人结果权限、配置锁定、追问权限、个人中心校验
 * 运行：npm test（会自动复制当前库到临时库并启动独立实例，不污染演示数据）
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, backup } from 'node:sqlite';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const TMP_DB = path.join(ROOT, 'storage', '_test.db');
const PORT = Number(process.env.TEST_PORT || 5199);
const BASE = `http://localhost:${PORT}`;
const PASSWORD = '123456';
let child;
const tk = {};
const FIX = {};

async function login(account, password = PASSWORD) {
  const res = await fetch(`${BASE}/api/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account, password }),
  });
  const data = await res.json();
  return { status: res.status, data };
}
async function auth(account) {
  if (!tk[account]) {
    const { status, data } = await login(account);
    assert.equal(status, 200, `登录失败：${account} → ${JSON.stringify(data)}`);
    tk[account] = data.token;
  }
  return tk[account];
}
async function call(pathname, { method = 'GET', body, token, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch(BASE + pathname, { method, headers, body: payload });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

before(async () => {
  fs.rmSync(TMP_DB, { force: true });
  const src = new DatabaseSync(path.join(ROOT, 'storage', 'recruitment.db'));
  await backup(src, TMP_DB);
  src.close();

  // 测试夹具：造一份 C 级已解析的 FS 简历，用于验证"低分不淘汰"
  const fix = new DatabaseSync(TMP_DB);
  const app = fix.prepare(
    "SELECT id FROM applications WHERE job_id='J-FS' AND status='waiting_parse' ORDER BY length(resume_text) DESC LIMIT 1"
  ).get();
  if (app) {
    fix.prepare("UPDATE applications SET status='pending_review', parse_status='done' WHERE id=?").run(app.id);
    fix.prepare(`INSERT INTO parsed_results (id,application_id,condition_version,score,grade,tags,criteria,questions,model,prompt_version,evidence_missing,created_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run('PR-TEST-LOW', app.id, 1, 52, 'C', '["测试夹具"]', '[]', '[]', 'fixture', 'test', 0, new Date().toISOString());
    FIX.lowAppId = app.id;
  }
  // 夹具体：一条待反馈推荐（算法部），用于面试决定校验
  const pending = fix.prepare("SELECT id,application_id FROM recommendations WHERE status='pending' LIMIT 1").get();
  if (pending) FIX.pendingRecId = pending.id;

  // 夹具体：给一份「无推荐记录」的算法部简历造一条已同意面试的推荐，用于录用决定校验
  const agreedApp = fix.prepare(
    `SELECT a.id, a.candidate_name FROM applications a
      WHERE a.job_id = (SELECT id FROM jobs WHERE dept = '算法部 · 大模型组')
        AND NOT EXISTS (SELECT 1 FROM recommendations r WHERE r.application_id = a.id)
      LIMIT 1`
  ).get();
  if (agreedApp) {
    const ts = new Date().toISOString();
    fix.prepare('INSERT INTO recommendations (id,application_id,job_id,reason,gap,questions,status,submitted_by,submitted_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run('R-TEST-HIRE', agreedApp.id, 'J-ML', '夹具：技术面通过初筛', '夹具：待面试确认深度', '[]', 'agreed', 'U-SP2', ts);
    fix.prepare('INSERT INTO feedbacks (id,recommendation_id,decision,reason,detail,expect_time,request,by_user,by_role,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run('FB-TEST-HIRE', 'R-TEST-HIRE', 'agree', null, '夹具：同意面试', null, null, 'U-DM3', 'deptmgr', ts);
    FIX.hireRecId = 'R-TEST-HIRE';
    FIX.hireCandidate = agreedApp.candidate_name;
  }
  fix.close();

  child = spawn(process.execPath, ['--experimental-sqlite', 'server/index.mjs'], {
    cwd: ROOT,
    env: { ...process.env, DB_PATH: TMP_DB, PORT: String(PORT) },
    stdio: 'ignore',
  });
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('测试服务启动超时');
});

after(async () => {
  // 先等子进程真正退出，否则 Windows 上临时库仍被占用
  if (child && child.exitCode === null && child.signalCode === null) {
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 3000);
      child.once('exit', () => { clearTimeout(timer); resolve(); });
      child.kill();
    });
  }
  const files = [TMP_DB, TMP_DB + '-wal', TMP_DB + '-shm'];
  for (let i = 0; i < 20; i++) {
    try {
      files.forEach((f) => fs.rmSync(f, { force: true }));
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
});

/* ---------------------------------- 账号与登录 ---------------------------------- */
test('合规：停用账号无法登录且给出明确原因', async () => {
  const admin = await auth('zhanggong@xinghe.com');
  const acc = `temp_${Date.now()}@xinghe.com`;
  const created = await call('/api/users', {
    method: 'POST', token: admin,
    body: { name: '临时测试', account: acc, role: 'specialist', dept: '人力资源部 · 招聘组' },
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const disabled = await call(`/api/users/${created.data.user.id}/status`, {
    method: 'POST', token: admin, body: { status: 'disabled', reason: '测试停用' },
  });
  assert.equal(disabled.status, 200);
  const { status, data } = await login(acc);
  assert.equal(status, 403);
  assert.equal(data.code, 'ACCOUNT_DISABLED');
  assert.match(data.error, /停用/);
});

test('合规：停用后既有会话立即失效', async () => {
  const admin = await auth('zhanggong@xinghe.com');
  const acc = `temp2_${Date.now()}@xinghe.com`;
  const created = await call('/api/users', {
    method: 'POST', token: admin, body: { name: '临时测试2', account: acc, role: 'specialist', dept: '人力资源部 · 招聘组' },
  });
  const session = await login(acc);
  assert.equal(session.status, 200);
  const okBefore = await call('/api/me', { token: session.data.token });
  assert.equal(okBefore.status, 200);
  await call(`/api/users/${created.data.user.id}/status`, { method: 'POST', token: admin, body: { status: 'disabled', reason: '测试' } });
  const afterDeny = await call('/api/me', { token: session.data.token });
  assert.equal(afterDeny.status, 401);
});

test('账号：密码错误返回 401 且不泄露账号是否存在', async () => {
  const res = await fetch(`${BASE}/api/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: 'liting@xinghe.com', password: 'wrong' }),
  });
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.code, 'BAD_CREDENTIALS');
});

test('个人中心：账号格式非法时拒绝修改', async () => {
  const li = await auth('liting@xinghe.com');
  const res = await call('/api/me/profile', { method: 'PATCH', token: li, body: { account: '不是邮箱' } });
  assert.equal(res.status, 400);
  assert.match(res.data.error, /账号格式/);
});

test('个人中心：修改密码需校验原密码', async () => {
  const li = await auth('liting@xinghe.com');
  const bad = await call('/api/me/password', { method: 'POST', token: li, body: { oldPassword: 'xxx', newPassword: 'newpass1' } });
  assert.equal(bad.status, 400);
  assert.equal(bad.data.code, 'BAD_OLD_PASSWORD');
  const weak = await call('/api/me/password', { method: 'POST', token: li, body: { oldPassword: PASSWORD, newPassword: '123' } });
  assert.equal(weak.status, 400);
});

/* ---------------------------------- 岗位与隔离 ---------------------------------- */
test('隔离红线：专员访问非本人负责岗位的简历材料被拒绝', async () => {
  const zhang = await auth('xiaozhang@xinghe.com'); // 负责 ML
  const li = await auth('liting@xinghe.com');       // 负责 FS
  const list = await call('/api/applications', { token: li });
  const target = list.data.applications.find((a) => a.jobId === 'J-FS');
  assert.ok(target, '应能取到 FS 岗位简历');
  const denied = await call('/api/applications/' + target.id, { token: zhang });
  assert.equal(denied.status, 403);
  assert.equal(denied.data.code, 'FORBIDDEN_SCOPE');
  const fileDenied = await call(`/api/applications/${target.id}/file`, { token: zhang });
  assert.equal(fileDenied.status, 403);
});

test('隔离红线：管理员可跨部门查看，专员岗位集合受限', async () => {
  const admin = await auth('zhanggong@xinghe.com');
  const adminList = await call('/api/applications', { token: admin });
  assert.equal(adminList.status, 200);
  assert.ok(adminList.data.applications.length > 15, '管理员应能看到全部岗位材料');
  const li = await auth('liting@xinghe.com');
  const liJobs = await call('/api/jobs', { token: li });
  const liJobIds = new Set(liJobs.data.jobs.map((j) => j.id));
  const liList = await call('/api/applications', { token: li });
  // 专员只能看到自己名下岗位的简历（不硬编码岗位 ID，避免新增岗位数据导致用例失效）
  assert.ok(liList.data.applications.every((a) => liJobIds.has(a.jobId)));
  assert.ok(liList.data.applications.length < adminList.data.applications.length, '专员的可见范围应小于管理员');
});

/* ---------------------------------- 面试决定权限 ---------------------------------- */
test('权限：招聘专员不能代替部门做面试决定', async () => {
  const zhang = await auth('xiaozhang@xinghe.com'); // 负责 ML，能看到待反馈推荐
  const fb = await call('/api/feedbacks', { token: zhang });
  const pending = fb.data.items.find((i) => i.status === 'pending');
  assert.ok(pending, '需要一条待部门决定的推荐');
  const res = await call(`/api/recommendations/${pending.id}/feedback`, {
    method: 'POST', token: zhang, body: { decision: 'agree', detail: '我同意' },
  });
  assert.equal(res.status, 403);
});

test('权限：他部门经理不能对非本部门推荐做决定', async () => {
  assert.ok(FIX.pendingRecId, '测试夹具应存在待反馈推荐');
  const chen = await auth('chenjl@xinghe.com'); // 技术部·应用研发组，非该推荐所属部门
  const res = await call(`/api/recommendations/${FIX.pendingRecId}/feedback`, {
    method: 'POST', token: chen, body: { decision: 'agree', detail: 'x' },
  });
  assert.equal(res.status, 403);
});

test('规则：需要补充信息必须给出补充要求', async () => {
  const wu = await auth('wuwj@xinghe.com'); // 算法部·大模型组
  const fb = await call('/api/feedbacks', { token: wu });
  const pending = fb.data.items.find((i) => i.status === 'pending' && i.jobId === 'J-ML');
  assert.ok(pending, '需要一条大模型组待反馈推荐');
  const res = await call(`/api/recommendations/${pending.id}/feedback`, {
    method: 'POST', token: wu, body: { decision: 'need_info', request: '' },
  });
  assert.equal(res.status, 400);
});

test('规则：拒绝面试必须填写原因', async () => {
  const wu = await auth('wuwj@xinghe.com');
  const fb = await call('/api/feedbacks', { token: wu });
  const pending = fb.data.items.find((i) => i.status === 'pending' && i.jobId === 'J-ML');
  assert.ok(pending, '需要一条大模型组待反馈推荐');
  const empty = await call(`/api/recommendations/${pending.id}/feedback`, {
    method: 'POST', token: wu, body: { decision: 'reject', reason: '   ' },
  });
  assert.equal(empty.status, 400);
  assert.equal(empty.data.code, 'REASON_REQUIRED');
  const filled = await call(`/api/recommendations/${pending.id}/feedback`, {
    method: 'POST', token: wu, body: { decision: 'reject', reason: '训练与评测证据不足' },
  });
  assert.equal(filled.status, 201);
  // 推荐人应收到通知
  const zhang = await auth('xiaozhang@xinghe.com');
  const notif = await call('/api/notifications', { token: zhang });
  assert.ok(notif.data.items.some((n) => n.ref_id === pending.id && n.type === 'dept_feedback'), '反馈应通知推荐专员');
});

/* ---------------------------------- 意向确认与上传 ---------------------------------- */
test('规则：未确认面试意向不得上传简历（R33）', async () => {
  const li = await auth('liting@xinghe.com');
  const pdfPath = path.join(ROOT, 'data', 'resumes', 'AI应用全栈工程师', 'FS010_郑书遥.pdf');
  const fd = new FormData();
  fd.append('file', new Blob([fs.readFileSync(pdfPath)], { type: 'application/pdf' }), 'FS010_郑书遥.pdf');
  fd.append('jobId', 'J-FS');
  fd.append('intentConfirmed', 'false');
  const res = await call('/api/applications', { method: 'POST', token: li, form: fd });
  assert.equal(res.status, 400);
  assert.equal(res.data.code, 'INTENT_REQUIRED');
});

test('专员提交简历：确认意向后可提交并生成待解析记录', async () => {
  const li = await auth('liting@xinghe.com');
  const pdfPath = path.join(ROOT, 'data', 'resumes', 'AI应用全栈工程师', 'FS010_郑书遥.pdf');
  const fd = new FormData();
  fd.append('file', new Blob([fs.readFileSync(pdfPath)], { type: 'application/pdf' }), 'FS010_郑书遥.pdf');
  fd.append('jobId', 'J-FS');
  fd.append('intentConfirmed', 'true');
  fd.append('intentMethod', '电话');
  fd.append('candidateName', '测试候选人');
  const res = await call('/api/applications', { method: 'POST', token: li, form: fd });
  assert.equal(res.status, 201, JSON.stringify(res.data));
  assert.equal(res.data.application.parseStatus, 'pending');
  assert.equal(res.data.application.status, 'waiting_parse');
  assert.equal(res.data.application.candidate, '测试候选人', '专员手填姓名应优先于自动识别');
});

/* ---------------------------------- 无自动淘汰 ---------------------------------- */
test('合规红线：低分简历不被自动淘汰，仍可被人工推荐', async () => {
  const li = await auth('liting@xinghe.com');
  const list = await call('/api/applications', { token: li });
  const low = list.data.applications.find((a) => a.id === FIX.lowAppId);
  assert.ok(low, '测试夹具应存在');
  assert.equal(low.parse.grade, 'C');
  const submit = await call(`/api/applications/${low.id}/recommend`, {
    method: 'POST', token: li, body: { reason: '项目经历与岗位方向高度相关，先面谈确认', gap: '年限略低，需评估成长性' },
  });
  assert.equal(submit.status, 201, JSON.stringify(submit.data));
  const after = await call('/api/applications/' + low.id, { token: li });
  assert.equal(after.data.application.status, 'recommended');
});

test('合规红线：系统不提供按分数过滤/自动淘汰的接口', async () => {
  const li = await auth('liting@xinghe.com');
  const res = await call('/api/applications?minScore=80&rejectBelow=80', { token: li });
  assert.equal(res.status, 200);
  const scores = res.data.applications.map((a) => a.parse?.score).filter((s) => typeof s === 'number');
  assert.ok(scores.some((s) => s < 80), '低分记录必须仍可见，分数参数不应生效');
});

test('合规红线：推荐提交必须由人工触发，缺少理由/差距被拒绝', async () => {
  const li = await auth('liting@xinghe.com');
  const list = await call('/api/applications', { token: li });
  const candidate = list.data.applications.find((a) => a.can.recommend);
  if (!candidate) return;
  const res = await call(`/api/applications/${candidate.id}/recommend`, {
    method: 'POST', token: li, body: { reason: '', gap: '' },
  });
  assert.equal(res.status, 400);
});

/* ---------------------------------- 追问与画像 ---------------------------------- */
test('追问：专员可发起，本部门面试官可解答，外部门不可', async () => {
  const li = await auth('liting@xinghe.com');
  const ask = await call('/api/jobs/J-FS/clarifications', {
    method: 'POST', token: li, body: { question: 'C2「三部分均需项目证据」是否允许分布式团队协作产出？' },
  });
  assert.equal(ask.status, 201, JSON.stringify(ask.data));
  const clId = ask.data.id;

  const outsider = await auth('wuwj@xinghe.com'); // 算法部经理
  const denied = await call(`/api/clarifications/${clId}/reply`, { method: 'POST', token: outsider, body: { answer: 'x' } });
  assert.equal(denied.status, 403);

  const iv = await auth('sunlei@xinghe.com'); // FS 部门面试官
  const ok = await call(`/api/clarifications/${clId}/reply`, { method: 'POST', token: iv, body: { answer: '允许协作，但要能说清本人承担的部分与接口设计。' } });
  assert.equal(ok.status, 200);

  const detail = await call('/api/jobs/J-FS', { token: li });
  const cl = detail.data.job.clarifications.find((x) => x.id === clId);
  assert.equal(cl.state, 'answered');
  assert.equal(cl.answeredByUser.name, '孙磊');
});

test('权限：非本岗位专员不能发起追问', async () => {
  const zhang = await auth('xiaozhang@xinghe.com');
  const res = await call('/api/jobs/J-FS/clarifications', { method: 'POST', token: zhang, body: { question: 'x' } });
  assert.equal(res.status, 403);
});

test('发布岗位：判定规则改为选填，只校验名称/类型/权重', async () => {
  const chen = await auth('chenjl@xinghe.com');
  const noRule = await call('/api/jobs', {
    method: 'POST', token: chen,
    body: {
      name: '测试岗位-无规则', description: '仅用于校验判定规则已改为选填。', headcount: 1, confirmed: true,
      criteria: [
        { id: 'C1', name: '研发年限', type: '必备', weight: 60 },
        { id: 'C2', name: '项目交付', type: '加分', weight: 40 },
      ],
    },
  });
  assert.equal(noRule.status, 201, JSON.stringify(noRule.data));
  const detail = await call(`/api/jobs/${noRule.data.job.id}`, { token: chen });
  assert.equal(detail.data.job.condition.criteria[0].rule, '');

  const badWeight = await call('/api/jobs', {
    method: 'POST', token: chen,
    body: { name: '测试岗位-权重错', description: '权重不等于 100', headcount: 1, confirmed: true, criteria: [{ id: 'C1', name: 'x', type: '必备', weight: 50 }] },
  });
  assert.equal(badWeight.status, 400);
  assert.match(badWeight.data.error, /100%/);
});

/* ---------------------------------- 用人结果与配置 ---------------------------------- */
test('权限：用人结果仅本部门经理/面试官可回评', async () => {
  const li = await auth('liting@xinghe.com');
  const list = await call('/api/onboardings', { token: li });
  const target = list.data.items[0];
  assert.ok(target, '需要一条入职记录');
  const denied = await call(`/api/onboardings/${target.id}/outcome`, {
    method: 'POST', token: li, body: { rating: '优秀', evaluation: 'x', alignment: '与面试判断一致' },
  });
  assert.equal(denied.status, 403);

  const outsiderEmail = 'wuwj@xinghe.com'; // 非该岗位部门
  const outsider = await auth(outsiderEmail);
  const crossDenied = await call(`/api/onboardings/${target.id}/outcome`, {
    method: 'POST', token: outsider, body: { rating: '优秀', evaluation: 'x', alignment: '与面试判断一致' },
  });
  assert.equal(crossDenied.status, 403);

  const iv = await auth('sunlei@xinghe.com'); // FS 部门面试官
  const res = await call(`/api/onboardings/${target.id}/outcome`, {
    method: 'POST', token: iv, body: { rating: '符合预期', evaluation: '重复提交校验', alignment: '与面试判断一致' },
  });
  assert.equal(res.status, 409, '本部门面试官有权提交，此处应因已回评而拒绝');
});

/* ------------------------------ 录用决定（面试官） ------------------------------ */
test('权限：录用决定仅该岗位本部门面试官/部门经理可做', async () => {
  assert.ok(FIX.hireRecId, '需要一条已同意面试的推荐夹具');
  const hire = (token, body = { decision: 'hire', onboardDate: '2026-10-25' }) =>
    call(`/api/recommendations/${FIX.hireRecId}/hire-decision`, { method: 'POST', token, body });

  const specialist = await auth('xiaozhang@xinghe.com'); // 该岗位专员：只提交推荐，不做录用决定
  const denied = await hire(specialist);
  assert.equal(denied.status, 403);
  assert.equal(denied.data.code, 'FORBIDDEN_ROLE');

  const otherDeptMgr = await auth('wangzj@xinghe.com'); // 跨部门经理
  const cross = await hire(otherDeptMgr);
  assert.equal(cross.status, 403);

  const interviewer = await auth('lina@xinghe.com'); // 该岗位本部门面试官
  const passed = await hire(interviewer, { decision: 'not_a_decision' });
  assert.equal(passed.status, 400, '通过权限校验后应由参数校验拦截');

  const detail = await call(`/api/recommendations/${FIX.hireRecId}`, { token: interviewer });
  assert.equal(detail.data.can.hireDecide, true);
  const spView = await call(`/api/recommendations/${FIX.hireRecId}`, { token: specialist });
  assert.equal(spView.data.can.hireDecide, false);
});

test('红线：不予录用必须填写原因', async () => {
  assert.ok(FIX.hireRecId);
  const interviewer = await auth('lina@xinghe.com');
  const res = await call(`/api/recommendations/${FIX.hireRecId}/hire-decision`, {
    method: 'POST', token: interviewer, body: { decision: 'no_hire' },
  });
  assert.equal(res.status, 400);
  assert.equal(res.data.code, 'REASON_REQUIRED');
});

test('流程：面试官录用后进入已入职候选人，未满观察期也可回评（标记早期）', async () => {
  assert.ok(FIX.hireRecId);
  const interviewer = await auth('lina@xinghe.com');
  const hired = await call(`/api/recommendations/${FIX.hireRecId}/hire-decision`, {
    method: 'POST', token: interviewer,
    body: { decision: 'hire', onboardDate: new Date().toISOString().slice(0, 10), note: '测试：技术面通过' },
  });
  assert.equal(hired.status, 201, JSON.stringify(hired.data));
  const onboardingId = hired.data.onboardingId;
  assert.ok(onboardingId);

  const list = await call('/api/onboardings', { token: interviewer });
  const item = list.data.items.find((i) => i.id === onboardingId);
  assert.ok(item, '录用的候选人应出现在已入职候选人列表');
  assert.equal(item.candidate, FIX.hireCandidate);
  assert.equal(item.canEvaluate, true, '观察期未满也应允许回评');
  assert.equal(item.early, true);

  const outcome = await call(`/api/onboardings/${onboardingId}/outcome`, {
    method: 'POST', token: interviewer,
    body: { rating: '符合预期', evaluation: '测试：入职首周表现与面试判断一致', alignment: '与面试判断一致' },
  });
  assert.equal(outcome.status, 201);
  assert.equal(outcome.data.early, true, '未满观察期应标记为早期评价');

  const again = await call(`/api/recommendations/${FIX.hireRecId}/hire-decision`, {
    method: 'POST', token: interviewer, body: { decision: 'hire', onboardDate: '2026-10-25' },
  });
  assert.equal(again.status, 409);
  assert.equal(again.data.code, 'HIRE_ALREADY_DECIDED');
});

test('合规红线：自动淘汰配置被硬锁定，无法开启', async () => {
  const admin = await auth('zhanggong@xinghe.com');
  const cfg = await call('/api/config', { token: admin });
  const locked = cfg.data.config.find((c) => c.key === 'auto_eliminate_enabled');
  assert.equal(locked.status, 'locked');
  assert.equal(String(locked.value), 'false');
  const res = await call('/api/config/auto_eliminate_enabled', {
    method: 'PATCH', token: admin, body: { value: 'true' },
  });
  assert.equal(res.status, 403);
  assert.equal(res.data.code, 'CONFIG_LOCKED');
});

test('权限：平台管理员不能提交推荐或做面试决定', async () => {
  const admin = await auth('zhanggong@xinghe.com');
  const li = await auth('liting@xinghe.com');
  const list = await call('/api/applications', { token: li });
  const candidate = list.data.applications.find((a) => a.can.recommend);
  if (candidate) {
    const res = await call(`/api/applications/${candidate.id}/recommend`, {
      method: 'POST', token: admin, body: { reason: '管理员试推', gap: 'x' },
    });
    assert.equal(res.status, 403);
  }
  const fb = await call('/api/feedbacks', { token: li });
  const pending = fb.data.items.find((i) => i.status === 'pending');
  if (pending) {
    const res = await call(`/api/recommendations/${pending.id}/feedback`, {
      method: 'POST', token: admin, body: { decision: 'agree', detail: 'x' },
    });
    assert.equal(res.status, 403);
  }
});

test('审计：越权与拒绝操作均写入审计日志', async () => {
  const admin = await auth('zhanggong@xinghe.com');
  const logs = await call('/api/audit?limit=200', { token: admin });
  assert.equal(logs.status, 200);
  assert.ok(logs.data.logs.some((l) => l.result === 'denied'), '应存在拒绝记录');
  assert.ok(logs.data.logs.some((l) => l.action.startsWith('denied.')), '应记录被拒绝的能力点');
});
