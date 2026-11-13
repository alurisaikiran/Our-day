import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Our Days',
    short_name: 'Our Days',
    start_url: '/',
    display: 'standalone',
    background_color: '#F5F6FA',
    theme_color: '#BE3A64',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
