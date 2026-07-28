import {
  fetchJson,
  mapEmploymentType,
  mapSeniority,
  mapWorkMode,
  parseSalaryRange,
  stripHtml,
} from './normalize';
import type { IngestProvider, NormalizedIngestJob } from './types';

type RemotiveJob = {
  id: number | string;
  url?: string;
  title?: string;
  company_name?: string;
  company_logo?: string;
  category?: string;
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
};

export const remotiveProvider: IngestProvider = {
  id: 'remotive',
  label: 'Remotive',
  status: 'active',
  notes: 'Public remote jobs API (credit Remotive / link back to listing).',
  enabledByDefault: true,
  async fetch() {
    const limit = Number(process.env.INGEST_REMOTIVE_LIMIT) || 100;
    const data = await fetchJson<{ jobs?: RemotiveJob[] }>(
      `https://remotive.com/api/remote-jobs?limit=${limit}`,
    );
    return (data.jobs ?? []).map((job): NormalizedIngestJob => {
      const salary = parseSalaryRange(job.salary);
      return {
        source: 'remotive',
        externalId: String(job.id),
        title: job.title ?? 'Untitled role',
        description: stripHtml(job.description ?? ''),
        companyName: job.company_name ?? 'Unknown company',
        companyLogoUrl: job.company_logo,
        companyIndustry: job.category,
        applyUrl: job.url,
        sourceUrl: job.url,
        location: job.candidate_required_location ?? 'Remote',
        country: job.candidate_required_location ?? null,
        workMode: 'remote',
        employmentType: mapEmploymentType(job.job_type),
        seniority: 'mid',
        skills: job.category ? [job.category] : [],
        salaryMin: salary.salaryMin,
        salaryMax: salary.salaryMax,
        salaryCurrency: salary.salaryCurrency,
        postedAt: job.publication_date ? new Date(job.publication_date) : null,
      };
    });
  },
};

type HimalayasJob = {
  title?: string;
  excerpt?: string;
  description?: string;
  companyName?: string;
  companySlug?: string;
  companyLogo?: string;
  employmentType?: string;
  minSalary?: number;
  maxSalary?: number;
  salaryPeriod?: string;
  seniority?: string[];
  currency?: string;
  locationRestrictions?: string[];
  applicationLink?: string;
  guid?: string;
  pubDate?: number | string;
};

export const himalayasProvider: IngestProvider = {
  id: 'himalayas',
  label: 'Himalayas',
  status: 'active',
  notes: 'Public remote jobs API — free, no key.',
  enabledByDefault: true,
  async fetch() {
    const limit = Math.min(Number(process.env.INGEST_HIMALAYAS_LIMIT) || 100, 20);
    const pages = Math.min(Number(process.env.INGEST_HIMALAYAS_PAGES) || 5, 25);
    const jobs: NormalizedIngestJob[] = [];
    for (let page = 0; page < pages; page += 1) {
      const offset = page * limit;
      const data = await fetchJson<{ jobs?: HimalayasJob[]; totalCount?: number }>(
        `https://himalayas.app/jobs/api?limit=${limit}&offset=${offset}`,
      );
      const batch = data.jobs ?? [];
      if (!batch.length) break;
      for (const job of batch) {
        const loc = job.locationRestrictions?.[0] ?? 'Remote';
        const externalId =
          job.guid ||
          `${job.companySlug ?? 'co'}-${job.title ?? 'role'}-${job.pubDate ?? offset}`;
        jobs.push({
          source: 'himalayas',
          externalId: String(externalId),
          title: job.title ?? 'Untitled role',
          description: stripHtml(job.description || job.excerpt || ''),
          companyName: job.companyName ?? 'Unknown company',
          companyLogoUrl: job.companyLogo,
          applyUrl: job.applicationLink,
          sourceUrl: job.applicationLink,
          location: loc,
          country: loc,
          workMode: 'remote',
          employmentType: mapEmploymentType(job.employmentType),
          seniority: mapSeniority(job.seniority?.[0]),
          salaryMin: job.minSalary ?? null,
          salaryMax: job.maxSalary ?? null,
          salaryCurrency: job.currency ?? 'USD',
          salaryPeriod: (job.salaryPeriod ?? 'year').includes('month') ? 'month' : 'year',
          postedAt:
            typeof job.pubDate === 'number'
              ? new Date(job.pubDate * 1000)
              : job.pubDate
                ? new Date(job.pubDate)
                : null,
        });
      }
      if (batch.length < limit) break;
    }
    return jobs;
  },
};

type JobicyJob = {
  id?: number | string;
  url?: string;
  jobTitle?: string;
  companyName?: string;
  companyLogo?: string;
  jobIndustry?: string[];
  jobType?: string[];
  jobGeo?: string;
  jobLevel?: string;
  jobDescription?: string;
  jobExcerpt?: string;
  pubDate?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
};

