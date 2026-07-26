import { Module } from '@nestjs/common';

import { JobEmbedWorker } from './job-embed.worker';
import { ResumeParseWorker } from './resume-parse.worker';

@Module({
  providers: [ResumeParseWorker, JobEmbedWorker],
})
export class QueueModule {}
