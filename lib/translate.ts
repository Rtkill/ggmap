/**
 * 100% Free Google Translate helper (Thai -> English) via server-side API route.
 * Prevents any browser CORS or "Load failed" errors.
 */
export async function translateThaiToEnglish(text: string): Promise<string> {
  if (!text || !text.trim()) return '';

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim() }),
    });

    if (!res.ok) return '';
    const data = await res.json();
    return data.translated || '';
  } catch (err) {
    console.error('Translation error:', err);
    return '';
  }
}
