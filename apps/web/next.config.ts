import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@jobmatch/types', '@jobmatch/database', '@jobmatch/i18n'],
};

export default nextConfig;
