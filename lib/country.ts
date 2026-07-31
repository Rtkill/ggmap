/**
 * Dynamic helper to detect the country of a given coordinate.
 * Uses bounding boxes for common travel destinations, ensuring instant client-side performance.
 */
export function getCountryFromLatLng(lat: number, lng: number): string {
  // Thailand: Lat 5 to 21, Lng 97 to 106
  if (lat >= 5 && lat <= 21 && lng >= 97 && lng <= 106) {
    return 'Thailand';
  }
  // Japan: Lat 24 to 46, Lng 122 to 146
  if (lat >= 24 && lat <= 46 && lng >= 122 && lng <= 146) {
    return 'Japan';
  }
  // Singapore: Lat 1 to 1.5, Lng 103.5 to 104.5
  if (lat >= 1.0 && lat <= 1.5 && lng >= 103.5 && lng <= 104.5) {
    return 'Singapore';
  }
  // South Korea: Lat 33 to 39, Lng 124 to 131
  if (lat >= 33 && lat <= 39 && lng >= 124 && lng <= 131) {
    return 'South Korea';
  }
  // USA: Lat 24 to 49, Lng -125 to -66
  if (lat >= 24 && lat <= 49 && lng >= -125 && lng <= -66) {
    return 'United States';
  }
  // United Kingdom: Lat 49 to 61, Lng -9 to 2
  if (lat >= 49 && lat <= 61 && lng >= -9 && lng <= 2) {
    return 'United Kingdom';
  }
  // China: Lat 18 to 54, Lng 73 to 135 (excluding Taiwan/Japan overlapping lat/lng specificity if needed)
  if (lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135) {
    if (lat >= 21.5 && lat <= 25.5 && lng >= 119 && lng <= 122.5) {
      return 'Taiwan';
    }
    return 'China';
  }
  // Taiwan: Lat 21.5 to 25.5, Lng 119 to 122.5
  if (lat >= 21.5 && lat <= 25.5 && lng >= 119 && lng <= 122.5) {
    return 'Taiwan';
  }
  // Australia: Lat -44 to -10, Lng 112 to 154
  if (lat >= -44 && lat <= -10 && lng >= 112 && lng <= 154) {
    return 'Australia';
  }

  // Germany: Lat 47 to 55, Lng 5.8 to 15.0
  if (lat >= 47 && lat <= 55 && lng >= 5.8 && lng <= 15.0) {
    return 'Germany';
  }
  // France: Lat 41 to 51, Lng -5 to 10
  if (lat >= 41 && lat <= 51 && lng >= -5 && lng <= 10) {
    return 'France';
  }
  // Italy: Lat 36 to 47, Lng 6 to 19
  if (lat >= 36 && lat <= 47 && lng >= 6 && lng <= 19) {
    return 'Italy';
  }
  // Spain: Lat 36 to 44, Lng -9 to 4
  if (lat >= 36 && lat <= 44 && lng >= -9 && lng <= 4) {
    return 'Spain';
  }
  // Switzerland: Lat 45.8 to 47.8, Lng 5.9 to 10.5
  if (lat >= 45.8 && lat <= 47.8 && lng >= 5.9 && lng <= 10.5) {
    return 'Switzerland';
  }
  // Netherlands: Lat 50.7 to 53.5, Lng 3.3 to 7.2
  if (lat >= 50.7 && lat <= 53.5 && lng >= 3.3 && lng <= 7.2) {
    return 'Netherlands';
  }
  // Austria: Lat 46.3 to 49.0, Lng 9.5 to 17.2
  if (lat >= 46.3 && lat <= 49.0 && lng >= 9.5 && lng <= 17.2) {
    return 'Austria';
  }
  // Europe (General): Lat 35 to 71, Lng -10 to 40
  if (lat >= 35 && lat <= 71 && lng >= -10 && lng <= 40) {
    return 'Europe';
  }

  return 'Other';
}

/**
 * Extracts country name directly from Google Place address_components if available.
 */
