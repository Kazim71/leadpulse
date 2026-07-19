// Drives test/local.html in a real, installed Chrome via CDP and checks
// results against the live Supabase database — not just the on-page log.
// This is my own verification harness (not a Phase 3 deliverable); it exists
// so the DONE WHEN checklist is answered by observation, not assertion.

import { spawn } from 'node:child_process';
import { readFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const backendDir = join(repoRoot, 'backend');

function readEnvFile(path) {
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const env = readEnvFile(join(backendDir, '.env'));
const PORT = env.PORT || '4000';
const API_BASE = `http://localhost:${PORT}`;
const SUPABASE_URL = env.SUPABASE_URL;
const SRK = env.SUPABASE_SERVICE_ROLE_KEY;
const ORG_ID = '11111111-1111-1111-1111-111111111111';

if (!SUPABASE_URL || !SRK) {
  console.error('FAIL: backend/.env is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

function restHeaders() {
  return { apikey: SRK, Authorization: `Bearer ${SRK}`, 'Content-Type': 'application/json' };
}

async function rest(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: restHeaders() });
  if (!res.ok) throw new Error(`REST ${path} -> ${res.status}: ${await res.text()}`);
  return res.json();
}

async function restDelete(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'DELETE',
    headers: restHeaders(),
  });
  if (!res.ok) throw new Error(`DELETE ${path} -> ${res.status}: ${await res.text()}`);
}

async function eventsFor(visitorId) {
  return rest(
    `events?organization_id=eq.${ORG_ID}&visitor_id=eq.${visitorId}&select=id,event_type,contact_id,metadata,url,created_at&order=created_at.asc`,
  );
}

function findChrome() {
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error('No installed Chrome/Edge found');
}

function waitForHealth(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) return resolve();
      } catch {
        /* not up yet */
      }
      if (Date.now() > deadline) return reject(new Error('backend did not become healthy in time'));
      setTimeout(tick, 300);
    };
    tick();
  });
}

