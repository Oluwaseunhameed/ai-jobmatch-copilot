import type { Metadata } from 'next';

import { ClerkThemeProvider } from '@/components/providers/clerk-theme-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { fontDisplay, fontUi } from '@/lib/fonts';

import './globals.css';

export const metadata: Metadata = {
  title: 'AI JobMatch Copilot',
  description:
    'Build your career profile once. Let AI optimize resumes, discover jobs, and track applications.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fontUi.variable} ${fontDisplay.variable}`}>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ClerkThemeProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </ClerkThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