export const jobicyProvider: IngestProvider = {
  id: 'jobicy',
  label: 'Jobicy',
  status: 'active',
  notes: 'Public remote jobs API — credit Jobicy + link to original URL.',
  enabledByDefault: true,
  async fetch() {
    const count = Math.min(Number(process.env.INGEST_JOBICY_LIMIT) || 100, 100);
    const data = await fetchJson<{ jobs?: JobicyJob[] }>(
      `https://jobicy.com/api/v2/remote-jobs?count=${count}`,
    );
    return (data.jobs ?? []).map((job): NormalizedIngestJob => ({
      source: 'jobicy',
      externalId: String(job.id ?? job.url),
      title: job.jobTitle ?? 'Untitled role',
      description: stripHtml(job.jobDescription || job.jobExcerpt || ''),
      companyName: job.companyName ?? 'Unknown company',
      companyLogoUrl: job.companyLogo,
      companyIndustry: job.jobIndustry?.[0] ?? null,
      applyUrl: job.url,
      sourceUrl: job.url,
      location: job.jobGeo ?? 'Remote',
      country: job.jobGeo ?? null,
      workMode: 'remote',
      employmentType: mapEmploymentType(job.jobType?.[0]),
      seniority: mapSeniority(job.jobLevel),
      skills: job.jobIndustry ?? [],
      salaryMin: job.salaryMin ?? null,
      salaryMax: job.salaryMax ?? null,
      salaryCurrency: job.salaryCurrency ?? 'USD',
      salaryPeriod: job.salaryPeriod ?? 'year',
      postedAt: job.pubDate ? new Date(job.pubDate) : null,
    }));
  },
};

type ArbeitnowJob = {
  slug?: string;
  company_name?: string;
  title?: string;
  description?: string;
  remote?: boolean;
  url?: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at?: number;
};

export const arbeitnowProvider: IngestProvider = {
  id: 'arbeitnow',
  label: 'Arbeitnow',
  status: 'active',
  notes: 'Public Europe + remote job board API.',
  enabledByDefault: true,
  async fetch() {
    const pages = Math.min(Number(process.env.INGEST_ARBEITNOW_PAGES) || 3, 10);
    const jobs: NormalizedIngestJob[] = [];
    for (let page = 1; page <= pages; page += 1) {
      const data = await fetchJson<{ data?: ArbeitnowJob[] }>(
        `https://www.arbeitnow.com/api/job-board-api?page=${page}`,
      );
      const batch = data.data ?? [];
      if (!batch.length) break;
      for (const job of batch) {
        jobs.push({
          source: 'arbeitnow',
          externalId: job.slug || `${job.company_name}-${job.title}`,
          title: job.title ?? 'Untitled role',
          description: stripHtml(job.description ?? ''),
          companyName: job.company_name ?? 'Unknown company',
          applyUrl: job.url,
          sourceUrl: job.url,
          location: job.location ?? (job.remote ? 'Remote' : null),
          country: job.location ?? null,
          workMode: job.remote ? 'remote' : mapWorkMode(job.location, 'on-site'),
          employmentType: mapEmploymentType(job.job_types?.[0]),
          seniority: 'mid',
          skills: job.tags ?? [],
          postedAt: job.created_at ? new Date(job.created_at * 1000) : null,
        });
      }
    }
    return jobs;
  },
};

type RemoteOkJob = {
  id?: string | number;
  slug?: string;
  company?: string;
  company_logo?: string;
  position?: string;
  description?: string;
  url?: string;
  location?: string;
  tags?: string[];
  salary_min?: number;
  salary_max?: number;
  date?: string;
  epoch?: number;
};

export const remoteokProvider: IngestProvider = {
  id: 'remoteok',
  label: 'Remote OK',
  status: 'active',
  notes: 'Public JSON API — must link back to Remote OK listing (ToS).',
  enabledByDefault: true,
  async fetch() {
    const limit = Number(process.env.INGEST_REMOTEOK_LIMIT) || 100;
    const raw = await fetchJson<Array<RemoteOkJob & { legal?: string }>>('https://remoteok.com/api');
    const jobs = raw.filter((row) => row.id && row.position).slice(0, limit);
    return jobs.map((job): NormalizedIngestJob => ({
      source: 'remoteok',
      externalId: String(job.id),
      title: job.position ?? 'Untitled role',
      description: stripHtml(job.description ?? ''),
      companyName: job.company ?? 'Unknown company',
      companyLogoUrl: job.company_logo,
      applyUrl: job.url || (job.slug ? `https://remoteok.com/remote-jobs/${job.slug}` : null),
      sourceUrl: job.slug ? `https://remoteok.com/remote-jobs/${job.slug}` : job.url,
      location: job.location || 'Remote',
      workMode: 'remote',
      employmentType: 'full-time',
      seniority: mapSeniority(job.tags?.join(' ')),
      skills: (job.tags ?? []).slice(0, 20),
      salaryMin: job.salary_min ?? null,
      salaryMax: job.salary_max ?? null,
      salaryCurrency: 'USD',
      postedAt: job.date ? new Date(job.date) : job.epoch ? new Date(job.epoch * 1000) : null,
    }));
  },
};
