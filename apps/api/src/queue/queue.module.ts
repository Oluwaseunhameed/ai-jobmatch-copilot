import { Module } from '@nestjs/common';

import { ApplicationGenerateWorker } from './application-generate.worker';
import { ApplicationReminderWorker } from './application-reminder.worker';
import { JobEmbedWorker } from './job-embed.worker';
import { ResumeOptimizeWorker } from './resume-optimize.worker';
import { ResumeParseWorker } from './resume-parse.worker';

@Module({
  providers: [
    ResumeParseWorker,
    ResumeOptimizeWorker,
    ApplicationGenerateWorker,
    ApplicationReminderWorker,
    JobEmbedWorker,
  ],
})
export class QueueModule {}
