import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ResumesService } from './resumes.service';

const store: {
  resumes: Array<Record<string, unknown>>;
} = { resumes: [] };

jest.mock('@jobmatch/database', () => ({
  prisma: {
    resume: {
      findMany: jest.fn(async ({ where }: { where: { userId: string } }) =>
        store.resumes
          .filter((r) => r.userId === where.userId)
          .map((r) => ({ ...r, versions: [] })),
      ),
      findFirst: jest.fn(
        async ({ where }: { where: { id?: string; userId: string } }) => {
          const resume = store.resumes.find(
            (r) =>
              r.userId === where.userId &&
              (where.id ? r.id === where.id : true),
          );
          return resume ? { ...resume, versions: [] } : null;
        },
      ),
      count: jest.fn(async ({ where }: { where: { userId: string } }) =>
        store.resumes.filter((r) => r.userId === where.userId).length,
      ),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const created = {
          id: `resume_${store.resumes.length + 1}`,
          ...data,
          versions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        delete (created as { versions?: unknown }).versions;
        store.resumes.push(created);
        return { ...created, versions: [{ id: 'ver_1', label: 'Original upload' }] };
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const idx = store.resumes.findIndex((r) => r.id === where.id);
        store.resumes[idx] = { ...store.resumes[idx], ...data };
        return store.resumes[idx];
      }),
      updateMany: jest.fn(async () => ({ count: 0 })),
      delete: jest.fn(async ({ where }: { where: { id: string } }) => {
        store.resumes = store.resumes.filter((r) => r.id !== where.id);
        return { id: where.id };
      }),
    },
    $executeRaw: jest.fn(async () => {
      // Simulate atomic primary switch driven by last update call in tests via helper below.
      return 1;
    }),
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

jest.mock('@jobmatch/storage', () => ({
  activeStorageProvider: jest.fn(() => 'local'),
  buildResumeStorageKey: jest.fn(() => 'resumes/user_1/file.pdf'),
  validateResumeFile: jest.fn(({ fileName, size }: { fileName: string; size: number }) => {
    if (!fileName || size <= 0) return { ok: false, message: 'Invalid file' };
    return { ok: true, mimeType: 'application/pdf', extension: '.pdf' };
  }),
  putObject: jest.fn(async (key: string, body: Buffer) => ({
    key,
    provider: 'local',
    size: body.byteLength,
  })),
  deleteObject: jest.fn(async () => undefined),
  getObjectBuffer: jest.fn(async () => Buffer.from('%PDF')),
}));

jest.mock('@jobmatch/queue', () => ({
  enqueueResumeParse: jest.fn(async () => ({ enqueued: true, jobId: 'job_1' })),
}));

jest.mock('@jobmatch/resume-parsing', () => ({
  parseResume: jest.fn(async () => ({ id: 'resume_1', parseStatus: 'ready' })),
}));

describe('ResumesService', () => {
  let service: ResumesService;

  beforeEach(async () => {
    store.resumes = [];
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResumesService],
    }).compile();
    service = module.get(ResumesService);
  });

  it('uploads a resume and marks the first as primary', async () => {
    const resume = await service.upload('user_1', {
      buffer: Buffer.from('%PDF-1.4'),
      originalFileName: 'cv.pdf',
      mimeType: 'application/pdf',
      title: 'Primary CV',
    });

    expect(resume.title).toBe('Primary CV');
    expect(resume.isPrimary).toBe(true);
  });

  it('switches primary to another resume', async () => {
    await service.upload('user_1', {
      buffer: Buffer.from('%PDF-1.4'),
      originalFileName: 'a.pdf',
      mimeType: 'application/pdf',
      title: 'A',
    });
    const second = await service.upload('user_1', {
      buffer: Buffer.from('%PDF-1.4'),
      originalFileName: 'b.pdf',
      mimeType: 'application/pdf',
      title: 'B',
    });

    const { prisma } = jest.requireMock('@jobmatch/database') as {
      prisma: { $executeRaw: jest.Mock };
    };
    prisma.$executeRaw.mockImplementationOnce(async () => {
      store.resumes = store.resumes.map((r) => ({
        ...r,
        isPrimary: r.id === second.id,
      }));
      return 2;
    });

    const updated = await service.update('user_1', second.id as string, { isPrimary: true });
    expect(updated.isPrimary).toBe(true);

    const list = await service.list('user_1');
    const primaries = list.filter((r) => r.isPrimary);
    expect(primaries).toHaveLength(1);
    expect(primaries[0]?.id).toBe(second.id);
  });

  it('rejects invalid files', async () => {
    await expect(
      service.upload('user_1', {
        buffer: Buffer.alloc(0),
        originalFileName: '',
        mimeType: '',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when resume is missing', async () => {
    await expect(service.get('user_1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
