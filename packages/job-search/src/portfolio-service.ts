import { prisma } from '@jobmatch/database';
import type {
  PortfolioBriefDto,
  PortfolioProjectDto,
  PublicPortfolioDto,
} from '@jobmatch/types';

import { getCareerGrowthHub } from './growth-service';
import {
  buildPortfolioBrief,
  buildProjectSuggestions,
  normalizeProjectInput,
  toPortfolioProjectDto,
  type PortfolioProjectInput,
} from './portfolio';

export {
  buildPortfolioBrief,
  buildProjectSuggestions,
  buildResumeBullets,
  computePortfolioReadiness,
  normalizeProjectInput,
  toPortfolioProjectDto,
  type PortfolioProjectInput,
} from './portfolio';

export async function listPortfolioProjects(userId: string): Promise<PortfolioProjectDto[]> {
  const rows = await prisma.portfolioProject.findMany({
    where: { userId },
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    take: 100,
  });
  return rows.map(toPortfolioProjectDto);
}

export async function getPortfolioProject(
  userId: string,
  id: string,
): Promise<PortfolioProjectDto | null> {
  const row = await prisma.portfolioProject.findFirst({
    where: { id, userId },
  });
  return row ? toPortfolioProjectDto(row) : null;
}

export async function getPortfolioBrief(userId: string): Promise<PortfolioBriefDto> {
  const [projects, hub, profile] = await Promise.all([
    listPortfolioProjects(userId),
    getCareerGrowthHub(userId),
    prisma.careerProfile.findUnique({
      where: { userId },
      select: {
        portfolioUrl: true,
        githubUrl: true,
        websiteUrl: true,
        publicSlug: true,
      },
    }),
  ]);

  const suggestions = buildProjectSuggestions({
    skillGaps: hub.skillGaps,
    existingTitles: projects.map((p) => p.title),
    limit: 4,
  });

  return buildPortfolioBrief({
    projects,
    suggestions,
    profileLinks: {
      portfolioUrl: profile?.portfolioUrl ?? null,
      githubUrl: profile?.githubUrl ?? null,
      websiteUrl: profile?.websiteUrl ?? null,
    },
    publicSlug: profile?.publicSlug ?? null,
  });
}

function slugifyPortfolio(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export async function publishPortfolio(input: {
  userId: string;
  slug?: string | null;
}): Promise<PortfolioBriefDto> {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { name: true },
  });
  const base =
    slugifyPortfolio(input.slug?.trim() || user?.name || 'portfolio') || 'portfolio';
  let slug = base;
  for (let i = 0; i < 8; i += 1) {
    const clash = await prisma.careerProfile.findFirst({
      where: {
        publicSlug: slug,
        NOT: { userId: input.userId },
      },
      select: { id: true },
    });
    if (!clash) break;
    slug = `${base}-${i + 2}`;
  }

  await prisma.careerProfile.upsert({
    where: { userId: input.userId },
    create: { userId: input.userId, publicSlug: slug },
    update: { publicSlug: slug },
  });

  return getPortfolioBrief(input.userId);
}

export async function getPublicPortfolio(slug: string): Promise<PublicPortfolioDto | null> {
  const profile = await prisma.careerProfile.findFirst({
    where: { publicSlug: slug },
    include: { user: { select: { name: true } } },
  });
  if (!profile) return null;

  const projects = await prisma.portfolioProject.findMany({
    where: {
      userId: profile.userId,
      status: { in: ['shipped', 'in_progress'] },
      OR: [{ isFeatured: true }, { status: 'shipped' }],
    },
    orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
    take: 24,
  });

  return {
    slug,
    displayName: profile.user.name,
    headline: profile.headline,
    about: profile.summary,
    githubUrl: profile.githubUrl,
    websiteUrl: profile.websiteUrl ?? profile.portfolioUrl,
    projects: projects.map(toPortfolioProjectDto),
  };
}

