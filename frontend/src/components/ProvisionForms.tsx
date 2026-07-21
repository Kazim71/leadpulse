'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader } from './ui/Card';
import { SecretReveal } from './SecretReveal';
import type { Organization } from '@/lib/queries';

interface CreatedOrg {
  id: string;
  name: string;
  slug: string;
  api_key: string;
}

interface CreatedAdmin {
  email: string;
  organizationName: string;
  tempPassword: string;
}

/**
 * Client component: collects input and POSTs to the Route Handlers. It holds
 * no privileged credential — the service_role key never leaves the server,
 * and every authorization decision is made inside the route, not here.
 */
export function ProvisionForms({ organizations }: { organizations: Organization[] }) {
  const router = useRouter();
  const [orgs, setOrgs] = useState(organizations);
  const [createdOrg, setCreatedOrg] = useState<CreatedOrg | null>(null);
  const [createdAdmin, setCreatedAdmin] = useState<CreatedAdmin | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <CreateOrgForm
        onCreated={(org) => {
          setCreatedOrg(org);
          setOrgs((prev) =>
            [...prev, { ...org, industry: null, created_at: new Date().toISOString() }].sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
          );
          router.refresh();
        }}
        result={createdOrg}
      />
      <InviteAdminForm
        organizations={orgs}
        onCreated={(admin) => {
          setCreatedAdmin(admin);
          router.refresh();
        }}
        result={createdAdmin}
      />
    </div>
  );
}

function CreateOrgForm({
  onCreated,
  result,
}: {
  onCreated: (org: CreatedOrg) => void;
  result: CreatedOrg | null;
}) {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const res = await fetch('/api/admin/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, industry }),
    });
    const payload = await res.json();
    setPending(false);

    if (!res.ok) {
      setError(payload.error ?? 'Failed to create organization');
      return;
    }

    onCreated(payload.organization);
    setName('');
    setIndustry('');
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-xl text-black dark:text-neutral-100">Create organization</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Generates the API key the tracking snippet will use for this client.
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        <form onSubmit={submit} className="space-y-4">
          <TextField label="Company name" value={name} onChange={setName} required placeholder="Northwind Coffee" />
          <TextField
            label="Industry"
            value={industry}
            onChange={setIndustry}
            placeholder="ecommerce"
            hint="Free text — used to group companies on the dashboard."
          />
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          <SubmitButton pending={pending}>Create organization</SubmitButton>
        </form>

        {result ? (
          <div className="space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              Created <span className="font-medium">{result.name}</span>{' '}
              <span className="font-mono text-xs text-neutral-500">({result.slug})</span>
            </p>
            <SecretReveal
              label="API key"
              value={result.api_key}
              note="Copy this now — it won't be shown again. Paste it into the tracking snippet's leadpulseConfig for this client."
            />
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function InviteAdminForm({
  organizations,
  onCreated,
  result,
}: {
  organizations: Organization[];
  onCreated: (admin: CreatedAdmin) => void;
  result: CreatedAdmin | null;
}) {
  const [email, setEmail] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [role, setRole] = useState('admin');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, organizationId, role }),
    });
    const payload = await res.json();
    setPending(false);

    if (!res.ok) {
      setError(payload.error ?? 'Failed to invite admin');
      return;
    }

    onCreated({
      email: payload.admin.email,
      organizationName: payload.admin.organizationName,
      tempPassword: payload.tempPassword,
    });
    setEmail('');
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-xl text-black dark:text-neutral-100">Invite an admin</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Creates the login and links it to one organization.
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        <form onSubmit={submit} className="space-y-4">
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            required
            placeholder="owner@northwind.example"
          />

          <label className="block">
            <FieldLabel>Organization</FieldLabel>
            <select
              required
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-black dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
            >
              <option value="">Select an organization…</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <FieldLabel>Role</FieldLabel>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-black dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
            >
              <option value="owner">owner</option>
              <option value="admin">admin</option>
              <option value="agent">agent</option>
            </select>
          </label>

          {error ? <ErrorNote>{error}</ErrorNote> : null}
          <SubmitButton pending={pending}>Create admin</SubmitButton>
        </form>

        {result ? (
          <div className="space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              <span className="font-medium">{result.email}</span> can now sign in and will land on{' '}
              {result.organizationName}&apos;s dashboard.
            </p>
            <SecretReveal
              label="Temporary password"
              value={result.tempPassword}
              note="Shown once. Send it to them over a secure channel and have them change it after first sign-in. (Email invites are unavailable until custom SMTP is configured.)"
            />
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-2xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
      {children}
    </span>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-black placeholder:text-neutral-400 focus:border-cinnamon-400 dark:border-neutral-700 dark:bg-black dark:text-neutral-100"
      />
      {hint ? <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">{hint}</span> : null}
    </label>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md bg-brick-100 px-3 py-2 text-xs text-brick-700 dark:bg-brick-900 dark:text-brick-300">
      {children}
    </p>
  );
}

function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-cinnamon-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cinnamon-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Working…' : children}
    </button>
  );
}
