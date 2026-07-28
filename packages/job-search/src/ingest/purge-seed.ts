import { prisma } from '@jobmatch/database';

import { createLogger, type StructuredLogger } from '../logger';

/**
 * Delete all catalog rows with source=seed, then remove companies left with zero jobs.
 * Cascades remove user interactions/applications tied to those seed jobs.
 */
export async function purgeSeedJobs(input?: { logger?: StructuredLogger }) {
  const logger = input?.logger ?? createLogger('purge-seed');

  const seedCount = await prisma.job.count({ where: { source: 'seed' } });
  logger.log('info', 'purge.seed.count', { seedCount });

  const deletedJobs = await prisma.job.deleteMany({ where: { source: 'seed' } });
  const orphanCompanies = await prisma.company.deleteMany({
    where: { jobs: { none: {} } },
  });

  logger.log('info', 'purge.seed.done', {
    deletedJobs: deletedJobs.count,
    deletedOrphanCompanies: orphanCompanies.count,
  });

  return {
    deletedJobs: deletedJobs.count,
    deletedOrphanCompanies: orphanCompanies.count,
  };
}
