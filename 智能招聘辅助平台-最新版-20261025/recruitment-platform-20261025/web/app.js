/* 星禾数智 · 智能招聘辅助平台 前端（原生 ESM，无构建） */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const state = {
  token: localStorage.getItem('token') || '',
  user: null,
  page: 'jobs',
  jobs: [],
  jobId: null,
  jobDetail: null,
  apps: [],
  appId: null,
  recItems: [],
  recId: null,
  fbTab: 'rec',
  onboardings: [],
  onboardId: null,
  dash: null,
  notifications: [],
  accounts: [],
};

const PAGE_TITLE = {
  jobs: '岗位需求工作台', resumes: '简历筛选与核对工作台', feedback: '部门反馈工作台',
  dashboard: '数据看板与流程监控', profile: '个人中心', admin: '平台管理',
};
const JOB_STATUS = { active: ['green', '进行中'], suspended: ['orange', '挂起'], closed: ['gray', '结束'] };
const APP_STATUS = {
  waiting_parse: ['blue', '待解析'], parsing: ['blue', '解析中'], pending_review: ['blue', '待核对'],
  not_recommended: ['gray', '人工不推荐'], recommended: ['orange', '已推荐-待部门决定'],
  need_info: ['purple', '待补充'], rejected: ['red', '已拒绝'], interview_pending: ['green', '已反馈-待面试'],
  interviewed: ['blue', '已面试'], offered: ['green', '已发 Offer'], offer_failed: ['red', '面试未通过'],
  hired: ['green', '已入职'],
};
const REC_STATUS = {
  pending: ['orange', '待部门决定'], agreed: ['green', '已同意面试'], rejected: ['red', '已拒绝'],
  need_info: ['purple', '待补充'], withdrawn: ['gray', '已撤回'],
};
const DECISION = { agree: '同意面试', reject: '拒绝面试', need_info: '需要补充信息' };

const tag = (map, key) => {
  const [cls, label] = map[key] || ['gray', key];
  return `<span class="tag ${cls}">${esc(label)}</span>`;
};
const fmtDay = (iso) => (iso ? String(iso).slice(0, 10) : '—');
const fmtTime = (iso) => (iso ? String(iso).replace('T', ' ').slice(0, 16) : '—');

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = (type === 'error' ? '⚠️ ' : type === 'info' ? '💡 ' : '✅ ') + esc(msg);
  $('#toasts').appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0'; el.style.transition = '.3s';
    setTimeout(() => el.remove(), 320);
  }, 3200);
}
function openModal(html) {
  $('#modal-box').innerHTML = html;
  $('#modal-mask').classList.add('show');
}
function closeModal() { $('#modal-mask').classList.remove('show'); }
$('#modal-mask').addEventListener('click', (e) => { if (e.target.id === 'modal-mask') closeModal(); });

async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  if (state.token) headers.Authorization = 'Bearer ' + state.token;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const res = await fetch('/api' + path, { method, headers, body: payload });
  if (res.status === 401) { logoutLocal(); throw new Error('登录状态已失效，请重新登录'); }
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const err = new Error(data?.error || '请求失败');
    err.code = data?.code; err.status = res.status; err.data = data;
    throw err;
  }
  return data;
}

/* ============================ 登录 ============================ */
async function loadDemoAccounts() {
  try {
    const rows = await (await fetch('/api/demo-accounts')).json();
    state.accounts = rows;
    const groups = [
      ['专项角色', ['admin', 'manager']],
      ['招聘专员', ['specialist']],
      ['用人部门', ['deptmgr', 'interviewer']],
    ];
    $('#demo-account-list').innerHTML = groups.map(([title, roles]) => {
      const list = rows.filter((r) => roles.includes(r.role));
      if (!list.length) return '';
      return `<div class="muted" style="margin:6px 0 2px;font-size:11px;">${title}</div>` + list.map((u) => `
        <div class="demo-acc ${u.status !== 'enabled' ? 'dis' : ''}" data-account="${esc(u.account)}" data-status="${u.status}">
          <span class="n">${esc(u.name)}</span>
          <span class="d">${esc(u.roleLabel)} · ${esc(u.dept)}</span>
          ${u.status === 'enabled' ? '' : `<span class="tag ${u.status === 'disabled' ? 'gray' : 'orange'}" style="font-size:10.5px;">${u.status === 'disabled' ? '已停用' : '待激活'}</span>`}
        </div>`).join('');
    }).join('');
    $$('#demo-account-list .demo-acc').forEach((el) => {
      el.addEventListener('click', () => {
        const status = el.dataset.status;
        if (status !== 'enabled') { toast('该账号' + (status === 'disabled' ? '已停用' : '尚未激活') + '，无法登录', 'error'); return; }
        // 只填入账号：密码必须由使用者手动输入，避免点一下就被代填
        $('#login-account').value = el.dataset.account;
        $('#login-password').value = '';
        $('#login-password').focus();
        $$('#demo-account-list .demo-acc').forEach((x) => x.classList.toggle('picked', x === el));
      });
    });
  } catch { /* 演示账号加载失败不影响登录 */ }
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#login-submit');
  const errBox = $('#login-error');
  errBox.classList.remove('show');
  btn.disabled = true; btn.textContent = '登录中…';
  try {
    const data = await api('/login', { method: 'POST', body: { account: $('#login-account').value.trim(), password: $('#login-password').value } });
    state.token = data.token;
    localStorage.setItem('token', data.token);
    state.user = data.user;
    await enterApp();
  } catch (err) {
    errBox.textContent = err.message;
    errBox.classList.add('show');
  } finally {
    btn.disabled = false; btn.textContent = '登录';
  }
});

function logoutLocal() {
  state.token = ''; state.user = null;
  localStorage.removeItem('token');
  $('#app-view').hidden = true;
  $('#login-view').hidden = false;
  closeModal();
}

async function logout() {
  try { await api('/logout', { method: 'POST' }); } catch {}
  logoutLocal();
  toast('已退出登录', 'info');
}

/* ============================ 应用壳 ============================ */
async function enterApp() {
  const me = await api('/me');
  state.user = me.user;
  $('#login-view').hidden = true;
  $('#app-view').hidden = false;
  updateAccountUI();
  $('#nav-admin').hidden = !me.user.capabilities.includes('user.manage');
  await Promise.all([loadNotifications(), renderJobs()]);
  const q = new URLSearchParams(location.search);
  const page = q.get('p');
  const avail = Object.keys(PAGE_TITLE).filter((k) => k !== 'admin' || me.user.capabilities.includes('user.manage'));
  go(avail.includes(page) ? page : 'jobs');
  // 深链接：直接定位岗位 / 简历 / 推荐 / 用人结果
  if (q.get('job')) await openJob(q.get('job'));
  if (q.get('app')) await openResume(q.get('app'));
  if (q.get('rec')) { state.recId = q.get('rec'); go('feedback'); }
  if (q.get('tab') === 'hire') { state.fbTab = 'hire'; go('feedback'); }
}

function updateAccountUI() {
  const u = state.user;
  $('#acc-avatar').textContent = u.name.slice(0, 1);
  $('#acc-name').textContent = u.name;
  $('#acc-sub').textContent = `${u.roleLabel} · ${u.dept}`;
  $('#panel-account').innerHTML = `
    <div class="ap-head"><b>${esc(u.name)}</b>${esc(u.roleLabel)} · ${esc(u.dept)}<br><span style="font-size:11px;">${esc(u.account)}</span></div>
    <div class="ap-list">
      <div class="ap-item" onclick="UI.openProfile()"><span class="avatar" style="background:#e8f0ff;color:#2b6cd4;">👤</span><div class="ap-info"><b>个人中心</b><small>修改我的登录账号与密码</small></div></div>
      <div class="ap-item" onclick="UI.logout()"><span class="avatar" style="background:#fdeceb;color:#d83931;">⇥</span><div class="ap-info"><b>退出登录</b><small>结束后需重新输入账号密码</small></div></div>
    </div>
    <div class="ap-foot">角色与部门由平台管理员维护；停用账号将立即失效。</div>`;
}

function closePanels() {
  $$('.panel').forEach((p) => p.classList.remove('open'));
  $('#acc-caret')?.classList.remove('open');
}
document.addEventListener('click', (e) => { if (!e.target.closest('.dd')) closePanels(); });
$('#account-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  const open = $('#panel-account').classList.toggle('open');
  $('#panel-notif').classList.remove('open');
  $('#acc-caret').classList.toggle('open', open);
});
$('#bell-btn').addEventListener('click', async (e) => {
  e.stopPropagation();
  const open = $('#panel-notif').classList.toggle('open');
  $('#panel-account').classList.remove('open');
  if (open) await renderNotificationsPanel();
});

$$('#nav .nav-item').forEach((b) => b.addEventListener('click', () => go(b.dataset.page)));

async function go(page) {
  state.page = page;
  $$('#nav .nav-item').forEach((b) => b.classList.toggle('active', b.dataset.page === page));
  $('#page-title').textContent = PAGE_TITLE[page] || '';
  try {
    await render(page);
  } catch (err) {
    toast(err.message, 'error');
    content().innerHTML = `<div class="card"><div class="empty-state">加载失败：${esc(err.message)}<br><span class="muted">请刷新重试，或确认当前账号有该模块权限。</span></div></div>`;
  }
}
function render(page = state.page) {
  if (page === 'jobs') return renderJobs();
  if (page === 'resumes') return state.appId ? renderResumeDetail(state.appId) : renderResumeList();
  if (page === 'feedback') return renderFeedback();
  if (page === 'dashboard') return renderDashboard();
  if (page === 'profile') return renderProfile();
  if (page === 'admin') return renderAdmin();
}
const content = () => $('#content');

async function loadNotifications() {
  try {
    const data = await api('/notifications');
    state.notifications = data.items;
    const unread = data.unread;
    $('#bell-dot').hidden = unread === 0;
    $('#bell-dot').textContent = unread > 9 ? '9+' : unread;
    const fbBadge = $('#nav-fb-badge');
    const canReceive = ['specialist', 'manager'].includes(state.user.role);
    fbBadge.hidden = !(canReceive && unread > 0);
    fbBadge.textContent = unread;
  } catch {}
}
async function renderNotificationsPanel() {
  await loadNotifications();
  const items = state.notifications;
  $('#panel-notif').innerHTML = `
    <div class="ap-head"><b>通知</b>${items.filter((i) => !i.read_at).length} 条未读 · 点击查看并标记已读</div>
    ${items.length ? items.map((n) => `
      <div class="nf-item ${n.read_at ? '' : 'unread'}" data-id="${n.id}" data-type="${n.type}" data-ref="${n.ref_type || ''}" data-refid="${n.ref_id || ''}">
        <div class="nf-top"><b>${esc(n.title)}</b><span class="nf-time">${fmtTime(n.created_at).slice(5)}</span></div>
        <div class="nf-detail">${esc(n.body || '')}</div>
      </div>`).join('') : '<div class="nf-empty">暂无通知</div>'}
    <div class="ap-foot"><button class="link-btn" onclick="UI.readAllNotifs()">全部标记已读</button></div>`;
  $$('#panel-notif .nf-item').forEach((el) => el.addEventListener('click', () => UI.openNotif(el.dataset)));
}

/* ============================ 岗位需求 ============================ */
/* 示例岗位：给「部门还没有岗位」的用人部门经理一键带出可发布的内容，避免面对空表单无从下手 */
const DEMO_JOB = {
  name: '后端开发工程师',
  headcount: 1,
  description: '负责内部系统与平台服务的后端设计与开发：独立完成接口设计、数据结构与数据库优化，能定位并解决线上性能问题，与前端、算法同学配合完成交付。要求有线上服务的真实维护经验，能说清自己负责的模块与解决过的问题。',
  criteria: [
    { id: 'C1', name: '后端开发经验（独立负责过线上服务）', type: '必备', weight: 40 },
    { id: 'C2', name: '数据库设计与 SQL 优化', type: '必备', weight: 35 },
    { id: 'C3', name: '高并发与性能调优经验', type: '加分', weight: 25 },
  ],
  confirmed: false,
};

async function renderJobs(keepId) {
  const data = await api('/jobs');
  state.jobs = data.jobs;
  if (!data.jobs.length) {
    content().innerHTML = `
      <div class="jobs-layout">
        <div>
          <div class="card" style="padding:13px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <h3 style="margin:0;">招聘需求（0）</h3>
            ${data.canPublish
              ? `<div class="row-actions">
                   <button class="btn btn-plain btn-sm" id="btn-demo">填入示例内容</button>
                   <button class="btn btn-primary btn-sm" id="btn-publish">＋ 发布岗位需求</button>
                 </div>`
              : '<span class="muted" style="font-size:12px;">暂无岗位</span>'}
          </div>
          <div class="card"><div class="empty-state">
            ${data.canPublish
              ? `「${esc(state.user.dept || '')}」目前没有岗位需求。<br>点击上方「＋ 发布岗位需求」，填写岗位职责与筛选条件即可发起招聘（判定规则可不填）。<br><span class="muted">不会填？点「填入示例内容」可自动带出一份可直接发布的示例；发布后会通知你指定的招聘专员，由其提交候选人简历。</span>`
              : '暂无可查看的岗位。<br>请联系招聘经理分配岗位，或由用人部门发布需求。'}
          </div></div>
        </div>
        <div id="job-detail"><div class="card"><div class="empty-state">发布岗位后，这里会显示岗位条件、岗位画像解读与面试官团队。</div></div></div>
      </div>`;
    $('#btn-publish')?.addEventListener('click', () => openPublishJobModal());
    $('#btn-demo')?.addEventListener('click', () => openPublishJobModal(DEMO_JOB));
    return;
  }
  const id = keepId || state.jobId || data.jobs[0].id;
  content().innerHTML = `
    <div class="jobs-layout">
      <div>
        <div class="card" style="padding:13px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <h3 style="margin:0;">招聘需求（${data.jobs.length}）</h3>
          ${data.canPublish ? '<button class="btn btn-primary btn-sm" id="btn-publish">＋ 发布岗位需求</button>' : '<span class="muted" style="font-size:12px;">点击岗位查看已确认条件</span>'}
        </div>
        <div id="job-list"></div>
      </div>
      <div id="job-detail"></div>
    </div>`;
  $('#btn-publish')?.addEventListener('click', () => openPublishJobModal());
  $('#job-list').innerHTML = data.jobs.map((j) => `
    <div class="job-item" data-id="${j.id}">
      <div class="j-top"><span class="j-name">${esc(j.name)}</span>${tag(JOB_STATUS, j.status)}</div>
      <div class="j-meta"><span>${esc(j.dept)}</span><span>招 ${j.headcount} 人</span><span>简历 ${j.applications} 份</span></div>
      <div class="j-meta" style="margin-top:5px;">
        <span>专员：${esc(j.owner?.name || '未分配')}</span>
        <span>提出人：${esc(j.requester?.name || '—')}</span>
        ${j.pendingDecisions ? `<span style="color:var(--orange)">待反馈 ${j.pendingDecisions}</span>` : ''}
        ${j.clarifyOpen ? '<span style="color:var(--orange)">待澄清</span>' : ''}
      </div>
    </div>`).join('');
  $$('#job-list .job-item').forEach((el) => el.addEventListener('click', () => openJob(el.dataset.id)));
  await openJob(id);
}

