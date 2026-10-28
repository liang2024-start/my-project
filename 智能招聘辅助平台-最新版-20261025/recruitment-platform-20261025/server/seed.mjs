/**
 * 种子数据：把 data/ 下的真实岗位与简历导入平台。
 * 用法：npm run seed            （默认解析前 6 份简历，构造演示流转）
 *      SEED_PARSE=0 npm run seed （只导入不解析，节省模型调用）
 */
import fs from 'node:fs';
import path from 'node:path';
import { extractPdfText, guessCandidateMeta } from './pdf.mjs';
import { parseResume } from './llm.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const DB_FILE = path.join(ROOT, 'storage', 'recruitment.db');
const force = process.argv.includes('--force') || process.env.SEED_FORCE === '1';

if (fs.existsSync(DB_FILE)) {
  if (!force) {
    console.log('[seed] 检测到已有数据库，跳过。需要重建请执行：npm run seed -- --force');
    process.exit(0);
  }
  for (const f of [DB_FILE, DB_FILE + '-wal', DB_FILE + '-shm']) if (fs.existsSync(f)) fs.unlinkSync(f);
  console.log('[seed] 已清理旧数据库');
}

const { run, get, all, uuid, nowISO, audit, transition, notify, listConfig } = await import('./db.mjs');
const { hashPassword } = await import('./auth.mjs');

const PASSWORD = '123456';
const pw = hashPassword(PASSWORD);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const ts = (y, m, d) => new Date(y, m - 1, d, 10, 0, 0).toISOString();

/* ---------------- 1. 用户 ---------------- */
const users = [
  { id: 'U-ADMIN', name: '张工', account: 'zhanggong@xinghe.com', role: 'admin', dept: '信息技术部', status: 'enabled' },
  { id: 'U-SP1', name: '李婷', account: 'liting@xinghe.com', role: 'specialist', dept: '人力资源部 · 招聘组', status: 'enabled' },
  { id: 'U-SP2', name: '张晓', account: 'xiaozhang@xinghe.com', role: 'specialist', dept: '人力资源部 · 招聘组', status: 'enabled' },
  { id: 'U-DM1', name: '王总监', account: 'wangzj@xinghe.com', role: 'deptmgr', dept: '技术部 · 架构组', status: 'enabled' },
  { id: 'U-DM2', name: '陈经理', account: 'chenjl@xinghe.com', role: 'deptmgr', dept: '技术部 · 应用研发组', status: 'enabled' },
  { id: 'U-DM3', name: '吴总监', account: 'wuwj@xinghe.com', role: 'deptmgr', dept: '算法部 · 大模型组', status: 'enabled' },
  { id: 'U-IV1', name: '孙磊', account: 'sunlei@xinghe.com', role: 'interviewer', dept: '技术部 · 应用研发组', status: 'enabled' },
  { id: 'U-IV2', name: '李娜', account: 'lina@xinghe.com', role: 'interviewer', dept: '算法部 · 大模型组', status: 'enabled' },
  { id: 'U-IV3', name: '顾清', account: 'guqing@xinghe.com', role: 'interviewer', dept: '技术部 · 架构组', status: 'enabled' },
];
for (const u of users) {
  run(
    'INSERT INTO users (id,name,account,password_hash,role,dept,status,created_at) VALUES (?,?,?,?,?,?,?,?)',
    u.id, u.name, u.account, pw, u.role, u.dept, u.status, daysAgo(120)
  );
}

