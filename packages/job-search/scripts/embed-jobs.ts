/**
 * Backfill embeddings for postings that do not have one.
 *
 * Runs inline rather than through the queue so it works without Redis, and so
 * seeding a fresh database is a single predictable command.
 *
 * Usage: pnpm jobs:embed [--limit 500] [--all]
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// The script runs from its own package directory, so DATABASE_URL has to come
// from the monorepo-root .env rather than a copy alongside this file.
for (const candidate of ['.env', '../../.env']) {
  const path = resolve(process.cwd(), candidate);
  if (existsSync(path)) {
    process.loadEnvFile(path);
    break;
  }
}

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const { prisma } = await import('@jobmatch/database');
  const { embedJob, jobsNeedingEmbedding } = await import('../src/embed');
  const { createLogger } = await import('../src/logger');

  const logger = createLogger('jobs:embed');
  const limit = Number(arg('limit')) || 500;
  const all = process.argv.includes('--all');

  try {
    if (all) {
      const reset = await prisma.job.updateMany({
        where: { isActive: true },
        data: { embeddingStatus: 'idle', embeddingError: null },
      });
      console.log(`marked ${reset.count} jobs for re-embedding`);
    }

    const ids = await jobsNeedingEmbedding(limit);

    if (ids.length === 0) {
      console.log('nothing to embed — every active job already has a vector');
      return;
    }

    console.log(`embedding ${ids.length} jobs...`);

    let succeeded = 0;
    let failed = 0;
    const startedAt = Date.now();

    for (const [index, id] of ids.entries()) {
      try {
        await embedJob({ jobId: id, trigger: 'backfill', logger: { log: () => undefined } });
        succeeded += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        logger.log('error', 'embed.failed', { jobId: id, message });

        // A provider that is down will fail for every remaining job too.
        if (failed >= 3 && succeeded === 0) {
          console.error(
            '\naborting: the first 3 jobs all failed, so the provider looks unavailable',
          );
          break;
        }
      }

      if ((index + 1) % 10 === 0) {
        process.stdout.write(`  ${index + 1}/${ids.length}\n`);
      }
    }

    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`\ndone in ${seconds}s — ${succeeded} embedded, ${failed} failed`);

    if (failed > 0) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