async function openJob(id) {
  state.jobId = id;
  $$('#job-list .job-item').forEach((el) => el.classList.toggle('active', el.dataset.id === id));
  const { job } = await api('/jobs/' + id);
  state.jobDetail = job;
  const cond = job.condition;
  const c = job.can;
  $('#job-detail').innerHTML = `
    <div class="card">
      <div class="inline" style="justify-content:space-between;">
        <h3 style="margin:0;">${esc(job.name)} <span class="tag gray">条件 v${job.version}</span> ${tag(JOB_STATUS, job.status)}</h3>
        <div class="row-actions">
          ${c.confirmCondition ? '<button class="btn btn-plain btn-sm" id="btn-change-cond">变更条件</button>' : ''}
          ${c.suspend ? '<button class="btn btn-plain btn-sm" id="btn-suspend">挂起</button>' : ''}
          ${c.resume ? '<button class="btn btn-plain btn-sm" id="btn-resume">恢复</button>' : ''}
          ${c.close && job.status !== 'closed' ? '<button class="btn btn-danger btn-sm" id="btn-close">确认需求结束</button>' : ''}
        </div>
      </div>
      <p style="color:var(--text2);font-size:13px;line-height:1.8;margin:10px 0 14px;">${esc(job.description)}</p>
      ${job.clarifyOpen ? `<div class="clarify-banner">⚠️ 该岗位有 ${job.clarifyOpen} 条澄清待回复；澄清未完成前不应进入筛选。${c.clarify ? '<button class="btn btn-warn btn-sm" style="margin-left:auto;" id="btn-clarify">发起澄清</button>' : ''}</div>` : (c.clarify ? `<div style="margin-bottom:12px;"><button class="btn btn-plain btn-sm" id="btn-clarify">发起澄清问询</button></div>` : '')}

      <h3>🎯 已确认的岗位条件与权重</h3>
      ${cond ? `
      <table class="crit-table">
        <thead><tr><th>编号</th><th>条件</th><th>类型</th><th>权重</th><th>判定规则 / 追问结论</th></tr></thead>
        <tbody>${cond.criteria.map((x) => `
          <tr><td>${esc(x.id)}</td><td>${esc(x.name)}</td><td>${x.type === '必备' ? '<span class="tag red">必备</span>' : '<span class="tag blue">加分</span>'}</td>
          <td class="w">${x.weight}%</td><td>${x.rule ? esc(x.rule) : '<span class="muted">未填写（以条件名称 + 岗位描述为准，边界不清时通过追问澄清）</span>'}</td></tr>`).join('')}</tbody>
      </table>
      <div class="confirm-strip">✔ 条件版本 v${cond.version} 已由 ${esc(cond.confirmedBy?.name || '')}（${esc(cond.confirmedBy?.dept || '')}）于 ${fmtTime(cond.confirmedAt)} 确认，作为解析与人工推荐的唯一依据（BR-02）</div>
      <div class="ai-note">权重建议值 40/30/30 是否全岗位通用属待确认项（C2）；本岗位实际权重以上表为准。</div>` : '<div class="empty-state">尚未确认条件版本，不能用于解析与筛选</div>'}
    </div>

    <div class="card" id="job-analysis-card">
      <div class="inline" style="justify-content:space-between;margin-bottom:8px;">
        <h3 style="margin:0;">🧭 岗位画像解读 <span class="muted" style="font-weight:400;font-size:11.5px;">（大模型读岗位描述与已确认条件后给出的筛选指引）</span></h3>
        ${job.analysis ? `<span class="muted" style="font-size:11.5px;">v${job.analysis.conditionVersion} · ${fmtTime(job.analysis.createdAt)}${job.analysis.by ? ' · ' + esc(job.analysis.by) : ''}</span>` : ''}
      </div>
      ${job.analysis?.stale ? '<div class="inline-notice warn" style="margin-bottom:10px;">⚠️ 该解读基于旧版本条件，条件已变更，建议重新生成。</div>' : ''}
      ${job.analysis ? `
        <div class="ja-summary">${esc(job.analysis.summary || '')}</div>
        ${job.analysis.coreGoal ? `<div class="ja-goal"><b>入职后核心目标：</b>${esc(job.analysis.coreGoal)}</div>` : ''}
        ${job.analysis.mustHave?.length ? `
          <div class="ja-sec-title">① 必备条件 · 简历里要看到什么才算符合</div>
          ${job.analysis.mustHave.map((m, i) => `
            <div class="ja-item">
              <div class="ja-item-head"><b>${i + 1}. ${esc(m.name)}</b></div>
              ${m.why ? `<div class="muted">为什么重要：${esc(m.why)}</div>` : ''}
              ${m.evidence ? `<div class="ja-evi"><b>需要的证据</b>${esc(m.evidence)}</div>` : ''}
              ${m.hint ? `<div class="muted" style="margin-top:4px;">通常在简历的：${esc(m.hint)}</div>` : ''}
            </div>`).join('')}` : ''}
        ${job.analysis.niceToHave?.length ? `
          <div class="ja-sec-title">② 加分项 · 有则优先，不构成硬性门槛</div>
          <div class="ja-chips">${job.analysis.niceToHave.map((n) => `<span class="ja-chip" title="${esc(n.why)}">${esc(n.name)}</span>`).join('')}</div>` : ''}
        ${job.analysis.screeningSignals?.length ? `
          <div class="ja-sec-title">③ 筛简历时值得留意的正向信号</div>
          ${job.analysis.screeningSignals.map((x) => `<div class="ja-signal"><span class="ja-dot good"></span><div><b>${esc(x.signal)}</b>${x.why ? `<div class="muted">${esc(x.why)}</div>` : ''}</div></div>`).join('')}` : ''}
        ${job.analysis.redFlags?.length ? `
          <div class="ja-sec-title">④ 看似相关但实际不满足的情况</div>
          ${job.analysis.redFlags.map((x) => `<div class="ja-signal"><span class="ja-dot bad"></span><div><b>${esc(x.signal)}</b>${x.why ? `<div class="muted">${esc(x.why)}</div>` : ''}</div></div>`).join('')}` : ''}
        ${job.analysis.askCandidates?.length ? `
          <div class="ja-sec-title">⑤ 初筛沟通时建议向候选人确认</div>
          <ul class="ja-list">${job.analysis.askCandidates.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>` : ''}
        ${job.analysis.askDept?.length ? `
          <div class="ja-sec-title">⑥ 还需要用人部门明确的点（可点击下方「追问」）</div>
          <ul class="ja-list">${job.analysis.askDept.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>` : ''}
        <div class="ai-note">以上为对岗位描述的理解性解读，不构成候选人评价；筛选与推荐仍由专员人工判断并留痕。</div>
      ` : `<div class="empty-state">尚未生成岗位画像解读。<br><span class="muted">生成后可以看清：这条岗位到底要什么人、简历里出现什么才算符合、哪些经历看着像其实不算。</span></div>`}
      <div class="inline" style="margin-top:10px;">
        <button class="btn ${job.analysis ? 'btn-plain' : 'btn-primary'} btn-sm" id="btn-analysis">${job.analysis ? '↻ 重新生成解读' : '✨ 生成岗位画像解读'}</button>
        ${c.clarify ? '<button class="btn btn-plain btn-sm" id="btn-ask-dept">💬 就岗位需求追问用人部门</button>' : ''}
        <span class="muted" style="font-size:11.5px;">调用大模型，约 10 秒；解读会随条件版本留档。</span>
      </div>
    </div>

    <div class="card">
      <div class="inline" style="justify-content:space-between;margin-bottom:8px;">
        <h3 style="margin:0;">👥 面试官团队（本部门）</h3>
        ${c.assignInterviewer ? '<button class="btn btn-plain btn-sm" id="btn-assign">＋ 指派面试官</button>' : '<span class="muted" style="font-size:12px;">指派权限：该部门经理</span>'}
      </div>
      <div class="iv-chips">
        ${job.interviewers.length ? job.interviewers.map((u) => `<span class="iv-chip"><span class="avatar">${esc(u.name.slice(0, 1))}</span>${esc(u.name)}</span>`).join('') : '<span class="muted">暂未指派面试官</span>'}
      </div>
      <div class="ai-note">仅可从本部门（${esc(job.dept)}）成员中指派；面试官可查看材料并在候选人入职后提交用人结果反馈。</div>
    </div>

    <div class="card">
      <div class="inline" style="justify-content:space-between;margin-bottom:8px;">
        <h3 style="margin:0;">💬 需求追问与澄清 <span class="muted" style="font-weight:400;font-size:11.5px;">（专员提问 · 用人部门经理/面试官解答，只读追加）</span></h3>
        ${c.clarify ? '<button class="btn btn-primary btn-sm" id="btn-ask">＋ 发起追问</button>' : ''}
      </div>
      ${job.clarifications.length ? job.clarifications.map((cl) => {
        const parent = cl.parent_id ? job.clarifications.find((x) => x.id === cl.parent_id) : null;
        return `
        <div class="qa-item ${cl.state === 'pending' ? 'pending' : ''} ${cl.parent_id ? 'followup' : ''}">
          ${parent ? `<div class="qa-quote">↳ 追问自：${esc(parent.question.slice(0, 60))}${parent.question.length > 60 ? '…' : ''}</div>` : ''}
          <div class="q">问：${esc(cl.question)}</div>
          ${cl.answer ? `<div class="a">答：${esc(cl.answer)}</div>` : '<div class="a" style="color:var(--orange)">待用人部门解答…</div>'}
          <div class="t">${esc(cl.askedByUser?.name || '')} · ${fmtTime(cl.asked_at)}${cl.answeredByUser ? `　|　解答：${esc(cl.answeredByUser.name)} · ${fmtTime(cl.answered_at)}` : ''}</div>
          <div class="qa-actions">
            ${cl.state === 'pending' && c.replyClarify ? `<button class="btn btn-warn btn-sm" data-reply="${cl.id}">解答这条追问</button>` : ''}
            ${cl.state === 'answered' && c.clarify ? `<button class="btn btn-plain btn-sm" data-followup="${cl.id}">继续追问</button>` : ''}
          </div>
        </div>`;
      }).join('') : '<div class="empty-state">暂无追问记录。岗位描述或条件有不清楚的地方，可发起追问，用人部门解答后会通知你。</div>'}
      <div class="ai-note">追问与解答全部留痕、不可编辑或删除（BR-03）；条件本身变更请使用「变更条件」生成新版本。</div>
    </div>`;

  $('#btn-change-cond')?.addEventListener('click', () => openConditionModal(job));
  $('#btn-assign')?.addEventListener('click', () => openAssignModal(job));
  $('#btn-clarify')?.addEventListener('click', () => openClarifyModal(job));
  $('#btn-suspend')?.addEventListener('click', () => UI.jobStatus(job.id, 'suspended'));
  $('#btn-resume')?.addEventListener('click', () => UI.jobStatus(job.id, 'active'));
  $('#btn-close')?.addEventListener('click', () => UI.jobStatus(job.id, 'closed'));
  $$('[data-reply]').forEach((b) => b.addEventListener('click', () => openReplyClarifyModal(b.dataset.reply)));
  $$('[data-followup]').forEach((b) => b.addEventListener('click', () => {
    const parent = job.clarifications.find((x) => x.id === b.dataset.followup);
    openClarifyModal(job, parent);
  }));
  $('#btn-ask')?.addEventListener('click', () => openClarifyModal(job));
  $('#btn-ask-dept')?.addEventListener('click', () => openClarifyModal(job));
  $('#btn-analysis')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget; btn.disabled = true; btn.innerHTML = '<span class="loading dark"></span>大模型解读中（约 10 秒）…';
    try {
      const r = await api(`/jobs/${job.id}/analysis`, { method: 'POST' });
      if (r.notice) toast(r.notice, 'info');
      toast('岗位画像解读已生成');
      await openJob(job.id);
    } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = '✨ 生成岗位画像解读'; }
  });
}

