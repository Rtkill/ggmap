import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const cleanUrl = url.trim();

    // Check if it already contains video ID
    const videoIdMatch = cleanUrl.match(/video\/(\d+)/);
    if (videoIdMatch) {
      return NextResponse.json({ videoId: videoIdMatch[1], resolvedUrl: cleanUrl });
    }

    // Follow redirect to resolve short links like vt.tiktok.com / vm.tiktok.com / v.tiktok.com
    const res = await fetch(cleanUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      },
    });

    const finalUrl = res.url;
    const finalMatch = finalUrl.match(/video\/(\d+)/);

    if (finalMatch) {
      return NextResponse.json({ videoId: finalMatch[1], resolvedUrl: finalUrl });
    }

    // Fallback: try fetching text and searching for video id pattern
    const html = await res.text();
    const htmlMatch = html.match(/"videoId":"(\d+)"/) || html.match(/video\/(\d+)/);
    if (htmlMatch) {
      return NextResponse.json({ videoId: htmlMatch[1], resolvedUrl: finalUrl });
    }

    return NextResponse.json({ error: 'Could not resolve TikTok video ID' }, { status: 404 });
  } catch (err: any) {
    console.error('Error resolving TikTok short link:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
