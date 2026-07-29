import {
  calculateCompletenessScore,
  prisma,
  type Prisma,
} from '@jobmatch/database';
import {
  inferYearsOfExperience,
  isPortfolioUrl,
} from '@jobmatch/resume-parsing';

import { invalidateProfileCache } from '@/lib/cache/jobmatch-hubs-cache';

type ParsedExperience = {
  title?: string;
  company?: string;
  location?: string | null;
  startMonth?: string | null;
  endMonth?: string | null;
  isCurrent?: boolean;
  description?: string | null;
  highlights?: string[];
};

type ParsedEducation = {
  school?: string;
  degree?: string | null;
  field?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  description?: string | null;
};

type ParsedJson = {
  headline?: string | null;
  summary?: string | null;
  skills?: string[];
  phones?: string[];
  links?: string[];
  city?: string | null;
  country?: string | null;
  yearsOfExperience?: number | null;
  workLocationPreference?: string | null;
  desiredRoles?: string[];
  experience?: ParsedExperience[];
  education?: ParsedEducation[];
  /** Aliases some extractors may use */
  workExperience?: ParsedExperience[];
};

const ROLE_HINT_RE =
  /\b(engineer|developer|designer|manager|director|analyst|scientist|consultant|specialist|lead|intern|architect|founder|product)\b/i;

function pickGithub(links: string[]) {
  return links.find((l) => /github\.com/i.test(l)) ?? null;
}

function pickLinkedIn(links: string[]) {
  return links.find((l) => /linkedin\.com/i.test(l)) ?? null;
}

function pickPortfolio(links: string[]) {
  return links.find((l) => isPortfolioUrl(l)) ?? null;
}

function pickWebsite(links: string[]) {
  return (
    links.find(
      (l) =>
        !/github\.com|linkedin\.com|mailto:/i.test(l) &&
        !isPortfolioUrl(l) &&
        /^https?:\/\//i.test(l),
    ) ?? null
  );
}

function normalizeWorkLocationPreference(
  value: string | null | undefined,
): 'remote' | 'hybrid' | 'on-site' | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === 'remote' || v === 'hybrid' || v === 'on-site') return v;
  return null;
}

