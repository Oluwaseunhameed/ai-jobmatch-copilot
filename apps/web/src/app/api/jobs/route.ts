import { NextResponse } from 'next/server';

import { requireAppUser } from '@/lib/auth';
import { getCachedJobSearch, searchJobs } from '@/lib/cache/jobmatch-hubs-cache';

export const dynamic = 'force-dynamic';

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
    const result = await getCachedJobSearch(app.user.id, queryKey, () =>
      searchJobs({
        q: url.searchParams.get('q') ?? undefined,
        workMode: splitCsv(url.searchParams.get('workMode')),
        employmentType: splitCsv(url.searchParams.get('employmentType')),
        seniority: splitCsv(url.searchParams.get('seniority')),
        country: url.searchParams.get('country') ?? undefined,
        salaryMin: salaryMinRaw ? Number(salaryMinRaw) : undefined,
        sort,
        page: pageRaw ? Number(pageRaw) : undefined,
        limit: limitRaw ? Number(limitRaw) : undefined,
        userId: app.user.id,
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