async function main() {
  const results = { checks: [] };
  const record = (name, pass, detail) => {
    results.checks.push({ name, pass, detail });
    console.log(`${pass ? 'PASS' : 'FAIL'} — ${name}${detail ? ': ' + detail : ''}`);
  };

  console.log(`starting backend (npx tsx src/server.ts) on port ${PORT}...`);
  const backend = spawn('npx', ['tsx', 'src/server.ts'], {
    cwd: backendDir,
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let backendLog = '';
  backend.stdout.on('data', (d) => (backendLog += d.toString()));
  backend.stderr.on('data', (d) => (backendLog += d.toString()));

  const cleanup = async () => {
    backend.kill();
  };

  try {
    await waitForHealth(`${API_BASE}/health`, 15_000);
    console.log('backend healthy.');

    const chromePath = findChrome();
    const userDataDir = mkdtempSync(join(tmpdir(), 'lp-verify-'));
    const browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      userDataDir,
      args: ['--no-sandbox'],
    });

    const page = await browser.newPage();
    page.on('console', (msg) => console.log('  [page console]', msg.text()));

    // Collect every leadpulse:request outcome into a structured array on the
    // page itself, registered before local.html's own scripts execute.
    await page.evaluateOnNewDocument(() => {
      window.__lpEvents = [];
      window.addEventListener('leadpulse:request', (e) => {
        window.__lpEvents.push(e.detail);
      });
    });

    const fileUrl = 'file://' + join(here, 'local.html').replace(/\\/g, '/');
    console.log(`navigating to ${fileUrl} (file:// — no server involved)`);
    await page.goto(fileUrl, { waitUntil: 'load' });

    // --- Check: page_view auto-fires and reaches the server -----------
    await page.waitForFunction(
      () => window.__lpEvents.some((e) => e.endpoint === '/api/events'),
      { timeout: 5000 },
    );
    const afterLoad = await page.evaluate(() => window.__lpEvents.slice());
    const pageViewOutcome = afterLoad.find((e) => e.endpoint === '/api/events');
    record(
      'page_view auto-fires on load and hits the server',
      Boolean(pageViewOutcome && pageViewOutcome.ok && pageViewOutcome.status === 202),
      JSON.stringify(pageViewOutcome),
    );

    const visitorIdA = await page.evaluate(() => window.leadpulse.getVisitorId());
    const visitorIdOnPanel = await page.evaluate(
      () => document.getElementById('visitor-id').textContent,
    );
    record(
      'visitor_id printed on page load matches getVisitorId()',
      visitorIdA === visitorIdOnPanel && Boolean(visitorIdA),
      visitorIdA,
    );

    // --- Click the 4 buttons -------------------------------------------
    async function clickAndWaitFor(buttonId, endpoint, sinceCount) {
      await page.click(buttonId);
      await page.waitForFunction(
        (ep, n) => window.__lpEvents.filter((e) => e.endpoint === ep).length > n,
        { timeout: 5000 },
        endpoint,
        sinceCount,
      );
    }

    const eventsBeforeClicks = () =>
      page.evaluate(() => window.__lpEvents.filter((e) => e.endpoint === '/api/events').length);
    const identifyBeforeClicks = () =>
      page.evaluate(
        () => window.__lpEvents.filter((e) => e.endpoint === '/api/identify').length,
      );

    let n = await eventsBeforeClicks();
    await clickAndWaitFor('#btn-product', '/api/events', n);
    n = await eventsBeforeClicks();
    await clickAndWaitFor('#btn-search', '/api/events', n);
    n = await eventsBeforeClicks();
    await clickAndWaitFor('#btn-category', '/api/events', n);

    const m = await identifyBeforeClicks();
    await clickAndWaitFor('#btn-checkout', '/api/identify', m);

    const allOutcomes = await page.evaluate(() => window.__lpEvents.slice());
    const eventOutcomes = allOutcomes.filter((e) => e.endpoint === '/api/events');
    const identifyOutcomes = allOutcomes.filter((e) => e.endpoint === '/api/identify');

    record(
      '4 button clicks (product/search/category/checkout) all returned success codes',
      eventOutcomes.length === 4 &&
        eventOutcomes.every((e) => e.ok) &&
        identifyOutcomes.length === 1 &&
        identifyOutcomes[0].ok,
      JSON.stringify({ events: eventOutcomes.map((e) => e.status), identify: identifyOutcomes.map((e) => e.status) }),
    );

    // --- Verify against Supabase (not just the log panel) --------------
    // small delay for the insert to be visible via PostgREST
    await new Promise((r) => setTimeout(r, 800));
    const rowsAfterClicks = await eventsFor(visitorIdA);
    record(
      'Supabase events table has exactly 4 rows for this visitor (page_view + 3 tracked)',
      rowsAfterClicks.length === 4,
      `${rowsAfterClicks.length} rows: ${rowsAfterClicks.map((r) => r.event_type).join(', ')}`,
    );

    const backfilled = rowsAfterClicks.every((r) => r.contact_id !== null);
    record(
      'identify() backfilled contact_id onto all 4 prior anonymous events',
      backfilled,
      rowsAfterClicks.map((r) => r.contact_id).join(', '),
    );

    const sampleRow = rowsAfterClicks.find((r) => r.event_type === 'productDetail');

    // --- Persistence: reload, same visitor_id ---------------------------
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.leadpulse && window.leadpulse.getVisitorId()), {
      timeout: 5000,
    });
    const visitorIdB = await page.evaluate(() => window.leadpulse.getVisitorId());
    const panelAfterReload = await page.evaluate(
      () => document.getElementById('visitor-id').textContent,
    );
    record(
      'refreshing the page reuses the SAME visitor_id (persistence)',
      visitorIdA === visitorIdB && panelAfterReload === visitorIdB,
      `before=${visitorIdA} after=${visitorIdB} panel=${panelAfterReload}`,
    );

    // --- Debounce: rapid-click 5x -> only 1 row reaches the server ------
    const countsBefore = await eventsFor(visitorIdA);
    const productClickBefore = countsBefore.filter((r) => r.event_type === 'productClick').length;

    await page.click('#btn-rapid');
    // Give the (deliberately singular) network call time to land; there is
    // nothing to "wait for 5 of" since 4 are dropped client-side before fetch.
    await new Promise((r) => setTimeout(r, 1200));

    const countsAfter = await eventsFor(visitorIdA);
    const productClickAfter = countsAfter.filter((r) => r.event_type === 'productClick').length;
    const delta = productClickAfter - productClickBefore;

    record(
      'rapid-clicking 5x within 2s produces exactly 1 new row server-side (client debounce)',
      delta === 1,
      `before=${productClickBefore} after=${productClickAfter} delta=${delta}`,
    );

    // --- Summary for the human -----------------------------------------
    console.log('\n--- Supabase sample row (productDetail) ---');
    console.log(JSON.stringify(sampleRow, null, 2));
    console.log(`\ntotal rows for this test's visitor_id (${visitorIdA}): ${countsAfter.length}`);

    // --- Cleanup: remove everything this run created --------------------
    await restDelete(`events?organization_id=eq.${ORG_ID}&visitor_id=eq.${visitorIdA}`);
    await restDelete(`visitor_identity_map?organization_id=eq.${ORG_ID}&visitor_id=eq.${visitorIdA}`);
    const contactId = rowsAfterClicks[0]?.contact_id;
    if (contactId) {
      await restDelete(`contacts?id=eq.${contactId}`);
    }
    console.log('cleanup done — test data removed from Supabase.');

    await browser.close();

    const allPass = results.checks.every((c) => c.pass);
    console.log(`\n${allPass ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
    process.exitCode = allPass ? 0 : 1;
  } catch (err) {
    console.error('\nVERIFY SCRIPT THREW:', err);
    console.error('\n--- backend log ---\n' + backendLog);
    process.exitCode = 1;
  } finally {
    await cleanup();
  }
}

main();
