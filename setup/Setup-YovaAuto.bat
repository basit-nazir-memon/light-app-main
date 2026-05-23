@echo off
title Yova Auto - Setup
cd /d "%~dp0"

echo.
echo  Yova Auto - Windows Setup
echo  -------------------------
echo  Downloads Node.js, installs packages, builds the app,
echo  registers auto-start, and creates a desktop shortcut.
echo.
echo  Requirements: Windows 10/11, Internet, ~500 MB free disk
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-YovaAuto.ps1"
set EXITCODE=%ERRORLEVEL%

if %EXITCODE% neq 0 (
  echo.
  echo  Setup failed. See setup\logs\yova-auto.log
  pause
  exit /b %EXITCODE%
)

echo.
pause
exit /b 0
