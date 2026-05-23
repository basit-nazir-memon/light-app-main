@echo off
title Yova Auto - Starting
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0setup\scripts\start-yova.ps1"
exit /b 0