export function getCountryFromGoogleData(googleData: any): string {
  if (!googleData || !Array.isArray(googleData.address_components)) return '';
  const countryComp = googleData.address_components.find(
    (comp: any) => comp.types && comp.types.includes('country')
  );
  return countryComp?.long_name || '';
}

/**
 * Best helper for place country resolution: prefers Google Places country name if available, falls back to lat/lng bounding box.
 */
export function getCountryForPlace(lat: number, lng: number, googleData?: any): string {
  const googleCountry = getCountryFromGoogleData(googleData);
  if (googleCountry) return googleCountry;
  return getCountryFromLatLng(lat, lng);
}

/**
 * Returns the matching flag emoji for a country name.
 */
export function getCountryFlag(country: string): string {
  switch (country) {
    case 'Thailand':
      return '🇹🇭';
    case 'China':
      return '🇨🇳';
    case 'Japan':
      return '🇯🇵';
    case 'Singapore':
      return '🇸🇬';
    case 'South Korea':
      return '🇰🇷';
    case 'United States':
      return '🇺🇸';
    case 'United Kingdom':
      return '🇬🇧';
    case 'Taiwan':
      return '🇹🇼';
    case 'Australia':
      return '🇦🇺';
    case 'Italy':
      return '🇮🇹';
    case 'France':
      return '🇫🇷';
    case 'Germany':
      return '🇩🇪';
    case 'Spain':
      return '🇪🇸';
    case 'Netherlands':
      return '🇳🇱';
    case 'Switzerland':
      return '🇨🇭';
    case 'Austria':
      return '🇦🇹';
    case 'Portugal':
      return '🇵🇹';
    case 'Belgium':
      return '🇧🇪';
    case 'Greece':
      return '🇬🇷';
    case 'Europe':
      return '🇪🇺';
    case 'Vietnam':
      return '🇻🇳';
    case 'Malaysia':
      return '🇲🇾';
    case 'Indonesia':
      return '🇮🇩';
    case 'Philippines':
      return '🇵🇭';
    case 'Hong Kong':
      return '🇭🇰';
    case 'India':
      return '🇮🇳';
    case 'Canada':
      return '🇨🇦';
    case 'New Zealand':
      return '🇳🇿';
    default:
      return '📍';
  }
}

