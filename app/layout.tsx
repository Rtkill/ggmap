import type { Metadata, Viewport } from 'next';
import './globals.css';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

export const metadata: Metadata = {
  title: 'Grub & Gulp Around the World',
  description:
    'แผนที่รวบรวมและรีวิวร้านอาหาร/เครื่องดื่มรอบโลก — ค้นพบประสบการณ์การกินที่น่าจดจำในทุกมุมโลก',
  keywords: ['ร้านอาหาร', 'รีวิว', 'แผนที่', 'food map', 'restaurant review', 'world food'],
  icons: {
    icon: '/logo-optimized.png',
    shortcut: '/logo-optimized.png',
    apple: '/logo-optimized.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Grub & Gulp',
  },
  openGraph: {
    title: 'Grub & Gulp Around the World 🌍',
    description: 'แผนที่รวบรวมและรีวิวร้านอาหาร/เครื่องดื่มรอบโลก',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#18131d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <link rel="icon" href="/logo-optimized.png" type="image/png" sizes="any" />
        <link rel="apple-touch-icon" href="/logo-optimized.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800&family=Prompt:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body>
        {children}
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
