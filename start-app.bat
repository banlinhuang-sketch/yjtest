@echo off
setlocal

set "APP_DIR=%~dp0"

if /I "%~1"=="--check" goto check

cd /d "%APP_DIR%"

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm.cmd was not found. Please install Node.js and add it to PATH.
  echo [INFO] You can also run these commands manually:
  echo        cd /d "%APP_DIR%"
  echo        npm.cmd run dev:all
  pause
  exit /b 1
)

echo [INFO] Starting app and local API...
echo [INFO] Project directory: %APP_DIR%
echo.

call npm.cmd run dev:all
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo [ERROR] Startup failed with exit code %EXIT_CODE%.
  pause
)

exit /b %EXIT_CODE%

:check
cd /d "%APP_DIR%"
echo [CHECK] Project directory: %APP_DIR%

where node >nul 2>nul
if errorlevel 1 (
  echo [FAIL] node was not found.
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [FAIL] npm.cmd was not found.
  exit /b 1
)

if not exist "%APP_DIR%package.json" (
  echo [FAIL] package.json was not found.
  exit /b 1
)

if not exist "%APP_DIR%scripts\dev-all.mjs" (
  echo [FAIL] scripts\dev-all.mjs was not found.
  exit /b 1
)

echo [OK] Startup environment check passed.
exit /b 0
