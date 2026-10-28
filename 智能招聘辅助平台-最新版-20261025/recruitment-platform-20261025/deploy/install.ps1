# ============================================================
#  智能招聘辅助平台 - 一键部署脚本（Windows Server）
#  用法（管理员 PowerShell）：
#    cd 项目目录
#    powershell -NoProfile -ExecutionPolicy Bypass -File deploy\install.ps1
#  可选参数：
#    -Port 8080        监听端口
#    -SeedParse 10     初始化时用大模型解析的简历份数（0 = 不解析，最省时间）
#    -SkipSeed         跳过数据初始化（已初始化过时使用）
#    -SkipInstall      跳过 npm install
# ============================================================
param(
  [int]$Port = 8080,
  [int]$SeedParse = 10,
  [switch]$SkipSeed,
  [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'

# ---------- 权限检查 ----------
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host "需要管理员权限，正在尝试提升..." -ForegroundColor Yellow
  Start-Process powershell.exe -Verb RunAs -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"", '-Port', $Port, '-SeedParse', $SeedParse)
  exit
}

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Step($n, $msg) { Write-Host ""; Write-Host "==== $n  $msg ====" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "  [OK]  $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "  [!]   $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "  [X]   $msg" -ForegroundColor Red; exit 1 }

Write-Host "智能招聘辅助平台 · 部署脚本" -ForegroundColor White
Write-Host "项目目录：$Root"

# ============================================================
Step '1/6' '检查 Node.js 运行环境（需要 22.5 以上）'
# ============================================================
function Get-NodeVer($exe) {
  try {
    $v = & $exe -v 2>$null
    if (-not $v) { return $null }
    $p = $v.TrimStart('v').Split('.')
    return [pscustomobject]@{ Text = $v; Major = [int]$p[0]; Minor = [int]$p[1] }
  } catch { return $null }
}

$nodeExe = $null
$found = Get-Command node -ErrorAction SilentlyContinue
if ($found) { $nodeExe = $found.Source }
if (-not $nodeExe -and (Test-Path 'C:\nodejs\node.exe')) { $nodeExe = 'C:\nodejs\node.exe' }

$ver = $null
if ($nodeExe) { $ver = Get-NodeVer $nodeExe }
$needInstall = $true
if ($ver) {
  if ($ver.Major -gt 22 -or ($ver.Major -eq 22 -and $ver.Minor -ge 5)) {
    $needInstall = $false
    Ok "已安装 Node $($ver.Text)（$nodeExe）"
  } else {
    Warn "当前 Node $($ver.Text) 版本过低（node:sqlite 需要 22.5+），将安装 22.x"
  }
} else {
  Warn '未检测到 Node.js，将自动下载安装'
}

if ($needInstall) {
  $target = 'C:\nodejs'
  $dl = Join-Path $env:TEMP 'node-win-x64.zip'
  $urls = @(
    'https://registry.npmmirror.com/-/binary/node/v22.22.2/node-v22.22.2-win-x64.zip',
    'https://nodejs.org/dist/v22.22.2/node-v22.22.2-win-x64.zip'
  )
  $downloaded = $false
  foreach ($u in $urls) {
    try {
      Write-Host "  下载 $u" -ForegroundColor DarkGray
      Invoke-WebRequest -Uri $u -OutFile $dl -UseBasicParsing -TimeoutSec 300
      if ((Get-Item $dl).Length -gt 10MB) { $downloaded = $true; break }
    } catch {
      Warn "该地址不可用：$($_.Exception.Message)"
    }
  }
  if (-not $downloaded) { Fail 'Node.js 下载失败，请手工安装 Node 22 LTS 后重跑本脚本（https://nodejs.org/zh-cn/download）' }

  $tmp = Join-Path $env:TEMP 'node-unzip'
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  Expand-Archive -Path $dl -DestinationPath $tmp -Force
  $inner = Get-ChildItem $tmp -Directory | Select-Object -First 1
  if (Test-Path $target) { Remove-Item $target -Recurse -Force }
  Move-Item $inner.FullName $target
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item $dl -Force -ErrorAction SilentlyContinue

  $oldPath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  if ($oldPath -notlike '*C:\nodejs*') {
    [Environment]::SetEnvironmentVariable('Path', $oldPath.TrimEnd(';') + ';C:\nodejs', 'Machine')
  }
  $env:Path = 'C:\nodejs;' + $env:Path
  $nodeExe = 'C:\nodejs\node.exe'
  $ver = Get-NodeVer $nodeExe
  if (-not $ver) { Fail 'Node 安装后仍无法运行，请检查 C:\nodejs\node.exe' }
  Ok "Node $($ver.Text) 已安装到 C:\nodejs，并已加入系统 PATH"
}