function criteriaEditor(criteria = []) {
  const rows = criteria.length ? criteria : [
    { id: 'C1', name: '研发年限', type: '必备', weight: 40, rule: '' },
    { id: 'C2', name: '核心能力', type: '必备', weight: 30, rule: '' },
    { id: 'C3', name: '加分项一', type: '加分', weight: 20, rule: '' },
    { id: 'C4', name: '加分项二', type: '加分', weight: 10, rule: '' },
  ];
  return `<div id="crit-rows">${rows.map((c) => `
    <div class="crit-edit" data-row data-rule="${esc(c.rule || '')}">
      <input class="c-id" value="${esc(c.id)}" placeholder="C1">
      <input class="c-name" value="${esc(c.name)}" placeholder="条件名称，例：研发年限">
      <select class="c-type"><option ${c.type === '必备' ? 'selected' : ''}>必备</option><option ${c.type === '加分' ? 'selected' : ''}>加分</option></select>
      <input class="c-weight" type="number" min="1" max="100" value="${c.weight}" placeholder="权重">
      <button type="button" class="icon-btn" onclick="UI.removeCrit(this)">✕</button>
    </div>`).join('')}</div>
    <button type="button" class="btn btn-plain btn-sm" id="btn-add-crit" style="margin-top:6px;">＋ 增加一条条件</button>
    <div class="form-hint" id="weight-sum">权重合计：0%（需为 100%）</div>
    <div class="form-hint">只需写清条件名称、类型与权重；具体判定边界可在发布后通过「追问」向本部门澄清，AI 解析会对照条件名称与岗位描述判断。</div>`;
}
function bindCriteriaEditor() {
  const calc = () => {
    const sum = $$('#crit-rows .c-weight').reduce((s, el) => s + (Number(el.value) || 0), 0);
    const box = $('#weight-sum');
    if (!box) return;
    box.textContent = `权重合计：${sum}%（需为 100%）`;
    box.style.color = sum === 100 ? 'var(--green)' : 'var(--red)';
  };
  $$('#crit-rows .c-weight').forEach((el) => el.addEventListener('input', calc));
  calc();
  $('#btn-add-crit')?.addEventListener('click', () => {
    const n = $$('#crit-rows [data-row]').length + 1;
    const div = document.createElement('div');
    div.className = 'crit-edit';
    div.dataset.row = '';
    div.dataset.rule = '';
    div.innerHTML = `<input class="c-id" value="C${n}"><input class="c-name" placeholder="条件名称">
      <select class="c-type"><option>必备</option><option>加分</option></select>
      <input class="c-weight" type="number" min="1" max="100" placeholder="权重">
      <button type="button" class="icon-btn" onclick="UI.removeCrit(this)">✕</button>`;
    $('#crit-rows').appendChild(div);
    div.querySelector('.c-weight').addEventListener('input', calc);
    calc();
  });
}
function collectCriteria() {
  return $$('#crit-rows [data-row]').map((row) => ({
    id: row.querySelector('.c-id').value.trim(),
    name: row.querySelector('.c-name').value.trim(),
    type: row.querySelector('.c-type').value,
    weight: Number(row.querySelector('.c-weight').value),
    rule: (row.dataset.rule || '').trim(),
  }));
}

async function openPublishJobModal(preset) {
  let specialists = [];
  try { specialists = (await api('/specialists')).specialists; } catch { /* 忽略，仍可发布 */ }
  const p = preset || {};
  openModal(`
    <h3>＋ 发布岗位需求</h3>
    <p class="muted" style="margin-bottom:14px;">需求部门自动锁定为 <b>${esc(state.user.dept)}</b>。只需写清条件名称、类型与权重即可发布，无需填写判定规则；边界细节由招聘专员后续追问澄清（BR-02）。</p>
    <div class="form-grid">
      <div class="field"><label>岗位名称 <span class="req">*</span></label><input type="text" id="pj-name" value="${esc(p.name || '')}" placeholder="例：AI应用全栈工程师"></div>
      <div class="field"><label>招聘人数 <span class="req">*</span></label><input type="number" id="pj-hc" value="${p.headcount || 1}" min="1"></div>
      <div class="field"><label>负责招聘专员 <span class="req">*</span></label>
        <select id="pj-owner">${specialists.map((x, i) => `<option value="${x.id}" ${i === 0 ? 'selected' : ''}>${esc(x.name)}（${esc(x.account)}）</option>`).join('')}</select>
        <div class="form-hint">指定后该专员才能在「岗位需求工作台」看到并处理这个岗位。</div>
      </div>
      <div class="field"><label>&nbsp;</label><div class="form-hint" style="padding-top:9px;">发布后可用「追问」补充条件边界。</div></div>
      <div class="field full"><label>需求描述 <span class="req">*</span></label><textarea id="pj-desc" rows="3" placeholder="这个岗位实际要做什么、解决什么问题">${esc(p.description || '')}</textarea></div>
    </div>
    <div class="field" style="margin-top:12px;"><label>岗位条件与权重 <span class="req">*</span></label>${criteriaEditor(p.criteria || [])}</div>
    <label class="checkline"><input type="checkbox" id="pj-confirm" ${p.confirmed ? 'checked' : ''}> 我已确认以上条件可作为简历筛选依据，后续变更将生成新版本并留痕</label>
    <div class="m-foot"><button class="btn btn-plain" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="pj-submit">发布岗位需求</button></div>`);
  bindCriteriaEditor();
  $('#pj-submit').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = '发布中…';
    try {
      const { job } = await api('/jobs', {
        method: 'POST',
        body: {
          name: $('#pj-name').value.trim(), headcount: Number($('#pj-hc').value),
          description: $('#pj-desc').value.trim(), criteria: collectCriteria(),
          ownerId: $('#pj-owner')?.value || null,
          confirmed: $('#pj-confirm').checked,
        },
      });
      closeModal(); toast('岗位「' + job.name + '」已发布，条件版本 v1 生效');
      await renderJobs(job.id);
    } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = '发布岗位需求'; }
  });
}

function openConditionModal(job) {
  openModal(`
    <h3>变更岗位条件 · ${esc(job.name)}</h3>
    <p class="muted" style="margin-bottom:12px;">保存后将生成新版本（当前 v${job.version} → v${job.version + 1}），旧版本与历史推荐依据保留不覆盖。是否自动重算属待确认项（C8），本次仅手动触发。</p>
    <div class="field"><label>岗位条件与权重</label>${criteriaEditor(job.condition?.criteria || [])}</div>
    <div class="field"><label>变更原因</label><input type="text" id="cond-note" placeholder="例：补充 RAG 上线经验为必备条件"></div>
    <div class="m-foot"><button class="btn btn-plain" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="cond-submit">保存新版本</button></div>`);
  bindCriteriaEditor();
  $('#cond-submit').addEventListener('click', async (e) => {
    const btn = e.currentTarget; btn.disabled = true; btn.textContent = '保存中…';
    try {
      const res = await api(`/jobs/${job.id}/conditions`, { method: 'POST', body: { criteria: collectCriteria(), note: $('#cond-note').value.trim() } });
      closeModal(); toast('已生成条件版本 v' + res.version); await renderJobs(job.id);
    } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = '保存新版本'; }
  });
}

function openClarifyModal(job, parent = null) {
  openModal(`
    <h3>${parent ? '继续追问' : '发起需求追问'}</h3>
    <p class="muted" style="margin-bottom:12px;">问询会通知需求提出人（${esc(job.requester?.name || '—')}）与本部门面试官，解答后通知你；问答全程留痕、不可删除（BR-03）。</p>
    ${parent ? `<div class="qa-quote" style="margin-bottom:10px;">↳ 正在追问：${esc(parent.question)}<br><span class="muted">原解答：${esc(parent.answer || '（未解答）')}</span></div>` : ''}
    <div class="field"><label>追问内容 <span class="req">*</span></label><textarea id="cl-q" rows="4" placeholder="建议围绕：实际做什么 / 必备条件边界 / 什么样的经历算符合 / 哪些经历看着像其实不算"></textarea></div>
    <div class="m-foot"><button class="btn btn-plain" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="cl-submit">发送追问</button></div>`);
  $('#cl-submit').addEventListener('click', async (e) => {
    const q = $('#cl-q').value.trim();
    if (!q) return toast('追问内容不能为空', 'error');
    e.currentTarget.disabled = true;
    try {
      await api(`/jobs/${job.id}/clarifications`, { method: 'POST', body: { question: q, parentId: parent?.id || null } });
      closeModal(); toast('追问已发送，用人部门解答后会通知你'); await renderJobs(job.id);
    } catch (err) { toast(err.message, 'error'); e.currentTarget.disabled = false; }
  });
}
function openReplyClarifyModal(id) {
  openModal(`
    <h3>回复澄清</h3>
    <div class="field"><label>回复内容 <span class="req">*</span></label><textarea id="cl-a" rows="4" placeholder="请明确必备与加分的边界"></textarea></div>
    <div class="m-foot"><button class="btn btn-plain" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="clr-submit">提交回复</button></div>`);
  $('#clr-submit').addEventListener('click', async (e) => {
    const a = $('#cl-a').value.trim();
    if (!a) return toast('回复内容不能为空', 'error');
    e.currentTarget.disabled = true;
    try { await api(`/clarifications/${id}/reply`, { method: 'POST', body: { answer: a } }); closeModal(); toast('回复已提交并留痕'); await renderJobs(state.jobId); }
    catch (err) { toast(err.message, 'error'); e.currentTarget.disabled = false; }
  });
}

async function openAssignModal(job) {
  const { members, dept } = await api('/dept-members');
  const assigned = new Set(job.interviewers.map((i) => i.id));
  openModal(`
    <h3>指派面试官 · ${esc(job.name)}</h3>
    <p class="muted" style="margin-bottom:12px;">仅可指派本部门（${esc(dept)}）成员；跨部门成员不在列表中，接口层同样会拒绝。</p>
    ${members.map((m) => `
      <label class="iv-pick ${assigned.has(m.id) ? 'checked' : ''}">
        <input type="checkbox" class="iv-check" value="${m.id}" ${assigned.has(m.id) ? 'checked' : ''}>
        <span class="avatar">${esc(m.name.slice(0, 1))}</span>
        <span style="flex:1;"><b style="font-size:13px;">${esc(m.name)}</b><br><small class="muted">${esc(m.roleLabel)} · ${esc(m.account)}</small></span>
      </label>`).join('')}
    <div class="ai-note">被指派人可查看该岗位材料，并在候选人入职满观察期后提交用人结果反馈。</div>
    <div class="m-foot"><button class="btn btn-plain" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="as-submit">保存指派</button></div>`);
  $$('.iv-pick').forEach((el) => el.addEventListener('click', (e) => {
    if (e.target.tagName !== 'INPUT') el.querySelector('input').checked = !el.querySelector('input').checked;
    el.classList.toggle('checked', el.querySelector('input').checked);
  }));
  $('#as-submit').addEventListener('click', async (e) => {
    const ids = $$('.iv-check:checked').map((c) => c.value);
    e.currentTarget.disabled = true;
    try { await api(`/jobs/${job.id}/interviewers`, { method: 'POST', body: { userIds: ids } }); closeModal(); toast(`已指派 ${ids.length} 位面试官`); await renderJobs(job.id); }
    catch (err) { toast(err.message, 'error'); e.currentTarget.disabled = false; }
  });
}

