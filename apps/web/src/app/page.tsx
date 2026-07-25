import Link from 'next/link';
import { ArrowRight, FileText, Sparkles, Target } from 'lucide-react';

import { BrandMark } from '@/components/brand/brand-mark';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Full-bleed atmospheric plane */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(1200px 700px at 50% -20%, var(--glow), transparent 55%),
            radial-gradient(800px 500px at 100% 20%, oklch(0.82 0.05 195 / 0.2), transparent 50%),
            linear-gradient(180deg, transparent 0%, var(--background) 78%)
          `,
        }}
      />

      <header className="border-b border-border/60 bg-background/50 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandMark size="md" />
          <nav className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero — brand first, one headline, one sentence, one CTA group */}
        <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="animate-enter font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem]">
              AI JobMatch <span className="text-primary">Copilot</span>
            </p>
            <h1 className="animate-enter-delayed mt-6 text-balance text-2xl font-medium tracking-tight text-foreground/90 sm:text-3xl">
              Build your profile once. Apply smarter, everywhere.
            </h1>
            <p className="animate-enter-late mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              One career source of truth — AI-optimized resumes, matched roles, and a calm pipeline
              from search to offer.
            </p>
            <div className="animate-enter-late mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/register">
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#features">See how it works</Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-border/70 bg-surface/60 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Everything you need to land your next role
              </h2>
              <p className="mt-4 text-muted-foreground">
                One platform from profile to offer — AI at every step, without the noise.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-3">
              <Feature
                icon={<FileText className="h-5 w-5" />}
                title="Career Profile"
                description="Build a structured profile once. Never fill the same form twice."
              />
              <Feature
                icon={<Sparkles className="h-5 w-5" />}
                title="AI Resume Optimization"
                description="Tailor each resume to the role with ATS scoring and keyword clarity."
              />
              <Feature
                icon={<Target className="h-5 w-5" />}
                title="Smart Job Matching"
                description="Discover roles that fit your skills with semantic search and ranking."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <BrandMark size="sm" />
          <p>© {new Date().getFullYear()} AI JobMatch Copilot</p>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-xl border border-border/80 bg-card/70 p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
