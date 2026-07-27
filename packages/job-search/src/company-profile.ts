import type {
  CompanyCultureSignalDto,
  CompanyDto,
  CompanyHiringStatsDto,
  CompanyMixStatDto,
  CompanyOpenRoleDto,
  CompanyProfileDto,
  CompanySalaryEstimateDto,
  CompanySkillStatDto,
  CompanyViewerStatsDto,
  FitLevel,
  HiringVelocity,
} from '@jobmatch/types';

export type CompanyJobInput = {
  id: string;
  slug: string;
  title: string;
  workMode: string;
  seniority: string;
  location: string | null;
  city: string | null;
  country: string | null;
  skills: string[];
  benefits: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryPeriod: string;
  postedAt: Date;
  matchScore?: number;
};

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function countMix(values: string[]): CompanyMixStatDto[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

function aggregateTechStack(jobs: CompanyJobInput[]): CompanySkillStatDto[] {
  const counts = new Map<string, number>();
  for (const job of jobs) {
    for (const skill of job.skills) {
      const key = skill.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill))
    .slice(0, 16);
}

function aggregateBenefits(jobs: CompanyJobInput[]): string[] {
  const counts = new Map<string, string>();
  for (const job of jobs) {
    for (const benefit of job.benefits) {
      const trimmed = benefit.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!counts.has(key)) counts.set(key, trimmed);
    }
  }
  return [...counts.values()].slice(0, 12);
}