export async function updateProfile(
  userId: string,
  parsed: unknown,
  options: {
    applyHeadline: boolean;
    applySummary: boolean;
    applySkills: boolean;
    applyExperience?: boolean;
    applyEducation?: boolean;
    applyContacts?: boolean;
    applyLocation?: boolean;
    applyPreferences?: boolean;
  },
) {
  const data = (parsed ?? {}) as ParsedJson;
  const applyExperience = options.applyExperience !== false;
  const applyEducation = options.applyEducation !== false;
  const applyContacts = options.applyContacts !== false;
  const applyLocation = options.applyLocation !== false;
  const applyPreferences = options.applyPreferences !== false;

  await prisma.careerProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  const current = await prisma.careerProfile.findUnique({
    where: { userId },
    include: {
      skills: true,
      education: true,
      workExperience: true,
    },
  });

  if (!current) {
    throw new Error('Profile unavailable');
  }

  const patch: Prisma.CareerProfileUpdateInput = {};

  if (options.applyHeadline && data.headline?.trim()) {
    if (!current.headline?.trim()) {
      patch.headline = data.headline.trim().slice(0, 120);
    }
  }

  if (options.applySummary && data.summary?.trim()) {
    if (!current.summary?.trim()) {
      patch.summary = data.summary.trim().slice(0, 4000);
    }
  }

  if (options.applySkills && Array.isArray(data.skills) && data.skills.length) {
    const existingNames = new Set(current.skills.map((s) => s.name.toLowerCase()));
    const toCreate = data.skills
      .map((name) => name.trim())
      .filter((name) => name && !existingNames.has(name.toLowerCase()))
      .slice(0, 20)
      .map((name) => ({
        name,
        category: 'technical',
        level: 'intermediate',
      }));

    if (toCreate.length) {
      patch.skills = { create: toCreate };
    }
  }

  const experience = Array.isArray(data.experience)
    ? data.experience
    : Array.isArray(data.workExperience)
      ? data.workExperience
      : [];

  if (applyExperience && current.workExperience.length === 0 && experience.length) {
    const toCreate = experience
      .filter((e) => e?.title?.trim() && e?.company?.trim())
      .slice(0, 8)
      .map((e, index) => ({
        title: e.title!.trim().slice(0, 120),
        company: e.company!.trim().slice(0, 120),
        location: e.location?.trim()?.slice(0, 120) || null,
        startMonth: e.startMonth?.trim()?.slice(0, 32) || null,
        endMonth: e.endMonth?.trim()?.slice(0, 32) || null,
        isCurrent: Boolean(e.isCurrent),
        description: e.description?.trim()?.slice(0, 4000) || null,
        highlights: Array.isArray(e.highlights)
          ? e.highlights.filter((h): h is string => typeof h === 'string').slice(0, 12)
          : [],
        sortOrder: index,
      }));

    if (toCreate.length) {
      patch.workExperience = { create: toCreate };
      if (!current.currentJobTitle?.trim()) {
        patch.currentJobTitle = toCreate[0]?.title ?? undefined;
      }
    }
  }

  if (applyEducation && current.education.length === 0 && Array.isArray(data.education)) {
    const toCreate = data.education
      .filter((e) => e?.school?.trim())
      .slice(0, 6)
      .map((e, index) => ({
        school: e.school!.trim().slice(0, 160),
        degree: e.degree?.trim()?.slice(0, 120) || null,
        field: e.field?.trim()?.slice(0, 160) || null,
        startYear: typeof e.startYear === 'number' ? e.startYear : null,
        endYear: typeof e.endYear === 'number' ? e.endYear : null,
        description: e.description?.trim()?.slice(0, 2000) || null,
        sortOrder: index,
      }));

    if (toCreate.length) {
      patch.education = { create: toCreate };
    }
  }

  if (applyLocation) {
    if (data.city?.trim() && !current.city?.trim()) {
      patch.city = data.city.trim().slice(0, 80);
    }
    if (data.country?.trim() && !current.country?.trim()) {
      patch.country = data.country.trim().slice(0, 80);
    }
  }

  if (applyContacts) {
    const phone = data.phones?.[0]?.trim();
    if (phone && !current.phone?.trim()) {
      patch.phone = phone.slice(0, 40);
    }

    const links = Array.isArray(data.links) ? data.links.map((l) => l.trim()).filter(Boolean) : [];
    const github = pickGithub(links);
    const linkedin = pickLinkedIn(links);
    const portfolio = pickPortfolio(links);
    const website = pickWebsite(links);

    if (github && !current.githubUrl?.trim()) patch.githubUrl = github.slice(0, 300);
    if (linkedin && !current.linkedinUrl?.trim()) patch.linkedinUrl = linkedin.slice(0, 300);
    if (portfolio && !current.portfolioUrl?.trim()) patch.portfolioUrl = portfolio.slice(0, 300);
    if (website && !current.websiteUrl?.trim()) patch.websiteUrl = website.slice(0, 300);
  }

  if (applyPreferences) {
    if (!current.currentJobTitle?.trim()) {
      const fromHeadline = data.headline?.trim();
      const fromExp = experience.find((e) => e?.title?.trim())?.title?.trim();
      const title = fromHeadline && ROLE_HINT_RE.test(fromHeadline) ? fromHeadline : fromExp;
      if (title) patch.currentJobTitle = title.slice(0, 120);
    }

    if (current.yearsOfExperience == null) {
      const parsedYoe =
        typeof data.yearsOfExperience === 'number' && data.yearsOfExperience >= 0
          ? data.yearsOfExperience
          : inferYearsOfExperience(experience);
      if (parsedYoe != null) patch.yearsOfExperience = parsedYoe;
    }

    if (!current.desiredRoles.length) {
      const fromParsed = Array.isArray(data.desiredRoles)
        ? data.desiredRoles.map((r) => r.trim()).filter(Boolean)
        : [];
      const fromHeadline =
        data.headline?.trim() && ROLE_HINT_RE.test(data.headline)
          ? [data.headline.trim()]
          : [];
      const roles = (fromParsed.length ? fromParsed : fromHeadline).slice(0, 5);
      if (roles.length) patch.desiredRoles = roles.map((r) => r.slice(0, 80));
    }

    if (!current.workLocationPreference?.trim()) {
      const pref = normalizeWorkLocationPreference(data.workLocationPreference);
      if (pref) patch.workLocationPreference = pref;
    }
  }

  const updated = await prisma.careerProfile.update({
    where: { userId },
    data: patch,
    include: {
      skills: { orderBy: { createdAt: 'asc' } },
      education: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      workExperience: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
    },
  });

  const completenessScore = calculateCompletenessScore(updated);

  const result = await prisma.careerProfile.update({
    where: { userId },
    data: { completenessScore },
    include: {
      skills: { orderBy: { createdAt: 'asc' } },
      education: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      workExperience: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
    },
  });

  await invalidateProfileCache(userId);
  return result;
}
