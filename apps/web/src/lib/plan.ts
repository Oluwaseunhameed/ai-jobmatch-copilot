import {
  FREE_PLAN_ID,
  FREE_PLAN_LIMITS,
  PLAN_LABELS,
  type PlanId,
  type PlanLimits,
} from '@jobmatch/types';

export { FREE_PLAN_ID, FREE_PLAN_LIMITS, PLAN_LABELS, type PlanId, type PlanLimits };

/** Everyone is on Free until Stripe lands in Phase 2. */
export function getCurrentPlanId(): PlanId {
  return FREE_PLAN_ID;
}

export function getPlanLimits(planId: PlanId = FREE_PLAN_ID): PlanLimits {
  if (planId === 'free') return FREE_PLAN_LIMITS;
  // Pro limits are not sold yet; fall back to Free framing.
  return FREE_PLAN_LIMITS;
}

export type PlanFeature = {
  key: string;
  label: string;
};

/** Included Free capabilities for settings copy. */
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

export function proPlanTeasers(): PlanFeature[] {
  return [
    { key: 'ats', label: 'Higher ATS optimisation and assistant limits' },
    { key: 'billing', label: 'Higher limits with Stripe billing' },
  ];
}
