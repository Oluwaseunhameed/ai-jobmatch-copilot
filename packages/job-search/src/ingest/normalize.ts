import type { NormalizedIngestJob } from './types';

export function slugify(value: string, max = 80): string {
  const base = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return (base || 'item').slice(0, max);
}

export function stripHtml(html: string, max = 20_000): string {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, max) || 'No description provided.';
}

export function mapEmploymentType(raw?: string | null): string {
  const value = (raw ?? '').toLowerCase().replace(/[_-]+/g, ' ').trim();
  if (!value) return 'full-time';
  if (value.includes('part')) return 'part-time';
  if (value.includes('contract') || value.includes('temporary')) return 'contract';
  if (value.includes('freelance') || value.includes('contractor')) return 'freelance';
  if (value.includes('intern')) return 'internship';
  return 'full-time';
}

export function mapWorkMode(raw?: string | null, fallback = 'remote'): string {
  const value = (raw ?? '').toLowerCase();
  if (value.includes('hybrid')) return 'hybrid';
  if (value.includes('on-site') || value.includes('onsite') || value.includes('office')) {
    return 'on-site';
  }
  if (value.includes('remote') || fallback === 'remote') return 'remote';
  return fallback;
}

export function mapSeniority(raw?: string | null): string {
  const value = (raw ?? '').toLowerCase();
  if (value.includes('intern')) return 'intern';
  if (value.includes('junior') || value.includes('entry')) return 'junior';
  if (value.includes('principal') || value.includes('staff')) return 'principal';
  if (value.includes('lead') || value.includes('manager') || value.includes('director')) {
    return 'lead';
  }
  if (value.includes('senior') || value.includes('sr')) return 'senior';
  if (value.includes('mid')) return 'mid';
  return 'mid';
}

export function parseSalaryRange(raw?: string | null): {
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
} {
  if (!raw?.trim()) {
    return { salaryMin: null, salaryMax: null, salaryCurrency: 'USD' };
  }
  const currencyMatch = raw.match(/\b(USD|EUR|GBP|CAD|AUD|NGN)\b/i);
  const currency = currencyMatch?.[1]?.toUpperCase() ?? 'USD';
  const nums = [...raw.replace(/,/g, '').matchAll(/(\d{2,6})(?:\s*k)?/gi)].map((m) => {
    const n = Number(m[1]);
    return /k$/i.test(m[0]) ? n * 1000 : n;
  });
  if (!nums.length) return { salaryMin: null, salaryMax: null, salaryCurrency: currency };
  const sorted = [...nums].sort((a, b) => a - b);
  return {
    salaryMin: sorted[0] ?? null,
    salaryMax: sorted.length > 1 ? sorted[sorted.length - 1]! : sorted[0]!,
    salaryCurrency: currency,
  };
}

export function uniqueJobs(jobs: NormalizedIngestJob[]): NormalizedIngestJob[] {
  const seen = new Set<string>();
  const out: NormalizedIngestJob[] = [];
  for (const job of jobs) {
    const key = `${job.source}:${job.externalId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(job);
  }
  return out;
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const timeoutMs = init?.timeoutMs ?? 45_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AI-JobMatch-Copilot/1.0 (+https://github.com/Oluwaseunhameed/ai-jobmatch-copilot)',
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      // Strip query secrets (API keys) from error messages
      const safeUrl = url.replace(/([?&](?:app_id|app_key|api_key|apikey)=)[^&]*/gi, '$1***');
      throw new Error(`HTTP ${res.status} for ${safeUrl}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
