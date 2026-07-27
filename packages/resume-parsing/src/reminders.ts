import { prisma } from '@jobmatch/database';

import { createLogger, type StructuredLogger } from './logger';
import { notifyApplicationReminder } from './notifications';

const REMINDER_STAGES = ['saved', 'preparing', 'applied'] as const;

function idleDaysEnv() {
  const raw = Number(process.env.APPLICATION_REMINDER_IDLE_DAYS);
  return Number.isFinite(raw) && raw > 0 ? raw : 7;
}

/**
 * Nudge users about applications idle in early pipeline stages.
 * Gated per-user by emailApplicationUpdates. Caps batch size for safety.
 */
export async function runApplicationReminders(input?: {
  idleDays?: number;
  limit?: number;
  logger?: StructuredLogger;
}) {
  const logger = input?.logger ?? createLogger('application-reminders');
  const idleDays = input?.idleDays ?? idleDaysEnv();
  const limit = input?.limit ?? 50;
  const cutoff = new Date(Date.now() - idleDays * 24 * 60 * 60 * 1000);

  const rows = await prisma.application.findMany({
    where: {
      stage: { in: [...REMINDER_STAGES] },
      updatedAt: { lte: cutoff },
      OR: [{ lastReminderAt: null }, { lastReminderAt: { lte: cutoff } }],
    },
    include: {
      job: { include: { company: true } },
    },
    orderBy: { updatedAt: 'asc' },
    take: limit,
  });

  let sent = 0;
  for (const row of rows) {
    const daysIdle = Math.max(
      idleDays,
      Math.floor((Date.now() - row.updatedAt.getTime()) / (24 * 60 * 60 * 1000)),
    );
    const ok = await notifyApplicationReminder({
      userId: row.userId,
      jobTitle: row.job.title,
      companyName: row.job.company.name,
      stage: row.stage,
      daysIdle,
      logger,
    });
    if (ok) {
      await prisma.application.update({
        where: { id: row.id },
        data: { lastReminderAt: new Date() },
      });
      sent += 1;
    }
  }

  logger.log('info', 'reminders.completed', {
    candidates: rows.length,
    sent,
    idleDays,
  });

  return { candidates: rows.length, sent, idleDays };
}
