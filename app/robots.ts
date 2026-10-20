import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  return { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/ticket/', '/payment/'] },
    ...(base?.startsWith('https://') ? { sitemap: `${base}/sitemap.xml` } : {}) }
}