/* ============================ 简历 ============================ */
async function renderResumeList() {
  const data = await api('/applications');
  state.apps = data.applications;
  const jobs = data.jobs.filter((j) => true);
  const pendingCount = data.applications.filter((a) => a.status === 'pending_review').length;
  const canUpload = state.user.capabilities.includes('resume.upload');
  content().innerHTML = `
    <div class="redline">🚫 合规红线：AI 只辅助初筛，系统不提供自动淘汰能力；是否推荐由招聘专员人工决定并手动提交（R1/R2/R3）。</div>
    ${canUpload ? `<div class="inline-notice info" style="margin-bottom:14px;">
      🧑‍💼 <b>招聘专员专属：</b>你可以自行提交候选人简历 → 简历自动进入本模块的核对列表 → 点击「开始解析」由 AI 对照已确认条件逐项核对 → 你人工决定是否推荐给用人部门。
    </div>` : ''}
    <div class="card">
      <div class="inline" style="justify-content:space-between;margin-bottom:14px;">
        <h3 style="margin:0;">简历列表 <span class="muted" style="font-weight:400;font-size:12px;">（仅展示你负责 / 可查看岗位的材料）</span></h3>
        <div class="row-actions">
          <select id="filter-status" class="btn btn-plain btn-sm" style="padding:7px 10px;">
            <option value="">全部状态</option>
            <option value="waiting_parse">待解析</option>
            <option value="pending_review">待核对</option>
            <option value="recommended">待部门决定</option>
            <option value="interview_pending">待面试</option>
            <option value="hired">已入职</option>
            <option value="rejected">已拒绝</option>
          </select>
          <select id="filter-job" class="btn btn-plain btn-sm" style="padding:7px 10px;">
            <option value="">全部岗位</option>
            ${jobs.map((j) => `<option value="${j.id}">${esc(j.name)}</option>`).join('')}
          </select>
          ${canUpload ? '<button class="btn btn-primary" id="btn-upload">＋ 提交候选人简历</button>' : '<span class="muted" style="font-size:12px;">提交与核对简历仅招聘专员可操作</span>'}
        </div>
      </div>
      ${state.apps.length ? `
      <table class="data-table">
        <thead><tr><th>候选人</th><th>应聘岗位</th><th>状态</th><th>AI 评分 / 分级</th><th>能力标签</th><th>解析</th><th>操作</th></tr></thead>
        <tbody id="app-tbody">${state.apps.map((a) => `
          <tr data-id="${a.id}">
            <td><b>${esc(a.candidate)}</b><br><span class="muted">${esc([a.email || a.phone || '', a.source ? '来源：' + a.source : ''].filter(Boolean).join(' · '))}</span></td>
            <td>${esc(a.jobName)}<br><span class="muted">v${a.version} · ${fmtDay(a.createdAt)}</span></td>
            <td>${tag(APP_STATUS, a.status)}</td>
            <td>${a.parse ? `<b>${a.parse.score}</b> 分 <span class="grade ${a.parse.grade}" style="display:inline-flex;width:22px;height:22px;font-size:12px;">${a.parse.grade}</span>${a.parse.evidenceMissing ? ' <span class="tag orange">证据缺失</span>' : ''}` : '<span class="muted">—</span>'}</td>
            <td class="muted" style="max-width:220px;">${esc((a.parse?.tags || []).slice(0, 3).join(' / ') || '—')}</td>
            <td class="muted">${a.parseStatus === 'done' ? '已完成' : a.parseStatus === 'failed' ? '<span style="color:var(--red)">失败</span>' : a.parseStatus === 'parsing' ? '解析中…' : '待解析'}</td>
            <td><button class="btn btn-plain btn-sm" data-open="${a.id}">查看核对</button></td>
          </tr>`).join('')}</tbody>
      </table>
      <div class="ai-note">评分仅供人工核对排序参考，系统不设自动淘汰线（R3）；简历未写到的内容标「信息不足」，不判「不具备」（R10）。当前待核对 ${pendingCount} 份。</div>`
      : `<div class="empty-state">${canUpload
        ? '暂无简历。点右上角「＋ 提交候选人简历」上传 PDF（需先与候选人确认面试意向）。'
        : `你所在部门暂无可查看的简历。<br><span class="muted">岗位需求发布后，招聘专员提交的候选人简历会出现在这里；已提交推荐的候选人请在「部门反馈工作台」查看。</span>`}</div>`}
    </div>`;
  $$('#app-tbody tr').forEach((tr) => tr.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    UI.openResume(tr.dataset.id);
  }));
  $$('[data-open]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); UI.openResume(b.dataset.open); }));
  const applyFilter = () => {
    const jobId = $('#filter-job')?.value || '';
    const st = $('#filter-status')?.value || '';
    $$('#app-tbody tr').forEach((tr) => {
      const app = state.apps.find((a) => a.id === tr.dataset.id);
      const okJob = jobId ? app.jobId === jobId : true;
      const okSt = st ? (st === 'recommended' ? ['recommended', 'need_info'].includes(app.status) : app.status === st) : true;
      tr.hidden = !(okJob && okSt);
    });
  };
  $('#filter-job')?.addEventListener('change', applyFilter);
  $('#filter-status')?.addEventListener('change', applyFilter);
  $('#btn-upload')?.addEventListener('click', openUploadModal);
  const pending = state.apps.filter((a) => a.status === 'pending_review').length;
  $('#nav-resume-badge').hidden = !(state.user.role === 'specialist' && pending > 0);
  $('#nav-resume-badge').textContent = pending;
}

function openUploadModal() {
  const jobs = state.jobs.filter((j) => j.can?.process);
  if (!jobs.length) return toast('你当前没有负责的岗位，无法提交简历', 'error');
  openModal(`
    <h3>＋ 提交候选人简历</h3>
    <p class="muted" style="margin-bottom:12px;">提交后简历进入「简历筛选与核对」列表；勾选立即分析会直接调用 AI 对照该岗位已确认条件做逐项核对（AI 只给参考，不淘汰人）。</p>
    <div class="form-grid">
      <div class="field"><label>应聘岗位 <span class="req">*</span></label>
        <select id="up-job">${jobs.map((j) => `<option value="${j.id}">${esc(j.name)}（${esc(j.dept)}）</option>`).join('')}</select>
      </div>
      <div class="field"><label>候选人姓名 <span class="muted">（留空自动识别）</span></label><input type="text" id="up-name" placeholder="例：张伟"></div>
      <div class="field"><label>手机号 <span class="muted">（选填）</span></label><input type="text" id="up-phone" placeholder="11 位手机号"></div>
      <div class="field"><label>邮箱 <span class="muted">（选填）</span></label><input type="text" id="up-email" placeholder="name@example.com"></div>
      <div class="field"><label>简历来源</label>
        <select id="up-source"><option>招聘网站</option><option>内部推荐</option><option>主动投递</option><option>猎头推荐</option><option>其他</option></select>
      </div>
      <div class="field"><label>意向确认方式</label>
        <select id="up-method"><option>电话</option><option>微信</option><option>邮件</option><option>招聘平台站内信</option></select>
      </div>
    </div>
    <div class="field"><label>简历文件（PDF，≤10MB）<span class="req">*</span></label><input type="file" id="up-file" accept="application/pdf"></div>
    <label class="checkline"><input type="checkbox" id="up-intent"> 我已与候选人确认面试意向，并留存确认记录</label>
    <label class="checkline"><input type="checkbox" id="up-autoparse" checked> 提交后立即调用 AI 做简历分析（约 10 秒）</label>
    <div class="m-foot"><button class="btn btn-plain" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="up-submit">提交简历</button></div>`);
  $('#up-submit').addEventListener('click', async (e) => {
    const file = $('#up-file').files[0];
    if (!file) return toast('请选择 PDF 文件', 'error');
    if (!$('#up-intent').checked) return toast('未确认候选人面试意向，不得进入录入流程（R33）', 'error');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('jobId', $('#up-job').value);
    fd.append('intentConfirmed', 'true');
    fd.append('intentMethod', $('#up-method').value);
    fd.append('source', $('#up-source').value);
    if ($('#up-name').value.trim()) fd.append('candidateName', $('#up-name').value.trim());
    if ($('#up-phone').value.trim()) fd.append('phone', $('#up-phone').value.trim());
    if ($('#up-email').value.trim()) fd.append('email', $('#up-email').value.trim());
    const autoParse = $('#up-autoparse').checked;
    const btn = e.currentTarget; btn.disabled = true; btn.innerHTML = '<span class="loading"></span>上传中…';
    try {
      const res = await api('/applications', { method: 'POST', form: fd });
      const appId = res.application.id;
      if (res.dupeHint) toast('检测到同岗位同名候选人，请人工核对是否重复（不自动合并）', 'info');
      closeModal();
      toast('「' + res.application.candidate + '」已提交，进入简历核对列表');
      if (autoParse) {
        toast('正在调用 AI 分析简历…', 'info');
        try {
          const pr = await api(`/applications/${appId}/parse`, { method: 'POST' });
          toast('AI 分析完成：' + pr.parsed.score + ' 分 / ' + pr.parsed.grade + ' 级');
          (pr.warnings || []).forEach((w) => toast(w, 'info'));
        } catch (err) { toast('AI 分析失败：' + err.message + '（可在列表里重新解析）', 'error'); }
      }
      await renderResumeList();
      await openResume(appId);
    } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = '提交简历'; }
  });
}

async function openResume(id) {
  state.appId = id;
  await renderResumeDetail(id);
}
async function renderResumeDetail(id) {
  const data = await api('/applications/' + id);
  const a = data.application, p = data.parsed, rec = data.recommendation, c = data.can;
  window.__recId = rec?.id || null;
  const eviMarked = (text) => {
    let html = esc(text);
    for (const cr of p?.criteria || []) {
      if (!cr.evidence_quote) continue;
      const q = esc(cr.evidence_quote);
      if (html.includes(q)) html = html.replace(q, `<mark class="hl-mark">${q}</mark>`);
    }
    return html;
  };
  content().innerHTML = `
    <span class="back-link" id="back">← 返回简历列表</span>
    <div class="card" style="padding:13px 18px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <b style="font-size:16px;">${esc(a.candidate)}</b>
      <span class="tag gray">${esc(a.dept)}</span>
      <span>应聘：${esc(a.jobName)}</span>
      ${tag(APP_STATUS, a.status)}
      ${a.parse?.evidenceMissing ? '<span class="tag orange">存在证据缺失，需人工复核</span>' : ''}
      <span class="muted" style="margin-left:auto;">导入：${fmtTime(a.createdAt)} · 版本 v${a.version}（不覆盖旧版本）</span>
    </div>

    <div class="detail-grid">
      <div class="panel-card">
        <h4>📄 简历原文 <span class="muted" style="font-weight:400;font-size:11.5px;">（高亮为 AI 引用证据）</span></h4>
        <div class="resume-text" id="resume-text">${eviMarked(data.resumeText || '（未提取到文本）')}</div>
        <div class="inline" style="margin-top:10px;">
          ${a.file ? `<button class="btn btn-plain btn-sm" onclick="UI.openFile('${a.id}')">打开 PDF 原件</button>` : ''}
          <span class="muted">原件不可篡改，供核对</span>
        </div>
      </div>

      <div class="panel-card">
        <h4>🤖 AI 解析结论 <span class="muted" style="font-weight:400;font-size:11.5px;">（对照条件 v${p?.condition_version || '—'}）</span></h4>
        ${p ? `
          <div class="score-box">
            <div class="big-score">${p.score}</div>
            <div>
              <div class="strong">综合评分 <span class="grade ${p.grade}" style="display:inline-flex;width:22px;height:22px;font-size:12px;vertical-align:-4px;">${p.grade}</span> 级</div>
              <div class="muted" style="margin-top:3px;">仅供人工核对排序参考 · 系统不设自动淘汰线（R3/C3）</div>
            </div>
          </div>
          <div class="tagcloud">${(p.tags || []).map((t) => `<span class="tag blue">${esc(t)}</span>`).join('') || '<span class="muted">暂无标签</span>'}</div>
          <div class="strong small" style="margin:10px 0 8px;">📋 逐项对照（每条结论均附原文证据，可回查 R9/R11）</div>
          ${p.criteria.map((cr) => `
            <div class="crit-item">
              <div class="ci-head">
                <span>${esc(cr.id)} ${esc(cr.name)} <span class="muted" style="font-weight:400;">${cr.type} · ${cr.weight}%</span></span>
                <span class="verdict ${cr.verdict}">${cr.verdict === 'matched' ? '✓ 符合' : cr.verdict === 'not_matched' ? '✗ 不符合' : '⚠ 信息不足'}</span>
              </div>
              <div class="muted">规则：${esc(cr.rule)}</div>
              ${cr.evidence_quote ? `<div class="evi">${esc(cr.evidence_quote)}<div class="muted" style="margin-top:4px;">出处：${esc(cr.evidence_hint || '简历原文')}</div></div>` : (cr.verdict === 'insufficient_info' ? '<div class="evi missing">简历中未提供该条件的原文信息，按规则不判「不具备」</div>' : '<div class="evi missing">未定位到可核对的原文证据，需重新解析或人工补录</div>')}
            </div>`).join('')}
          <div class="ai-note">模型：${esc(p.model)} · 提示词版本 ${esc(p.prompt_version)} · 解析于 ${fmtTime(p.created_at)}。AI 不输出淘汰结论，是否推荐由你决定。</div>
        ` : `<div class="empty-state">尚未解析。<br>${c.parse ? '点击下方「开始解析」调用 AI 对照已确认条件逐项核对。' : '解析由该岗位负责专员触发。'}</div>`}
      </div>

      <div class="panel-card">
        <h4>❓ 待核实问题 ${p ? `<span class="tag orange">${p.questions.length}</span>` : ''}</h4>
        ${p?.questions?.length ? p.questions.map((q, i) => `<div class="q-item"><span class="q-no">Q${i + 1}.</span> ${esc(q)}</div>`).join('') : '<div class="empty-state">暂无待核实问题</div>'}
        <div class="ai-note">简历未写到的内容不会被判定为不具备，而是进入本清单，由专员联系候选人或请部门补充核实（E1）。</div>

        <h4 style="margin-top:16px;">🧾 流转记录</h4>
        ${data.timeline.length ? data.timeline.map((t) => `
          <div class="log-item"><span class="l-time">${fmtTime(t.at).slice(5, 16)}</span><span class="l-who">${esc(t.byUser || '系统')}</span>
          <span class="l-what">${esc(APP_STATUS[t.from_state]?.[1] || t.from_state || '新建')} → <b>${esc(APP_STATUS[t.to_state]?.[1] || t.to_state)}</b> <span class="l-extra">${esc(t.note || '')}</span></span></div>`).join('') : '<div class="muted">暂无记录</div>'}

        ${rec ? `<h4 style="margin-top:16px;">📮 推荐记录</h4>
          <div class="crit-item">
            <div class="ci-head"><span>${tag(REC_STATUS, rec.status)}</span><span class="muted">${fmtTime(rec.submitted_at)}</span></div>
            <div>${esc(rec.reason)}</div>
            <div class="muted" style="margin-top:6px;">差距说明：${esc(rec.gap)}</div>
            ${rec.feedback ? `<div class="inline-notice ${rec.feedback.decision === 'agree' ? 'ok' : rec.feedback.decision === 'reject' ? 'danger' : 'warn'}" style="margin:8px 0 0;">
              部门反馈：${esc(rec.feedback.decisionLabel)}${rec.feedback.reason ? '｜原因：' + esc(rec.feedback.reason) : ''}${rec.feedback.detail ? '｜' + esc(rec.feedback.detail) : ''}${rec.feedback.request ? '｜补充要求：' + esc(rec.feedback.request) : ''}
            </div>` : ''}
          </div>` : ''}
      </div>
    </div>

    <div class="action-bar">
      ${c.parse ? `<button class="btn btn-plain" id="btn-parse">${p ? '↻ 重新解析' : '▶ 开始解析（调用大模型）'}</button>` : ''}
      ${c.recommend ? '<button class="btn btn-primary" id="btn-recommend">✔ 人工确认推荐</button>' : ''}
      ${c.notRecommend ? '<button class="btn btn-plain" id="btn-notrec">标记不推荐</button>' : ''}
      ${c.interview ? '<button class="btn btn-primary" id="btn-interview">回录面试结果</button>' : ''}
      ${c.offer ? '<button class="btn btn-primary" id="btn-offer">回录 Offer 结果</button>' : ''}
      ${c.onboard ? '<button class="btn btn-primary" id="btn-onboard">登记实际入职</button>' : ''}
      <span class="note">任何推进动作都由人工点击触发；AI 不自动提交、不自动淘汰。</span>
    </div>`;

  $('#back').addEventListener('click', () => { state.appId = null; renderResumeList(); });
  $('#btn-parse')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget; btn.disabled = true; btn.innerHTML = '<span class="loading dark"></span>解析中（约 10 秒）…';
    try {
      const res = await api(`/applications/${id}/parse`, { method: 'POST' });
      toast('解析完成：' + res.parsed.score + ' 分 / ' + res.parsed.grade + ' 级');
      (res.warnings || []).forEach((w) => toast(w, 'info'));
      await renderResumeDetail(id);
      await loadNotifications();
    } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = '▶ 开始解析（调用大模型）'; }
  });
  $('#btn-recommend')?.addEventListener('click', () => openRecommendModal(id));
  $('#btn-notrec')?.addEventListener('click', () => UI.notRecommend(id));
  $('#btn-interview')?.addEventListener('click', () => UI.interviewModal(id));
  $('#btn-offer')?.addEventListener('click', () => UI.offerModal(id));
  $('#btn-onboard')?.addEventListener('click', () => UI.onboardModal(id));
}

