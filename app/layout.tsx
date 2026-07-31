import type { Metadata, Viewport } from 'next';
import { Prompt, Outfit, Noto_Sans_Thai } from 'next/font/google';
import 'leaflet/dist/leaflet.css';
import './globals.css';

const promptFont = Prompt({
  subsets: ['latin', 'thai'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-prompt',
  display: 'swap',
});

const outfitFont = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
});

const notoSansThaiFont = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-noto-sans-thai',
  display: 'swap',
});

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
    <html
      lang="th"
      className={`${promptFont.variable} ${outfitFont.variable} ${notoSansThaiFont.variable}`}
    >
      <head>
        <link rel="icon" href="/logo-optimized.png" type="image/png" sizes="any" />
        <link rel="apple-touch-icon" href="/logo-optimized.png" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body className={promptFont.className}>
        {children}
      </body>
    </html>
  );
}
