import {
  fetchJson,
  mapEmploymentType,
  mapSeniority,
  mapWorkMode,
  stripHtml,
} from './normalize';
import type { IngestProvider, NormalizedIngestJob } from './types';

function csvEnv(name: string): string[] {
  return (process.env[name] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const adzunaProvider: IngestProvider = {
  id: 'adzuna',
  label: 'Adzuna',
  status: 'needs_api_key',
  notes: 'Requires ADZUNA_APP_ID + ADZUNA_APP_KEY. Set ADZUNA_COUNTRY (default us).',
  enabledByDefault: false,
  async fetch() {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    if (!appId || !appKey) {
      throw new Error('ADZUNA_APP_ID and ADZUNA_APP_KEY are required');
    }
    const country = (process.env.ADZUNA_COUNTRY || 'us').toLowerCase();
    const pages = Math.min(Number(process.env.INGEST_ADZUNA_PAGES) || 3, 10);
    const what = process.env.ADZUNA_WHAT || 'software engineer';
    const jobs: NormalizedIngestJob[] = [];
    for (let page = 1; page <= pages; page += 1) {
      const url =
        `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}` +
        `?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}` +
        `&results_per_page=50&what=${encodeURIComponent(what)}`;
      const data = await fetchJson<{
        results?: Array<{
          id?: string | number;
          title?: string;
          description?: string;
          created?: string;
          redirect_url?: string;
          company?: { display_name?: string };
          location?: { display_name?: string; area?: string[] };
          salary_min?: number;
          salary_max?: number;
          contract_type?: string;
        }>;
      }>(url);
      for (const job of data.results ?? []) {
        jobs.push({
          source: 'adzuna',
          externalId: String(job.id),
          title: job.title ?? 'Untitled role',
          description: stripHtml(job.description ?? ''),
          companyName: job.company?.display_name ?? 'Unknown company',
          applyUrl: job.redirect_url,
          sourceUrl: job.redirect_url,
          location: job.location?.display_name ?? null,
          country: job.location?.area?.[0] ?? country.toUpperCase(),
          workMode: mapWorkMode(job.description, 'on-site'),
          employmentType: mapEmploymentType(job.contract_type),
          seniority: mapSeniority(job.title),
          salaryMin: job.salary_min ?? null,
          salaryMax: job.salary_max ?? null,
          salaryCurrency: country === 'gb' ? 'GBP' : country === 'de' ? 'EUR' : 'USD',
          postedAt: job.created ? new Date(job.created) : null,
        });
      }
    }
    return jobs;
  },
};

export const usajobsProvider: IngestProvider = {
  id: 'usajobs',
  label: 'USAJobs',
  status: 'needs_api_key',
  notes: 'Official U.S. federal jobs. Requires USAJOBS_API_KEY + USAJOBS_USER_AGENT (email).',
  enabledByDefault: false,
  async fetch() {
    const key = process.env.USAJOBS_API_KEY;
    const agent = process.env.USAJOBS_USER_AGENT;
    if (!key || !agent) {
      throw new Error('USAJOBS_API_KEY and USAJOBS_USER_AGENT are required');
    }
    const keyword = process.env.USAJOBS_KEYWORD || 'software';
    const pages = Math.min(Number(process.env.INGEST_USAJOBS_PAGES) || 3, 10);
    const jobs: NormalizedIngestJob[] = [];
    for (let page = 1; page <= pages; page += 1) {
      const url =
        `https://data.usajobs.gov/api/search?Keyword=${encodeURIComponent(keyword)}` +
        `&ResultsPerPage=50&Page=${page}`;
      const data = await fetchJson<{
        SearchResult?: {
          SearchResultItems?: Array<{
            MatchedObjectId?: string;
            MatchedObjectDescriptor?: {
              PositionTitle?: string;
              PositionURI?: string;
              ApplyURI?: string[];
              OrganizationName?: string;
              UserArea?: { Details?: { JobSummary?: string } };
              PositionLocation?: Array<{
                LocationName?: string;
                CityName?: string;
                CountryCode?: string;
              }>;
              PositionRemuneration?: Array<{
                MinimumRange?: string;
                MaximumRange?: string;
              }>;
              PublicationStartDate?: string;
            };
          }>;
        };
      }>(url, {
        headers: {
          Host: 'data.usajobs.gov',
          'User-Agent': agent,
          'Authorization-Key': key,
        },
      });

      for (const item of data.SearchResult?.SearchResultItems ?? []) {
        const d = item.MatchedObjectDescriptor;
        if (!d) continue;
        const loc = d.PositionLocation?.[0];
        const pay = d.PositionRemuneration?.[0];
        jobs.push({
          source: 'usajobs',
          externalId: String(item.MatchedObjectId ?? d.PositionURI),
          title: d.PositionTitle ?? 'Federal role',
          description: stripHtml(d.UserArea?.Details?.JobSummary ?? d.PositionTitle ?? ''),
          companyName: d.OrganizationName ?? 'U.S. Federal Government',
          applyUrl: d.ApplyURI?.[0] ?? d.PositionURI,
          sourceUrl: d.PositionURI,
          location: loc?.LocationName ?? null,
          city: loc?.CityName ?? null,
          country: loc?.CountryCode ?? 'US',
          workMode: mapWorkMode(d.PositionTitle, 'on-site'),
          employmentType: 'full-time',
          seniority: mapSeniority(d.PositionTitle),
          salaryMin: pay?.MinimumRange ? Number(pay.MinimumRange) : null,
          salaryMax: pay?.MaximumRange ? Number(pay.MaximumRange) : null,
          salaryCurrency: 'USD',
          postedAt: d.PublicationStartDate ? new Date(d.PublicationStartDate) : null,
        });
      }
    }
    return jobs;
  },
};

export const greenhouseProvider: IngestProvider = {
  id: 'greenhouse',
  label: 'Greenhouse public boards',
  status: 'needs_board_list',
  notes: 'Per-company boards via GREENHOUSE_BOARDS=company-slug,another (boards.greenhouse.io).',
  enabledByDefault: false,
  async fetch() {
    const boards = csvEnv('GREENHOUSE_BOARDS');
    if (!boards.length) throw new Error('Set GREENHOUSE_BOARDS=company1,company2');
    const jobs: NormalizedIngestJob[] = [];
    for (const board of boards) {
      const data = await fetchJson<{
        jobs?: Array<{
          id?: number;
          title?: string;
          absolute_url?: string;
          location?: { name?: string };
          updated_at?: string;
          content?: string;
        }>;
      }>(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`);
      for (const job of data.jobs ?? []) {
        jobs.push({
          source: 'greenhouse',
          externalId: `${board}-${job.id}`,
          title: job.title ?? 'Untitled role',
          description: stripHtml(job.content ?? ''),
          companyName: board,
          applyUrl: job.absolute_url,
          sourceUrl: job.absolute_url,
          location: job.location?.name ?? null,
          workMode: mapWorkMode(job.location?.name, 'hybrid'),
          employmentType: 'full-time',
          seniority: mapSeniority(job.title),
          postedAt: job.updated_at ? new Date(job.updated_at) : null,
        });
      }
    }
    return jobs;
  },
};

export const leverProvider: IngestProvider = {
  id: 'lever',
  label: 'Lever public boards',
  status: 'needs_board_list',
  notes: 'Per-company boards via LEVER_BOARDS=company-slug (api.lever.co/v0/postings).',
  enabledByDefault: false,
  async fetch() {
    const boards = csvEnv('LEVER_BOARDS');
    if (!boards.length) throw new Error('Set LEVER_BOARDS=company1,company2');
    const jobs: NormalizedIngestJob[] = [];
    for (const board of boards) {
      const data = await fetchJson<
        Array<{
          id?: string;
          text?: string;
          hostedUrl?: string;
          applyUrl?: string;
          createdAt?: number;
          categories?: { location?: string; commitment?: string; level?: string };
          descriptionPlain?: string;
          description?: string;
        }>
      >(`https://api.lever.co/v0/postings/${encodeURIComponent(board)}?mode=json`);
      for (const job of data) {
        jobs.push({
          source: 'lever',
          externalId: `${board}-${job.id}`,
          title: job.text ?? 'Untitled role',
          description: stripHtml(job.descriptionPlain || job.description || ''),
          companyName: board,
          applyUrl: job.applyUrl || job.hostedUrl,
          sourceUrl: job.hostedUrl,
          location: job.categories?.location ?? null,
          workMode: mapWorkMode(job.categories?.location, 'hybrid'),
          employmentType: mapEmploymentType(job.categories?.commitment),
          seniority: mapSeniority(job.categories?.level || job.text),
          postedAt: job.createdAt ? new Date(job.createdAt) : null,
        });
      }
    }
    return jobs;
  },
};

export const ashbyProvider: IngestProvider = {
  id: 'ashby',
  label: 'Ashby public boards',
  status: 'needs_board_list',
  notes: 'Per-company boards via ASHBY_BOARDS=company-slug (api.ashbyhq.com/posting-api).',
  enabledByDefault: false,
  async fetch() {
    const boards = csvEnv('ASHBY_BOARDS');
    if (!boards.length) throw new Error('Set ASHBY_BOARDS=company1,company2');
    const jobs: NormalizedIngestJob[] = [];
    for (const board of boards) {
      const data = await fetchJson<{
        jobs?: Array<{
          id?: string;
          title?: string;
          jobUrl?: string;
          applyUrl?: string;
          location?: string;
          publishedAt?: string;
          descriptionPlain?: string;
          descriptionHtml?: string;
          employmentType?: string;
        }>;
      }>(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}`);
      for (const job of data.jobs ?? []) {
        jobs.push({
          source: 'ashby',
          externalId: `${board}-${job.id}`,
          title: job.title ?? 'Untitled role',
          description: stripHtml(job.descriptionPlain || job.descriptionHtml || ''),
          companyName: board,
          applyUrl: job.applyUrl || job.jobUrl,
          sourceUrl: job.jobUrl,
          location: job.location ?? null,
          workMode: mapWorkMode(job.location, 'hybrid'),
          employmentType: mapEmploymentType(job.employmentType),
          seniority: mapSeniority(job.title),
          postedAt: job.publishedAt ? new Date(job.publishedAt) : null,
        });
      }
    }
    return jobs;
  },
};

export const workableProvider: IngestProvider = {
  id: 'workable',
  label: 'Workable public boards',
  status: 'needs_board_list',
  notes: 'Per-company boards via WORKABLE_BOARDS=subdomain (apply.workable.com/api/v1/widget/accounts).',
  enabledByDefault: false,
  async fetch() {
    const boards = csvEnv('WORKABLE_BOARDS');
    if (!boards.length) throw new Error('Set WORKABLE_BOARDS=company1,company2');
    const jobs: NormalizedIngestJob[] = [];
    for (const board of boards) {
      const data = await fetchJson<{
        jobs?: Array<{
          id?: string | number;
          title?: string;
          shortcode?: string;
          url?: string;
          location?: { city?: string; country?: string; telecommuting?: boolean };
          created_at?: string;
          description?: string;
          employment_type?: string;
        }>;
      }>(`https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(board)}`);
      for (const job of data.jobs ?? []) {
        const loc = [job.location?.city, job.location?.country].filter(Boolean).join(', ');
        jobs.push({
          source: 'workable',
          externalId: `${board}-${job.shortcode || job.id}`,
          title: job.title ?? 'Untitled role',
          description: stripHtml(job.description ?? ''),
          companyName: board,
          applyUrl: job.url,
          sourceUrl: job.url,
          location: loc || null,
          city: job.location?.city ?? null,
          country: job.location?.country ?? null,
          workMode: job.location?.telecommuting ? 'remote' : mapWorkMode(loc, 'on-site'),
          employmentType: mapEmploymentType(job.employment_type),
          seniority: mapSeniority(job.title),
          postedAt: job.created_at ? new Date(job.created_at) : null,
        });
      }
    }
    return jobs;
  },
};
