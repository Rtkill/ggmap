import { Place, DbCategory, DbPriceRange } from '@/types/place';
import { MOCK_PLACES } from './mockData';
import { getCountryFromLatLng, mapPriceLevelToRange } from './country';

const USE_MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === '';

// Dynamic import to avoid SSR issues
async function getSupabase() {
  if (USE_MOCK) return null;
  const { supabase } = await import('./supabase');
  return supabase;
}

export async function getPlaces(): Promise<Place[]> {
  const supabase = await getSupabase();
  if (!supabase) return MOCK_PLACES;

  const { data, error } = await supabase
    .from('places')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Supabase places table query error. Falling back to local places:', error.message);
    return MOCK_PLACES;
  }
  const placesData = data as Place[];
  return placesData.map((p) => {
    // Prefer unrounded gg_score from google_data if available, otherwise use p.rating
    let rawRating = typeof p.rating === 'number' ? p.rating : 0;
    if (p.google_data && typeof p.google_data.gg_score === 'number' && p.google_data.gg_score > 0) {
      rawRating = p.google_data.gg_score;
    }
    const finalRating = rawRating > 5 ? Number((rawRating / 2).toFixed(2)) : Number(rawRating.toFixed(2));
    const isBuffet = Boolean(p.is_buffet || p.google_data?.is_buffet || p.category === 'Buffet');
    return {
      ...p,
      rating: finalRating,
      is_buffet: isBuffet,
    };
  });
}

export async function getPlaceById(id: string): Promise<Place | null> {
  const places = await getPlaces();
  return places.find((p) => String(p.id) === String(id)) || null;
}

export function normalizeName(name?: string): string {
  if (!name) return '';
  return name.toLowerCase().replace(/[^\w\u0E00-\u0E7F]/g, '').trim();
}

export function extractCidFromUrl(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/[\?&](?:cid|ftid)=([^&]+)/);
  return match ? match[1] : null;
}

export function checkDuplicatePlace(
  newPlace: { name: string; google_maps_url?: string; lat?: number; lng?: number; google_data?: any },
  existingPlaces: Place[],
  currentEditId?: string
): Place | null {
  const normNewName = normalizeName(newPlace.name);
  const newPlaceId = newPlace.google_data?.place_id || newPlace.google_data?.id;
  const newCid = extractCidFromUrl(newPlace.google_maps_url);
  const newUrl = newPlace.google_maps_url ? newPlace.google_maps_url.trim().toLowerCase() : '';

  if (!normNewName && !newPlaceId && !newCid && !newUrl) return null;

  for (const p of existingPlaces) {
    if (currentEditId && String(p.id) === String(currentEditId)) continue;

    const normPName = normalizeName(p.name);

    // 1. Strict Name Match (Case-insensitive & punctuation-insensitive)
    if (normNewName && normPName && normNewName === normPName) {
      return p;
    }

    // 2. Google Place ID Match
    const pId = p.google_data?.place_id || p.google_data?.id;
    if (newPlaceId && pId && String(newPlaceId) === String(pId)) {
      return p;
    }

    // 3. Google CID Match
    const pCid = extractCidFromUrl(p.google_maps_url);
    if (newCid && pCid && newCid === pCid) {
      return p;
    }

    // 4. Exact Google Maps URL Match
    if (newUrl && p.google_maps_url && p.google_maps_url.trim().toLowerCase() === newUrl) {
      return p;
    }

    // 5. Name inclusion + Proximity (< 1km)
    if (normNewName && normPName && (normNewName.includes(normPName) || normPName.includes(normNewName))) {
      if (newPlace.lat && newPlace.lng && p.lat && p.lng) {
        const distKm = Math.hypot(p.lat - newPlace.lat, p.lng - newPlace.lng) * 111;
        if (distKm < 1.0) {
          return p;
        }
      }
    }
  }

  return null;
}

