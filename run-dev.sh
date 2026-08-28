#!/bin/bash
# Wrapper que inicia o supervisor em sessão isolada
cd /home/z/my-project
setsid bash /home/z/my-project/start-dev.sh < /dev/null > /dev/null 2>&1 &
disown
echo "Supervisor started (PID $!)"
