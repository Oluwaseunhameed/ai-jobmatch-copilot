import { NextResponse } from 'next/server';

import { requireAppUser } from '@/lib/auth';
import { getCachedJobSearch, searchJobs } from '@/lib/cache/jobmatch-hubs-cache';

export const dynamic = 'force-dynamic';
/** Prevent Vercel from leaving the Jobs page spinner running until platform kill. */
export const maxDuration = 20;

function splitCsv(value: string | null): string[] | undefined {
  if (!value?.trim()) return undefined;
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const app = await requireAppUser();
  if (!app) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  const url = new URL(request.url);
  const salaryMinRaw = url.searchParams.get('salaryMin');
  const pageRaw = url.searchParams.get('page');
  const limitRaw = url.searchParams.get('limit');
  const sortRaw = url.searchParams.get('sort');
  const sort =
    sortRaw === 'recent' ||
    sortRaw === 'salary' ||
    sortRaw === 'relevance' ||
    sortRaw === 'match'
      ? sortRaw
      : undefined;

  // Stable key for identical filter sets so navigating away and back reuses results.
  const queryKey = url.searchParams.toString() || 'default';

  try {
    const q = url.searchParams.get('q') ?? undefined;
    // Prefer keyword path while embedding coverage is partial — avoids cold AI
    // round-trips that stall the Jobs spinner on every search.
    const semanticParam = url.searchParams.get('semantic');
    const semantic =
      semanticParam === '1' || semanticParam === 'true'
        ? true
        : semanticParam === '0' || semanticParam === 'false'
          ? false
          : Boolean(q && q.trim().length >= 3);

    const result = await getCachedJobSearch(app.user.id, queryKey, () =>
      searchJobs({
        q,
        workMode: splitCsv(url.searchParams.get('workMode')),
        employmentType: splitCsv(url.searchParams.get('employmentType')),
        seniority: splitCsv(url.searchParams.get('seniority')),
        country: url.searchParams.get('country') ?? undefined,
        salaryMin: salaryMinRaw ? Number(salaryMinRaw) : undefined,
        sort,
        page: pageRaw ? Number(pageRaw) : undefined,
        limit: limitRaw ? Number(limitRaw) : undefined,
        userId: app.user.id,
        semantic,
      }),
    );

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const err = error as {
      code?: string;
      meta?: { code?: string; message?: string };
      message?: string;
    };
    console.error('[api/jobs]', {
      code: err.code,
      meta: err.meta,
      message: err.message,
    });
    return NextResponse.json(
      {
        error: {
          message: 'We could not load jobs right now. Please try again.',
          code: 'search_failed',
        },
      },
      { status: 500 },
    );
  }
}
