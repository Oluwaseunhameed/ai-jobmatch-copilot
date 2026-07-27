import type {
  CareerGrowthHubDto,
  CareerPathSuggestionDto,
  CertificationSuggestionDto,
  FitLevel,
  GrowthSkillGapDto,
  LearningRecommendation,
  MarketSkillDemandDto,
  PromotionReadinessDto,
  RoadmapStepDto,
  SalaryGrowthInsightDto,
} from '@jobmatch/types';

import { normalizeSkill } from './match';

export type GrowthProfileInput = {
  yearsOfExperience?: number | null;
  desiredRoles?: string[];
  salaryExpectation?: number | null;
  salaryCurrency?: string | null;
  currentJobTitle?: string | null;
  skills: Array<{ name: string }>;
};

export type GrowthJobInput = {
  title: string;
  skills: string[];
  seniority: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryPeriod: string;
};

/** Shared curated learning resources (also used by Module 6 insights). */
export const LEARNING_CATALOG: Record<string, Omit<LearningRecommendation, 'skill'>[]> = {
  typescript: [
    {
      title: 'TypeScript Handbook',
      provider: 'typescriptlang.org',
      url: 'https://www.typescriptlang.org/docs/handbook/intro.html',
      type: 'docs',
      estimatedHours: 8,
    },
  ],
  javascript: [
    {
      title: 'JavaScript.info — Modern Tutorial',
      provider: 'javascript.info',
      url: 'https://javascript.info/',
      type: 'course',
      estimatedHours: 40,
    },
  ],
  react: [
    {
      title: 'React documentation — Learn',
      provider: 'react.dev',
      url: 'https://react.dev/learn',
      type: 'docs',
      estimatedHours: 12,
    },
  ],
  nextjs: [
    {
      title: 'Next.js App Router docs',
      provider: 'nextjs.org',
      url: 'https://nextjs.org/docs/app',
      type: 'docs',
      estimatedHours: 6,
    },
  ],
  node: [
    {
      title: 'Node.js Getting Started',
      provider: 'nodejs.org',
      url: 'https://nodejs.org/en/learn/getting-started/introduction-to-nodejs',
      type: 'docs',
      estimatedHours: 6,
    },
  ],
  python: [
    {
      title: 'Python for Everybody (free course)',
      provider: 'Coursera / UMich',
      url: 'https://www.coursera.org/specializations/python',
      type: 'course',
      estimatedHours: 60,
    },
  ],
  postgresql: [
    {
      title: 'PostgreSQL Tutorial',
      provider: 'postgresql.org',
      url: 'https://www.postgresql.org/docs/current/tutorial.html',
      type: 'docs',
      estimatedHours: 10,
    },
  ],
  aws: [
    {
      title: 'AWS Cloud Practitioner essentials',
      provider: 'AWS Skill Builder',
      url: 'https://aws.amazon.com/training/digital/aws-cloud-practitioner-essentials/',
      type: 'course',
      estimatedHours: 12,
    },
  ],
  kubernetes: [
    {
      title: 'Kubernetes Basics',
      provider: 'kubernetes.io',
      url: 'https://kubernetes.io/docs/tutorials/kubernetes-basics/',
      type: 'docs',
      estimatedHours: 8,
    },
  ],
  graphql: [
    {
      title: 'GraphQL introduction',
      provider: 'graphql.org',
      url: 'https://graphql.org/learn/',
      type: 'docs',
      estimatedHours: 4,
    },
  ],
  go: [
    {
      title: 'A Tour of Go',
      provider: 'go.dev',
      url: 'https://go.dev/tour/',
      type: 'practice',
      estimatedHours: 4,
    },
  ],
  docker: [
    {
      title: 'Docker Getting Started',
      provider: 'Docker',
      url: 'https://docs.docker.com/get-started/',
      type: 'docs',
      estimatedHours: 4,
    },
  ],
  'machine learning': [
    {
      title: 'Machine Learning Crash Course',
      provider: 'Google Developers',
      url: 'https://developers.google.com/machine-learning/crash-course',
      type: 'course',
      estimatedHours: 15,
    },
  ],
  redis: [
    {
      title: 'Redis University — RU101',
      provider: 'Redis',
      url: 'https://university.redis.io/academy/course/ru101',
      type: 'course',
      estimatedHours: 6,
    },
  ],
  terraform: [
    {
      title: 'Get Started with Terraform',
      provider: 'HashiCorp',
      url: 'https://developer.hashicorp.com/terraform/tutorials/aws-get-started',
      type: 'docs',
      estimatedHours: 6,
    },
  ],
};

