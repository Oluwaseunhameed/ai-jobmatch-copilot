import { prisma } from '@jobmatch/database';
import type {
  PortfolioBriefDto,
  PortfolioProjectDto,
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
      select: { portfolioUrl: true, githubUrl: true, websiteUrl: true },
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
  });
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
