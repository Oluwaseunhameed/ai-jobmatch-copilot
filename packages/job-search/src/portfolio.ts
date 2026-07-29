import type {
  PortfolioBriefDto,
  PortfolioProjectDto,
  PortfolioProjectStatus,
  PortfolioProjectSuggestionDto,
} from '@jobmatch/types';
import { isPortfolioProjectStatus } from '@jobmatch/types';

export type PortfolioProjectInput = {
  title: string;
  summary?: string | null;
  role?: string | null;
  status?: string;
  techStack?: string[];
  highlights?: string[];
  problem?: string | null;
  solution?: string | null;
  impact?: string | null;
  repoUrl?: string | null;
  demoUrl?: string | null;
  startMonth?: string | null;
  endMonth?: string | null;
  isFeatured?: boolean;
  sortOrder?: number;
  source?: string;
  suggestedSkill?: string | null;
};

export function normalizeStatus(value?: string | null): PortfolioProjectStatus {
  if (value && isPortfolioProjectStatus(value)) return value;
  return 'draft';
}

export function cleanStringList(values?: string[] | null, limit = 16): string[] {
  if (!values?.length) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const value = raw.trim().replace(/\s+/g, ' ');
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value.slice(0, 80));
    if (out.length >= limit) break;
  }
  return out;
}

export function cleanOptionalText(value?: string | null, max = 4000): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export function cleanUrl(value?: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed.slice(0, 500);
}

export function buildResumeBullets(project: {
  title: string;
  role?: string | null;
  highlights?: string[];
  problem?: string | null;
  solution?: string | null;
  impact?: string | null;
  techStack?: string[];
}): string[] {
  const bullets: string[] = [];
  for (const h of project.highlights ?? []) {
    const t = h.trim();
    if (t) bullets.push(t.startsWith('•') || t.startsWith('-') ? t.replace(/^[-•]\s*/, '') : t);
  }

  if (bullets.length === 0) {
    const role = project.role?.trim();
    const tech = (project.techStack ?? []).slice(0, 4).join(', ');
    if (project.problem?.trim() && project.solution?.trim()) {
      bullets.push(
        `${role ? `${role}: ` : ''}Addressed ${project.problem.trim().slice(0, 120)} by ${project.solution.trim().slice(0, 140)}.`,
      );
    }
    if (project.impact?.trim()) {
      bullets.push(project.impact.trim());
    }
    if (tech) {
      bullets.push(`Built with ${tech} for ${project.title}.`);
    }
  }

  return bullets.slice(0, 6).map((b) => b.slice(0, 280));
}

const PROJECT_TEMPLATES: Array<{
  skillMatchers: string[];
  title: (skill: string) => string;
  summary: (skill: string) => string;
  tech: (skill: string) => string[];
  highlights: (skill: string) => string[];
  detail: string;
}> = [
  {
    skillMatchers: ['typescript', 'javascript', 'node'],
    title: (skill) => `${skill} API toolkit`,
    summary: (skill) =>
      `Ship a small production-shaped service that showcases ${skill} types, testing, and API design.`,
    tech: (skill) => [skill, 'PostgreSQL', 'REST'],
    highlights: (skill) => [
      `Designed typed ${skill} endpoints with request validation and error contracts`,
      'Added integration tests for the happy path and failure modes',
      'Documented setup and trade-offs in a short README',
    ],
    detail: 'Strong for backend/fullstack applications.',
  },
  {
    skillMatchers: ['react', 'next', 'frontend', 'vue', 'angular'],
    title: (skill) => `${skill} product dashboard`,
    summary: (skill) =>
      `Build a polished dashboard UI that proves ${skill} state management, accessibility, and responsive layout.`,
    tech: (skill) => [skill, 'TypeScript', 'CSS'],
    highlights: (skill) => [
      `Implemented ${skill} views with loading, empty, and error states`,
      'Improved accessibility with keyboard flows and semantic markup',
      'Measured and reduced interaction latency on primary actions',
    ],
    detail: 'Good evidence for frontend and product-engineering roles.',
  },
  {
    skillMatchers: ['kubernetes', 'docker', 'devops', 'ci', 'terraform'],
    title: () => 'Cloud deploy playground',
    summary: (skill) =>
      `Containerise an app and document a reproducible ${skill} deployment path.`,
    tech: (skill) => [skill, 'Docker', 'CI'],
    highlights: (skill) => [
      `Packaged the app with Docker and a minimal ${skill} config`,
      'Added CI checks for lint, test, and image build',
      'Wrote a runbook for local and staging deploys',
    ],
    detail: 'Shows platform and reliability instincts.',
  },
  {
    skillMatchers: ['postgres', 'sql', 'database', 'mongodb', 'redis'],
    title: (skill) => `${skill} data model lab`,
    summary: (skill) =>
      `Design a realistic schema and queries that demonstrate ${skill} modelling and performance awareness.`,
    tech: (skill) => [skill, 'SQL', 'Indexing'],
    highlights: (skill) => [
      `Modelled entities and indexes for a ${skill}-backed workload`,
      'Compared query plans before/after indexing',
      'Documented migration steps and rollback notes',
    ],
    detail: 'Useful for backend and data-heavy roles.',
  },
  {
    skillMatchers: ['aws', 'gcp', 'azure', 'system design', 'architecture'],
    title: () => 'Architecture case study',
    summary: (skill) =>
      `Write a concise architecture case study covering ${skill} trade-offs for a common product problem.`,
    tech: (skill) => [skill, 'Diagrams', 'ADRs'],
    highlights: (skill) => [
      `Compared 2–3 ${skill} options with cost/latency/complexity trade-offs`,
      'Produced a simple diagram and decision record',
      'Called out failure modes and monitoring signals',
    ],
    detail: 'Helps senior and staff-level storytelling.',
  },
];

