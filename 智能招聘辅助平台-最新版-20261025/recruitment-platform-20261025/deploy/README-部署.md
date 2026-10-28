# 部署到腾讯云 Windows 服务器

目标服务器：**62.234.152.249**（轻量应用服务器 · 宝塔 Windows 面板 · 北京 · 2核2G · Windows Server）

---

## 0. 先看现状（已实测）

| 端口 | 状态 | 说明 |
|---|---|---|
| 3389 | ✅ 开放 | 远程桌面，现在就能连 |
| 8888 | ✅ 开放 | 宝塔面板 |
| 80 / 443 | ❌ 未开放 | 用不到，先别动（大陆地域未备案域名不宜走 80） |
| 8080 | ❌ 未开放 | **本项目的端口，需要你去加规则** |

所以只需做两件事：**放通 8080** + **跑一个脚本**。

---

## 1. 连上服务器

### 方式 A：控制台网页登录（最省事，不知道密码也能进）

在轻量应用服务器列表，点实例卡片上的蓝色 **`登录`** 按钮 → 弹出网页版远程桌面。
若提示输入密码而你并不知道，走下面「重置密码」。

### 方式 B：本机远程桌面（推荐，方便传文件）

1. 按 `Win + R`，输入 `mstsc`，回车
2. 计算机填 `62.234.152.249`，点「显示选项」
3. 用户名填 `Administrator`
4. 切到 **本地资源** → **详细信息** → 勾选 **驱动器**（这样服务器里能看到你的 C 盘、D 盘，直接复制粘贴文件）
5. 回到「常规」点连接，输入密码

> **不知道密码**：控制台 → 勾选实例 → 更多 → **重置密码** → 设为 `Administrator` 的新密码 → 确认后**重启实例**才生效（约 1 分钟）。

### 方式 C：宝塔面板（只用来传文件）

浏览器打开 `http://62.234.152.249:8888`，用宝塔的账号密码登录（首次进入时你自己设置过；忘了就在服务器命令行执行 `bt default` 查看）。
面板里 **文件** → 进入 `C:\` → 上传 → 可以传 zip 并在线解压。

---

## 2. 放通 8080 端口（关键，不做这步外网打不开）

**腾讯云控制台** → 轻量应用服务器 → 点实例进入详情 → 上方 **防火墙** 标签 → **添加规则**：

| 应用类型 | 协议 | 端口 | 来源 | 备注 |
|---|---|---|---|---|
| 自定义 | TCP | `8080` | `0.0.0.0/0` | 招聘平台 |

> 想更安全：来源填你自己的公网 IP（百度搜「IP」即可看到），这样只有你能访问。

Windows 服务器自带的防火墙由安装脚本自动放通，不用手动改。

---

## 3. 上传项目

把本机生成的 **`dist\recruitment-platform.zip`**（约 4.5 MB）传到服务器：

- **方式 B 的映射驱动器**：在服务器里打开「此电脑」，找到类似 `C on 你的电脑名` 的盘，把 zip 复制到服务器的 `C:\`
- **方式 C 宝塔**：文件 → `C:\` → 上传 → 右键解压
- **不嫌慢也可以**：直接在服务器里打开浏览器下载（如果你把 zip 放到某个可访问位置）

解压后目录结构应是：

```
C:\recruitment-platform\
├── server\       后端
├── web\          前端
├── data\         3 个岗位 + 30 份简历 PDF
├── deploy\       部署脚本
├── openspec\     开发规格
├── package.json
└── .env.example
```

> 建议就放在 `C:\recruitment-platform`，路径短、无空格、无中文，避免各种奇怪问题。

---

## 4. 一键部署

**最省事：双击 `deploy\一键部署.cmd`**
进入 `C:\recruitment-platform\deploy`，双击 `一键部署.cmd`，在弹出的 UAC 窗口点「是」，然后等它自己跑完（会新开一个权限更高的窗口，别关掉）。

**或者用命令行**：在服务器上以管理员身份打开 PowerShell（开始菜单搜 `PowerShell` → 右键 → 以管理员身份运行），执行：

```powershell
cd C:\recruitment-platform
powershell -NoProfile -ExecutionPolicy Bypass -File deploy\install.ps1
```

脚本会依次完成 6 步，全程约 3–6 分钟：

| 步骤 | 做什么 | 耗时 |
|---|---|---|
| 1 | 检查 Node，没有就自动下载安装 22.x 到 `C:\nodejs` | 1–2 分钟 |
| 2 | `npm install`（走国内镜像） | 1–3 分钟 |
| 3 | 生成 `.env`，端口设为 8080 | 秒级 |
| 4 | 导入 3 个岗位 + 30 份简历，并调用大模型解析前 10 份 | 1–2 分钟 |
| 5 | 放通 Windows 防火墙 8080 | 秒级 |
| 6 | 注册计划任务 `RecruitmentPlatform`（开机自启 + 崩溃自动重启）并启动 | 秒级 |

**如果只想先跑起来、不想花时间调模型**（第 4 步跳过解析）：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File deploy\install.ps1 -SeedParse 0
```

