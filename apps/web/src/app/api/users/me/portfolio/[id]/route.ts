import { NextResponse } from 'next/server';
import {
  deletePortfolioProject,
  getPortfolioProject,
  updatePortfolioProject,
} from '@jobmatch/job-search';

import { requireAppUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const project = await getPortfolioProject(app.user.id, id);
  if (!project) {
    return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
  }

  return NextResponse.json(project, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON body' } }, { status: 400 });
  }

  try {
    const existing = await getPortfolioProject(app.user.id, id);
    if (!existing) {
      return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
    }

    const project = await updatePortfolioProject({
      userId: app.user.id,
      id,
      data: {
        title: String(body.title ?? existing.title),
        summary:
          body.summary === undefined
            ? existing.summary
            : ((body.summary as string | null) ?? null),
        role: body.role === undefined ? existing.role : ((body.role as string | null) ?? null),
        status: (body.status as string | undefined) ?? existing.status,
        techStack: Array.isArray(body.techStack)
          ? (body.techStack as string[])
          : existing.techStack,
        highlights: Array.isArray(body.highlights)
          ? (body.highlights as string[])
          : existing.highlights,
        problem:
          body.problem === undefined
            ? existing.problem
            : ((body.problem as string | null) ?? null),
        solution:
          body.solution === undefined
            ? existing.solution
            : ((body.solution as string | null) ?? null),
        impact:
          body.impact === undefined
            ? existing.impact
            : ((body.impact as string | null) ?? null),
        repoUrl:
          body.repoUrl === undefined
            ? existing.repoUrl
            : ((body.repoUrl as string | null) ?? null),
        demoUrl:
          body.demoUrl === undefined
            ? existing.demoUrl
            : ((body.demoUrl as string | null) ?? null),
        startMonth:
          body.startMonth === undefined
            ? existing.startMonth
            : ((body.startMonth as string | null) ?? null),
        endMonth:
          body.endMonth === undefined
            ? existing.endMonth
            : ((body.endMonth as string | null) ?? null),
        isFeatured:
          body.isFeatured === undefined ? existing.isFeatured : Boolean(body.isFeatured),
        sortOrder:
          typeof body.sortOrder === 'number' ? body.sortOrder : existing.sortOrder,
        source: existing.source,
        suggestedSkill: existing.suggestedSkill,
      },
    });

    return NextResponse.json(project);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update project';
    return NextResponse.json({ error: { message } }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const { id } = await params;
  const ok = await deletePortfolioProject(app.user.id, id);
  if (!ok) {
    return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
