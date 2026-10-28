# 停止服务（同时停止守护进程，避免被自动拉起）
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Start-Process powershell.exe -Verb RunAs -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"")
  exit
}

$taskName = 'RecruitmentPlatform'
schtasks /End /TN $taskName 2>$null | Out-Null

# 停掉守护脚本（powershell 运行 serve.ps1）
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like '*deploy\serve.ps1*' -or $_.CommandLine -like '*deploy/serve.ps1*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Start-Sleep -Seconds 1

# 停掉 node 服务进程
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like '*server/index.mjs*' -or $_.CommandLine -like '*server\index.mjs*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Start-Sleep -Seconds 1

$envFile = Join-Path (Split-Path -Parent $PSScriptRoot) '.env'
$port = 8080
if (Test-Path $envFile) {
  $m = Select-String -Path $envFile -Pattern '^PORT=(\d+)' | Select-Object -First 1
  if ($m) { $port = [int]$m.Matches[0].Groups[1].Value }
}
$listen = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($listen) {
  Write-Host "服务仍在监听 $port，请检查进程" -ForegroundColor Yellow
} else {
  Write-Host "服务已停止（端口 $port 已释放）" -ForegroundColor Green
}
