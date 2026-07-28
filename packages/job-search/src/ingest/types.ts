export type IngestProviderStatus =
  | 'active'
  | 'needs_api_key'
  | 'needs_board_list'
  | 'deferred_partner'
  | 'deferred_tos';

export type NormalizedIngestJob = {
  source: string;
  externalId: string;
  title: string;
  description: string;
  companyName: string;
  companyWebsiteUrl?: string | null;
  companyLogoUrl?: string | null;
  companyIndustry?: string | null;
  applyUrl?: string | null;
  sourceUrl?: string | null;
  location?: string | null;
  city?: string | null;
  country?: string | null;
  workMode?: string;
  employmentType?: string;
  seniority?: string;
  skills?: string[];
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string;
  salaryPeriod?: string;
  postedAt?: Date | null;
  isActive?: boolean;
};

export type IngestProviderResult = {
  provider: string;
  fetched: number;
  upserted: number;
  skipped: number;
  errors: string[];
};

export type IngestProvider = {
  id: string;
  label: string;
  status: IngestProviderStatus;
  notes: string;
  /** When false, only runs if explicitly requested via --providers */
  enabledByDefault?: boolean;
  fetch: () => Promise<NormalizedIngestJob[]>;
};
