import { createHmac, timingSafeEqual } from 'node:crypto';

export function safeEqualHex(a: string, b: string) {
  try {
    const left = Buffer.from(a, 'utf8');
    const right = Buffer.from(b, 'utf8');
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export function hmacHex(secret: string, payload: string, algo: 'sha256' | 'sha512' = 'sha256') {
  return createHmac(algo, secret).update(payload).digest('hex');
}