/* ---------------- 2. 岗位（来自 岗位及招聘需求.docx） ---------------- */
const jobs = [
  {
    id: 'J-FS', code: 'FS', name: 'AI应用全栈工程师', dept: '技术部 · 应用研发组', headcount: 2,
    description: '负责AI应用从业务界面、服务端接口、数据库到上线运维的完整交付，结合业务完成模型和工具集成，保障异常处理、数据权限及运行稳定性。',
    requester: 'U-DM2', owner: 'U-SP1', interviewer: 'U-IV1', folder: 'AI应用全栈工程师', prefix: 'FS',
    criteria: [
      { id: 'C1', name: '研发年限', type: '必备', weight: 40, rule: '累计满3年全职软件研发工作经验，不把在校项目或实习计入。' },
      { id: 'C2', name: '全栈交付', type: '必备', weight: 30, rule: '至少一个已上线业务应用中，本人实际完成前端交互、服务端接口及数据库设计或实现，三部分均需项目证据。' },
      { id: 'C3', name: 'AI业务集成', type: '加分', weight: 20, rule: '在实际业务应用中完成RAG检索增强或Agent工具调用集成，并上线使用；仅直接调用聊天API或培训演示不满足。' },
      { id: 'C4', name: '发布与运维', type: '加分', weight: 10, rule: '为实际项目落地自动化构建部署、运行监控及版本回滚，三项均有实践证据。' },
    ],
    clarify: { question: 'C3 的「上线使用」是否要求有真实用户量？内部试运行是否可计入？', answer: null, pending: true },
  },
  {
    id: 'J-ML', code: 'ML', name: '大模型算法工程师', dept: '算法部 · 大模型组', headcount: 2,
    description: '负责自然语言处理或大模型训练与微调，建设数据和评测流程，分析模型误差，协作推进推理性能优化及线上效果验证。',
    requester: 'U-DM3', owner: 'U-SP2', interviewer: 'U-IV2', folder: '大模型算法工程师', prefix: 'ML',
    criteria: [
      { id: 'C1', name: '算法年限', type: '必备', weight: 40, rule: '累计满3年全职机器学习算法研发工作经验，不把一般软件开发、在校研究或实习自动计入。' },
      { id: 'C2', name: '训练与评测', type: '必备', weight: 30, rule: '在实际业务项目中亲自完成NLP或大语言模型训练或微调，包含训练数据处理和独立留出集评测；仅调用API、提示词调优或图像模型训练不满足。' },
      { id: 'C3', name: '推理优化', type: '加分', weight: 20, rule: '实际进行模型推理性能优化，并在同等硬件与输入口径下提供延迟、吞吐或显存的量化前后对比。' },
      { id: 'C4', name: '线上实验', type: '加分', weight: 10, rule: '实际参与线上A/B实验，说明实验组、对照组、业务指标及统计判断；仅离线比较或上线前后对比不满足。' },
    ],
    clarify: { question: 'C1 中「一般软件开发」不计入，如何界定算法平台工程化工作的归属？', answer: '训练/评测链路的工程实现可计入，纯业务后端开发不计入。' },
  },
];

for (const j of jobs) {
  run(
    'INSERT INTO jobs (id,code,name,dept,headcount,description,status,owner_id,requester_id,clarify_needed,current_version,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    j.id, j.code, j.name, j.dept, j.headcount, j.description, 'active', j.owner, j.requester, j.clarify?.pending ? 1 : 0, 1, daysAgo(18)
  );
  run(
    'INSERT INTO job_conditions (id,job_id,version,criteria,status,confirmed_by,confirmed_at,note,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
    uuid('JC'), j.id, 1, JSON.stringify(j.criteria), 'confirmed', j.requester, daysAgo(16),
    '部门确认条件版本 v1，作为解析与筛选唯一依据', daysAgo(18)
  );
  run('INSERT INTO job_members (id,job_id,user_id,role_on_job,created_at) VALUES (?,?,?,?,?)', uuid('JM'), j.id, j.owner, 'owner', daysAgo(18));
  run('INSERT INTO job_members (id,job_id,user_id,role_on_job,created_at) VALUES (?,?,?,?,?)', uuid('JM'), j.id, j.interviewer, 'interviewer', daysAgo(17));
  run(
    'INSERT INTO clarifications (id,job_id,version,question,asked_by,asked_at,answer,answered_by,answered_at,state) VALUES (?,?,?,?,?,?,?,?,?,?)',
    uuid('CL'), j.id, 1, j.clarify.question, j.owner, daysAgo(17),
    j.clarify.pending ? null : j.clarify.answer,
    j.clarify.pending ? null : j.requester,
    j.clarify.pending ? null : daysAgo(16.5),
    j.clarify.pending ? 'pending' : 'answered'
  );
  transition({ entityType: 'job', entityId: j.id, to: 'active', byUser: j.requester, note: '需求发布并确认条件' });
}

