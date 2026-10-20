#!/bin/bash
set -e
cd /home/piyush/medical
npm install --no-audit --no-fund 2>&1 | tail -2
echo "--- syntax checks ---"
for f in server/*.js server/*/*.js; do
  node --check "$f" || { echo "SYNTAX FAIL: $f"; exit 1; }
done
echo "all syntax OK"
echo "--- import smoke test ---"
node -e "import('./server/network.js').then(m => { const app = m.buildNetwork(); console.log('network built:', app.ORGANIZATIONS.length, 'orgs'); })"
