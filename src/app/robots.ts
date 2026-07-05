import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/auth/', '/api/', '/profile/', '/settings/', '/favorites/', '/reviews/'],
    },
    sitemap: 'https://myfunhive.com/sitemap.xml',
  }
}
