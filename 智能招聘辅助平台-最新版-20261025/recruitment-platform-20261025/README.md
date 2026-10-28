# 智能招聘辅助平台（可运行实现）

依据 `openspec/changes/build-recruitment-platform`（proposal / specs / design / tasks）实现的可运行版本：岗位需求 → AI 解析简历 → 人工核对 → 人工推荐 → 部门反馈（同意面试）→ **面试官录用决定** → 已入职候选人 → 用人结果反馈。

- 后端：Node.js + Express + SQLite（`node:sqlite`），无 ORM
- 前端：原生 ES Module + 原生 CSS，无构建步骤
- 大模型：OpenAI 兼容接口（DeepSeek），逐项对照 + 原文证据校验
- 数据：`data/`（3 个真实岗位来自 `岗位及招聘需求.docx`，30 份 PDF 简历）

## 快速开始

```bash
npm install
SEED_PARSE=8 npm run seed      # 首次：建库 + 导入 30 份简历 + 用大模型解析 8 份 + 构造演示流转
npm start                      # http://localhost:5173
npm test                       # 26 项合规红线与权限用例（自动使用临时库，不污染演示数据）
```

> 环境要求：Node ≥ 22.5（使用内置 `node:sqlite`，启动时带 `--experimental-sqlite`，已在 npm scripts 中配置）。
> 大模型配置：读取 `.env`（参考 `.env.example`）或环境变量 `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL`。

## 部署到云服务器

Windows Server 一键部署脚本见 [`deploy/README-部署.md`](deploy/README-部署.md)（含连服务器、开端口、上传、部署、维护全流程）。

```powershell
npm run pack        # 打包 dist/recruitment-platform-*.zip（不含 node_modules 与数据）
# 服务器上解压后：
powershell -NoProfile -ExecutionPolicy Bypass -File deploy\install.ps1
```

脚本自动完成：安装 Node 22 → 装依赖 → 生成 `.env` → 初始化数据 → 放通防火墙 → 注册开机自启任务并启动。

### 平台账号（密码统一 `123456`）

登录页的账号列表仅用于**填入账号**，密码需手动输入；登录后可在「个人中心」自行修改姓名、登录账号与密码。

| 账号 | 姓名 | 角色 | 部门 | 说明 |
| --- | --- | --- | --- | --- |
| zhanggong@xinghe.com | 张工 | 平台管理员 | 信息技术部 | 用户/配置/审计，不做业务决策 |
| liting@xinghe.com | 李婷 | 招聘专员 | 人力资源部·招聘组 | 负责 AI应用全栈工程师 |
| xiaozhang@xinghe.com | 张晓 | 招聘专员 | 人力资源部·招聘组 | 负责大模型算法工程师 |
| wangzj@xinghe.com | 王总监 | 用人部门经理 | 技术部·架构组 | 面试决定/发岗位/指派面试官（当前无在招岗位） |
| chenjl@xinghe.com | 陈经理 | 用人部门经理 | 技术部·应用研发组 | 同上 |
| wuwj@xinghe.com | 吴总监 | 用人部门经理 | 算法部·大模型组 | 同上 |
| guqing@xinghe.com | 顾清 | 用人部门面试官 | 技术部·架构组 | 只读 + 用人结果回评（当前无在招岗位） |
| sunlei@xinghe.com | 孙磊 | 用人部门面试官 | 技术部·应用研发组 | 只读 + 用人结果回评 + 解答专员追问 |
| lina@xinghe.com | 李娜 | 用人部门面试官 | 算法部·大模型组 | 同上 |

> 想跑一遍完整流程：用 `chenjl@xinghe.com` 发布岗位（选择负责专员，判定规则可留空）→ 对应专员在「岗位需求工作台」看到岗位、生成岗位画像解读、发起追问 → 用人部门解答 → 专员提交 PDF 简历并触发 AI 分析 → 提交推荐 → 部门做面试决定。

## 目录结构

```
server/
  index.mjs        Express 入口与静态资源
  db.mjs           SQLite 表结构、审计、状态流水、通知、配置
  auth.mjs         密码/会话、能力点矩阵、岗位与部门范围校验
  routes.mjs       全部 API（岗位/简历/推荐/反馈/结果/看板/平台管理）
  llm.mjs          大模型解析与推荐草稿（含证据校验、结论降级）
  pdf.mjs          PDF 文本抽取
  seed.mjs         导入真实岗位与简历、调用大模型、构造演示流转
  tests/           node:test 红线用例
web/               原生 ESM 前端（登录、5 个工作台、个人中心）
openspec/          规格（proposal / specs / design / tasks）
data/              岗位需求 docx、30 份 PDF 简历
storage/           SQLite 数据库、上传文件、日志（已 gitignore）
```

## 关键实现与规格对应

