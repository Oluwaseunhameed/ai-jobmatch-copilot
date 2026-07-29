export type CompletenessProfile = {
  headline?: string | null;
  summary?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  currentJobTitle?: string | null;
  yearsOfExperience?: number | null;
  desiredRoles?: string[];
  employmentType?: string | null;
  workLocationPreference?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  websiteUrl?: string | null;
  workAuthorization?: string | null;
  skills?: { name: string }[];
  education?: { school?: string }[];
  workExperience?: { title?: string; company?: string }[];
};

type Criterion = {
  key: string;
  weight: number;
  met: (p: CompletenessProfile) => boolean;
};

const CRITERIA: Criterion[] = [
  { key: 'headline', weight: 8, met: (p) => Boolean(p.headline?.trim()) },
  { key: 'summary', weight: 8, met: (p) => Boolean(p.summary && p.summary.trim().length >= 40) },
  { key: 'currentJobTitle', weight: 8, met: (p) => Boolean(p.currentJobTitle?.trim()) },
  { key: 'yearsOfExperience', weight: 4, met: (p) => p.yearsOfExperience != null },
  { key: 'desiredRoles', weight: 8, met: (p) => (p.desiredRoles?.length ?? 0) > 0 },
  { key: 'employmentType', weight: 4, met: (p) => Boolean(p.employmentType) },
  { key: 'workLocationPreference', weight: 4, met: (p) => Boolean(p.workLocationPreference) },
  { key: 'location', weight: 8, met: (p) => Boolean(p.city?.trim() || p.country?.trim()) },
  { key: 'phone', weight: 4, met: (p) => Boolean(p.phone?.trim()) },
  {
    key: 'links',
    weight: 8,
    met: (p) =>
      Boolean(p.linkedinUrl?.trim() || p.githubUrl?.trim() || p.portfolioUrl?.trim() || p.websiteUrl?.trim()),
  },
  { key: 'workAuthorization', weight: 4, met: (p) => Boolean(p.workAuthorization?.trim()) },
  { key: 'skills', weight: 12, met: (p) => (p.skills?.length ?? 0) >= 3 },
  {
    key: 'education',
    weight: 10,
    met: (p) => (p.education ?? []).some((e) => Boolean(e.school?.trim())),
  },
  {
    key: 'workExperience',
    weight: 10,
    met: (p) =>
      (p.workExperience ?? []).some((e) => Boolean(e.title?.trim() && e.company?.trim())),
  },
];

export function calculateCompletenessScore(profile: CompletenessProfile): number {
  const totalWeight = CRITERIA.reduce((sum, c) => sum + c.weight, 0);
  const earned = CRITERIA.reduce((sum, c) => sum + (c.met(profile) ? c.weight : 0), 0);
  return Math.round((earned / totalWeight) * 100);
}

export function completenessBreakdown(profile: CompletenessProfile) {
  return CRITERIA.map((c) => ({
    key: c.key,
    weight: c.weight,
    met: c.met(profile),
  }));
}