async function openRecommendModal(id) {
  openModal(`
    <h3>生成推荐材料草稿</h3>
    <div style="padding:18px 0;text-align:center;color:var(--text2);"><span class="loading dark"></span> 正在调用大模型基于核对结论生成草稿…</div>`);
  let draft;
  try {
    const res = await api(`/applications/${id}/recommend/draft`, { method: 'POST' });
    draft = res.draft;
    if (res.notice) toast(res.notice, 'info');
  } catch (err) {
    closeModal(); toast(err.message, 'error'); return;
  }
  openModal(`
    <h3>人工确认推荐</h3>
    <div class="ai-note" style="margin-bottom:12px;">下方为 <b>AI 生成的草稿</b>，请核对并修改后手动提交；提交后材料（含简历原件与待核实问题）将推送至用人部门。</div>
    <div class="field"><label>推荐理由 <span class="req">*</span></label><textarea id="rec-reason" rows="5">${esc(draft.reason)}</textarea></div>
    <div class="field"><label>与岗位的差距说明 <span class="req">*</span></label><textarea id="rec-gap" rows="4">${esc(draft.gap)}</textarea>
      <div class="form-hint">分不高或条件不足仍可推荐，但必须说明差距，是否面试由用人部门决定（E2）。</div></div>
    <div class="field"><label>随材料推送的待核实问题</label>
      <div style="background:var(--gray-bg);border-radius:8px;padding:9px 11px;font-size:12.5px;line-height:1.7;">
        ${(draft.questions || []).map((q) => '· ' + esc(q)).join('<br>') || '（无）'}
      </div></div>
    <div class="m-foot"><button class="btn btn-plain" onclick="UI.closeModal()">取消</button><button class="btn btn-primary" id="rec-submit">提交推荐至部门</button></div>`);
  $('#rec-submit').addEventListener('click', async (e) => {
    const btn = e.currentTarget; btn.disabled = true; btn.textContent = '提交中…';
    try {
      await api(`/applications/${id}/recommend`, { method: 'POST', body: { reason: $('#rec-reason').value.trim(), gap: $('#rec-gap').value.trim(), draftSource: draft.source } });
      closeModal(); toast('推荐已提交，状态更新为「已推荐-待部门决定」，等待时长开始计时');
      await renderResumeDetail(id); await loadNotifications();
    } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = '提交推荐至部门'; }
  });
}

function modalForm({ title, desc, fields, submitText, danger, onSubmit }) {
  openModal(`
    <h3 style="${danger ? 'color:var(--red)' : ''}">${esc(title)}</h3>
    ${desc ? `<p class="muted" style="margin-bottom:12px;line-height:1.7;">${desc}</p>` : ''}
    ${fields}
    <div class="m-foot"><button class="btn btn-plain" onclick="UI.closeModal()">取消</button>
    <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="mf-submit">${esc(submitText)}</button></div>`);
  $('#mf-submit').addEventListener('click', async (e) => {
    const btn = e.currentTarget; btn.disabled = true;
    try { await onSubmit(); } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
  });
}

/* ============================ 部门反馈 ============================ */
async function renderFeedback() {
  const [fb] = await Promise.all([api('/feedbacks')]);
  state.recItems = fb.items;
  content().innerHTML = `
    <div class="clarify-banner" id="fb-banner">${bannerText()}</div>
    <div class="fb-tabs">
      <button class="fb-tab ${state.fbTab === 'rec' ? 'active' : ''}" data-tab="rec">💬 简历推荐反馈 <span class="tab-num">${fb.items.filter((i) => i.status === 'pending').length}</span></button>
      <button class="fb-tab ${state.fbTab === 'hire' ? 'active' : ''}" data-tab="hire">🌱 用人结果反馈（入职后）</button>
    </div>
    <div id="fb-rec" ${state.fbTab === 'rec' ? '' : 'hidden'}>
      <div class="fb-layout">
        <div>
          <div class="card" style="padding:13px 16px;display:flex;justify-content:space-between;align-items:center;">
            <h3 style="margin:0;">推荐列表</h3>
            <span class="muted">待面试决定 <b style="color:var(--red)">${fb.items.filter((i) => i.status === 'pending').length}</b> 条 · 待录用决定 <b style="color:var(--orange)">${fb.items.filter((i) => i.status === 'agreed' && !i.decided).length}</b> 条</span>
          </div>
          <div id="fb-list"></div>
        </div>
        <div id="fb-detail"></div>
      </div>
    </div>
    <div id="fb-hire" ${state.fbTab === 'hire' ? '' : 'hidden'}></div>`;
  $$('.fb-tab').forEach((b) => b.addEventListener('click', () => {
    state.fbTab = b.dataset.tab;
    $$('.fb-tab').forEach((x) => x.classList.toggle('active', x === b));
    $('#fb-rec').hidden = state.fbTab !== 'rec';
    $('#fb-hire').hidden = state.fbTab !== 'hire';
    if (state.fbTab === 'hire') renderHire();
  }));
  renderRecList();
  if (state.fbTab === 'hire') renderHire();
}

function bannerText() {
  const u = state.user;
  const map = {
    deptmgr: `当前为「${u.name} · ${u.roleLabel}」：可对推送简历做三选一反馈（拒绝必填原因），并在候选人入职后提交用人结果。`,
    interviewer: `当前为「${u.name} · ${u.roleLabel}」：可查看推荐材料与反馈结果，并在候选人入职满观察期后提交<b>用人结果反馈</b>；面试决定由部门经理做出。`,
    specialist: `当前为「${u.name} · ${u.roleLabel}」：可查看部门反馈结果并催办，但<b>不能代替部门做面试决定</b>（R4）。新反馈会出现在右上角铃铛。`,
    manager: `当前为「${u.name} · ${u.roleLabel}」：可查看全量反馈与时效、催办超时部门，不参与面试决策。`,
    admin: `当前为「${u.name} · ${u.roleLabel}」：仅可查看流程数据用于平台治理，<b>不参与任何招聘决策</b>。`,
  };
  return map[u.role] || '';
}

function renderRecList() {
  const items = state.recItems;
  $('#fb-list').innerHTML = items.length ? items.map((i) => `
    <div class="fb-item ${i.id === state.recId ? 'active' : ''}" data-id="${i.id}">
      <div class="f-top"><b>${esc(i.candidate)}</b>${i.decided ? `<span class="tag ${i.appStatus === 'hired' ? 'green' : 'gray'}">${i.appStatus === 'hired' ? '已录用' : '未录用'}</span>` : tag(REC_STATUS, i.status)}</div>
      <div class="f-meta">${esc(i.jobName)}</div>
      <div class="f-meta" style="margin-top:4px;">专员：${esc(i.submittedBy || '')} · ${fmtTime(i.submittedAt)}
        ${i.status === 'pending' ? ` · <span class="${i.waitDays > 3 ? 'wait' : ''}">已等待 ${i.waitDays} 天</span>` : ''}
      </div>
    </div>`).join('') : '<div class="card"><div class="empty-state">暂无待反馈的推荐。<br><span class="muted">招聘专员提交推荐后，这里会出现需要你决定的候选人材料；同意面试后还可做录用决定。</span></div></div>';
  $$('#fb-list .fb-item').forEach((el) => el.addEventListener('click', () => UI.openRec(el.dataset.id)));
  const first = state.recId && items.find((i) => i.id === state.recId) ? state.recId : items[0]?.id;
  if (first) openRec(first); else $('#fb-detail').innerHTML = '<div class="card"><div class="empty-state">暂无推荐材料<br><span class="muted">左侧列表出现候选人后，点击即可查看简历要点、AI 核对结果并做面试/录用决定。</span></div></div>';
}

async function openRec(id) {
  state.recId = id;
  $$('#fb-list .fb-item').forEach((el) => el.classList.toggle('active', el.dataset.id === id));
  const d = await api('/recommendations/' + id);
  const r = d.recommendation, a = d.application, p = d.parsed;
  $('#fb-detail').innerHTML = `
    <div class="card">
      <div class="inline" style="justify-content:space-between;">
        <h3 style="margin:0;">推荐材料 · ${esc(a.candidate)}</h3>
        <div>${d.can.decided ? `<span class="tag ${d.hired ? 'green' : 'gray'}">${d.hired ? '已录用入职' : '未录用'}</span>` : tag(REC_STATUS, r.status)}</div>
      </div>
      <div class="mat-block" style="margin-top:10px;"><b class="lbl">👤 候选人概况</b>${esc(a.candidate)} · 应聘 ${esc(d.job.name)}（${esc(d.job.dept)}）<br>推荐专员：${esc(r.submittedByUser?.name || '')} · 提交于 ${fmtTime(r.submitted_at)}</div>
      <div class="mat-block"><b class="lbl">💡 专员提交的推荐理由</b>${esc(r.reason || '')}</div>
      <div class="mat-block"><b class="lbl">⚖️ 与岗位的差距说明</b>${esc(r.gap || '')}</div>
      <div class="mat-block"><b class="lbl">❓ 随材料推送的待核实问题</b>${(r.questions || []).map((q) => '· ' + esc(q)).join('<br>') || '（无）'}</div>
      <div class="inline">
        ${a.file ? `<button class="btn btn-plain btn-sm" onclick="UI.openFile('${a.id}')">📄 查看简历原件</button>` : ''}
        ${p ? `<span class="muted">AI 评分 ${p.score}（${p.grade} 级）· 仅供核对参考，不设淘汰线</span>` : ''}
      </div>

      ${r.status === 'pending'
        ? (d.can.decide ? `
          <div class="btn-row3">
            <button class="btn btn-primary" id="fb-agree">✓ 同意面试</button>
            <button class="btn btn-danger" id="fb-reject">✕ 拒绝面试</button>
            <button class="btn btn-warn" id="fb-need">✎ 需要补充信息</button>
          </div>`
          : `<div class="decided-strip sup" style="margin-top:16px;">🔒 面试决定仅由<b>该用人部门经理</b>做出（R4）。${state.user.role === 'interviewer' ? '你是本部门面试官：可查看材料、参与面试，并在候选人入职后提交用人结果。' : '当前角色无面试决定权限。'}</div>`)
        : ''}
      ${r.status === 'agreed' && d.can.decided ? `
        <div class="decided-strip ${d.hired ? 'ok' : 'no'}" style="margin-top:14px;">
          <b>${d.hired ? '✅ 已决定录用并入职' : '✕ 已决定不予录用'}</b>（当前状态：${esc(d.appStatusLabel)}）
          ${d.hired ? '<br>该候选人已进入「用人结果反馈（入职后）」名单，可随时提交评价。' : '<br>不录用原因已记录并通知推荐专员。'}
        </div>
        ${d.hired && d.onboardingId ? `<button class="btn btn-primary btn-sm" style="margin-top:10px;" onclick="UI.gotoHire('${d.onboardingId}')">🌱 去评价这位候选人</button>` : ''}
      ` : r.status === 'agreed' ? `
        <div class="decided-strip ok" style="margin-top:14px;">
          <b>用人部门已同意面试</b> —— 面试完成后由本岗位<b>面试官</b>（或部门经理）做录用决定；决定录用的候选人会直接进入「已入职候选人」，可随时回评用人结果。
        </div>
        ${d.can.hireDecide ? `
          <div class="hire-row">
            <button class="btn btn-primary" id="hire-yes">✓ 决定录用（登记入职）</button>
            <button class="btn btn-danger" id="hire-no">✕ 不予录用</button>
          </div>`
          : `<div class="decided-strip sup" style="margin-top:10px;">🔒 录用决定由该岗位的本部门面试官或部门经理做出。${state.user.role === 'specialist' ? '你是招聘专员：负责提交推荐与后续跟进，不代替用人部门做录用决定（R4）。' : ''}</div>`}
      ` : ''}
      ${(r.feedbacks?.length ? r.feedbacks.map((f) => `
            <div class="decided-strip ${f.decision === 'agree' ? 'ok' : f.decision === 'reject' ? 'no' : 'sup'}" style="margin-top:12px;">
              <b>部门反馈：${esc(f.decisionLabel)}</b>${f.reason ? '<br>原因：' + esc(f.reason) : ''}${f.detail ? '<br>' + esc(f.detail) : ''}${f.request ? '<br>补充要求：' + esc(f.request) : ''}
              <br><span style="font-size:12px;opacity:.8;">反馈人：${esc(f.byUser || '')} · ${fmtTime(f.created_at)}</span>
            </div>`).join('') : '')}
      ${d.can.withdraw ? '<button class="btn btn-plain btn-sm" id="rec-withdraw" style="margin-top:12px;">撤回推荐</button>' : ''}
    </div>

    <div class="card">
      <h3 style="font-size:14px;">📄 简历与逐项依据（部门反馈前请核对原件）</h3>
      <div class="resume-text" style="max-height:260px;">${esc((d.resumeText || '').slice(0, 4000)) || '（未提取到原文）'}</div>
      ${p ? `<div class="tagcloud" style="margin-top:10px;">${p.criteria.map((c) => `<span class="verdict ${c.verdict}">${esc(c.name)}：${c.verdict === 'matched' ? '符合' : c.verdict === 'not_matched' ? '不符合' : '信息不足'}</span>`).join('')}</div>` : ''}
      <div class="ai-note">请结合原件与证据判断，勿仅凭系统评分下结论（平台风险提示）。</div>
    </div>`;

  $('#fb-agree')?.addEventListener('click', () => UI.decideModal(id, 'agree'));
  $('#fb-reject')?.addEventListener('click', () => UI.decideModal(id, 'reject'));
  $('#fb-need')?.addEventListener('click', () => UI.decideModal(id, 'need_info'));
  $('#hire-yes')?.addEventListener('click', () => hireModal(id, 'hire', a.candidate));
  $('#hire-no')?.addEventListener('click', () => hireModal(id, 'no_hire', a.candidate));
  $('#rec-withdraw')?.addEventListener('click', () => UI.withdrawModal(id));
}

