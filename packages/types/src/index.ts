export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type SkillCategory =
  | 'technical'
  | 'soft'
  | 'language'
  | 'tool'
  | 'domain'
  | 'other';

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
