// Phase 7 verification: proves the two-tier RLS boundary against the live
// database, using real logins through the ANON key — the same path the
// dashboard uses. Nothing here relies on the UI hiding a link.
//
// Run: node test/verify-phase7.mjs   (from frontend/)

import { readFileSync } from 'node:fs';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';

// Node 20 has no global WebSocket; supabase-js builds a RealtimeClient
// eagerly. Same fix as backend/src/config/supabaseClient.ts.
const createClient = (url, key, opts = {}) =>
  createSupabaseClient(url, key, { ...opts, realtime: { transport: ws } });

function readEnv(path) {
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const feEnv = readEnv('.env.local');
const beEnv = readEnv('../backend/.env');

const URL = feEnv.NEXT_PUBLIC_SUPABASE_URL;
const ANON = feEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SRK = beEnv.SUPABASE_SERVICE_ROLE_KEY;

const ACME = '11111111-1111-1111-1111-111111111111';
const RIVAL = '22222222-2222-2222-2222-222222222222';

const ORG_ADMIN = { email: 'owner@acme-test.dev', password: 'test123' };
const SUPER_ADMIN = { email: 'super@leadcapsule.dev', password: 'superadmin123' };

const admin = createClient(URL, SRK, { auth: { persistSession: false } });

const checks = [];
const record = (name, pass, detail) => {
  checks.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} — ${name}${detail ? ': ' + detail : ''}`);
};

/** Fresh anon client authenticated as a specific user. */
async function loginAs({ email, password }) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login ${email} failed: ${error.message}`);
  return { client: c, userId: data.user.id };
}

async function ensureSuperAdminUser() {
  const { data: list } = await admin.auth.admin.listUsers();
  let user = list?.users?.find((u) => u.email === SUPER_ADMIN.email);

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: SUPER_ADMIN.email,
      password: SUPER_ADMIN.password,
      email_confirm: true,
    });
    if (error) throw new Error(`create super admin failed: ${error.message}`);
    user = data.user;
    console.log(`created super-admin auth user ${user.id}`);
  } else {
    // Ensure the password matches what this script logs in with.
    await admin.auth.admin.updateUserById(user.id, {
      password: SUPER_ADMIN.password,
      email_confirm: true,
    });
    console.log(`reusing super-admin auth user ${user.id}`);
  }

  const { error: paError } = await admin
    .from('platform_admins')
    .upsert({ user_id: user.id }, { onConflict: 'user_id' });
  if (paError) throw new Error(`platform_admins insert failed: ${paError.message}`);

  return user.id;
}

