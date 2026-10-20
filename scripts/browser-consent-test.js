// Interactive browser test: drives the Consent Management UI to create a
// consent grant and revoke one, then verifies the changes landed on the
// ledger by reading the backend API directly.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const APP = process.env.APP_URL || 'http://localhost:5173';
const API = process.env.API_URL || 'http://localhost:3001';
const CHROME = '/usr/bin/google-chrome';
const PORT = 9223;

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${PORT}`, '--user-data-dir=/tmp/cdp-profile2', 'about:blank',
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

const ws = new WebSocket(await cdpTarget());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let msgId = 0;
const pending = new Map();
const errors = [];

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    return;
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
  }
};

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++msgId;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});

const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.text + ' :: ' + (r.exceptionDetails.exception?.description || ''));
  }
  return r.result.value;
};

/** Run an expression, swallowing errors — used for optional UI probes. */
const tryEval = async (expression) => {
  try { return await evaluate(expression); } catch { return null; }
};

await send('Page.enable');
await send('Runtime.enable');

// Sign in as admin and land on the consent page.
await send('Page.navigate', { url: APP });
await sleep(2500);
await evaluate(`localStorage.setItem('mediledger_is_authenticated','true');
                localStorage.setItem('mediledger_user_id','user-admin-001');`);
await send('Page.navigate', { url: APP + '/consent' });
await sleep(2500);

const before = await (await fetch(`${API}/api/consents`)).json();
console.log(`consents before: ${before.length}`);

// ── CREATE ────────────────────────────────────────────────────────
await evaluate(`
  (() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Create Consent Grant'));
    btn.click();
  })();
`);
await sleep(1200);

// Step 0 — pick the first patient card in the modal.
const picked0 = await tryEval(`
  (() => {
    const modal = document.querySelector('[role="dialog"]') || document.body;
    const cards = [...modal.querySelectorAll('div')].filter(d =>
      d.style.cursor === 'pointer' && /PAT-\\d{4}/.test(d.textContent||''));
    if (cards.length) { cards[0].click(); return cards.length; }
    return 0;
  })();
`);
console.log(`patient cards found: ${picked0}`);
await sleep(400);
console.log('step0 next:', await tryEval(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Next')); if (b) { b.click(); return 'clicked'; } return 'NO NEXT BUTTON: ' + [...document.querySelectorAll('button')].map(x=>x.textContent.trim()).join('|'); })()`));
await sleep(600);

// Step 1 — pick the first provider, then a record.
await evaluate(`
  (() => {
    const modal = document.querySelector('[role="dialog"]') || document.body;
    const cards = [...modal.querySelectorAll('div')].filter(d =>
      d.style.cursor === 'pointer' && /PROV-\\d{3}/.test(d.textContent||''));
    if (cards.length) cards[0].click();
  })();
`);
await sleep(400);
await evaluate(`
  (() => {
    const sel = [...document.querySelectorAll('select')].find(s =>
      [...s.options].some(o => o.textContent.includes('REC-')));
    if (sel) { sel.selectedIndex = 1; sel.dispatchEvent(new Event('change', {bubbles:true})); }
  })();
`);
await sleep(400);
await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Next')); if (b) { b.click(); return 'clicked'; } return 'NO NEXT BUTTON: ' + [...document.querySelectorAll('button')].map(x=>x.textContent.trim()).join('|'); })()`);
await sleep(600);

// Step 2 — categories
await evaluate(`
  (() => {
    const modal = document.querySelector('[role="dialog"]') || document.body;
    const cards = [...modal.querySelectorAll('div')].filter(d =>
      d.style.cursor === 'pointer' && /Lab Reports|Imaging|Prescriptions/.test(d.textContent||''));
    if (cards.length) cards[0].click();
  })();
`);
await sleep(300);
await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Next')); if (b) { b.click(); return 'clicked'; } return 'NO NEXT BUTTON: ' + [...document.querySelectorAll('button')].map(x=>x.textContent.trim()).join('|'); })()`);
await sleep(600);

// Step 3 — permissions + purpose
await evaluate(`
  (() => {
    const modal = document.querySelector('[role="dialog"]') || document.body;
    const cards = [...modal.querySelectorAll('div')].filter(d =>
      d.style.cursor === 'pointer' && /^read$/.test((d.textContent||'').trim()));
    if (cards.length) cards[0].click();
  })();
`);
await sleep(300);
await evaluate(`
  (() => {
    const input = [...document.querySelectorAll('input[type="text"]')].find(i =>
      (i.placeholder||'').includes('specialist'));
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
      setter.call(input, 'treatment');
      input.dispatchEvent(new Event('input', {bubbles:true}));
    }
  })();
`);
await sleep(300);
await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Next')); if (b) { b.click(); return 'clicked'; } return 'NO NEXT BUTTON: ' + [...document.querySelectorAll('button')].map(x=>x.textContent.trim()).join('|'); })()`);
await sleep(800);

// Step 4 — submit
await evaluate(`
  (() => {
    const btn = [...document.querySelectorAll('button')].find(b =>
      b.textContent.includes('Create Consent Grant') && !b.textContent.includes('×'));
    btn.click();
  })();
`);
await sleep(3000);

const afterCreate = await (await fetch(`${API}/api/consents`)).json();
console.log(`consents after create: ${afterCreate.length}`);
const created = afterCreate.find(c => !before.some(b => b.consentId === c.consentId));
console.log(created
  ? `CREATED on ledger: ${created.consentId} patient=${created.patientId} grantee=${created.granteeId}`
  : 'CREATE FAILED');
if (!created) { console.log('BROWSER CONSENT TEST FAILED'); process.exit(1); }

// ── REVOKE ────────────────────────────────────────────────────────
await send('Page.navigate', { url: APP + '/consent' });
await sleep(2500);
await evaluate(`
  (() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Revoke');
    if (btn) btn.click();
  })();
`);
await sleep(900);
await evaluate(`
  (() => {
    const ta = document.querySelector('textarea');
    if (ta) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;
      setter.call(ta, 'Automated test revocation');
      ta.dispatchEvent(new Event('input', {bubbles:true}));
    }
  })();
`);
await sleep(400);
await evaluate(`
  (() => {
    const dialog = document.querySelector('[role="dialog"]');
    const scope = dialog || document;
    const btn = [...scope.querySelectorAll('button')].find(b => /Revoke/.test(b.textContent) && !/Cancel/i.test(b.textContent));
    if (btn) btn.click();
  })();
`);
await sleep(2500);

const afterRevoke = await (await fetch(`${API}/api/consents`)).json();
const revoked = afterRevoke.find(c => c.consentId === created.consentId);
console.log(`revoked flag: ${revoked?.revoked}  revokedAt: ${revoked?.revokedAt ? 'set' : 'missing'}`);

const ok = revoked?.revoked === true && errors.length === 0;
console.log(errors.length ? `runtime errors: ${errors.slice(0, 2).join(' ;; ')}` : 'no runtime errors');

ws.close();
chrome.kill();

console.log(ok ? '\nBROWSER CONSENT TEST PASSED' : '\nBROWSER CONSENT TEST FAILED');
process.exit(ok ? 0 : 1);


