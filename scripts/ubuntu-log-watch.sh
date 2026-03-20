#!/usr/bin/env bash
set -euo pipefail

PM2_APP_NAME="${PM2_APP_NAME:-yijing-demo-api}"
LOG_LINES="${LOG_LINES:-80}"

echo "== nginx status =="
systemctl is-active nginx || true

echo
echo "== nginx error log =="
sudo tail -n "$LOG_LINES" /var/log/nginx/error.log || true

echo
echo "== nginx access log =="
sudo tail -n "$LOG_LINES" /var/log/nginx/access.log || true

echo
echo "== pm2 status =="
pm2 status || true

echo
echo "== pm2 app logs (${PM2_APP_NAME}) =="
pm2 logs "$PM2_APP_NAME" --lines "$LOG_LINES" --nostream || true
