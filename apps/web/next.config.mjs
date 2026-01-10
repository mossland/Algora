import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@algora/core'],
  experimental: {
    typedRoutes: true,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Reduce file watching to prevent EMFILE errors
      config.watchOptions = {
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
