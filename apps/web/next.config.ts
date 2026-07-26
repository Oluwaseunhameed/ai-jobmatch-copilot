import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@jobmatch/types',
    '@jobmatch/database',
    '@jobmatch/i18n',
    '@jobmatch/storage',
    '@jobmatch/queue',
    '@jobmatch/resume-parsing',
  ],
};

export default nextConfig;
