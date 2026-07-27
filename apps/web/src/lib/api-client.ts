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

export type CodingProblem = {
  id: string;
  title: string;
  style: 'leetcode' | 'hackerrank' | 'takehome' | string;
  difficulty: 'easy' | 'medium' | 'hard' | string;
  topics: string[];
  prompt: string;
  constraints: string[];
  examples: string[];
  hints: string[];
  approach: string;
  reviewChecklist: string[];
  timeLimitMinutes: number;
};

export type CodingAttempt = {
  problemId: string;
  status: 'todo' | 'attempted' | 'solved' | 'skipped';
  minutesSpent: number | null;
  selfRating: number | null;
  notes?: string | null;
};

export type CodingPracticeSession = {
  id: string;
  userId: string;
  jobId: string | null;
  status: string;
  styles: string[];
  difficulties: string[];
  problems: CodingProblem[];
  attempts: CodingAttempt[];
  performanceScore: number | null;
  timeBudgetMinutes: number | null;
  performance: {
    solved: number;
    attempted: number;
    skipped: number;
    total: number;
    avgSelfRating: number | null;
    timeUsedMinutes: number;
    timeBudgetMinutes: number;
    score: number;
    detail: string;
  } | null;
  summary: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  job?: {
    id: string;
    title: string;
    slug: string;
    companyName: string;
  } | null;
};

export const CODING_STYLE_LABELS: Record<string, string> = {
  leetcode: 'LeetCode-style',
  hackerrank: 'HackerRank-style',
  takehome: 'Take-home',
};

export function listCodingSessions(jobId?: string) {
  const qs = jobId ? `?jobId=${encodeURIComponent(jobId)}` : '';
  return apiFetch<{ codingSessions: CodingPracticeSession[] }>(
    `/api/users/me/coding-sessions${qs}`,
  );
}

export function createCodingSession(input?: {
  jobId?: string | null;
  styles?: string[];
  difficulties?: string[];
  limit?: number;
}) {
  return apiFetch<CodingPracticeSession>('/api/users/me/coding-sessions', {
    method: 'POST',
    body: JSON.stringify(input ?? {}),
  });
}

export function getCodingSession(id: string) {
  return apiFetch<CodingPracticeSession>(
    `/api/users/me/coding-sessions/${encodeURIComponent(id)}`,
  );
}

export function updateCodingAttempts(id: string, attempts: CodingAttempt[]) {
  return apiFetch<CodingPracticeSession>(
    `/api/users/me/coding-sessions/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ attempts }),
    },
  );
}

export function deleteCodingSession(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/users/me/coding-sessions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export type CoachFocus =
  | 'skill_gaps'
  | 'roadmap'
  | 'salary'
  | 'promotion'
  | 'career_path'
  | 'general';

export type CoachMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source?: string;
  createdAt: string;
};

export type CareerCoachSession = {
  id: string;
  userId: string;
  status: string;
  focus: CoachFocus | string;
  title: string | null;
  messages: CoachMessage[];
  context: {
    summary: string;
    topGaps: Array<{ skill: string; priority: string; reason: string }>;
    roadmapSteps: Array<{ title: string; skill: string; estimatedHours: number | null }>;
    certifications: Array<{ name: string; skill: string }>;
    careerPaths: Array<{ title: string; readinessPct: number; detail: string }>;
    salaryDetail: string | null;
    promotion: {
      score: number;
      level: string;
      targetSeniority: string;
      detail: string;
      checklistOpen: string[];
    };
    market: { activeJobs: number; skillsAnalyzed: number };
  } | null;
  summary: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export const COACH_FOCUS_LABELS: Record<CoachFocus, string> = {
  skill_gaps: 'Skill gaps',
  roadmap: 'Learning roadmap',
  salary: 'Salary growth',
  promotion: 'Promotion readiness',
  career_path: 'Career paths',
  general: 'General coaching',
};

export function listCoachSessions() {
  return apiFetch<{ coachSessions: CareerCoachSession[] }>('/api/users/me/coach-sessions');
}

export function createCoachSession(input?: { focus?: string; message?: string | null }) {
  return apiFetch<CareerCoachSession>('/api/users/me/coach-sessions', {
    method: 'POST',
    body: JSON.stringify(input ?? {}),
  });
}

export function getCoachSession(id: string) {
  return apiFetch<CareerCoachSession>(`/api/users/me/coach-sessions/${encodeURIComponent(id)}`);
}

export function sendCoachMessage(id: string, message: string) {
  return apiFetch<CareerCoachSession>(`/api/users/me/coach-sessions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ message }),
  });
}

