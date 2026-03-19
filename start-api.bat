@echo off
setlocal

set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] node was not found. Please install Node.js and add it to PATH.
  pause
  exit /b 1
)

echo [INFO] Starting local API on http://127.0.0.1:8787 ...
call npm.cmd run api
exit /b %ERRORLEVEL%
