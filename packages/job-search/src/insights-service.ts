import { prisma } from '@jobmatch/database';
import type { JobInsightsDto } from '@jobmatch/types';

import { aiServiceUrl } from './embed';
import { buildJobInsights, type ProfileForInsights } from './insights';
import { getJobBySlug } from './search';

export { buildJobInsights, fitLevelTone, type ProfileForInsights } from './insights';

type AiNarrativeResponse = {
  summary?: string;
  themes?: string[];
  source?: string;
  llm?: JobInsightsDto['llm'];
};

function insightsTimeoutMs() {
  const raw = Number(process.env.AI_SERVICE_INSIGHTS_TIMEOUT_MS);
  if (Number.isFinite(raw) && raw > 0) return raw;
  const fallback = Number(process.env.AI_SERVICE_TIMEOUT_MS);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 45_000;
}

async function callInsightsNarrative(input: {
  jobTitle: string;
  companyName: string;
  description: string;
  matchScore: number | null;
  templateSummary: string;
  skillGaps: JobInsightsDto['skillGaps'];
  fitSignals: JobInsightsDto['fitSignals'];
  matchedSkills: string[];
}): Promise<AiNarrativeResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), insightsTimeoutMs());
  try {
    const response = await fetch(`${aiServiceUrl()}/v1/jobs/insights/narrative`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_title: input.jobTitle,
        company_name: input.companyName,
        description: input.description.slice(0, 6_000),
        match_score: input.matchScore,
        template_summary: input.templateSummary,
        skill_gaps: input.skillGaps.slice(0, 8),
        fit_signals: input.fitSignals.slice(0, 6),
        matched_skills: input.matchedSkills.slice(0, 16),
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return (await response.json()) as AiNarrativeResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getJobInsights(
  slug: string,
  userId: string,
): Promise<JobInsightsDto | null> {
  const job = await getJobBySlug(slug, userId);
  if (!job) return null;

  const profile = await prisma.careerProfile.findUnique({
    where: { userId },
    include: { skills: true },
  });

  const profileInput: ProfileForInsights | null = profile
    ? {
        yearsOfExperience: profile.yearsOfExperience,
        workLocationPreference: profile.workLocationPreference,
        employmentType: profile.employmentType,
        salaryExpectation: profile.salaryExpectation,
        salaryCurrency: profile.salaryCurrency,
        desiredRoles: profile.desiredRoles,
        skills: profile.skills.map((s) => ({
          name: s.name,
          category: s.category,
          level: s.level,
          years: s.years,
        })),
      }
    : null;

  const base = buildJobInsights(job, profileInput);
  const ai = await callInsightsNarrative({
    jobTitle: job.title,
    companyName: job.company.name,
    description: job.description,
    matchScore: base.matchScore,
    templateSummary: base.summary,
    skillGaps: base.skillGaps,
    fitSignals: base.fitSignals,
    matchedSkills: base.matchedSkills,
  });

  if (ai?.summary?.trim() && ai.source === 'llm') {
    return {
      ...base,
      summary: ai.summary.trim(),
      themes: Array.isArray(ai.themes) ? ai.themes.slice(0, 8) : [],
      source: 'llm',
      llm: ai.llm,
    };
  }

  return {
    ...base,
    themes: Array.isArray(ai?.themes) ? ai.themes.slice(0, 8) : undefined,
    source: ai?.source === 'template' ? 'template' : 'template',
    llm: ai?.llm,
  };
}
