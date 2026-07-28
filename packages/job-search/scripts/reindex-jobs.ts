/**
 * Reindex active jobs into Meilisearch.
 *
 * Usage:
 *   pnpm jobs:reindex
 *
 * Requires MEILI_HOST (see docker-compose meilisearch service).
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

for (const candidate of [
  '.env',
  '../../.env',
  '../../apps/api/.env',
  '../../apps/web/.env.local',
  '../../packages/database/.env',
]) {
  const path = resolve(process.cwd(), candidate);
  if (existsSync(path)) {
    process.loadEnvFile(path);
  }
}

async function main() {
  const { createLogger, reindexAllJobs } = await import('../src/index');
  const logger = createLogger('jobs:reindex');

  if (!process.env.MEILI_HOST?.trim()) {
    console.error('MEILI_HOST is not set. Start Meilisearch and set MEILI_HOST=http://127.0.0.1:7700');
    process.exitCode = 1;
    return;
  }

  logger.log('info', 'reindex.start', { host: process.env.MEILI_HOST });
  const result = await reindexAllJobs({
    onProgress: (done, total) => {
      if (done === total || done % 200 === 0) {
        logger.log('info', 'reindex.progress', { done, total });
      }
    },
  });

  console.log(JSON.stringify(result, null, 2));
  if (result.skipped) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
