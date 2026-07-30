import { PrismaClient } from '@prisma/client';

/**
 * Singleton Prisma client for the monorepo.
 * Persist on globalThis in all environments so Vercel warm isolates reuse one client.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Supabase "Session mode" pooler (:5432) caps concurrent clients (~15 on free/pro
 * pool sizes). Vercel serverless fans out many isolates and exhausts that pool
 * (EMAXCONNSESSION), which surfaces as opaque Application errors on pages like
 * /portfolio. Transaction mode (:6543) + pgbouncer is the supported path.
 */
export function resolveDatabaseUrl(raw = process.env.DATABASE_URL): string | undefined {
  if (!raw?.trim()) return undefined;

  try {
    const url = new URL(raw);
    const isSupabasePooler = /pooler\.supabase\.com$/i.test(url.hostname);
    const isServerless = Boolean(
      process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME,
    );

    if (isSupabasePooler && (url.port === '5432' || url.port === '')) {
      url.port = '6543';
      url.searchParams.set('pgbouncer', 'true');
    }

    if (isServerless && !url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '1');
    }

    return url.toString();
  } catch {
    return raw;
  }
}

const datasourceUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
  });

globalForPrisma.prisma = prisma;
