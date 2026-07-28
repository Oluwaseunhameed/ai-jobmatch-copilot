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

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
}

function stripRemainingTags(html: string): string {
  return html.replace(/<[^>]+>/g, '');
}

/**
 * Flatten HTML to a single line (search/snippets). Prefer
 * {@link htmlToJobDescription} for stored job bodies.
 */
export function stripHtml(html: string, max = 20_000): string {
  const text = decodeHtmlEntities(
    stripRemainingTags(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' '),
    ),
  )
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, max) || 'No description provided.';
}

/**
 * Convert job-board HTML into structured Markdown-ish text so the UI can
 * render headings, paragraphs, and lists (Remotive, Greenhouse, etc.).
 */
export function htmlToJobDescription(html: string, max = 50_000): string {
  if (!html?.trim()) return 'No description provided.';

  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  s = s.replace(/<h([1-6])(\s[^>]*)?>/gi, (_m, level) => {
    const depth = Math.min(Number(level) || 2, 3);
    return `\n\n${'#'.repeat(depth)} `;
  });
  s = s.replace(/<\/h[1-6]>/gi, '\n\n');

  // Remotive often splits one phrase across adjacent <strong> tags — merge first.
  s = s.replace(/<\/strong>\s*<strong(\s[^>]*)?>/gi, '');
  s = s.replace(/<\/b>\s*<b(\s[^>]*)?>/gi, '');

  s = s.replace(/<(strong|b)(\s[^>]*)?>/gi, '**');
  s = s.replace(/<\/(strong|b)>/gi, '**');
  s = s.replace(/<(em|i)(\s[^>]*)?>/gi, '*');
  s = s.replace(/<\/(em|i)>/gi, '*');

  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/?(p|div|section|article|tr|table)(\s[^>]*)?>/gi, '\n\n');
  s = s.replace(/<\/?(ul|ol)(\s[^>]*)?>/gi, '\n\n');
  s = s.replace(/<li(\s[^>]*)?>/gi, '\n- ');
  s = s.replace(/<\/li>/gi, '\n');

  s = decodeHtmlEntities(stripRemainingTags(s));

  // Tidy leftover marker noise (spaces/tabs only — do not cross paragraphs).
  s = s.replace(/\*{4,}/g, '**');
  s = s.replace(/\*\*[ \t]*\*\*/g, '**');

  const blocks = s
    .split(/\n{2,}/)
    .map((block) => block.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').trim())
    .filter((block) => block.replace(/[\s*]/g, '').length > 0)
    .map((block) => {
      // Remotive often uses a lone <strong>Title</strong> paragraph as a section heading.
      const headingOnly = block.match(/^\*\*([^*]+)\*\*$/);
      if (headingOnly) {
        const title = headingOnly[1]!.trim();
        const wordCount = title.split(/\s+/).filter(Boolean).length;
        const looksLikeHeading =
          title.length > 0 &&
          title.length < 90 &&
          (wordCount <= 6 || !/[.!?]$/.test(title));
        if (looksLikeHeading) return `## ${title}`;
      }
      // Keep list items as separate lines inside the block.
      return block
        .split('\n')
        .map((line) => line.replace(/[ \t]{2,}/g, ' ').trim())
        .filter(Boolean)
        .join('\n');
    });

  const text = blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  return text.slice(0, max) || 'No description provided.';
}

/** Soften legacy single-line JDs that lost structure before htmlToJobDescription. */
export function recoverCollapsedJobDescription(text: string): string {
  const trimmed = text.trim();
  if (!trimmed || trimmed.includes('\n')) return trimmed;

  const markers = [
    'About the Company',
    'About Engineering',
    'About the role',
    'About the Role',
    'The Role',
    "What You'll Own",
    'What You Will Own',
    'What makes this role exciting',
    'Problems to Solve',
    'What Success Looks Like',
    'Requirements',
    'Who You Are',
    'Good to Know',
    "Tech You'll Touch",
    'Responsibilities',
    'Benefits',
    'About ',
  ];

  let result = trimmed;
  for (const marker of markers) {
    const pattern = new RegExp(`(?<!^)(${escapeRegExp(marker)})`, 'g');
    result = result.replace(pattern, '\n\n## $1\n\n');
  }

  return result.replace(/\n{3,}/g, '\n\n').trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** One-line excerpt for cards / search previews. */
export function jobDescriptionExcerpt(text: string, max = 220): string {
  const plain = recoverCollapsedJobDescription(text)
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max - 1).trimEnd()}…`;
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
