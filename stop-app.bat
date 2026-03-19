@echo off
setlocal

echo [INFO] Stopping local web/API processes on ports 4177 and 8787...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ports = 4177,8787; foreach ($port in $ports) { $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue; if ($conn) { $pids = $conn | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($owningPid in $pids) { Stop-Process -Id $owningPid -Force -ErrorAction SilentlyContinue } } }; Write-Output '[OK] Stop command finished.'"

exit /b %ERRORLEVEL%
