import { keyedProviderMissing, keyedProviderReady } from './boards';
import type { IngestProvider, IngestProviderStatus } from './types';
import {
  arbeitnowProvider,
  himalayasProvider,
  jobicyProvider,
  remoteokProvider,
  remotiveProvider,
} from './providers-public';
import {
  adzunaProvider,
  ashbyProvider,
  greenhouseProvider,
  leverProvider,
  usajobsProvider,
  workableProvider,
} from './providers-keyed';

function deferred(
  id: string,
  label: string,
  status: IngestProviderStatus,
  notes: string,
): IngestProvider {
  return {
    id,
    label,
    status,
    notes,
    enabledByDefault: false,
    async fetch() {
      throw new Error(`${label} is not runnable (${status}): ${notes}`);
    },
  };
}

const KEYED_IDS = new Set([
  'adzuna',
  'usajobs',
  'greenhouse',
  'lever',
  'ashby',
  'workable',
]);

/** Catalog of every platform requested for Wave 2 — active, keyed, or deferred. */
export const INGEST_PROVIDER_CATALOG: IngestProvider[] = [
  remotiveProvider,
  himalayasProvider,
  jobicyProvider,
  arbeitnowProvider,
  remoteokProvider,
  adzunaProvider,
  usajobsProvider,
  greenhouseProvider,
  leverProvider,
  ashbyProvider,
  workableProvider,

  deferred('jooble', 'Jooble', 'deferred_partner', 'Partner/API access required.'),
  deferred('careerjet', 'Careerjet', 'deferred_partner', 'Publisher network / API partnership.'),
  deferred('findwork', 'Findwork', 'needs_api_key', 'Public API exists with FINDWORK_API_KEY — wire next.'),
  deferred('whatjobs', 'WhatJobs', 'deferred_partner', 'Partner feed required.'),
  deferred('ziprecruiter', 'ZipRecruiter', 'deferred_partner', 'Partner/API access only.'),
  deferred('jobs2careers', 'Jobs2Careers', 'deferred_partner', 'Partner feed required.'),
  deferred('reed', 'Reed (UK)', 'needs_api_key', 'Reed Publisher API key required.'),
  deferred('careernest', 'Career Nest', 'deferred_partner', 'No public global feed documented for redistributors.'),

  deferred('recruitee', 'Recruitee', 'needs_board_list', 'Per-company public careers widgets; add board list later.'),
  deferred('personio', 'Personio', 'needs_board_list', 'Per-company XML/JSON careers feeds; add board list later.'),

  deferred('weworkremotely', 'We Work Remotely', 'deferred_tos', 'RSS/HTML only; add RSS parser in a follow-up.'),
  deferred('remoteco', 'Remote.co', 'deferred_tos', 'No redistributable public jobs API.'),
  deferred('flexjobs', 'FlexJobs', 'deferred_partner', 'Paid membership; scraping prohibited.'),
  deferred('wellfound', 'Wellfound (AngelList)', 'deferred_tos', 'No public bulk jobs API for third parties.'),
  deferred('aijobs', 'AI Jobs', 'deferred_tos', 'No documented public bulk API.'),
  deferred('aidevjobs', 'AI Dev Jobs', 'deferred_tos', 'No documented public bulk API.'),
  deferred('jsremotely', 'JS Remotely', 'deferred_tos', 'No documented public bulk API.'),
  deferred('graphqljobs', 'GraphQL Jobs', 'deferred_tos', 'Board appears inactive / no public API.'),

  deferred('upwork', 'Upwork', 'deferred_tos', 'Marketplace ToS; no public job dump API for aggregators.'),
  deferred('freelancer', 'Freelancer', 'deferred_tos', 'Marketplace API is partner-gated.'),
  deferred('toptal', 'Toptal', 'deferred_tos', 'No public open roles dump.'),
  deferred('fiverr', 'Fiverr', 'deferred_tos', 'Gig marketplace; not a job board feed.'),
  deferred('peopleperhour', 'PeoplePerHour', 'deferred_tos', 'Marketplace; no redistributable jobs API.'),

  deferred('google', 'Google Careers', 'deferred_partner', 'Use Greenhouse/Lever board tokens if published; no scrape.'),
  deferred('microsoft', 'Microsoft Careers', 'deferred_partner', 'Official careers site; partner/ATS only.'),
  deferred('amazon', 'Amazon Jobs', 'deferred_partner', 'Official careers site; partner/ATS only.'),
  deferred('meta', 'Meta Careers', 'deferred_partner', 'Official careers site; partner/ATS only.'),
  deferred('netflix', 'Netflix Jobs', 'deferred_partner', 'Often Ashby/Greenhouse — add board slug when known.'),
  deferred('shopify', 'Shopify Careers', 'deferred_partner', 'Covered via default GREENHOUSE_BOARDS=shopify.'),
  deferred('github', 'GitHub Careers', 'deferred_partner', 'Covered via default GREENHOUSE_BOARDS=github.'),
  deferred('openai', 'OpenAI Careers', 'deferred_partner', 'Covered via default ASHBY_BOARDS=openai.'),

  deferred('ukcivil', 'UK Civil Service Jobs', 'deferred_partner', 'Find a Job / CS Jobs feeds need official access.'),
  deferred('eucareers', 'European Union Careers', 'deferred_partner', 'EPSO feeds are not a general jobs API.'),
  deferred('apsjobs', 'Australian APS Jobs', 'deferred_partner', 'Official portal; no redistributor API in-repo.'),
  deferred('gcjobs', 'Canada GC Jobs', 'deferred_partner', 'Official portal; API access is restricted.'),
  deferred('nzgov', 'New Zealand Government Jobs', 'deferred_partner', 'Official portal; no public dump API.'),
];

