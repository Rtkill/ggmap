import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { mapsUrl, name } = await req.json();
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Google Maps API key is not configured.' },
        { status: 500 }
      );
    }

    let queryText = name || '';

    // 1. Resolve short URL redirect and extract query text / CID from Google Maps link
    if (mapsUrl) {
      let resolvedUrl = mapsUrl;
      if (mapsUrl.includes('maps.app.goo.gl') || mapsUrl.includes('goo.gl/maps') || mapsUrl.includes('g.page')) {
        try {
          const headRes = await fetch(mapsUrl, { method: 'GET', redirect: 'follow' });
          resolvedUrl = headRes.url;
        } catch (e) {
          console.error('Error resolving Google Maps redirect:', e);
        }
      }

      // Check for Google CID parameter (e.g. ?cid=18104651792258836290)
      let cidParam: string | null = null;
      try {
        const urlObj = new URL(resolvedUrl);
        cidParam = urlObj.searchParams.get('cid') || urlObj.searchParams.get('ftid');
      } catch (e) {
        const cidMatch = resolvedUrl.match(/[\?&](?:cid|ftid)=([^&]+)/);
        if (cidMatch) cidParam = cidMatch[1];
      }

      if (cidParam) {
        // Direct CID fetch via Google Place Details API
        const cidDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?cid=${cidParam}&fields=place_id,name,rating,user_ratings_total,formatted_phone_number,website,formatted_address,address_components,opening_hours,reviews,price_level,editorial_summary,types,geometry,dine_in,takeout,delivery,curbside_pickup,reservable,serves_beer,serves_wine,serves_breakfast,serves_brunch,serves_lunch,serves_dinner,serves_vegetarian_food,wheelchair_accessible_entrance&key=${apiKey}&language=en`;
        try {
          const cidRes = await fetch(cidDetailsUrl);
          const cidData = await cidRes.json();
          if (cidData.status === 'OK' && cidData.result) {
            const result = cidData.result;
            return NextResponse.json({
              success: true,
              place_id: result.place_id,
              name: result.name,
              rating: result.rating,
              user_ratings_total: result.user_ratings_total,
              formatted_phone_number: result.formatted_phone_number,
              website: result.website,
              formatted_address: result.formatted_address,
              address_components: result.address_components,
              opening_hours: result.opening_hours,
              reviews: result.reviews,
              price_level: result.price_level,
              editorial_summary: result.editorial_summary,
              types: result.types,
              geometry: result.geometry,
              dine_in: result.dine_in,
              takeout: result.takeout,
              delivery: result.delivery,
              curbside_pickup: result.curbside_pickup,
              reservable: result.reservable,
              serves_beer: result.serves_beer,
              serves_wine: result.serves_wine,
              serves_breakfast: result.serves_breakfast,
              serves_brunch: result.serves_brunch,
              serves_lunch: result.serves_lunch,
              serves_dinner: result.serves_dinner,
              serves_vegetarian_food: result.serves_vegetarian_food,
              wheelchair_accessible_entrance: result.wheelchair_accessible_entrance,
            });
          }
        } catch (cidErr) {
          console.error('Error fetching by CID:', cidErr);
        }
      }

      // A. Try matching /place/NAME
      const placeMatch = resolvedUrl.match(/\/place\/([^\/|\?]+)/);
      if (placeMatch && placeMatch[1]) {
        queryText = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      } else {
        // B. Try matching /search/NAME
        const searchMatch = resolvedUrl.match(/\/search\/([^\/|\?]+)/);
        if (searchMatch && searchMatch[1]) {
          queryText = decodeURIComponent(searchMatch[1].replace(/\+/g, ' '));
        } else {
          // C. Try matching query parameter q or query
          try {
            const urlObj = new URL(resolvedUrl);
            const qParam = urlObj.searchParams.get('q') || urlObj.searchParams.get('query') || urlObj.searchParams.get('input');
            if (qParam) {
              queryText = qParam;
            }
          } catch (err) {
            // Failsafe simple regex match
            const qMatch = resolvedUrl.match(/[\?&](q|query|input)=([^&]+)/);
            if (qMatch && qMatch[2]) {
              queryText = decodeURIComponent(qMatch[2].replace(/\+/g, ' '));
            }
          }
        }
      }

      // D. If queryText is still empty, look for coordinates like @lat,lng
      if (!queryText) {
        const coordMatch = resolvedUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (coordMatch && coordMatch[1] && coordMatch[2]) {
          queryText = `${coordMatch[1]},${coordMatch[2]}`;
        }
      }
    }

    // E. Fallback check: if still empty, use name parameter passed from form
    if (!queryText && name) {
      queryText = name;
    }

    if (!queryText) {
      return NextResponse.json(
        { success: false, error: 'กรุณากรอกชื่อร้านในช่อง "ชื่อร้าน" ก่อนกดปุ่มดึงข้อมูล' },
        { status: 400 }
      );
    }

    // 2. Query Google Places Text Search to find the Place ID
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      queryText
    )}&key=${apiKey}`;

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (searchData.status !== 'OK' || !searchData.results || searchData.results.length === 0) {
      return NextResponse.json(
        { success: false, error: `ไม่พบข้อมูลร้านบน Google Places (Status: ${searchData.status || 'No results'})` },
        { status: 404 }
      );
    }

    const placeId = searchData.results[0].place_id;

    // 3. Fetch full Place Details in English
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,formatted_phone_number,website,formatted_address,address_components,opening_hours,reviews,price_level,editorial_summary,types,geometry,dine_in,takeout,delivery,curbside_pickup,reservable,serves_beer,serves_wine,serves_breakfast,serves_brunch,serves_lunch,serves_dinner,serves_vegetarian_food,wheelchair_accessible_entrance&key=${apiKey}&language=en`;

    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    if (detailsData.status !== 'OK' || !detailsData.result) {
      return NextResponse.json(
        { success: false, error: `ไม่สามารถดึงรายละเอียดร้านได้ (Status: ${detailsData.status})` },
        { status: 404 }
      );
    }

    const result = detailsData.result;

    return NextResponse.json({
      success: true,
      place_id: placeId,
      name: result.name,
      rating: result.rating,
      user_ratings_total: result.user_ratings_total,
      formatted_phone_number: result.formatted_phone_number,
      website: result.website,
      formatted_address: result.formatted_address,
      address_components: result.address_components,
      opening_hours: result.opening_hours,
      reviews: result.reviews,
      price_level: result.price_level,
      editorial_summary: result.editorial_summary,
      types: result.types,
      geometry: result.geometry,
      // Boolean amenities
      dine_in: result.dine_in,
      takeout: result.takeout,
      delivery: result.delivery,
      curbside_pickup: result.curbside_pickup,
      reservable: result.reservable,
      serves_beer: result.serves_beer,
      serves_wine: result.serves_wine,
      serves_breakfast: result.serves_breakfast,
      serves_brunch: result.serves_brunch,
      serves_lunch: result.serves_lunch,
      serves_dinner: result.serves_dinner,
      serves_vegetarian_food: result.serves_vegetarian_food,
      wheelchair_accessible_entrance: result.wheelchair_accessible_entrance,
    });
  } catch (error: any) {
    console.error('Error in Google Places sync endpoint:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
