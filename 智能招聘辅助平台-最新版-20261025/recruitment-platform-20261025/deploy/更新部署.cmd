@echo off
setlocal
cd /d "%~dp0.."
if "%~1"=="" (
  echo ==========================================================
  echo   Recruitment Platform - update
  echo   Usage: drag the new zip onto this file, or run
  echo          update.cmd C:\recruitment-platform.zip
  echo ==========================================================
  echo.
  pause
  exit /b 1
)
echo Updating from %~1 ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update.ps1" -Zip "%~1"
echo.
pause
