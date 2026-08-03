'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Edit3, Upload, CheckCircle, AlertCircle, Loader2, MapPin, X, Search, Sparkles, Video } from 'lucide-react';
import { Place, DbCategory, DbPriceRange } from '@/types/place';
import { parseGoogleMapsUrl } from '@/lib/kmlParser';
import { getCountryFromLatLng, getCountryFromGoogleData, getPriceRangesByCountry, mapPriceLevelToRange } from '@/lib/country';

interface AdminFormProps {
  editPlace: Place | null;
  onPlaceAdded: () => void;
  onCancel?: () => void;
  onSelectEditPlace?: (place: Place) => void;
  allPlaces?: Place[];
}

interface FormData {
  name: string;
  category: string;
  price_range: string;
  rating: string;
  personal_notes: string;
  lat: string;
  lng: string;
  video_url: string;
  maps_link: string;
  is_buffet: boolean;
}

const EMPTY_FORM: FormData = {
  name: '',
  category: 'Restaurant',
  price_range: '฿1–200',
  rating: '',
  personal_notes: 'Grub & Gulp ยังไม่ได้ไป',
  lat: '',
  lng: '',
  video_url: '',
  maps_link: '',
  is_buffet: false,
};



function mapGoogleTypesToCategory(types: string[] = [], defaultCat = 'Restaurant'): string {
  if (!types || types.length === 0) return defaultCat;
  const tSet = new Set(types);
  if (tSet.has('cafe') || tSet.has('coffee_shop') || tSet.has('bar') || tSet.has('pub') || tSet.has('wine_bar') || tSet.has('night_club') || tSet.has('bakery') || tSet.has('dessert_shop') || tSet.has('ice_cream_shop')) {
    return 'Bar & Cafe';
  }
  if (tSet.has('buffet_restaurant')) {
    return 'Buffet';
  }
  if (tSet.has('fine_dining_restaurant')) {
    return 'Fine Dining';
  }
  if (tSet.has('seafood_restaurant')) {
    return 'Sea Food';
  }
  if (tSet.has('street_food') || tSet.has('meal_takeaway') || tSet.has('fast_food_restaurant') || tSet.has('diner')) {
    return 'Street Food';
  }
  return defaultCat;
}

