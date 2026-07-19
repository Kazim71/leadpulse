// Run AFTER applying supabase/migrations/0004_contact_inquiries.sql.
// Verifies: (1) a real browser submission through /contact lands a real row,
// (2) RLS actually allows anon INSERT and blocks anon SELECT — checked with
// a genuine anon-key query attempt, not assumed from reading the policy.
// Run: node test/verify-contact-form.mjs   (server must be running)

import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { createClient as mk } from '@supabase/supabase-js';
import ws from 'ws';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

const feEnv = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z_0-9]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);
const beEnv = Object.fromEntries(
  readFileSync('../backend/.env', 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z_0-9]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);

const URL = feEnv.NEXT_PUBLIC_SUPABASE_URL;
const ANON = feEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SRK = beEnv.SUPABASE_SERVICE_ROLE_KEY;

const admin = mk(URL, SRK, { auth: { persistSession: false }, realtime: { transport: ws } });
const anon = mk(URL, ANON, { auth: { persistSession: false }, realtime: { transport: ws } });

const checks = [];
const record = (name, pass, detail) => {
  checks.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${name}${detail ? ': ' + detail : ''}`);
};

function findChrome() {
  for (const c of [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ]) {
    if (existsSync(c)) return c;
  }
  throw new Error('No Chrome/Edge found');
}

const stamp = Date.now();
const TEST_EMAIL = `contact-test-${stamp}@example.com`;
const TEST_NAME = 'Verification Script';
const TEST_MESSAGE = `Automated verification run at ${new Date().toISOString()}`;

async function main() {
  // ---- 0. table exists? ------------------------------------------------
  const { error: tableErr } = await admin.from('contact_inquiries').select('id').limit(1);
  if (tableErr) {
    console.error('\nBLOCKED: contact_inquiries is not reachable — is migration 0004 applied?');
    console.error(`  ${tableErr.message}`);
    process.exit(1);
  }
  record('migration 0004 applied (contact_inquiries reachable)', true);

  // ---- 1. real browser submission through /contact ----------------------
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    userDataDir: mkdtempSync(join(tmpdir(), 'lp-contact-')),
    args: ['--no-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${BASE}/contact`, { waitUntil: 'networkidle2' });

    await page.type('input[type=text]', TEST_NAME);
    await page.type('input[type=email]', TEST_EMAIL);
    await page.type('textarea', TEST_MESSAGE);
    await page.click('button[type=submit]');

    await page.waitForFunction(() => document.body.innerText.includes('Message received'), {
      timeout: 10000,
    });
    const successVisible = await page.evaluate(() => document.body.innerText.includes('Message received'));
    record('Form shows a success state after submission', successVisible, '');

    await browser.close();
  } catch (err) {
    console.error('Browser submission failed:', err.message);
    checks.push({ name: 'browser submission', pass: false });
    await browser.close().catch(() => {});
  }

  // ---- 2. the row actually landed, with the right content --------------
  await new Promise((r) => setTimeout(r, 800));
  const { data: rows } = await admin
    .from('contact_inquiries')
    .select('id, name, email, message, created_at')
    .eq('email', TEST_EMAIL);

  const row = (rows ?? [])[0];
  record(
    'Submitted row exists in Supabase with correct content',
    Boolean(row) && row.name === TEST_NAME && row.message === TEST_MESSAGE,
    row ? JSON.stringify(row) : 'no row found',
  );

  // ---- 3. RLS: anon INSERT allowed, verified directly (not via the form) ---
  const directInsertEmail = `direct-insert-${stamp}@example.com`;
  const { error: anonInsertError } = await anon
    .from('contact_inquiries')
    .insert({ name: 'Direct RLS check', email: directInsertEmail, message: 'anon insert probe' });
  record('Anon key CAN insert directly (RLS allows it)', !anonInsertError, anonInsertError?.message ?? '');

  // ---- 4. RLS: anon SELECT blocked --------------------------------------
  const { data: anonReadRows, error: anonReadError } = await anon
    .from('contact_inquiries')
    .select('id')
    .eq('email', TEST_EMAIL);
  // PostgREST under RLS-with-no-matching-policy returns an EMPTY result, not
  // an error — the point is that a real submitted row is invisible to anon,
  // not that the query itself throws.
  record(
    'Anon key CANNOT read rows (RLS blocks SELECT — returns empty, not the real row)',
    !anonReadError && (anonReadRows ?? []).length === 0,
    JSON.stringify({ error: anonReadError?.message, rows: anonReadRows }),
  );

  // ---- 5. platform admin CAN read (sanity check the other direction) ---
  const superAuth = mk(URL, ANON, { auth: { persistSession: false }, realtime: { transport: ws } });
  const { error: loginError } = await superAuth.auth.signInWithPassword({
    email: 'super@leadcapsule.dev',
    password: '3Gjgrl9yez8atOyij2DVng',
  });
  if (!loginError) {
    const { data: superRows } = await superAuth
      .from('contact_inquiries')
      .select('id')
      .eq('email', TEST_EMAIL);
    record(
      'Platform admin CAN read the submitted row (is_platform_admin() policy works)',
      (superRows ?? []).length === 1,
      `${(superRows ?? []).length} rows`,
    );
  } else {
    record('Platform admin login for read-check', false, loginError.message);
  }

  // ---- cleanup -----------------------------------------------------------
  await admin.from('contact_inquiries').delete().eq('email', TEST_EMAIL);
  await admin.from('contact_inquiries').delete().eq('email', directInsertEmail);
  console.log('\ncleanup done — test rows removed.');

  const allPass = checks.every((c) => c.pass);
  console.log(`\n${allPass ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
  process.exitCode = allPass ? 0 : 1;
}

main();
