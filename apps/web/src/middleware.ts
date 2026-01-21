import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'ko', 'ja', 'zh'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export const config = {
  // Match only actual page routes, exclude all static assets and API
  // IMPORTANT: This prevents middleware from blocking static file requests
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - api (API routes)
     * - favicon.ico, favicon.svg, icon.*, apple-icon.* (favicons)
     * - manifest.json, sw.js, workbox-*.js (PWA files)
     * - Any file with an extension (e.g., .js, .css, .png, .jpg, etc.)
     */
    '/((?!_next/static|_next/image|api|favicon|icon|apple-icon|manifest|sw\\.js|workbox|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot|json|xml|txt)$).*)',
  ],
};
