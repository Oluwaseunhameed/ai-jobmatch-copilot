/**
 * Delete seeded jobs (source=seed) and orphan companies.
 *
 * Usage: pnpm jobs:purge-seed
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
  const { createLogger, purgeSeedJobs } = await import('../src/index');
  const logger = createLogger('jobs:purge-seed');
  const result = await purgeSeedJobs({ logger });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
