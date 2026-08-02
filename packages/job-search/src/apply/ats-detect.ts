import type { AtsVendor } from '@jobmatch/types';

const FIXTURE_RE = /fixture|localhost:3999|example\.test\/apply|\/apply-fixture/i;

export function isFixtureApplyUrl(applyUrl: string | null | undefined): boolean {
  return Boolean(applyUrl && FIXTURE_RE.test(applyUrl));
}

/**
 * Detect ATS vendor from apply URL and/or ingested job source.
 * Used for adapter selection — never implies unsupervised submit.
 */
export function detectAts(
  applyUrl: string | null | undefined,
  source?: string | null,
): AtsVendor {
  if (isFixtureApplyUrl(applyUrl)) return 'fixture';

  const src = (source ?? '').toLowerCase().trim();
  if (
    src === 'greenhouse' ||
    src === 'lever' ||
    src === 'ashby' ||
    src === 'workable' ||
    src === 'workday' ||
    src === 'smartrecruiters' ||
    src === 'icims' ||
    src === 'bamboohr' ||
    src === 'jobvite'
  ) {
    if (src === 'workday' || src === 'smartrecruiters' || src === 'icims' || src === 'bamboohr' || src === 'jobvite') {
      return 'generic';
    }
    return src;
  }

  const url = (applyUrl ?? '').toLowerCase();
  if (!url) return 'unknown';

  if (
    url.includes('greenhouse.io') ||
    url.includes('boards.greenhouse') ||
    url.includes('job-boards.greenhouse') ||
    url.includes('grnh.se')
  ) {
    return 'greenhouse';
  }
  if (url.includes('lever.co') || url.includes('jobs.lever') || url.includes('jobs.eu.lever')) {
    return 'lever';
  }
  if (
    url.includes('ashbyhq.com') ||
    url.includes('jobs.ashby') ||
    url.includes('ashbyhq.') ||
    url.includes('ashby.com')
  ) {
    return 'ashby';
  }
  if (url.includes('workable.com') || url.includes('apply.workable')) {
    return 'workable';
  }

  // Other common hosted ATS / career hosts — use shared generic selectors.
  if (
    url.includes('myworkdayjobs.com') ||
    url.includes('workdayjobs.com') ||
    url.includes('wd1.myworkdayjobs') ||
    url.includes('wd5.myworkdayjobs') ||
    url.includes('smartrecruiters.com') ||
    url.includes('icims.com') ||
    url.includes('bamboohr.com') ||
    url.includes('jobvite.com') ||
    url.includes('breezy.hr') ||
    url.includes('recruitee.com') ||
    url.includes('teamtailor.com') ||
    url.includes('greenhouse.io') ||
    url.includes('lever.co') ||
    url.includes('/careers') ||
    url.includes('/career') ||
    url.includes('/jobs/') ||
    url.includes('/job/') ||
    url.includes('apply.')
  ) {
    return 'generic';
  }

  // Any remaining http(s) apply URL: attempt generic fill-only (never submit).
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return 'generic';
  }

  return 'unknown';
}

export function atsVendorLabel(vendor: AtsVendor): string {
  switch (vendor) {
    case 'greenhouse':
      return 'Greenhouse';
    case 'lever':
      return 'Lever';
    case 'ashby':
      return 'Ashby';
    case 'workable':
      return 'Workable';
    case 'generic':
      return 'Generic career page';
    case 'fixture':
      return 'Local fixture';
    default:
      return 'Unknown board';
  }
}