export async function importGithubRepo(input: {
  userId: string;
  repoUrl: string;
}): Promise<PortfolioProjectDto> {
  const parsed = parseGithubRepo(input.repoUrl);
  if (!parsed) {
    throw new Error('Use a GitHub repo URL like https://github.com/owner/repo');
  }

  const response = await fetch(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'ai-jobmatch-copilot',
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
    },
  );
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? 'GitHub repo not found (or private without GITHUB_TOKEN)'
        : `GitHub API error (${response.status})`,
    );
  }

  const repo = (await response.json()) as {
    name?: string;
    description?: string | null;
    html_url?: string;
    homepage?: string | null;
    language?: string | null;
    topics?: string[];
    stargazers_count?: number;
  };

  const tech = [
    ...(repo.language ? [repo.language] : []),
    ...((repo.topics ?? []).slice(0, 6)),
  ];

  return createPortfolioProject({
    userId: input.userId,
    data: {
      title: repo.name || parsed.repo,
      summary: repo.description || `Imported from GitHub (${parsed.owner}/${parsed.repo}).`,
      role: 'Builder',
      status: 'shipped',
      techStack: tech,
      highlights: [
        repo.stargazers_count
          ? `${repo.stargazers_count} GitHub stars`
          : 'Synced from public GitHub repository',
        `Repository: ${parsed.owner}/${parsed.repo}`,
      ],
      repoUrl: repo.html_url || `https://github.com/${parsed.owner}/${parsed.repo}`,
      demoUrl: repo.homepage || null,
      source: 'github',
      isFeatured: false,
    },
  });
}

function parseGithubRepo(raw: string): { owner: string; repo: string } | null {
  const trimmed = raw.trim();
  const match = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+)(?:\.git)?\/?/i,
  );
  if (!match) return null;
  return {
    owner: match[1]!,
    repo: match[2]!.replace(/\.git$/i, ''),
  };
}

export async function createPortfolioProject(input: {
  userId: string;
  data: PortfolioProjectInput;
}): Promise<PortfolioProjectDto> {
  const data = normalizeProjectInput(input.data);
  const count = await prisma.portfolioProject.count({ where: { userId: input.userId } });
  const row = await prisma.portfolioProject.create({
    data: {
      userId: input.userId,
      ...data,
      sortOrder: data.sortOrder || count,
    },
  });
  return toPortfolioProjectDto(row);
}

export async function updatePortfolioProject(input: {
  userId: string;
  id: string;
  data: PortfolioProjectInput;
}): Promise<PortfolioProjectDto | null> {
  const existing = await prisma.portfolioProject.findFirst({
    where: { id: input.id, userId: input.userId },
    select: { id: true },
  });
  if (!existing) return null;

  const data = normalizeProjectInput({
    ...input.data,
    title: input.data.title,
  });

  const row = await prisma.portfolioProject.update({
    where: { id: existing.id },
    data,
  });
  return toPortfolioProjectDto(row);
}

export async function deletePortfolioProject(userId: string, id: string): Promise<boolean> {
  const existing = await prisma.portfolioProject.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.portfolioProject.delete({ where: { id: existing.id } });
  return true;
}

export async function createProjectFromSuggestion(input: {
  userId: string;
  suggestionId?: string;
  skill?: string;
}): Promise<PortfolioProjectDto> {
  const brief = await getPortfolioBrief(input.userId);
  const suggestion =
    brief.suggestions.find((s) => s.id === input.suggestionId) ??
    brief.suggestions.find((s) => s.skill.toLowerCase() === input.skill?.toLowerCase()) ??
    brief.suggestions[0];

  if (!suggestion) {
    throw new Error('No project suggestions available — add skills or wait for market gaps');
  }

  return createPortfolioProject({
    userId: input.userId,
    data: {
      title: suggestion.title,
      summary: suggestion.summary,
      role: 'Builder',
      status: 'draft',
      techStack: suggestion.techStack,
      highlights: suggestion.starterHighlights,
      source: 'suggested',
      suggestedSkill: suggestion.skill,
      isFeatured: false,
    },
  });
}
