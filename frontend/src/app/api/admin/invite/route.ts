import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getPlatformAdminOrNull } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const ROLES = new Set(['owner', 'admin', 'agent']);

/**
 * Temporary password for a newly provisioned admin.
 *
 * WHY A PASSWORD AND NOT AN EMAIL INVITE: auth.admin.inviteUserByEmail()
 * was tested against this project and returns
 *   400 "Email address ... is invalid"
 * because no custom SMTP provider is configured — Supabase's built-in mailer
 * only delivers to project team members. Until SMTP is wired up, an emailed
 * invite would fail for every real client domain, so provisioning hands back
 * a credential the platform admin passes on out of band instead.
 *
 * TODO(post-SMTP): switch to inviteUserByEmail and drop temp passwords
 * entirely — they are the weaker pattern and only exist because of the
 * mailer limitation.
 */
function generateTempPassword(): string {
  // base64url of 12 bytes ≈ 16 chars, well past Supabase's 6-char minimum.
  return randomBytes(12).toString('base64url');
}

/**
 * POST /api/admin/invite
 * Creates an auth user and links it to an organization. Platform admins only.
 */
export async function POST(request: Request) {
  const admin = await getPlatformAdminOrNull();
  if (!admin) {
    return NextResponse.json(
      { error: 'Forbidden — platform admin access required' },
      { status: 403 },
    );
  }

  let body: { email?: unknown; organizationId?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const organizationId = typeof body.organizationId === 'string' ? body.organizationId : '';
  const role = typeof body.role === 'string' && ROLES.has(body.role) ? body.role : 'admin';

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }
  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify the org exists before creating an auth user. Without this, a bad
  // organizationId leaves an orphaned auth user behind when the admin_users
  // insert fails on the foreign key.
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', organizationId)
    .maybeSingle();

  if (orgError) {
    console.error('[admin] org lookup failed', orgError);
    return NextResponse.json({ error: 'Failed to verify organization' }, { status: 500 });
  }
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const tempPassword = generateTempPassword();

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    // No deliverable invite email exists (see above), so confirming here is
    // what makes the account usable at all.
    email_confirm: true,
  });

  if (createError) {
    // Verified behavior: duplicate email returns 422 with code email_exists.
    if (createError.code === 'email_exists' || createError.status === 422) {
      return NextResponse.json(
        { error: `A user with the email ${email} already exists` },
        { status: 409 },
      );
    }
    console.error('[admin] createUser failed', createError);
    return NextResponse.json(
      { error: createError.message || 'Failed to create user' },
      { status: 500 },
    );
  }

  const userId = created.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'User was created without an id' }, { status: 500 });
  }

  const { error: linkError } = await supabase
    .from('admin_users')
    .insert({ id: userId, organization_id: organizationId, email, role });

  if (linkError) {
    // Roll back the auth user so a retry is not permanently blocked by the
    // email_exists check above. An auth user with no admin_users row would
    // otherwise be stranded in the /pending state forever.
    await supabase.auth.admin.deleteUser(userId);
    console.error('[admin] admin_users insert failed, rolled back auth user', linkError);
    return NextResponse.json(
      { error: 'Failed to link user to organization' },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      admin: { userId, email, role, organizationId, organizationName: org.name },
      tempPassword,
    },
    { status: 201 },
  );
}
