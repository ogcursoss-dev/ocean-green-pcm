#!/bin/bash
# Supervisor que mantém o dev server rodando com env do Supabase
cd /home/z/my-project
while true; do
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting dev server with .env.deploy..." >> /home/z/my-project/dev.log
  bash /home/z/my-project/start-prod.sh >> /home/z/my-project/dev.log 2>&1
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Dev server exited, restarting in 3s..." >> /home/z/my-project/dev.log
  sleep 3
done
