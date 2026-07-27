export {
  EmbeddingUnavailableError,
  aiServiceUrl,
  embedJob,
  embedQuery,
  embedTexts,
  jobEmbeddingText,
  jobsNeedingEmbedding,
  type EmbedJobInput,
  type EmbedResponse,
  type JobEmbedTrigger,
} from './embed';

export { DEFAULT_LIMIT, MAX_LIMIT, getJobBySlug, searchJobs, type SearchJobsInput } from './search';

export { getTrendingJobs } from './trending';

export {
  buildJobInsights,
  fitLevelTone,
  type ProfileForInsights,
} from './insights';

export { getJobInsights } from './insights-service';

export { buildCompanyProfile, type CompanyJobInput } from './company-profile';

export { getCompanyProfile } from './company-service';

export {
  buildCareerGrowthHub,
  learningForSkill,
  LEARNING_CATALOG,
  type GrowthJobInput,
  type GrowthProfileInput,
} from './growth';

export { getCareerGrowthHub } from './growth-service';

export {
  labelSavedSearchQuery,
  normalizeSavedSearchQuery,
  parseSavedSearchQuery,
  runJobAlerts,
  savedSearchHasFilters,
  toSavedSearchDto,
} from './alerts';

export {
  applySkillMatch,
  enrichJobsWithMatch,
  loadProfileSkillNames,
  matchJobSkills,
  normalizeSkill,
  sortJobsByMatchScore,
} from './match';

export {
  createLogger,
  noopLogger,
  type LogFields,
  type LogLevel,
  type StructuredLogger,
} from './logger';

export {
  APPLICATION_STAGE_LABELS,
  APPLICATION_STAGES,
  applicationInclude,
  isApplicationStage,
  toApplicationDto,
  type ApplicationRow,
  type ApplicationStage,
} from './applications';
