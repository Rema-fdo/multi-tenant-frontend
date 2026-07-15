'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { SessionUser } from '@/lib/types';
import { clearSession, loadSession } from '@/lib/session';
import { AuthPanel } from '@/components/AuthPanel';
import { Field } from '@/components/Field';
import { Alert } from '@/components/Alert';

export default function UserPage() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = loadSession('user');
    if (session?.user) {
      setToken(session.token);
      setUser(session.user);
    }
    setReady(true);
  }, []);

  const onAuthenticated = useCallback((newToken: string, newUser: SessionUser) => {
    setToken(newToken);
    setUser(newUser);
  }, []);

  const onLogout = useCallback(() => {
    clearSession('user');
    setToken(null);
    setUser(null);
  }, []);

  if (!ready) return null;

  return (
    <>
      <div className="page-header">
        <div className="spread">
          <h1>Feature Check</h1>
          <Link href="/" className="muted">
            Home
          </Link>
        </div>
        {user ? (
          <p>
            Checking features for{' '}
            <strong>{user.organizationName ?? 'your organization'}</strong>.
          </p>
        ) : (
          <p>See whether a feature is turned on for your organization.</p>
        )}
      </div>
      {token && user ? (
        <CheckPanel token={token} user={user} onLogout={onLogout} />
      ) : (
        <AuthPanel area="user" role="end_user" onAuthenticated={onAuthenticated} />
      )}
    </>
  );
}

function CheckPanel({
  token,
  user,
  onLogout,
}: {
  token: string;
  user: SessionUser;
  onLogout: () => void;
}) {
  const [key, setKey] = useState('');
  const [result, setResult] = useState<{ key: string; enabled: boolean } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function check(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      setResult(await api.checkFeature(key, token));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onLogout();
      else setError(err instanceof ApiError ? err.message : 'Check failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="spread">
        <h2>Check a feature</h2>
        <button className="secondary" onClick={onLogout}>
          Log out ({user.email})
        </button>
      </div>
      <Alert kind="error" message={error} />
      <form onSubmit={check}>
        <Field
          label="Feature key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="new_dashboard"
        />
        <button type="submit" disabled={busy || key.trim().length === 0}>
          {busy ? 'Checking...' : 'Check'}
        </button>
      </form>
      {result && (
        <p style={{ marginTop: 16 }}>
          <code>{result.key}</code> is{' '}
          <span className={`tag ${result.enabled ? 'on' : 'off'}`}>
            {result.enabled ? 'enabled' : 'disabled'}
          </span>{' '}
          for your organization.
        </p>
      )}
    </div>
  );
}
