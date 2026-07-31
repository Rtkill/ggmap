import { parseStringPromise } from 'xml2js';
import { Place } from '@/types/place';

interface KmlPlacemark {
  name?: string[];
  description?: string[];
  Point?: { coordinates?: string[] }[];
  ExtendedData?: {
    SchemaData?: {
      SimpleData?: { _: string; $: { name: string } }[];
    }[];
  }[];
}

export async function parseKML(kmlString: string): Promise<Omit<Place, 'id' | 'created_at'>[]> {
  const result = await parseStringPromise(kmlString, { explicitArray: true });
  const placemarks: KmlPlacemark[] =
    result?.kml?.Document?.[0]?.Folder?.[0]?.Placemark ||
    result?.kml?.Document?.[0]?.Placemark ||
    [];

  const places: Omit<Place, 'id' | 'created_at'>[] = [];

  for (const pm of placemarks) {
    const name = pm.name?.[0] ?? 'Unknown Place';
    const coordStr = pm.Point?.[0]?.coordinates?.[0]?.trim() ?? '';
    if (!coordStr) continue;

    const [lngStr, latStr] = coordStr.split(',');
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (isNaN(lat) || isNaN(lng)) continue;

    // Try to extract extended data
    const simpleData = pm.ExtendedData?.[0]?.SchemaData?.[0]?.SimpleData ?? [];
    const getField = (n: string) => simpleData.find((d) => d.$?.name === n)?._  ?? '';

    places.push({
      name,
      category: getField('category') || 'Restaurant',
      price_range: getField('price_range') || '$',
      rating: parseFloat(getField('rating')) || 0,
      personal_notes: getField('personal_notes') || pm.description?.[0] || '',
      lat,
      lng,
      google_maps_url: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      video_url: getField('video_url') || '',
    });
  }

  return places;
}

/**
 * Parse lat/lng from a Google Maps URL
 * Supports: maps.google.com/@lat,lng, /maps/place/..., ?q=lat,lng, etc.
 */
export function parseGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  // Format: @LAT,LNG or @LAT,LNG,Xz
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

  // Format: ?q=LAT,LNG or query=LAT,LNG
  const qMatch = url.match(/[?&](?:q|query)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

  // Format: /maps/place/.../data=...!3dLAT!4dLNG
  const dataMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (dataMatch) return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };

  return null;
}
