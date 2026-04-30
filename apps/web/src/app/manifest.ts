import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FigControl Copa 2026',
    short_name: 'FigControl',
    description: 'Controle sincronizado do album Panini FIFA World Cup 2026.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f4f7f2',
    theme_color: '#164f63',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any'
      }
    ]
  };
}
