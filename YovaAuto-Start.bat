@echo off
title Yova Auto - Starting
cd /d "C:\Users\basit\Downloads\light-app-main\light-app-main"
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\Users\basit\Downloads\light-app-main\light-app-main\setup\scripts\start-yova.ps1"
exit /b 0