function decideModal(id, decision) {
  const conf = {
    agree: { title: '同意面试', color: 'var(--green)', label: '面试反馈 / 安排说明', ph: '例：建议先进行一轮技术面（60 分钟），时间可约下周三下午；重点考察架构落地。', extra: '<div class="field"><label>期望面试时间（可选）</label><input type="text" id="fb-time" placeholder="例：10月28日 14:00–15:00"></div>', btn: '提交反馈并通知专员' },
    reject: { title: '拒绝面试', color: 'var(--red)', label: '拒绝原因', ph: '例：数据库设计部分证据不足，团队更需要有 RAG 上线经验的候选人。', extra: '', btn: '提交拒绝反馈' },
    need_info: { title: '需要补充信息', color: 'var(--orange)', label: '补充要求', ph: '例：请补充数据建模相关项目说明材料。', extra: '', btn: '提交补充要求' },
  }[decision];
  modalForm({
    title: `${decision === 'agree' ? '✓' : decision === 'reject' ? '✕' : '✎'} ${conf.title}`,
    desc: decision === 'reject'
      ? '⚠️ 按平台规则，<b>拒绝原因必填</b>（R18）；原因将沉淀为筛选校准数据。'
      : decision === 'agree' ? '提交后系统会把反馈推送给推荐专员，由其跟进排期。' : '提交后状态变为「待补充」，专员补充材料后重新进入核对。',
    fields: `<div class="field"><label>${conf.label} <span class="req">*</span></label><textarea id="fb-text" rows="4" placeholder="${conf.ph}"></textarea></div>${conf.extra}`,
    submitText: conf.btn,
    danger: decision === 'reject',
    onSubmit: async () => {
      const text = $('#fb-text').value.trim();
      if (!text) throw new Error(decision === 'reject' ? '拒绝原因必填，无法提交（R18）' : '请填写内容');
      const body = { decision };
      if (decision === 'agree') { body.detail = text; body.expectTime = $('#fb-time').value.trim(); }
      if (decision === 'reject') body.reason = text;
      if (decision === 'need_info') body.request = text;
      await api(`/recommendations/${id}/feedback`, { method: 'POST', body });
      closeModal();
      toast(decision === 'agree' ? '已同意面试，反馈已推送至推荐专员' : decision === 'reject' ? '已拒绝并记录原因，反馈已推送' : '补充要求已发送给专员');
      await renderFeedback(); await loadNotifications();
    },
  });
}

/* ---------------- 录用决定（面试官 / 部门经理） ---------------- */
function hireModal(id, decision, candidate) {
  const today = new Date().toISOString().slice(0, 10);
  const isHire = decision === 'hire';
  modalForm({
    title: isHire ? `✓ 决定录用 · ${candidate || ''}` : `✕ 不予录用 · ${candidate || ''}`,
    desc: isHire
      ? '录用即视为<b>面试通过并确认入职</b>：候选人会立即进入「已入职候选人」，你可在该页随时提交评价与用人结果反馈。请核对实际入职日期（接受 Offer ≠ 实际入职，R31）。'
      : '⚠️ 不予录用需填写原因（R18），原因会沉淀为筛选校准数据，并通知推荐专员。',
    fields: isHire
      ? `<div class="field"><label>实际入职日期 <span class="req">*</span></label><input type="date" id="hire-date" value="${today}"></div>
         <div class="field"><label>面试评价 / 录用说明 <span class="muted">（选填）</span></label><textarea id="hire-note" rows="3" placeholder="例：技术面通过，架构落地与团队协作符合预期，建议定级 P6。"></textarea></div>`
      : `<div class="field"><label>不录用原因 <span class="req">*</span></label><textarea id="hire-note" rows="4" placeholder="例：项目深度不足，缺少独立负责模块的经历；团队当前更需要能立刻接手线上稳定性的人。"></textarea></div>`,
    submitText: isHire ? '确认录用并登记入职' : '提交不录用决定',
    danger: !isHire,
    onSubmit: async () => {
      const note = $('#hire-note').value.trim();
      const body = { decision, note };
      if (isHire) {
        const date = $('#hire-date').value;
        if (!date) throw new Error('请填写实际入职日期');
        body.onboardDate = date;
      } else if (!note) throw new Error('不录用原因必填');
      await api(`/recommendations/${id}/hire-decision`, { method: 'POST', body });
      closeModal();
      toast(isHire ? '已录用并登记入职，可在「用人结果反馈」提交评价' : '已记录不录用决定，已通知推荐专员');
      await renderFeedback(); await loadNotifications();
    },
  });
}

/* ---------------- 用人结果 ---------------- */
async function renderHire() {
  const data = await api('/onboardings');
  state.onboardings = data.items;
  const items = data.items;
  $('#fb-hire').innerHTML = `
    <div class="fb-layout">
      <div>
        <div class="card" style="padding:13px 16px;display:flex;justify-content:space-between;align-items:center;">
          <h3 style="margin:0;">已入职候选人</h3>
          <span class="muted">待回评 <b style="color:var(--red)">${items.filter((i) => !i.outcome).length}</b> 条</span>
        </div>
        ${items.length ? items.map((i) => `
          <div class="hire-item ${i.id === state.onboardId ? 'active' : ''}" data-id="${i.id}">
            <div class="h-top"><b>${esc(i.candidate)}</b>${i.outcome ? '<span class="tag green">已反馈</span>' : '<span class="tag orange">待反馈</span>'}</div>
            <div class="h-meta">${esc(i.jobName)} · ${esc(i.dept)}</div>
            <div class="h-meta">入职 ${esc(i.onboardDate)} · 已入职 <b>${i.days} 天</b> · 推荐人：${esc(i.referrer?.name || '')}</div>
            ${!i.outcome && i.early ? `<div class="h-meta" style="color:var(--orange)">未满建议观察期 ${i.observeDays} 天，可提前评价（标记为早期评价）</div>` : ''}
          </div>`).join('') : '<div class="card"><div class="empty-state">暂无已入职候选人。部门同意面试后，由本岗位面试官在「简历推荐反馈」里做录用决定，录用的候选人会出现在这里。</div></div>'}
      </div>
      <div id="hire-detail"><div class="card"><div class="empty-state">请选择左侧候选人</div></div></div>
    </div>`;
  $$('#fb-hire .hire-item').forEach((el) => el.addEventListener('click', () => openHire(el.dataset.id)));
  const first = state.onboardId || items[0]?.id;
  if (first) openHire(first);
}

async function openHire(id) {
  state.onboardId = id;
  $$('#fb-hire .hire-item').forEach((el) => el.classList.toggle('active', el.dataset.id === id));
  const data = await api('/onboardings');
  const o = data.items.find((x) => x.id === id);
  if (!o) return;
  const canShowForm = o.canEvaluate;
  $('#hire-detail').innerHTML = `
    <div class="card">
      <div class="inline" style="justify-content:space-between;">
        <h3 style="margin:0;">${esc(o.candidate)} <span class="tag gray">入职 ${o.days} 天</span></h3>
        ${o.outcome ? '<span class="tag green">已反馈</span>' : '<span class="tag orange">待反馈</span>'}
      </div>
      <div class="mat-block" style="margin-top:10px;"><b class="lbl">👤 入职信息</b>${esc(o.jobName)} · ${esc(o.dept)}<br>入职日期：${esc(o.onboardDate)} ｜ 已入职 <b>${o.days}</b> 天 ｜ 推荐人：${esc(o.referrer?.name || '')}</div>
      ${o.interviewNote ? `<div class="mat-block"><b class="lbl">🎙️ 面试评价 / 录用说明</b>${esc(o.interviewNote)}</div>` : ''}
      ${o.deptFeedback ? `<div class="mat-block"><b class="lbl">🏢 部门面试意见</b>${esc(o.deptFeedback.label)}${o.deptFeedback.detail ? '｜' + esc(o.deptFeedback.detail) : ''}${o.deptFeedback.reason ? '｜原因：' + esc(o.deptFeedback.reason) : ''}</div>` : ''}
      <div class="mat-block"><b class="lbl">🔁 流程</b>部门同意面试 → 面试官决定录用 → 实际入职（本页）→ 回评用人结果 → 反馈直达推荐人，用于校准筛选标准。</div>
      ${o.outcome ? `
        <div class="decided-strip ok" style="margin-top:14px;">
          <b>用人结果：${esc(o.outcome.rating)}</b> · ${esc(o.outcome.alignment)}${o.outcome.early ? ` <span class="tag orange">早期评价（入职第 ${o.outcome.evalDays} 天）</span>` : ''}<br>${esc(o.outcome.evaluation)}<br>
          <span style="font-size:12px;opacity:.8;">反馈人：${esc(o.outcome.byName || '')} · ${fmtTime(o.outcome.created_at)}</span>
        </div>` : canShowForm ? `
        ${o.early ? `<div class="inline-notice warn" style="margin-top:14px;">⏳ 候选人入职 ${o.days} 天，建议观察满 ${o.observeDays} 天再回评（阈值待业务确认）。现在提交也可以，系统会标注为「早期评价」。</div>` : ''}
        <div style="margin-top:14px;border-top:1px solid var(--line);padding-top:14px;">
          <div class="field"><label>用人结果评级 <span class="req">*</span></label>
            <div class="rate-group" id="rate-group">${['优秀', '符合预期', '基本符合', '不符合期望'].map((r) => `<span class="rate-opt" data-r="${r}">${r}</span>`).join('')}</div>
          </div>
          <div class="field"><label>具体评价（实际表现、与面试判断的对照） <span class="req">*</span></label>
            <textarea id="ho-text" rows="4" placeholder="例：上手速度与面试判断一致，独立负责模块交付；跨团队沟通偏被动。"></textarea></div>
          <div class="field"><label>与面试判断的一致性</label>
            <select id="ho-align"><option>与面试判断一致</option><option>部分偏差</option><option>明显偏差</option></select></div>
          <button class="btn btn-primary" id="ho-submit">提交用人结果并通知推荐人</button>
          <span class="muted" style="margin-left:8px;">提交后推送至推荐人「${esc(o.referrer?.name || '')}」</span>
        </div>` : `
        <div class="decided-strip sup" style="margin-top:14px;">🔒 仅本部门经理与面试官可提交用人结果反馈。</div>`}
    </div>`;
  if (canShowForm) {
    $$('#rate-group .rate-opt').forEach((el) => el.addEventListener('click', () => {
      $$('#rate-group .rate-opt').forEach((x) => x.classList.remove('on'));
      el.classList.add('on'); window.__rating = el.dataset.r;
    }));
    $('#ho-submit').addEventListener('click', async (e) => {
      const btn = e.currentTarget; btn.disabled = true;
      if (!window.__rating) { toast('请先选择用人结果评级', 'error'); btn.disabled = false; return; }
      if (!$('#ho-text').value.trim()) { toast('请填写具体评价', 'error'); btn.disabled = false; return; }
      try {
        const res = await api(`/onboardings/${id}/outcome`, {
          method: 'POST',
          body: { rating: window.__rating, evaluation: $('#ho-text').value.trim(), alignment: $('#ho-align').value },
        });
        toast(res?.early ? '已提交（标记为早期评价），并推送至推荐人' : '用人结果已提交，并推送至推荐人');
        window.__rating = null;
        await renderHire(); await loadNotifications();
      } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
    });
  }
}

