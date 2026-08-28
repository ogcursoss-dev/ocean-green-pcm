#!/bin/bash
# Supervisor que mantém o dev server rodando com env correto
cd /home/z/my-project
unset DATABASE_URL DIRECT_URL
export $(grep -v '^#' .env | xargs)
LOG=/home/z/my-project/dev.log
while true; do
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting dev server..." >> $LOG
  node_modules/.bin/next dev -p 3000 >> $LOG 2>&1
  EXITCODE=$?
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Dev server exited (code $EXITCODE), restarting in 3s..." >> $LOG
  sleep 3
done
