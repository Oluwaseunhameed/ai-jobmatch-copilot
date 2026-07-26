import { prisma } from '@jobmatch/database';
import type { JobDto, JobSkillMatch } from '@jobmatch/types';

/**
 * Light alias map so common résumé spellings still hit seeded job skills.
 * Keys and values are already normalised (see `normalizeSkill`).
 */
const SKILL_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  'node.js': 'node',
  nodejs: 'node',
  'react.js': 'react',
  reactjs: 'react',
  'next.js': 'nextjs',
  next: 'nextjs',
  'vue.js': 'vue',
  vuejs: 'vue',
  'nuxt.js': 'nuxt',
  postgres: 'postgresql',
  golang: 'go',
  k8s: 'kubernetes',
  aws: 'amazon web services',
  gcp: 'google cloud',
  ml: 'machine learning',
  ai: 'artificial intelligence',
  llm: 'large language models',
};

/** Collapse casing, punctuation, and whitespace for fuzzy equality. */
export function normalizeSkill(raw: string): string {
  let value = raw.trim().toLowerCase();
  // Preserve common language tokens before stripping punctuation.
  value = value.replace(/c\+\+/g, 'cpp').replace(/c#/g, 'csharp');
  value = value
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return SKILL_ALIASES[value] ?? value;
}

function canonicalSkill(raw: string): string {
  return normalizeSkill(raw);
}

/**
 * Score how well a profile covers a job's listed skills.
 *
 * Uses job-skill coverage (`matched / job.skills`) rather than Jaccard so a
 * broad profile does not dilute the score against a short requirements list.
 * Returns null when either side has no skills to compare.
 */
export function matchJobSkills(
  profileSkills: readonly string[],
  jobSkills: readonly string[],
): JobSkillMatch | null {
  if (profileSkills.length === 0 || jobSkills.length === 0) {
    return null;
  }

  const profileKeys = new Set(profileSkills.map(canonicalSkill).filter(Boolean));
  if (profileKeys.size === 0) return null;

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  const seen = new Set<string>();

  for (const skill of jobSkills) {
    const key = canonicalSkill(skill);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    if (profileKeys.has(key)) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  const compared = matchedSkills.length + missingSkills.length;
  if (compared === 0) return null;

  return {
    matchScore: Math.round((matchedSkills.length / compared) * 100),
    matchedSkills,
    missingSkills,
  };
}

export function applySkillMatch<T extends Pick<JobDto, 'skills'>>(
  job: T,
  profileSkills: readonly string[],
): T & Partial<JobSkillMatch> {
  const match = matchJobSkills(profileSkills, job.skills);
  if (!match) return { ...job };
  return {
    ...job,
    matchScore: match.matchScore,
    matchedSkills: match.matchedSkills,
    missingSkills: match.missingSkills,
  };
}

export function enrichJobsWithMatch<T extends Pick<JobDto, 'skills'>>(
  jobs: T[],
  profileSkills: readonly string[],
): Array<T & Partial<JobSkillMatch>> {
  if (profileSkills.length === 0) return jobs.map((job) => ({ ...job }));
  return jobs.map((job) => applySkillMatch(job, profileSkills));
}

/** Stable descending sort by match score (missing scores sort last). */
export function sortJobsByMatchScore<T extends { matchScore?: number; id: string }>(
  jobs: T[],
): T[] {
  return [...jobs].sort((a, b) => {
    const scoreA = a.matchScore ?? -1;
    const scoreB = b.matchScore ?? -1;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.id.localeCompare(b.id);
  });
}

export async function loadProfileSkillNames(userId: string): Promise<string[]> {
  const profile = await prisma.careerProfile.findUnique({
    where: { userId },
    select: { skills: { select: { name: true } } },
  });
  return profile?.skills.map((skill) => skill.name) ?? [];
}