const THAI_PROVINCE_MAP: Record<string, string> = {
  // Bangkok & Metropolitan
  'กรุงเทพมหานคร': 'Bangkok',
  'กรุงเทพฯ': 'Bangkok',
  'กรุงเทพ': 'Bangkok',
  'Bangkok Metropolis': 'Bangkok',
  'Krung Thep Maha Nakhon': 'Bangkok',
  'Krung Thep': 'Bangkok',
  'ปทุมธานี': 'Pathum Thani',
  'นนทบุรี': 'Nonthaburi',
  'สมุทรปราการ': 'Samut Prakan',
  'สมุทรสาคร': 'Samut Sakhon',
  'สมุทรสงคราม': 'Samut Songkhram',
  'นครปฐม': 'Nakhon Pathom',

  // Central & East
  'ชลบุรี': 'Chon Buri',
  'Chonburi': 'Chon Buri',
  'ระยอง': 'Rayong',
  'จันทบุรี': 'Chanthaburi',
  'ตราด': 'Trat',
  'ฉะเชิงเทรา': 'Chachoengsao',
  'พระนครศรีอยุธยา': 'Phra Nakhon Si Ayutthaya',
  'อยุธยา': 'Phra Nakhon Si Ayutthaya',
  'Ayutthaya': 'Phra Nakhon Si Ayutthaya',
  'สระบุรี': 'Saraburi',
  'ลพบุรี': 'Lopburi',
  'สิงห์บุรี': 'Sing Buri',
  'ชัยนาท': 'Chai Nat',
  'อ่างทอง': 'Ang Thong',
  'สุพรรณบุรี': 'Suphan Buri',
  'นครนายก': 'Nakhon Nayok',
  'ปราจีนบุรี': 'Prachinburi',
  'สระแก้ว': 'Sa Kaeo',

  // North
  'เชียงใหม่': 'Chiang Mai',
  'Chiangmai': 'Chiang Mai',
  'เชียงราย': 'Chiang Rai',
  'ลำปาง': 'Lampang',
  'ลำพูน': 'Lamphun',
  'แม่ฮ่องสอน': 'Mae Hong Son',
  'น่าน': 'Nan',
  'แพร่': 'Phrae',
  'พะเยา': 'Phayao',
  'พิษณุโลก': 'Phitsanulok',
  'สุโขทัย': 'Sukhothai',
  'ตาก': 'Tak',
  'เพชรบูรณ์': 'Phetchabun',
  'พิจิตร': 'Phichit',
  'กำแพงเพชร': 'Kamphaeng Phet',
  'นครสวรรค์': 'Nakhon Sawan',
  'อุตรดิตถ์': 'Uttaradit',
  'อุทัยธานี': 'Uthai Thani',

  // Northeast (Isan)
  'นครพนม': 'Nakhon Phanom',
  'ขอนแก่น': 'Khon Kaen',
  'อุดรธานี': 'Udon Thani',
  'นครราชสีมา': 'Nakhon Ratchasima',
  'โคราช': 'Nakhon Ratchasima',
  'อุบลราชธานี': 'Ubon Ratchathani',
  'บุรีรัมย์': 'Buriram',
  'สุรินทร์': 'Surin',
  'ศรีสะเกษ': 'Sisaket',
  'ร้อยเอ็ด': 'Roi Et',
  'มหาสารคาม': 'Maha Sarakham',
  'กาฬสินธุ์': 'Kalasin',
  'สกลนคร': 'Sakon Nakhon',
  'เลย': 'Loei',
  'หนองคาย': 'Nong Khai',
  'หนองบัวลำภู': 'Nong Bua Lamphu',
  'บึงกาฬ': 'Bueng Kan',
  'มุกดาหาร': 'Mukdahan',
  'ยโสธร': 'Yasothon',
  'อำนาจเจริญ': 'Amnat Charoen',
  'ชัยภูมิ': 'Chaiyaphum',

  // South
  'ภูเก็ต': 'Phuket',
  'กระบี่': 'Krabi',
  'สุราษฎร์ธานี': 'Surat Thani',
  'สงขลา': 'Songkhla',
  'ชุมพร': 'Chumphon',
  'ระนอง': 'Ranong',
  'พังงา': 'Phang Nga',
  'ตรัง': 'Trang',
  'พัทลุง': 'Phatthalung',
  'สตูล': 'Satun',
  'ปัตตานี': 'Pattani',
  'ยะลา': 'Yala',
  'นราธิวาส': 'Narathiwat',

  // West
  'กาญจนบุรี': 'Kanchanaburi',
  'ราชบุรี': 'Ratchaburi',
  'เพชรบุรี': 'Phetchaburi',
  'ประจวบคีรีขันธ์': 'Prachuap Khiri Khan',
};

const OVERSEAS_CITY_MAP: Record<string, string> = {
  // Germany
  'München': 'Munich',
  'Munchen': 'Munich',
  'Köln': 'Cologne',
  'Nürnberg': 'Nuremberg',

  // Italy
  'Milano': 'Milan',
  'Roma': 'Rome',
  'Venezia': 'Venice',
  'Firenze': 'Florence',
  'Napoli': 'Naples',
  'Torino': 'Turin',

  // Japan
  'Tokyo-to': 'Tokyo',
  'Osaka-fu': 'Osaka',
  'Kyoto-fu': 'Kyoto',

  // Austria / Czech / Spain / Portugal
  'Wien': 'Vienna',
  'Praha': 'Prague',
  'Warszawa': 'Warsaw',
  'Lisboa': 'Lisbon',
  'Sevilla': 'Seville',
};

