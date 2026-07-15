'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { FeatureFlag, SessionUser } from '@/lib/types';
import { clearSession, loadSession } from '@/lib/session';
import { AuthPanel } from '@/components/AuthPanel';
import { Field } from '@/components/Field';
import { Alert } from '@/components/Alert';

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = loadSession('admin');
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
    clearSession('admin');
    setToken(null);
    setUser(null);
  }, []);

  if (!ready) return null;

  return (
    <>
      <div className="page-header">
        <div className="spread">
          <h1>Organization Admin</h1>
          <Link href="/" className="muted">
            Home
          </Link>
        </div>
        {user ? (
          <p>
            Managing flags for{' '}
            <strong>{user.organizationName ?? 'your organization'}</strong>.
          </p>
        ) : (
          <p>Create feature flags and toggle them for your organization.</p>
        )}
      </div>
      {token && user ? (
        <FlagManager token={token} user={user} onLogout={onLogout} />
      ) : (
        <AuthPanel area="admin" role="org_admin" onAuthenticated={onAuthenticated} />
      )}
    </>
  );
}

function FlagManager({
  token,
  user,
  onLogout,
}: {
  token: string;
  user: SessionUser;
  onLogout: () => void;
}) {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setFlags(await api.listFlags(token));
    } catch (err) {
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
      await api.createFlag({ key, description }, token);
      setKey('');
      setDescription('');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create flag');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(flag: FeatureFlag) {
    setError(null);
    try {
      await api.updateFlag(flag.id, { enabled: !flag.enabled }, token);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update flag');
    }
  }

  async function remove(flag: FeatureFlag) {
    setError(null);
    try {
      await api.deleteFlag(flag.id, token);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete flag');
    }
  }

  async function saveEdit(id: string, key: string, description: string) {
    setError(null);
    try {
      await api.updateFlag(id, { key, description }, token);
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update flag');
    }
  }

  return (
    <>
      <div className="card">
        <div className="spread">
          <h2>New flag</h2>
          <button className="secondary" onClick={onLogout}>
            Log out ({user.email})
          </button>
        </div>
        <Alert kind="error" message={error} />
        <form onSubmit={create}>
          <Field
            label="Feature key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="new_dashboard"
          />
          <Field
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button type="submit" disabled={busy || key.trim().length === 0}>
            {busy ? 'Adding...' : 'Add flag'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Flags ({flags.length})</h2>
        {flags.length === 0 ? (
          <p className="muted">No flags yet. Create one above.</p>
        ) : (
          <ul className="list">
            {flags.map((flag) =>
              editingId === flag.id ? (
                <li key={flag.id}>
                  <FlagEditor
                    flag={flag}
                    onCancel={() => setEditingId(null)}
                    onSave={saveEdit}
                  />
                </li>
              ) : (
                <li key={flag.id}>
                  <div className="spread">
                    <div>
                      <div className="row">
                        <code>{flag.key}</code>
                        <span className={`tag ${flag.enabled ? 'on' : 'off'}`}>
                          {flag.enabled ? 'enabled' : 'disabled'}
                        </span>
                      </div>
                      {flag.description && (
                        <div className="muted">{flag.description}</div>
                      )}
                    </div>
                    <div className="row">
                      <button className="secondary" onClick={() => toggle(flag)}>
                        {flag.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        className="secondary"
                        onClick={() => setEditingId(flag.id)}
                      >
                        Edit
                      </button>
                      <button className="danger" onClick={() => remove(flag)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </>
  );
}

function FlagEditor({
  flag,
  onCancel,
  onSave,
}: {
  flag: FeatureFlag;
  onCancel: () => void;
  onSave: (id: string, key: string, description: string) => void;
}) {
  const [key, setKey] = useState(flag.key);
  const [description, setDescription] = useState(flag.description);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(flag.id, key, description);
      }}
    >
      <Field
        label="Feature key"
        value={key}
        onChange={(e) => setKey(e.target.value)}
      />
      <Field
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="row">
        <button type="submit" disabled={key.trim().length === 0}>
          Save
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
