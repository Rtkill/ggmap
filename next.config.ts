import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Allow embedding iframes from video platforms
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.youtube.com https://www.tiktok.com https://www.instagram.com",
              "frame-src 'self' https://www.youtube.com https://www.tiktok.com https://www.instagram.com",
              "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://*.supabase.co https://*.arcgisonline.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co https://*.supabase.io wss://*.supabase.co",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