之后可以在页面上逐份点「重新解析」，或在服务器里补跑：

```powershell
$env:SEED_PARSE="10"; node --experimental-sqlite --env-file-if-exists=.env server/seed.mjs
```

（注意：seed 只在数据库不存在时执行，已有数据会跳过）

---

## 5. 验证

脚本结束会打印访问地址。手动确认：

```powershell
# 服务器上自测（应返回 {"ok":true,...}）
curl http://127.0.0.1:8080/health
```

本机浏览器打开：

```
http://62.234.152.249:8080
```

登录账号（密码统一 `Xinghe@2026`）：

| 姓名 | 账号 | 角色 |
|---|---|---|
| 张工 | zhanggong@xinghe.com | 平台管理员 |
| 周姐 | zhoujie@xinghe.com | 招聘经理 |
| 李婷 | liting@xinghe.com | 招聘专员 |
| 张晓 | xiaozhang@xinghe.com | 招聘专员 |
| 王总监 | wangzj@xinghe.com | 用人部门经理 |
| 陈经理 | chenjl@xinghe.com | 用人部门经理 |
| 顾清 / 孙磊 / 李娜 | guqing@ / sunlei@ / lina@xinghe.com | 用人部门面试官 |

赵敏（待激活）、刘总监（已停用）用于演示「账号状态决定能否登录」。

---

## 6. 日常维护

```powershell
# 看实时日志
Get-Content C:\recruitment-platform\storage\server.log -Tail 50 -Wait

# 停止 / 启动 / 重启
powershell -ExecutionPolicy Bypass -File C:\recruitment-platform\deploy\stop.ps1
schtasks /Run /TN RecruitmentPlatform
powershell -ExecutionPolicy Bypass -File C:\recruitment-platform\deploy\stop.ps1; schtasks /Run /TN RecruitmentPlatform

# 改端口：编辑 .env 里的 PORT，然后用上面「重启」；记得同步改腾讯云防火墙
notepad C:\recruitment-platform\.env

# 备份数据（整个 storage 目录，含数据库与上传的简历原件）
Compress-Archive -Path C:\recruitment-platform\storage -DestinationPath C:\backup-$(Get-Date -Format yyyyMMdd).zip

# 升级代码：新 zip 解压覆盖 server\ web\，保留 storage\ 和 .env，然后重启
```

---

## 7. 常见问题

**Q：外网打不开，服务器上 `127.0.0.1:8080` 却是通的？**
腾讯云防火墙没加规则。回去做第 2 步。这是最常见的卡点——云厂商防火墙和 Windows 防火墙是两道独立的门。

**Q：`npm install` 卡住或超时？**
脚本已默认用 `registry.npmmirror.com`。若仍失败，检查服务器能否访问外网，或改用：

```powershell
npm install --registry=https://registry.npmmirror.com --fetch-timeout=120000
```

**Q：Node 下载失败？**
手工装 Node 22 LTS（https://nodejs.org/zh-cn/download 选 Windows 64-bit msi），装完重跑 `install.ps1`，脚本检测到 22.5+ 会自动跳过下载。

