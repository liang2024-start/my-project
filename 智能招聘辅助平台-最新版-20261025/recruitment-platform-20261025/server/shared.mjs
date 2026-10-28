import { get, all } from './db.mjs';
import { canViewJob, canViewAll, isJobOwner, isInterviewer, hasCap } from './auth.mjs';

export const APP_STATUS_LABEL = {
  waiting_parse: '待解析',
  parsing: '解析中',
  pending_review: '待核对',
  not_recommended: '人工不推荐',
  recommended: '已推荐-待部门决定',
  need_info: '待补充',
  rejected: '已拒绝',
  interview_pending: '已反馈-待面试',
  interviewed: '已面试',
  offered: '已发 Offer',
  offer_failed: '面试未通过',
  hired: '已入职',
};
export const JOB_STATUS_LABEL = { active: '进行中', suspended: '挂起', closed: '结束', draft: '草稿' };
export const DECISION_LABEL = { agree: '同意面试', reject: '拒绝面试', need_info: '需要补充信息' };

export const activeCondition = (jobId, version) => {
  if (version) return get('SELECT * FROM job_conditions WHERE job_id = ? AND version = ?', jobId, version);
  return get('SELECT * FROM job_conditions WHERE job_id = ? ORDER BY version DESC LIMIT 1', jobId);
};

export function userBrief(userId) {
  const u = get('SELECT id,name,role,dept,account FROM users WHERE id = ?', userId);
  return u ? { ...u, roleLabel: { admin: '平台管理员', manager: '招聘经理', specialist: '招聘专员', deptmgr: '用人部门经理', interviewer: '用人部门面试官' }[u.role] } : null;
}

export function visibleJobs(user) {
  const rows = all('SELECT * FROM jobs ORDER BY created_at DESC');
  return rows.filter((j) => canViewJob(user, j));
}

export function jobSummary(user, job) {
  const cond = activeCondition(job.id);
  const apps = get('SELECT COUNT(*) c FROM applications WHERE job_id = ?', job.id).c;
  const pending = get(
    "SELECT COUNT(*) c FROM recommendations WHERE job_id = ? AND status = 'pending'", job.id
  ).c;
  const clarifyOpen = get("SELECT COUNT(*) c FROM clarifications WHERE job_id = ? AND state = 'pending'", job.id).c;
  return {
    id: job.id, name: job.name, code: job.code, dept: job.dept, status: job.status,
    statusLabel: JOB_STATUS_LABEL[job.status] || job.status,
    headcount: job.headcount, description: job.description,
    owner: userBrief(job.owner_id), requester: userBrief(job.requester_id),
    version: cond?.version || job.current_version,
    applications: apps, pendingDecisions: pending, clarifyOpen,
    clarifyNeeded: !!job.clarify_needed,
    createdAt: job.created_at, closedAt: job.closed_at,
    interviewers: all('SELECT user_id FROM job_members WHERE job_id = ? AND role_on_job = ?', job.id, 'interviewer').map((r) => userBrief(r.user_id)).filter(Boolean),
    can: {
      process: canProcess(user, job),
      publish: false,
      confirmCondition: user.role === 'deptmgr' && user.dept === job.dept,
      assignInterviewer: user.role === 'deptmgr' && user.dept === job.dept,
      decide: user.role === 'deptmgr' && user.dept === job.dept,
      evaluate: (user.role === 'deptmgr' || user.role === 'interviewer') && user.dept === job.dept,
      suspend: job.status === 'active' && user.role === 'deptmgr' && user.dept === job.dept,
      resume: job.status === 'suspended' && user.role === 'deptmgr' && user.dept === job.dept,
      close: job.status !== 'closed' && (user.role === 'deptmgr' && user.dept === job.dept),
      clarify: hasCap(user, 'clarify.create') && isJobOwner(user, job.id),
      replyClarify: (user.role === 'deptmgr' && user.dept === job.dept)
        || (user.role === 'interviewer' && user.dept === job.dept && isInterviewer(user, job.id)),
      analysis: true,
      urge: hasCap(user, 'urge'),
    },
  };
}

function canProcess(user, job) {
  return user.role === 'specialist' && isJobOwner(user, job.id);
}

export function canSeeApplication(user, app) {
  if (!app) return false;
  const job = get('SELECT * FROM jobs WHERE id = ?', app.job_id);
  if (!canViewJob(user, job)) return false;
  if (canViewAll(user)) return true;
  if (user.role === 'specialist') return isJobOwner(user, job.id);
  return job.dept === user.dept;
}

export function parsedOf(appId) {
  const row = get('SELECT * FROM parsed_results WHERE application_id = ? ORDER BY created_at DESC LIMIT 1', appId);
  if (!row) return null;
  return {
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    criteria: JSON.parse(row.criteria || '[]'),
    questions: JSON.parse(row.questions || '[]'),
  };
}

export function recOf(appId) {
  const r = get('SELECT * FROM recommendations WHERE application_id = ? ORDER BY submitted_at DESC LIMIT 1', appId);
  if (!r) return null;
  const fb = get('SELECT * FROM feedbacks WHERE recommendation_id = ? ORDER BY created_at DESC LIMIT 1', r.id);
  return {
    ...r,
    questions: JSON.parse(r.questions || '[]'),
    feedback: fb ? { ...fb, decisionLabel: DECISION_LABEL[fb.decision] } : null,
    submittedByUser: userBrief(r.submitted_by),
  };
}

export function applicationRow(user, app) {
  const job = get('SELECT * FROM jobs WHERE id = ?', app.job_id);
  const parsed = parsedOf(app.id);
  const rec = recOf(app.id);
  const onboarding = get('SELECT * FROM onboardings WHERE application_id = ?', app.id);
  return {
    id: app.id, jobId: app.job_id, jobName: job?.name, dept: job?.dept,
    candidate: app.candidate_name, email: app.candidate_email, phone: app.phone,
    source: app.source || '',
    status: app.status, statusLabel: APP_STATUS_LABEL[app.status] || app.status,
    parseStatus: app.parse_status, parseError: app.parse_error,
    version: app.version, createdAt: app.created_at,
    file: app.file_path ? `/api/applications/${app.id}/file` : null,
    parse: parsed ? { score: parsed.score, grade: parsed.grade, tags: parsed.tags, evidenceMissing: !!parsed.evidence_missing, createdAt: parsed.created_at } : null,
    recommendation: rec ? { id: rec.id, status: rec.status, submittedAt: rec.submitted_at, submittedBy: rec.submittedByUser?.name } : null,
    onboardingId: onboarding?.id || null,
    can: {
      parse: canProcess(user, job) && app.parse_status !== 'parsing',
      recommend: canProcess(user, job) && ['pending_review', 'need_info'].includes(app.status),
      isolate: !canSeeApplication(user, app),
    },
  };
}