export async function insertPlace(place: Omit<Place, 'id' | 'created_at'>): Promise<Place | null> {
  const supabase = await getSupabase();
  if (!supabase) {
    // Mock insert
    const newPlace: Place = {
      ...place,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    MOCK_PLACES.push(newPlace);
    return newPlace;
  }

  // Strict check for duplicate place before inserting
  const existingPlaces = await getPlaces();
  const dup = checkDuplicatePlace(place, existingPlaces);
  if (dup) {
    console.warn('Duplicate place insertion blocked:', place.name, 'Matches existing:', dup.name);
    return null;
  }

  const insertPayload: any = {
    ...place,
    google_data: {
      ...(place.google_data || {}),
      is_buffet: Boolean(place.is_buffet),
    },
  };

  let { data, error } = await supabase
    .from('places')
    .insert([insertPayload])
    .select()
    .single();

  if (error && insertPayload.is_buffet !== undefined) {
    const fallbackPayload = { ...insertPayload };
    delete fallbackPayload.is_buffet;
    const retry = await supabase
      .from('places')
      .insert([fallbackPayload])
      .select()
      .single();

    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error('Error inserting place:', error);
    return null;
  }
  return data as Place;
}

export async function batchInsertPlaces(places: Omit<Place, 'id' | 'created_at'>[]): Promise<number> {
  const supabase = await getSupabase();
  if (!supabase) {
    places.forEach((p) => {
      MOCK_PLACES.push({ ...p, id: crypto.randomUUID(), created_at: new Date().toISOString() });
    });
    return places.length;
  }

  const { data, error } = await supabase.from('places').insert(places).select();
  if (error) {
    console.error('Error batch inserting places:', error);
    return 0;
  }
  return data?.length ?? 0;
}

export async function updatePlace(
  id: string,
  place: Partial<Omit<Place, 'id' | 'created_at'>>
): Promise<Place | null> {
  const supabase = await getSupabase();
  if (!supabase) {
    const idx = MOCK_PLACES.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    MOCK_PLACES[idx] = { ...MOCK_PLACES[idx], ...place } as Place;
    return MOCK_PLACES[idx];
  }

  const updatePayload: any = { ...place };
  if (updatePayload.google_data || updatePayload.is_buffet !== undefined) {
    updatePayload.google_data = {
      ...(updatePayload.google_data || {}),
      is_buffet: Boolean(updatePayload.is_buffet),
    };
  }

  let { data, error } = await supabase
    .from('places')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error && updatePayload.is_buffet !== undefined) {
    const fallbackPayload = { ...updatePayload };
    delete fallbackPayload.is_buffet;
    const retry = await supabase
      .from('places')
      .update(fallbackPayload)
      .eq('id', id)
      .select()
      .single();

    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error('Error updating place:', error);
    return null;
  }
  return data as Place;
}

export async function deletePlace(id: string): Promise<boolean> {
  const supabase = await getSupabase();
  if (!supabase) {
    const idx = MOCK_PLACES.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    MOCK_PLACES.splice(idx, 1);
    return true;
  }

  const { error } = await supabase
    .from('places')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting place:', error);
    return false;
  }
  return true;
}

// =============================================
// Dynamic Categories & Price Ranges Fallbacks
// =============================================
let MOCK_CATEGORIES: DbCategory[] = [];
let MOCK_PRICES: DbPriceRange[] = [];

function initializeMockData() {
  if (typeof window !== 'undefined') {
    const storedCats = localStorage.getItem('gg_categories');
    if (storedCats) {
      MOCK_CATEGORIES = JSON.parse(storedCats);
    } else {
      MOCK_CATEGORIES = [
        { id: 'cat-1', name: 'Buffet', color: '#E26D5C', emoji: '🍱' },
        { id: 'cat-2', name: 'Fine Dining', color: '#8E7DBE', emoji: '🍽️' },
        { id: 'cat-3', name: 'Street Food', color: '#FAAD14', emoji: '🌮' },
        { id: 'cat-4', name: 'Bar & Cafe', color: '#5C80BC', emoji: '☕' },
        { id: 'cat-5', name: 'Sea Food', color: '#4CB9A8', emoji: '🦞' },
        { id: 'cat-6', name: 'Restaurant', color: '#C84B31', emoji: '🍜' },
      ];
      localStorage.setItem('gg_categories', JSON.stringify(MOCK_CATEGORIES));
    }

    const storedPrices = localStorage.getItem('gg_prices');
    if (storedPrices) {
      MOCK_PRICES = JSON.parse(storedPrices);
    } else {
      MOCK_PRICES = [
        { id: 'pr-1', label: '$', description: 'ประหยัด' },
        { id: 'pr-2', label: '$$', description: 'กลาง' },
        { id: 'pr-3', label: '$$$', description: 'สูง' },
      ];
      localStorage.setItem('gg_prices', JSON.stringify(MOCK_PRICES));
    }
  } else {
    MOCK_CATEGORIES = [
      { id: 'cat-1', name: 'Buffet', color: '#E26D5C', emoji: '🍱' },
      { id: 'cat-2', name: 'Fine Dining', color: '#8E7DBE', emoji: '🍽️' },
      { id: 'cat-3', name: 'Street Food', color: '#FAAD14', emoji: '🌮' },
      { id: 'cat-4', name: 'Bar & Cafe', color: '#5C80BC', emoji: '☕' },
      { id: 'cat-5', name: 'Sea Food', color: '#4CB9A8', emoji: '🦞' },
      { id: 'cat-6', name: 'Restaurant', color: '#C84B31', emoji: '🍜' },
    ];
    MOCK_PRICES = [
      { id: 'pr-1', label: '$', description: 'ประหยัด' },
      { id: 'pr-2', label: '$$', description: 'กลาง' },
      { id: 'pr-3', label: '$$$', description: 'สูง' },
    ];
  }
}

// Run initializers
initializeMockData();

function saveMockData() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('gg_categories', JSON.stringify(MOCK_CATEGORIES));
    localStorage.setItem('gg_prices', JSON.stringify(MOCK_PRICES));
  }
}

