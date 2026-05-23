@echo off
title Yova Auto - Repair packages
cd /d "%~dp0"
echo Installing npm packages and building the app if needed...
echo This may take several minutes. See setup\logs\npm-install.log
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup\scripts\ensure-dependencies.ps1"
if errorlevel 1 (
  echo.
  echo Repair failed. See setup\logs\npm-install.log
  pause
  exit /b 1
)
echo.
echo Repair complete. Run YovaAuto-Open.bat to start the app.
pause
exit /b 0
