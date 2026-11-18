// End-to-end check against a locally running Worker (npm run dev) and the
// preview site served on :8765. Nothing here touches a deployed service.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const API = process.env.API || 'http://localhost:8787/api/waitlist';
const SITE = process.env.SITE || 'http://localhost:8765';
const results = [];
const ok = (name, cond, extra = '') => { results.push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };
const rows = (sql) => JSON.parse(execFileSync('npx', ['wrangler', 'd1', 'execute', 'qhantom-waitlist', '--local', '--json', '--command', sql], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))[0].results;
const post = (body, headers = {}, ip = '203.0.113.10') => fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: SITE, 'CF-Connecting-IP': ip, ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });

rows('DELETE FROM waitlist'); rows('DELETE FROM waitlist_rate');

// --- API
let r = await fetch(API + '/health'); ok('health responds', r.status === 200);
r = await post({ email: '  First@Example.com ', consent: true }); let j = await r.json();
ok('valid signup accepted', r.status === 200 && j.ok === true);
ok('CORS header for allowed origin', r.headers.get('access-control-allow-origin') === SITE);
let db = rows('SELECT email, source, consent_text_version, created_at FROM waitlist');
ok('row stored, trimmed and lower-cased', db.length === 1 && db[0].email === 'first@example.com', JSON.stringify(db));
ok('consent version and timestamp stored', !!db[0]?.consent_text_version && /^\d{4}-\d\d-\d\dT/.test(db[0]?.created_at || ''));
r = await post({ email: 'FIRST@example.com', consent: true }); j = await r.json();
ok('duplicate returns the same success', r.status === 200 && j.ok === true);
ok('duplicate adds no row', rows('SELECT COUNT(*) AS n FROM waitlist')[0].n === 1);
r = await post({ email: 'nope@', consent: true }); ok('bad email rejected', r.status === 400 && (await r.json()).error === 'invalid_email');
r = await post({ email: 'a@example.com' }); ok('missing consent rejected', r.status === 400 && (await r.json()).error === 'consent_required');
r = await post({ email: 'a@example.com', consent: 'yes' }); ok('non-boolean consent rejected', r.status === 400);
r = await post({ email: 'bot@example.com', consent: true, website: 'http://spam' }); ok('honeypot answered ok', r.status === 200);
ok('honeypot stored nothing', rows("SELECT COUNT(*) AS n FROM waitlist WHERE email='bot@example.com'")[0].n === 0);
r = await post('{not json'); ok('malformed JSON rejected', r.status === 400);
r = await post({ email: 'a@example.com', consent: true }, { 'Content-Type': 'text/plain' }); ok('non-JSON content type rejected', r.status === 415);
r = await post({ email: 'x'.repeat(3000) + '@example.com', consent: true }); ok('oversized body rejected', r.status === 413);
r = await post({ email: 'evil@example.com', consent: true }, { Origin: 'https://evil.example' }); ok('unknown origin refused', r.status === 403);
ok('unknown origin stored nothing', rows("SELECT COUNT(*) AS n FROM waitlist WHERE email='evil@example.com'")[0].n === 0);
r = await fetch(API); ok('GET not allowed', r.status === 405);
r = await fetch(API, { method: 'OPTIONS', headers: { Origin: SITE, 'Access-Control-Request-Method': 'POST' } }); ok('preflight answered', r.status === 204 && r.headers.get('access-control-allow-origin') === SITE);
r = await post({ email: "o'brien+tag@example.co.uk\"; DROP TABLE waitlist;--", consent: true }); ok('injection-shaped input rejected as invalid', r.status === 400);
ok('table intact', rows('SELECT COUNT(*) AS n FROM waitlist')[0].n === 1);
// rate limit: a fresh caller gets 5 an hour
let codes = []; for (let i = 0; i < 7; i++) codes.push((await post({ email: `rl${i}@example.com`, consent: true }, {}, '198.51.100.7')).status);
ok('rate limit: first 5 pass, then 429', codes.join(',') === '200,200,200,200,200,429,429', codes.join(','));
ok('rate limit stored only the allowed 5', rows("SELECT COUNT(*) AS n FROM waitlist WHERE email LIKE 'rl%'")[0].n === 5);
ok('no raw IP stored', !JSON.stringify(rows('SELECT * FROM waitlist_rate')).includes('198.51.100.7'));

