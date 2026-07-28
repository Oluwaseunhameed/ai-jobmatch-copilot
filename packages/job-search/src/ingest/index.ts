import { uniqueJobs } from './normalize';
import { listProviderCatalogSummary, listRunnableProviders } from './catalog';
import { upsertIngestJobs } from './upsert';
import type { IngestProviderResult } from './types';
import { createLogger, type StructuredLogger } from '../logger';

export async function runJobIngest(input?: {
  providers?: string[];
  logger?: StructuredLogger;
  maxPerProvider?: number;
  keyedOnly?: boolean;
  includeKeyed?: boolean;
}): Promise<{
  results: IngestProviderResult[];
  totalUpserted: number;
  catalog: ReturnType<typeof listProviderCatalogSummary>;
}> {
  const logger = input?.logger ?? createLogger('job-ingest');
  const providers = listRunnableProviders(input?.providers, {
    keyedOnly: input?.keyedOnly,
    includeKeyed: input?.includeKeyed,
  });
  const results: IngestProviderResult[] = [];
  let totalUpserted = 0;

  for (const provider of providers) {
    const result: IngestProviderResult = {
      provider: provider.id,
      fetched: 0,
      upserted: 0,
      skipped: 0,
      errors: [],
    };
    try {
      logger.log('info', 'ingest.provider.start', { provider: provider.id });
      let jobs = uniqueJobs(await provider.fetch());
      if (input?.maxPerProvider && jobs.length > input.maxPerProvider) {
        jobs = jobs.slice(0, input.maxPerProvider);
      }
      result.fetched = jobs.length;
      const { upserted, skipped, errors } = await upsertIngestJobs(jobs, (done, total) => {
        if (done === total || done % 25 === 0) {
          logger.log('info', 'ingest.provider.progress', {
            provider: provider.id,
            done,
            total,
          });
        }
      });
      result.upserted = upserted;
      result.skipped = skipped;
      result.errors.push(...errors);
      totalUpserted += upserted;
      logger.log('info', 'ingest.provider.done', result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(message);
      logger.log('error', 'ingest.provider.failed', {
        provider: provider.id,
        message,
      });
    }
    results.push(result);
  }

  return {
    results,
    totalUpserted,
    catalog: listProviderCatalogSummary(),
  };
}

export {
  INGEST_PROVIDER_CATALOG,
  listKeyedProviderStatus,
  listProviderCatalogSummary,
  listRunnableProviders,
} from './catalog';
export { purgeSeedJobs } from './purge-seed';
export type { IngestProvider, IngestProviderResult, NormalizedIngestJob } from './types';