export function buildProjectSuggestions(input: {
  skillGaps: Array<{ skill: string; priority: string; reason?: string }>;
  existingTitles?: string[];
  limit?: number;
}): PortfolioProjectSuggestionDto[] {
  const limit = Math.min(8, Math.max(1, input.limit ?? 4));
  const existing = new Set((input.existingTitles ?? []).map((t) => t.toLowerCase()));
  const suggestions: PortfolioProjectSuggestionDto[] = [];

  for (const gap of input.skillGaps) {
    const skill = gap.skill.trim();
    if (!skill) continue;
    const lower = skill.toLowerCase();
    const template =
      PROJECT_TEMPLATES.find((t) => t.skillMatchers.some((m) => lower.includes(m))) ??
      PROJECT_TEMPLATES[0]!;

    const title = template.title(skill);
    if (existing.has(title.toLowerCase())) continue;
    if (suggestions.some((s) => s.title.toLowerCase() === title.toLowerCase())) continue;

    suggestions.push({
      id: `suggest_${lower.replace(/[^a-z0-9]+/g, '_').slice(0, 40)}`,
      title,
      summary: template.summary(skill),
      skill,
      priority: gap.priority,
      techStack: cleanStringList(template.tech(skill), 6),
      starterHighlights: template.highlights(skill),
      detail: gap.reason?.trim()
        ? `${template.detail} Market signal: ${gap.reason.trim()}`
        : template.detail,
    });

    if (suggestions.length >= limit) break;
  }

  return suggestions;
}

export function computePortfolioReadiness(projects: PortfolioProjectDto[]): {
  score: number;
  missing: string[];
  featuredCount: number;
  shippedCount: number;
} {
  const active = projects.filter((p) => p.status !== 'archived');
  const featuredCount = active.filter((p) => p.isFeatured).length;
  const shippedCount = active.filter((p) => p.status === 'shipped').length;
  const missing: string[] = [];

  if (active.length === 0) missing.push('Add at least one project');
  if (active.length > 0 && shippedCount === 0) missing.push('Mark at least one project as shipped');
  if (featuredCount === 0 && active.length > 0) missing.push('Feature 1–3 strongest projects');
  if (active.some((p) => p.resumeBullets.length === 0)) {
    missing.push('Add highlights or STAR fields so resume bullets can be generated');
  }
  if (active.filter((p) => p.repoUrl || p.demoUrl).length === 0 && active.length > 0) {
    missing.push('Link a repo or live demo on at least one project');
  }

  let score = 20;
  score += Math.min(30, active.length * 10);
  score += Math.min(20, shippedCount * 10);
  score += Math.min(15, featuredCount * 8);
  score += Math.min(
    15,
    active.filter((p) => p.resumeBullets.length > 0).length * 5,
  );
  if (active.some((p) => p.repoUrl || p.demoUrl)) score += 10;
  score = Math.max(0, Math.min(100, score));
  if (active.length === 0) score = 0;

  return { score, missing, featuredCount, shippedCount };
}

