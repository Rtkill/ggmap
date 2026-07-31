import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ translated: '' });
    }

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=th&tl=en&dt=t&q=${encodeURIComponent(text.trim())}`;
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ translated: '' });
    }

    const data = await res.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      return NextResponse.json({ translated: '' });
    }

    const translatedParts = data[0]
      .map((segment: any) => (Array.isArray(segment) ? segment[0] : ''))
      .filter(Boolean);

    const translated = translatedParts.join(' ').trim();
    return NextResponse.json({ translated });
  } catch (err) {
    console.error('Server translation API error:', err);
    return NextResponse.json({ translated: '' });
  }
}