export function normalizeProvinceName(rawProv: string): string {
  if (!rawProv) return '';
  let cleaned = rawProv.trim();
  cleaned = cleaned.replace(/^(Chang Wat|จังหวัด)\s*/i, '');

  if (THAI_PROVINCE_MAP[cleaned]) {
    return THAI_PROVINCE_MAP[cleaned];
  }

  if (OVERSEAS_CITY_MAP[cleaned]) {
    return OVERSEAS_CITY_MAP[cleaned];
  }

  const lower = cleaned.toLowerCase();
  for (const [key, val] of Object.entries(THAI_PROVINCE_MAP)) {
    if (key.toLowerCase() === lower) {
      return val;
    }
  }

  for (const [key, val] of Object.entries(OVERSEAS_CITY_MAP)) {
    if (key.toLowerCase() === lower) {
      return val;
    }
  }

  return cleaned;
}

/**
 * Dynamic helper to extract the province/city name from synced Google Places data.
 * For overseas places, prioritizes 'locality' (e.g. Milan instead of Lombardia region).
 * For Thailand, uses 'administrative_area_level_1' (province).
 */
export function getProvinceFromGoogleData(googleData: any): string {
  if (!googleData) return '';

  let provStr = '';

  if (Array.isArray(googleData.address_components)) {
    const countryComp = googleData.address_components.find(
      (comp: any) => comp.types && comp.types.includes('country')
    );
    const countryName = countryComp?.long_name || '';

    // For overseas locations, prefer 'locality' (e.g. Milan / Tokyo / Paris)
    if (countryName && countryName !== 'Thailand') {
      const localityComp = googleData.address_components.find(
        (comp: any) => comp.types && comp.types.includes('locality')
      );
      if (localityComp && localityComp.long_name) {
        provStr = localityComp.long_name;
      }
    }

    // Fallback or Thailand: check 'administrative_area_level_1'
    if (!provStr) {
      const provinceComp = googleData.address_components.find(
        (comp: any) => comp.types && comp.types.includes('administrative_area_level_1')
      );
      if (provinceComp && provinceComp.long_name) {
        provStr = provinceComp.long_name;
      }
    }
  }

  // Fallback to parsing from formatted_address if long_name wasn't found
  if (!provStr && googleData.formatted_address) {
    const addr = googleData.formatted_address;
    const thaiProvMatch = addr.match(/(?:จังหวัด|จ\.)\s*([ก-๙\s]+?)(?:\s+\d{5}|$|,)/);
    if (thaiProvMatch && thaiProvMatch[1]) {
      provStr = thaiProvMatch[1].trim();
    }
  }

  if (!provStr && typeof googleData.vicinity === 'string') {
    const thaiProvMatch = googleData.vicinity.match(/(?:จังหวัด|จ\.)\s*([ก-๙\s]+?)(?:\s+|$|,)/);
    if (thaiProvMatch && thaiProvMatch[1]) {
      provStr = thaiProvMatch[1].trim();
    }
  }

  return normalizeProvinceName(provStr);
}

export interface PriceRangeOption {
  label: string;
  description: string;
}

