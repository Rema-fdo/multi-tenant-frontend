'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { OrgOption, SessionUser } from '@/lib/types';
import { saveSession } from '@/lib/session';
import { Field } from './Field';
import { Alert } from './Alert';

type Mode = 'login' | 'signup';

interface AuthPanelProps {
  area: 'admin' | 'user';
  role: 'org_admin' | 'end_user';
  onAuthenticated: (token: string, user: SessionUser) => void;
}

// Shared login/signup form for the two self-service roles. The only real
// difference between admin and user sign-up is the role we send, so the panel
// takes it as a prop rather than duplicating the form twice.
export function AuthPanel({ area, role, onAuthenticated }: AuthPanelProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [slug, setSlug] = useState('');
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The organization list is public so it can seed the sign-up dropdown.
  useEffect(() => {
    api
      .listPublicOrganizations()
      .then(setOrgs)
      .catch(() => setOrgs([]));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result =
        mode === 'login'
          ? await api.login(email, password)
          : await api.signup({ email, password, role, organizationSlug: slug });
      saveSession(area, { token: result.token, role, user: result.user });
      onAuthenticated(result.token, result.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const needsOrg = mode === 'signup';

  return (
    <div className="card">
      <div className="spread">
        <h2>{mode === 'login' ? 'Log in' : 'Sign up'}</h2>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError(null);
          }}
        >
          {mode === 'login' ? 'Need an account?' : 'Have an account?'}
        </button>
      </div>
      <Alert kind="error" message={error} />
      <form onSubmit={submit}>
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
        {needsOrg && (
          <div className="field">
            <label htmlFor="organization">Organization</label>
            <select
              id="organization"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            >
              <option value="" disabled>
                {orgs.length ? 'Select an organization' : 'No organizations yet'}
              </option>
              {orgs.map((org) => (
                <option key={org.id} value={org.slug}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button type="submit" disabled={busy || (needsOrg && !slug)}>
          {busy ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
      </form>
      {needsOrg && (
        <p className="muted">
          Organizations are created by the super admin. Ask them to add yours if
          it is not listed.
        </p>
      )}
    </div>
  );
}
