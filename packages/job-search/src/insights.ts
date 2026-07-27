import type {
  FitLevel,
  FitSignal,
  JobDto,
  JobInsightsDto,
  LearningRecommendation,
  SkillGapItem,
} from '@jobmatch/types';

import { matchJobSkills, normalizeSkill } from './match';

export type ProfileForInsights = {
  yearsOfExperience?: number | null;
  workLocationPreference?: string | null;
  employmentType?: string | null;
  salaryExpectation?: number | null;
  salaryCurrency?: string | null;
  desiredRoles?: string[];
  skills: Array<{ name: string; category?: string | null; level?: string | null; years?: number | null }>;
};

const SENIORITY_YEARS: Record<string, { min: number; max: number; label: string }> = {
  intern: { min: 0, max: 1, label: 'Intern' },
  junior: { min: 0, max: 2, label: 'Junior' },
  mid: { min: 2, max: 5, label: 'Mid-level' },
  senior: { min: 5, max: 10, label: 'Senior' },
  lead: { min: 8, max: 14, label: 'Lead' },
  principal: { min: 10, max: 99, label: 'Principal' },
};

/** Curated learning paths for common missing skills (offline-friendly, no LLM). */
const LEARNING_CATALOG: Record<
  string,
  Omit<LearningRecommendation, 'skill'>[]
