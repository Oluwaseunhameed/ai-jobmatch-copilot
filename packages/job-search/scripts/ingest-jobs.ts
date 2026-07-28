/**
 * Ingest jobs from public / keyed providers (Wave 2).
 *
 * Usage:
 *   pnpm jobs:ingest
 *   pnpm jobs:ingest -- --keyed
 *   pnpm jobs:ingest -- --include-keyed
 *   pnpm jobs:ingest -- --status
 *   pnpm jobs:ingest -- --providers adzuna,usajobs,greenhouse
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
  const {
    createLogger,
    listKeyedProviderStatus,
    listProviderCatalogSummary,
    runJobIngest,
  } = await import('../src/index');
  const logger = createLogger('jobs:ingest');

  if (process.argv.includes('--list')) {
    console.log(JSON.stringify(listProviderCatalogSummary(), null, 2));
    return;
  }

  if (process.argv.includes('--status')) {
    console.log(JSON.stringify(listKeyedProviderStatus(), null, 2));
    return;
  }

  const providers = arg('providers')
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const maxPerProvider = Number(arg('max')) || undefined;
  const keyedOnly = process.argv.includes('--keyed');
  const includeKeyed =
    process.argv.includes('--include-keyed') || process.env.INGEST_INCLUDE_KEYED === 'true';

  const result = await runJobIngest({
    providers,
    maxPerProvider,
    keyedOnly,
    includeKeyed,
    logger,
  });
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
