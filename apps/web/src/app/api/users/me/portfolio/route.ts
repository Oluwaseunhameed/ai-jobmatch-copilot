import { NextResponse } from 'next/server';
import {
  createPortfolioProject,
  createProjectFromSuggestion,
  importGithubRepo,
  publishPortfolio,
} from '@jobmatch/job-search';

import { requireAppUser } from '@/lib/auth';
import {
  getCachedPortfolioBrief,
  invalidatePortfolioCache,
} from '@/lib/cache/jobmatch-hubs-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const brief = await getCachedPortfolioBrief(app.user.id);
  return NextResponse.json(brief, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON body' } }, { status: 400 });
  }

  try {
    if (body.action === 'publish') {
      const brief = await publishPortfolio({
        userId: app.user.id,
        slug: typeof body.slug === 'string' ? body.slug : null,
      });
      await invalidatePortfolioCache(app.user.id);
      return NextResponse.json(brief);
    }

    if (body.action === 'import_github' || body.repoUrl) {
      const repoUrl = typeof body.repoUrl === 'string' ? body.repoUrl : '';
      const project = await importGithubRepo({
        userId: app.user.id,
        repoUrl,
      });
      await invalidatePortfolioCache(app.user.id);
      return NextResponse.json(project, { status: 201 });
    }

    if (body.fromSuggestion === true || body.suggestionId || body.skill) {
      const project = await createProjectFromSuggestion({
        userId: app.user.id,
        suggestionId: typeof body.suggestionId === 'string' ? body.suggestionId : undefined,
        skill: typeof body.skill === 'string' ? body.skill : undefined,
      });
      await invalidatePortfolioCache(app.user.id);
      return NextResponse.json(project, { status: 201 });
    }

    const project = await createPortfolioProject({
      userId: app.user.id,
      data: {
        title: String(body.title ?? ''),
        summary: (body.summary as string | null | undefined) ?? null,
        role: (body.role as string | null | undefined) ?? null,
        status: body.status as string | undefined,
        techStack: Array.isArray(body.techStack) ? (body.techStack as string[]) : [],
        highlights: Array.isArray(body.highlights) ? (body.highlights as string[]) : [],
        problem: (body.problem as string | null | undefined) ?? null,
        solution: (body.solution as string | null | undefined) ?? null,
        impact: (body.impact as string | null | undefined) ?? null,
        repoUrl: (body.repoUrl as string | null | undefined) ?? null,
        demoUrl: (body.demoUrl as string | null | undefined) ?? null,
        startMonth: (body.startMonth as string | null | undefined) ?? null,
        endMonth: (body.endMonth as string | null | undefined) ?? null,
        isFeatured: Boolean(body.isFeatured),
        sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : undefined,
        source: typeof body.source === 'string' ? body.source : 'manual',
        suggestedSkill: (body.suggestedSkill as string | null | undefined) ?? null,
      },
    });
    await invalidatePortfolioCache(app.user.id);
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create project';
    return NextResponse.json({ error: { message } }, { status: 400 });
  }
}