$npmCmd = Join-Path (Split-Path -Parent $nodeExe) 'npm.cmd'
if (-not (Test-Path $npmCmd)) {
  $npmFound = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($npmFound) { $npmCmd = $npmFound.Source } else { Fail '未找到 npm，请确认 Node 安装完整' }
}

# ============================================================
Step '2/6' '安装项目依赖'
# ============================================================
if ($SkipInstall) {
  Warn '已跳过（-SkipInstall）'
} else {
  if (-not (Test-Path (Join-Path $Root 'package.json'))) { Fail '当前目录不是项目根目录，请把项目解压后进入目录再运行' }
  & $npmCmd config set registry https://registry.npmmirror.com | Out-Null
  Write-Host '  npm install（使用国内镜像，约 1-3 分钟）' -ForegroundColor DarkGray
  & $npmCmd install --no-audit --no-fund --registry=https://registry.npmmirror.com
  if ($LASTEXITCODE -ne 0) { Fail "npm install 失败（退出码 $LASTEXITCODE）" }
  Ok "依赖安装完成，共 $((Get-ChildItem (Join-Path $Root 'node_modules') -Directory | Measure-Object).Count) 个包"
}

# ============================================================
Step '3/6' '生成配置文件 .env'
# ============================================================
$envFile = Join-Path $Root '.env'
if (Test-Path $envFile) {
  $content = Get-Content $envFile -Raw
  if ($content -match '(?m)^PORT=') {
    $content = $content -replace '(?m)^PORT=.*', "PORT=$Port"
  } else {
    $content = "PORT=$Port`r`n" + $content
  }
  Set-Content -Path $envFile -Value $content -Encoding UTF8
  Ok ".env 已存在，监听端口更新为 $Port"
} else {
  $template = Join-Path $Root '.env.example'
  if (Test-Path $template) {
    $content = Get-Content $template -Raw
    $content = $content -replace '(?m)^PORT=.*', "PORT=$Port"
    Set-Content -Path $envFile -Value $content -Encoding UTF8
  } else {
    Set-Content -Path $envFile -Value "PORT=$Port`r`nLLM_BASE_URL=https://api.deepseek.com`r`nLLM_MODEL=deepseek-flash`r`n" -Encoding UTF8
    Warn '未找到 .env.example，已生成最简配置，请手工补 LLM_API_KEY'
  }
  Ok ".env 已生成（PORT=$Port）"
}

# ============================================================
Step '4/6' '初始化数据（导入岗位与简历）'
# ============================================================
$dbFile = Join-Path $Root 'storage\recruitment.db'
if ($SkipSeed) {
  Warn '已跳过（-SkipSeed）'
} elseif (Test-Path $dbFile) {
  Warn '检测到已有数据库，跳过初始化（需重建请删除 storage\recruitment.db 后重跑）'
} else {
  $env:SEED_PARSE = "$SeedParse"
  Write-Host "  导入 3 个岗位 + 30 份简历，并用大模型解析前 $SeedParse 份（约 1-3 分钟）" -ForegroundColor DarkGray
  & $nodeExe --experimental-sqlite --env-file-if-exists=.env server/seed.mjs
  if ($LASTEXITCODE -ne 0) { Fail "数据初始化失败（退出码 $LASTEXITCODE）" }
  Ok '数据初始化完成'
}

