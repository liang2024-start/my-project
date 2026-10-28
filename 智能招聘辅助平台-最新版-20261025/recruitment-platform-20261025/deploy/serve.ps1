# 服务守护脚本：进程意外退出后 3 秒自动重启
# 由 Windows 计划任务「RecruitmentPlatform」在开机时调用，无需手工运行
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$logDir = Join-Path $Root 'storage'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
$log = Join-Path $logDir 'server.log'

$node = $null
$cmd = Get-Command node -ErrorAction SilentlyContinue
if ($cmd) {
  $node = $cmd.Source
} elseif (Test-Path 'C:\nodejs\node.exe') {
  $node = 'C:\nodejs\node.exe'
}
if (-not $node) {
  Add-Content -Path $log -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 未找到 node，请先运行 install.ps1"
  exit 1
}

while ($true) {
  Add-Content -Path $log -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ---- 启动服务 ----"
  & $node --experimental-sqlite --env-file-if-exists=.env server/index.mjs *>> $log
  Add-Content -Path $log -Value "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] 服务已退出（退出码 $LASTEXITCODE），3 秒后重启"
  Start-Sleep -Seconds 3
}