**Q：第 4 步解析很慢 / 报模型错误？**
2 核小机器 + 每份简历一次模型调用，10 份约 1–2 分钟属正常。若报 401/403，检查 `.env` 里的 `LLM_API_KEY`；若报「max_tokens 不足」，把 `server/llm.mjs` 里 `maxTokens` 调大。想省时间就 `-SeedParse 0`。

**Q：8080 被占用？**
`netstat -ano | findstr :8080` 看占用进程，或改 `.env` 的 `PORT` 为 `8090` 并同步加防火墙规则。

**Q：服务器重启后要手动启动吗？**
不需要，计划任务 `RecruitmentPlatform` 是开机自启的。确认一下：`schtasks /Query /TN RecruitmentPlatform`。

**Q：2G 内存够吗？**
够。应用常驻约 150–250 MB，PDF 解析是串行处理。宝塔自带的 Nginx/IIS 若也在跑，注意别开太多站点。

**Q：能不能用 80 端口，做成 `http://62.234.152.249` 直接访问？**
技术上可以：在宝塔里建站点反向代理到 `127.0.0.1:8080`，并在腾讯云放通 80。但大陆地域未备案的域名/站点会被拦截，演示阶段建议先用 8080，稳定后再谈备案和域名。

---

## 8. 安全提醒（演示环境请注意）

1. **演示账号密码是公开的**（文档里就有）。一旦 8080 对全网开放，任何人都能登录看到简历数据。
   → 建议把防火墙来源限制为你自己的 IP；或演示完就把服务停掉。
2. **改掉默认密码**：正式使用前，至少改掉管理员账号密码（可让管理员在「平台管理」里重置，或直接改 `server/seed.mjs` 的 `PASSWORD` 后重建数据）。
3. **`storage\` 目录是全部业务数据**（SQLite + 上传的 PDF 原件），备份就备份它。
4. **`.env` 里含大模型 API Key**，别把服务器目录整个打包发给外部。

---

## 9. 改完代码怎么更新到服务器

服务器上是**独立副本**，本地改动不会自动同步，必须手动推上去。分两种情况：

### 情况 A：只改了一两个文件（最快）

直接用远程桌面复制粘贴覆盖对应文件，然后按类型重启：

| 改了什么 | 覆盖到哪里 | 要不要重启 |
|---|---|---|
| `web/app.js`、`web/styles.css`、`web/index.html` | `C:\recruitment-platform\web\` | **不用**，浏览器 `Ctrl+F5` 强制刷新 |
| `server/*.mjs`（接口、鉴权、模型调用） | `C:\recruitment-platform\server\` | **要**，见下 |
| `data/` 里的岗位简历素材 | 对应目录 | 不用（数据已在库里，改了素材不影响） |

重启服务：

```
powershell -NoProfile -ExecutionPolicy Bypass -File C:\recruitment-platform\deploy\stop.ps1
schtasks /Run /TN RecruitmentPlatform
```

### 情况 B：改了很多文件（推荐，一条命令搞定）

1. 本地执行 `npm run pack` 生成新包：`dist\recruitment-platform.zip`
2. 用远程桌面把 zip 拖到服务器（如 `C:\recruitment-platform.zip`）
3. 双击 `C:\recruitment-platform\deploy\更新部署.cmd`，把 zip 拖到这个 cmd 上松手
   （或命令行：`更新部署.cmd C:\recruitment-platform.zip`）

`update.ps1` 会自动完成：

- 校验更新包结构
- **备份数据库**到 `storage\recruitment.db.bak-时间戳`
- 停服务 → 覆盖代码（**跳过 `storage\`、`node_modules\`、`.env`**，数据不会丢）
- 检测 `package.json` 变了就自动 `npm install`
- 重新拉起计划任务并做健康检查

> 回滚：停服务，把 `storage\recruitment.db.bak-<时间戳>` 改名回 `recruitment.db`，再用旧 zip 跑一次更新。

