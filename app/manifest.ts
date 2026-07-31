import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Grub & Gulp Around the World',
    short_name: 'Grub & Gulp',
    description: 'แผนที่รวบรวมและรีวิวร้านอาหาร/เครื่องดื่มรอบโลก',
    start_url: '/',
    display: 'standalone',
    background_color: '#18131d',
    theme_color: '#18131d',
    orientation: 'portrait',
    icons: [
      {
        src: '/logo-optimized.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo-optimized.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo-optimized.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
