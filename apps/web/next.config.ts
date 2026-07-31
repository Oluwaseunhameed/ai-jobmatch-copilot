import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@jobmatch/types',
    '@jobmatch/database',
    '@jobmatch/i18n',
    '@jobmatch/storage',
    '@jobmatch/resume-parsing',
    '@jobmatch/job-search',
  ],
  // Queue has a compiled CommonJS entry and must remain external so webpack
  // does not traverse BullMQ's unused optional Valkey transport.
  serverExternalPackages: [
    '@prisma/client',
    'prisma',
    '@jobmatch/queue',
    'bullmq',
    'playwright',
    'playwright-core',
  ],
  // Ensure Prisma query engines are included in the Vercel serverless bundle
  // (monorepo pnpm layout otherwise omits libquery_engine-rhel-openssl-3.0.x).
  outputFileTracingIncludes: {
    '/*': [
      '../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**',
      '../../node_modules/.prisma/client/**',
      './node_modules/.prisma/client/**',
    ],
  },
  webpack(config, { webpack }) {
    // BullMQ exports its optional Valkey adapter from the package root. Webpack
    // attempts to resolve that adapter even though this app uses Redis/ioredis,
    // producing a false missing-module warning for @valkey/valkey-glide.
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@valkey\/valkey-glide$/,
      }),
    );
    return config;
  },
};

export default nextConfig;
