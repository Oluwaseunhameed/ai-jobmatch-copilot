/**
 * Lightweight section extraction used when applying an older parse that only
 * stored headline/summary/skills. Prefer AI-service structured fields when present.
 */

export type ExtractedExperience = {
  title: string;
  company: string;
  location: string | null;
  startMonth: string | null;
  endMonth: string | null;
  isCurrent: boolean;
  description: string | null;
  highlights: string[];
};

export type ExtractedEducation = {
  school: string;
  degree: string | null;
  field: string | null;
  startYear: number | null;
  endYear: number | null;
  description: string | null;
};

export type ExtractedLocation = {
  city: string | null;
  country: string | null;
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}/g;
const URL_RE = /https?:\/\/[^\s)]+|www\.[^\s)]+/gi;

const US_STATES =
  'AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const COUNTRIES = [
  'United States',
  'USA',
  'U.S.A.',
  'U.S.',
  'United Kingdom',
  'UK',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Netherlands',
  'Spain',
  'Italy',
  'Ireland',
  'India',
  'Nigeria',
  'Kenya',
  'Ghana',
  'South Africa',
  'Brazil',
  'Mexico',
  'Singapore',
  'Japan',
  'China',
  'UAE',
  'United Arab Emirates',
  'Saudi Arabia',
  'Poland',
  'Sweden',
  'Norway',
  'Denmark',
  'Finland',
  'Switzerland',
  'Portugal',
  'Belgium',
  'Austria',
  'New Zealand',
  'Philippines',
  'Indonesia',
  'Malaysia',
  'Pakistan',
  'Bangladesh',
  'Egypt',
  'Israel',
  'Turkey',
  'Argentina',
  'Chile',
  'Colombia',
  'Romania',
  'Czech Republic',
  'Czechia',
];

const COUNTRY_RE = new RegExp(`\\b(?:${COUNTRIES.map(escapeRegExp).join('|')})\\b`, 'i');
const CITY_COUNTRY_RE = new RegExp(
  `\\b([A-Z][A-Za-z.'\\- ]{1,40}),\\s*(${COUNTRIES.map(escapeRegExp).join('|')}|${US_STATES})\\b`,
  'i',
);
const LOCATION_LABEL_RE = /^(?:location|based\s+in|residing\s+in|lives?\s+in)\s*[:\-]?\s*(.+)$/i;

function normalizeCountry(token: string): string {
  const t = token.trim();
  if (/^(usa|u\.s\.a\.|u\.s\.)$/i.test(t) || new RegExp(`^(?:${US_STATES})$`, 'i').test(t)) {
    return 'United States';
  }
  if (/^(uk|u\.k\.)$/i.test(t)) return 'United Kingdom';
  if (/^uae$/i.test(t)) return 'United Arab Emirates';
  if (/^czechia$/i.test(t)) return 'Czech Republic';
  return t.slice(0, 80);
}

const ROLE_RE =
  /\b(engineer|developer|designer|manager|director|analyst|scientist|consultant|specialist|lead|intern|architect|founder)\b/i;

const DATE_RANGE_RE =
  /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{4})\s*[–\-—to]+\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{4}|present|current|now)\b/i;

