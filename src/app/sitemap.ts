import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const lastModified = new Date();

  // These are the actual served (canonical) paths. Locale-prefixed paths like
  // /en or /ur redirect here via middleware, so they aren't listed.
  const paths = [
    '/',
    '/income',
    '/expense',
    '/shop',
    '/donations',
    '/ramadan',
    '/fitrah',
    '/projects',
    '/gallery'
  ];

  return paths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified
  }));
}
