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

export interface JobCompany {
  id: string;
  name: string;
  slug: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  industry: string | null;
  size: string | null;
  location: string | null;
  about: string | null;
}

export interface Job {
  id: string;
  slug: string;
  title: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  skills: string[];
  employmentType: string;
  workMode: string;
  seniority: string;
  location: string | null;
  city: string | null;
  country: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryPeriod: string;
  source: string;
  sourceUrl: string | null;
  applyUrl: string | null;
  postedAt: string;
  expiresAt: string | null;
  isActive: boolean;
  company: JobCompany;
  score?: number;
  isSaved?: boolean;
}

export interface JobSearchFacet {
  value: string;
  count: number;
}

export interface JobSearchResult {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
  mode: 'keyword' | 'semantic' | 'hybrid';
  degradedReason?: string;
  facets: {
    workMode: JobSearchFacet[];
    employmentType: JobSearchFacet[];
    seniority: JobSearchFacet[];
  };
}

export type JobSearchQuery = {
  q?: string;
  workMode?: string[];
  employmentType?: string[];
  seniority?: string[];
  country?: string;
  salaryMin?: number;
  sort?: 'relevance' | 'recent' | 'salary';
  page?: number;
  limit?: number;
};

function toSearchParams(query: JobSearchQuery) {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set('q', query.q.trim());
  if (query.workMode?.length) params.set('workMode', query.workMode.join(','));
  if (query.employmentType?.length) params.set('employmentType', query.employmentType.join(','));
  if (query.seniority?.length) params.set('seniority', query.seniority.join(','));
  if (query.country) params.set('country', query.country);
  if (query.salaryMin) params.set('salaryMin', String(query.salaryMin));
  if (query.sort) params.set('sort', query.sort);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  return params;
}

export function searchJobs(query: JobSearchQuery = {}) {
  const params = toSearchParams(query);
  const qs = params.toString();
  return apiFetch<JobSearchResult>(`/api/jobs${qs ? `?${qs}` : ''}`);
}

export function getJob(slug: string) {
  return apiFetch<Job>(`/api/jobs/${encodeURIComponent(slug)}`);
}

export function listSavedJobs() {
  return apiFetch<{ jobs: Job[] }>('/api/jobs/saved');
}

export function saveJob(slug: string) {
  return apiFetch<{ saved: boolean }>(`/api/jobs/${encodeURIComponent(slug)}/save`, {
    method: 'POST',
  });
}

export function unsaveJob(slug: string) {
  return apiFetch<{ saved: boolean }>(`/api/jobs/${encodeURIComponent(slug)}/save`, {
    method: 'DELETE',
  });
}

export function formatSalary(
  job: Pick<Job, 'salaryMin' | 'salaryMax' | 'salaryCurrency' | 'salaryPeriod'>,
) {
  if (!job.salaryMin && !job.salaryMax) return null;

  const currency = job.salaryCurrency || 'USD';
  const format = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);

  const range =
    job.salaryMin && job.salaryMax
      ? `${format(job.salaryMin)}–${format(job.salaryMax)}`
      : format(job.salaryMin ?? job.salaryMax ?? 0);

  const period =
    job.salaryPeriod === 'year'
      ? 'yr'
      : job.salaryPeriod === 'month'
        ? 'mo'
        : job.salaryPeriod === 'day'
          ? 'day'
          : job.salaryPeriod === 'hour'
            ? 'hr'
            : job.salaryPeriod;

  return `${range} / ${period}`;
}

export function formatPostedAt(iso: string) {
  const posted = new Date(iso);
  const days = Math.floor((Date.now() - posted.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return posted.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
