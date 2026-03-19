@echo off
setlocal

set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm.cmd was not found. Please install Node.js and add it to PATH.
  pause
  exit /b 1
)

echo [INFO] Starting web app on http://127.0.0.1:4177 ...
call npm.cmd run dev -- --host 127.0.0.1 --port 4177 --strictPort
exit /b %ERRORLEVEL%