// --- Browser: the real form, posting to the local service
rows('DELETE FROM waitlist_rate');
const { chromium, devices } = require('playwright');
const browser = await chromium.launch();
for (const [tag, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['phone', devices['iPhone 13']]]) {
  const ctx = await browser.newContext(opts); const page = await ctx.newPage();
  await page.goto(SITE + '/index.html#waitlist'); await page.waitForTimeout(500);
  // default state is still the mock
  await page.fill('#wl-email', 'mock@example.com'); await page.check('#wl-consent'); await page.click('#wl-submit');
  ok(`${tag} form is a mock with no endpoint`, (await page.textContent('#wl-msg')).includes('nothing was sent or stored') && await page.isVisible('#wl-mock'));
  ok(`${tag} mock stored nothing`, rows("SELECT COUNT(*) AS n FROM waitlist WHERE email='mock@example.com'")[0].n === 0);
  // point the form at the local service
  await page.evaluate((api) => { document.getElementById('waitlist-form').dataset.endpoint = api; }, API);
  await page.fill('#wl-email', `Browser-${tag}@Example.com`); await page.check('#wl-consent'); await page.click('#wl-submit');
  await page.waitForFunction(() => /on the list|couldn|Too many/.test(document.getElementById('wl-msg').textContent));
  ok(`${tag} live form shows success`, (await page.textContent('#wl-msg')).includes('on the list'), await page.textContent('#wl-msg'));
  ok(`${tag} mock labels hidden when live`, !(await page.isVisible('#wl-mock')) && !(await page.isVisible('#wl-preview-tag')));
  ok(`${tag} signup is in the database`, rows(`SELECT COUNT(*) AS n FROM waitlist WHERE email='browser-${tag}@example.com'`)[0].n === 1);
  ok(`${tag} form cleared after success`, (await page.inputValue('#wl-email')) === '');
  await page.fill('#wl-email', `browser-${tag}@example.com`); await page.check('#wl-consent'); await page.click('#wl-submit');
  await page.waitForFunction(() => /on the list|couldn|Too many/.test(document.getElementById('wl-msg').textContent));
  ok(`${tag} repeat signup shows success, still one row`, (await page.textContent('#wl-msg')).includes('on the list') && rows(`SELECT COUNT(*) AS n FROM waitlist WHERE email='browser-${tag}@example.com'`)[0].n === 1);
  await page.fill('#wl-email', 'bad@'); await page.click('#wl-submit');
  ok(`${tag} bad email stopped in the form`, (await page.textContent('#wl-msg')).includes('Enter a full email'));
  // service unreachable
  await page.evaluate(() => { document.getElementById('waitlist-form').dataset.endpoint = 'http://localhost:9/api/waitlist'; });
  await page.fill('#wl-email', 'down@example.com'); await page.check('#wl-consent'); await page.click('#wl-submit');
  await page.waitForFunction(() => /couldn/.test(document.getElementById('wl-msg').textContent));
  ok(`${tag} outage shows an error, not a false success`, (await page.textContent('#wl-msg')).includes('couldn’t reach'));
  await ctx.close();
}
await browser.close();
rows('DELETE FROM waitlist'); rows('DELETE FROM waitlist_rate');
console.log(results.join('\n')); console.log(`\n${results.filter((x) => x.startsWith('PASS')).length} passed, ${results.filter((x) => x.startsWith('FAIL')).length} failed`);
process.exit(results.some((x) => x.startsWith('FAIL')) ? 1 : 0);
