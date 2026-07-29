import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Liveness for the Next.js app (platform load balancers / uptime checks).
 * Does not probe Postgres — use the Nest API `/api/v1/health/ready` for that.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'web',
    version: process.env.npm_package_version ?? '0.0.0',
    timestamp: new Date().toISOString(),
  });
}
