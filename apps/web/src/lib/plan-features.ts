import {
  FREE_PLAN_ID,
  FREE_PLAN_LIMITS,
  PLAN_LABELS,
  PRO_PLAN_ID,
  PRO_PLAN_LIMITS,
  TEAM_PLAN_ID,
  TEAM_PLAN_LIMITS,
  type PlanId,
  type PlanLimits,
} from '@jobmatch/types';

export {
  FREE_PLAN_ID,
  FREE_PLAN_LIMITS,
  PLAN_LABELS,
  PRO_PLAN_ID,
  PRO_PLAN_LIMITS,
  TEAM_PLAN_ID,
  TEAM_PLAN_LIMITS,
  type PlanId,
  type PlanLimits,
};

export type PlanFeature = {
  key: string;
  label: string;
};

export function freePlanFeatures(): PlanFeature[] {
  const limits = FREE_PLAN_LIMITS;
  return [
    { key: 'profile', label: 'Career profile, skills, and match scores' },
    { key: 'search', label: 'Job search (keyword + semantic)' },
    { key: 'resumes', label: `Up to ${limits.maxResumes} resumes with AI parsing` },
    { key: 'saved', label: `Up to ${limits.maxSavedJobs} saved roles` },
    {
      key: 'optimize',
      label: `${limits.aiOptimizePerMonth} AI resume optimisations / month`,
    },
    {
      key: 'cover',
      label: `${limits.aiCoverLettersPerMonth} cover letters / short answers / month`,
    },
    { key: 'tracker', label: 'Application tracker pipeline' },
  ];
}

export function proPlanFeatures(): PlanFeature[] {
  const limits = PRO_PLAN_LIMITS;
  return [
    { key: 'resumes', label: `Up to ${limits.maxResumes} resumes` },
    { key: 'saved', label: `Up to ${limits.maxSavedJobs} saved roles` },
    {
      key: 'optimize',
      label: `${limits.aiOptimizePerMonth} AI resume optimisations / month`,
    },
    {
      key: 'cover',
      label: `${limits.aiCoverLettersPerMonth} cover letters / short answers / month`,
    },
    { key: 'billing', label: 'Global billing via Lemon Squeezy · Nigeria via Paystack' },
  ];
}

export function teamPlanFeatures(): PlanFeature[] {
  const limits = TEAM_PLAN_LIMITS;
  return [
    { key: 'seats', label: `Up to ${limits.maxTeamSeats} team seats (coaches + members)` },
    { key: 'resumes', label: `Up to ${limits.maxResumes} resumes per seat` },
    { key: 'saved', label: `Up to ${limits.maxSavedJobs} saved roles` },
    {
      key: 'optimize',
      label: `${limits.aiOptimizePerMonth} AI resume optimisations / month`,
    },
    {
      key: 'cover',
      label: `${limits.aiCoverLettersPerMonth} cover letters / short answers / month`,
    },
    { key: 'coach', label: 'Coach desk for assigned members' },
  ];
}

/** @deprecated use proPlanFeatures */
export function proPlanTeasers(): PlanFeature[] {
  return proPlanFeatures();
}

export function getPlanLimits(planId: PlanId = FREE_PLAN_ID): PlanLimits {
  if (planId === 'team') return TEAM_PLAN_LIMITS;
  if (planId === 'pro') return PRO_PLAN_LIMITS;
  return FREE_PLAN_LIMITS;
}
