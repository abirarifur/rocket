'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/lib/auth-api';
import { AuthShell, buttonStyle, inputStyle } from '@/components/AuthShell';
import { OAuthButtons } from '@/components/OAuthButtons';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(email, password, name || undefined);
      router.push('/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your account">
      <form onSubmit={onSubmit}>
        <input
          style={inputStyle}
          type="text"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          style={inputStyle}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          style={inputStyle}
          type="password"
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        {error && <p style={{ color: 'var(--bad)', fontSize: '0.85rem', marginTop: 0 }}>{error}</p>}
        <button style={buttonStyle} type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
      <OAuthButtons />
      <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </AuthShell>
  );
}