> = {
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

function seniorityFit(jobSeniority: string, years: number | null | undefined): FitSignal {
  const key = jobSeniority.toLowerCase();
  const band = SENIORITY_YEARS[key];
  if (!band) {
    return {
      key: 'seniority',
      label: 'Seniority',
      level: 'unknown',
      detail: `Role targets ${jobSeniority}; add years of experience on your profile for a readout.`,
    };
  }
  if (years == null) {
    return {
      key: 'seniority',
      label: 'Seniority',
      level: 'unknown',
      detail: `${band.label} role — add years of experience on your profile to compare.`,
    };
  }
  if (years >= band.min && years <= band.max) {
    return {
      key: 'seniority',
      label: 'Seniority',
      level: 'strong',
      detail: `Your ${years} years align with this ${band.label} role.`,
    };
  }
  if (years < band.min) {
    return {
      key: 'seniority',
      label: 'Seniority',
      level: 'gap',
      detail: `Role expects ${band.label} (~${band.min}+ years); you have ${years} years listed.`,
    };
  }
  return {
    key: 'seniority',
    label: 'Seniority',
    level: 'partial',
    detail: `You may be over-qualified on paper (${years} years vs ${band.label}).`,
  };
}

function workModeFit(
  jobWorkMode: string,
  preference: string | null | undefined,
): FitSignal {
  if (!preference) {
    return {
      key: 'work_mode',
      label: 'Work mode',
      level: 'unknown',
      detail: `${capitalize(jobWorkMode)} role — set work location preference on your profile.`,
    };
  }
  const job = jobWorkMode.toLowerCase();
  const pref = preference.toLowerCase();
  if (job === pref || pref === 'flexible') {
    return {
      key: 'work_mode',
      label: 'Work mode',
      level: 'strong',
      detail: `${capitalize(jobWorkMode)} matches your ${capitalize(pref)} preference.`,
    };
  }
  if (
    (job === 'hybrid' && (pref === 'remote' || pref === 'on-site')) ||
    (pref === 'hybrid' && (job === 'remote' || job === 'on-site'))
  ) {
    return {
      key: 'work_mode',
      label: 'Work mode',
      level: 'partial',
      detail: `Role is ${jobWorkMode}; you prefer ${preference}.`,
    };
  }
  return {
    key: 'work_mode',
    label: 'Work mode',
    level: 'gap',
    detail: `Role is ${jobWorkMode}; you prefer ${preference}.`,
  };
}

function roleFit(jobTitle: string, desiredRoles: string[] | undefined): FitSignal {
  if (!desiredRoles?.length) {
    return {
      key: 'role',
      label: 'Role alignment',
      level: 'unknown',
      detail: 'Add desired roles on your profile to see alignment.',
    };
  }
  const title = jobTitle.toLowerCase();
  const hit = desiredRoles.some((role) => {
    const r = role.toLowerCase();
    return title.includes(r) || r.includes(title.split(' ')[0] ?? '');
  });
  if (hit) {
    return {
      key: 'role',
      label: 'Role alignment',
      level: 'strong',
      detail: 'This title overlaps with your desired roles.',
    };
  }
  return {
    key: 'role',
    label: 'Role alignment',
    level: 'partial',
    detail: 'Title differs from your stated desired roles — still worth reviewing fit.',
  };
}

function salaryFit(
  job: Pick<JobDto, 'salaryMin' | 'salaryMax' | 'salaryCurrency' | 'salaryPeriod'>,
  expectation: number | null | undefined,
  currency: string | null | undefined,
): FitSignal {
  if (!job.salaryMin && !job.salaryMax) {
    return {
      key: 'salary',
      label: 'Compensation',
      level: 'unknown',
      detail: 'Salary not listed for this role.',
    };
  }
  if (expectation == null) {
    return {
      key: 'salary',
      label: 'Compensation',
      level: 'unknown',
      detail: 'Add a salary expectation on your profile to compare.',
    };
  }
  const jobCur = (job.salaryCurrency || 'USD').toUpperCase();
  const profCur = (currency || 'USD').toUpperCase();
  if (jobCur !== profCur) {
    return {
      key: 'salary',
      label: 'Compensation',
      level: 'unknown',
      detail: `Role lists ${jobCur}; your expectation is in ${profCur}.`,
    };
  }
  const bandTop = job.salaryMax ?? job.salaryMin ?? 0;
  const bandBottom = job.salaryMin ?? job.salaryMax ?? 0;
  if (expectation >= bandBottom && expectation <= bandTop) {
    return {
      key: 'salary',
      label: 'Compensation',
      level: 'strong',
      detail: 'Your expectation sits within the posted band.',
    };
  }
  if (expectation < bandBottom) {
    return {
      key: 'salary',
      label: 'Compensation',
      level: 'strong',
      detail: 'Posted band meets or exceeds your expectation.',
    };
  }
  return {
    key: 'salary',
    label: 'Compensation',
    level: 'gap',
    detail: 'Your expectation is above the posted salary band.',
  };
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replace('-', ' ');
}

function gapPriority(
  skill: string,
  job: Pick<JobDto, 'skills' | 'requirements'>,
): SkillGapItem['priority'] {
  const norm = normalizeSkill(skill);
  const idx = job.skills.findIndex((s) => normalizeSkill(s) === norm);
  if (idx >= 0 && idx < Math.ceil(job.skills.length / 2)) return 'high';

  const reqHit = job.requirements.some((line) =>
    line.toLowerCase().includes(skill.toLowerCase()),
  );
  if (reqHit) return 'high';

  if (idx >= 0) return 'medium';
  return 'low';
}

function gapReason(skill: string, priority: SkillGapItem['priority']) {
  if (priority === 'high') return 'Listed early in requirements or core skills for this role.';
  if (priority === 'medium') return 'Expected skill for this role.';
  return 'Nice-to-have or secondary skill for this posting.';
}

function learningForSkill(skill: string): LearningRecommendation[] {
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

function buildSummary(input: {
  matchScore: number | null;
  gapCount: number;
  fitSignals: FitSignal[];
}) {
  if (input.matchScore == null) {
    return 'Add skills to your career profile to unlock match scoring and personalised gaps.';
  }
  const strong = input.fitSignals.filter((s) => s.level === 'strong').length;
  const gaps = input.fitSignals.filter((s) => s.level === 'gap').length;

  if (input.matchScore >= 70 && gaps === 0) {
    return 'Strong overall fit — your skills and preferences align well with this role.';
  }
  if (input.matchScore >= 50) {
    return `Solid skill overlap (${input.matchScore}%). Closing ${input.gapCount} skill gap${input.gapCount === 1 ? '' : 's'} could strengthen your candidacy.`;
  }
  if (strong > 0) {
    return `Partial fit (${input.matchScore}%). You align on ${strong} dimension${strong === 1 ? '' : 's'}, but several gaps remain.`;
  }
  return `Stretch role (${input.matchScore}% skill match). Review gaps and learning paths before applying.`;
}

export function buildJobInsights(
  job: JobDto,
  profile: ProfileForInsights | null,
): JobInsightsDto {
  const profileSkillNames = profile?.skills.map((s) => s.name) ?? [];
  const match = matchJobSkills(profileSkillNames, job.skills);

  const matchedSkills = match?.matchedSkills ?? [];
  const missingSkills = match?.missingSkills ?? [];
  const matchScore = match?.matchScore ?? null;

  const skillGaps: SkillGapItem[] = missingSkills.map((skill) => {
    const priority = gapPriority(skill, job);
    return { skill, priority, reason: gapReason(skill, priority) };
  });

  skillGaps.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });

  const fitSignals: FitSignal[] = profile
    ? [
        seniorityFit(job.seniority, profile.yearsOfExperience),
        workModeFit(job.workMode, profile.workLocationPreference),
        roleFit(job.title, profile.desiredRoles),
        salaryFit(job, profile.salaryExpectation, profile.salaryCurrency),
      ]
    : [];

  const learningRecommendations = skillGaps
    .filter((g) => g.priority !== 'low')
    .slice(0, 5)
    .flatMap((g) => learningForSkill(g.skill))
    .slice(0, 6);

  return {
    jobId: job.id,
    jobSlug: job.slug,
    matchScore,
    matchedSkills,
    missingSkills,
    skillGaps,
    fitSignals,
    learningRecommendations,
    summary: buildSummary({
      matchScore,
      gapCount: skillGaps.length,
      fitSignals,
    }),
  };
}

export function fitLevelTone(level: FitLevel): 'success' | 'warning' | 'muted' {
  if (level === 'strong') return 'success';
  if (level === 'partial') return 'warning';
  return 'muted';
}
