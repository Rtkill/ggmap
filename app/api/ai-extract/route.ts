import { NextRequest, NextResponse } from 'next/server';

// ─── Country helper ─────────────────────────────────────────────────────────

function getCountryFromGoogleData(googleData: any): string {
  if (!googleData || !Array.isArray(googleData.address_components)) return '';
  const countryComp = googleData.address_components.find(
    (comp: any) => comp.types && comp.types.includes('country')
  );
  return countryComp?.long_name || '';
}

// ─── oEmbed helpers ───────────────────────────────────────────────────────────

async function fetchTikTokCaption(url: string): Promise<string> {
  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  const res = await fetch(oembedUrl);
  if (!res.ok) throw new Error('TikTok oEmbed request failed');
  const data = await res.json();
  return data.title || '';
}

async function fetchYouTubeCaption(url: string): Promise<string> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const res = await fetch(oembedUrl);
  if (!res.ok) throw new Error('YouTube oEmbed request failed');
  const data = await res.json();
  return [data.title, data.author_name].filter(Boolean).join(' — ');
}

async function fetchGenericCaption(url: string): Promise<string> {
  const oembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(url)}`;
  const res = await fetch(oembedUrl);
  if (!res.ok) throw new Error('oEmbed request failed');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return [data.title, data.author_name].filter(Boolean).join(' — ');
}

function detectPlatform(url: string): 'tiktok' | 'youtube' | 'other' {
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  return 'other';
}

async function fetchCaption(url: string): Promise<string> {
  const platform = detectPlatform(url);
  switch (platform) {
    case 'tiktok':
      return fetchTikTokCaption(url);
    case 'youtube':
      return fetchYouTubeCaption(url);
    default:
      return fetchGenericCaption(url);
  }
}

// ─── Smart Local Text Parser (Extract shop name & address for domestic/overseas) ─

const OVERSEAS_LOCATION_MAP: Record<string, string> = {
  // Germany
  'มิวนิค': 'Munich Germany',
  'มิวนิก': 'Munich Germany',
  'บาวาเรีย': 'Bavaria Germany',
  'เบอร์ลิน': 'Berlin Germany',
  'แฟรงก์เฟิร์ต': 'Frankfurt Germany',
  'เยอรมัน': 'Germany',
  'เยอรมนี': 'Germany',
  'germany': 'Germany',
  'munich': 'Munich Germany',

  // Japan
  'โตเกียว': 'Tokyo Japan',
  'โอซาก้า': 'Osaka Japan',
  'เกียวโต': 'Kyoto Japan',
  'ฟุกุโอกะ': 'Fukuoka Japan',
  'ซัปโปโร': 'Sapporo Japan',
  'ญี่ปุ่น': 'Japan',
  'tokyo': 'Tokyo Japan',
  'osaka': 'Osaka Japan',
  'kyoto': 'Kyoto Japan',
  'japan': 'Japan',

  // Korea
  'โซล': 'Seoul Korea',
  'ปูซาน': 'Busan Korea',
  'เชจู': 'Jeju Korea',
  'เกาหลี': 'Korea',
  'seoul': 'Seoul Korea',
  'korea': 'Korea',

  // Italy
  'มิลาน': 'Milan Italy',
  'โรม': 'Rome Italy',
  'เวนิส': 'Venice Italy',
  'ฟลอเรนซ์': 'Florence Italy',
  'อิตาลี': 'Italy',
  'milan': 'Milan Italy',
  'italy': 'Italy',

  // France
  'ปารีส': 'Paris France',
  'ฝรั่งเศส': 'France',
  'paris': 'Paris France',
  'france': 'France',

  // UK
  'ลอนดอน': 'London UK',
  'อังกฤษ': 'UK',
  'london': 'London UK',
  'uk': 'UK',

  // US
  'นิวยอร์ก': 'New York USA',
  'ลอสแอนเจลิส': 'Los Angeles USA',
  'ซานฟราน': 'San Francisco USA',
  'อเมริกา': 'USA',
  'usa': 'USA',

  // Other popular destinations
  'ไทเป': 'Taipei Taiwan',
  'ไต้หวัน': 'Taiwan',
  'taiwan': 'Taiwan',
  'สิงคโปร์': 'Singapore',
  'singapore': 'Singapore',
  'ฮ่องกง': 'Hong Kong',
  'hong kong': 'Hong Kong',
  'เวียดนาม': 'Vietnam',
  'โฮจิมินห์': 'Ho Chi Minh Vietnam',
  'ฮานอย': 'Hanoi Vietnam',
  'vietnam': 'Vietnam',
};

const THAI_LOCATION_KEYWORDS = [
  'กรุงเทพ', 'กทม', 'bangkok', 'เชียงใหม่', 'เชียงราย', 'ภูเก็ต', 'พัทยา', 'หัวหิน',
  'ชลบุรี', 'ระยอง', 'จันทบุรี', 'ตราด', 'ฉะเชิงเทรา', 'อยุธยา', 'ปทุมธานี', 'นนทบุรี',
  'สมุทรปราการ', 'สมุทรสาคร', 'สมุทรสงคราม', 'นครปฐม', 'สระบุรี', 'มวกเหล็ก', 'โคราช',
  'นครราชสีมา', 'ขอนแก่น', 'อุดรธานี', 'อุบลราชธานี', 'หาดใหญ่', 'สงขลา', 'สุราษฎร์',
  'เกาะสมุย', 'กระบี่', 'ตรัง', 'พังงา', 'น่าน', 'แพร่', 'ลำปาง', 'ลำพูน', 'แม่ฮ่องสอน',
  'พิษณุโลก', 'สุโขทัย', 'ตาก', 'กาญจนบุรี', 'ราชบุรี', 'เพชรบุรี', 'สีลม', 'สุขุมวิท',
  'อารีย์', 'สามย่าน', 'เอกมัย', 'ทองหล่อ', 'ลาดพร้าว', 'บางนา', 'อุดมสุข', 'อ่อนนุช',
  'ห้วยขวาง', 'รัชดา', 'อโศก', 'สยาม', 'เยาวราช', 'พระราม2', 'พระราม3', 'พระราม9', 'ปิ่นเกล้า'
];

function smartExtractQueries(caption: string): { primaryQuery: string; fallbackQueries: string[]; overseasContext: string } {
  const queries: string[] = [];

  // Clean leading pins/prefix words like "📍ร้าน ", "📍คาเฟ่ ", "📍พิกัด ", "📍ที่อยู่ "
  let prep = caption.trim()
    .replace(/^[\s📍📌🚩🗺️✨🔥]*ร้านอาหาร\s*/i, '')
    .replace(/^[\s📍📌🚩🗺️✨🔥]*ร้านก๋วยเตี๋ยว\s*/i, '')
    .replace(/^[\s📍📌🚩🗺️✨🔥]*ร้าน\s*/i, '')
    .replace(/^[\s📍📌🚩🗺️✨🔥]*คาเฟ่\s*/i, '')
    .replace(/^[\s📍📌🚩🗺️✨🔥]*พิกัดร้าน?\s*/i, '')
    .replace(/^[\s📍📌🚩🗺️✨🔥]*ที่อยู่\s*/i, '')
    .replace(/^[\s📍📌🚩🗺️✨🔥]+/u, '');

  // Clean emojis & control characters for text processing
  let cleaned = prep.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ');

  // 1. Detect overseas location keywords
  const detectedOverseas: string[] = [];
  for (const [thaiKeyword, englishLoc] of Object.entries(OVERSEAS_LOCATION_MAP)) {
    if (caption.toLowerCase().includes(thaiKeyword.toLowerCase())) {
      detectedOverseas.push(englishLoc);
    }
  }
  const overseasContext = Array.from(new Set(detectedOverseas)).join(' ');

  // 2. Detect Thai location keywords
  const detectedThaiLocations: string[] = [];
  for (const kw of THAI_LOCATION_KEYWORDS) {
    if (caption.includes(kw)) {
      detectedThaiLocations.push(kw);
    }
  }
  const thaiLocContext = Array.from(new Set(detectedThaiLocations)).join(' ');

  // 3. Extract exact title part before description/opening hours/emoji/hashtag delimiters
  const firstTitleSegment = prep.split(/[\u{1F300}-\u{1FAFF}\n📍#⏰✅]|(?:\s+(?:เปิด|ปิด|เวลา|ทุกวัน|สาขา|โทร|พิกัด|แถว|ย่าน|ใกล้|ตรงข้าม|ข้าง|ซอย|ถนน|ใน|คือ|เป็น|อร่อย|ไม่อวย))/u)[0].trim();

  // If first segment contains English/Latin characters, treat as main foreign shop name
  let englishTitle = '';
  if (/[a-zA-Z]/.test(firstTitleSegment)) {
    englishTitle = firstTitleSegment.replace(/[^\w\s'&\.-]/g, '').trim();
  }

  // Thai title phrase
  let thaiTitlePhrase = '';
  if (/[ก-๙]/.test(firstTitleSegment)) {
    thaiTitlePhrase = firstTitleSegment.trim();
  }

  // 4. Extract real address line if present (Filter out promos & opening hours)
  const addressMatch = caption.match(/(?:📍|ที่อยู่|address)\s*:?\s*([^\n#]+)/i);
  let realAddress = '';
  if (addressMatch) {
    const rawAddr = addressMatch[1].trim();
    if (!/บ้านนี้|ติดตาม|พิกัด|ช่อง|เพจ|หมีดุ|กูรู|รีวิว|อร่อย|สายกิน|เปิดทุกวัน|⏰|✅/i.test(rawAddr)) {
      realAddress = rawAddr;
    }
  }

  // 5. Extract Hashtags
  const hashtags = (caption.match(/#[^\s#]+/g) || []).map(h => h.replace('#', ''));
  const englishHashtags = hashtags.filter(h => /^[a-zA-Z0-9_]+$/.test(h) && h.length > 2 && !['vegan', 'food', 'tiktok', 'fyp', 'viral', 'review', 'yummy', 'cafe'].includes(h.toLowerCase()));
  const shopHashtag = hashtags.find(h => h.includes('ร้าน') || h.includes('ก๋วยเตี๋ยว') || h.includes('เตี๋ยว'));

  // Construct queries in order of precision:

  // Query 2: English Title + Overseas Location Context (e.g. "Cafe Frischhut Munich Germany")
  if (englishTitle && overseasContext) {
    queries.push(`${englishTitle} ${overseasContext}`);
  }

  // Query 3: Thai Title Phrase + Thai Location Context (e.g. "เตี๋ยวไล้เหลี่ยว เชียงราย")
  if (thaiTitlePhrase && thaiLocContext) {
    queries.push(`${thaiTitlePhrase} ${thaiLocContext}`);
  }

  // Query 4: Thai Title Phrase alone (e.g. "เตี๋ยวไล้เหลี่ยว")
  if (thaiTitlePhrase && thaiTitlePhrase.length >= 3) {
    queries.push(thaiTitlePhrase);
  }

  // Query 5: Real Address alone
  if (realAddress) {
    queries.push(realAddress);
  }

  // Query 6: English Title + English Hashtags
  if (englishTitle && englishHashtags.length > 0) {
    queries.push(`${englishTitle} ${englishHashtags.slice(0, 2).join(' ')}`);
  }

  // Query 7: English Title alone
  if (englishTitle) {
    queries.push(englishTitle);
  }

  // Query 8: Specific Shop Hashtag (e.g. "ร้านก๋วยเตี๋ยวเชียงราย")
  if (shopHashtag) {
    queries.push(shopHashtag);
  }

  const uniqueQueries = Array.from(new Set(queries.map(q => q.trim()).filter(q => q.length >= 2)));

  return {
    primaryQuery: uniqueQueries[0] || cleaned.slice(0, 40).trim(),
    fallbackQueries: uniqueQueries.slice(1),
    overseasContext,
  };
}

// ─── Google Places search ─────────────────────────────────────────────────────

async function searchGooglePlaces(query: string, apiKey: string) {
  const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();

  if (searchData.status !== 'OK' || !searchData.results?.length) {
    return null;
  }

  const placeId = searchData.results[0].place_id;

  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,formatted_phone_number,website,formatted_address,address_components,opening_hours,reviews,price_level,editorial_summary,types,geometry,dine_in,takeout,delivery,curbside_pickup,reservable,serves_beer,serves_wine,serves_breakfast,serves_brunch,serves_lunch,serves_dinner,serves_vegetarian_food,wheelchair_accessible_entrance,url,place_id&key=${apiKey}&language=en`;
  const detailsRes = await fetch(detailsUrl);
  const detailsData = await detailsRes.json();

  if (detailsData.status !== 'OK' || !detailsData.result) {
    return null;
  }

  return detailsData.result;
}

