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

export type ResumeOptimization = {
  id: string;
  userId: string;
  resumeId: string;
  jobId: string;
  status: string;
  error: string | null;
  beforeScore: number | null;
  afterScore: number | null;
  versionId: string | null;
  createdAt: string;
  updatedAt: string;
  job?: { title: string; slug: string; companyName: string };
  version?: { id: string; label: string; source: string; createdAt: string } | null;
  before?: {
    text: string;
    headline: string | null;
    summary: string | null;
    skills: string[];
    atsScore: { score: number; matchedKeywords: string[]; missingKeywords: string[] };
  };
  after?: {
    text: string;
    headline: string | null;
    summary: string | null;
    skills: string[];
    atsScore: { score: number; matchedKeywords: string[]; missingKeywords: string[] };
  };
  source?: string;
  llm?: {
    enabled: boolean;
    used: boolean;
    model: string | null;
    error: string | null;
    durationMs?: number | null;
  };
};

export function startResumeOptimize(resumeId: string, jobId: string) {
  return apiFetch<ResumeOptimization>(`/api/users/me/resumes/${resumeId}/optimize`, {
    method: 'POST',
    body: JSON.stringify({ jobId }),
  });
}

export function getResumeOptimization(resumeId: string, optimizationId: string) {
  return apiFetch<ResumeOptimization>(
    `/api/users/me/resumes/${resumeId}/optimizations/${optimizationId}`,
  );
}

export function getLatestResumeOptimization(resumeId: string, jobId: string) {
  const qs = new URLSearchParams({ jobId });
  return apiFetch<ResumeOptimization>(
    `/api/users/me/resumes/${resumeId}/optimize?${qs.toString()}`,
  );
}

export type ApplicationDraft = {
  id: string;
  userId: string;
  resumeId: string;
  jobId: string;
  status: string;
  error: string | null;
  coverLetter: string | null;
  questions: string[];
  answers: { question: string; answer: string }[];
  createdAt: string;
  updatedAt: string;
  job?: { title: string; slug: string; companyName: string };
  source?: string;
  llm?: {
    enabled: boolean;
    used: boolean;
    model: string | null;
    error: string | null;
    durationMs?: number | null;
  };
};

export function startApplicationDraft(
  resumeId: string,
  jobId: string,
  questions?: string[],
) {
  return apiFetch<ApplicationDraft>('/api/users/me/application-drafts', {
    method: 'POST',
    body: JSON.stringify({ resumeId, jobId, questions }),
  });
}

export function getApplicationDraft(draftId: string) {
  return apiFetch<ApplicationDraft>(`/api/users/me/application-drafts/${draftId}`);
}

export function getLatestApplicationDraft(resumeId: string, jobId: string) {
  const qs = new URLSearchParams({ resumeId, jobId });
  return apiFetch<ApplicationDraft>(`/api/users/me/application-drafts?${qs.toString()}`);
}

export type Application = {
  id: string;
  userId: string;
  jobId: string;
  stage: string;
  stageLabel: string;
  notes: string | null;
  resumeId: string | null;
  draftId: string | null;
  createdAt: string;
  updatedAt: string;
  job?: {
    id: string;
    title: string;
    slug: string;
    location: string | null;
    workMode: string;
    applyUrl: string | null;
    companyName: string;
    companyLogoUrl: string | null;
  };
  resume?: { id: string; title: string } | null;
  draft?: { id: string; status: string } | null;
};

export function listApplications() {
  return apiFetch<{ applications: Application[] }>('/api/users/me/applications');
}

