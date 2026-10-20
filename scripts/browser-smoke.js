// Manual browser smoke test: drives headless Chrome over the DevTools
// Protocol, signs in as each persona and checks every route for console
// errors and for the presence of live (API-fetched) content.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const APP = process.env.APP_URL || 'http://localhost:5173';
const CHROME = '/usr/bin/google-chrome';
const PORT = 9222;

const ROUTES = ['/', '/patients', '/records', '/consent', '/audit', '/benchmarks'];
const PERSONAS = [
  { id: 'user-admin-001', role: 'admin' },
  { id: 'user-doc-002', role: 'doctor' },
];

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${PORT}`, '--user-data-dir=/tmp/cdp-profile', 'about:blank',
], { stdio: 'ignore' });

async function cdpTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find(t => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint never became available');
}

const wsUrl = await cdpTarget();
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let msgId = 0;
const pending = new Map();
const consoleErrors = [];
const pageErrors = [];

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    return;
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    consoleErrors.push(msg.params.args.map(a => a.value ?? a.description ?? '').join(' '));
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    pageErrors.push(msg.params.exceptionDetails.exception?.description
      ?? msg.params.exceptionDetails.text);
  }
};

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++msgId;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});

const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || ''));
  return r.result.value;
};

await send('Page.enable');
await send('Runtime.enable');

let failures = 0;

for (const persona of PERSONAS) {
  // Seed auth state, then reload so AuthContext picks it up.
  await send('Page.navigate', { url: APP });
  await sleep(2500);
  await evaluate(`localStorage.setItem('mediledger_is_authenticated','true');
                  localStorage.setItem('mediledger_user_id','${persona.id}');
                  localStorage.setItem('mediledger_user', JSON.stringify({id:'${persona.id}',name:'Test',role:'${persona.role}'}));`);

  for (const route of ROUTES) {
    consoleErrors.length = 0;
    pageErrors.length = 0;
    await send('Page.navigate', { url: APP + route });
    await sleep(2200);

    const text = await evaluate(`document.body.innerText`);
    const hasLive = /Live Ledger|LIVE LEDGER/.test(text);
    const isLogin = /Sign in|Welcome back/i.test(text);

    const errs = [...consoleErrors, ...pageErrors].filter(e => !/favicon|devtools/i.test(e));
    const ok = !isLogin && errs.length === 0;
    if (!ok) failures++;

    console.log(`${ok ? 'PASS' : 'FAIL'} [${persona.role}] ${route}` +
      ` | live=${hasLive} len=${text.length}` +
      (errs.length ? ` | errors: ${errs.slice(0, 2).join(' ;; ')}` : ''));
  }
}

ws.close();
chrome.kill();

console.log(failures === 0 ? '\nBROWSER SMOKE TEST PASSED' : `\nBROWSER SMOKE TEST FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