export function buildPortfolioBrief(input: {
  projects: PortfolioProjectDto[];
  suggestions: PortfolioProjectSuggestionDto[];
  profileLinks: PortfolioBriefDto['profileLinks'];
  publicSlug?: string | null;
}): PortfolioBriefDto {
  const { score, missing, featuredCount, shippedCount } = computePortfolioReadiness(
    input.projects,
  );
  const count = input.projects.filter((p) => p.status !== 'archived').length;
  const summary =
    count === 0
      ? 'Start a project library employers can scan quickly — or accept a suggested build from your skill gaps.'
      : `You have ${count} portfolio project${count === 1 ? '' : 's'} (${shippedCount} shipped, ${featuredCount} featured). Readiness ${score}%.`;
  const publicSlug = input.publicSlug?.trim() || null;

  return {
    summary,
    projectCount: count,
    featuredCount,
    shippedCount,
    readinessScore: score,
    missing,
    suggestions: input.suggestions,
    projects: input.projects,
    profileLinks: input.profileLinks,
    publicSlug,
    publicPath: publicSlug ? `/p/${publicSlug}` : null,
  };
}

export function toPortfolioProjectDto(row: {
  id: string;
  userId: string;
  title: string;
  summary: string | null;
  role: string | null;
  status: string;
  techStack: string[];
  highlights: string[];
  problem: string | null;
  solution: string | null;
  impact: string | null;
  repoUrl: string | null;
  demoUrl: string | null;
  startMonth: string | null;
  endMonth: string | null;
  isFeatured: boolean;
  sortOrder: number;
  source: string;
  suggestedSkill: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PortfolioProjectDto {
  const base = {
    title: row.title,
    role: row.role,
    highlights: row.highlights,
    problem: row.problem,
    solution: row.solution,
    impact: row.impact,
    techStack: row.techStack,
  };

  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    summary: row.summary,
    role: row.role,
    status: row.status,
    techStack: row.techStack,
    highlights: row.highlights,
    problem: row.problem,
    solution: row.solution,
    impact: row.impact,
    repoUrl: row.repoUrl,
    demoUrl: row.demoUrl,
    startMonth: row.startMonth,
    endMonth: row.endMonth,
    isFeatured: row.isFeatured,
    sortOrder: row.sortOrder,
    source: row.source,
    suggestedSkill: row.suggestedSkill,
    resumeBullets: buildResumeBullets(base),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function normalizeProjectInput(input: PortfolioProjectInput) {
  const title = input.title?.trim() ?? '';
  if (!title) throw new Error('title is required');
  if (title.length > 120) throw new Error('title is too long');

  return {
    title: title.slice(0, 120),
    summary: cleanOptionalText(input.summary, 2000),
    role: cleanOptionalText(input.role, 120),
    status: normalizeStatus(input.status),
    techStack: cleanStringList(input.techStack, 12),
    highlights: cleanStringList(input.highlights, 8).map((h) => h.slice(0, 280)),
    problem: cleanOptionalText(input.problem, 2000),
    solution: cleanOptionalText(input.solution, 2000),
    impact: cleanOptionalText(input.impact, 2000),
    repoUrl: cleanUrl(input.repoUrl),
    demoUrl: cleanUrl(input.demoUrl),
    startMonth: cleanOptionalText(input.startMonth, 7),
    endMonth: cleanOptionalText(input.endMonth, 7),
    isFeatured: Boolean(input.isFeatured),
    sortOrder:
      typeof input.sortOrder === 'number' && Number.isFinite(input.sortOrder)
        ? Math.max(0, Math.round(input.sortOrder))
        : 0,
    source: input.source?.trim() === 'suggested' ? 'suggested' : 'manual',
    suggestedSkill: cleanOptionalText(input.suggestedSkill, 80),
  };
}
