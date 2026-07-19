import { NextResponse } from 'next/server';
import { getPlatformAdminOrNull } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

// Node runtime, not Edge: the service-role client pulls in `ws`.
export const runtime = 'nodejs';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/**
 * POST /api/admin/organizations
 * Creates a tenant. Platform admins only.
 */
export async function POST(request: Request) {
  // Authorization first, before touching the service-role client. Reaching
  // for createAdminClient() ahead of this check would be the whole exploit.
  const admin = await getPlatformAdminOrNull();
  if (!admin) {
    return NextResponse.json(
      { error: 'Forbidden — platform admin access required' },
      { status: 403 },
    );
  }

  let body: { name?: unknown; industry?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const industry = typeof body.industry === 'string' ? body.industry.trim() : '';

  if (!name) {
    return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });
  }

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json(
      { error: 'Organization name must contain at least one letter or number' },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // api_key is deliberately NOT supplied. The column default
  // `encode(gen_random_bytes(24),'hex')` from 0001 generates it, so key
  // format lives in exactly one place — reimplementing it in Node would let
  // the two drift silently.
  const { data, error } = await supabase
    .from('organizations')
    .insert({ name, slug, industry: industry || null })
    .select('id, name, slug, industry, api_key, created_at')
    .single();

  if (error) {
    // 23505 = slug (or api_key) collision. Slug is derived from the name,
    // so in practice this means the name is already taken.
    if (error.code === '23505') {
      return NextResponse.json(
        { error: `An organization with the slug "${slug}" already exists` },
        { status: 409 },
      );
    }
    console.error('[admin] create organization failed', error);
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }

  return NextResponse.json({ organization: data }, { status: 201 });
}
