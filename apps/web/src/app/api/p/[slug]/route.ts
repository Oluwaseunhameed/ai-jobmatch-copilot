import { NextResponse } from 'next/server';
import { getPublicPortfolio } from '@jobmatch/job-search';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const portfolio = await getPublicPortfolio(slug);
  if (!portfolio) {
    return NextResponse.json({ error: { message: 'Not found' } }, { status: 404 });
  }
  return NextResponse.json(portfolio, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}
