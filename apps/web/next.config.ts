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
  serverExternalPackages: ['@prisma/client', '@jobmatch/queue', 'bullmq'],
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
