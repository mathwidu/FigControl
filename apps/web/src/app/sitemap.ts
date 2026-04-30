import type { MetadataRoute } from 'next';

const baseUrl = 'https://figcontrol.matheusduarte.dev.br';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    '',
    '/privacidade',
    '/termos',
    '/sobre'
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date('2026-04-30')
  }));
}
