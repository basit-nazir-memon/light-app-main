@echo off
title Yova Auto
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup\scripts\open-app.ps1"
exit /b 0
