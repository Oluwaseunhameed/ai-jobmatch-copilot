import { Queue, Worker, type Job, type Processor } from 'bullmq';

import { getConnection, isQueueEnabled } from './connection';

export const APPLICATION_GENERATE_QUEUE = 'application-generate';

export type ApplicationGenerateTrigger = 'manual' | 'retry';

export type ApplicationGenerateJobData = {
  draftId: string;
  resumeId: string;
  jobId: string;
  userId: string;
  trigger: ApplicationGenerateTrigger;
};

export const APPLICATION_GENERATE_MAX_ATTEMPTS = 2;

let queue: Queue<ApplicationGenerateJobData> | null = null;

export function getApplicationGenerateQueue(): Queue<ApplicationGenerateJobData> {
  if (!queue) {
    queue = new Queue<ApplicationGenerateJobData>(APPLICATION_GENERATE_QUEUE, {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: APPLICATION_GENERATE_MAX_ATTEMPTS,
        backoff: { type: 'exponential', delay: 8_000 },
        removeOnComplete: { age: 3_600, count: 100 },
        removeOnFail: { age: 86_400, count: 500 },
      },
    });
  }

  return queue;
}

function jobIdFor(draftId: string) {
  return `application-generate__${draftId}`;
}

export type EnqueueApplicationGenerateResult =
  | { enqueued: true; jobId: string }
  | { enqueued: false; reason: 'queue_disabled' | 'already_queued' };

export async function enqueueApplicationGenerate(
  data: ApplicationGenerateJobData,
): Promise<EnqueueApplicationGenerateResult> {
  if (!isQueueEnabled()) {
    return { enqueued: false, reason: 'queue_disabled' };
  }

  const jobs = getApplicationGenerateQueue();
  const jobId = jobIdFor(data.draftId);
  const existing = await jobs.getJob(jobId);

  if (existing) {
    const state = await existing.getState();
    if (state === 'active' || state === 'waiting' || state === 'delayed') {
      return { enqueued: false, reason: 'already_queued' };
    }
    await existing.remove().catch(() => undefined);
  }

  await jobs.add(APPLICATION_GENERATE_QUEUE, data, { jobId });
  return { enqueued: true, jobId };
}

export function createApplicationGenerateWorker(
  processor: Processor<ApplicationGenerateJobData>,
  options?: { concurrency?: number },
) {
  const concurrency =
    options?.concurrency ?? (Number(process.env.APPLICATION_GENERATE_CONCURRENCY) || 1);

  return new Worker<ApplicationGenerateJobData>(APPLICATION_GENERATE_QUEUE, processor, {
    connection: getConnection(),
    concurrency,
  });
}

export type ApplicationGenerateJob = Job<ApplicationGenerateJobData>;
