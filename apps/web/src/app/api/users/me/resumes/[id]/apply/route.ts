import { prisma } from '@jobmatch/database';
import { NextResponse } from 'next/server';

import { requireAppUser } from '@/lib/auth';
import { updateProfile } from '@/lib/apply-parsed-resume';

type Params = { params: Promise<{ id: string }> };

/**
 * Apply parsed resume headline/summary/skills onto the career profile.
 */
export async function POST(request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const resume = await prisma.resume.findFirst({
    where: { id, userId: app.user.id },
  });

  if (!resume) {
    return NextResponse.json({ error: { message: 'Resume not found' } }, { status: 404 });
  }

  if (resume.parseStatus !== 'ready' || !resume.parsedJson) {
    return NextResponse.json(
      { error: { message: 'Resume has not been parsed yet' } },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    applyHeadline?: boolean;
    applySummary?: boolean;
    applySkills?: boolean;
  };

  const profile = await updateProfile(app.user.id, resume.parsedJson, {
    applyHeadline: body.applyHeadline !== false,
    applySummary: body.applySummary !== false,
    applySkills: body.applySkills !== false,
  });

  return NextResponse.json(profile, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
