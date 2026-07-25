import { BrandMark } from '@/components/brand/brand-mark';
import { ThemeToggle } from '@/components/theme-toggle';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(900px 480px at 12% -5%, var(--glow), transparent 58%), radial-gradient(700px 420px at 95% 5%, oklch(0.72 0.04 155 / 0.12), transparent 55%)',
        }}
      />
      <header className="border-b border-border/70 bg-background/75 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandMark />
          <ThemeToggle />
        </div>
      </header>
      {/* Wide enough for Clerk card; no overflow clipping */}
      <main className="mx-auto flex w-full max-w-lg justify-center px-4 py-10 sm:px-6 sm:py-14">
        <div className="animate-enter w-full overflow-visible">{children}</div>
      </main>
    </div>
  );
}