// ─── Main POST handler ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, manualName } = body;

    const placesKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

    if (!placesKey) {
      return NextResponse.json(
        { success: false, error: 'Google Places API key is not configured.' },
        { status: 500 }
      );
    }

    // ─── Mode 1: Manual search ─────────────
    if (manualName) {
      const placeDetails = await searchGooglePlaces(manualName, placesKey);
      if (!placeDetails) {
        return NextResponse.json(
          { success: false, error: `ไม่พบร้าน "${manualName}" ใน Google Maps` },
          { status: 404 }
        );
      }

      const lat = placeDetails.geometry?.location?.lat;
      const lng = placeDetails.geometry?.location?.lng;

      return NextResponse.json({
        success: true,
        fallback: false,
        data: {
          name: placeDetails.name,
          lat,
          lng,
          rating: placeDetails.rating,
          price_level: placeDetails.price_level,
          maps_url: placeDetails.url || (placeDetails.place_id ? `https://www.google.com/maps/place/?q=place_id:${placeDetails.place_id}` : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`),
          summary: 'Grub & Gulp ยังไม่ได้ไป',
          video_url: url || '',
          google_data: {
            ...placeDetails,
            google_rating: placeDetails.rating,
          },
        },
      });
    }

    // ─── Mode 2: Auto Extract via Caption & Google Places ───────────────
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุ URL ของคลิปวิดีโอ' },
        { status: 400 }
      );
    }

    // 1. Fetch caption from oEmbed
    let caption = '';
    try {
      caption = await fetchCaption(url);
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        error: `ไม่สามารถดึงข้อมูลจากลิงก์ได้: ${err.message}`,
        fallback: true,
        ai_caption: '',
      });
    }

    if (!caption) {
      return NextResponse.json({
        success: false,
        fallback: true,
        ai_caption: '',
        error: 'ไม่พบข้อความ Caption จากคลิปนี้ กรุณาพิมพ์ชื่อร้านด้านล่าง',
      });
    }

    // 2. Smart Extract queries for both domestic & overseas places
    const { primaryQuery, fallbackQueries, overseasContext } = smartExtractQueries(caption);
    const candidateQueries = [primaryQuery, ...fallbackQueries];

    let placeDetails: any = null;
    let successfulQuery = '';

    for (const q of candidateQueries) {
      if (!q) continue;
      const res = await searchGooglePlaces(q, placesKey);
      if (res) {
        const types: string[] = res.types || [];
        const isGenericLocality = (types.includes('locality') || types.includes('political') || types.includes('administrative_area_level_1') || types.includes('country')) &&
          !types.includes('restaurant') && !types.includes('cafe') && !types.includes('food') && !types.includes('store') && !types.includes('point_of_interest');
        const isCityNameOnly = ['Milan', 'Milano', 'Rome', 'Roma', 'Thailand', 'Bangkok', 'Germany', 'Munich', 'München'].includes(res.name?.trim());

        if (isGenericLocality || isCityNameOnly) {
          continue; // Skip city-level fallback pins, keep searching for actual business place
        }

        // If caption contains overseas context (e.g. Milan/Germany/Japan), reject any Thai results
        if (overseasContext) {
          const resCountry = getCountryFromGoogleData(res);
          if (resCountry === 'Thailand') {
            continue;
          }
        }

        placeDetails = res;
        successfulQuery = q;
        break;
      }
    }

    if (!placeDetails) {
      return NextResponse.json({
        success: false,
        fallback: true,
        ai_caption: caption,
        ai_extraction: { restaurant_name: primaryQuery !== caption.slice(0, 40) ? primaryQuery : '' },
        error: `⚠️ ใน Caption ของคลิปนี้ไม่ได้เขียนระบุชื่อร้านเอาไว้แบบชัดเจน กรุณาพิมพ์ชื่อร้านที่ต้องการ (เช่น Cioccolatitaliani Milan) ด้านล่างแล้วกดค้นหาได้ทันที`,
      });
    }

    const lat = placeDetails.geometry?.location?.lat;
    const lng = placeDetails.geometry?.location?.lng;

    return NextResponse.json({
      success: true,
      fallback: false,
      data: {
        name: placeDetails.name,
        lat,
        lng,
        rating: placeDetails.rating,
        price_level: placeDetails.price_level,
        maps_url: placeDetails.url || (placeDetails.place_id ? `https://www.google.com/maps/place/?q=place_id:${placeDetails.place_id}` : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`),
        summary: 'Grub & Gulp ยังไม่ได้ไป',
        video_url: url,
        google_data: {
          ...placeDetails,
          google_rating: placeDetails.rating,
        },
        ai_caption: caption,
      },
    });
  } catch (error: any) {
    console.error('Error in AI Extract endpoint:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
