import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getPlaceById } from '@/lib/places';
import { getCountryForPlace, getCountryFlag, getProvinceFromGoogleData } from '@/lib/country';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const place = await getPlaceById(id);

  if (!place) {
    return {
      title: 'Grub & Gulp Around the World 🌍',
      description: 'แผนที่รวบรวมและรีวิวร้านอาหาร/เครื่องดื่มรอบโลก',
    };
  }

  const country = getCountryForPlace(place.lat, place.lng, place.google_data);
  const flag = getCountryFlag(country);
  const province = getProvinceFromGoogleData(place.google_data);
  const location = province ? `${province}, ${country}` : country;

  const isNotVisited = Boolean(
    place.personal_notes &&
    (place.personal_notes.includes('ยังไม่ได้ไป') ||
     place.personal_notes.toLowerCase().includes('grub & gulp') ||
     place.personal_notes.toLowerCase().includes('grup & gulp'))
  );

  const scoreText = isNotVisited ? 'ยังไม่ได้ไป' : `👑 G&G Score ${place.rating.toFixed(2)}`;
  const title = `${place.name} (${flag} ${location}) — ${scoreText}`;
  const description = `ค้นหาพิกัด ${place.name} หมวดหมู่ ${place.category} ใน ${location} พร้อมรีวิว และแผนที่บน Grub & Gulp Around the World`;

  // Build OG image URL
  const ogParams = new URLSearchParams({
    name: place.name,
    category: place.category,
    country,
    province: province || '',
    rating: String(place.rating || 0),
    googleRating: String(place.google_data?.rating || 0),
    reviews: String(place.google_data?.user_ratings_total || 0),
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://grubandgulp.com';
  const ogImageUrl = `${baseUrl}/api/og/place?${ogParams.toString()}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}/place/${place.id}`,
      siteName: 'Grub & Gulp Around the World',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${place.name} G&G Score Card`,
        },
      ],
      locale: 'th_TH',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function PlaceSharePage({ params }: Props) {
  const { id } = await params;
  // Redirect visitor to home page with place selected in URL query
  redirect(`/?place=${id}`);
}
