// Drives the real dashboard in installed Chrome and verifies the
// provisioning flow end-to-end, then checks the database directly.
// Run: node test/verify-provision.mjs   (from frontend/, server must be running)

import { existsSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { createClient as mk } from '@supabase/supabase-js';
import ws from 'ws';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

const env = Object.fromEntries(
  readFileSync('../backend/.env', 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z_0-9]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);

const admin = mk(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});

const SUPER = { email: 'super@leadcapsule.dev', password: 'superadmin123' };
const ORG_ADMIN = { email: 'owner@acme-test.dev', password: 'test123' };

const stamp = Date.now();
const NEW_ORG_NAME = `Northwind Coffee ${stamp}`;
const NEW_ADMIN_EMAIL = `owner-${stamp}@northwind.example`;

const checks = [];
const record = (name, pass, detail) => {
  checks.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${name}${detail ? ': ' + detail : ''}`);
};

function findChrome() {
  for (const c of [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ]) {
    if (existsSync(c)) return c;
  }
  throw new Error('No Chrome/Edge found');
}

/**
 * Each user gets its OWN incognito browser context. Clearing cookies on a
 * shared page left @supabase/ssr in a half-signed-out state where the next
 * sign-in silently failed — isolating contexts removes the whole class of
 * cross-session contamination from the test.
 */
async function openSession(browser, { email, password }) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('  [page error]', m.text());
  });

  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' });
  await page.type('input[type=email]', email);
  await page.type('input[type=password]', password);
  await page.click('button[type=submit]');

  // Wait for either a redirect away from /login or a visible auth error.
  await page
    .waitForFunction(
      () =>
        !location.pathname.startsWith('/login') ||
        document.body.innerText.includes('Invalid') ||
        document.body.innerText.includes('credentials'),
      { timeout: 15000 },
    )
    .catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));

  if (new URL(page.url()).pathname.startsWith('/login')) {
    const msg = await page.evaluate(() => document.body.innerText.slice(0, 300));
    throw new Error(`login as ${email} did not leave /login. Page said: ${msg}`);
  }

  return { context, page };
}

let createdOrgId = null;
let createdUserId = null;

async function main() {
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    userDataDir: mkdtempSync(join(tmpdir(), 'lp7-')),
    args: ['--no-sandbox'],
  });
  try {
    // ---- 4 (do this FIRST, before any platform session exists) --------
    // A non-platform-admin must not reach the route even by direct POST.
    const orgSession = await openSession(browser, ORG_ADMIN);
    let page = orgSession.page;
    const orgAdminLanding = new URL(page.url()).pathname;
    record('org admin lands on /dashboard', orgAdminLanding === '/dashboard', orgAdminLanding);

    await page.goto(`${BASE}/super-admin/new-org`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));
    const blockedPath = new URL(page.url()).pathname;
    record(
      'org admin visiting /super-admin/new-org is redirected away (server-side)',
      blockedPath !== '/super-admin/new-org',
      `landed on ${blockedPath}`,
    );

    // The page gate could be bypassed by POSTing directly — check the API.
    const directPost = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/admin/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Should Never Exist', industry: 'evil' }),
      });
      return { status: r.status, body: await r.text() };
    }, BASE);
    record(
      'org admin POSTing directly to /api/admin/organizations gets 403',
      directPost.status === 403,
      `status ${directPost.status}`,
    );

    const directInvite = await page.evaluate(async (base) => {
      const r = await fetch(`${base}/api/admin/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'x@y.com', organizationId: '11111111-1111-1111-1111-111111111111' }),
      });
      return { status: r.status };
    }, BASE);
    record(
      'org admin POSTing directly to /api/admin/invite gets 403',
      directInvite.status === 403,
      `status ${directInvite.status}`,
    );

    const { data: leaked } = await admin
      .from('organizations')
      .select('id')
      .eq('name', 'Should Never Exist');
    record(
      'no organization row was created by the blocked request',
      (leaked ?? []).length === 0,
      `${(leaked ?? []).length} rows`,
    );

    await orgSession.context.close();

    // ---- 1. platform admin creates an organization --------------------
    const superSession = await openSession(browser, SUPER);
    page = superSession.page;
    const superLanding = new URL(page.url()).pathname;
    record('platform admin lands on /super-admin', superLanding === '/super-admin', superLanding);

    await page.goto(`${BASE}/super-admin/new-org`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('form input[type=text]', { timeout: 8000 });

    page.on('response', async (r) => {
      if (r.url().includes('/api/admin/') && r.status() >= 400) {
        console.log(`  [api ${r.status()}]`, (await r.text()).slice(0, 200));
      }
    });

    const textInputs = await page.$$('form input[type=text]');
    await textInputs[0].type(NEW_ORG_NAME);
    await textInputs[1].type('coffee');
    await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      forms[0].querySelector('button[type=submit]').click();
    });
    // NOTE: do not wait on the literal text "API key" — the form's own
    // description contains that phrase, so the wait resolves instantly and
    // the assertion races the request. Wait for the actual secret element.
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('code')).some((c) =>
          /^[0-9a-f]{48}$/.test(c.textContent.trim()),
        ),
      { timeout: 15000 },
    );

    const apiKeyOnScreen = await page.evaluate(() => {
      const code = Array.from(document.querySelectorAll('code')).map((c) => c.textContent.trim());
      return code.find((t) => /^[0-9a-f]{48}$/.test(t)) ?? null;
    });
    record(
      'API key displayed on screen after creation (48 hex chars)',
      Boolean(apiKeyOnScreen),
      apiKeyOnScreen ?? 'not found',
    );

    const { data: dbOrg } = await admin
      .from('organizations')
      .select('id, name, slug, industry, api_key')
      .eq('name', NEW_ORG_NAME)
      .maybeSingle();
    createdOrgId = dbOrg?.id ?? null;
    record(
      'organization row exists in DB with matching api_key',
      Boolean(dbOrg) && dbOrg.api_key === apiKeyOnScreen,
      dbOrg ? `${dbOrg.slug} industry=${dbOrg.industry}` : 'no row',
    );

    // The api_key must actually work against the Phase 2 ingestion API.
    const ingest = await fetch('https://leadpulse-api-m52p.onrender.com/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': dbOrg.api_key },
      body: JSON.stringify({
        event_type: 'page_view',
        visitor_id: `provision-check-${stamp}`,
        view_data: { url: 'https://northwind.example/' },
      }),
    });
    record(
      'generated api_key is ACCEPTED by the live Phase 2 ingestion API',
      ingest.status === 202,
      `status ${ingest.status}`,
    );

    // ---- 2. invite an admin for that org ------------------------------
    await page.evaluate(
      (email, orgName) => {
        const forms = Array.from(document.querySelectorAll('form'));
        const inviteForm = forms[1];
        inviteForm.querySelector('input[type=email]').value = '';
        const emailInput = inviteForm.querySelector('input[type=email]');
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        ).set;
        setter.call(emailInput, email);
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));

        const select = inviteForm.querySelector('select');
        const opt = Array.from(select.options).find((o) => o.textContent.trim() === orgName);
        const selSetter = Object.getOwnPropertyDescriptor(
          window.HTMLSelectElement.prototype,
          'value',
        ).set;
        selSetter.call(select, opt.value);
        select.dispatchEvent(new Event('change', { bubbles: true }));
      },
      NEW_ADMIN_EMAIL,
      NEW_ORG_NAME,
    );

    await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      forms[1].querySelector('button[type=submit]').click();
    });
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll('code')).some(
          (c) => !/^[0-9a-f]{48}$/.test(c.textContent.trim()) && c.textContent.trim().length > 8,
        ),
      { timeout: 15000 },
    );

    const tempPassword = await page.evaluate(() => {
      const codes = Array.from(document.querySelectorAll('code')).map((c) => c.textContent.trim());
      return codes.find((t) => !/^[0-9a-f]{48}$/.test(t)) ?? null;
    });
    record('temporary password shown once on screen', Boolean(tempPassword), tempPassword ?? 'none');

    const { data: users } = await admin.auth.admin.listUsers();
    const newUser = users.users.find((u) => u.email === NEW_ADMIN_EMAIL);
    createdUserId = newUser?.id ?? null;
    record('auth.users row created for invited admin', Boolean(newUser), newUser?.id ?? 'none');

    const { data: adminRow } = await admin
      .from('admin_users')
      .select('id, organization_id, email, role')
      .eq('email', NEW_ADMIN_EMAIL)
      .maybeSingle();
    record(
      'admin_users row links invited admin to the NEW organization',
      Boolean(adminRow) && adminRow.organization_id === createdOrgId,
      adminRow ? `org=${adminRow.organization_id} role=${adminRow.role}` : 'no row',
    );

    await superSession.context.close();

    // ---- 3. invited admin logs in, sees ONLY the new org --------------
    const invitedSession = await openSession(browser, {
      email: NEW_ADMIN_EMAIL,
      password: tempPassword,
    });
    page = invitedSession.page;
    const invitedLanding = new URL(page.url()).pathname;
    record(
      'invited admin lands on /dashboard',
      invitedLanding === '/dashboard',
      invitedLanding,
    );

    const bodyText = await page.evaluate(() => document.body.innerText);
    record(
      'dashboard names the NEW org and neither seed org',
      bodyText.includes(NEW_ORG_NAME) &&
        !bodyText.includes('Acme Test Store') &&
        !bodyText.includes('Rival Test Store'),
      `newOrg=${bodyText.includes(NEW_ORG_NAME)} acme=${bodyText.includes('Acme Test Store')}`,
    );

    // Stronger than the label: the new org has no contacts, so none of the
    // seeded lead identities may appear anywhere on the page.
    record(
      'no seed-tenant lead data leaks into the new org dashboard',
      !bodyText.includes('Priya Nair') &&
        !bodyText.includes('Sam Delgado') &&
        !bodyText.includes('priya@example.com'),
      'checked Priya Nair / Sam Delgado / priya@example.com',
    );

    await page.goto(`${BASE}/super-admin`, { waitUntil: 'networkidle2' });
    await new Promise((r) => setTimeout(r, 1200));
    const invitedBlocked = new URL(page.url()).pathname;
    record(
      'invited admin cannot reach /super-admin',
      invitedBlocked !== '/super-admin',
      `landed on ${invitedBlocked}`,
    );

    await browser.close();
  } catch (err) {
    console.error('\nVERIFY THREW:', err.message);
    checks.push({ name: 'script completed', pass: false });
    await browser.close().catch(() => {});
  } finally {
    // ---- cleanup ------------------------------------------------------
    if (createdUserId) await admin.auth.admin.deleteUser(createdUserId);
    if (createdOrgId) {
      await admin.from('events').delete().eq('organization_id', createdOrgId);
      await admin.from('organizations').delete().eq('id', createdOrgId);
    }
    await admin.from('organizations').delete().eq('name', 'Should Never Exist');
    console.log('\ncleanup done — provisioned test org, its events, and invited user removed.');
  }

  const allPass = checks.every((c) => c.pass);
  console.log(`\n${allPass ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
  process.exitCode = allPass ? 0 : 1;
}

main();