const DEGREE_RE =
  /\b(ph\.?d\.?|m\.?s\.?|m\.?eng\.?|m\.?b\.?a\.?|b\.?s\.?|b\.?a\.?|b\.?eng\.?|bachelor(?:'s)?|master(?:'s)?|doctorate|associate(?:'s)?|diploma)\b/i;

function sectionLines(lines: string[], start: RegExp): string[] {
  const collected: string[] = [];
  let collecting = false;
  const nextSection =
    /^(work\s+experience|professional\s+experience|experience|employment|education|skills|projects|certifications|awards|languages|interests|references)\b/i;

  for (const raw of lines) {
    const line = raw.replace(/^[•·▪◦‣*\-–—]+\s*/, '').trim();
    if (!line) continue;

    if (collecting) {
      if (nextSection.test(line) && !start.test(line)) break;
      collected.push(line);
      continue;
    }

    if (start.test(line)) {
      collecting = true;
      const rest = line.replace(start, '').replace(/^[\s:\-–—]+/, '').trim();
      if (rest) collected.push(rest);
    }
  }

  return collected;
}

function normalizeMonth(token: string): string {
  if (/^(present|current|now)$/i.test(token.trim())) return 'Present';
  return token.trim().replace(/\s+/g, ' ').slice(0, 32);
}

function dateRange(text: string): { start: string | null; end: string | null; isCurrent: boolean } {
  const match = text.match(DATE_RANGE_RE);
  if (!match) return { start: null, end: null, isCurrent: false };
  const endRaw = match[2];
  const isCurrent = /^(present|current|now)$/i.test(endRaw);
  return {
    start: normalizeMonth(match[1]),
    end: isCurrent ? 'Present' : normalizeMonth(endRaw),
    isCurrent,
  };
}

export function extractExperienceFromText(text: string): ExtractedExperience[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const section = sectionLines(
    lines,
    /^(work\s+experience|professional\s+experience|experience|employment(?:\s+history)?)\b/i,
  );
  if (!section.length) return [];

  const entries: ExtractedExperience[] = [];
  let block: string[] = [];

  const flush = () => {
    if (!block.length || entries.length >= 8) {
      block = [];
      return;
    }
    const header = block[0];
    const parts = header.split(/\s*[|•·/–—\-]\s*/);
    let title = (parts[0] ?? '').trim();
    let company = (parts[1] ?? '').trim();
    if (!company && block[1] && !DATE_RANGE_RE.test(block[1])) {
      company = block[1].trim();
    }
    if (company && ROLE_RE.test(company) && !ROLE_RE.test(title)) {
      [title, company] = [company, title];
    }
    if (!title || !company) {
      block = [];
      return;
    }
    const { start, end, isCurrent } = dateRange(block.join(' | '));
    const description = block
      .slice(1)
      .filter((ln) => ln !== company && !DATE_RANGE_RE.test(ln))
      .slice(0, 8)
      .join('\n')
      .trim();

    entries.push({
      title: title.slice(0, 120),
      company: company.slice(0, 120),
      location: null,
      startMonth: start,
      endMonth: end,
      isCurrent,
      description: description ? description.slice(0, 2000) : null,
      highlights: [],
    });
    block = [];
  };

  for (const line of section) {
    const startsNew =
      block.length >= 2 &&
      line.length <= 90 &&
      ROLE_RE.test(line) &&
      !DATE_RANGE_RE.test(line) &&
      DATE_RANGE_RE.test(block.join(' '));
    if (startsNew) flush();
    block.push(line);
  }
  flush();

  return entries;
}

export function extractEducationFromText(text: string): ExtractedEducation[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const section = sectionLines(lines, /^education\b/i);
  if (!section.length) return [];

  const entries: ExtractedEducation[] = [];
  for (let i = 0; i < section.length && entries.length < 6; i++) {
    const line = section[i]!;
    const years = [...line.matchAll(/\b((?:19|20)\d{2})\b/g)].map((m) => Number(m[1]));
    const degreeMatch = line.match(DEGREE_RE);
    let school = line;
    let degree: string | null = degreeMatch ? degreeMatch[0] : null;
    let field: string | null = null;

    if (degreeMatch) {
      const rest = line.slice(degreeMatch.index! + degreeMatch[0].length).replace(/^[\s,:\-–—|in]+/i, '');
      const bits = rest.split(/\s*[|–—\-]\s*/);
      if (bits.length > 1) {
        field = bits[0]?.trim() || null;
        school = bits.slice(1).join(' - ').trim() || line;
      } else if (section[i + 1] && !DEGREE_RE.test(section[i + 1]!)) {
        field = rest || null;
        school = section[i + 1]!;
        i += 1;
      }
    } else if (section[i + 1] && DEGREE_RE.test(section[i + 1]!)) {
      school = line;
      const next = section[i + 1]!;
      const dm = next.match(DEGREE_RE);
      degree = dm?.[0] ?? null;
      field = dm ? next.slice(dm.index! + dm[0].length).replace(/^[\s,:\-–—|in]+/i, '') || null : null;
      i += 1;
      const moreYears = [...next.matchAll(/\b((?:19|20)\d{2})\b/g)].map((m) => Number(m[1]));
      years.push(...moreYears);
    } else if (!/[A-Za-z]{3,}/.test(line)) {
      continue;
    }

    if (school.trim().length < 2) continue;
    entries.push({
      school: school.trim().slice(0, 160),
      degree: degree?.slice(0, 120) ?? null,
      field: field?.slice(0, 160) ?? null,
      startYear: years[0] ?? null,
      endYear: years.length > 1 ? years[years.length - 1]! : (years[0] ?? null),
      description: null,
    });
  }

  return entries;
}

/** City / country from the resume header (first ~15 non-section lines). */
export function extractLocationFromText(text: string): ExtractedLocation {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 15);

  for (const line of lines) {
    if (/^(summary|experience|education|skills|projects)\b/i.test(line)) break;
    if (EMAIL_RE.test(line) || URL_RE.test(line)) continue;

    const labeled = line.match(LOCATION_LABEL_RE);
    const candidate = labeled?.[1]?.trim() ?? line;
    const match = candidate.match(CITY_COUNTRY_RE);
    if (match) {
      return {
        city: match[1]!.trim().replace(/\s+/g, ' ').slice(0, 80),
        country: normalizeCountry(match[2]!),
      };
    }

    const countryOnly = candidate.match(COUNTRY_RE);
    if (countryOnly && candidate.length <= 60) {
      const before = candidate
        .slice(0, countryOnly.index)
        .replace(/[,\-|•]+$/g, '')
        .trim();
      return {
        city: before && before.length >= 2 && before.length <= 40 ? before.slice(0, 80) : null,
        country: normalizeCountry(countryOnly[0]!),
      };
    }
  }

  return { city: null, country: null };
}

export function extractPhonesFromText(text: string): string[] {
  const matches = text.match(PHONE_RE) ?? [];
  return matches
    .map((p) => p.trim())
    .filter((p) => p.replace(/\D/g, '').length >= 7)
    .slice(0, 3);
}

export function extractLinksFromText(text: string): string[] {
  const matches = text.match(URL_RE) ?? [];
  return matches
    .map((u) => (u.startsWith('http') ? u : `https://${u}`).replace(/[.,;:]+$/, ''))
    .slice(0, 8);
}

/** Earliest experience start → years of experience (inclusive of current year). */
export function inferYearsOfExperience(
  experience: Array<{ startMonth?: string | null; endMonth?: string | null }>,
  now = new Date(),
): number | null {
  const years: number[] = [];
  for (const item of experience) {
    const start = item.startMonth?.match(/\b((?:19|20)\d{2})\b/)?.[1];
    if (start) years.push(Number(start));
  }
  if (!years.length) return null;
  const earliest = Math.min(...years);
  const yoe = now.getFullYear() - earliest;
  if (yoe < 0 || yoe > 50) return null;
  return yoe;
}

/** Detect remote / hybrid / on-site preference from resume wording. */
export function inferWorkLocationPreference(
  text: string,
): 'remote' | 'hybrid' | 'on-site' | null {
  const sample = text.slice(0, 2500);
  if (/\bhybrid\b/i.test(sample)) return 'hybrid';
  if (/\b(?:fully\s+)?remote\b|\bwork\s+from\s+home\b|\bwfh\b/i.test(sample)) return 'remote';
  if (/\bon[-\s]?site\b|\bin[-\s]?office\b/i.test(sample)) return 'on-site';
  return null;
}

export function isPortfolioUrl(url: string): boolean {
  return /portfolio|behance\.net|dribbble\.com|carbonmade\.com|cargo\.site|read\.cv|notion\.site/i.test(
    url,
  );
}
