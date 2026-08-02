import { NextResponse } from 'next/server';
import { prisma } from '@jobmatch/database';
import { getOrCreateApplyAssist } from '@jobmatch/job-search';

import {
  extensionTokenFromRequest,
  verifyExtensionToken,
} from '@/lib/extension-auth';

export const dynamic = 'force-dynamic';

function applyUrlVariants(raw: string): string[] {
  const variants = new Set<string>([raw]);
  try {
    const url = new URL(raw);
    url.hash = '';
    variants.add(url.toString());
    variants.add(url.toString().replace(/\/$/, ''));

    const noQuery = new URL(url.toString());
    noQuery.search = '';
    variants.add(noQuery.toString());
    variants.add(noQuery.toString().replace(/\/$/, ''));
  } catch {
    // keep raw only
  }
  return [...variants].filter(Boolean);
}

async function requireExtensionUser(request: Request) {
  const raw = extensionTokenFromRequest(request);
  if (!raw) return null;
  const claims = verifyExtensionToken(raw);
  if (!claims) return null;
  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, email: true, name: true },
  });
  return user;
}

async function loadProfile(userId: string) {
  return prisma.careerProfile.findUnique({
    where: { userId },
    include: {
      skills: true,
      education: { orderBy: { sortOrder: 'asc' } },
      workExperience: { orderBy: { sortOrder: 'asc' } },
    },
  });
}

/**
 * Resolve autofill context for the active apply-tab URL.
 * Creates a pipeline application when the URL matches a known job.applyUrl.
 */
export async function GET(request: Request) {
  const user = await requireExtensionUser(request);
  if (!user) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const applyUrl = new URL(request.url).searchParams.get('applyUrl')?.trim();
  if (!applyUrl) {
    return NextResponse.json({ error: { message: 'applyUrl is required' } }, { status: 400 });
  }

  const variants = applyUrlVariants(applyUrl);
  const job = await prisma.job.findFirst({
    where: {
      isActive: true,
      OR: [{ applyUrl: { in: variants } }, { sourceUrl: { in: variants } }],
    },
    include: {
      company: { select: { name: true, logoUrl: true, slug: true } },
    },
  });

  if (!job) {
    const profile = await loadProfile(user.id);
    return NextResponse.json({
      matched: false,
      applyUrl,
      user: { id: user.id, email: user.email, name: user.name },
      profile,
      message:
        'No JobMatch job found for this URL. Open Apply with AutoFill from a job in JobMatch first, or copy fields from your profile below.',
      session: null,
      applicationId: null,
    });
  }

  let application = await prisma.application.findUnique({
    where: { userId_jobId: { userId: user.id, jobId: job.id } },
  });
  if (!application) {
    application = await prisma.application.create({
      data: { userId: user.id, jobId: job.id, stage: 'preparing' },
    });
  }

  const session = await getOrCreateApplyAssist(user.id, application.id);
  const profile = await loadProfile(user.id);

  return NextResponse.json({
    matched: true,
    applyUrl,
    user: { id: user.id, email: user.email, name: user.name },
    job: {
      id: job.id,
      title: job.title,
      slug: job.slug,
      applyUrl: job.applyUrl,
      company: job.company,
    },
    applicationId: application.id,
    session,
    profile,
  });
}
