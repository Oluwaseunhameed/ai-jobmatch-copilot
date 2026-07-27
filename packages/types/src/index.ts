export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type SkillCategory = 'technical' | 'soft' | 'language' | 'tool' | 'domain' | 'other';

export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship';

export type WorkLocationPreference = 'remote' | 'hybrid' | 'on-site';

export type ResumeParseStatus = 'idle' | 'queued' | 'processing' | 'ready' | 'failed';

export type ResumeStorageProvider = 'local' | 's3';

export type ResumeVersionSource = 'upload' | 'optimized' | 'manual';

export interface ResumeVersionDto {
  id: string;
  resumeId: string;
  label: string;
  source: ResumeVersionSource | string;
  contentText: string | null;
  contentJson: unknown | null;
  createdAt: string;
}

export interface ResumeDto {
  id: string;
  userId: string;
  title: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  storageProvider: ResumeStorageProvider | string;
  isPrimary: boolean;
  parseStatus: ResumeParseStatus | string;
  parseError: string | null;
  parsedText: string | null;
  parsedJson: unknown | null;
  createdAt: string;
  updatedAt: string;
  versions?: ResumeVersionDto[];
}

export interface UpdateResumeInput {
  title?: string;
  isPrimary?: boolean;
}

export interface ParsedResumeData {
  headline?: string | null;
  summary?: string | null;
  skills?: string[];
  emails?: string[];
  phones?: string[];
  links?: string[];
  source?: string;
  status?: string;
}

/** Job discovery (Module 5) */
export type JobSeniority = 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'principal';

export type JobSource = 'seed' | 'adzuna' | 'remotive' | 'manual';

export type JobEmbeddingStatus = 'idle' | 'queued' | 'processing' | 'ready' | 'failed';

export type JobInteractionType = 'saved' | 'viewed' | 'dismissed';

export type SalaryPeriod = 'year' | 'month' | 'day' | 'hour';

/** How a result was ranked. `semantic` and `hybrid` require job embeddings. */
export type JobSearchMode = 'keyword' | 'semantic' | 'hybrid';

export type JobSortOption = 'relevance' | 'recent' | 'salary' | 'match';

/** Profile↔job skill overlap (Module 6). Score is job-skill coverage, 0–100. */
export interface JobSkillMatch {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface CompanyDto {
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

export interface JobDto {
  id: string;
  slug: string;
  title: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  skills: string[];
  employmentType: EmploymentType | string;
  workMode: WorkLocationPreference | string;
  seniority: JobSeniority | string;
  location: string | null;
  city: string | null;
  country: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryPeriod: SalaryPeriod | string;
  source: JobSource | string;
  sourceUrl: string | null;
  applyUrl: string | null;
  postedAt: string;
  expiresAt: string | null;
  isActive: boolean;
  company: CompanyDto;
  /** Present on search results only. Higher is better search relevance (FTS/RRF). */
  score?: number;
  /** True when the signed-in user has saved this job. */
  isSaved?: boolean;
  /** Skill overlap vs the viewer's career profile (Module 6). */
  matchScore?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
}

export interface JobSearchParams {
  q?: string;
  workMode?: string[];
  employmentType?: string[];
  seniority?: string[];
  country?: string;
  salaryMin?: number;
  sort?: JobSortOption;
  page?: number;
  limit?: number;
}

export interface JobSearchFacet {
  value: string;
  count: number;
}

export interface JobSearchResponse {
  jobs: JobDto[];
  total: number;
  page: number;
  limit: number;
  /** Which ranking strategy actually ran, which may differ from the one requested. */
  mode: JobSearchMode;
  /** Set when semantic ranking was wanted but unavailable, so the UI can explain. */
  degradedReason?: string;
  /** Skills on the viewer's career profile used for match scoring. */
  profileSkillCount?: number;
  facets: {
    workMode: JobSearchFacet[];
    employmentType: JobSearchFacet[];
    seniority: JobSearchFacet[];
  };
}

export interface SkillInput {
  name: string;
  category: SkillCategory | string;
  level?: SkillLevel | string | null;
  years?: number | null;
}

export interface SkillDto extends SkillInput {
  id: string;
  profileId: string;
  createdAt: string;
}

export interface CareerProfileDto {
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
  skills: SkillDto[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCareerProfileInput {
  headline?: string | null;
  summary?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  timeZone?: string | null;
  portfolioUrl?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  websiteUrl?: string | null;
  currentJobTitle?: string | null;
  yearsOfExperience?: number | null;
  desiredRoles?: string[];
  employmentType?: EmploymentType | string | null;
  salaryExpectation?: number | null;
  salaryCurrency?: string | null;
  noticePeriodDays?: number | null;
  workAuthorization?: string | null;
  visaSponsorshipNeeded?: boolean;
  workLocationPreference?: WorkLocationPreference | string | null;
  skills?: SkillInput[];
}

/**
 * Shared API response envelope used across web, API, and AI service.
 */
export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  timestamp: string;
}

/** Subscription & billing (Module 19). Lemon Squeezy (global) + Paystack (Nigeria). */
export type PlanId = 'free' | 'pro';

export type BillingProvider = 'lemon_squeezy' | 'paystack';

export type PlanLimits = {
  maxResumes: number;
  maxSavedJobs: number;
  aiOptimizePerMonth: number;
  aiCoverLettersPerMonth: number;
};

export const FREE_PLAN_ID: PlanId = 'free';
export const PRO_PLAN_ID: PlanId = 'pro';

export const FREE_PLAN_LIMITS: PlanLimits = {
  maxResumes: 5,
  maxSavedJobs: 50,
  aiOptimizePerMonth: 5,
  aiCoverLettersPerMonth: 5,
};

export const PRO_PLAN_LIMITS: PlanLimits = {
  maxResumes: 50,
  maxSavedJobs: 500,
  aiOptimizePerMonth: 50,
  aiCoverLettersPerMonth: 50,
};

export const PLAN_LABELS: Record<PlanId, string> = {
  free: 'Free',
  pro: 'Pro',
};

/** Application pipeline stages (Module 11) */
export type ApplicationStage =
  | 'saved'
  | 'preparing'
  | 'applied'
  | 'assessment'
  | 'hr_interview'
  | 'technical_interview'
  | 'final_interview'
  | 'offer'
  | 'accepted'
  | 'rejected';

export const APPLICATION_STAGES: ApplicationStage[] = [
  'saved',
  'preparing',
  'applied',
  'assessment',
  'hr_interview',
  'technical_interview',
  'final_interview',
  'offer',
  'accepted',
  'rejected',
];

export const APPLICATION_STAGE_LABELS: Record<ApplicationStage, string> = {
  saved: 'Saved',
  preparing: 'Preparing',
  applied: 'Applied',
  assessment: 'Assessment',
  hr_interview: 'HR interview',
  technical_interview: 'Technical',
  final_interview: 'Final',
  offer: 'Offer',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

export function isApplicationStage(value: string): value is ApplicationStage {
  return (APPLICATION_STAGES as string[]).includes(value);
}
