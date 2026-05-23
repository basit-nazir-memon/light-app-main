@echo off
title Yova Auto - Service Status
echo.
echo === Scheduled tasks ===
schtasks /Query /TN "Yova Auto API" /FO LIST 2>nul || echo   Yova Auto API : not registered
echo.
schtasks /Query /TN "Yova Auto Web" /FO LIST 2>nul || echo   Yova Auto Web : not registered
echo.
echo === Listening ports ===
netstat -ano | findstr ":3001 " | findstr LISTENING && echo   API (3001): running || echo   API (3001): stopped
netstat -ano | findstr ":8081 " | findstr LISTENING && echo   Web (8081): running || echo   Web (8081): stopped
echo.
echo App URL: http://127.0.0.1:8081
echo.
pause
