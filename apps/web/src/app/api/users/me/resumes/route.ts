import { prisma } from '@jobmatch/database';
import {
  buildResumeStorageKey,
  deleteObject,
  putObject,
  validateResumeFile,
} from '@jobmatch/storage';
import { NextResponse } from 'next/server';

import { requireAppUser } from '@/lib/auth';
import { PlanLimitError, assertWithinPlanLimit } from '@/lib/billing/limits';
import {
  getCachedResumesJson,
  invalidateResumesCache,
} from '@/lib/cache/jobmatch-hubs-cache';
import { requestResumeParse } from '@/lib/resume-parse';

export async function GET() {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const resumes = await getCachedResumesJson(app.user.id, async () =>
    prisma.resume.findMany({
      where: { userId: app.user.id },
      include: { versions: { orderBy: { createdAt: 'desc' } } },
      orderBy: [{ isPrimary: 'desc' }, { updatedAt: 'desc' }],
    }),
  );

  return NextResponse.json(resumes, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    await assertWithinPlanLimit(app.user.id, 'resume');
  } catch (error) {
    if (error instanceof PlanLimitError) {
      return NextResponse.json({ error: error.toJSON() }, { status: error.status });
    }
    throw error;
  }

  const form = await request.formData();
  const file = form.get('file');
  const titleField = form.get('title');
  const title = typeof titleField === 'string' ? titleField : undefined;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: { message: 'File is required' } }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateResumeFile({
    fileName: file.name,
    mimeType: file.type,
    size: buffer.byteLength,
  });

  if (!validation.ok) {
    return NextResponse.json({ error: { message: validation.message } }, { status: 400 });
  }

  const key = buildResumeStorageKey(app.user.id, file.name);
  const stored = await putObject(key, buffer, validation.mimeType);
  const resumeTitle = title?.trim() || file.name.replace(/\.[^.]+$/, '') || 'Untitled resume';
  const existingCount = await prisma.resume.count({ where: { userId: app.user.id } });

  try {
    const resume = await prisma.resume.create({
      data: {
        userId: app.user.id,
        title: resumeTitle,
        originalFileName: file.name,
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

    await requestResumeParse(app.user.id, resume.id, 'upload');
    await invalidateResumesCache(app.user.id);

    return NextResponse.json(resume, {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    await deleteObject(stored.key, stored.provider).catch(() => undefined);
    throw error;
  }
}
