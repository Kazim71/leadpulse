import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth';

/** Single entry point: route by role, decided server-side. */
export default async function Home() {
  const viewer = await getViewer();

  switch (viewer.kind) {
    case 'platform_admin':
      redirect('/super-admin');
    case 'org_admin':
      redirect('/dashboard');
    case 'unassigned':
      redirect('/pending');
    default:
      redirect('/login');
  }
}
