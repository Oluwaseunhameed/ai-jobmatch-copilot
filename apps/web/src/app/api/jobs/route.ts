import { NextResponse } from 'next/server';
import { searchJobs } from '@jobmatch/job-search';

import { requireAppUser } from '@/lib/auth';

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

  try {
    const result = await searchJobs({
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
    });

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
