import { Module } from '@nestjs/common';

import { ResumeParseWorker } from './resume-parse.worker';

@Module({
  providers: [ResumeParseWorker],
})
export class QueueModule {}