const CERT_CATALOG: Record<
  string,
  Omit<CertificationSuggestionDto, 'skill'>
> = {
  aws: {
    name: 'AWS Certified Cloud Practitioner',
    provider: 'Amazon Web Services',
    url: 'https://aws.amazon.com/certification/certified-cloud-practitioner/',
    level: 'foundational',
  },
  kubernetes: {
    name: 'Certified Kubernetes Application Developer (CKAD)',
    provider: 'CNCF',
    url: 'https://www.cncf.io/training/certification/ckad/',
    level: 'associate',
  },
  terraform: {
    name: 'HashiCorp Certified: Terraform Associate',
    provider: 'HashiCorp',
    url: 'https://www.hashicorp.com/certification/terraform-associate',
    level: 'associate',
  },
  python: {
    name: 'PCAP — Certified Associate in Python Programming',
    provider: 'Python Institute',
    url: 'https://pythoninstitute.org/pcap',
    level: 'associate',
  },
  docker: {
    name: 'Docker Certified Associate',
    provider: 'Docker',
    url: 'https://training.mirantis.com/certification/dca-certification-exam/',
    level: 'associate',
  },
};

const SENIORITY_ORDER = ['intern', 'junior', 'mid', 'senior', 'lead', 'principal'] as const;

const SENIORITY_YEARS: Record<string, { min: number; max: number }> = {
  intern: { min: 0, max: 1 },
  junior: { min: 0, max: 2 },
  mid: { min: 2, max: 5 },
  senior: { min: 5, max: 10 },
  lead: { min: 8, max: 14 },
  principal: { min: 10, max: 99 },
};

type CareerLadder = {
  id: string;
  title: string;
  match: RegExp;
  focusSkills: string[];
};

const CAREER_LADDERS: CareerLadder[] = [
  {
    id: 'software-engineer',
    title: 'Software Engineering',
    match: /software|backend|frontend|full.?stack|engineer|developer/i,
    focusSkills: ['TypeScript', 'System Design', 'Testing', 'Cloud'],
  },
  {
    id: 'platform-sre',
    title: 'Platform / SRE',
    match: /platform|sre|devops|infrastructure|site reliability/i,
    focusSkills: ['Kubernetes', 'Terraform', 'Observability', 'CI/CD'],
  },
  {
    id: 'data',
    title: 'Data Engineering',
    match: /data|analytics|ml|machine learning|ai /i,
    focusSkills: ['Python', 'SQL', 'Spark', 'Machine Learning'],
  },
  {
    id: 'product',
    title: 'Product',
    match: /product manager|product owner|pm\b/i,
    focusSkills: ['Roadmapping', 'Analytics', 'Stakeholder Management'],
  },
];

export function learningForSkill(skill: string): LearningRecommendation[] {
  const key = normalizeSkill(skill);
  const catalog = LEARNING_CATALOG[key];
  if (catalog?.length) {
    return catalog.map((entry) => ({ skill, ...entry }));
  }
  return [
    {
      skill,
      title: `Learn ${skill}`,
      provider: 'Search',
      url: `https://www.google.com/search?q=${encodeURIComponent(`${skill} tutorial course`)}`,
      type: 'course',
    },
  ];
}

function inferCurrentSeniority(years: number | null | undefined): string {
  if (years == null) return 'mid';
  if (years < 2) return 'junior';
  if (years < 5) return 'mid';
  if (years < 8) return 'senior';
  if (years < 12) return 'lead';
  return 'principal';
}

