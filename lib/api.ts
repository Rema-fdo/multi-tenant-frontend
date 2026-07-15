import {
  FeatureFlag,
  Organization,
  OrgOption,
  Role,
  SessionUser,
} from './types';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    throw new ApiError(res.status, await extractError(res));
  }
  // 204 and empty bodies would break res.json(); guard against that.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function extractError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    // Nest wraps validation errors in a message array.
    if (Array.isArray(data.message)) return data.message.join(', ');
    return data.message ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

interface UserAuthResult {
  token: string;
  user: SessionUser;
}

export const api = {
  superAdminLogin(username: string, password: string) {
    return request<{ token: string; role: Role }>('/auth/super-admin/login', {
      method: 'POST',
      body: { username, password },
    });
  },

  signup(input: {
    email: string;
    password: string;
    role: Extract<Role, 'org_admin' | 'end_user'>;
    organizationSlug: string;
  }) {
    return request<UserAuthResult>('/auth/signup', {
      method: 'POST',
      body: input,
    });
  },

  login(email: string, password: string) {
    return request<UserAuthResult>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  createOrganization(name: string, token: string) {
    return request<Organization>('/organizations', {
      method: 'POST',
      body: { name },
      token,
    });
  },

  listOrganizations(token: string) {
    return request<Organization[]>('/organizations', { token });
  },

  // Public: used to populate the sign-up organization dropdown.
  listPublicOrganizations() {
    return request<OrgOption[]>('/public/organizations');
  },

  deleteOrganization(id: string, token: string) {
    return request<{ id: string }>(`/organizations/${id}`, {
      method: 'DELETE',
      token,
    });
  },

  listFlags(token: string) {
    return request<FeatureFlag[]>('/feature-flags', { token });
  },

  createFlag(
    input: { key: string; description?: string; enabled?: boolean },
    token: string,
  ) {
    return request<FeatureFlag>('/feature-flags', {
      method: 'POST',
      body: input,
      token,
    });
  },

  updateFlag(
    id: string,
    input: { key?: string; enabled?: boolean; description?: string },
    token: string,
  ) {
    return request<FeatureFlag>(`/feature-flags/${id}`, {
      method: 'PATCH',
      body: input,
      token,
    });
  },

  deleteFlag(id: string, token: string) {
    return request<{ id: string }>(`/feature-flags/${id}`, {
      method: 'DELETE',
      token,
    });
  },

  checkFeature(key: string, token: string) {
    return request<{ key: string; enabled: boolean }>('/features/check', {
      method: 'POST',
      body: { key },
      token,
    });
  },
};
