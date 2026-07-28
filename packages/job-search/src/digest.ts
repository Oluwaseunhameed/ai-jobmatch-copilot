import { weeklyDigestEmail, sendEmailAsync } from '@jobmatch/email';
import { prisma } from '@jobmatch/database';
import { APPLICATION_STAGE_LABELS } from '@jobmatch/types';

import { createLogger, type StructuredLogger } from './logger';
import { searchJobs } from './search';

function digestCooldownMs() {
  const daysRaw = Number(process.env.WEEKLY_DIGEST_MIN_INTERVAL_DAYS);
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : 6.5;
  return days * 24 * 60 * 60 * 1000;
}

function weekOfLabel(date = new Date()) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function stageLabel(stage: string) {
  return (
    (APPLICATION_STAGE_LABELS as Record<string, string>)[stage] ??
    stage.replace(/_/g, ' ')
  );
}

/**
 * Email a weekly activity digest to users with emailWeeklyDigest enabled.
 * Skips users emailed within the cooldown window.
 */
export async function runWeeklyDigests(input?: {
  limit?: number;
  logger?: StructuredLogger;
}) {
  const logger = input?.logger ?? createLogger('weekly-digest');
  const limit = input?.limit ?? 40;
  const cooldownBefore = new Date(Date.now() - digestCooldownMs());
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const prefs = await prisma.userPreference.findMany({
    where: {
      emailWeeklyDigest: true,
      onboardingCompleted: true,
      OR: [{ lastWeeklyDigestAt: null }, { lastWeeklyDigestAt: { lte: cooldownBefore } }],
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ lastWeeklyDigestAt: 'asc' }, { createdAt: 'asc' }],
    take: limit,
  });

  let sent = 0;

  for (const pref of prefs) {
    const userId = pref.userId;
    try {
      const [savedJobs, applications, pipeline, matchResult] = await Promise.all([
        prisma.jobInteraction.count({ where: { userId, type: 'saved' } }),
        prisma.application.count({ where: { userId } }),
        prisma.application.findMany({
          where: {
            userId,
            stage: { notIn: ['rejected', 'accepted'] },
          },
          orderBy: { updatedAt: 'desc' },
          take: 5,
          include: {
            job: {
              select: {
                title: true,
                company: { select: { name: true } },
              },
            },
          },
        }),
        searchJobs({
          sort: 'recent',
          postedAfter: weekStart,
          page: 1,
          limit: 5,
          userId,
          semantic: false,
        }),
      ]);

      const payload = weeklyDigestEmail({
        name: pref.user.name,
        weekOf: weekOfLabel(weekStart),
        savedJobs,
        applications,
        newMatches: matchResult.jobs.map((job) => ({
          title: job.title,
          companyName: job.company.name,
          slug: job.slug,
        })),
        pipelineHighlights: pipeline.map((app) => ({
          jobTitle: app.job.title,
          companyName: app.job.company.name,
          stageLabel: stageLabel(app.stage),
        })),
      });

      sendEmailAsync({ to: pref.user.email, ...payload });

      await prisma.userPreference.update({
        where: { id: pref.id },
        data: { lastWeeklyDigestAt: new Date() },
      });

      sent += 1;
      logger.log('info', 'digest.sent', { userId, savedJobs, applications });
    } catch (error) {
      logger.log('error', 'digest.failed', {
        userId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.log('info', 'digests.completed', {
    candidates: prefs.length,
    sent,
  });

  return { candidates: prefs.length, sent };
}
