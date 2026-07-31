import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Fallback emoji maps
const CATEGORY_EMOJIS: Record<string, string> = {
  'BBQ': '🍖',
  'Bar': '🍸',
  'Buffet': '🍱',
  'Cafe': '☕',
  'Dessert': '🍰',
  'Dim Sum': '🥟',
  'Noodle': '🍜',
  'Pizza': '🍕',
  'Restaurant': '🍽️',
  'Sea Food': '🦞',
  'Sushi': '🍣',
  'Fine Dining': '🥂',
  'Street Food': '🌮',
  'Bar & Cafe': '☕',
  'All': '🗺️',
};

const COUNTRY_FLAGS: Record<string, string> = {
  'Thailand': '🇹🇭',
  'Japan': '🇯🇵',
  'Singapore': '🇸🇬',
  'South Korea': '🇰🇷',
  'United States': '🇺🇸',
  'United Kingdom': '🇬🇧',
  'Taiwan': '🇹🇼',
  'Australia': '🇦🇺',
  'Italy': '🇮🇹',
  'France': '🇫🇷',
  'Germany': '🇩🇪',
  'Spain': '🇪🇸',
  'Netherlands': '🇳🇱',
  'Switzerland': '🇨🇭',
  'Austria': '🇦🇹',
  'China': '🇨🇳',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Extract parameters from URL
    const name = searchParams.get('name') || 'Grub & Gulp Place';
    const category = searchParams.get('category') || 'Restaurant';
    const country = searchParams.get('country') || 'Thailand';
    const province = searchParams.get('province') || '';
    const ratingRaw = searchParams.get('rating');
    const googleRatingRaw = searchParams.get('googleRating');
    const reviewsRaw = searchParams.get('reviews');

    const flag = COUNTRY_FLAGS[country] || '📍';
    const catEmoji = CATEGORY_EMOJIS[category] || '🍽️';

    const rating = ratingRaw ? parseFloat(ratingRaw) : 0;
    const googleRating = googleRatingRaw ? parseFloat(googleRatingRaw) : 0;
    const reviews = reviewsRaw ? parseInt(reviewsRaw) : 0;

    const isNotVisited = !rating || rating <= 0;
    const locationText = province ? `${province}, ${country}` : country;

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '48px 56px',
            background: 'linear-gradient(135deg, #16121f 0%, #0d0a14 50%, #1e1328 100%)',
            fontFamily: 'sans-serif',
            color: '#ffffff',
            position: 'relative',
          }}
        >
          {/* Background Glow Accents */}
          <div
            style={{
              position: 'absolute',
              top: '-100px',
              left: '-100px',
              width: '500px',
              height: '500px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 168, 0, 0.18), transparent 70%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-100px',
              right: '-100px',
              width: '500px',
              height: '500px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15), transparent 70%)',
            }}
          />

          {/* Top Brand Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  fontSize: '28px',
                  background: 'rgba(255, 168, 0, 0.15)',
                  border: '1px solid rgba(255, 168, 0, 0.3)',
                  borderRadius: '12px',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                🏆
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#ffa800', letterSpacing: '-0.3px' }}>
                  Grub & Gulp
                </span>
                <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '-2px' }}>
                  Around the World 🌍
                </span>
              </div>
            </div>

            {/* Category Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '20px',
                fontSize: '15px',
                fontWeight: 600,
                color: '#f8fafc',
              }}
            >
              <span>{catEmoji}</span>
              <span>{category}</span>
            </div>
          </div>

          {/* Center Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              margin: '24px 0',
              zIndex: 10,
            }}
          >
            {/* Location tag */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '18px',
                fontWeight: 600,
                color: '#cbd5e1',
              }}
            >
              <span>{flag}</span>
              <span>{locationText}</span>
            </div>

            {/* Place Title */}
            <div
              style={{
                fontSize: '44px',
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.15,
                letterSpacing: '-0.5px',
                display: '-webkit-box',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxHeight: '110px',
              }}
            >
              {name}
            </div>
          </div>

          {/* Bottom Scores Section */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              paddingTop: '20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              zIndex: 10,
            }}
          >
            {/* G&G Crown Score Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, rgba(255, 168, 0, 0.2), rgba(255, 140, 0, 0.1))',
                border: '1.5px solid rgba(255, 168, 0, 0.4)',
                borderRadius: '16px',
              }}
            >
              <span style={{ fontSize: '28px' }}>👑</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600, textTransform: 'uppercase' }}>
                  G&G Score
                </span>
                <span style={{ fontSize: '26px', fontWeight: 800, color: '#ffa800', lineHeight: 1.1 }}>
                  {isNotVisited ? 'ยังไม่ได้ไป' : `${rating.toFixed(2)} / 5.00`}
                </span>
              </div>
            </div>

            {/* Google Rating Badge */}
            {googleRating > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 24px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '16px',
                }}
              >
                <span style={{ fontSize: '26px' }}>⭐</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Google Maps
                  </span>
                  <span style={{ fontSize: '22px', fontWeight: 800, color: '#4285f4', lineHeight: 1.1 }}>
                    {googleRating.toFixed(1)} {reviews > 0 ? `(${reviews.toLocaleString()} รีวิว)` : ''}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (err: any) {
    console.error('OG Image generation error:', err);
    return new Response(`Failed to generate OG image`, { status: 500 });
  }
}
