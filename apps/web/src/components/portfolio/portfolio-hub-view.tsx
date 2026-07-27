'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, FolderKanban, Sparkles, Star } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  PORTFOLIO_STATUS_LABELS,
  createPortfolioProjectFromSuggestion,
  type PortfolioBrief,
  type PortfolioProjectStatus,
} from '@/lib/api-client';
import { cn } from '@/lib/utils';

export function PortfolioHubView({ brief }: { brief: PortfolioBrief }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function acceptSuggestion(suggestionId: string) {
    setPendingId(suggestionId);
    setError(null);
    try {
      const project = await createPortfolioProjectFromSuggestion({ suggestionId });
      router.push(`/portfolio/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create project');
    } finally {
      setPendingId(null);
    }
  }

  const profileLinkNodes = [
    brief.profileLinks.portfolioUrl && (
      <a
        key="portfolio"
        href={brief.profileLinks.portfolioUrl}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-foreground underline-offset-4 hover:underline"
      >
        portfolio
      </a>
    ),
    brief.profileLinks.githubUrl && (
      <a
        key="github"
        href={brief.profileLinks.githubUrl}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-foreground underline-offset-4 hover:underline"
      >
        GitHub
      </a>
    ),
    brief.profileLinks.websiteUrl && (
      <a
        key="website"
        href={brief.profileLinks.websiteUrl}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-foreground underline-offset-4 hover:underline"
      >
        website
      </a>
    ),
  ].filter(Boolean) as ReactNode[];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Portfolio builder
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Projects employers can scan
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{brief.summary}</p>
        </div>
        <Button asChild>
          <Link href="/portfolio/new">New project</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Readiness" value={`${brief.readinessScore}%`} />
        <StatCard label="Projects" value={String(brief.projectCount)} />
        <StatCard
          label="Shipped / featured"
          value={`${brief.shippedCount} / ${brief.featuredCount}`}
        />
      </div>

      {brief.missing.length > 0 ? (
        <div className="surface-panel p-5">
          <p className="font-medium text-foreground">Next improvements</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {brief.missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {profileLinkNodes.length > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Profile links:{' '}
              {profileLinkNodes.map((node, index) => (
                <span key={index}>
                  {index > 0 ? ' · ' : null}
                  {node}
                </span>
              ))}
              {' · '}
              <Link href="/profile" className="underline-offset-4 hover:underline">
                edit
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      {brief.suggestions.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-display text-xl font-semibold tracking-tight">
              Suggested from skill gaps
            </h2>
          </div>
          <ul className="grid gap-3 md:grid-cols-2">
            {brief.suggestions.map((suggestion) => (
              <li key={suggestion.id} className="surface-panel p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {suggestion.skill} · {suggestion.priority}
                </p>
                <p className="mt-1 font-display text-lg font-semibold tracking-tight">
                  {suggestion.title}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{suggestion.summary}</p>
                <p className="mt-2 text-xs text-muted-foreground">{suggestion.detail}</p>
                <Button
                  className="mt-4"
                  size="sm"
                  disabled={pendingId === suggestion.id}
                  onClick={() => void acceptSuggestion(suggestion.id)}
                >
                  {pendingId === suggestion.id ? <Spinner size="sm" /> : null}
                  Add to portfolio
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {brief.projects.length === 0 ? (
        <div className="surface-panel p-6">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-primary" />
            <p className="font-medium text-foreground">No projects yet</p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a project manually or accept a suggestion above. Tips also flow from your{' '}
            <Link href="/growth" className="font-medium text-foreground underline-offset-4 hover:underline">
              Growth Hub
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {brief.projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/portfolio/${project.id}`}
                className="surface-panel block p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {PORTFOLIO_STATUS_LABELS[project.status as PortfolioProjectStatus] ??
                        project.status}
                      {project.isFeatured ? ' · featured' : ''}
                      {project.source === 'suggested' ? ' · suggested' : ''}
                    </p>
                    <p className="mt-1 flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
                      {project.isFeatured ? <Star className="h-4 w-4 text-primary" /> : null}
                      {project.title}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {(project.techStack.slice(0, 4).join(' · ') || 'No stack listed') +
                        (project.resumeBullets.length
                          ? ` · ${project.resumeBullets.length} resume bullets`
                          : '')}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Edit <ExternalLink className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-panel p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('mt-2 font-display text-2xl font-semibold tracking-tight')}>{value}</p>
    </div>
  );
}