# ============================================================
Step '5/6' '放通 Windows 防火墙端口'
# ============================================================
$ruleName = "RecruitmentPlatform-$Port"
$fwOk = $false
try {
  # 防火墙依赖 BFE/MpsSvc，被第三方面板停掉时会报 1753（终结点映射器中没有更多的终结点可用）
  foreach ($svc in @('BFE', 'MpsSvc')) {
    $s = Get-Service -Name $svc -ErrorAction SilentlyContinue
    if ($s -and $s.StartType -eq 'Disabled') { try { Set-Service -Name $svc -StartupType Automatic -ErrorAction Stop } catch { } }
    if ($s -and $s.Status -ne 'Running') { try { Start-Service -Name $svc -ErrorAction Stop } catch { } }
    if ($s) { Start-Sleep -Milliseconds 500 }
  }
  Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule -ErrorAction SilentlyContinue
  New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Any | Out-Null
  $fwOk = $true
} catch {
  Warn "New-NetFirewallRule 失败：$($_.Exception.Message)"
  try {
    netsh advfirewall firewall delete rule name="$ruleName" | Out-Null
    netsh advfirewall firewall add rule name="$ruleName" dir=in action=allow protocol=TCP localport=$Port profile=any | Out-Null
    if ($LASTEXITCODE -eq 0) { $fwOk = $true }
  } catch { Warn "netsh 放通同样失败" }
}
if ($fwOk) {
  Ok "Windows 防火墙已放通 TCP $Port"
} else {
  Warn "未能写入 Windows 防火墙规则（不阻塞部署；若外网访问不到再手工放通）"
}
Warn "还需在【腾讯云控制台 → 服务器 → 防火墙】添加规则：TCP $Port"

# ============================================================
Step '6/6' '注册开机自启并启动服务'
# ============================================================
$taskName = 'RecruitmentPlatform'
$serve = Join-Path $Root 'deploy\serve.ps1'
$action = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$serve`""
schtasks /Create /TN $taskName /TR $action /SC ONSTART /RU SYSTEM /RL HIGHEST /F | Out-Null
if ($LASTEXITCODE -ne 0) { Fail '注册计划任务失败' }
Ok "计划任务「$taskName」已创建（开机自启 + 崩溃自动重启）"

# 先停掉可能已在运行的实例
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like '*server/index.mjs*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

schtasks /Run /TN $taskName | Out-Null

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

# ============================================================
Write-Host ""
Write-Host "================ 部署完成 ================" -ForegroundColor Green
$pubIp = ''
try { $pubIp = (Invoke-RestMethod -Uri 'https://api.ipify.org' -TimeoutSec 8) } catch { }
if ($pubIp) {
  Write-Host "访问地址： http://$pubIp`:$Port" -ForegroundColor White
} else {
  Write-Host "访问地址： http://<服务器公网IP>:$Port" -ForegroundColor White
}
Write-Host ""
Write-Host "演示账号（密码统一 Xinghe@2026）："
Write-Host "  张工     zhanggong@xinghe.com   平台管理员"
Write-Host "  周姐     zhoujie@xinghe.com     招聘经理"
Write-Host "  李婷     liting@xinghe.com      招聘专员"
Write-Host "  王总监   wangzj@xinghe.com      用人部门经理"
Write-Host ""
Write-Host "常用命令："
Write-Host "  查看日志   Get-Content storage\server.log -Tail 30 -Wait"
Write-Host "  停止服务   powershell -ExecutionPolicy Bypass -File deploy\stop.ps1"
Write-Host "  启动服务   schtasks /Run /TN RecruitmentPlatform"
Write-Host "  重启服务   powershell -ExecutionPolicy Bypass -File deploy\stop.ps1; schtasks /Run /TN RecruitmentPlatform"
Write-Host ""
Write-Host "别忘了：腾讯云控制台防火墙要放通 TCP $Port，否则外网访问不到。" -ForegroundColor Yellow
