export type Role = 'super_admin' | 'org_admin' | 'end_user';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

// The trimmed organization shape returned by the public sign-up endpoint.
export interface OrgOption {
  id: string;
  name: string;
  slug: string;
}

export interface FeatureFlag {
  id: string;
  organizationId: string;
  key: string;
  description: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  organizationId: string;
  organizationName: string | null;
  organizationSlug: string | null;
}