| 规格要点 | 实现位置 |
| --- | --- |
| AI 不自动淘汰、不设分数淘汰线 | `routes.mjs` 无任何自动流转/过滤接口；`POST /applications/:id/recommend` 仅人工触发；配置项 `auto_eliminate_enabled` 状态 `locked`，接口直接 403 |
| 结论必须附原文证据；未写到只标"信息不足" | `llm.mjs` 对每条结论做字符串定位校验，无证据降级为 `insufficient_info` 或标记 `evidence_missing`；并为每条非符合项兜底生成待核实问题 |
| 意向确认先于录入 | `POST /applications` 校验 `intentConfirmed=true`，否则 400 `INTENT_REQUIRED` |
| 推荐材料草稿 + 人工提交 | `POST /applications/:id/recommend/draft`（LLM + 本地兜底）→ `POST /applications/:id/recommend` 校验理由/差距 |
| 部门三选一、拒绝原因必填 | `POST /recommendations/:id/feedback`，`reject` 无原因返回 400 `REASON_REQUIRED`；`need_info` 必须给补充要求；仅本部门经理可调用 |
| 反馈送达推荐人 | `notify()` 写入站内通知，铃铛未读 + 点击定位到对应推荐 |
| 用人结果反馈 | `POST /onboardings/:id/outcome` 仅本部门经理/面试官可提交，提交后通知推荐人；默认观察期 30 天（配置项 `outcome_observe_days`）**只做提示不阻断**，未满观察期提交会标记为「早期评价」 |
| 面试官录用决定 | 部门「同意面试」后，由该岗位**本部门面试官或部门经理**调用 `POST /recommendations/:id/hire-decision`：`hire` = 面试通过 + 登记实际入职（写入 `interviews` + `onboardings`，状态转 `已入职`，立即出现在「已入职候选人」可回评）；`no_hire` = 必填原因、状态转面试未通过。专员与跨部门人员均 403，重复决定 409 |
| 岗位维度隔离 | `canViewJob` / `canSeeApplication` 统一收口；跨岗位材料与原件均返回 403 并写审计 |
| 条件版本化 | `job_conditions` 按版本存储，变更生成新版本、旧版本保留 |
| 报表口径待确认 | `metric_definitions` 状态 `pending` 时看板显示"口径待确认"并禁用导出 |
| 审计不可删 | 仅 `GET /api/audit`，无删除接口；越权请求记录 `denied.*` |
| 判定规则改为选填 | 用人部门发布岗位只需填条件名称/类型/权重（合计 100%）；`rule` 缺省时解析按「条件名称 + 岗位描述」理解，边界不清自动列入待核实问题 |
| 岗位画像解读（专员侧） | `POST /api/jobs/:id/analysis` 调大模型把岗位描述+条件+已澄清结论整理成必备项/加分项/正向信号/伪信号/待确认点，落库 `job_analyses` 并按条件版本判 stale；只读解读，不改条件、不参与打分 |
| 追问可线程化 | `clarifications.parent_id` 支持对某条解答继续追问；专员提问、本部门经理或本部门被指派面试官解答，双方均触发站内通知，追加不可编辑 |
| 个人中心自助改账号/密码 | `PATCH /api/me/profile`（校验邮箱或手机号格式 + 查重）、`POST /api/me/password`（校验原密码、≥6 位、注销本会话外其他会话）；角色与部门仍只由管理员维护 |
| 发布岗位须指定负责专员 | `POST /api/jobs` 校验 `ownerId` 为启用状态的招聘专员，写 `job_members(role_on_job='owner')` 并通知，否则专员看不到该岗位 |

## API 速览

```
POST /api/login                       POST /api/logout        GET /api/me
PATCH /api/me/profile                 POST /api/me/password
GET  /api/jobs                        GET  /api/jobs/:id
POST /api/jobs                        POST /api/jobs/:id/conditions
POST /api/jobs/:id/analysis                       # 生成/刷新岗位画像解读
POST /api/jobs/:id/clarifications     POST /api/clarifications/:id/reply
POST /api/jobs/:id/interviewers       POST /api/jobs/:id/status
GET  /api/dept-members                GET  /api/specialists
GET  /api/applications                GET  /api/applications/:id
POST /api/applications                POST /api/applications/:id/parse
POST /api/applications/:id/recommend/draft
POST /api/applications/:id/recommend  POST /api/applications/:id/not-recommend
GET  /api/applications/:id/file       POST /api/recommendations/:id/withdraw
GET  /api/recommendations/:id         POST /api/recommendations/:id/feedback
POST /api/recommendations/:id/interview | offer | onboard
POST /api/recommendations/:id/hire-decision        # 面试官：录用 / 不予录用
GET  /api/feedbacks                   GET  /api/onboardings
POST /api/onboardings/:id/outcome     GET  /api/notifications
GET  /api/dashboard                   POST /api/alerts/urge
GET/POST /api/users                   PATCH /api/users/:id/role
POST /api/users/:id/status            POST /api/users/:id/reset-password
GET  /api/audit                       GET  /api/config   PATCH /api/config/:key
```

## 已知差距（未完成项）

对应 `openspec/changes/build-recruitment-platform/tasks.md` 中仍未勾选的任务：

1. 状态机尚未抽成独立的领域服务，合法/非法跃迁校验分散在各接口内。
2. "按新条件重新筛选"仅保留条件版本，未实现批量重跑入口。
3. 同人同岗的新版本上传、同人多岗档案关联未实现（当前每次上传生成新的应聘记录，仅做同名提示）。
4. 通知为站内信直写，未实现 outbox 投递与短信/邮件外发。
5. B 端报表导出、口径确认后的正式报表未实现。
6. 单岗全流程正式试跑与 C1–C16 客户确认尚未进行。

实现层面的两处有意调整（已同步到 design.md）：以 SQLite 替代 PostgreSQL；以原生 ESM 前端替代 React 构建链，便于零构建启动与演示。规格中的行为契约未变。