/* ============================ 看板 ============================ */
async function renderDashboard() {
  const d = await api('/dashboard');
  state.dash = d;
  const tbd = (st) => (st === 'pending' ? '<span class="badge-tbd">口径待确认</span>' : st === 'locked' ? '<span class="badge-tbd">已锁定</span>' : '');
  const maxFunnel = Math.max(...d.funnel.map((f) => f.value), 1);
  content().innerHTML = `
    ${d.meta.metricDefinitions.status === 'pending' ? '<div class="inline-notice warn">📐 报表口径尚未经业务确认（C10）：以下数值按参考口径展示，不作为考核或验收结论，导出能力已关闭。</div>' : ''}
    <div class="kpi-grid">
      <div class="kpi-card"><div class="lbl">在招岗位</div><div class="val">${d.kpis.openJobs}</div><div class="sub">进行中的岗位数</div></div>
      <div class="kpi-card"><div class="lbl">简历总量</div><div class="val">${d.kpis.totalApplications}</div><div class="sub">当前可查看范围内的应聘记录</div></div>
      <div class="kpi-card"><div class="lbl">待部门决定</div><div class="val" style="color:var(--red)">${d.kpis.pendingDecisions}</div><div class="sub">推荐已提交、尚未反馈</div></div>
      <div class="kpi-card"><div class="lbl">平均等待 <span class="badge-tbd">${d.meta.sla.status === 'pending' ? '阈值待确认' : '阈值已确认'}</span></div><div class="val" style="color:var(--orange)">${d.kpis.avgWaitDays} 天</div><div class="sub">推荐提交 → 部门反馈（阈值 ${d.meta.sla.value} 天，C4 待确认）</div></div>
    </div>

    <div class="chart-grid">
      <div class="card">
        <h3>各岗位需求满足率 ${tbd(d.meta.metricDefinitions.status)}</h3>
        ${d.perJob.map((j) => `
          <div class="bar-row"><span class="b-label" title="${esc(j.name)}">${esc(j.name)}</span>
            <div class="b-track"><div class="b-fill ${j.fillRate >= 100 ? 'good' : 'warn'}" style="width:${j.fillRate}%"></div></div>
            <span class="b-val">${j.fillRate}%</span></div>`).join('') || '<div class="empty-state">暂无岗位数据。发布岗位需求后，这里会按岗位统计满足率。</div>'}
        <div class="ai-note">满足率 = 已入职人数 / 招聘人数（参考口径，C10 确认前仅作展示）。</div>
      </div>
      <div class="card">
        <h3>各部门平均等待天数 ${tbd(d.meta.sla.status)}</h3>
        ${d.perDept.map((x) => `
          <div class="bar-row"><span class="b-label" title="${esc(x.dept)}">${esc(x.dept)}</span>
            <div class="b-track"><div class="b-fill ${x.avgWait > d.meta.sla.value ? 'warn' : 'good'}" style="width:${Math.min(100, (x.avgWait / Math.max(1, d.meta.sla.value * 2)) * 100)}%"></div></div>
            <span class="b-val">${x.avgWait} 天</span></div>`).join('') || '<div class="empty-state">暂无数据</div>'}
        <div class="ai-note">超过阈值（${d.meta.sla.value} 天）的部门以橙色标识；3 个工作日是否等同部门反馈时限属 C4 待确认。</div>
      </div>
    </div>

    <div class="chart-grid" style="margin-top:16px;">
      <div class="card">
        <h3>简历转化漏斗</h3>
        ${d.funnel.map((f) => `
          <div class="funnel-item"><span class="name">${esc(f.label)}</span>
            <div class="track"><div class="fill" style="width:${Math.max(6, Math.round((f.value / maxFunnel) * 100))}%">${f.value}</div></div></div>`).join('')}
        <div class="ai-note">AI 只参与「解析」环节，从解析完成到提交推荐的每次流转均为人工操作并留痕。</div>
      </div>
      <div class="card">
        <h3>⚠️ 卡点预警（等待部门反馈 &gt; ${d.meta.sla.value} 天）</h3>
        ${d.alerts.length ? d.alerts.map((a) => `
          <div class="alert-card">
            <div class="txt"><b>${esc(a.candidate)}</b>（${esc(a.jobName)}）等待部门反馈已 <b>${a.waitDays} 天</b><br>
              <span class="muted">提交于 ${fmtTime(a.submittedAt)} · ${esc(a.dept)}</span></div>
            ${a.canUrge ? `<button class="btn btn-danger btn-sm" data-urge="${a.recommendationId}">🔔 催办</button>` : '<span class="muted small">催办：专员/经理</span>'}
          </div>`).join('') : '<div class="empty-state">暂无卡点预警，各部门反馈均在阈值内 👍</div>'}
        <div class="ai-note">阈值可配置；催办动作会通知需求提出人并记入审计日志。</div>
      </div>
    </div>

    <div class="card" style="margin-top:16px;">
      <h3>🌱 用人结果反馈 · 双轨验证</h3>
      <div class="kpi-mini-row">
        <div class="kpi-mini"><b style="color:var(--primary)">${d.outcomeStats.evaluated}</b><span>已回评人数</span></div>
        <div class="kpi-mini"><b style="color:var(--green)">${d.outcomeStats.evaluated ? Math.round((d.outcomeStats.aligned / d.outcomeStats.evaluated) * 100) : 0}%</b><span>与面试判断一致率</span></div>
        <div class="kpi-mini"><b style="color:var(--orange)">${d.outcomeStats.pending}</b><span>待回评（观察期 ${d.meta.observeDays} 天）</span></div>
      </div>
      <div class="ai-note">用人结果由用人部门主动回评，仅用于校准筛选标准；系统不会据此自动调整评分或条件。</div>
    </div>`;
  $$('[data-urge]').forEach((b) => b.addEventListener('click', async () => {
    try { await api('/alerts/urge', { method: 'POST', body: { recommendationId: b.dataset.urge } }); toast('已发送催办提醒'); b.disabled = true; b.textContent = '已催办'; }
    catch (err) { toast(err.message, 'error'); }
  }));
}

/* ============================ 个人中心 ============================ */
async function renderProfile() {
  const u = state.user;
  content().innerHTML = `
    <div class="profile-grid">
      <div class="card">
        <h3>👤 我的账号</h3>
        <div class="profile-head">
          <span class="avatar" style="width:44px;height:44px;font-size:17px;">${esc(u.name.slice(0, 1))}</span>
          <div>
            <b style="font-size:15px;">${esc(u.name)}</b>
            <div class="muted">${esc(u.roleLabel)} · ${esc(u.dept)}</div>
          </div>
        </div>
        <div class="form-grid" style="margin-top:14px;">
          <div class="field"><label>姓名</label><input type="text" id="pf-name" value="${esc(u.name)}" maxlength="20"></div>
          <div class="field"><label>登录账号</label><input type="text" id="pf-account" value="${esc(u.account)}" placeholder="邮箱或 11 位手机号">
            <div class="form-hint">修改后下次登录请使用新账号；当前登录状态不受影响。</div>
          </div>
        </div>
        <button class="btn btn-primary" id="pf-save" style="margin-top:6px;">保存账号信息</button>
        <div class="ai-note">角色与部门由平台管理员维护，个人中心仅可修改姓名与登录账号。</div>
      </div>

      <div class="card">
        <h3>🔒 修改密码</h3>
        <div class="field"><label>当前密码 <span class="req">*</span></label><input type="password" id="pw-old" autocomplete="current-password"></div>
        <div class="field"><label>新密码 <span class="req">*</span></label><input type="password" id="pw-new" placeholder="至少 6 位" autocomplete="new-password"></div>
        <div class="field"><label>确认新密码 <span class="req">*</span></label><input type="password" id="pw-new2" autocomplete="new-password"></div>
        <button class="btn btn-primary" id="pw-save">更新密码</button>
        <div class="ai-note">密码修改后，其他设备上的登录会话会立即失效，当前会话保留。</div>
      </div>

      <div class="card">
        <h3>🧾 我的权限</h3>
        <div class="tagcloud">${u.capabilities.map((c) => `<span class="tag blue" style="margin:0 6px 6px 0;">${esc(c)}</span>`).join('')}</div>
        <table class="data-table" style="margin-top:10px;">
          <tbody>
            <tr><td class="muted">创建时间</td><td>${fmtTime(u.createdAt)}</td></tr>
            <tr><td class="muted">最近登录</td><td>${u.lastLoginAt ? fmtTime(u.lastLoginAt) : '—'}</td></tr>
            <tr><td class="muted">账号状态</td><td>${u.status === 'enabled' ? '<span class="tag green">启用</span>' : '<span class="tag gray">停用</span>'}</td></tr>
          </tbody>
        </table>
        <div class="ai-note">如需调整角色/部门或停用账号，请联系平台管理员（${esc('zhanggong@xinghe.com')}）。</div>
      </div>
    </div>`;

  $('#pf-save').addEventListener('click', async (e) => {
    const btn = e.currentTarget; btn.disabled = true; btn.textContent = '保存中…';
    try {
      const r = await api('/me/profile', { method: 'PATCH', body: { name: $('#pf-name').value.trim(), account: $('#pf-account').value.trim() } });
      state.user = r.user;
      updateAccountUI();
      toast('账号信息已更新' + (r.user.account !== u.account ? '，下次登录请使用 ' + r.user.account : ''));
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = '保存账号信息'; }
  });

  $('#pw-save').addEventListener('click', async (e) => {
    const oldPwd = $('#pw-old').value;
    const p1 = $('#pw-new').value;
    const p2 = $('#pw-new2').value;
    if (!oldPwd) return toast('请输入当前密码', 'error');
    if (p1.length < 6) return toast('新密码至少 6 位', 'error');
    if (p1 !== p2) return toast('两次输入的新密码不一致', 'error');
    const btn = e.currentTarget; btn.disabled = true; btn.textContent = '更新中…';
    try {
      await api('/me/password', { method: 'POST', body: { oldPassword: oldPwd, newPassword: p1 } });
      $('#pw-old').value = ''; $('#pw-new').value = ''; $('#pw-new2').value = '';
      toast('密码已更新，其他设备的登录已失效');
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = '更新密码'; }
  });
}

