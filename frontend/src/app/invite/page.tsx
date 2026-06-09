'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchMe } from '@/lib/auth-api';
import { acceptInvite } from '@/lib/teams-api';
import { AuthShell } from '@/components/AuthShell';

function InviteInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState('Checking your invitation…');

  useEffect(() => {
    (async () => {
      if (!token) {
        setStatus('Missing invitation token.');
        return;
      }
      const me = await fetchMe();
      if (!me) {
        // Send them to login, then back here.
        router.replace(`/login?next=${encodeURIComponent(`/invite?token=${token}`)}`);
        return;
      }
      try {
        await acceptInvite(token);
        setStatus('Invitation accepted! Redirecting…');
        setTimeout(() => router.replace('/app'), 900);
      } catch (e) {
        setStatus(e instanceof Error ? e.message : 'Could not accept invitation.');
      }
    })();
  }, [token, router]);

  return (
    <AuthShell title="Team invitation">
      <p style={{ color: 'var(--muted)' }}>{status}</p>
    </AuthShell>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={null}>
      <InviteInner />
    </Suspense>
  );
}
