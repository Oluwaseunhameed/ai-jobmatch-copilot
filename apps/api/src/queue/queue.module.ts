import { Module } from '@nestjs/common';

import { ApplicationGenerateWorker } from './application-generate.worker';
import { ApplicationReminderWorker } from './application-reminder.worker';
import { JobAlertWorker } from './job-alert.worker';
import { JobEmbedWorker } from './job-embed.worker';
import { JobIngestWorker } from './job-ingest.worker';
import { ResumeOptimizeWorker } from './resume-optimize.worker';
import { ResumeParseWorker } from './resume-parse.worker';
import { WeeklyDigestWorker } from './weekly-digest.worker';

@Module({
  providers: [
    ResumeParseWorker,
    ResumeOptimizeWorker,
    ApplicationGenerateWorker,
    ApplicationReminderWorker,
    JobAlertWorker,
    JobEmbedWorker,
    JobIngestWorker,
    WeeklyDigestWorker,
  ],
})
export class QueueModule {}
