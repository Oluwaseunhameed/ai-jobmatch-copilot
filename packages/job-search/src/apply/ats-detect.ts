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
  if (src === 'greenhouse' || src === 'lever' || src === 'ashby' || src === 'workable') {
    return src;
  }

  const url = (applyUrl ?? '').toLowerCase();
  if (!url) return 'unknown';

  if (
    url.includes('greenhouse.io') ||
    url.includes('boards.greenhouse') ||
    url.includes('job-boards.greenhouse')
  ) {
    return 'greenhouse';
  }
  if (url.includes('lever.co') || url.includes('jobs.lever')) return 'lever';
  if (url.includes('ashbyhq.com') || url.includes('jobs.ashby')) return 'ashby';
  if (url.includes('workable.com') || url.includes('apply.workable')) return 'workable';

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
    case 'fixture':
      return 'Local fixture';
    default:
      return 'Unknown board';
  }
}
