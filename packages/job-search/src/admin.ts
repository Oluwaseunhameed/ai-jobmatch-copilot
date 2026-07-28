import type {
  AdminCompanyRowDto,
  AdminFeatureFlagDto,
  AdminJobRowDto,
  AdminOverviewDto,
  AdminSubscriptionRowDto,
  AdminUserRowDto,
  AppRole,
} from '@jobmatch/types';
import { isAppRole, isAdminRole } from '@jobmatch/types';

export const DEFAULT_FEATURE_FLAGS: Array<{
  key: string;
  enabled: boolean;
  description: string;
}> = [
  {
    key: 'maintenance_mode',
    enabled: false,
    description: 'Surface a maintenance banner / soft-block non-admin writes when enabled.',
  },
  {
    key: 'job_alerts_paused',
    enabled: false,
    description: 'Pause outbound job-alert emails without disabling saved searches.',
  },
  {
    key: 'apply_automation_fixture',
    enabled: false,
    description: 'Allow Playwright fixture apply flows (localhost only; never unsupervised submit).',
  },
];

export function parseAdminEmails(raw?: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function userHasAdminAccess(input: {
  role: string;
  email: string;
  adminEmails?: string[];
}): boolean {
  if (isAdminRole(input.role)) return true;
  const allow = input.adminEmails ?? [];
  return allow.includes(input.email.trim().toLowerCase());
}

export function normalizeAppRole(value: unknown): AppRole | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return isAppRole(trimmed) ? trimmed : null;
}

export function toAdminUserRow(row: {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  preferences: { onboardingCompleted: boolean } | null;
  subscription: { planId: string; status: string } | null;
}): AdminUserRowDto {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    emailVerified: row.emailVerified,
    onboardingCompleted: row.preferences?.onboardingCompleted ?? false,
    planId: row.subscription?.planId ?? 'free',
    subscriptionStatus: row.subscription?.status ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toAdminJobRow(row: {
  id: string;
  title: string;
  slug: string;
  isActive: boolean;
  source: string | null;
  workMode: string;
  seniority: string | null;
  postedAt: Date | null;
  createdAt: Date;
  company: { name: string; slug: string };
}): AdminJobRowDto {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    companyName: row.company.name,
    companySlug: row.company.slug,
    isActive: row.isActive,
    source: row.source,
    workMode: row.workMode,
    seniority: row.seniority,
    postedAt: row.postedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toAdminCompanyRow(row: {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  location: string | null;
  websiteUrl: string | null;
  createdAt: Date;
  _count: { jobs: number };
  jobs: Array<{ id: string }>;
}): AdminCompanyRowDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    industry: row.industry,
    location: row.location,
    websiteUrl: row.websiteUrl,
    activeJobs: row.jobs.length,
    totalJobs: row._count.jobs,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toAdminSubscriptionRow(row: {
  id: string;
  userId: string;
  planId: string;
  status: string;
  provider: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  updatedAt: Date;
  user: { name: string; email: string };
}): AdminSubscriptionRowDto {
  return {
    id: row.id,
    userId: row.userId,
    userName: row.user.name,
    userEmail: row.user.email,
    planId: row.planId,
    status: row.status,
    provider: row.provider,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toAdminFeatureFlag(row: {
  key: string;
  enabled: boolean;
  description: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}): AdminFeatureFlagDto {
  return {
    key: row.key,
    enabled: row.enabled,
    description: row.description,
    updatedAt: row.updatedAt.toISOString(),
    updatedBy: row.updatedBy,
  };
}

export function emptyAdminOverview(flags: AdminFeatureFlagDto[] = []): AdminOverviewDto {
  return {
    users: { total: 0, admins: 0, onboarded: 0 },
    catalog: { companies: 0, jobs: 0, activeJobs: 0 },
    billing: { proActive: 0, free: 0, pastDue: 0 },
    engagement: {
      applications: 0,
      resumes: 0,
      coachSessions: 0,
      portfolioProjects: 0,
    },
    flags,
  };
}
