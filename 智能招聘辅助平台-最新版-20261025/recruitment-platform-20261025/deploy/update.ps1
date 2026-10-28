# ============================================================
#  智能招聘辅助平台 - 更新部署脚本
#  用新打的 zip 覆盖现有项目，保留数据库 / 依赖 / .env，然后重启服务
#
#  用法（服务器上，管理员 PowerShell 或双击「更新部署.cmd」）：
#    更新部署.cmd C:\recruitment-platform.zip
#  或：
#    powershell -NoProfile -ExecutionPolicy Bypass -File deploy\update.ps1 -Zip C:\recruitment-platform.zip
# ============================================================
param(
  [Parameter(Mandatory = $true)][string]$Zip,
  [int]$Port = 0
)

$ErrorActionPreference = 'Stop'

# ---------- 权限 ----------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host '需要管理员权限，正在提升...' -ForegroundColor Yellow
  Start-Process powershell.exe -Verb RunAs -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"", '-Zip', "`"$Zip`"")
  exit
}

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Step($n, $msg) { Write-Host ''; Write-Host "==== $n  $msg ====" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "  [OK]  $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "  [!]   $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "  [X]   $msg" -ForegroundColor Red; exit 1 }

Write-Host '智能招聘辅助平台 · 更新部署' -ForegroundColor White
Write-Host "项目目录：$Root"

# 读取端口
if ($Port -le 0) {
  $Port = 8080
  $envFile = Join-Path $Root '.env'
  if (Test-Path $envFile) {
    $m = Select-String -Path $envFile -Pattern '^PORT=(\d+)' | Select-Object -First 1
    if ($m) { $Port = [int]$m.Matches[0].Groups[1].Value }
  }
}

# ============================================================
Step '1/5' '校验更新包'
# ============================================================
if (-not (Test-Path $Zip)) { Fail "找不到更新包：$Zip" }
$tmp = Join-Path $env:TEMP ("rp-update-" + (Get-Date -Format 'yyyyMMddHHmmss'))
New-Item -ItemType Directory -Path $tmp -Force | Out-Null
Write-Host "  解压到临时目录 $tmp" -ForegroundColor DarkGray
Expand-Archive -LiteralPath $Zip -DestinationPath $tmp -Force
$src = Join-Path $tmp 'recruitment-platform'
if (-not (Test-Path $src)) { $src = $tmp }
if (-not (Test-Path (Join-Path $src 'server\index.mjs'))) { Fail '更新包结构不正确（缺少 server\index.mjs），请用 deploy\pack.ps1 重新打包' }
Ok "更新包结构正确"

# ============================================================
Step '2/5' '备份数据库'
# ============================================================
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$db = Join-Path $Root 'storage\recruitment.db'
if (Test-Path $db) {
  $bak = Join-Path $Root "storage\recruitment.db.bak-$stamp"
  Copy-Item $db $bak -Force
  Ok "已备份：storage\recruitment.db.bak-$stamp"
} else {
  Warn '未发现数据库，按首次部署处理'
}

# 依赖是否变化（package.json 哈希）
$pkg = Join-Path $Root 'package.json'
$oldHash = ''
if (Test-Path $pkg) { $oldHash = (Get-FileHash $pkg -Algorithm MD5).Hash }
$newPkg = Join-Path $src 'package.json'
$newHash = ''
if (Test-Path $newPkg) { $newHash = (Get-FileHash $newPkg -Algorithm MD5).Hash }

# ============================================================
Step '3/5' '停止服务'
# ============================================================
& (Join-Path $PSScriptRoot 'stop.ps1')
Start-Sleep -Seconds 1

# ============================================================
Step '4/5' '覆盖文件（保留 storage / node_modules / .env）'
# ============================================================
$rcArgs = @(
  $src, $Root, '/E',
  '/XD', 'storage', 'node_modules', '.git',
  '/XF', '.env', '*.db', '*.db-journal', '*.bak-*',
  '/NFL', '/NDL', '/NJH', '/NJS', '/R:2', '/W:2'
)
& robocopy @rcArgs | Out-Null
$rc = $LASTEXITCODE
if ($rc -ge 8) { Fail "文件覆盖失败（robocopy 退出码 $rc）" }
Ok '文件已覆盖'

if ($oldHash -and $newHash -and $oldHash -ne $newHash) {
  Warn 'package.json 有变化，正在重新安装依赖...'
  $npm = Get-Command npm -ErrorAction SilentlyContinue
  if ($npm) {
    & npm install --omit=dev --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { Fail 'npm install 失败，请查看上方输出' }
    Ok '依赖已更新'
  } else {
    Warn '未找到 npm，跳过依赖安装'
  }
}

try { Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue } catch { }

# ============================================================
Step '5/5' '重启服务并自检'
# ============================================================
schtasks /Run /TN RecruitmentPlatform | Out-Null
Write-Host '  等待服务启动...' -ForegroundColor DarkGray
$healthy = $false
for ($i = 0; $i -lt 20; $i++) {
  Start-Sleep -Seconds 2
  try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 5
    if ($r.StatusCode -eq 200) { $healthy = $true; break }
  } catch { }
}
if ($healthy) { Ok "服务已启动，健康检查通过（端口 $Port）" } else { Warn "服务未在 40 秒内就绪，请查看日志：storage\server.log" }

Write-Host ''
Write-Host '================ 更新完成 ================' -ForegroundColor Green
Write-Host "访问地址： http://<服务器公网IP>:$Port" -ForegroundColor White
Write-Host '若只改了前端（web 目录），浏览器按 Ctrl+F5 强制刷新即可看到最新界面。' -ForegroundColor DarkGray
Write-Host "出错回滚：把 storage\recruitment.db.bak-$stamp 改回 recruitment.db 后重启。" -ForegroundColor DarkGray
