/**
 * Ingest jobs from public / keyed providers (Wave 2).
 *
 * Usage:
 *   pnpm jobs:ingest
 *   pnpm jobs:ingest -- --providers remotive,himalayas
 *   pnpm jobs:ingest -- --list
 *   pnpm jobs:ingest -- --max 50
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

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const { createLogger, listProviderCatalogSummary, runJobIngest } = await import('../src/index');
  const logger = createLogger('jobs:ingest');

  if (process.argv.includes('--list')) {
    const catalog = listProviderCatalogSummary();
    console.log(JSON.stringify(catalog, null, 2));
    return;
  }

  const providers = arg('providers')
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const maxPerProvider = Number(arg('max')) || undefined;

  const result = await runJobIngest({ providers, maxPerProvider, logger });
  console.log(
    JSON.stringify(
      {
        totalUpserted: result.totalUpserted,
        results: result.results,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