export default function AdminForm({ editPlace, onPlaceAdded, onCancel, onSelectEditPlace, allPlaces }: AdminFormProps) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [kmlStatus, setKmlStatus] = useState<{ type: 'success' | 'error' | 'loading'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Existing places for duplicate check
  const [existingPlaces, setExistingPlaces] = useState<Place[]>(allPlaces || []);

  useEffect(() => {
    if (allPlaces && allPlaces.length > 0) {
      setExistingPlaces(allPlaces);
    } else {
      import('@/lib/places').then(({ getPlaces }) => {
        getPlaces().then((data) => setExistingPlaces(data || []));
      });
    }
  }, [allPlaces]);

  // Real-time Duplicate Place Detection
  const duplicatePlace = useMemo(() => {
    if (editPlace) return null; // Don't flag duplicate if editing that place
    if (existingPlaces.length === 0) return null;

    const currentPlaceId = googleData?.place_id || googleData?.id;
    const currentMapsUrl = form.maps_link ? form.maps_link.trim().toLowerCase() : '';
    const currentName = form.name ? form.name.trim().toLowerCase() : '';

    if (!currentPlaceId && !currentMapsUrl && !currentName) return null;

    for (const p of existingPlaces) {
      // 1. Match Google Place ID
      const pPlaceId = p.google_data?.place_id || p.google_data?.id;
      if (currentPlaceId && pPlaceId && currentPlaceId === pPlaceId) {
        return p;
      }

      // 2. Match Google Maps URL
      if (currentMapsUrl && p.google_maps_url) {
        const pUrl = p.google_maps_url.trim().toLowerCase();
        if (pUrl === currentMapsUrl) {
          return p;
        }
      }

      // 3. Match Name + Lat/Lng Proximity (within ~300m)
      if (currentName && p.name && p.name.trim().toLowerCase() === currentName) {
        const latVal = parseFloat(form.lat);
        const lngVal = parseFloat(form.lng);
        if (!isNaN(latVal) && !isNaN(lngVal) && p.lat && p.lng) {
          const distKm = Math.hypot(p.lat - latVal, p.lng - lngVal) * 111;
          if (distKm < 0.3) {
            return p;
          }
        }
      }
    }

    return null;
  }, [editPlace, existingPlaces, googleData, form.maps_link, form.name, form.lat, form.lng]);

  // Autocomplete states (Nominatim Geocoding API - free, zero setup)
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic categories
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [googleData, setGoogleData] = useState<any | null>(null);
  const [fetchingGoogle, setFetchingGoogle] = useState(false);
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);

  // AI Extract states
  const [aiUrl, setAiUrl] = useState('');
  const [aiExtracting, setAiExtracting] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ type: 'success' | 'error' | 'loading'; text: string } | null>(null);
  const [aiFallback, setAiFallback] = useState(false);
  const [aiCaption, setAiCaption] = useState('');
  const [aiFallbackName, setAiFallbackName] = useState('');
  const [customAbout, setCustomAbout] = useState<Record<string, string[]>>({
    popular_for: [],
    amenities: [],
    atmosphere: [],
    payments: [],
    parking: [],
  });

  // Get active price range options based on form lat/lng coordinates
  const formCountry = useMemo(() => {
    const latVal = parseFloat(form.lat);
    const lngVal = parseFloat(form.lng);
    if (!isNaN(latVal) && !isNaN(lngVal)) {
      return getCountryFromLatLng(latVal, lngVal);
    }
    return 'Thailand';
  }, [form.lat, form.lng]);

  const activePriceRanges = useMemo(() => {
    return getPriceRangesByCountry(formCountry);
  }, [formCountry]);

  // Ensure form.price_range is always populated with a valid option from activePriceRanges
  useEffect(() => {
    if (activePriceRanges.length === 0) return;
    const isCurrentValid = activePriceRanges.some((pr) => pr.label === form.price_range);
    if (!isCurrentValid) {
      const gPriceLevel = googleData?.price_level;
      const defaultPrice = mapPriceLevelToRange(gPriceLevel, formCountry);
      setForm((prev) => ({
        ...prev,
        price_range: defaultPrice,
      }));
    }
  }, [activePriceRanges, formCountry, googleData, form.price_range]);

  useEffect(() => {
    if (editPlace) {
      setForm({
        name: editPlace.name,
        category: editPlace.category,
        price_range: editPlace.price_range,
        rating: editPlace.rating.toString(),
        personal_notes: editPlace.personal_notes || '',
        lat: editPlace.lat.toString(),
        lng: editPlace.lng.toString(),
        video_url: editPlace.video_url || '',
        maps_link: editPlace.google_maps_url || '',
        is_buffet: editPlace.is_buffet || editPlace.category === 'Buffet' || false,
      });
      setGoogleData(editPlace.google_data || null);
      if (editPlace.google_data?.custom_about) {
        setCustomAbout(editPlace.google_data.custom_about);
      } else {
        setCustomAbout({
          popular_for: [],
          amenities: [],
          atmosphere: [],
          payments: [],
          parking: [],
        });
      }
    } else {
      setForm(EMPTY_FORM);
      setGoogleData(null);
      setCustomAbout({
        popular_for: [],
        amenities: [],
        atmosphere: [],
        payments: [],
        parking: [],
      });
    }
    setMessage(null);
    setMapSearchQuery('');
    setSearchResults([]);
    setIsAboutExpanded(false);
  }, [editPlace]);

  // Load options dynamically
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const { getCategories } = await import('@/lib/places');
        const cats = await getCategories();
        setCategories(cats);

        if (!editPlace && cats.length > 0) {
          setForm(prev => ({
            ...prev,
            category: cats[0].name,
            price_range: getPriceRangesByCountry('Thailand')[0].label,
          }));
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadOptions();
  }, [editPlace]);

  // Debounced geocoding search
  const handleMapSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setMapSearchQuery(query);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Geocoding search failed');
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error searching place:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 600);
  };

  const handleSelectSearchResult = (result: any) => {
    // Extract a shorter name for the restaurant
    const displayName = result.display_name;
    const shortName = result.address?.name || result.address?.restaurant || result.address?.cafe || displayName.split(',')[0];

    setForm((prev) => ({
      ...prev,
      name: prev.name || shortName,
      lat: result.lat,
      lng: result.lon,
      maps_link: `https://www.google.com/maps/search/?api=1&query=${result.lat},${result.lon}`,
    }));

    setSearchResults([]);
    setMapSearchQuery('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    // Auto-parse Google Maps URL (fallback if they paste link manually)
    if (name === 'maps_link' && value.includes('maps')) {
      const coords = parseGoogleMapsUrl(value);
      if (coords) {
        setForm((prev) => ({
          ...prev,
          maps_link: value,
          lat: coords.lat.toFixed(6),
          lng: coords.lng.toFixed(6),
        }));
      }
    }
  };

  // ─── AI Extract handler ──────────────────────────────────────────────────
  const handleAIExtract = async () => {
    if (!aiUrl.trim()) return;
    setAiExtracting(true);
    setAiStatus({ type: 'loading', text: '🔍 กำลังดึงข้อมูลจากคลิปและค้นหาใน Google Maps...' });
    setAiFallback(false);
    setAiCaption('');
    setAiFallbackName('');

    try {
      const res = await fetch('/api/ai-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: aiUrl.trim() }),
      });

      const result = await res.json();

      if (result.success && result.data) {
        const d = result.data;
        const latStr = d.lat?.toString() || '';
        const lngStr = d.lng?.toString() || '';
        const latNum = parseFloat(latStr);
        const lngNum = parseFloat(lngStr);

        // Detect country (prefer direct Google Place country component, fallback to Lat/Lng bounding box)
        const googleCountry = getCountryFromGoogleData(d.google_data);
        const country = googleCountry || ((!isNaN(latNum) && !isNaN(lngNum)) ? getCountryFromLatLng(latNum, lngNum) : 'Thailand');
        const mappedPrice = mapPriceLevelToRange(d.price_level, country);

        // Auto-detect category from Google Place types
        let autoCategory = d.category || '';
        if (!autoCategory || autoCategory === 'Restaurant') {
          const types: string[] = d.google_data?.types || [];
          autoCategory = mapGoogleTypesToCategory(types, 'Restaurant');
        }

        const ratingVal = typeof d.rating === 'number' ? d.rating.toString() : '';

        setForm((prev) => ({
          ...prev,
          name: d.name || prev.name,
          category: autoCategory || prev.category,
          price_range: mappedPrice,
          lat: latStr,
          lng: lngStr,
          maps_link: d.maps_url || prev.maps_link,
          rating: ratingVal || prev.rating,
          video_url: d.video_url || aiUrl.trim(),
          personal_notes: 'Grub & Gulp ยังไม่ได้ไป',
        }));

        if (d.google_data) {
          setGoogleData({
            ...d.google_data,
            google_rating: d.rating || d.google_data.rating,
          });
        }

        setAiStatus({
          type: 'success',
          text: `✅ ดึงข้อมูลร้าน "${d.name}" สำเร็จ! (คะแนน ${d.rating || '-'}⭐ | ราคา ${mappedPrice}) ตรวจสอบแล้วกดบันทึกได้เลย`,
        });
      } else if (result.fallback) {
        setAiFallback(true);
        setAiCaption(result.ai_caption || '');
        if (result.ai_extraction?.restaurant_name) {
          setAiFallbackName(result.ai_extraction.restaurant_name);
        }
        setAiStatus({ type: 'error', text: result.error || 'ไม่พบพิกัดร้าน กรุณาปรับแต่งชื่อร้านสั้นๆ ด้านล่างแล้วกดค้นหา' });
        setForm((prev) => ({ ...prev, video_url: aiUrl.trim(), personal_notes: 'Grub & Gulp ยังไม่ได้ไป' }));
      } else {
        setAiStatus({ type: 'error', text: result.error || 'เกิดข้อผิดพลาด' });
      }
    } catch (err: any) {
      console.error('AI Extract error:', err);
      setAiStatus({ type: 'error', text: `❌ ไม่สามารถเชื่อมต่อได้: ${err.message}` });
    } finally {
      setAiExtracting(false);
    }
  };

  const handleFallbackSearch = async () => {
    if (!aiFallbackName.trim()) return;
    setAiExtracting(true);
    setAiStatus({ type: 'loading', text: '🔍 กำลังค้นหาร้านจาก Google Maps...' });

    try {
      const res = await fetch('/api/ai-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualName: aiFallbackName.trim(), url: aiUrl.trim() }),
      });

      const result = await res.json();

      if (result.success && result.data) {
        const d = result.data;
        const latStr = d.lat?.toString() || '';
        const lngStr = d.lng?.toString() || '';
        const latNum = parseFloat(latStr);
        const lngNum = parseFloat(lngStr);

        const googleCountry = getCountryFromGoogleData(d.google_data);
        const country = googleCountry || ((!isNaN(latNum) && !isNaN(lngNum)) ? getCountryFromLatLng(latNum, lngNum) : 'Thailand');
        const mappedPrice = mapPriceLevelToRange(d.price_level, country);

        let autoCategory = d.category || '';
        if (!autoCategory || autoCategory === 'Restaurant') {
          const types: string[] = d.google_data?.types || [];
          autoCategory = mapGoogleTypesToCategory(types, 'Restaurant');
        }

        const ratingVal = typeof d.rating === 'number' ? d.rating.toString() : '';

        setForm((prev) => ({
          ...prev,
          name: d.name || prev.name,
          category: autoCategory || prev.category,
          price_range: mappedPrice,
          lat: latStr,
          lng: lngStr,
          maps_link: d.maps_url || prev.maps_link,
          rating: ratingVal || prev.rating,
          video_url: prev.video_url || aiUrl.trim(),
          personal_notes: 'Grub & Gulp ยังไม่ได้ไป',
        }));

        if (d.google_data) {
          setGoogleData({
            ...d.google_data,
            google_rating: d.rating || d.google_data.rating,
          });
        }

        setAiFallback(false);
        setAiStatus({
          type: 'success',
          text: `✅ พบร้าน "${d.name}" สำเร็จ! (คะแนน ${d.rating || '-'}⭐ | ราคา ${mappedPrice}) ตรวจสอบแล้วกดบันทึกได้เลย`,
        });
      } else {
        setAiStatus({ type: 'error', text: result.error || 'ไม่พบร้านนี้ใน Google Maps' });
      }
    } catch (err: any) {
      setAiStatus({ type: 'error', text: `❌ ค้นหาไม่สำเร็จ: ${err.message}` });
    } finally {
      setAiExtracting(false);
    }
  };

  const handleFetchGoogleDetails = async () => {
    if (!form.maps_link) return;
    setFetchingGoogle(true);
    setMessage(null);
    try {
      const res = await fetch('/api/places/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapsUrl: form.maps_link, name: form.name }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch details');
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Sync failed');
      }

      // Auto-fill coordinates, name, rating (only if not set yet), and price range
      setForm((prev) => {
        const latVal = data.geometry?.location?.lat;
        const lngVal = data.geometry?.location?.lng;
        const finalLat = latVal ? parseFloat(latVal.toString()) : parseFloat(prev.lat);
        const finalLng = lngVal ? parseFloat(lngVal.toString()) : parseFloat(prev.lng);

        const country = (!isNaN(finalLat) && !isNaN(finalLng))
          ? getCountryFromLatLng(finalLat, finalLng)
          : 'Thailand';

        const mappedPrice = mapPriceLevelToRange(data.price_level, country);

        return {
          ...prev,
          name: data.name || prev.name,
          rating: prev.rating,
          lat: latVal?.toString() || prev.lat,
          lng: lngVal?.toString() || prev.lng,
          price_range: mappedPrice,
        };
      });

      setGoogleData({
        ...data,
        google_rating: data.rating,
      });
      setMessage({ type: 'success', text: `✅ ดึงข้อมูลร้าน "${data.name}" และระดับราคาเรียบร้อยแล้ว!` });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: `❌ ดึงข้อมูลไม่สำเร็จ: ${err.message}` });
    } finally {
      setFetchingGoogle(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      setMessage({ type: 'error', text: 'กรุณากรอกชื่อร้าน' });
      return;
    }

    let latVal = parseFloat(form.lat);
    let lngVal = parseFloat(form.lng);

    // If coordinates aren't filled yet, try extracting from the Google Maps Link
    if (isNaN(latVal) || isNaN(lngVal)) {
      if (form.maps_link) {
        const coords = parseGoogleMapsUrl(form.maps_link);
        if (coords) {
          latVal = coords.lat;
          lngVal = coords.lng;
        } else {
          setMessage({ type: 'error', text: 'ไม่สามารถแยกพิกัดจาก Google Maps Link ได้ กรุณาลองค้นหาชื่อร้านในช่องด้านบนอีกครั้ง' });
          return;
        }
      } else {
        setMessage({ type: 'error', text: 'กรุณากรอกพิกัดโดยการค้นหาชื่อร้านในช่องค้นหาด้านบน หรือวางลิงก์ Google Maps' });
        return;
    if (duplicatePlace) {
      setMessage({
        type: 'error',
        text: `❌ ไม่สามารถปักหมุดซ้ำได้ เนื่องจากร้าน "${duplicatePlace.name}" มีอยู่ในระบบแล้ว สามารถคลิกปุ่ม "แก้ไขหมุดนี้แทน" เพื่อแก้ไขข้อมูลเดิมได้เลยครับ`,
      });
      return;
    }

    const submitCountry = getCountryFromLatLng(latVal, lngVal);
    const validRanges = getPriceRangesByCountry(submitCountry);
    let finalPriceRange = form.price_range;
    if (!finalPriceRange || !validRanges.some((pr) => pr.label === finalPriceRange)) {
      finalPriceRange = mapPriceLevelToRange(googleData?.price_level, submitCountry);
    }

    setSubmitting(true);
    setMessage(null);

    try {
      // Auto-resolve TikTok short links in form.video_url if present
      let finalVideoUrl = form.video_url;
      if (finalVideoUrl && /(?:vt|vm|v)\.tiktok\.com|tiktok\.com\/t\//i.test(finalVideoUrl)) {
        const urls = finalVideoUrl.split(',').map((u) => u.trim());
        const resolvedList = await Promise.all(
          urls.map(async (u) => {
            if (/(?:vt|vm|v)\.tiktok\.com|tiktok\.com\/t\//i.test(u)) {
              try {
                const res = await fetch('/api/resolve-tiktok', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: u }),
                });
                const data = await res.json();
                if (data.resolvedUrl) return data.resolvedUrl;
              } catch (e) {
                console.error(e);
              }
            }
            return u;
          })
        );
        finalVideoUrl = resolvedList.join(', ');
      }

      // Auto-translate personal notes (Thai -> English) if Thai text is present and not already translated
      let finalPersonalNotes = form.personal_notes ? form.personal_notes.trim() : '';
      if (finalPersonalNotes && /[ก-๙]/.test(finalPersonalNotes)) {
        const parts = finalPersonalNotes.split(/\n\s*\n/);
        const lastPart = parts[parts.length - 1];
        const hasEnglishInLastPart = /[a-zA-Z]{3,}/.test(lastPart) && !/[ก-๙]/.test(lastPart);
        if (!hasEnglishInLastPart && parts.length === 1) {
          const { translateThaiToEnglish } = await import('@/lib/translate');
          const translated = await translateThaiToEnglish(finalPersonalNotes);
          if (translated) {
            finalPersonalNotes = `${finalPersonalNotes}\n\n${translated}`;
          }
        }
      }

      const numRating = parseFloat(form.rating) || 0;
      const finalGoogleData = googleData ? {
        ...googleData,
        gg_score: numRating,
        google_rating: googleData.google_rating ?? (googleData.rating !== numRating ? googleData.rating : null),
        custom_about: customAbout,
      } : {
        gg_score: numRating,
        custom_about: customAbout,
      };

      if (editPlace) {
        // Edit Mode
        const { updatePlace } = await import('@/lib/places');
        const result = await updatePlace(editPlace.id, {
          name: form.name,
          category: form.category,
          price_range: finalPriceRange,
          rating: parseFloat(form.rating) || 0,
          personal_notes: finalPersonalNotes,
          lat: latVal,
          lng: lngVal,
          google_maps_url: form.maps_link,
          video_url: finalVideoUrl,
          google_data: finalGoogleData,
          is_buffet: form.is_buffet || form.category === 'Buffet' || false,
        });

        if (result) {
          setMessage({ type: 'success', text: `✅ แก้ไข "${form.name}" เรียบร้อยแล้ว!` });
          onPlaceAdded();
        } else {
          setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึกการแก้ไข' });
        }
      } else {
        // Add Mode
        const { insertPlace } = await import('@/lib/places');
        const result = await insertPlace({
          name: form.name,
          category: form.category,
          price_range: finalPriceRange,
          rating: parseFloat(form.rating) || 0,
          personal_notes: finalPersonalNotes,
          lat: latVal,
          lng: lngVal,
          google_maps_url: form.maps_link,
          video_url: finalVideoUrl,
          google_data: finalGoogleData,
          is_buffet: form.is_buffet || form.category === 'Buffet' || false,
        });

        if (result) {
          setMessage({ type: 'success', text: `✅ เพิ่ม "${form.name}" เรียบร้อยแล้ว!` });
          setForm(EMPTY_FORM);
          setGoogleData(null);
          setCustomAbout({
            service_options: [],
            popular_for: [],
            amenities: [],
            atmosphere: [],
            payments: [],
            parking: [],
          });
          onPlaceAdded();
        } else {
          setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: String(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleKMLUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setKmlStatus({ type: 'loading', text: 'กำลังประมวลผลไฟล์ KML...' });

    try {
      const text = await file.text();
      const { parseKML } = await import('@/lib/kmlParser');
      const parsed = await parseKML(text);

      if (parsed.length === 0) {
        setKmlStatus({ type: 'error', text: 'ไม่พบข้อมูล Placemark ในไฟล์ KML' });
        return;
      }

      const { batchInsertPlaces } = await import('@/lib/places');
      const count = await batchInsertPlaces(parsed);
      setKmlStatus({ type: 'success', text: `นำเข้าสำเร็จ ${count} ร้าน จากไฟล์ ${file.name}` });
      onPlaceAdded();
    } catch (err) {
      setKmlStatus({ type: 'error', text: 'ไม่สามารถอ่านไฟล์ได้: ' + String(err) });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const activeColor = categories.find((c) => c.name === form.category)?.color ?? '#E74C3C';

  return (
    <div className="admin-form-container" style={{ maxWidth: '100%' }}>
      {/* Add/Edit Pin Form */}
      <div className="admin-card">
        <div className="admin-card-header" style={{ borderColor: activeColor }}>
          {editPlace ? (
            <Edit3 size={20} style={{ color: activeColor }} />
          ) : (
            <Plus size={20} style={{ color: activeColor }} />
          )}
          <h2>{editPlace ? 'แก้ไขข้อมูลหมุด' : 'เพิ่มหมุดใหม่'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="admin-form">
          {/* Duplicate Place Warning Banner */}
          {duplicatePlace && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1.5px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '20px',
              animation: 'fade-in 0.3s ease',
              boxShadow: '0 4px 16px rgba(239, 68, 68, 0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontWeight: 800, fontSize: '14px', marginBottom: 6 }}>
                <AlertCircle size={18} />
                <span>⚠️ ตรวจพบหมุดซ้ำในระบบ! (Duplicate Place Detected)</span>
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                ร้าน <strong>"{duplicatePlace.name}"</strong> (หมวดหมู่: {duplicatePlace.category} | คะแนน: {duplicatePlace.rating}⭐) ถูกปักหมุดไว้แล้วในระบบ
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {onSelectEditPlace && (
                  <button
                    type="button"
                    onClick={() => onSelectEditPlace(duplicatePlace)}
                    style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '7px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)',
                    }}
                  >
                    <Edit3 size={13} />
                    <span>แก้ไขหมุดนี้แทน</span>
                  </button>
                )}
                {duplicatePlace.google_maps_url && (
                  <a
                    href={duplicatePlace.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '8px',
                      padding: '7px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>🌐 เปิดดูตำแหน่งใน Google Maps</span>
                  </a>
                )}
              </div>
            </div>
          )}
          {/* ─── AI Extract Section ─────────────────────────────────── */}
          {!editPlace && (
            <div className="ai-extract-section" style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(59, 130, 246, 0.08))',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Sparkles size={18} style={{ color: '#a78bfa' }} />
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#c4b5fd' }}>
                  ดึงข้อมูลจากคลิปรีวิว (AI Extract)
                </span>
              </div>
              <p style={{ fontSize: '11.5px', color: '#8c92b2', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                วางลิงก์คลิป TikTok หรือ YouTube แล้ว AI จะช่วยสกัดชื่อร้าน ค้นหาพิกัด และกรอกข้อมูลให้อัตโนมัติ
              </p>

              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Video size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8c92b2' }} />
                  <input
                    type="text"
                    value={aiUrl}
                    onChange={(e) => setAiUrl(e.target.value)}
                    placeholder="วางลิงก์ TikTok / YouTube ที่นี่..."
                    className="form-input"
                    style={{ width: '100%', paddingLeft: 34 }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAIExtract(); } }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAIExtract}
                  disabled={aiExtracting || !aiUrl.trim()}
                  className="glazzed-neon-btn"
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '0 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3))',
                    borderColor: 'rgba(139, 92, 246, 0.4)',
                  }}
                >
                  {aiExtracting ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      <span>กำลังสกัด...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>AI Extract</span>
                    </>
                  )}
                </button>
              </div>

              {/* AI Status */}
              {aiStatus && (
                <div style={{
                  marginTop: 10,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  lineHeight: 1.5,
                  background: aiStatus.type === 'success'
                    ? 'rgba(34, 197, 94, 0.1)'
                    : aiStatus.type === 'error'
                      ? 'rgba(239, 68, 68, 0.1)'
                      : 'rgba(59, 130, 246, 0.1)',
                  color: aiStatus.type === 'success'
                    ? '#4ade80'
                    : aiStatus.type === 'error'
                      ? '#f87171'
                      : '#93c5fd',
                  border: `1px solid ${aiStatus.type === 'success'
                    ? 'rgba(34, 197, 94, 0.2)'
                    : aiStatus.type === 'error'
                      ? 'rgba(239, 68, 68, 0.2)'
                      : 'rgba(59, 130, 246, 0.2)'}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 6,
                }}>
                  {aiStatus.type === 'loading' && <Loader2 size={14} className="animate-spin" style={{ flexShrink: 0, marginTop: 1 }} />}
                  {aiStatus.type === 'success' && <CheckCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />}
                  {aiStatus.type === 'error' && <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />}
                  <span>{aiStatus.text}</span>
                </div>
              )}

              {/* Caption preview */}
              {aiCaption && (
                <div style={{
                  marginTop: 8,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#94a3b8',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <span style={{ fontWeight: 600, color: '#cbd5e1' }}>📝 Caption ที่ดึงมาได้: </span>
                  {aiCaption}
                </div>
              )}

              {/* Manual search input toggle & fallback */}
              {aiStatus && (
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => setAiFallback((prev) => !prev)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#a78bfa',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    {aiFallback ? '🔽 ซ่อนช่องพิมพ์ชื่อร้าน' : '✏️ พิมพ์ค้นหาด้วยชื่อร้านโดยตรง (หากในคลิปไม่ได้ระบุชื่อร้าน)'}
                  </button>
                </div>
              )}

              {aiFallback && (
                <div style={{ marginTop: 10, background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <label style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: 6, display: 'block', fontWeight: 600 }}>
                    ✏️ พิมพ์ชื่อร้าน + เมืองที่ต้องการค้นหาพิกัด
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      value={aiFallbackName}
                      onChange={(e) => setAiFallbackName(e.target.value)}
                      placeholder="เช่น Venchi Milan หรือ Cioccolatitaliani Milan"
                      className="form-input"
                      style={{ flex: 1 }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFallbackSearch(); } }}
                    />
                    <button
                      type="button"
                      onClick={handleFallbackSearch}
                      disabled={aiExtracting || !aiFallbackName.trim()}
                      className="glazzed-neon-btn"
                      style={{ whiteSpace: 'nowrap', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      {aiExtracting ? (
                        <><Loader2 className="animate-spin" size={14} /><span>ค้นหา...</span></>
                      ) : (
                        <><Search size={14} /><span>ค้นหาพิกัด</span></>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Autocomplete Map Search */}
          <div className="form-group" style={{ position: 'relative' }}>
            <label htmlFor="mapSearch">🔍 ค้นหาที่ตั้งร้านอาหารบนแผนที่</label>
            <div className="search-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="mapSearch"
                type="text"
                value={mapSearchQuery}
                onChange={handleMapSearchChange}
                placeholder="พิมพ์ชื่อร้าน + เมือง (เช่น Sora Sushi Tokyo)"
                className="form-input"
                style={{ width: '100%', paddingRight: '40px' }}
              />
              {searching && (
                <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: '12px', color: 'var(--text-muted)' }} />
              )}
            </div>

            {/* Results Dropdown */}
            {searchResults.length > 0 && (
              <ul className="search-results-dropdown">
                {searchResults.map((result, idx) => (
                  <li
                    key={idx}
                    onClick={() => handleSelectSearchResult(result)}
                    className="search-result-item"
                  >
                    <MapPin size={14} className="result-pin-icon" />
                    <div>
                      <div className="result-name">{result.address?.name || result.address?.restaurant || result.address?.cafe || result.display_name.split(',')[0]}</div>
                      <div className="result-address">{result.display_name}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Name */}
          <div className="form-group">
            <label htmlFor="name">ชื่อร้าน *</label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="เช่น Gaggan Anand"
              required
              className="form-input"
            />
          </div>

          {/* Category + Price */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">หมวดหมู่</label>
              <select id="category" name="category" value={form.category} onChange={handleChange} className="form-select">
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.emoji} {cat.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="price_range">ระดับราคา</label>
              <select id="price_range" name="price_range" value={form.price_range} onChange={handleChange} className="form-select">
                {activePriceRanges.map((pr) => (
                  <option key={pr.label} value={pr.label}>{pr.label} {pr.description ? `(${pr.description})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Buffet Checkbox */}
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', background: 'rgba(226, 109, 92, 0.08)', border: '1px solid rgba(226, 109, 92, 0.25)', padding: '8px 14px', borderRadius: '10px', transition: 'all 0.2s ease' }}>
              <input
                type="checkbox"
                name="is_buffet"
                checked={form.is_buffet || form.category === 'Buffet'}
                onChange={(e) => setForm((prev) => ({ ...prev, is_buffet: e.target.checked }))}
                style={{ width: 18, height: 18, accentColor: '#E26D5C', cursor: 'pointer' }}
              />
              <span>🍱 ร้านนี้เป็นร้านบุฟเฟต์ (Buffet)</span>
            </label>
          </div>

          {/* Maps Link */}
          <div className="form-group">
            <label htmlFor="maps_link">
              <MapPin size={13} style={{ display: 'inline', marginRight: 4 }} />
              ลิงก์ Google Maps * (ดึงพิกัดและข้อมูลอัตโนมัติ)
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="maps_link"
                name="maps_link"
                type="text"
                value={form.maps_link}
                onChange={handleChange}
                placeholder="https://maps.app.goo.gl/... หรือ https://www.google.com/maps/..."
                className="form-input"
                style={{ flex: 1 }}
                required
              />
              <button
                type="button"
                onClick={handleFetchGoogleDetails}
                disabled={fetchingGoogle || !form.maps_link}
                className="glazzed-neon-btn"
                style={{ whiteSpace: 'nowrap', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {fetchingGoogle ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    <span>ดึงข้อมูล...</span>
                  </>
                ) : (
                  <span>ดึงข้อมูลร้าน</span>
                )}
              </button>
            </div>
          </div>

          {/* Rating */}
          <div className="form-group">
            <label htmlFor="rating">คะแนน G&G Score (0–5, ทศนิยม 2 ตำแหน่ง)</label>
            <input
              id="rating"
              name="rating"
              type="number"
              min="0"
              max="5"
              step="0.01"
              value={form.rating}
              onChange={handleChange}
              placeholder="4.85"
              className="form-input"
            />
          </div>

          {/* Video URL */}
          <div className="form-group">
            <label htmlFor="video_url">ลิงก์วิดีโอรีวิว (ใส่ได้หลายลิงก์ แยกด้วยเครื่องหมายจุลภาค ,)</label>
            <input
              id="video_url"
              name="video_url"
              type="text"
              value={form.video_url}
              onChange={handleChange}
              placeholder="https://youtube.com/... , https://tiktok.com/..."
              className="form-input"
            />
          </div>

          {/* Notes */}
          <div className="form-group">
            <label htmlFor="personal_notes">โน้ตส่วนตัว</label>
            <textarea
              id="personal_notes"
              name="personal_notes"
              value={form.personal_notes}
              onChange={handleChange}
              placeholder="บันทึกความรู้สึก ข้อแนะนำ หรือสิ่งที่ต้องลอง..."
              rows={3}
              className="form-textarea"
            />
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>
              💡 พิมพ์โน้ตภาษาไทยตามปกติ เมื่อกดบันทึกหมุด ระบบจะเคาะลงมา 1 บรรทัดและแปลเป็นภาษาอังกฤษให้อัตโนมัติ (ฟรี 100%)
            </p>
          </div>

          {/* Collapsible About Checklist section */}
          <div className="form-group" style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={() => setIsAboutExpanded(!isAboutExpanded)}
              className="glazzed-neon-btn"
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: 6, color: '#60a5fa' }}>
                📌 ข้อมูลรายละเอียดบริการเพิ่มเติม (About Details Checklist)
              </span>
              <span style={{ color: '#8c92b2', fontSize: '11px' }}>{isAboutExpanded ? '▲ ซ่อน' : '▼ แสดง'}</span>
            </button>

            {isAboutExpanded && (
              <div 
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderTop: 'none',
                  borderRadius: '0 0 8px 8px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16
                }}
              >
                {Object.entries(CUSTOM_ABOUT_SCHEMA).map(([key, section]) => (
                  <div key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 12 }}>
                    <h5 style={{ fontSize: '12px', color: '#fff', margin: '0 0 8px 0', fontWeight: 750 }}>{section.title}</h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
                      {section.options.map((opt) => {
                        const isChecked = customAbout[key]?.includes(opt) || false;
                        return (
                          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setCustomAbout((prev) => {
                                  const currentList = prev[key] || [];
                                  const newList = checked 
                                    ? [...currentList, opt] 
                                    : currentList.filter(item => item !== opt);
                                  return { ...prev, [key]: newList };
                                });
                              }}
                              style={{ width: 14, height: 14, cursor: 'pointer' }}
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message */}
          {message && (
            <div className={`form-message ${message.type}`}>
              {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="submit"
              disabled={submitting}
              className="submit-btn"
              style={{ backgroundColor: activeColor, flex: 1 }}
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : editPlace ? (
                <Edit3 size={18} />
              ) : (
                <Plus size={18} />
              )}
              {submitting ? 'กำลังบันทึก...' : editPlace ? 'บันทึกการแก้ไข' : 'เพิ่มหมุด'}
            </button>
            {editPlace && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="nav-btn"
                style={{
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 20px',
                  borderColor: 'var(--border-default)',
                  background: 'var(--bg-elevated)',
                }}
              >
                ยกเลิก
              </button>
            )}
          </div>
        </form>
      </div>

      {/* KML Import (Only show when not editing a specific item) */}
      {!editPlace && (
        <div className="admin-card" style={{ marginTop: 24 }}>
          <div className="admin-card-header" style={{ borderColor: '#3498DB' }}>
            <Upload size={20} style={{ color: '#3498DB' }} />
            <h2>นำเข้าจากไฟล์ KML</h2>
          </div>
          <div className="kml-section">
            <p className="kml-description">
              Export ไฟล์ <strong>.kml</strong> จาก Google My Maps แล้วอัปโหลดที่นี่
              เพื่อ Batch Import พิกัดทั้งหมดเข้าสู่ระบบ
            </p>

            <label className="kml-upload-label" htmlFor="kml-file">
              <Upload size={24} />
              <span>คลิกเพื่อเลือกไฟล์ KML</span>
              <span className="kml-hint">.kml เท่านั้น</span>
            </label>
            <input
              ref={fileInputRef}
              id="kml-file"
              type="file"
              accept=".kml"
              onChange={handleKMLUpload}
              className="kml-file-input"
            />

            {kmlStatus && (
              <div className={`form-message ${kmlStatus.type === 'loading' ? 'loading' : kmlStatus.type}`}>
                {kmlStatus.type === 'loading' && <Loader2 size={16} className="animate-spin" />}
                {kmlStatus.type === 'success' && <CheckCircle size={16} />}
                {kmlStatus.type === 'error' && <AlertCircle size={16} />}
                {kmlStatus.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dropdown styling overriding globally */}
      <style>{`
        .search-results-dropdown {
          position: absolute;
          top: calc(100% - 4px);
          left: 0;
          right: 0;
          background: rgba(22, 28, 54, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-sm);
          z-index: 1000;
          max-height: 220px;
          overflow-y: auto;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          padding: 6px 0;
          list-style: none;
          margin: 0;
        }

        .search-result-item {
          padding: 10px 16px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          cursor: pointer;
          transition: background 150ms ease;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }

        .search-result-item:last-child {
          border-bottom: none;
        }

        .search-result-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .result-pin-icon {
          color: var(--accent-primary);
          margin-top: 2px;
          flex-shrink: 0;
        }

        .result-name {
          font-size: 13px;
          font-weight: 750;
          color: #fff;
          line-height: 1.3;
        }

        .result-address {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
          line-height: 1.3;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
          max-width: 320px;
        }
      `}</style>
    </div>
  );
}

const CUSTOM_ABOUT_SCHEMA = {
  popular_for: {
    title: 'Popular for (เป็นที่นิยมสำหรับ)',
    options: ['Solo dining', 'Good for working on laptop', 'Dinner', 'Family dining', 'Romantic dining', 'Quick bite', 'Breakfast', 'Lunch']
  },
  amenities: {
    title: 'Amenities (สิ่งอำนวยความสะดวก)',
    options: ['Restroom', 'Wi-Fi', 'Power outlet', 'High chairs', 'Good for kids', 'Air conditioning', 'Restroom for disabled']
  },
  atmosphere: {
    title: 'Atmosphere (บรรยากาศ)',
    options: ['Cozy', 'Casual', 'Trendy', 'Romantic', 'Upscale', 'Historic/Rustic']
  },
  payments: {
    title: 'Payments (การชำระเงิน)',
    options: ['Credit cards', 'Debit cards', 'NFC mobile payments', 'Cash-only']
  },
  parking: {
    title: 'Parking (ที่จอดรถ)',
    options: ['Free parking lot', 'Paid parking lot', 'Free street parking', 'Paid street parking', 'Valet parking']
  }
};
