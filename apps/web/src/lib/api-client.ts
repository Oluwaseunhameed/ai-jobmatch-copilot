const API_BASE = '';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export interface UserPreferences {
  id: string;
  userId: string;
  theme: string;
  locale: string;
  timezone: string;
  emailJobAlerts: boolean;
  emailApplicationUpdates: boolean;
  emailWeeklyDigest: boolean;
  emailMarketing: boolean;
  pushEnabled: boolean;
  onboardingCompleted: boolean;
}

export function getPreferences() {
  return apiFetch<UserPreferences>('/api/users/me/preferences');
}

export function updatePreferences(data: Partial<UserPreferences>) {
  return apiFetch<UserPreferences>('/api/users/me/preferences', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function completeOnboarding() {
  return apiFetch<UserPreferences>('/api/users/me/preferences/onboarding/complete', {
    method: 'POST',
  });
}

export interface ProfileSkill {
  id?: string;
  name: string;
  category: string;
  level?: string | null;
  years?: number | null;
}

export interface CareerProfile {
  id: string;
  userId: string;
  headline: string | null;
  summary: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  timeZone: string | null;
  portfolioUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  currentJobTitle: string | null;
  yearsOfExperience: number | null;
  desiredRoles: string[];
  employmentType: string | null;
  salaryExpectation: number | null;
  salaryCurrency: string | null;
  noticePeriodDays: number | null;
  workAuthorization: string | null;
  visaSponsorshipNeeded: boolean;
  workLocationPreference: string | null;
  completenessScore: number;
  skills: ProfileSkill[];
  createdAt: string;
  updatedAt: string;
}

export function getProfile() {
  return apiFetch<CareerProfile>('/api/users/me/profile');
}

export function updateProfile(data: Partial<CareerProfile> & { skills?: ProfileSkill[] }) {
  return apiFetch<CareerProfile>('/api/users/me/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