export const CURRENCY_PRICE_MAP: Record<string, PriceRangeOption[]> = {
  'Thailand': [
    { label: '฿1–200', description: 'ราคาประหยัด' },
    { label: '฿201–500', description: 'ราคากลาง' },
    { label: '฿501–1,000', description: 'ราคาสูง' },
    { label: '฿1,000+', description: 'หรูหรา' }
  ],
  'China': [
    { label: '¥1–40', description: 'ราคาประหยัด' },
    { label: '¥41–100', description: 'ราคากลาง' },
    { label: '¥101–300', description: 'ราคาสูง' },
    { label: '¥300+', description: 'หรูหรา' }
  ],
  'Japan': [
    { label: '¥1–1,000', description: 'ราคาประหยัด' },
    { label: '¥1,001–3,000', description: 'ราคากลาง' },
    { label: '¥3,001–10,000', description: 'ราคาสูง' },
    { label: '¥10,000+', description: 'หรูหรา' }
  ],
  'Singapore': [
    { label: 'S$1–15', description: 'ราคาประหยัด' },
    { label: 'S$16–35', description: 'ราคากลาง' },
    { label: 'S$36–100', description: 'ราคาสูง' },
    { label: 'S$100+', description: 'หรูหรา' }
  ],
  'South Korea': [
    { label: '₩1–10,000', description: 'ราคาประหยัด' },
    { label: '₩10,001–30,000', description: 'ราคากลาง' },
    { label: '₩30,001–100,000', description: 'ราคาสูง' },
    { label: '₩100,000+', description: 'หรูหรา' }
  ],
  'United States': [
    { label: '$1–15', description: 'ราคาประหยัด' },
    { label: '$16–35', description: 'ราคากลาง' },
    { label: '$36–100', description: 'ราคาสูง' },
    { label: '$100+', description: 'หรูหรา' }
  ],
  'United Kingdom': [
    { label: '£1–10', description: 'ราคาประหยัด' },
    { label: '£11–25', description: 'ราคากลาง' },
    { label: '£26–70', description: 'ราคาสูง' },
    { label: '£70+', description: 'หรูหรา' }
  ],
  'Taiwan': [
    { label: 'NT$1–150', description: 'ราคาประหยัด' },
    { label: 'NT$151–400', description: 'ราคากลาง' },
    { label: 'NT$401–1,000', description: 'ราคาสูง' },
    { label: 'NT$1,000+', description: 'หรูหรา' }
  ],
  'Australia': [
    { label: 'A$1–20', description: 'ราคาประหยัด' },
    { label: 'A$21–45', description: 'ราคากลาง' },
    { label: 'A$46–120', description: 'ราคาสูง' },
    { label: 'A$120+', description: 'หรูหรา' }
  ],
  'Italy': [
    { label: '€1–10', description: 'ราคาประหยัด' },
    { label: '€11–25', description: 'ราคากลาง' },
    { label: '€26–70', description: 'ราคาสูง' },
    { label: '€70+', description: 'หรูหรา' }
  ],
  'France': [
    { label: '€1–10', description: 'ราคาประหยัด' },
    { label: '€11–25', description: 'ราคากลาง' },
    { label: '€26–70', description: 'ราคาสูง' },
    { label: '€70+', description: 'หรูหรา' }
  ],
  'Germany': [
    { label: '€1–10', description: 'ราคาประหยัด' },
    { label: '€11–25', description: 'ราคากลาง' },
    { label: '€26–70', description: 'ราคาสูง' },
    { label: '€70+', description: 'หรูหรา' }
  ],
  'Spain': [
    { label: '€1–10', description: 'ราคาประหยัด' },
    { label: '€11–25', description: 'ราคากลาง' },
    { label: '€26–70', description: 'ราคาสูง' },
    { label: '€70+', description: 'หรูหรา' }
  ],
  'Europe': [
    { label: '€1–10', description: 'ราคาประหยัด' },
    { label: '€11–25', description: 'ราคากลาง' },
    { label: '€26–70', description: 'ราคาสูง' },
    { label: '€70+', description: 'หรูหรา' }
  ]
};

export function getPriceRangesByCountry(country: string): PriceRangeOption[] {
  return CURRENCY_PRICE_MAP[country] || CURRENCY_PRICE_MAP['Thailand'];
}

export function mapPriceLevelToRange(priceLevel: number | undefined | null, country: string): string {
  const ranges = getPriceRangesByCountry(country);
  if (priceLevel === 0) return 'Free';
  if (priceLevel === 1) return ranges[0].label;
  if (priceLevel === 2) return ranges[1].label;
  if (priceLevel === 3) return ranges[2].label;
  if (priceLevel === 4) return ranges[3].label;
  return ranges[0].label;
}
