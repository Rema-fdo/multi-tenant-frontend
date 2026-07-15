'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Organization } from '@/lib/types';
import { clearSession, loadSession, saveSession } from '@/lib/session';
import { Field } from '@/components/Field';
import { Alert } from '@/components/Alert';

export default function SuperAdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = loadSession('super-admin');
    if (session) setToken(session.token);
    setReady(true);
  }, []);

  const onLogin = useCallback((newToken: string) => {
    saveSession('super-admin', { token: newToken, role: 'super_admin' });
    setToken(newToken);
  }, []);

  const onLogout = useCallback(() => {
    clearSession('super-admin');
    setToken(null);
  }, []);

  if (!ready) return null;

  return (
    <>
      <div className="page-header">
        <div className="spread">
          <h1>Super Admin</h1>
          <Link href="/" className="muted">
            Home
          </Link>
        </div>
        <p>Create and review organizations.</p>
      </div>
      {token ? (
        <OrganizationsPanel token={token} onLogout={onLogout} />
      ) : (
        <LoginPanel onLogin={onLogin} />
      )}
    </>
  );
}

function LoginPanel({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { token } = await api.superAdminLogin(username, password);
      onLogin(token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Log in</h2>
      <Alert kind="error" message={error} />
      <Field
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
      />
      <Field
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
      <button type="submit" disabled={busy}>
        {busy ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}

function OrganizationsPanel({
  token,
  onLogout,
}: {
  token: string;
  onLogout: () => void;
}) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setOrgs(await api.listOrganizations(token));
    } catch (err) {
      // An expired token surfaces here; push the operator back to login.
      if (err instanceof ApiError && err.status === 401) onLogout();
      else setError(err instanceof ApiError ? err.message : 'Could not load');
    }
  }, [token, onLogout]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.createOrganization(name, token);
      setName('');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create');
    } finally {
      setBusy(false);
    }
  }

  async function remove(org: Organization) {
    const confirmed = window.confirm(
      `Delete "${org.name}"? This also deletes its admins, end users and ` +
        `feature flags. Those accounts will no longer be able to log in.`,
    );
    if (!confirmed) return;
    setError(null);
    try {
      await api.deleteOrganization(org.id, token);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete');
    }
  }

  return (
    <>
      <div className="card">
        <div className="spread">
          <h2>Create organization</h2>
          <button className="secondary" onClick={onLogout}>
            Log out
          </button>
        </div>
        <Alert kind="error" message={error} />
        <form onSubmit={create}>
          <Field
            label="Organization name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Corp"
          />
          <button type="submit" disabled={busy || name.trim().length < 2}>
            {busy ? 'Creating...' : 'Create'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Organizations ({orgs.length})</h2>
        {orgs.length === 0 ? (
          <p className="muted">No organizations yet.</p>
        ) : (
          <ul className="list">
            {orgs.map((org) => (
              <li key={org.id}>
                <div className="spread">
                  <div className="row">
                    <strong>{org.name}</strong>
                    <code className="muted">{org.slug}</code>
                  </div>
                  <button className="danger" onClick={() => remove(org)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="muted">
          Admins and users sign up against the slug shown here.
        </p>
      </div>
    </>
  );
}