/* ---------------- 3. 简历导入 ---------------- */
const parseLimit = Number(process.env.SEED_PARSE ?? 6);
const imported = [];
for (const j of jobs) {
  const dir = path.join(ROOT, 'data', 'resumes', j.folder);
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf')).sort();
  for (const file of files) {
    const full = path.join(dir, file);
    let text = '';
    try {
      text = await extractPdfText(full);
    } catch (e) {
      console.warn('[seed] PDF 文本抽取失败', file, e.message);
    }
    if (!text) console.warn('[seed] 简历文本为空，需人工处理：', file);
    const meta = guessCandidateMeta(text, file);
    const id = uuid('A-');
    run(
      `INSERT INTO applications (id,job_id,candidate_name,candidate_email,phone,file_path,file_name,version,intent_confirmed,intent_method,intent_at,status,parse_status,resume_text,uploaded_by,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id, j.id, meta.name, meta.email, meta.phone, path.relative(ROOT, full), file, 1, 1, '电话', daysAgo(2),
      'waiting_parse', 'pending', text, j.owner, daysAgo(2)
    );
    imported.push({ id, job: j, name: meta.name });
  }
}
console.log(`[seed] 导入简历 ${imported.length} 份`);

/* ---------------- 4. 解析（调用大模型） ---------------- */
const parsedOk = [];
if (parseLimit > 0) {
  // 优先解析用于演示流转的候选人，其余按导入顺序补足
  const priority = ['沈知远', '陆景舟', '苏予安', '许念初', '顾星野', '陆闻溪'];
  const rank = (n) => (priority.includes(n) ? priority.indexOf(n) : 99);
  const targets = [...imported].sort((a, b) => rank(a.name) - rank(b.name)).slice(0, parseLimit);
  const queue = [...targets];
  const worker = async () => {
    while (queue.length) {
      const item = queue.shift();
      const cond = get('SELECT * FROM job_conditions WHERE job_id = ? AND version = 1', item.job.id);
      const criteria = JSON.parse(cond.criteria);
      const app = get('SELECT * FROM applications WHERE id = ?', item.id);
      try {
        run("UPDATE applications SET parse_status='parsing',status='parsing' WHERE id=?", item.id);
        const r = await parseResume({ jobName: item.job.name, criteria, resumeText: app.resume_text });
        run(
          `INSERT INTO parsed_results (id,application_id,condition_version,score,grade,tags,criteria,questions,model,prompt_version,evidence_missing,created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
          uuid('PR'), item.id, 1, r.score, r.grade, JSON.stringify(r.tags), JSON.stringify(r.criteria),
          JSON.stringify(r.questions), r.model, r.promptVersion, r.evidenceMissing ? 1 : 0, nowISO()
        );
        run("UPDATE applications SET parse_status='done',status='pending_review' WHERE id=?", item.id);
        transition({ entityType: 'application', entityId: item.id, from: 'parsing', to: 'pending_review', byUser: item.job.owner });
        parsedOk.push({ ...item, score: r.score, grade: r.grade });
        console.log(`[seed] 解析完成 ${item.name}（${item.job.name}）${r.score} 分 / ${r.grade}`);
      } catch (e) {
        run("UPDATE applications SET parse_status='failed',parse_error=?,status='waiting_parse' WHERE id=?", item.id, String(e.message).slice(0, 400));
        console.warn(`[seed] 解析失败 ${item.name}: ${e.message}`);
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  console.log(`[seed] 成功解析 ${parsedOk.length} 份`);
}

/* ---------------- 5. 演示流转（让工作台与看板有内容） ---------------- */
const byName = (name) => imported.find((x) => x.name === name);
const parsedOf = (appId) => get('SELECT * FROM parsed_results WHERE application_id = ? ORDER BY created_at DESC LIMIT 1', appId);

function makeRecommendation({ appId, daysBefore = 0, reason, gap, submitter }) {
  const app = get('SELECT * FROM applications WHERE id = ?', appId);
  const job = jobs.find((j) => j.id === app.job_id);
  const pr = parsedOf(appId);
  if (!pr) {
    console.warn(`[seed] 跳过演示流转：${app.candidate_name} 尚未解析`);
    return { recId: null };
  }
  const recId = uuid('R-');
  const at = daysAgo(daysBefore);
  run(
    `INSERT INTO recommendations (id,application_id,job_id,reason,gap,questions,draft_source,submitted_by,submitted_at,status)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    recId, appId, app.job_id, reason, gap, pr?.questions || '[]', 'llm+human', submitter, at, 'pending'
  );
  run("UPDATE applications SET status='recommended' WHERE id=?", appId);
  transition({ entityType: 'application', entityId: appId, from: 'pending_review', to: 'recommended', byUser: submitter });
  return { recId, app, job };
}
function setDecision(recId, decision, { reason = null, detail = null, request = null, by, at }) {
  if (!recId) return null;
  const rec = get('SELECT * FROM recommendations WHERE id = ?', recId);
  run('INSERT INTO feedbacks (id,recommendation_id,decision,reason,detail,expect_time,request,by_user,by_role,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    uuid('F-'), recId, decision, reason, detail, null, request, by, 'deptmgr', at);
  const map = { agree: 'agreed', reject: 'rejected', need_info: 'need_info' };
  run('UPDATE recommendations SET status = ? WHERE id = ?', map[decision], recId);
  run('UPDATE applications SET status = ? WHERE id = ?',
    decision === 'agree' ? 'interview_pending' : decision === 'reject' ? 'rejected' : 'need_info', rec.application_id);
  const refs = all('SELECT user_id FROM job_members WHERE job_id = ? AND role_on_job = ?', rec.job_id, 'owner').map((r) => r.user_id);
  const mgr = all("SELECT id FROM users WHERE role='manager'").map((r) => r.id);
  notify({
    userIds: [...refs, ...mgr], type: 'dept_feedback', refType: 'recommendation', refId: recId,
    title: `部门反馈：${decision === 'agree' ? '同意面试' : decision === 'reject' ? '拒绝面试' : '需要补充信息'}`,
    body: `${get('SELECT candidate_name FROM applications WHERE id=?', rec.application_id).candidate_name} · ${detail || reason || request || ''}`,
  });
  return rec;
}

function makeHirePipeline({ appId, decisionAt, onboardDaysAgo, outcome = null, submitter }) {
  const made = makeRecommendation({
    appId, daysBefore: onboardDaysAgo + 20, submitter,
    reason: '候选人对已确认条件逐项有原文证据支撑，项目经历与岗位方向一致。',
    gap: '待面试确认跨团队协作与推动落地的具体角色。',
  });
  if (!made.recId) return null;
  const { recId } = made;
  setDecision(recId, 'agree', {
    detail: '同意安排技术面，重点考察架构落地与协作推动。', by: get('SELECT requester_id FROM jobs WHERE id=(SELECT job_id FROM recommendations WHERE id=?)', recId).requester_id,
    at: daysAgo(onboardDaysAgo + 18),
  });
  run('UPDATE applications SET status=? WHERE id=?', 'hired', appId);
  const onb = uuid('ON-');
  const onboardDate = new Date(Date.now() - onboardDaysAgo * 86400000).toISOString().slice(0, 10);
  run('INSERT INTO onboardings (id,recommendation_id,application_id,job_id,onboard_date,created_by,created_at) VALUES (?,?,?,?,?,?,?)',
    onb, recId, appId, get('SELECT job_id FROM recommendations WHERE id=?', recId).job_id, onboardDate, submitter, daysAgo(onboardDaysAgo));
  run('INSERT INTO interviews (id,recommendation_id,result,note,recorded_by,created_at) VALUES (?,?,?,?,?,?)',
    uuid('IV-'), recId, 'pass', '技术面通过，沟通顺畅。', submitter, daysAgo(onboardDaysAgo + 16));
  run('INSERT INTO offers (id,recommendation_id,result,note,recorded_by,created_at) VALUES (?,?,?,?,?,?)',
    uuid('OF-'), recId, 'accepted', '候选人接受 Offer，按约到岗。', submitter, daysAgo(onboardDaysAgo + 12));
  transition({ entityType: 'application', entityId: appId, to: 'hired', byUser: submitter, note: '核实实际入职' });
  if (outcome) {
    run('INSERT INTO hiring_outcomes (id,onboarding_id,rating,evaluation,alignment,by_user,created_at) VALUES (?,?,?,?,?,?,?)',
      uuid('HO-'), onb, outcome.rating, outcome.text, outcome.alignment, outcome.by, daysAgo(outcome.daysBefore));
  }
  return onb;
}

// 1) 待部门决定（超过阈值 → 卡点预警）
const ar1 = byName('沈知远');
if (ar1) {
  makeRecommendation({
    appId: ar1.id, daysBefore: 7, submitter: 'U-SP1',
    reason: '9 年支付与账务系统研发经验，主导清结算平台四服务边界设计与分批切换 1200 家商户，P99 由 420ms 降至 160ms；条件 C1–C4 均有原文证据支撑。',
    gap: '简历未写明期望薪资；容灾演练的复盘材料需面试确认。',
  });
}
// 2) 已同意面试 + 拒绝 + 待补充
const ml1 = byName('顾星野');
if (ml1) {
  const made1 = makeRecommendation({
    appId: ml1.id, daysBefore: 10, submitter: 'U-SP2',
    reason: '具备大模型训练与独立留出集评测经验，主导过推理性能优化并给出量化对比。',
    gap: '线上 A/B 实验细节描述较少，需面谈确认统计判断过程。',
  });
  const recId = made1.recId;
  if (!recId) { /* 未解析则跳过 */ } else {
  setDecision(recId, 'agree', { detail: '同意安排一轮算法面，重点考察评测设计与推理优化细节。', by: 'U-DM3', at: daysAgo(8) });
  run("UPDATE applications SET status='interview_pending' WHERE id=?", ml1.id);
  }
}
const fs2 = byName('许念初');
if (fs2) {
  const made2 = makeRecommendation({
    appId: fs2.id, daysBefore: 6, submitter: 'U-SP1',
    reason: '3 年业务研发经验，前端与服务端均有完整项目交付记录。',
    gap: '数据库设计部分仅提及参与，未说明本人承担范围。',
  });
  const recId = made2.recId;
  if (!recId) { /* 未解析则跳过 */ } else {
  setDecision(recId, 'reject', {
    reason: '全栈交付中数据库设计部分证据不足，且现有团队更需要有 RAG 上线经验的候选人。',
    detail: null, by: 'U-DM2', at: daysAgo(4),
  });
  run("UPDATE applications SET status='rejected' WHERE id=?", fs2.id);
  }
}
const ml2 = byName('陆闻溪');
if (ml2) {
  const made3 = makeRecommendation({
    appId: ml2.id, daysBefore: 5, submitter: 'U-SP2',
    reason: '算法年限与训练评测经验符合必备条件，有明确的推理优化实践。',
    gap: '训练数据处理细节不足，需要补充材料。',
  });
  const recId = made3.recId;
  if (!recId) { /* 未解析则跳过 */ } else {
  setDecision(recId, 'need_info', { request: '请补充训练数据清洗与留出集划分的说明材料。', by: 'U-DM3', at: daysAgo(3) });
  run("UPDATE applications SET status='need_info' WHERE id=?", ml2.id);
  }
}
// 3) 已入职待回评 / 已回评
const fs1 = byName('苏予安');
if (fs1) {
  makeHirePipeline({
    appId: fs1.id, onboardDaysAgo: 96, submitter: 'U-SP1',
    outcome: { rating: '优秀', text: '入职两周独立承接核心业务页与服务端接口，异常处理与权限设计意识强；面试时判断的「三端均有实操」完全成立。', alignment: '与面试判断一致', by: 'U-DM2', daysBefore: 40 },
  });
}
const ar2 = byName('陆景舟');
if (ar2) {
  makeHirePipeline({ appId: ar2.id, onboardDaysAgo: 42, submitter: 'U-SP1' });
}

/* ---------------- 6. 收尾 ---------------- */
audit({ user: { id: 'SYSTEM', name: '系统' }, action: 'seed', objectType: 'database', objectId: '-', detail: { jobs: jobs.length, applications: imported.length, parsed: parsedOk.length } });

const stat = {
  users: get('SELECT COUNT(*) c FROM users').c,
  jobs: get('SELECT COUNT(*) c FROM jobs').c,
  applications: get('SELECT COUNT(*) c FROM applications').c,
  parsed: get("SELECT COUNT(*) c FROM parsed_results").c,
  recommendations: get('SELECT COUNT(*) c FROM recommendations').c,
  feedbacks: get('SELECT COUNT(*) c FROM feedbacks').c,
  onboardings: get('SELECT COUNT(*) c FROM onboardings').c,
  outcomes: get('SELECT COUNT(*) c FROM hiring_outcomes').c,
};
console.log('[seed] 完成', stat);
console.log(`[seed] 演示账号密码统一为 ${PASSWORD}`);
