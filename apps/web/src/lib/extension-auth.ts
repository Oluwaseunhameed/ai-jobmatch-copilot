import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

function signingSecret(): string {
  const secret =
    process.env.EXTENSION_TOKEN_SECRET?.trim() ||
    process.env.CLERK_SECRET_KEY?.trim() ||
    '';
  if (!secret) {
    throw new Error('EXTENSION_TOKEN_SECRET or CLERK_SECRET_KEY is required for extension auth');
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', signingSecret()).update(payload).digest('base64url');
}

export type ExtensionTokenClaims = {
  sub: string;
  exp: number;
};

export function createExtensionToken(
  userId: string,
  ttlMs = DEFAULT_TTL_MS,
): { token: string; expiresAt: string } {
  const exp = Date.now() + ttlMs;
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp } satisfies ExtensionTokenClaims)).toString(
    'base64url',
  );
  const token = `${payload}.${sign(payload)}`;
  return { token, expiresAt: new Date(exp).toISOString() };
}

export function verifyExtensionToken(token: string): ExtensionTokenClaims | null {
  const parts = token.trim().split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as ExtensionTokenClaims;
    if (!claims?.sub || typeof claims.exp !== 'number') return null;
    if (Date.now() > claims.exp) return null;
    return claims;
  } catch {
    return null;
  }
}

export function extensionTokenFromRequest(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (match?.[1]) return match[1].trim();
  return request.headers.get('x-jobmatch-extension-token')?.trim() || null;
}
