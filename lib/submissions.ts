import { Submission, SubmissionStatus } from '@/types/place';

const USE_MOCK = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === '';
const LOCAL_STORAGE_KEY = 'gg_user_submissions_v1';

async function getSupabase() {
  if (USE_MOCK) return null;
  const { supabase } = await import('./supabase');
  return supabase;
}

// Initial Mock Submissions if empty in localStorage
const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: 'sub-mock-1',
    place_name: 'ร้านต้มยำกุ้งโบราณ ตลาดพลู',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    google_maps_url: 'https://www.google.com/maps/@13.7198,100.4789,17z',
    status: 'pending',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'sub-mock-2',
    place_name: 'คาเฟ่ลับย่านอารีย์ Ari Special Blend',
    video_url: 'https://www.tiktok.com/@example/video/1234567890',
    google_maps_url: 'https://www.google.com/maps/place/13.7801,100.5402',
    status: 'pending',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

function getLocalSubmissions(): Submission[] {
  if (typeof window === 'undefined') return MOCK_SUBMISSIONS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(MOCK_SUBMISSIONS));
      return MOCK_SUBMISSIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse local submissions', e);
    return MOCK_SUBMISSIONS;
  }
}

function saveLocalSubmissions(subs: Submission[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(subs));
  } catch (e) {
    console.error('Failed to save local submissions', e);
  }
}

export async function createSubmission(payload: {
  video_url?: string;
  place_name?: string;
  google_maps_url?: string;
}): Promise<{ success: boolean; data?: Submission; error?: string }> {
  const video_url = payload.video_url?.trim() || undefined;
  const place_name = payload.place_name?.trim() || undefined;
  const google_maps_url = payload.google_maps_url?.trim() || undefined;

  if (!video_url && !place_name && !google_maps_url) {
    return { success: false, error: 'กรุณากรอกข้อมูลอย่างน้อย 1 ช่อง (ลิงก์วิดีโอ, ชื่อสถานที่ หรือ ลิงก์แผนที่)' };
  }

  const supabase = await getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('submissions')
      .insert([
        {
          video_url,
          place_name,
          google_maps_url,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (error) {
      console.warn('Supabase insert submission error, saving locally fallback:', error.message);
    } else if (data) {
      return { success: true, data: data as Submission };
    }
  }

  // Local fallback
  const newSub: Submission = {
    id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    video_url,
    place_name,
    google_maps_url,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  const list = getLocalSubmissions();
  list.unshift(newSub);
  saveLocalSubmissions(list);

  return { success: true, data: newSub };
}

export async function getSubmissions(): Promise<Submission[]> {
  const supabase = await getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data as Submission[];
    }
    console.warn('Supabase getSubmissions error, using local fallback:', error?.message);
  }

  return getLocalSubmissions();
}

export async function updateSubmissionStatus(
  id: string,
  status: SubmissionStatus,
  note?: string
): Promise<boolean> {
  const supabase = await getSupabase();
  if (supabase) {
    const { error } = await supabase
      .from('submissions')
      .update({ status, note })
      .eq('id', id);

    if (!error) return true;
    console.warn('Supabase updateSubmissionStatus error:', error.message);
  }

  // Local fallback
  const list = getLocalSubmissions();
  const index = list.findIndex((s) => s.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], status, note };
    saveLocalSubmissions(list);
    return true;
  }
  return false;
}

export async function deleteSubmission(id: string): Promise<boolean> {
  const supabase = await getSupabase();
  if (supabase) {
    const { error } = await supabase.from('submissions').delete().eq('id', id);
    if (!error) return true;
  }

  const list = getLocalSubmissions();
  const updated = list.filter((s) => s.id !== id);
  saveLocalSubmissions(updated);
  return true;
}

/**
 * Auto-extract Latitude & Longitude from Google Maps URL formats
 */
export function parseLatLngFromGoogleMapsUrl(url?: string): { lat: number; lng: number } | null {
  if (!url) return null;
  const decoded = decodeURIComponent(url);

  // 1. Check for @lat,lng format e.g. /@13.756331,100.501765,15z
  const atMatch = decoded.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  // 2. Check for !3dlat!4dlng format (Directions/Embed URLs)
  const dMatch = decoded.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (dMatch) {
    const lat = parseFloat(dMatch[1]);
    const lng = parseFloat(dMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  // 3. Check for q=lat,lng or ll=lat,lng format
  const qMatch = decoded.match(/(?:q|ll|search|point)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  // 4. Check for standalone lat,lng pair in path or query
  const pairMatch = decoded.match(/(-?\d{1,2}\.\d{4,}),\s*(-?\d{1,3}\.\d{4,})/);
  if (pairMatch) {
    const lat = parseFloat(pairMatch[1]);
    const lng = parseFloat(pairMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  return null;
}

/**
 * Helper to convert video URLs to embeddable URLs (YouTube, etc.)
 */
export function getVideoEmbedUrl(url?: string): { embedUrl: string | null; platform: 'youtube' | 'tiktok' | 'instagram' | 'other' } {
  if (!url) return { embedUrl: null, platform: 'other' };

  // YouTube match
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return {
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`,
      platform: 'youtube',
    };
  }

  // TikTok
  if (url.includes('tiktok.com')) {
    return { embedUrl: null, platform: 'tiktok' };
  }

  // Instagram
  if (url.includes('instagram.com')) {
    return { embedUrl: null, platform: 'instagram' };
  }

  return { embedUrl: null, platform: 'other' };
}
