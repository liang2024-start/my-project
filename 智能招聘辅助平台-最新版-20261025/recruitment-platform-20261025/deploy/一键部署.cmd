@echo off
setlocal
cd /d "%~dp0.."
echo ==========================================================
echo   Recruitment Platform - one click installer
echo   (Node 22 + dependencies + data + firewall + autostart)
echo ==========================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*
echo.
echo If a UAC prompt appeared, confirm it and wait for the new window.
pause
