/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  distDir: process.env.LIPS_BUILD_DIR || '.next',
  async headers() {
    return [
      { source: '/:path*', headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
      ] },
      ...['/admin/:path*', '/ticket/:path*', '/payment/:path*', '/api/tickets/:path*'].map(source => ({ source, headers: [
        { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        // HTML form POSTs need their Origin for admin CSRF validation.
        // same-origin preserves it while withholding referrers from other sites.
        { key: 'Referrer-Policy', value: source === '/admin/:path*' ? 'same-origin' : 'no-referrer' },
        { key: 'Cache-Control', value: 'private, no-store' },
      ] })),
    ]
  },
};
export default nextConfig;