function nextSeniority(current: string): string {
  const idx = SENIORITY_ORDER.indexOf(current as (typeof SENIORITY_ORDER)[number]);
  if (idx < 0 || idx >= SENIORITY_ORDER.length - 1) return current;
  return SENIORITY_ORDER[idx + 1]!;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

function aggregateMarketSkills(jobs: GrowthJobInput[]): {
  demand: MarketSkillDemandDto[];
  totalJobs: number;
  labelByNorm: Map<string, string>;
} {
  const counts = new Map<string, { label: string; count: number }>();
  for (const job of jobs) {
    const seen = new Set<string>();
    for (const skill of job.skills) {
      const label = skill.trim();
      if (!label) continue;
      const norm = normalizeSkill(label);
      if (seen.has(norm)) continue;
      seen.add(norm);
      const existing = counts.get(norm);
      if (existing) existing.count += 1;
      else counts.set(norm, { label, count: 1 });
    }
  }

  const totalJobs = jobs.length || 1;
  const demand = [...counts.entries()]
    .map(([norm, { label, count }]) => ({
      skill: label,
      jobCount: count,
      demandPct: Math.round((count / totalJobs) * 100),
      have: false,
      _norm: norm,
    }))
    .sort((a, b) => b.jobCount - a.jobCount || a.skill.localeCompare(b.skill));

  const labelByNorm = new Map(demand.map((d) => [d._norm, d.skill]));
  return {
    demand: demand.map(({ _norm: _, ...rest }) => rest),
    totalJobs: jobs.length,
    labelByNorm,
  };
}

function buildSkillGaps(
  demand: MarketSkillDemandDto[],
  profileNorms: Set<string>,
): GrowthSkillGapDto[] {
  return demand
    .filter((d) => !profileNorms.has(normalizeSkill(d.skill)))
    .slice(0, 12)
    .map((d) => {
      let priority: GrowthSkillGapDto['priority'] = 'low';
      if (d.demandPct >= 25 || d.jobCount >= 8) priority = 'high';
      else if (d.demandPct >= 12 || d.jobCount >= 4) priority = 'medium';
      return {
        skill: d.skill,
        priority,
        jobCount: d.jobCount,
        demandPct: d.demandPct,
        reason:
          priority === 'high'
            ? `In demand across ${d.demandPct}% of active roles (${d.jobCount} jobs).`
            : `Appears in ${d.jobCount} active role${d.jobCount === 1 ? '' : 's'}.`,
      };
    });
}

function buildRoadmap(gaps: GrowthSkillGapDto[]): RoadmapStepDto[] {
  return gaps
    .filter((g) => g.priority !== 'low')
    .slice(0, 6)
    .map((gap, index) => {
      const resources = learningForSkill(gap.skill);
      const hours = resources.reduce((sum, r) => sum + (r.estimatedHours ?? 0), 0);
      return {
        order: index + 1,
        skill: gap.skill,
        title: `Build ${gap.skill}`,
        description:
          gap.priority === 'high'
            ? `High-demand gap — prioritize this before stretching into niche skills.`
            : `Solid market signal — schedule deliberate practice after core gaps.`,
        estimatedHours: hours > 0 ? hours : null,
        resources,
      };
    });
}

function buildCertifications(gaps: GrowthSkillGapDto[]): CertificationSuggestionDto[] {
  const out: CertificationSuggestionDto[] = [];
  for (const gap of gaps) {
    const cert = CERT_CATALOG[normalizeSkill(gap.skill)];
    if (!cert) continue;
    out.push({ skill: gap.skill, ...cert });
    if (out.length >= 4) break;
  }
  return out;
}

function buildCareerPaths(
  profile: GrowthProfileInput,
  gaps: GrowthSkillGapDto[],
): CareerPathSuggestionDto[] {
  const years = profile.yearsOfExperience ?? null;
  const current = inferCurrentSeniority(years);
  const next = nextSeniority(current);
  const desired = profile.desiredRoles?.length
    ? profile.desiredRoles
    : profile.currentJobTitle
      ? [profile.currentJobTitle]
      : ['Software Engineer'];

  const focusFromGaps = gaps.slice(0, 3).map((g) => g.skill);
  const matched = CAREER_LADDERS.filter((ladder) =>
    desired.some((role) => ladder.match.test(role)),
  );
  const ladders = matched.length ? matched : [CAREER_LADDERS[0]!];

  return ladders.slice(0, 3).map((ladder) => {
    const focusSkills = [...new Set([...focusFromGaps, ...ladder.focusSkills])].slice(0, 4);
    const yearsBand = SENIORITY_YEARS[next];
    let readinessPct = 40;
    if (years != null && yearsBand) {
      if (years >= yearsBand.min) readinessPct = 75;
      else if (years >= yearsBand.min - 1) readinessPct = 55;
      else readinessPct = 35;
    }
    if (gaps.filter((g) => g.priority === 'high').length === 0) readinessPct = Math.min(95, readinessPct + 15);

    return {
      id: ladder.id,
      title: ladder.title,
      currentLevel: current,
      nextLevel: next,
      readinessPct,
      focusSkills,
      detail: `Progress from ${current} toward ${next} by closing ${focusSkills.slice(0, 2).join(' and ') || 'core'} gaps.`,
    };
  });
}

function buildSalaryGrowth(
  profile: GrowthProfileInput,
  jobs: GrowthJobInput[],
): SalaryGrowthInsightDto | null {
  const profileCurrency = (profile.salaryCurrency || 'USD').toUpperCase();

  const jobsWithPay = jobs.filter((j) => j.salaryMin != null || j.salaryMax != null);
  if (jobsWithPay.length === 0) return null;

  let relevant = jobsWithPay.filter(
    (j) => (j.salaryCurrency || 'USD').toUpperCase() === profileCurrency,
  );
  let currency = profileCurrency;
  let currencyMismatch = false;

  if (relevant.length === 0) {
    // Profile currency (e.g. NGN) may not appear in a USD-seeded catalog — fall back
    // to the most common listed currency so the panel still renders.
    const counts = new Map<string, number>();
    for (const job of jobsWithPay) {
      const cur = (job.salaryCurrency || 'USD').toUpperCase();
      counts.set(cur, (counts.get(cur) ?? 0) + 1);
    }
    currency = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'USD';
    relevant = jobsWithPay.filter(
      (j) => (j.salaryCurrency || 'USD').toUpperCase() === currency,
    );
    currencyMismatch = profileCurrency !== currency;
  }

  const mids = relevant
    .map((j) => {
      if (j.salaryMin != null && j.salaryMax != null) {
        return Math.round((j.salaryMin + j.salaryMax) / 2);
      }
      return j.salaryMin ?? j.salaryMax;
    })
    .filter((v): v is number => v != null);

  if (mids.length === 0) return null;

  const marketMedian = median(mids);
  const marketMin = Math.min(...mids);
  const marketMax = Math.max(...mids);
  const expectation = profile.salaryExpectation ?? null;
  let deltaPct: number | null = null;
  let detail = 'Compare your expectation to catalog midpoints for open roles.';

  if (currencyMismatch) {
    detail = `Catalog salaries are listed in ${currency}; your profile uses ${profileCurrency}. Convert before comparing.`;
  } else if (expectation != null && marketMedian != null && marketMedian > 0) {
    deltaPct = Math.round(((expectation - marketMedian) / marketMedian) * 100);
    if (deltaPct > 15) {
      detail = `Your expectation is ${deltaPct}% above catalog median — stretch roles or negotiate with strong proof.`;
    } else if (deltaPct < -15) {
      detail = `Your expectation is ${Math.abs(deltaPct)}% below catalog median — room to raise targets as skills close.`;
    } else {
      detail = 'Your expectation sits near the catalog median for active roles.';
    }
  } else if (expectation == null) {
    detail = 'Add a salary expectation on your profile to compare against the catalog.';
  }

  return {
    currency,
    period: 'year',
    expectation,
    profileCurrency: currencyMismatch ? profileCurrency : null,
    marketMedian,
    marketMin,
    marketMax,
    roleCount: mids.length,
    deltaPct,
    detail,
  };
}

function buildPromotionReadiness(
  profile: GrowthProfileInput,
  jobs: GrowthJobInput[],
  gaps: GrowthSkillGapDto[],
): PromotionReadinessDto {
  const years = profile.yearsOfExperience ?? null;
  const current = inferCurrentSeniority(years);
  const target = nextSeniority(current);
  const band = SENIORITY_YEARS[target];
  const yearsGap =
    years != null && band ? Math.max(0, band.min - years) : null;

  const targetJobs = jobs.filter((j) => j.seniority === target);
  const profileNorms = new Set(profile.skills.map((s) => normalizeSkill(s.name)));
  let skillCoveragePct: number | null = null;
  if (targetJobs.length > 0) {
    const skillCounts = new Map<string, number>();
    for (const job of targetJobs) {
      for (const skill of job.skills) {
        const norm = normalizeSkill(skill);
        skillCounts.set(norm, (skillCounts.get(norm) ?? 0) + 1);
      }
    }
    const top = [...skillCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([norm]) => norm);
    if (top.length) {
      const hit = top.filter((n) => profileNorms.has(n)).length;
      skillCoveragePct = Math.round((hit / top.length) * 100);
    }
  }

  const checklist = [
    {
      id: 'years',
      label: 'Experience band for next level',
      done: yearsGap === 0 || (yearsGap != null && yearsGap <= 0),
      detail:
        years == null
          ? 'Add years of experience on your profile.'
          : yearsGap === 0 || (yearsGap != null && yearsGap <= 0)
            ? `Your ${years} years align with ${target} expectations.`
            : `About ${yearsGap} more year${yearsGap === 1 ? '' : 's'} toward typical ${target} range.`,
    },
    {
      id: 'skills',
      label: 'Core skills for next-level roles',
      done: (skillCoveragePct ?? 0) >= 60,
      detail:
        skillCoveragePct == null
          ? 'Not enough next-level listings to score coverage yet.'
          : `You cover ${skillCoveragePct}% of top skills on ${target} openings.`,
    },
    {
      id: 'gaps',
      label: 'No critical market skill gaps',
      done: gaps.filter((g) => g.priority === 'high').length === 0,
      detail:
        gaps.filter((g) => g.priority === 'high').length === 0
          ? 'No high-priority market gaps vs the catalog.'
          : `Close ${gaps.filter((g) => g.priority === 'high').length} high-demand skills first.`,
    },
    {
      id: 'roles',
      label: 'Desired roles set',
      done: (profile.desiredRoles?.length ?? 0) > 0,
      detail:
        (profile.desiredRoles?.length ?? 0) > 0
          ? 'Desired roles guide path suggestions.'
          : 'Add desired roles so paths stay relevant.',
    },
  ];

  const doneCount = checklist.filter((c) => c.done).length;
  let score = Math.round((doneCount / checklist.length) * 100);
  if (skillCoveragePct != null) {
    score = Math.round(score * 0.55 + skillCoveragePct * 0.45);
  }

  let level: FitLevel = 'unknown';
  if (score >= 75) level = 'strong';
  else if (score >= 45) level = 'partial';
  else level = 'gap';

  return {
    score,
    level,
    targetSeniority: target,
    yearsGap,
    skillCoveragePct,
    checklist,
    detail:
      level === 'strong'
        ? `Strong promotion readiness toward ${target} — emphasize scope and impact in applications.`
        : level === 'partial'
          ? `Partial readiness for ${target}. Follow the roadmap to close remaining gaps.`
          : `Early for a ${target} move — prioritize high-demand skills and experience evidence.`,
  };
}

function buildSummary(input: {
  gapCount: number;
  trendingTop: string | null;
  readiness: PromotionReadinessDto;
}): string {
  if (input.gapCount === 0) {
    return `Your skills align well with the current catalog. Focus on ${input.readiness.targetSeniority} scope and salary positioning.`;
  }
  const trend = input.trendingTop ? ` ${input.trendingTop} leads market demand.` : '';
  return `You have ${input.gapCount} skill gap${input.gapCount === 1 ? '' : 's'} vs active roles.${trend} Promotion readiness toward ${input.readiness.targetSeniority}: ${input.readiness.score}%.`;
}

export function buildCareerGrowthHub(
  profile: GrowthProfileInput | null,
  jobs: GrowthJobInput[],
): CareerGrowthHubDto {
  const safeProfile: GrowthProfileInput = profile ?? { skills: [] };
  const profileNorms = new Set(safeProfile.skills.map((s) => normalizeSkill(s.name)));

  const { demand, totalJobs } = aggregateMarketSkills(jobs);
  const trendingTechnologies = demand.slice(0, 12).map((d) => ({
    ...d,
    have: profileNorms.has(normalizeSkill(d.skill)),
  }));

  const skillGaps = buildSkillGaps(demand, profileNorms);
  const roadmap = buildRoadmap(skillGaps);
  const certifications = buildCertifications(skillGaps);
  const careerPaths = buildCareerPaths(safeProfile, skillGaps);
  const salaryGrowth = buildSalaryGrowth(safeProfile, jobs);
  const promotionReadiness = buildPromotionReadiness(safeProfile, jobs, skillGaps);

  return {
    summary: buildSummary({
      gapCount: skillGaps.length,
      trendingTop: trendingTechnologies[0]?.skill ?? null,
      readiness: promotionReadiness,
    }),
    skillGaps,
    roadmap,
    certifications,
    trendingTechnologies,
    careerPaths,
    salaryGrowth,
    promotionReadiness,
    market: {
      activeJobs: totalJobs,
      skillsAnalyzed: demand.length,
    },
  };
}