export function listRunnableProviders(
  ids?: string[],
  options?: { keyedOnly?: boolean; includeKeyed?: boolean },
): IngestProvider[] {
  const wanted = ids?.map((id) => id.trim().toLowerCase()).filter(Boolean);
  if (wanted?.length) {
    return INGEST_PROVIDER_CATALOG.filter((p) => wanted.includes(p.id));
  }

  const publicDefaults = INGEST_PROVIDER_CATALOG.filter(
    (p) => p.enabledByDefault !== false && p.status === 'active',
  );
  const keyedReady = INGEST_PROVIDER_CATALOG.filter(
    (p) => KEYED_IDS.has(p.id) && keyedProviderReady(p.id),
  );

  if (options?.keyedOnly) {
    return keyedReady;
  }

  const includeKeyed =
    options?.includeKeyed === true || process.env.INGEST_INCLUDE_KEYED === 'true';

  if (!includeKeyed) {
    return publicDefaults;
  }

  const seen = new Set(publicDefaults.map((p) => p.id));
  return [...publicDefaults, ...keyedReady.filter((p) => !seen.has(p.id))];
}

export function listProviderCatalogSummary() {
  return INGEST_PROVIDER_CATALOG.map((p) => {
    const keyed = KEYED_IDS.has(p.id);
    const ready = keyed ? keyedProviderReady(p.id) : p.status === 'active';
    return {
      id: p.id,
      label: p.label,
      status: p.status,
      notes: p.notes,
      default: p.enabledByDefault !== false && p.status === 'active',
      ready,
      missing: keyed ? keyedProviderMissing(p.id) : null,
    };
  });
}

export function listKeyedProviderStatus() {
  return ['adzuna', 'usajobs', 'greenhouse', 'lever', 'ashby', 'workable'].map((id) => {
    const provider = INGEST_PROVIDER_CATALOG.find((p) => p.id === id)!;
    return {
      id,
      label: provider.label,
      ready: keyedProviderReady(id),
      missing: keyedProviderMissing(id),
      notes: provider.notes,
    };
  });
}