function aggregateLocations(jobs: CompanyJobInput[]): string[] {
  const seen = new Set<string>();
  const locations: string[] = [];
  for (const job of jobs) {
    const label =
      job.location?.trim() ||
      [job.city, job.country].filter(Boolean).join(', ') ||
      null;
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    locations.push(label);
  }
  return locations.sort((a, b) => a.localeCompare(b));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

function aggregateSalaryEstimates(jobs: CompanyJobInput[]): CompanySalaryEstimateDto[] {
  const groups = new Map<string, CompanyJobInput[]>();
  for (const job of jobs) {
    if (job.salaryMin == null && job.salaryMax == null) continue;
    const key = `${job.salaryCurrency}:${job.salaryPeriod}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(job);
    groups.set(key, bucket);
  }

  return [...groups.entries()].map(([key, bucket]) => {
    const [currency, period] = key.split(':');
    const lows = bucket.map((j) => j.salaryMin ?? j.salaryMax!).filter((v) => v != null);
    const highs = bucket.map((j) => j.salaryMax ?? j.salaryMin!).filter((v) => v != null);
    const mids = bucket
      .map((j) => {
        if (j.salaryMin != null && j.salaryMax != null) {
          return Math.round((j.salaryMin + j.salaryMax) / 2);
        }
        return j.salaryMin ?? j.salaryMax;
      })
      .filter((v): v is number => v != null);

    return {
      currency: currency ?? 'USD',
      period: period ?? 'year',
      min: lows.length ? Math.min(...lows) : null,
      max: highs.length ? Math.max(...highs) : null,
      median: median(mids),
      roleCount: bucket.length,
    };
  });
}

function computeHiringStats(jobs: CompanyJobInput[]): CompanyHiringStatsDto {
  const since30 = daysAgo(30);
  const since90 = daysAgo(90);
  const postedLast30Days = jobs.filter((j) => j.postedAt >= since30).length;
  const postedLast90Days = jobs.filter((j) => j.postedAt >= since90).length;

  let velocity: HiringVelocity = 'unknown';
  if (jobs.length >= 2) {
    const baseline = postedLast90Days / 3;
    if (postedLast30Days >= Math.max(2, baseline * 1.25)) velocity = 'accelerating';
    else if (postedLast30Days === 0 && jobs.length > 0) velocity = 'slow';
    else velocity = 'steady';
  } else if (jobs.length === 1) {
    velocity = postedLast30Days === 1 ? 'steady' : 'slow';
  }

  return {
    openRoles: jobs.length,
    postedLast30Days,
    postedLast90Days,
    velocity,
  };
}

function pct(count: number, total: number) {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

function buildCultureSignals(jobs: CompanyJobInput[], benefits: string[]): CompanyCultureSignalDto[] {
  const total = jobs.length;
  const remoteCount = jobs.filter((j) => j.workMode === 'remote').length;
  const hybridCount = jobs.filter((j) => j.workMode === 'hybrid').length;
  const remotePct = pct(remoteCount, total);
  const hybridPct = pct(hybridCount, total);
  const seniorCount = jobs.filter((j) =>
    ['senior', 'lead', 'principal'].includes(j.seniority),
  ).length;
  const seniorPct = pct(seniorCount, total);

  const remoteLevel: FitLevel =
    remotePct >= 60 ? 'strong' : remotePct >= 30 || hybridPct >= 40 ? 'partial' : 'gap';
  const remoteDetail =
    remotePct >= 60
      ? `${remotePct}% of open roles are fully remote.`
      : hybridPct >= 40
        ? `${hybridPct}% hybrid and ${remotePct}% remote across active listings.`
        : total > 0
          ? `Most active roles are on-site or hybrid (${remotePct}% fully remote).`
          : 'No active listings to infer work style.';

  const benefitsLower = benefits.map((b) => b.toLowerCase()).join(' ');
  const hasHealth = /health|medical|dental|vision|insurance/.test(benefitsLower);
  const hasEquity = /equity|stock|401|retirement|pension/.test(benefitsLower);
  const hasLeave = /pto|vacation|parental|leave|sabbatical/.test(benefitsLower);
  const perkScore = [hasHealth, hasEquity, hasLeave].filter(Boolean).length;
  const benefitsLevel: FitLevel =
    perkScore >= 2 ? 'strong' : perkScore === 1 ? 'partial' : benefits.length ? 'partial' : 'unknown';
  const benefitsDetail =
    benefits.length === 0
      ? 'Benefits vary by role — check individual postings.'
      : perkScore >= 2
        ? 'Listings mention health coverage, equity or retirement, and paid leave themes.'
        : 'Some benefits are highlighted across roles; review each posting for specifics.';

  const seniorLevel: FitLevel =
    seniorPct >= 50 ? 'strong' : seniorPct >= 25 ? 'partial' : total ? 'unknown' : 'unknown';
  const seniorDetail =
    seniorPct >= 50
      ? `${seniorPct}% of open roles target senior+ experience.`
      : seniorPct >= 25
        ? 'Mix of seniority levels across the active pipeline.'
        : 'Mostly mid-level and junior openings in the current catalog.';

  return [
    { key: 'remote_friendly', label: 'Remote-friendly', level: remoteLevel, detail: remoteDetail },
    { key: 'benefits', label: 'Benefits themes', level: benefitsLevel, detail: benefitsDetail },
    { key: 'senior_hiring', label: 'Senior hiring', level: seniorLevel, detail: seniorDetail },
  ];
}

function buildSummary(input: {
  company: CompanyDto;
  hiring: CompanyHiringStatsDto;
  techStack: CompanySkillStatDto[];
  locations: string[];
}) {
  const { company, hiring, techStack, locations } = input;
  const parts: string[] = [];

  if (company.industry) parts.push(`${company.name} operates in ${company.industry.toLowerCase()}.`);
  else parts.push(`${company.name} is actively hiring.`);

  if (hiring.openRoles === 0) {
    parts.push('There are no open roles in the catalog right now.');
  } else if (hiring.openRoles === 1) {
    parts.push('One open role is listed today.');
  } else {
    parts.push(`${hiring.openRoles} open roles are listed today.`);
  }

  if (hiring.velocity === 'accelerating') {
    parts.push('Posting volume picked up in the last 30 days.');
  }

  if (techStack.length >= 3) {
    parts.push(
      `Common stack themes include ${techStack
        .slice(0, 3)
        .map((s) => s.skill)
        .join(', ')}.`,
    );
  }

  if (locations.length > 1) {
    parts.push(`Roles span ${locations.length} locations.`);
  } else if (locations.length === 1) {
    parts.push(`Current listings focus on ${locations[0]}.`);
  }

  return parts.join(' ');
}

function toOpenRoles(jobs: CompanyJobInput[]): CompanyOpenRoleDto[] {
  return jobs
    .slice()
    .sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime())
    .map((job) => ({
      id: job.id,
      slug: job.slug,
      title: job.title,
      workMode: job.workMode,
      seniority: job.seniority,
      location: job.location,
      postedAt: job.postedAt.toISOString(),
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      salaryPeriod: job.salaryPeriod,
      matchScore: job.matchScore,
    }));
}

export function buildCompanyProfile(input: {
  company: CompanyDto;
  jobs: CompanyJobInput[];
  viewer?: CompanyViewerStatsDto;
}): CompanyProfileDto {
  const jobs = input.jobs.filter((j) => j.postedAt instanceof Date);
  const hiring = computeHiringStats(jobs);
  const techStack = aggregateTechStack(jobs);
  const benefits = aggregateBenefits(jobs);
  const locations = aggregateLocations(jobs);
  const workModeMix = countMix(jobs.map((j) => j.workMode));
  const seniorityMix = countMix(jobs.map((j) => j.seniority));
  const salaryEstimates = aggregateSalaryEstimates(jobs);
  const cultureSignals = buildCultureSignals(jobs, benefits);
  const openRoles = toOpenRoles(jobs);

  return {
    company: input.company,
    summary: buildSummary({ company: input.company, hiring, techStack, locations }),
    hiring,
    techStack,
    benefits,
    locations,
    workModeMix,
    seniorityMix,
    salaryEstimates,
    cultureSignals,
    openRoles,
    viewer: input.viewer,
  };
}