async function main() {
  // ---- 0. migration applied? -----------------------------------------
  const { error: tableErr } = await admin.from('platform_admins').select('user_id').limit(1);
  if (tableErr) {
    console.error('\nBLOCKED: migration 0003 is not applied.');
    console.error(`  ${tableErr.message}`);
    process.exit(1);
  }
  record('migration 0003 applied (platform_admins reachable)', true);

  const { data: orgsWithIndustry, error: indErr } = await admin
    .from('organizations')
    .select('id, name, industry');
  record(
    'organizations.industry column exists',
    !indErr,
    indErr ? indErr.message : orgsWithIndustry.map((o) => `${o.name}=${o.industry}`).join(', '),
  );

  const superUserId = await ensureSuperAdminUser();

  // ---- 1. super-admin sees ALL orgs -----------------------------------
  const sa = await loginAs(SUPER_ADMIN);

  const { data: saOrgs } = await sa.client.from('organizations').select('id, name, industry');
  record(
    'platform admin reads BOTH organizations through RLS',
    (saOrgs ?? []).length === 2,
    `${(saOrgs ?? []).length} orgs: ${(saOrgs ?? []).map((o) => o.name).join(', ')}`,
  );

  const { data: saIsPa } = await sa.client.rpc('is_platform_admin');
  record('is_platform_admin() returns true for platform admin', saIsPa === true, String(saIsPa));

  const { data: saAcme } = await sa.client.from('contacts').select('id').eq('organization_id', ACME);
  const { data: saRival } = await sa.client
    .from('contacts')
    .select('id')
    .eq('organization_id', RIVAL);
  record(
    'platform admin reads contacts in BOTH orgs',
    (saAcme ?? []).length === 2 && (saRival ?? []).length === 1,
    `acme=${(saAcme ?? []).length} rival=${(saRival ?? []).length}`,
  );

  // ---- 2. super-admin is READ-ONLY across orgs ------------------------
  const { error: saInsertErr } = await sa.client
    .from('contacts')
    .insert({ organization_id: RIVAL, email: 'sa-should-fail@example.com' });
  record(
    'platform admin CANNOT insert into an arbitrary org (write stays blocked)',
    Boolean(saInsertErr),
    saInsertErr ? saInsertErr.code : 'INSERT SUCCEEDED — policy hole',
  );

  const { data: saDeleted } = await sa.client
    .from('contacts')
    .delete()
    .eq('organization_id', RIVAL)
    .select('id');
  record(
    'platform admin CANNOT delete another org rows (DELETE stays blocked)',
    (saDeleted ?? []).length === 0,
    `${(saDeleted ?? []).length} rows deleted`,
  );

  // ---- 3. org-admin isolation unchanged (Phase 1 sections C/D) --------
  const oa = await loginAs(ORG_ADMIN);

  const { data: oaOrgs } = await oa.client.from('organizations').select('id, name');
  record(
    'org admin still sees ONLY their own organization',
    (oaOrgs ?? []).length === 1 && oaOrgs[0].id === ACME,
    `${(oaOrgs ?? []).length}: ${(oaOrgs ?? []).map((o) => o.name).join(', ')}`,
  );

  const { data: oaIsPa } = await oa.client.rpc('is_platform_admin');
  record('is_platform_admin() returns false for org admin', oaIsPa === false, String(oaIsPa));

  const { data: oaRival } = await oa.client.from('contacts').select('id').eq('organization_id', RIVAL);
  record(
    'org admin reading another org contacts returns 0 rows (cross-tenant blocked)',
    (oaRival ?? []).length === 0,
    `${(oaRival ?? []).length} rows`,
  );

  const { data: oaEvents } = await oa.client.from('events').select('id');
  record(
    'org admin unfiltered events query still scoped to own org (7 seeded)',
    (oaEvents ?? []).length === 7,
    `${(oaEvents ?? []).length} rows`,
  );

  const { data: oaPlatform } = await oa.client.from('platform_admins').select('user_id');
  record(
    'org admin cannot enumerate platform_admins',
    (oaPlatform ?? []).length === 0,
    `${(oaPlatform ?? []).length} rows`,
  );

  // ---- 4. unassigned user sees nothing --------------------------------
  const UNASSIGNED = { email: 'nobody@leadcapsule.dev', password: 'nobody123456' };
  const { data: ulist } = await admin.auth.admin.listUsers();
  let un = ulist?.users?.find((u) => u.email === UNASSIGNED.email);
  if (!un) {
    const { data } = await admin.auth.admin.createUser({
      ...UNASSIGNED,
      email_confirm: true,
    });
    un = data.user;
  } else {
    await admin.auth.admin.updateUserById(un.id, {
      password: UNASSIGNED.password,
      email_confirm: true,
    });
  }

  const uc = await loginAs(UNASSIGNED);
  const [{ data: uOrgs }, { data: uContacts }, { data: uEvents }] = await Promise.all([
    uc.client.from('organizations').select('id'),
    uc.client.from('contacts').select('id'),
    uc.client.from('events').select('id'),
  ]);
  record(
    'unassigned user sees zero rows everywhere (default-deny holds)',
    (uOrgs ?? []).length === 0 && (uContacts ?? []).length === 0 && (uEvents ?? []).length === 0,
    `orgs=${(uOrgs ?? []).length} contacts=${(uContacts ?? []).length} events=${(uEvents ?? []).length}`,
  );

  console.log(`\nsuper-admin user id: ${superUserId}`);
  console.log(`super-admin login:   ${SUPER_ADMIN.email} / ${SUPER_ADMIN.password}`);
  console.log(`org-admin login:     ${ORG_ADMIN.email} / ${ORG_ADMIN.password}`);
  console.log(`unassigned login:    ${UNASSIGNED.email} / ${UNASSIGNED.password}`);

  const allPass = checks.every((c) => c.pass);
  console.log(`\n${allPass ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
  process.exitCode = allPass ? 0 : 1;
}

main().catch((err) => {
  console.error('\nVERIFY THREW:', err.message);
  process.exitCode = 1;
});
