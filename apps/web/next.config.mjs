import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@algora/core'],

  // Enable gzip compression
  compress: true,

  experimental: {
    typedRoutes: true,
    // Optimize package imports - reduces bundle size by ~10%
    optimizePackageImports: [
      'lucide-react',
      '@tanstack/react-query',
      'framer-motion',
    ],
  },

  // Static asset caching headers
  async headers() {
    return [
      {
        // Static assets - cache for 1 year (immutable)
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Images - cache for 1 week
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Fonts - cache for 1 year
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  webpack: (config, { dev }) => {
    if (dev) {
      // Reduce file watching to prevent EMFILE errors
      config.watchOptions = {
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/dist/**',
          '**/.turbo/**',
          '**/coverage/**',
          '**/*.log',
        ],
        poll: 2000,
        aggregateTimeout: 500,
      };
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