// =============================================
// Categories CRUD
// =============================================
export async function getCategories(): Promise<DbCategory[]> {
  const supabase = await getSupabase();
  if (!supabase) {
    initializeMockData();
    return MOCK_CATEGORIES;
  }

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.warn('Supabase categories table query error. Falling back to local categories:', error.message);
    return MOCK_CATEGORIES;
  }
  return data as DbCategory[];
}

export async function insertCategory(category: Omit<DbCategory, 'id'>): Promise<DbCategory | null> {
  const supabase = await getSupabase();
  if (!supabase) {
    const newCat: DbCategory = {
      ...category,
      id: 'cat-' + crypto.randomUUID(),
    };
    MOCK_CATEGORIES.push(newCat);
    saveMockData();
    return newCat;
  }

  const { data, error } = await supabase
    .from('categories')
    .insert([category])
    .select()
    .single();

  if (error) {
    console.error('Error inserting category:', error);
    return null;
  }
  return data as DbCategory;
}

export async function updateCategory(id: string, category: Partial<Omit<DbCategory, 'id'>>): Promise<DbCategory | null> {
  const supabase = await getSupabase();
  if (!supabase) {
    const idx = MOCK_CATEGORIES.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    MOCK_CATEGORIES[idx] = { ...MOCK_CATEGORIES[idx], ...category } as DbCategory;
    saveMockData();
    return MOCK_CATEGORIES[idx];
  }

  const { data, error } = await supabase
    .from('categories')
    .update(category)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating category:', error);
    return null;
  }
  return data as DbCategory;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const supabase = await getSupabase();
  if (!supabase) {
    const idx = MOCK_CATEGORIES.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    MOCK_CATEGORIES.splice(idx, 1);
    saveMockData();
    return true;
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting category:', error);
    return false;
  }
  return true;
}

// =============================================
// Price Ranges CRUD
// =============================================
export async function getPriceRanges(): Promise<DbPriceRange[]> {
  const supabase = await getSupabase();
  if (!supabase) {
    initializeMockData();
    return MOCK_PRICES;
  }

  const { data, error } = await supabase
    .from('price_ranges')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('Supabase price_ranges table query error. Falling back to local price ranges:', error.message);
    return MOCK_PRICES;
  }
  return data as DbPriceRange[];
}

export async function insertPriceRange(priceRange: Omit<DbPriceRange, 'id'>): Promise<DbPriceRange | null> {
  const supabase = await getSupabase();
  if (!supabase) {
    const newPrice: DbPriceRange = {
      ...priceRange,
      id: 'pr-' + crypto.randomUUID(),
    };
    MOCK_PRICES.push(newPrice);
    saveMockData();
    return newPrice;
  }

  const { data, error } = await supabase
    .from('price_ranges')
    .insert([priceRange])
    .select()
    .single();

  if (error) {
    console.error('Error inserting price range:', error);
    return null;
  }
  return data as DbPriceRange;
}

export async function updatePriceRange(id: string, priceRange: Partial<Omit<DbPriceRange, 'id'>>): Promise<DbPriceRange | null> {
  const supabase = await getSupabase();
  if (!supabase) {
    const idx = MOCK_PRICES.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    MOCK_PRICES[idx] = { ...MOCK_PRICES[idx], ...priceRange } as DbPriceRange;
    saveMockData();
    return MOCK_PRICES[idx];
  }

  const { data, error } = await supabase
    .from('price_ranges')
    .update(priceRange)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating price range:', error);
    return null;
  }
  return data as DbPriceRange;
}

export async function deletePriceRange(id: string): Promise<boolean> {
  const supabase = await getSupabase();
  if (!supabase) {
    const idx = MOCK_PRICES.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    MOCK_PRICES.splice(idx, 1);
    saveMockData();
    return true;
  }

  const { error } = await supabase
    .from('price_ranges')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting price range:', error);
    return false;
  }
  return true;
}

// =============================================
// Retrospective Sync Place Details with Google
// =============================================
export async function syncPlaceGoogleData(id: string, mapsUrl: string, name: string): Promise<Place | null> {
  try {
    const res = await fetch('/api/places/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapsUrl, name }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to query Places API');
    }

    const payload = await res.json();
    if (!payload.success) {
      throw new Error(payload.error || 'Sync failed');
    }

    // Build fields to update
    const updatePayload: Partial<Omit<Place, 'id' | 'created_at'>> = {
      google_data: payload,
    };

    // Update coordinates if available to ensure pin alignment
    let activeLat = payload.geometry?.location?.lat;
    let activeLng = payload.geometry?.location?.lng;
    if (activeLat) {
      updatePayload.lat = activeLat;
      updatePayload.lng = activeLng;
    }

    // Auto-map price range from price_level based on detected country
    if (typeof payload.price_level === 'number') {
      const latToCheck = activeLat || 13.0;
      const lngToCheck = activeLng || 100.0;
      const country = getCountryFromLatLng(latToCheck, lngToCheck);
      updatePayload.price_range = mapPriceLevelToRange(payload.price_level, country);
    }

    // Save to DB
    return await updatePlace(id, updatePayload);
  } catch (error: any) {
    console.error(`Failed to sync Google Places details for place ${id}:`, error);
    return null;
  }
}
