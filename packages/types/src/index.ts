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
  experience?: Array<{
    title: string;
    company: string;
    location?: string | null;
    startMonth?: string | null;
    endMonth?: string | null;
    isCurrent?: boolean;
    description?: string | null;
    highlights?: string[];
  }>;
  education?: Array<{
    school: string;
    degree?: string | null;
    field?: string | null;
    startYear?: number | null;
    endYear?: number | null;
    description?: string | null;
  }>;
  source?: string;
  status?: string;
}

/** Job discovery (Module 5) */
export type JobSeniority = 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'principal';

export type JobSource =
  | 'seed'
  | 'manual'
  | 'remotive'
  | 'himalayas'
  | 'jobicy'
  | 'arbeitnow'
  | 'remoteok'
  | 'adzuna'
  | 'usajobs'
  | 'greenhouse'
  | 'lever'
  | 'ashby'
  | 'workable'
  | 'weworkremotely';

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

/** Rich job insights (Module 6) — built on deterministic skill coverage + profile fit signals. */
export type FitLevel = 'strong' | 'partial' | 'gap' | 'unknown';

export interface FitSignal {
  key: string;
  label: string;
  level: FitLevel;
  detail: string;
}

export interface SkillGapItem {
  skill: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

export interface LearningRecommendation {
  skill: string;
  title: string;
  provider: string;
  url: string;
  type: 'course' | 'docs' | 'practice';
  estimatedHours?: number;
}

export interface JobInsightsDto {
  jobId: string;
  jobSlug: string;
  matchScore: number | null;
  matchedSkills: string[];
  missingSkills: string[];
  skillGaps: SkillGapItem[];
  fitSignals: FitSignal[];
  learningRecommendations: LearningRecommendation[];
  summary: string;
  /** LLM narrative themes (must-haves, culture, red flags, etc.) */
  themes?: string[];
  /** template | llm */
  source?: string;
  llm?: {
    enabled?: boolean;
    used?: boolean;
    model?: string | null;
    error?: string | null;
    durationMs?: number | null;
  };
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

/** Persistable search filters for saved searches / job alerts (Module 5). */
export type SavedSearchQuery = Pick<
  JobSearchParams,
  'q' | 'workMode' | 'employmentType' | 'seniority' | 'country' | 'salaryMin' | 'sort'
>;

export interface SavedSearchDto {
  id: string;
  name: string;
  query: SavedSearchQuery;
  alertEnabled: boolean;
  lastAlertAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Trending roles ranked by recent saves + views (Module 5). */
export interface TrendingJobDto {
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

export interface EducationDto {
  id: string;
  school: string;
  degree: string | null;
  field: string | null;
  startYear: number | null;
  endYear: number | null;
  description: string | null;
  sortOrder: number;
}

export interface WorkExperienceDto {
  id: string;
  title: string;
  company: string;
  location: string | null;
  startMonth: string | null;
  endMonth: string | null;
  isCurrent: boolean;
  description: string | null;
  highlights: string[];
  sortOrder: number;
}

export interface EducationInput {
  school: string;
  degree?: string | null;
  field?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  description?: string | null;
  sortOrder?: number;
}

export interface WorkExperienceInput {
  title: string;
  company: string;
  location?: string | null;
  startMonth?: string | null;
  endMonth?: string | null;
  isCurrent?: boolean;
  description?: string | null;
  highlights?: string[];
  sortOrder?: number;
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
  education: EducationDto[];
  workExperience: WorkExperienceDto[];
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
  education?: EducationInput[];
  workExperience?: WorkExperienceInput[];
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
  /** Optional dependency probes (used by `/ready`). */
  checks?: Record<string, 'ok' | 'error' | 'skipped'>;
}

/** Subscription & billing (Module 19). Lemon Squeezy (global) + Paystack (Nigeria). */
export type PlanId = 'free' | 'pro' | 'team';

export type BillingProvider = 'lemon_squeezy' | 'paystack';

export type PlanLimits = {
  maxResumes: number;
  maxSavedJobs: number;
  aiOptimizePerMonth: number;
  aiCoverLettersPerMonth: number;
  /** Team seats (owner + coaches + members). Free/Pro = 0. */
  maxTeamSeats: number;
};

export const FREE_PLAN_ID: PlanId = 'free';
export const PRO_PLAN_ID: PlanId = 'pro';
export const TEAM_PLAN_ID: PlanId = 'team';

export const FREE_PLAN_LIMITS: PlanLimits = {
  maxResumes: 5,
  maxSavedJobs: 50,
  aiOptimizePerMonth: 5,
  aiCoverLettersPerMonth: 5,
  maxTeamSeats: 0,
};

export const PRO_PLAN_LIMITS: PlanLimits = {
  maxResumes: 50,
  maxSavedJobs: 500,
  aiOptimizePerMonth: 50,
  aiCoverLettersPerMonth: 50,
  maxTeamSeats: 0,
};

export const TEAM_PLAN_LIMITS: PlanLimits = {
  maxResumes: 100,
  maxSavedJobs: 1000,
  aiOptimizePerMonth: 100,
  aiCoverLettersPerMonth: 100,
  maxTeamSeats: 10,
};

export const PLAN_LABELS: Record<PlanId, string> = {
  free: 'Free',
  pro: 'Pro',
  team: 'Team',
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

// ---------------------------------------------------------------------------
// Company intelligence — Module 7
// ---------------------------------------------------------------------------

export type HiringVelocity = 'accelerating' | 'steady' | 'slow' | 'unknown';

export interface CompanyHiringStatsDto {
  openRoles: number;
  postedLast30Days: number;
  postedLast90Days: number;
  velocity: HiringVelocity;
}

export interface CompanySkillStatDto {
  skill: string;
  count: number;
}

export interface CompanyMixStatDto {
  value: string;
  count: number;
}

export interface CompanySalaryEstimateDto {
  currency: string;
  period: string;
  min: number | null;
  max: number | null;
  median: number | null;
  roleCount: number;
}

export interface CompanyCultureSignalDto {
  key: string;
  label: string;
  level: FitLevel;
  detail: string;
}

export interface CompanyOpenRoleDto {
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
}

export interface CompanyViewerStatsDto {
  savedRoles: number;
  applications: number;
  avgMatchScore: number | null;
}

export interface CompanyProfileDto {
  company: CompanyDto;
  summary: string;
  hiring: CompanyHiringStatsDto;
  techStack: CompanySkillStatDto[];
  benefits: string[];
  locations: string[];
  workModeMix: CompanyMixStatDto[];
  seniorityMix: CompanyMixStatDto[];
  salaryEstimates: CompanySalaryEstimateDto[];
  cultureSignals: CompanyCultureSignalDto[];
  openRoles: CompanyOpenRoleDto[];
  viewer?: CompanyViewerStatsDto;
}

// ---------------------------------------------------------------------------
// Career Growth Hub — Module 15
// ---------------------------------------------------------------------------

export interface MarketSkillDemandDto {
  skill: string;
  jobCount: number;
  /** Share of active jobs requesting this skill (0–100). */
  demandPct: number;
  have: boolean;
}

export interface GrowthSkillGapDto {
  skill: string;
  priority: 'high' | 'medium' | 'low';
  jobCount: number;
  demandPct: number;
  reason: string;
}

export interface RoadmapStepDto {
  order: number;
  skill: string;
  title: string;
  description: string;
  estimatedHours: number | null;
  resources: LearningRecommendation[];
}

export interface CertificationSuggestionDto {
  name: string;
  provider: string;
  skill: string;
  url: string;
  level: 'foundational' | 'associate' | 'professional';
}

export interface CareerPathSuggestionDto {
  id: string;
  title: string;
  currentLevel: string;
  nextLevel: string;
  readinessPct: number;
  focusSkills: string[];
  detail: string;
}

export interface SalaryGrowthInsightDto {
  currency: string;
  period: string;
  expectation: number | null;
  /** Present when profile currency differs from catalog currency used for market figures. */
  profileCurrency?: string | null;
  marketMedian: number | null;
  marketMin: number | null;
  marketMax: number | null;
  roleCount: number;
  deltaPct: number | null;
  detail: string;
}

export interface PromotionReadinessDto {
  score: number;
  level: FitLevel;
  targetSeniority: string;
  yearsGap: number | null;
  skillCoveragePct: number | null;
  checklist: Array<{ id: string; label: string; done: boolean; detail: string }>;
  detail: string;
}

export interface CareerGrowthHubDto {
  summary: string;
  skillGaps: GrowthSkillGapDto[];
  roadmap: RoadmapStepDto[];
  certifications: CertificationSuggestionDto[];
  trendingTechnologies: MarketSkillDemandDto[];
  careerPaths: CareerPathSuggestionDto[];
  salaryGrowth: SalaryGrowthInsightDto | null;
  promotionReadiness: PromotionReadinessDto;
  market: {
    activeJobs: number;
    skillsAnalyzed: number;
  };
}

// ---------------------------------------------------------------------------
// Interview preparation — Module 12
// ---------------------------------------------------------------------------

export type InterviewQuestionCategory =
  | 'behavioral'
  | 'technical'
  | 'coding'
  | 'system_design'
  | 'database'
  | 'frontend'
  | 'backend'
  | 'devops';

export const INTERVIEW_QUESTION_CATEGORIES: InterviewQuestionCategory[] = [
  'behavioral',
  'technical',
  'coding',
  'system_design',
  'database',
  'frontend',
  'backend',
  'devops',
];

export const INTERVIEW_CATEGORY_LABELS: Record<InterviewQuestionCategory, string> = {
  behavioral: 'Behavioral',
  technical: 'Technical',
  coding: 'Coding',
  system_design: 'System design',
  database: 'Database',
  frontend: 'Frontend',
  backend: 'Backend',
  devops: 'DevOps',
};

export function isInterviewQuestionCategory(value: string): value is InterviewQuestionCategory {
  return (INTERVIEW_QUESTION_CATEGORIES as string[]).includes(value);
}

export type InterviewPrepStatus = 'ready' | 'practicing' | 'completed';

export interface InterviewQuestionDto {
  id: string;
  category: InterviewQuestionCategory;
  prompt: string;
  tip: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface InterviewPracticeEntryDto {
  questionId: string;
  /** 1–5 self-rating of answer confidence */
  selfRating: number;
  notes?: string | null;
  /** Optional full answer text for mock / LLM feedback */
  answer?: string | null;
  /** LLM or template feedback on the answer */
  feedback?: string | null;
  /** Suggested follow-up question from mock interviewer */
  followUp?: string | null;
  /** template | llm for this turn's feedback */
  feedbackSource?: string | null;
}

export interface InterviewPrepDto {
  id: string;
  userId: string;
  jobId: string;
  status: InterviewPrepStatus | string;
  categories: InterviewQuestionCategory[] | string[];
  questions: InterviewQuestionDto[];
  practice: InterviewPracticeEntryDto[];
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
}

// ---------------------------------------------------------------------------
// Coding assessment prep — Module 13
// ---------------------------------------------------------------------------

export type CodingProblemStyle = 'leetcode' | 'hackerrank' | 'takehome';
export type CodingDifficulty = 'easy' | 'medium' | 'hard';
export type CodingAttemptStatus = 'todo' | 'attempted' | 'solved' | 'skipped';
export type CodingSessionStatus = 'ready' | 'practicing' | 'completed';

export const CODING_PROBLEM_STYLES: CodingProblemStyle[] = [
  'leetcode',
  'hackerrank',
  'takehome',
];

export const CODING_DIFFICULTIES: CodingDifficulty[] = ['easy', 'medium', 'hard'];

export const CODING_STYLE_LABELS: Record<CodingProblemStyle, string> = {
  leetcode: 'LeetCode-style',
  hackerrank: 'HackerRank-style',
  takehome: 'Take-home',
};

export function isCodingProblemStyle(value: string): value is CodingProblemStyle {
  return (CODING_PROBLEM_STYLES as string[]).includes(value);
}

export function isCodingDifficulty(value: string): value is CodingDifficulty {
  return (CODING_DIFFICULTIES as string[]).includes(value);
}

export interface CodingProblemDto {
  id: string;
  title: string;
  style: CodingProblemStyle;
  difficulty: CodingDifficulty;
  topics: string[];
  prompt: string;
  constraints: string[];
  examples: string[];
  hints: string[];
  /** Suggested approach / outline — revealed as study aid, not a full solution dump */
  approach: string;
  /** Optional self-review checklist instead of full AI code review for MVP */
  reviewChecklist: string[];
  timeLimitMinutes: number;
}

export interface CodingAttemptDto {
  problemId: string;
  status: CodingAttemptStatus;
  /** Minutes the user spent (self-reported or timer) */
  minutesSpent: number | null;
  /** 1–5 confidence after attempting */
  selfRating: number | null;
  notes?: string | null;
  /** Optional pasted solution for AI review */
  code?: string | null;
  /** AI or template code review notes */
  review?: string | null;
  /** template | llm */
  reviewSource?: string | null;
}

export interface CodingPerformanceDto {
  solved: number;
  attempted: number;
  skipped: number;
  total: number;
  avgSelfRating: number | null;
  timeUsedMinutes: number;
  timeBudgetMinutes: number;
  score: number;
  detail: string;
}

export interface CodingPracticeSessionDto {
  id: string;
  userId: string;
  jobId: string | null;
  status: CodingSessionStatus | string;
  styles: CodingProblemStyle[] | string[];
  difficulties: CodingDifficulty[] | string[];
  problems: CodingProblemDto[];
  attempts: CodingAttemptDto[];
  performanceScore: number | null;
  timeBudgetMinutes: number | null;
  performance: CodingPerformanceDto | null;
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
}

// ---------------------------------------------------------------------------
// AI Career Coach — Module 16
// ---------------------------------------------------------------------------

export type CoachFocus =
  | 'skill_gaps'
  | 'roadmap'
  | 'salary'
  | 'promotion'
  | 'career_path'
  | 'general';

export type CoachSessionStatus = 'active' | 'archived';
export type CoachMessageRole = 'user' | 'assistant';

export const COACH_FOCUSES: CoachFocus[] = [
  'skill_gaps',
  'roadmap',
  'salary',
  'promotion',
  'career_path',
  'general',
];

export const COACH_FOCUS_LABELS: Record<CoachFocus, string> = {
  skill_gaps: 'Skill gaps',
  roadmap: 'Learning roadmap',
  salary: 'Salary growth',
  promotion: 'Promotion readiness',
  career_path: 'Career paths',
  general: 'General coaching',
};

export function isCoachFocus(value: string): value is CoachFocus {
  return (COACH_FOCUSES as string[]).includes(value);
}

export interface CoachMessageDto {
  id: string;
  role: CoachMessageRole;
  content: string;
  /** Present on assistant turns */
  source?: 'template' | 'llm' | string;
  createdAt: string;
}

export interface CoachContextDto {
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
  /** Wave 4 durable memory injected into coach prompts */
  memorySummary?: string;
  memoryFacts?: string[];
}

export interface CareerCoachSessionDto {
  id: string;
  userId: string;
  status: CoachSessionStatus | string;
  focus: CoachFocus | string;
  title: string | null;
  messages: CoachMessageDto[];
  context: CoachContextDto | null;
  summary: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

/** Cross-session coach memory (Wave 4). */
export interface CoachMemoryDto {
  userId: string;
  summary: string | null;
  facts: string[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Portfolio & Project Builder — Module 14
// ---------------------------------------------------------------------------

export type PortfolioProjectStatus = 'draft' | 'in_progress' | 'shipped' | 'archived';

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

export function isPortfolioProjectStatus(value: string): value is PortfolioProjectStatus {
  return (PORTFOLIO_PROJECT_STATUSES as string[]).includes(value);
}

export interface PortfolioProjectDto {
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
  /** Resume-ready bullets derived from highlights / STAR fields */
  resumeBullets: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioProjectSuggestionDto {
  id: string;
  title: string;
  summary: string;
  skill: string;
  priority: 'high' | 'medium' | 'low' | string;
  techStack: string[];
  starterHighlights: string[];
  detail: string;
}

export interface PortfolioBriefDto {
  summary: string;
  projectCount: number;
  featuredCount: number;
  shippedCount: number;
  readinessScore: number;
  missing: string[];
  suggestions: PortfolioProjectSuggestionDto[];
  projects: PortfolioProjectDto[];
  profileLinks: {
    portfolioUrl: string | null;
    githubUrl: string | null;
    websiteUrl: string | null;
  };
  /** Public hosted page slug when published */
  publicSlug: string | null;
  publicPath: string | null;
}

export interface PublicPortfolioDto {
  slug: string;
  displayName: string;
  headline: string | null;
  about: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  projects: PortfolioProjectDto[];
}

// ---------------------------------------------------------------------------
// Professional Networking — Module 8
// ---------------------------------------------------------------------------

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

export function isNetworkingRoleType(value: string): value is NetworkingRoleType {
  return (NETWORKING_ROLE_TYPES as string[]).includes(value);
}

export function isNetworkingContactStatus(value: string): value is NetworkingContactStatus {
  return (NETWORKING_CONTACT_STATUSES as string[]).includes(value);
}

export interface NetworkingContactDto {
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
}

export interface NetworkingTargetDto {
  id: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  websiteUrl: string | null;
  industry: string | null;
  location: string | null;
  reason: string;
  source: 'saved_job' | 'application' | 'viewed' | string;
  openRoles: number;
  sampleJob?: {
    id: string;
    title: string;
    slug: string;
    applyUrl: string | null;
    sourceUrl: string | null;
  } | null;
  researchLinks: Array<{ label: string; url: string }>;
}

export interface NetworkingTalkTrackDto {
  id: string;
  channel: 'email' | 'linkedin_dm' | 'careers_note';
  title: string;
  subject: string | null;
  body: string;
  detail: string;
}

export interface NetworkingHubDto {
  summary: string;
  contactCount: number;
  activeCount: number;
  contacts: NetworkingContactDto[];
  targets: NetworkingTargetDto[];
  talkTracks: NetworkingTalkTrackDto[];
}

// ---------------------------------------------------------------------------
// Admin Portal — Module 20
// ---------------------------------------------------------------------------

export type AppRole = 'user' | 'admin' | 'support' | 'coach';

export const APP_ROLES: AppRole[] = ['user', 'admin', 'support', 'coach'];

export function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as string[]).includes(value);
}

export function isAdminRole(role: string): boolean {
  return role === 'admin';
}

export function isSupportRole(role: string): boolean {
  return role === 'support' || role === 'admin';
}

export function isCoachRole(role: string): boolean {
  return role === 'coach' || role === 'admin';
}

export function isStaffRole(role: string): boolean {
  return role === 'admin' || role === 'support' || role === 'coach';
}

export interface AdminOverviewDto {
  users: { total: number; admins: number; onboarded: number };
  catalog: { companies: number; jobs: number; activeJobs: number };
  billing: { proActive: number; free: number; pastDue: number };
  engagement: {
    applications: number;
    resumes: number;
    coachSessions: number;
    portfolioProjects: number;
  };
  flags: AdminFeatureFlagDto[];
}

/** Weekly time-series point for analytics charts (Wave 2). */
export interface AnalyticsSeriesPoint {
  week: string;
  count: number;
}

export interface AnalyticsPipelineBucket {
  stage: string;
  label: string;
  count: number;
}

export interface UserAnalyticsDto {
  weeks: number;
  applicationsOverTime: AnalyticsSeriesPoint[];
  savesOverTime: AnalyticsSeriesPoint[];
  viewsOverTime: AnalyticsSeriesPoint[];
  pipeline: AnalyticsPipelineBucket[];
}

export interface AdminAnalyticsDto {
  weeks: number;
  signupsOverTime: AnalyticsSeriesPoint[];
  applicationsOverTime: AnalyticsSeriesPoint[];
  jobsAddedOverTime: AnalyticsSeriesPoint[];
  proConversionsOverTime: AnalyticsSeriesPoint[];
}

export interface AdminUserRowDto {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  planId: string;
  subscriptionStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminJobRowDto {
  id: string;
  title: string;
  slug: string;
  companyName: string;
  companySlug: string;
  isActive: boolean;
  source: string | null;
  workMode: string;
  seniority: string | null;
  postedAt: string | null;
  createdAt: string;
}

export interface AdminCompanyRowDto {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  location: string | null;
  websiteUrl: string | null;
  activeJobs: number;
  totalJobs: number;
  createdAt: string;
}

export interface AdminSubscriptionRowDto {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: string;
  status: string;
  provider: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  updatedAt: string;
}

export interface AdminFeatureFlagDto {
  key: string;
  enabled: boolean;
  rolloutPercent: number | null;
  description: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

// ---------------------------------------------------------------------------
// Smart Application Automation — Module 10
// ---------------------------------------------------------------------------

export type ApplyAssistStatus =
  | 'ready'
  | 'opened'
  | 'fill_approved'
  | 'submitted'
  | 'cancelled';

export type ApplyPlaywrightStatus =
  | 'skipped'
  | 'approved_pending'
  | 'fixture_ran'
  | 'adapter_filled'
  | 'adapter_failed'
  | 'blocked';

export type AtsVendor =
  | 'greenhouse'
  | 'lever'
  | 'ashby'
  | 'workable'
  | 'fixture'
  | 'unknown';

export const APPLY_ASSIST_STATUSES: ApplyAssistStatus[] = [
  'ready',
  'opened',
  'fill_approved',
  'submitted',
  'cancelled',
];

export function isApplyAssistStatus(value: string): value is ApplyAssistStatus {
  return (APPLY_ASSIST_STATUSES as string[]).includes(value);
}

export interface ApplyChecklistItemDto {
  id: string;
  label: string;
  done: boolean;
  detail: string;
  required: boolean;
}

export interface ApplyFillFieldDto {
  id: string;
  label: string;
  value: string;
  source: 'profile' | 'draft' | 'resume' | 'manual' | string;
  sensitive: boolean;
}

export interface ApplyFillAttemptDto {
  vendor: AtsVendor | string;
  ok: boolean;
  filled: string[];
  errors: string[];
  durationMs: number;
  at: string;
  /** True when Playwright launched; false for dry-run / unavailable browser. */
  browserRan: boolean;
}

export interface ApplyAssistSessionDto {
  id: string;
  userId: string;
  applicationId: string;
  status: ApplyAssistStatus | string;
  checklist: ApplyChecklistItemDto[];
  fillPlan: ApplyFillFieldDto[];
  readinessPct: number;
  applyUrl: string | null;
  atsVendor: AtsVendor | string | null;
  openedAt: string | null;
  fillApprovedAt: string | null;
  submittedAt: string | null;
  submitNote: string | null;
  playwrightStatus: ApplyPlaywrightStatus | string;
  playwrightDetail: string | null;
  lastFillAttempt: ApplyFillAttemptDto | null;
  createdAt: string;
  updatedAt: string;
  job?: {
    id: string;
    title: string;
    slug: string;
    companyName: string;
    source?: string | null;
  };
}

// ---------------------------------------------------------------------------
// Wave 5 — Notifications, Team, Coach desk, Referrals
// ---------------------------------------------------------------------------

export interface NotificationLogDto {
  id: string;
  userId: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  href: string | null;
  status: string;
  readAt: string | null;
  createdAt: string;
}

export type TeamMemberRole = 'owner' | 'coach' | 'member';

export interface TeamDto {
  id: string;
  name: string;
  ownerUserId: string;
  seatLimit: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  memberships?: TeamMembershipDto[];
}

export interface TeamMembershipDto {
  id: string;
  teamId: string;
  userId: string;
  role: TeamMemberRole | string;
  user?: { id: string; name: string; email: string; role: string };
  createdAt: string;
}

export interface CoachAssignmentDto {
  id: string;
  coachUserId: string;
  memberUserId: string;
  note: string | null;
  member?: {
    id: string;
    name: string;
    email: string;
    headline: string | null;
    completenessScore: number | null;
  };
  createdAt: string;
}

export interface CoachDeskMemberDto {
  userId: string;
  name: string;
  email: string;
  headline: string | null;
  completenessScore: number | null;
  applicationCount: number;
  assignmentId: string | null;
  source: 'assignment' | 'team';
}

export interface SupportUserLookupDto {
  id: string;
  name: string;
  email: string;
  role: string;
  planId: string;
  subscriptionStatus: string | null;
  onboardingCompleted: boolean;
  headline: string | null;
  completenessScore: number | null;
  applicationCount: number;
  resumeCount: number;
  createdAt: string;
}

export interface ReferralSummaryDto {
  code: string;
  sharePath: string;
  redemptionCount: number;
  rewardedCount: number;
  rewardDays: number;
}
