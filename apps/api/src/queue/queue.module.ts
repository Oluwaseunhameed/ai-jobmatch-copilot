import { Module } from '@nestjs/common';

import { JobEmbedWorker } from './job-embed.worker';
import { ResumeOptimizeWorker } from './resume-optimize.worker';
import { ResumeParseWorker } from './resume-parse.worker';

@Module({
  providers: [ResumeParseWorker, ResumeOptimizeWorker, JobEmbedWorker],
})
export class QueueModule {}
