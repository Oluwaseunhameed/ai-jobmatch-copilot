import {
  APPLICATION_STAGE_LABELS,
  isApplicationStage,
  type ApplicationStage,
} from '@jobmatch/types';

export { APPLICATION_STAGE_LABELS, APPLICATION_STAGES, isApplicationStage } from '@jobmatch/types';
export type { ApplicationStage } from '@jobmatch/types';

export type ApplicationRow = {
  id: string;
  userId: string;
  jobId: string;
  stage: string;
  notes: string | null;
  resumeId: string | null;
  draftId: string | null;
  createdAt: Date;
  updatedAt: Date;
  job?: {
    id: string;
    title: string;
    slug: string;
    location: string | null;
    workMode: string;
    applyUrl: string | null;
    company: { name: string; logoUrl: string | null };
  };
  resume?: { id: string; title: string } | null;
  draft?: { id: string; status: string } | null;
};

export function toApplicationDto(row: ApplicationRow) {
  const stage: ApplicationStage = isApplicationStage(row.stage) ? row.stage : 'preparing';

  return {
    id: row.id,
    userId: row.userId,
    jobId: row.jobId,
    stage,
    stageLabel: APPLICATION_STAGE_LABELS[stage],
    notes: row.notes,
    resumeId: row.resumeId,
    draftId: row.draftId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    job: row.job
      ? {
          id: row.job.id,
          title: row.job.title,
          slug: row.job.slug,
          location: row.job.location,
          workMode: row.job.workMode,
          applyUrl: row.job.applyUrl,
          companyName: row.job.company.name,
          companyLogoUrl: row.job.company.logoUrl,
        }
      : undefined,
    resume: row.resume ? { id: row.resume.id, title: row.resume.title } : null,
    draft: row.draft ? { id: row.draft.id, status: row.draft.status } : null,
  };
}

export const applicationInclude = {
  job: {
    include: {
      company: { select: { name: true, logoUrl: true } },
    },
  },
  resume: { select: { id: true, title: true } },
  draft: { select: { id: true, status: true } },
} as const;
