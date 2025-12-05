#!/usr/bin/env bash
set -euo pipefail

# If /etc/cron.d/2fa exists, install it into crontab
if [ -f /etc/cron.d/2fa ]; then
  crontab /etc/cron.d/2fa || true
fi

# Ensure cron service started (run in background)
# On Debian-based images 'cron' binary is available
echo "Starting cron..."
cron || (echo "Cron failed to start" && false) &

# small wait to allow cron to start
sleep 1

# Confirm data folder exists
mkdir -p /data /cron
chmod 755 /data /cron

# Start the Node server in foreground (so Docker keeps container alive)
echo "Starting server..."
exec node server.js