export async function streamCoachMessage(
  id: string,
  message: string,
  handlers: {
    onUser?: (message: CoachMessage) => void;
    onAssistantStart?: (message: CoachMessage) => void;
    onToken?: (text: string) => void;
    onDone?: (session: CareerCoachSession) => void;
  },
) {
  const res = await fetch(`/api/users/me/coach-sessions/${encodeURIComponent(id)}/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ message }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
  }
  if (!res.body) {
    throw new Error('Streaming is not available');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completed = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const line = part
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l.startsWith('data:'));
      if (!line) continue;
      const raw = line.slice(5).trim();
      if (!raw) continue;

      const event = JSON.parse(raw) as {
        type: string;
        message?: CoachMessage;
        text?: string;
        session?: CareerCoachSession;
        source?: string;
      };

      if (event.type === 'error') {
        throw new Error(
          (event as { message?: string }).message ?? 'Could not stream coach reply',
        );
      }
      if (event.type === 'user' && event.message) handlers.onUser?.(event.message);
      if (event.type === 'assistant_start' && event.message) {
        handlers.onAssistantStart?.(event.message);
      }
      if (event.type === 'token' && event.text) handlers.onToken?.(event.text);
      if (event.type === 'done' && event.session) {
        completed = true;
        handlers.onDone?.(event.session);
      }
    }
  }

  if (!completed) {
    throw new Error('Coach stream ended before completion');
  }
}

export function deleteCoachSession(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/users/me/coach-sessions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export type PortfolioProjectStatus = 'draft' | 'in_progress' | 'shipped' | 'archived';

export type PortfolioProject = {
  id: string;
  userId: string;
  title: string;
  summary: string | null;
  role: string | null;
  status: PortfolioProjectStatus | string;
  techStack: string[];
  highlights: string[];
  problem: string | null;
  solution: string | null;
  impact: string | null;
  repoUrl: string | null;
  demoUrl: string | null;
  startMonth: string | null;
  endMonth: string | null;
  isFeatured: boolean;
  sortOrder: number;
  source: string;
  suggestedSkill: string | null;
  resumeBullets: string[];
  createdAt: string;
  updatedAt: string;
};

export type PortfolioBrief = {
  summary: string;
  projectCount: number;
  featuredCount: number;
  shippedCount: number;
  readinessScore: number;
  missing: string[];
  suggestions: Array<{
    id: string;
    title: string;
    summary: string;
    skill: string;
    priority: string;
    techStack: string[];
    starterHighlights: string[];
    detail: string;
  }>;
  projects: PortfolioProject[];
  profileLinks: {
    portfolioUrl: string | null;
    githubUrl: string | null;
    websiteUrl: string | null;
  };
};

export const PORTFOLIO_PROJECT_STATUSES: PortfolioProjectStatus[] = [
  'draft',
  'in_progress',
  'shipped',
  'archived',
];

export const PORTFOLIO_STATUS_LABELS: Record<PortfolioProjectStatus, string> = {
  draft: 'Draft',
  in_progress: 'In progress',
  shipped: 'Shipped',
  archived: 'Archived',
};

export function getPortfolioBrief() {
  return apiFetch<PortfolioBrief>('/api/users/me/portfolio');
}

export function createPortfolioProject(input: {
  title: string;
  summary?: string | null;
  role?: string | null;
  status?: string;
  techStack?: string[];
  highlights?: string[];
  problem?: string | null;
  solution?: string | null;
  impact?: string | null;
  repoUrl?: string | null;
  demoUrl?: string | null;
  startMonth?: string | null;
  endMonth?: string | null;
  isFeatured?: boolean;
  sortOrder?: number;
  source?: string;
  suggestedSkill?: string | null;
}) {
  return apiFetch<PortfolioProject>('/api/users/me/portfolio', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function createPortfolioProjectFromSuggestion(input: {
  suggestionId?: string;
  skill?: string;
}) {
  return apiFetch<PortfolioProject>('/api/users/me/portfolio', {
    method: 'POST',
    body: JSON.stringify({ fromSuggestion: true, ...input }),
  });
}

export function updatePortfolioProject(
  id: string,
  input: Partial<{
    title: string;
    summary: string | null;
    role: string | null;
    status: string;
    techStack: string[];
    highlights: string[];
    problem: string | null;
    solution: string | null;
    impact: string | null;
    repoUrl: string | null;
    demoUrl: string | null;
    startMonth: string | null;
    endMonth: string | null;
    isFeatured: boolean;
    sortOrder: number;
  }>,
) {
  return apiFetch<PortfolioProject>(`/api/users/me/portfolio/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deletePortfolioProject(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/users/me/portfolio/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export type NetworkingRoleType =
  | 'recruiter'
  | 'hiring_manager'
  | 'engineer'
  | 'founder'
  | 'other';

export type NetworkingContactStatus =
  | 'to_contact'
  | 'researched'
  | 'reached_out'
  | 'conversing'
  | 'closed';

export type NetworkingContact = {
  id: string;
  userId: string;
  companyId: string | null;
  companyName: string | null;
  fullName: string;
  roleType: NetworkingRoleType | string;
  title: string | null;
  profileUrl: string | null;
  email: string | null;
  status: NetworkingContactStatus | string;
  notes: string | null;
  relatedJobId: string | null;
  lastTouchedAt: string | null;
  createdAt: string;
  updatedAt: string;
  company?: {
    id: string;
    name: string;
    slug: string;
    websiteUrl: string | null;
  } | null;
};

export type NetworkingTarget = {
  id: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  websiteUrl: string | null;
  industry: string | null;
  location: string | null;
  reason: string;
  source: string;
  openRoles: number;
  sampleJob?: {
    id: string;
    title: string;
    slug: string;
    applyUrl: string | null;
    sourceUrl: string | null;
  } | null;
  researchLinks: Array<{ label: string; url: string }>;
};

export type NetworkingTalkTrack = {
  id: string;
  channel: 'email' | 'linkedin_dm' | 'careers_note' | string;
  title: string;
  subject: string | null;
  body: string;
  detail: string;
};

export type NetworkingHub = {
  summary: string;
  contactCount: number;
  activeCount: number;
  contacts: NetworkingContact[];
  targets: NetworkingTarget[];
  talkTracks: NetworkingTalkTrack[];
};

export const NETWORKING_ROLE_TYPES: NetworkingRoleType[] = [
  'recruiter',
  'hiring_manager',
  'engineer',
  'founder',
  'other',
];

export const NETWORKING_CONTACT_STATUSES: NetworkingContactStatus[] = [
  'to_contact',
  'researched',
  'reached_out',
  'conversing',
  'closed',
];

export const NETWORKING_ROLE_LABELS: Record<NetworkingRoleType, string> = {
  recruiter: 'Recruiter',
  hiring_manager: 'Hiring manager',
  engineer: 'Engineer',
  founder: 'Founder',
  other: 'Other',
};

export const NETWORKING_STATUS_LABELS: Record<NetworkingContactStatus, string> = {
  to_contact: 'To contact',
  researched: 'Researched',
  reached_out: 'Reached out',
  conversing: 'Conversing',
  closed: 'Closed',
};

export function getNetworkingHub() {
  return apiFetch<NetworkingHub>('/api/users/me/network');
}

export function createNetworkingContact(input: {
  fullName: string;
  companyId?: string | null;
  companyName?: string | null;
  roleType?: string;
  title?: string | null;
  profileUrl?: string | null;
  email?: string | null;
  status?: string;
  notes?: string | null;
  relatedJobId?: string | null;
}) {
  return apiFetch<NetworkingContact>('/api/users/me/network', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateNetworkingContact(
  id: string,
  input: {
    fullName: string;
    companyId?: string | null;
    companyName?: string | null;
    roleType?: string;
    title?: string | null;
    profileUrl?: string | null;
    email?: string | null;
    status?: string;
    notes?: string | null;
    relatedJobId?: string | null;
  },
) {
  return apiFetch<NetworkingContact>(`/api/users/me/network/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteNetworkingContact(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/users/me/network/${encodeURIComponent(id)}`, {
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
