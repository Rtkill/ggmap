import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'GrubGulpMapApp/1.0 (contact@grubgulp.com)',
          'Accept-Language': 'th,en;q=0.9',
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch from geocoder' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Geocoding proxy API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