export function createApplication(input: {
  jobId: string;
  resumeId?: string | null;
  draftId?: string | null;
  stage?: string;
  notes?: string | null;
}) {
  return apiFetch<Application>('/api/users/me/applications', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getApplication(id: string) {
  return apiFetch<Application>(`/api/users/me/applications/${id}`);
}

export function updateApplication(
  id: string,
  input: {
    stage?: string;
    notes?: string | null;
    resumeId?: string | null;
    draftId?: string | null;
  },
) {
  return apiFetch<Application>(`/api/users/me/applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteApplication(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/users/me/applications/${id}`, {
    method: 'DELETE',
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
  matchScore?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
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
  profileSkillCount?: number;
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
  sort?: 'relevance' | 'recent' | 'salary' | 'match';
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

export type JobInsights = {
  jobId: string;
  jobSlug: string;
  matchScore: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  skillGaps: Array<{ skill: string; priority: 'high' | 'medium' | 'low'; reason: string }>;
  fitSignals: Array<{ key: string; label: string; level: 'strong' | 'partial' | 'gap' | 'unknown'; detail: string }>;
  learningRecommendations: Array<{
    skill: string;
    title: string;
    provider: string;
    url: string;
    type: 'course' | 'docs' | 'practice';
    estimatedHours?: number;
  }>;
  summary: string;
};

export function getJobInsights(slug: string) {
  return apiFetch<JobInsights>(`/api/jobs/${encodeURIComponent(slug)}/insights`);
}

export type CompanyProfile = {
  company: Job['company'];
  summary: string;
  hiring: {
    openRoles: number;
    postedLast30Days: number;
    postedLast90Days: number;
    velocity: 'accelerating' | 'steady' | 'slow' | 'unknown';
  };
  techStack: Array<{ skill: string; count: number }>;
  benefits: string[];
  locations: string[];
  workModeMix: Array<{ value: string; count: number }>;
  seniorityMix: Array<{ value: string; count: number }>;
  salaryEstimates: Array<{
    currency: string;
    period: string;
    min: number | null;
    max: number | null;
    median: number | null;
    roleCount: number;
  }>;
  cultureSignals: Array<{
    key: string;
    label: string;
    level: 'strong' | 'partial' | 'gap' | 'unknown';
    detail: string;
  }>;
  openRoles: Array<{
    id: string;
    slug: string;
    title: string;
    workMode: string;
    seniority: string;
    location: string | null;
    postedAt: string;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string;
    salaryPeriod: string;
    matchScore?: number;
  }>;
  viewer?: {
    savedRoles: number;
    applications: number;
    avgMatchScore: number | null;
  };
};

export function getCompanyProfile(slug: string) {
  return apiFetch<CompanyProfile>(`/api/companies/${encodeURIComponent(slug)}`);
}

export type CareerGrowthHub = {
  summary: string;
  skillGaps: Array<{
    skill: string;
    priority: 'high' | 'medium' | 'low';
    jobCount: number;
    demandPct: number;
    reason: string;
  }>;
  roadmap: Array<{
    order: number;
    skill: string;
    title: string;
    description: string;
    estimatedHours: number | null;
    resources: Array<{
      skill: string;
      title: string;
      provider: string;
      url: string;
      type: 'course' | 'docs' | 'practice';
      estimatedHours?: number;
    }>;
  }>;
  certifications: Array<{
    name: string;
    provider: string;
    skill: string;
    url: string;
    level: 'foundational' | 'associate' | 'professional';
  }>;
  trendingTechnologies: Array<{
    skill: string;
    jobCount: number;
    demandPct: number;
    have: boolean;
  }>;
  careerPaths: Array<{
    id: string;
    title: string;
    currentLevel: string;
    nextLevel: string;
    readinessPct: number;
    focusSkills: string[];
    detail: string;
  }>;
  salaryGrowth: {
    currency: string;
    period: string;
    expectation: number | null;
    profileCurrency?: string | null;
    marketMedian: number | null;
    marketMin: number | null;
    marketMax: number | null;
    roleCount: number;
    deltaPct: number | null;
    detail: string;
  } | null;
  promotionReadiness: {
    score: number;
    level: 'strong' | 'partial' | 'gap' | 'unknown';
    targetSeniority: string;
    yearsGap: number | null;
    skillCoveragePct: number | null;
    checklist: Array<{ id: string; label: string; done: boolean; detail: string }>;
    detail: string;
  };
  market: {
    activeJobs: number;
    skillsAnalyzed: number;
  };
};

export function getCareerGrowthHub() {
  return apiFetch<CareerGrowthHub>('/api/users/me/growth');
}

export type InterviewQuestion = {
  id: string;
  category: string;
  prompt: string;
  tip: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

export type InterviewPrep = {
  id: string;
  userId: string;
  jobId: string;
  status: string;
  categories: string[];
  questions: InterviewQuestion[];
  practice: Array<{ questionId: string; selfRating: number; notes?: string | null }>;
  confidenceScore: number | null;
  summary: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  job?: {
    id: string;
    title: string;
    slug: string;
    companyName: string;
  };
};

export const INTERVIEW_CATEGORY_LABELS: Record<string, string> = {
  behavioral: 'Behavioral',
  technical: 'Technical',
  coding: 'Coding',
  system_design: 'System design',
  database: 'Database',
  frontend: 'Frontend',
  backend: 'Backend',
  devops: 'DevOps',
};

export function listInterviewPreps(jobId?: string) {
  const qs = jobId ? `?jobId=${encodeURIComponent(jobId)}` : '';
  return apiFetch<{ interviewPreps: InterviewPrep[] }>(`/api/users/me/interview-preps${qs}`);
}

export function createInterviewPrep(jobId: string, categories?: string[]) {
  return apiFetch<InterviewPrep>('/api/users/me/interview-preps', {
    method: 'POST',
    body: JSON.stringify({ jobId, categories }),
  });
}

export function getInterviewPrep(id: string) {
  return apiFetch<InterviewPrep>(`/api/users/me/interview-preps/${encodeURIComponent(id)}`);
}

export function updateInterviewPractice(
  id: string,
  practice: Array<{ questionId: string; selfRating: number; notes?: string | null }>,
) {
  return apiFetch<InterviewPrep>(`/api/users/me/interview-preps/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ practice }),
  });
}

export function deleteInterviewPrep(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/users/me/interview-preps/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function listSavedJobs() {
  return apiFetch<{ jobs: Job[] }>('/api/jobs/saved');
}

export type SavedSearch = {
  id: string;
  name: string;
  query: JobSearchQuery;
  alertEnabled: boolean;
  lastAlertAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TrendingJob = {
  id: string;
  slug: string;
  title: string;
  companyName: string;
  workMode: string;
  location: string | null;
  postedAt: string;
  saveCount: number;
  viewCount: number;
  trendScore: number;
  matchScore?: number;
};

export function listSavedSearches() {
  return apiFetch<{ searches: SavedSearch[] }>('/api/users/me/saved-searches');
}

export function createSavedSearch(input: {
  name?: string;
  query: JobSearchQuery;
  alertEnabled?: boolean;
}) {
  return apiFetch<SavedSearch>('/api/users/me/saved-searches', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateSavedSearch(
  id: string,
  input: { name?: string; query?: JobSearchQuery; alertEnabled?: boolean },
) {
  return apiFetch<SavedSearch>(`/api/users/me/saved-searches/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteSavedSearch(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/users/me/saved-searches/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function listTrendingJobs(query: { days?: number; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (query.days) params.set('days', String(query.days));
  if (query.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  return apiFetch<{ jobs: TrendingJob[]; days: number }>(
    `/api/jobs/trending${qs ? `?${qs}` : ''}`,
  );
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