/* ============================ 平台管理 ============================ */
async function renderAdmin() {
  const [u, c, a] = await Promise.all([api('/users'), api('/config'), api('/audit?limit=80')]);
  const ROLE_OPTS = [['admin', '平台管理员'], ['manager', '招聘经理'], ['specialist', '招聘专员'], ['deptmgr', '用人部门经理'], ['interviewer', '用人部门面试官']];
  content().innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card"><div class="lbl">平台用户</div><div class="val">${u.users.length}</div><div class="sub">启用 ${u.users.filter((x) => x.status === 'enabled').length} · 停用 ${u.users.filter((x) => x.status === 'disabled').length} · 待激活 ${u.users.filter((x) => x.status === 'pending').length}</div></div>
      <div class="kpi-card"><div class="lbl">角色类型</div><div class="val">5</div><div class="sub">管理员 / 招聘经理 / 专员 / 部门经理 / 面试官</div></div>
      <div class="kpi-card"><div class="lbl">自动淘汰能力</div><div class="val" style="color:var(--green);font-size:19px;">● 已锁定关闭</div><div class="sub">合规红线，产品层不提供开启入口</div></div>
      <div class="kpi-card"><div class="lbl">审计日志</div><div class="val">${a.logs.length}</div><div class="sub">最近 80 条操作留痕</div></div>
    </div>

    <div class="card">
      <div class="inline" style="justify-content:space-between;margin-bottom:10px;">
        <h3 style="margin:0;">👥 用户管理</h3>
        <button class="btn btn-primary btn-sm" id="btn-new-user">＋ 新建用户</button>
      </div>
      <table class="user-table">
        <thead><tr><th>用户</th><th>登录账号</th><th>角色</th><th>部门</th><th>状态</th><th>最近登录</th><th>操作</th></tr></thead>
        <tbody>${u.users.map((x) => `
          <tr>
            <td><span class="avatar">${esc(x.name.slice(0, 1))}</span><b>${esc(x.name)}</b>${x.id === state.user.id ? ' <span class="tag blue" style="font-size:10.5px;">当前登录</span>' : ''}</td>
            <td class="muted">${esc(x.account)}</td>
            <td><span class="tag ${x.role === 'admin' ? 'purple' : x.role === 'deptmgr' ? 'green' : 'blue'}">${esc(x.roleLabel)}</span></td>
            <td class="muted">${esc(x.dept)}</td>
            <td>${x.status === 'enabled' ? '<span class="tag green">启用</span>' : x.status === 'disabled' ? '<span class="tag gray">停用</span>' : '<span class="tag orange">待激活</span>'}</td>
            <td class="muted small">${x.lastLoginAt ? fmtTime(x.lastLoginAt) : '—'}</td>
            <td><div class="row-actions">${x.id === state.user.id ? '<span class="muted small">自身账号</span>' : `
              <a class="link-btn" data-role="${x.id}">改角色</a>
              ${x.status === 'disabled' ? `<a class="link-btn" data-enable="${x.id}">启用</a>` : `<a class="link-btn" style="color:var(--red)" data-disable="${x.id}">停用</a>`}
              <a class="link-btn" data-reset="${x.id}">重置密码</a>`}</div></td>
          </tr>`).join('')}</tbody>
      </table>
      <div class="ai-note">新建用户即时启用并可登录；停用后会话立即失效、无法登录；所有账号操作写入审计日志且不可删除。</div>
    </div>

    <div class="chart-grid">
      <div class="card">
        <h3>🔑 角色权限矩阵（服务端强制）</h3>
        <table class="matrix">
          <thead><tr><th>能力</th><th>管理员</th><th>专员</th><th>经理</th><th>部门经理</th><th>面试官</th></tr></thead>
          <tbody>
            ${[
              ['上传/解析/核对简历', ['—', '✓', '—', '—', '—']],
              ['人工提交推荐', ['—', '✓', '—', '—', '—']],
              ['面试决定（同意/拒绝）', ['—', '—', '—', '✓', '—']],
              ['发布岗位 / 指派面试官', ['—', '—', '—', '✓', '—']],
              ['用人结果回评', ['—', '—', '—', '✓', '✓']],
              ['数据看板', ['✓', '✓', '✓', '✓', '✓']],
              ['用户与配置管理', ['✓', '—', '—', '—', '—']],
            ].map(([cap, arr]) => `<tr><td>${cap}</td>${arr.map((v) => `<td class="${v === '✓' ? 'yes' : 'no'}">${v}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
        <div class="ai-note">职责分离：管理员只治理平台，不参与招聘判断；面试决定只在用人部门经理。</div>
      </div>
      <div class="card">
        <h3>⚙️ 平台配置</h3>
        ${c.config.map((cfg) => `
          <div class="cfg-row">
            <span class="c-name">${esc(cfg.key)}</span>
            <span class="c-val">${esc(String(cfg.value))}<br><span class="muted" style="font-size:11px;">${esc(cfg.note || '')}</span></span>
            ${cfg.status === 'locked' ? '<span class="switch locked"></span>' : cfg.status === 'pending' ? '<span class="badge-tbd">待确认</span>' : '<span class="tag green">已确认</span>'}
          </div>`).join('')}
        <div class="ai-note">「自动淘汰」开关在服务端被硬编码拒绝修改；其余待确认口径可配置，确认后去掉待确认标识。</div>
      </div>
    </div>

    <div class="card">
      <h3>📜 审计日志（只读）</h3>
      <table class="data-table">
        <thead><tr><th>时间</th><th>操作人</th><th>动作</th><th>对象</th><th>结果</th><th>详情</th></tr></thead>
        <tbody>${a.logs.map((l) => `
          <tr><td class="muted small">${fmtTime(l.at)}</td><td>${esc(l.user_name || '—')}</td><td>${esc(l.action)}</td>
          <td class="muted small">${esc(l.object_type || '')} ${esc((l.object_id || '').slice(0, 18))}</td>
          <td>${l.result === 'success' ? '<span class="tag green">成功</span>' : '<span class="tag red">拒绝</span>'}</td>
          <td class="muted small" style="max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(l.detail || '')}</td></tr>`).join('')}</tbody>
      </table>
    </div>`;

  $('#btn-new-user').addEventListener('click', () => UI.newUserModal());
  $$('[data-role]').forEach((b) => b.addEventListener('click', () => UI.roleModal(b.dataset.role)));
  $$('[data-disable]').forEach((b) => b.addEventListener('click', () => UI.disableModal(b.dataset.disable)));
  $$('[data-enable]').forEach((b) => b.addEventListener('click', () => UI.enableUser(b.dataset.enable)));
  $$('[data-reset]').forEach((b) => b.addEventListener('click', () => UI.resetPwd(b.dataset.reset)));
}

/* ============================ UI 暴露 ============================ */
const UI = {
  closeModal, logout, closePanels,
  go: (p) => go(p),
  openProfile: () => { closePanels(); go('profile'); },
  openFile: async (appId) => {
    try {
      const res = await fetch('/api/applications/' + appId + '/file', { headers: { Authorization: 'Bearer ' + state.token } });
      if (!res.ok) throw new Error('无法打开原件（' + res.status + '）');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) { toast(err.message, 'error'); }
  },
  openJob, openResume, openRec, decideModal,
  gotoHire: (onboardingId) => {
    state.fbTab = 'hire'; state.onboardId = onboardingId;
    closePanels(); go('feedback');
    setTimeout(() => { try { openHire(onboardingId); } catch { } }, 80);
  },
  readAllNotifs: async () => { await api('/notifications/read', { method: 'POST', body: {} }); await loadNotifications(); renderNotificationsPanel(); },
  openNotif: async (ds) => {
    await api('/notifications/read', { method: 'POST', body: { ids: [ds.id] } });
    closePanels(); await loadNotifications();
    if (ds.type === 'hiring_outcome' || ds.ref === 'onboarding') { state.fbTab = 'hire'; go('feedback'); setTimeout(() => { state.onboardId = ds.refid; openHire(ds.refid); }, 60); return; }
    if (ds.ref === 'recommendation') { state.fbTab = 'rec'; state.recId = ds.refid; go('feedback'); return; }
    if (ds.ref === 'job') { go('jobs'); setTimeout(() => openJob(ds.refid), 50); }
  },
  jobStatus: async (id, status) => {
    if (status === 'closed') {
      modalForm({
        title: '确认需求结束', desc: '需求结束需由需求提出人确认，确认后岗位不再接受新推荐，过程数据保留只读（R32）。',
        fields: '', submitText: '确认结束', danger: true,
        onSubmit: async () => { await api(`/jobs/${id}/status`, { method: 'POST', body: { status } }); closeModal(); toast('需求已结束'); await renderJobs(id); },
      });
      return;
    }
    if (status === 'suspended') {
      modalForm({
        title: '挂起岗位', desc: '挂起后该岗位不做硬性投递要求；挂起触发条件与恢复方式属待确认项（C14），当前由人工触发。',
        fields: '<div class="field"><label>挂起原因 <span class="req">*</span></label><textarea id="suspend-reason" rows="3"></textarea></div>',
        submitText: '确认挂起',
        onSubmit: async () => {
          const reason = $('#suspend-reason').value.trim();
          if (!reason) throw new Error('请填写挂起原因');
          await api(`/jobs/${id}/status`, { method: 'POST', body: { status, reason } });
          closeModal(); toast('岗位已挂起'); await renderJobs(id);
        },
      });
      return;
    }
    await api(`/jobs/${id}/status`, { method: 'POST', body: { status } });
    toast('岗位已恢复为进行中'); await renderJobs(id);
  },
  removeCrit: (btn) => {
    btn.closest('.crit-edit').remove();
    const sum = $$('#crit-rows .c-weight').reduce((acc, el) => acc + (Number(el.value) || 0), 0);
    const box = $('#weight-sum');
    if (box) { box.textContent = `权重合计：${sum}%（需为 100%）`; box.style.color = sum === 100 ? 'var(--green)' : 'var(--red)'; }
  },
  notRecommend: (id) => modalForm({
    title: '标记不推荐（人工）', desc: '这是<b>人工决策</b>而非 AI 淘汰，原因会写入留痕（审计与状态流转）。',
    fields: '<div class="field"><label>不推荐原因 <span class="req">*</span></label><textarea id="nr-reason" rows="3" placeholder="例：技术栈与岗位已确认条件不匹配"></textarea></div>',
    submitText: '确认不推荐', danger: true,
    onSubmit: async () => {
      const reason = $('#nr-reason').value.trim();
      if (!reason) throw new Error('请填写不推荐原因');
      await api(`/applications/${id}/not-recommend`, { method: 'POST', body: { reason } });
      closeModal(); toast('已标记不推荐并留痕'); await renderResumeDetail(id);
    },
  }),
  interviewModal: (id) => modalForm({
    title: '回录面试结果', desc: '面试在飞书完成，本平台只回录结果（不做排期对接，R29）。',
    fields: `<div class="field"><label>面试结果</label><select id="iv-result"><option value="pass">通过</option><option value="fail">未通过</option></select></div>
             <div class="field"><label>面试备注</label><textarea id="iv-note" rows="3" placeholder="例：技术面通过，沟通顺畅；对跨团队协作仍有疑问"></textarea></div>`,
    submitText: '保存结果',
    onSubmit: async () => {
      if (!window.__recId) throw new Error('未找到推荐记录，无法回录面试结果');
      await api(`/recommendations/${window.__recId}/interview`, { method: 'POST', body: { result: $('#iv-result').value, note: $('#iv-note').value } });
      closeModal(); toast('面试结果已回录'); await renderResumeDetail(id);
    },
  }),
  offerModal: (id) => modalForm({
    title: '回录 Offer 结果', desc: 'Offer 的生成/审批/发送不在平台内，此处仅记录实际结果（R30）。',
    fields: `<div class="field"><label>Offer 实际结果</label><select id="of-result"><option value="accepted">已接受</option><option value="declined">已拒绝</option></select></div>
             <div class="field"><label>备注</label><textarea id="of-note" rows="2"></textarea></div>`,
    submitText: '保存结果',
    onSubmit: async () => {
      if (!window.__recId) throw new Error('未找到推荐记录，无法回录 Offer');
      await api(`/recommendations/${window.__recId}/offer`, { method: 'POST', body: { result: $('#of-result').value, note: $('#of-note').value } });
      closeModal(); toast('Offer 结果已回录'); await renderResumeDetail(id);
    },
  }),
  onboardModal: (id) => modalForm({
    title: '登记实际入职', desc: '仅当已核实候选人实际到岗后登记；<b>接受 Offer / 预计入职日期不算入职</b>（R31）。',
    fields: `<div class="field"><label>实际入职日期 <span class="req">*</span></label><input type="date" id="onb-date" value="${new Date().toISOString().slice(0, 10)}"></div>`,
    submitText: '登记入职',
    onSubmit: async () => {
      if (!window.__recId) throw new Error('未找到推荐记录，无法登记入职');
      await api(`/recommendations/${window.__recId}/onboard`, { method: 'POST', body: { onboardDate: $('#onb-date').value } });
      closeModal(); toast('已登记实际入职，进入用人结果观察期'); await renderResumeDetail(id);
    },
  }),
  withdrawModal: (id) => modalForm({
    title: '撤回推荐', desc: '部门反馈前可撤回，撤回需填写原因并保留记录。',
    fields: '<div class="field"><label>撤回原因 <span class="req">*</span></label><textarea id="wd-reason" rows="3"></textarea></div>',
    submitText: '确认撤回',
    onSubmit: async () => {
      const reason = $('#wd-reason').value.trim();
      if (!reason) throw new Error('请填写撤回原因');
      await api(`/recommendations/${id}/withdraw`, { method: 'POST', body: { reason } });
      closeModal(); toast('已撤回推荐'); await renderFeedback();
    },
  }),
  newUserModal: () => {
    const DEPTS = ['人力资源部 · 招聘组', '人力资源部', '技术部 · 架构组', '技术部 · 应用研发组', '算法部 · 大模型组', '信息技术部'];
    modalForm({
      title: '新建平台用户',
      desc: '创建后账号即时启用，可在登录页直接登录；系统同时发送初始密码通知（演示环境统一密码）。',
      fields: `<div class="form-grid">
        <div class="field"><label>姓名 <span class="req">*</span></label><input type="text" id="nu-name"></div>
        <div class="field"><label>登录账号 <span class="req">*</span></label><input type="text" id="nu-account" placeholder="邮箱或 11 位手机号"></div>
        <div class="field"><label>角色 <span class="req">*</span></label><select id="nu-role">
          <option value="specialist">招聘专员</option><option value="deptmgr">用人部门经理</option>
          <option value="interviewer">用人部门面试官</option><option value="manager">招聘经理</option><option value="admin">平台管理员</option></select></div>
        <div class="field"><label>部门 <span class="req">*</span></label><select id="nu-dept">${DEPTS.map((d) => `<option>${d}</option>`).join('')}</select></div>
      </div>`,
      submitText: '创建用户',
      onSubmit: async () => {
        const u = await api('/users', { method: 'POST', body: { name: $('#nu-name').value.trim(), account: $('#nu-account').value.trim(), role: $('#nu-role').value, dept: $('#nu-dept').value } });
        closeModal(); toast('用户「' + u.user.name + '」创建成功，可直接登录'); await renderAdmin();
      },
    });
  },
  roleModal: async (id) => {
    const users = (await api('/users')).users;
    const u = users.find((x) => x.id === id);
    modalForm({
      title: `变更角色 · ${u.name}`, desc: `当前角色：${u.roleLabel}。变更即时生效并记录审计日志。`,
      fields: `<div class="field"><label>变更为</label><select id="role-new">
        ${[['specialist', '招聘专员'], ['deptmgr', '用人部门经理'], ['interviewer', '用人部门面试官'], ['manager', '招聘经理'], ['admin', '平台管理员']]
          .map(([v, l]) => `<option value="${v}" ${u.role === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select></div><div class="field"><label>变更原因</label><input type="text" id="role-reason" placeholder="将记录到审计日志"></div>`,
      submitText: '保存变更',
      onSubmit: async () => {
        await api(`/users/${id}/role`, { method: 'PATCH', body: { role: $('#role-new').value, reason: $('#role-reason').value } });
        closeModal(); toast('角色已更新，即时生效'); await renderAdmin();
      },
    });
  },
  disableModal: (id) => modalForm({
    title: '停用账号', desc: '停用后该账号立即无法登录，历史操作留痕全部保留。',
    fields: '<div class="field"><label>停用原因 <span class="req">*</span></label><textarea id="dis-reason" rows="3" placeholder="例：离职 / 岗位调整"></textarea></div>',
    submitText: '确认停用', danger: true,
    onSubmit: async () => {
      const reason = $('#dis-reason').value.trim();
      if (!reason) throw new Error('停用原因必填');
      await api(`/users/${id}/status`, { method: 'POST', body: { status: 'disabled', reason } });
      closeModal(); toast('账号已停用，登录立即失效'); await renderAdmin();
    },
  }),
  enableUser: async (id) => {
    try { await api(`/users/${id}/status`, { method: 'POST', body: { status: 'enabled' } }); toast('账号已启用'); await renderAdmin(); }
    catch (err) { toast(err.message, 'error'); }
  },
  resetPwd: async (id) => {
    try {
      const r = await api(`/users/${id}/reset-password`, { method: 'POST' });
      openModal(`<h3>密码已重置</h3><p class="muted" style="margin-bottom:12px;">临时密码仅显示一次，请通过安全渠道告知用户：</p>
        <div style="background:var(--gray-bg);border-radius:8px;padding:12px;font-family:monospace;font-size:16px;text-align:center;">${esc(r.temporaryPassword)}</div>
        <div class="m-foot"><button class="btn btn-primary" onclick="UI.closeModal()">知道了</button></div>`);
      await renderAdmin();
    } catch (err) { toast(err.message, 'error'); }
  },
};
window.UI = UI;

/* ============================ 启动 ============================ */
(async function boot() {
  await loadDemoAccounts();
  if (state.token) {
    try { await enterApp(); return; } catch { logoutLocal(); }
  }
})();
