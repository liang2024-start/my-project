/**
 * 一次性数据迁移（V2 功能调整）
 *   node --experimental-sqlite server/migrate-v2.mjs
 *
 * 做四件事：
 *   1. 删除周姐 / 赵敏 / 刘总监 三个账号（含会话、岗位成员关系）
 *   2. 所有账号密码统一重置为 123456
 *   3. 级联删除「高级系统架构师」岗位及其全部招聘数据（简历、解析、推荐、反馈、面试、Offer、入职、用人结果、澄清、面试官、条件版本、通知）
 *   4. 补建 job_analyses 表 / clarifications.parent_id（由 db.mjs 自动完成）
 *
 * 可重复执行：已删除的数据第二次运行不会报错。
 */
import { db, get, all, run, nowISO, audit } from './db.mjs';
import { hashPassword, ROLE_LABEL } from './auth.mjs';

const PASSWORD = '123456';
const KEEP_OUT = ['zhoujie@xinghe.com', 'zhaomin@xinghe.com', 'liuzj@xinghe.com'];   // 待删除账号
const PURGE_JOB_NAMES = ['高级系统架构师', '高级架构工程师'];
const PURGE_JOB_CODES = ['AR'];

const log = (...a) => console.log('[migrate]', ...a);

/* ---------------- 1. 删除指定账号 ---------------- */
const removedUsers = [];
for (const account of KEEP_OUT) {
  const u = get('SELECT * FROM users WHERE lower(account) = ?', account.toLowerCase());
  if (!u) { log('账号不存在，跳过：', account); continue; }
  run('DELETE FROM sessions WHERE user_id = ?', u.id);
  run('DELETE FROM job_members WHERE user_id = ?', u.id);
  run('DELETE FROM notifications WHERE user_id = ?', u.id);
  run('DELETE FROM users WHERE id = ?', u.id);
  removedUsers.push(`${u.name}(${u.account})`);
}
// 兜底：清掉指向已不存在用户的负责人/提出人
for (const j of all('SELECT * FROM jobs')) {
  if (j.owner_id && !get('SELECT id FROM users WHERE id = ?', j.owner_id)) run('UPDATE jobs SET owner_id = NULL WHERE id = ?', j.id);
  if (j.requester_id && !get('SELECT id FROM users WHERE id = ?', j.requester_id)) run('UPDATE jobs SET requester_id = NULL WHERE id = ?', j.id);
}
log('已删除账号：', removedUsers.join('、') || '无');

/* ---------------- 2. 密码统一 ---------------- */
const pw = hashPassword(PASSWORD);
const users = all('SELECT * FROM users');
for (const u of users) run('UPDATE users SET password_hash = ? WHERE id = ?', pw, u.id);
run('DELETE FROM sessions');   // 密码变更后强制重新登录
log(`已重置 ${users.length} 个账号密码为 ${PASSWORD}`);

/* ---------------- 3. 级联删除岗位数据 ---------------- */
const jobsToPurge = all('SELECT * FROM jobs').filter(
  (j) => PURGE_JOB_NAMES.includes(j.name) || PURGE_JOB_CODES.includes(j.code)
);
let stat = { jobs: 0, apps: 0, recs: 0, files: 0 };
for (const job of jobsToPurge) {
  const apps = all('SELECT * FROM applications WHERE job_id = ?', job.id);
  for (const a of apps) {
    const recs = all('SELECT * FROM recommendations WHERE application_id = ?', a.id);
    for (const r of recs) {
      const onbs = all('SELECT * FROM onboardings WHERE recommendation_id = ?', r.id);
      for (const o of onbs) run('DELETE FROM hiring_outcomes WHERE onboarding_id = ?', o.id);
      run('DELETE FROM onboardings WHERE recommendation_id = ?', r.id);
      run('DELETE FROM interviews WHERE recommendation_id = ?', r.id);
      run('DELETE FROM offers WHERE recommendation_id = ?', r.id);
      run('DELETE FROM feedbacks WHERE recommendation_id = ?', r.id);
    }
    run('DELETE FROM recommendations WHERE application_id = ?', a.id);
    run('DELETE FROM parsed_results WHERE application_id = ?', a.id);
    run('DELETE FROM state_transitions WHERE entity_type = ? AND entity_id = ?', 'application', a.id);
    run('DELETE FROM applications WHERE id = ?', a.id);
    stat.apps += 1;
  }
  run('DELETE FROM clarifications WHERE job_id = ?', job.id);
  run('DELETE FROM job_conditions WHERE job_id = ?', job.id);
  run('DELETE FROM job_members WHERE job_id = ?', job.id);
  run('DELETE FROM job_analyses WHERE job_id = ?', job.id);
  run('DELETE FROM notifications WHERE ref_type = ? AND ref_id = ?', 'job', job.id);
  run('DELETE FROM state_transitions WHERE entity_type = ? AND entity_id = ?', 'job', job.id);
  run('DELETE FROM jobs WHERE id = ?', job.id);
  stat.jobs += 1;
  log(`已删除岗位「${job.name}」及其 ${apps.length} 份简历`);
}

/* ---------------- 4. 收尾 ---------------- */
db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
audit({ user: { id: 'SYSTEM', name: '系统' }, action: 'migrate.v2', objectType: 'database', objectId: '-', detail: { removedUsers, stat } });

const summary = {
  users: get('SELECT COUNT(*) c FROM users').c,
  jobs: get('SELECT COUNT(*) c FROM jobs').c,
  applications: get('SELECT COUNT(*) c FROM applications').c,
  parsed: get('SELECT COUNT(*) c FROM parsed_results').c,
  recommendations: get('SELECT COUNT(*) c FROM recommendations').c,
  feedbacks: get('SELECT COUNT(*) c FROM feedbacks').c,
  onboardings: get('SELECT COUNT(*) c FROM onboardings').c,
  outcomes: get('SELECT COUNT(*) c FROM hiring_outcomes').c,
  clarifications: get('SELECT COUNT(*) c FROM clarifications').c,
};
log('完成，当前数据：', JSON.stringify(summary, null, 0));
console.log('\n=== 剩余账号（密码统一 123456）===');
for (const u of all('SELECT name,account,role,dept,status FROM users ORDER BY role,name')) {
  console.log(`  ${u.name.padEnd(4, ' ')} ${u.account.padEnd(22, ' ')} ${ROLE_LABEL[u.role]} · ${u.dept}${u.status !== 'enabled' ? ' [' + u.status + ']' : ''}`);
}
