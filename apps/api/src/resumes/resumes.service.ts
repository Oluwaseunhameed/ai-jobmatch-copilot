import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@jobmatch/database';
import { enqueueResumeParse } from '@jobmatch/queue';
import { parseResume } from '@jobmatch/resume-parsing';
import {
  activeStorageProvider,
  buildResumeStorageKey,
  deleteObject,
  getObjectBuffer,
  putObject,
  validateResumeFile,
} from '@jobmatch/storage';

export type ResumeUploadInput = {
  buffer: Buffer;
  originalFileName: string;
  mimeType: string;
  title?: string;
};

export type ResumeUpdateInput = {
  title?: string;
  isPrimary?: boolean;
};

@Injectable()
export class ResumesService {
  list(userId: string) {
    return prisma.resume.findMany({
      where: { userId },
      include: { versions: { orderBy: { createdAt: 'desc' } } },
      orderBy: [{ isPrimary: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async get(userId: string, resumeId: string) {
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId },
      include: { versions: { orderBy: { createdAt: 'desc' } } },
    });
    if (!resume) throw new NotFoundException('Resume not found');
    return resume;
  }

  async upload(userId: string, input: ResumeUploadInput) {
    const validation = validateResumeFile({
      fileName: input.originalFileName,
      mimeType: input.mimeType,
      size: input.buffer.byteLength,
    });

    if (!validation.ok) {
      throw new BadRequestException(validation.message);
    }

    const key = buildResumeStorageKey(userId, input.originalFileName);
    const stored = await putObject(key, input.buffer, validation.mimeType);
    const title =
      input.title?.trim() ||
      input.originalFileName.replace(/\.[^.]+$/, '') ||
      'Untitled resume';

    const existingCount = await prisma.resume.count({ where: { userId } });

    try {
      const resume = await prisma.resume.create({
        data: {
          userId,
          title,
          originalFileName: input.originalFileName,
          mimeType: validation.mimeType,
          fileSize: stored.size,
          storageKey: stored.key,
          storageProvider: stored.provider,
          isPrimary: existingCount === 0,
          parseStatus: 'queued',
          versions: {
            create: {
              label: 'Original upload',
              source: 'upload',
            },
          },
        },
        include: { versions: { orderBy: { createdAt: 'desc' } } },
      });

      await enqueueResumeParse({ resumeId: resume.id, userId, trigger: 'upload' });

      return resume;
    } catch (error) {
      await deleteObject(stored.key, stored.provider).catch(() => undefined);
      throw error;
    }
  }

  async update(userId: string, resumeId: string, input: ResumeUpdateInput) {
    await this.get(userId, resumeId);

    if (input.isPrimary === true) {
      await prisma.$executeRaw`
        UPDATE "resumes"
        SET
          "is_primary" = ("id" = ${resumeId}),
          "updated_at" = CURRENT_TIMESTAMP
        WHERE "user_id" = ${userId}
      `;

      if (input.title !== undefined) {
        await prisma.resume.update({
          where: { id: resumeId },
          data: { title: input.title.trim() },
        });
      }
    } else {
      await prisma.resume.update({
        where: { id: resumeId },
        data: {
          ...(input.title !== undefined ? { title: input.title.trim() } : {}),
          ...(input.isPrimary === false ? { isPrimary: false } : {}),
        },
      });
    }

    return this.get(userId, resumeId);
  }

  /**
   * Queue a parse and return immediately.
   *
   * Parsing is deliberately not awaited: it calls out to the AI service and can take
   * tens of seconds. Callers poll the resume's `parseStatus` for the outcome.
   */
  async parse(userId: string, resumeId: string) {
    const resume = await this.get(userId, resumeId);

    if (resume.parseStatus === 'processing') {
      return resume;
    }

    const enqueued = await enqueueResumeParse({
      resumeId,
      userId,
      trigger: 'manual',
    });

    if (enqueued.enqueued || enqueued.reason === 'already_queued') {
      return prisma.resume.update({
        where: { id: resumeId },
        data: { parseStatus: 'queued', parseError: null },
        include: { versions: { orderBy: { createdAt: 'desc' } } },
      });
    }

    // No Redis configured: run inline so the feature still works in development.
    return parseResume({ userId, resumeId, trigger: 'manual' }).catch(() =>
      this.get(userId, resumeId),
    );
  }

  async remove(userId: string, resumeId: string) {
    const resume = await this.get(userId, resumeId);
    await prisma.resume.delete({ where: { id: resumeId } });
    await deleteObject(
      resume.storageKey,
      resume.storageProvider as 'local' | 's3',
    ).catch(() => undefined);

    if (resume.isPrimary) {
      const next = await prisma.resume.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });
      if (next) {
        await prisma.resume.update({
          where: { id: next.id },
          data: { isPrimary: true },
        });
      }
    }

    return { ok: true };
  }

  async download(userId: string, resumeId: string) {
    const resume = await this.get(userId, resumeId);
    const buffer = await getObjectBuffer(
      resume.storageKey,
      resume.storageProvider as 'local' | 's3',
    );
    return { resume, buffer };
  }

  provider() {
    return activeStorageProvider();
  }
}
