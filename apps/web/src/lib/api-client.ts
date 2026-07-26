const API_BASE = '';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
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

export interface ResumeVersion {
  id: string;
  resumeId: string;
  label: string;
  source: string;
  contentText: string | null;
  contentJson: unknown | null;
  createdAt: string;
}

export interface Resume {
  id: string;
  userId: string;
  title: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  storageProvider: string;
  isPrimary: boolean;
  parseStatus: string;
  parseError: string | null;
  parsedText: string | null;
  parsedJson: unknown | null;
  createdAt: string;
  updatedAt: string;
  versions?: ResumeVersion[];
}

export function listResumes() {
  return apiFetch<Resume[]>('/api/users/me/resumes');
}

export async function uploadResume(file: File, title?: string) {
  const form = new FormData();
  form.append('file', file);
  if (title?.trim()) form.append('title', title.trim());

  const res = await fetch('/api/users/me/resumes', {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<Resume>;
}

export function updateResume(id: string, data: { title?: string; isPrimary?: boolean }) {
  return apiFetch<Resume>(`/api/users/me/resumes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function setPrimaryResume(id: string) {
  return apiFetch<Resume>(`/api/users/me/resumes/${id}/primary`, {
    method: 'POST',
  });
}

export function parseResume(id: string) {
  return apiFetch<Resume>(`/api/users/me/resumes/${id}/parse`, {
    method: 'POST',
  });
}

export function applyResumeToProfile(
  id: string,
  options?: { applyHeadline?: boolean; applySummary?: boolean; applySkills?: boolean },
) {
  return apiFetch<CareerProfile>(`/api/users/me/resumes/${id}/apply`, {
    method: 'POST',
    body: JSON.stringify(options ?? {}),
  });
}

export type ParsedResumeLlm = {
  enabled?: boolean;
  used?: boolean;
  model?: string | null;
  error?: string | null;
  durationMs?: number | null;
};

export type ParsedResumeJson = {
  headline?: string | null;
  summary?: string | null;
  skills?: string[];
  emails?: string[];
  phones?: string[];
  links?: string[];
  source?: string;
  status?: string;
  llm?: ParsedResumeLlm;
  parsedAt?: string;
};

/** Human-readable description of which extraction layers contributed. */
export function describeParseSource(parsed: ParsedResumeJson | null) {
  if (!parsed) return null;
  return parsed.llm?.used ? 'Rules + AI model' : 'Rule-based extraction';
}

export function getParsedJson(resume: Resume): ParsedResumeJson | null {
  if (!resume.parsedJson || typeof resume.parsedJson !== 'object') return null;
  return resume.parsedJson as ParsedResumeJson;
}

export function deleteResume(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/users/me/resumes/${id}`, {
    method: 'DELETE',
  });
}

export function resumeDownloadUrl(id: string) {
  return `/api/users/me/resumes/${id}/download`;
}
