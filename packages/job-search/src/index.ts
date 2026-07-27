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
  buildInterviewQuestions,
  computeConfidenceScore,
  inferInterviewCategories,
  interviewPrepStatus,
  toInterviewPrepDto,
  type InterviewJobInput,
  type InterviewProfileInput,
} from './interview';

export {
  createInterviewPrep,
  deleteInterviewPrep,
  getInterviewPrep,
  getLatestInterviewPrepForJob,
  listInterviewPreps,
  updateInterviewPractice,
} from './interview-service';

export {
  buildCodingPack,
  codingSessionStatus,
  computeCodingPerformance,
  inferCodingStyles,
  toCodingSessionDto,
  type CodingJobInput,
} from './coding';

export {
  createCodingSession,
  deleteCodingSession,
  getCodingSession,
  getLatestCodingSessionForJob,
  listCodingSessions,
  updateCodingAttempts,
} from './coding-service';

export {
  buildTemplateCoachReply,
  buildWelcomeReply,
  makeMessage,
  normalizeFocus,
  sessionTitle,
  snapCoachContext,
  toCareerCoachSessionDto,
} from './coach';

export {
  appendCoachMessage,
  createCoachSession,
  deleteCoachSession,
  getCoachSession,
  listCoachSessions,
  streamAppendCoachMessage,
} from './coach-service';

export {
  buildPortfolioBrief,
  buildProjectSuggestions,
  buildResumeBullets,
  computePortfolioReadiness,
  normalizeProjectInput,
  toPortfolioProjectDto,
  type PortfolioProjectInput,
} from './portfolio';

export {
  createPortfolioProject,
  createProjectFromSuggestion,
  deletePortfolioProject,
  getPortfolioBrief,
  getPortfolioProject,
  listPortfolioProjects,
  updatePortfolioProject,
} from './portfolio-service';

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
