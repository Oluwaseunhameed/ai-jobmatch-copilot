import {
  applicationDraftReadyEmail,
  applicationReminderEmail,
  applicationStageChangedEmail,
  optimizationCompleteEmail,
  sendEmailAsync,
} from '@jobmatch/email';
import { prisma } from '@jobmatch/database';
import { APPLICATION_STAGE_LABELS, isApplicationStage } from '@jobmatch/types';

import { createLogger, type StructuredLogger } from './logger';

const defaultLogger = createLogger('notifications');

type PrefUser = {
  id: string;
  name: string;
  email: string;
  preferences: { emailApplicationUpdates: boolean } | null;
};

async function loadPrefUser(userId: string): Promise<PrefUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      preferences: { select: { emailApplicationUpdates: true } },
    },
  });
}

function allowsApplicationUpdates(user: PrefUser) {
  // Default true when preferences row is missing (matches schema default).
  return user.preferences?.emailApplicationUpdates ?? true;
}

/**
 * Preference-gated transactional email for application-related product events.
 * Failures are logged and never thrown — async work must not fail the primary job.
 */
export async function notifyOptimizationComplete(input: {
  userId: string;
  jobTitle: string;
  companyName: string;
  jobSlug: string;
  beforeScore: number;
  afterScore: number;
  logger?: StructuredLogger;
}) {
  const logger = input.logger ?? defaultLogger;
  try {
    const user = await loadPrefUser(input.userId);
    if (!user || !allowsApplicationUpdates(user)) {
      logger.log('info', 'notify.skipped', {
        type: 'optimization_complete',
        userId: input.userId,
        reason: !user ? 'missing_user' : 'pref_disabled',
      });
      return;
    }

    const payload = optimizationCompleteEmail({
      name: user.name,
      jobTitle: input.jobTitle,
      companyName: input.companyName,
      beforeScore: input.beforeScore,
      afterScore: input.afterScore,
      jobSlug: input.jobSlug,
    });
    sendEmailAsync({ to: user.email, ...payload });
    logger.log('info', 'notify.queued', {
      type: 'optimization_complete',
      userId: input.userId,
      to: user.email,
    });
  } catch (error) {
    logger.log('error', 'notify.failed', {
      type: 'optimization_complete',
      userId: input.userId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function notifyApplicationDraftReady(input: {
  userId: string;
  jobTitle: string;
  companyName: string;
  jobSlug: string;
  logger?: StructuredLogger;
}) {
  const logger = input.logger ?? defaultLogger;
  try {
    const user = await loadPrefUser(input.userId);
    if (!user || !allowsApplicationUpdates(user)) {
      logger.log('info', 'notify.skipped', {
        type: 'draft_ready',
        userId: input.userId,
        reason: !user ? 'missing_user' : 'pref_disabled',
      });
      return;
    }

    const payload = applicationDraftReadyEmail({
      name: user.name,
      jobTitle: input.jobTitle,
      companyName: input.companyName,
      jobSlug: input.jobSlug,
    });
    sendEmailAsync({ to: user.email, ...payload });
    logger.log('info', 'notify.queued', {
      type: 'draft_ready',
      userId: input.userId,
      to: user.email,
    });
  } catch (error) {
    logger.log('error', 'notify.failed', {
      type: 'draft_ready',
      userId: input.userId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function notifyApplicationStageChanged(input: {
  userId: string;
  jobTitle: string;
  companyName: string;
  stage: string;
  logger?: StructuredLogger;
}) {
  const logger = input.logger ?? defaultLogger;
  try {
    const user = await loadPrefUser(input.userId);
    if (!user || !allowsApplicationUpdates(user)) {
      logger.log('info', 'notify.skipped', {
        type: 'stage_changed',
        userId: input.userId,
        reason: !user ? 'missing_user' : 'pref_disabled',
      });
      return;
    }

    const stageLabel = isApplicationStage(input.stage)
      ? APPLICATION_STAGE_LABELS[input.stage]
      : input.stage;

    const payload = applicationStageChangedEmail({
      name: user.name,
      jobTitle: input.jobTitle,
      companyName: input.companyName,
      stageLabel,
    });
    sendEmailAsync({ to: user.email, ...payload });
    logger.log('info', 'notify.queued', {
      type: 'stage_changed',
      userId: input.userId,
      to: user.email,
    });
  } catch (error) {
    logger.log('error', 'notify.failed', {
      type: 'stage_changed',
      userId: input.userId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function notifyApplicationReminder(input: {
  userId: string;
  jobTitle: string;
  companyName: string;
  stage: string;
  daysIdle: number;
  logger?: StructuredLogger;
}) {
  const logger = input.logger ?? defaultLogger;
  try {
    const user = await loadPrefUser(input.userId);
    if (!user || !allowsApplicationUpdates(user)) {
      logger.log('info', 'notify.skipped', {
        type: 'application_reminder',
        userId: input.userId,
        reason: !user ? 'missing_user' : 'pref_disabled',
      });
      return false;
    }

    const stageLabel = isApplicationStage(input.stage)
      ? APPLICATION_STAGE_LABELS[input.stage]
      : input.stage;

    const payload = applicationReminderEmail({
      name: user.name,
      jobTitle: input.jobTitle,
      companyName: input.companyName,
      stageLabel,
      daysIdle: input.daysIdle,
    });
    sendEmailAsync({ to: user.email, ...payload });
    logger.log('info', 'notify.queued', {
      type: 'application_reminder',
      userId: input.userId,
      to: user.email,
    });
    return true;
  } catch (error) {
    logger.log('error', 'notify.failed', {
      type: 'application_reminder',
      userId: input.userId,
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
