import { getPublicPortfolio } from '@jobmatch/job-search';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

export default async function PublicPortfolioPage({ params }: Params) {
  const { slug } = await params;
  const portfolio = await getPublicPortfolio(slug);
  if (!portfolio) notFound();

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-12">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Public portfolio
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
        {portfolio.displayName}
      </h1>
      {portfolio.headline ? (
        <p className="mt-2 text-lg text-muted-foreground">{portfolio.headline}</p>
      ) : null}
      {portfolio.about ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{portfolio.about}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        {portfolio.githubUrl ? (
          <a
            href={portfolio.githubUrl}
            className="text-foreground underline-offset-4 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        ) : null}
        {portfolio.websiteUrl ? (
          <a
            href={portfolio.websiteUrl}
            className="text-foreground underline-offset-4 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Website
          </a>
        ) : null}
      </div>

      <ul className="mt-10 space-y-6">
        {portfolio.projects.map((project) => (
          <li key={project.id} className="border-t border-border pt-6">
            <h2 className="text-xl font-semibold text-foreground">{project.title}</h2>
            {project.summary ? (
              <p className="mt-2 text-sm text-muted-foreground">{project.summary}</p>
            ) : null}
            {project.techStack.length > 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {project.techStack.join(' · ')}
              </p>
            ) : null}
            {project.highlights.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {project.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {project.repoUrl ? (
                <a
                  href={project.repoUrl}
                  className="underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Repo
                </a>
              ) : null}
              {project.demoUrl ? (
                <a
                  href={project.demoUrl}
                  className="underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Demo
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {portfolio.projects.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">No featured projects yet.</p>
      ) : null}
    </main>
  );
}
