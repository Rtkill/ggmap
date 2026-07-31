'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Map,
  Search,
  Edit2,
  Trash2,
  Plus,
  TrendingUp,
  MapPin,
  Star,
  DollarSign,
  UtensilsCrossed,
  BookOpen,
  Globe,
  X,
  Loader2,
  LayoutDashboard,
  Settings,
  Sliders,
  TableProperties,
  LogOut,
  Calendar,
  Tags,
} from 'lucide-react';
import AdminForm from '@/components/AdminForm';
import { Place, DbCategory, DbPriceRange, CATEGORY_EMOJIS, CATEGORY_COLORS } from '@/types/place';
import { getCountryFromLatLng, getCountryForPlace, getCountryFlag, getProvinceFromGoogleData } from '@/lib/country';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [places, setPlaces] = useState<Place[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountryFilter, setSelectedCountryFilter] = useState('All');
  const [selectedProvinceFilter, setSelectedProvinceFilter] = useState('All');
  const [selectedVideoFilter, setSelectedVideoFilter] = useState<'All' | 'HasVideo' | 'NoVideo'>('All');
  const [hoveredCountry, setHoveredCountry] = useState<any>(null);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentDate, setCurrentDate] = useState('');
  const [hoveredCategory, setHoveredCategory] = useState<any>(null);

  // Check login session status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth');
        const data = await res.json();
        setIsAuthenticated(data.authenticated === true);
      } catch (err) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, password: loginPass }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setLoginError(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
      } else {
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      setLoginError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
    } catch (err) {
      console.error(err);
    }
    setIsAuthenticated(false);
  };

  // Dynamic categories & price ranges
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [priceRanges, setPriceRanges] = useState<DbPriceRange[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);

  // States for Category Form Modal
  const [editingCategory, setEditingCategory] = useState<DbCategory | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', color: '#E26D5C', emoji: '🍽️' });
  const [catMessage, setCatMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // States for Price Range Form Modal
  const [editingPrice, setEditingPrice] = useState<DbPriceRange | null>(null);
  const [isAddingPrice, setIsAddingPrice] = useState(false);
  const [priceForm, setPriceForm] = useState({ label: '', description: '' });
  const [priceMessage, setPriceMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Batch sync states
  const [syncingBatch, setSyncingBatch] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');

  // Color Presets for Category picker
  const COLOR_PRESETS = [
    '#E26D5C', // Terracotta
    '#8E7DBE', // Lavender/Violet
    '#FAAD14', // Warm Amber
    '#5C80BC', // Steel Blue
    '#4CB9A8', // Sage/Teal
    '#C84B31', // Deep Crimson
    '#A569BD', // Purple
    '#EC7063', // Soft Red
    '#F5B041', // Orange
    '#5DADE2', // Sky Blue
  ];

  // Geocoding keyword dictionary for Emojis
  const EMOJI_KEYWORDS: Record<string, string> = {
    'sushi': '🍣', 'salmon': '🍣', 'ซูชิ': '🍣', 'แซลมอน': '🍣',
    'ramen': '🍜', 'noodle': '🍜', 'noodles': '🍜', 'ราเมง': '🍜', 'ก๋วยเตี๋ยว': '🍜', 'บะหมี่': '🍜', 'เส้น': '🍜',
    'burger': '🍔', 'pizza': '🍕', 'เบอร์เกอร์': '🍔', 'พิซซ่า': '🍕',
    'coffee': '☕', 'cafe': '☕', 'tea': '☕', 'กาแฟ': '☕', 'คาเฟ่': '☕', 'ชา': '☕',
    'dessert': '🍰', 'cake': '🍰', 'sweet': '🍰', 'sweets': '🍰', 'ของหวาน': '🍰', 'เค้ก': '🍰',
    'bar': '🍺', 'beer': '🍺', 'wine': '🍷', 'cocktail': '🍸', 'เบียร์': '🍺', 'บาร์': '🍺', 'ไวน์': '🍷', 'เหล้า': '🍺',
    'buffet': '🍱', 'shabu': '🍲', 'hotpot': '🍲', 'บุฟเฟ่ต์': '🍱', 'ชาบู': '🍲', 'หมูกระทะ': '🍲', 'ปิ้งย่าง': '🥩',
    'steak': '🥩', 'meat': '🥩', 'barbecue': '🍖', 'bbq': '🍖', 'สเต็ก': '🥩', 'เนื้อ': '🥩',
    'seafood': '🦞', 'fish': '🐟', 'crab': '🦀', 'shrimp': '🦐', 'ทะเล': '🦞', 'ซีฟู้ด': '🦞', 'กุ้ง': '🦐', 'ปู': '🦀', 'ปลา': '🐟',
    'fine dining': '🍽️', 'restaurant': '🍜',
    'bakery': '🍞', 'bread': '🍞', 'เบเกอรี่': '🍞', 'ขนมปัง': '🍞',
    'ice cream': '🍦', 'gelato': '🍦', 'ไอศกรีม': '🍦', 'ไอติม': '🍦',
    'juice': '🥤', 'drink': '🥤', 'น้ำ': '🥤', 'เครื่องดื่ม': '🥤',
  };

  const getAutoEmoji = (name: string): string => {
    const cleanName = name.toLowerCase().trim();
    for (const key in EMOJI_KEYWORDS) {
      if (cleanName.includes(key)) {
        return EMOJI_KEYWORDS[key];
      }
    }
    return '🍽️';
  };

  // Sync date on client side
  useEffect(() => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(new Date().toLocaleDateString('en-US', options));
  }, []);

  const loadPlaces = useCallback(async () => {
    setLoading(true);
    try {
      const { getPlaces } = await import('@/lib/places');
      const data = await getPlaces();
      setPlaces([...data]);
    } catch (err) {
      console.error('Error loading places:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategoriesAndPrices = useCallback(async () => {
    setLoadingCats(true);
    try {
      const { getCategories, getPriceRanges } = await import('@/lib/places');
      const catsData = await getCategories();
      const pricesData = await getPriceRanges();
      setCategories(catsData);
      setPriceRanges(pricesData);
    } catch (err) {
      console.error('Failed to load categories/prices:', err);
    } finally {
      setLoadingCats(false);
    }
  }, []);

  useEffect(() => {
    loadPlaces();
    loadCategoriesAndPrices();
  }, [loadPlaces, loadCategoriesAndPrices]);

  // Dynamic Category colors map
  const categoryColors = useMemo(() => {
    const mapping: Record<string, string> = {};
    categories.forEach((c) => {
      mapping[c.name] = c.color;
    });
    return mapping;
  }, [categories]);

  const handleBatchSyncGoogleData = async () => {
    const placesToSync = places.filter((p) => p.google_maps_url);
    if (placesToSync.length === 0) {
      alert('ไม่มีหมุดร้านค้าที่มีลิงก์ Google Maps สำหรับการซิงค์ข้อมูล');
      return;
    }

    if (
      !confirm(
        `ระบบจะทำการดึงข้อมูลเชิงลึก (เรตติ้ง, รีวิว, เวลาเปิดปิด) จาก Google Places API สำหรับร้านค้าจำนวน ${placesToSync.length} ร้าน ยินดีที่จะดำเนินการใช่หรือไม่?`
      )
    ) {
      return;
    }

    setSyncingBatch(true);
    try {
      const { syncPlaceGoogleData } = await import('@/lib/places');
      let count = 0;
      for (const place of placesToSync) {
        setSyncProgress(`ซิงค์ข้อมูล ${count + 1}/${placesToSync.length}...`);
        const updated = await syncPlaceGoogleData(place.id, place.google_maps_url || '', place.name);
        if (updated) {
          setPlaces((prev) => prev.map((p) => (p.id === place.id ? updated : p)));
        }
        count++;
        await new Promise((r) => setTimeout(r, 200));
      }
      alert('✅ ซิงค์ข้อมูลร้านค้าทั้งหมดเรียบร้อยแล้ว!');
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดระหว่างซิงค์ข้อมูล: ' + err);
    } finally {
      setSyncingBatch(false);
      setSyncProgress('');
      loadPlaces();
    }
  };

  // Form handle name changes for Category (with auto-emoji extraction)
  const handleCatNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCatForm((prev) => ({
      ...prev,
      name: val,
      emoji: getAutoEmoji(val),
    }));
  };

  // Category CRUD Handlers
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name) {
      setCatMessage({ type: 'error', text: 'กรุณากรอกชื่อหมวดหมู่' });
      return;
    }

    try {
      const { insertCategory, updateCategory } = await import('@/lib/places');
      if (editingCategory) {
        const result = await updateCategory(editingCategory.id, catForm);
        if (result) {
          setCatMessage({ type: 'success', text: 'แก้ไขหมวดหมู่สำเร็จ!' });
          loadCategoriesAndPrices();
          setTimeout(() => {
            setEditingCategory(null);
            setCatMessage(null);
          }, 1000);
        }
      } else {
        const result = await insertCategory(catForm);
        if (result) {
          setCatMessage({ type: 'success', text: 'เพิ่มหมวดหมู่สำเร็จ!' });
          setCatForm({ name: '', color: '#E26D5C', emoji: '🍽️' });
          loadCategoriesAndPrices();
          setTimeout(() => {
            setIsAddingCategory(false);
            setCatMessage(null);
          }, 1000);
        }
      }
    } catch (err) {
      setCatMessage({ type: 'error', text: String(err) });
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`ต้องการลบหมวดหมู่ "${name}" ใช่หรือไม่? หากลบไปแล้วหมุดร้านอาหารในหมวดหมู่นี้จะยังแสดงผลแต่จะเป็นสีเริ่มต้น`)) return;
    try {
      const { deleteCategory } = await import('@/lib/places');
      const success = await deleteCategory(id);
      if (success) {
        loadCategoriesAndPrices();
      }
    } catch (err) {
      alert('ลบหมวดหมู่ไม่สำเร็จ: ' + err);
    }
  };

  // Price Range CRUD Handlers
  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceForm.label) {
      setPriceMessage({ type: 'error', text: 'กรุณากรอกระดับราคา (เช่น $$$$)' });
      return;
    }

    try {
      const { insertPriceRange, updatePriceRange } = await import('@/lib/places');
      if (editingPrice) {
        const result = await updatePriceRange(editingPrice.id, priceForm);
        if (result) {
          setPriceMessage({ type: 'success', text: 'แก้ไขระดับราคาสำเร็จ!' });
          loadCategoriesAndPrices();
          setTimeout(() => {
            setEditingPrice(null);
            setPriceMessage(null);
          }, 1000);
        }
      } else {
        const result = await insertPriceRange(priceForm);
        if (result) {
          setPriceMessage({ type: 'success', text: 'เพิ่มระดับราคาสำเร็จ!' });
          setPriceForm({ label: '', description: '' });
          loadCategoriesAndPrices();
          setTimeout(() => {
            setIsAddingPrice(false);
            setPriceMessage(null);
          }, 1000);
        }
      }
    } catch (err) {
      setPriceMessage({ type: 'error', text: String(err) });
    }
  };

  const handleDeletePrice = async (id: string, label: string) => {
    if (!confirm(`ต้องการลบระดับราคา "${label}" ใช่หรือไม่?`)) return;
    try {
      const { deletePriceRange } = await import('@/lib/places');
      const success = await deletePriceRange(id);
      if (success) {
        loadCategoriesAndPrices();
      }
    } catch (err) {
      alert('ลบระดับราคาไม่สำเร็จ: ' + err);
    }
  };

  // Sync Category values when editing
  useEffect(() => {
    if (editingCategory) {
      setCatForm({
        name: editingCategory.name,
        color: editingCategory.color,
        emoji: editingCategory.emoji,
      });
    }
  }, [editingCategory]);

  // Sync Price values when editing
  useEffect(() => {
    if (editingPrice) {
      setPriceForm({
        label: editingPrice.label,
        description: editingPrice.description || '',
      });
    }
  }, [editingPrice]);

  // Dashboard Stats & Intelligence Calculations
  const stats = useMemo(() => {
    if (places.length === 0) {
      return { total: 0, avgRating: 0, topCategory: '-', countryCount: 0, priceBreakdown: { $: 0, $$: 0, $$$: 0 } };
    }

    const total = places.length;
    const sumRating = places.reduce((sum, p) => sum + p.rating, 0);
    const avgRating = sumRating / total;

    const catCounts: Record<string, number> = {};
    const countrySet = new Set<string>();
    places.forEach((p) => {
      catCounts[p.category] = (catCounts[p.category] ?? 0) + 1;
      const c = getCountryForPlace(p.lat, p.lng, p.google_data);
      if (c) countrySet.add(c);
    });

    let topCategory = '-';
    let maxCount = 0;
    Object.entries(catCounts).forEach(([cat, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topCategory = cat;
      }
    });

    const priceBreakdown = { $: 0, $$: 0, $$$: 0 };
    places.forEach((p) => {
      const pr = p.price_range as '$' | '$$' | '$$$';
      if (priceBreakdown[pr] !== undefined) {
        priceBreakdown[pr]++;
      }
    });

    return { total, avgRating, topCategory, countryCount: countrySet.size, priceBreakdown };
  }, [places]);

  const dashboardData = useMemo(() => {
    if (places.length === 0) {
      return {
        total: 0,
        avgRating: 0,
        topCategory: '-',
        topCategoryCount: 0,
        topCategoryEmoji: '🍽️',
        countryCount: 0,
        countryBreakdown: [],
        categoryBreakdown: [],
        topRatedPlaces: [],
        recentPlaces: [],
        health: {
          syncedCount: 0,
          unsyncedCount: 0,
          syncedPercent: 100,
          missingNotesCount: 0,
          videoCount: 0,
          topRatedCount: 0,
        },
      };
    }

    const total = places.length;
    const sumRating = places.reduce((sum, p) => sum + p.rating, 0);
    const avgRating = total > 0 ? sumRating / total : 0;
    const topRatedCount = places.filter((p) => p.rating >= 4.5).length;

    // 1. Country & Province breakdown
    const countryMap: Record<string, { count: number; flag: string; provinces: Record<string, number> }> = {};
    places.forEach((p) => {
      const country = getCountryForPlace(p.lat, p.lng, p.google_data);
      const flag = getCountryFlag(country);
      const prov = getProvinceFromGoogleData(p.google_data) || 'Unspecified';

      if (!countryMap[country]) {
        countryMap[country] = { count: 0, flag, provinces: {} };
      }
      countryMap[country].count++;
      countryMap[country].provinces[prov] = (countryMap[country].provinces[prov] || 0) + 1;
    });

    const countryBreakdown = Object.entries(countryMap)
      .map(([name, data]) => ({
        name,
        flag: data.flag,
        count: data.count,
        percent: Math.round((data.count / total) * 100),
        provinceCount: Object.keys(data.provinces).filter((pr) => pr !== 'Unspecified').length,
        topProvince: Object.entries(data.provinces).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unspecified',
      }))
      .sort((a, b) => b.count - a.count);

    // 2. Category breakdown
    const catMap: Record<string, number> = {};
    places.forEach((p) => {
      catMap[p.category] = (catMap[p.category] || 0) + 1;
    });

    const categoryBreakdown = Object.entries(catMap)
      .map(([name, count]) => {
        const catInfo = categories.find((c) => c.name === name);
        return {
          name,
          count,
          percent: Math.round((count / total) * 100),
          emoji: catInfo?.emoji || CATEGORY_EMOJIS[name] || '🍽️',
          color: catInfo?.color || CATEGORY_COLORS[name] || '#3b82f6',
        };
      })
      .sort((a, b) => b.count - a.count);

    const topCategory = categoryBreakdown[0]?.name || '-';
    const topCategoryCount = categoryBreakdown[0]?.count || 0;
    const topCategoryEmoji = categoryBreakdown[0]?.emoji || '🍽️';

    // 3. Top Rated Leaderboard (Top 5 places - includes all places)
    const topRatedPlaces = [...places]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);

    // 4. Recently Added places
    const recentPlaces = [...places]
      .sort((a, b) => {
        if (a.created_at && b.created_at) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return 0;
      })
      .slice(0, 4);

    // 5. Data Health Metrics
    const syncedCount = places.filter((p) => p.google_data && Object.keys(p.google_data).length > 0).length;
    const unsyncedCount = total - syncedCount;
    const syncedPercent = Math.round((syncedCount / total) * 100);
    const missingNotesCount = places.filter((p) => !p.personal_notes || p.personal_notes.trim() === '').length;
    const videoCount = places.filter((p) => p.video_url && p.video_url.trim() !== '').length;

    return {
      total,
      avgRating,
      topCategory,
      topCategoryCount,
      topCategoryEmoji,
      countryCount: countryBreakdown.length,
      countryBreakdown,
      categoryBreakdown,
      topRatedPlaces,
      recentPlaces,
      health: {
        syncedCount,
        unsyncedCount,
        syncedPercent,
        missingNotesCount,
        videoCount,
        topRatedCount,
      },
    };
  }, [places, categories]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`คุณต้องการลบหมุดร้าน "${name}" ใช่หรือไม่?`)) return;

    try {
      const { deletePlace } = await import('@/lib/places');
      const success = await deletePlace(id);
      if (success) {
        setPlaces((prev) => prev.filter((p) => p.id !== id));
        if (editingPlace?.id === id) {
          setEditingPlace(null);
        }
      } else {
        alert('เกิดข้อผิดพลาดในการลบข้อมูล');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handlePlaceSaved = () => {
    loadPlaces();
    setEditingPlace(null);
    setIsAddingNew(false);
  };

  const adminUniqueCountries = useMemo(() => {
    const set = new Set<string>();
    places.forEach((p) => {
      set.add(getCountryForPlace(p.lat, p.lng, p.google_data));
    });
    return Array.from(set).sort();
  }, [places]);

  const adminUniqueProvinces = useMemo(() => {
    if (selectedCountryFilter === 'All') return [];
    const set = new Set<string>();
    places.forEach((p) => {
      const country = getCountryForPlace(p.lat, p.lng, p.google_data);
      if (country === selectedCountryFilter) {
        const prov = getProvinceFromGoogleData(p.google_data);
        if (prov) {
          set.add(prov);
        }
      }
    });
    return Array.from(set).sort();
  }, [places, selectedCountryFilter]);

  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      const pCountry = getCountryForPlace(p.lat, p.lng, p.google_data);
      const countryMatch = selectedCountryFilter === 'All' || pCountry === selectedCountryFilter;
      if (!countryMatch) return false;

      if (selectedCountryFilter !== 'All' && selectedProvinceFilter !== 'All') {
        const pProvince = getProvinceFromGoogleData(p.google_data);
        const provinceMatch = pProvince === selectedProvinceFilter;
        if (!provinceMatch) return false;
      }

      if (selectedVideoFilter === 'HasVideo') {
        const vCount = p.video_url ? p.video_url.split(',').map((u) => u.trim()).filter(Boolean).length : 0;
        if (vCount === 0) return false;
      }

      if (selectedVideoFilter === 'NoVideo') {
        const vCount = p.video_url ? p.video_url.split(',').map((u) => u.trim()).filter(Boolean).length : 0;
        if (vCount > 0) return false;
      }

      if (!searchQuery) return true;
      const nameMatch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const catMatch = p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const notesMatch = p.personal_notes?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      return nameMatch || catMatch || notesMatch;
    });
  }, [places, searchQuery, selectedCountryFilter, selectedProvinceFilter, selectedVideoFilter]);

  // Render loading state while checking session
  if (isAuthenticated === null) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090d16', color: '#fff' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: '#60a5fa' }} />
      </div>
    );
  }

  // Render Login Screen if user is not authenticated
  if (!isAuthenticated) {
    return (
      <div 
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 50% 50%, #1a2238 0%, #090d16 100%)',
          fontFamily: "'Outfit', 'Noto Sans Thai', sans-serif"
        }}
      >
        <form
          onSubmit={handleLoginSubmit}
          style={{
            width: '100%',
            maxWidth: '380px',
            padding: '36px 32px',
            background: 'rgba(22, 28, 54, 0.75)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, margin: '0 auto 12px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)' }}>
              <img src="/logo-optimized.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: '0 0 4px 0' }}>Grub & Gulp Admin</h2>
            <p style={{ fontSize: '12px', color: '#8c92b2', margin: 0 }}>กรุณาเข้าสู่ระบบเพื่อจัดการหมุดร้านอาหาร</p>
          </div>

          {loginError && (
            <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', color: '#f87171', fontSize: '12px', fontWeight: 600, textAlign: 'center' }}>
              ⚠️ {loginError}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '11px', fontWeight: 750, color: '#8c92b2', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Username</label>
            <input
              type="text"
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
              placeholder="กรอกชื่อผู้ใช้"
              required
              style={{ width: '100%', padding: '12px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '11px', fontWeight: 750, color: '#8c92b2', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</label>
            <input
              type="password"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
              placeholder="กรอกรหัสผ่าน"
              required
              style={{ width: '100%', padding: '12px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={loggingIn}
            style={{
              width: '100%',
              padding: '12px',
              marginTop: '6px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: loggingIn ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)'
            }}
          >
            {loggingIn ? <Loader2 size={16} className="animate-spin" /> : null}
            {loggingIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ Admin'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="glazzed-admin-layout">
      {/* LEFT SIDEBAR (Frosted glass navigation panel) */}
      <aside className="glazzed-sidebar">
        <div className="sidebar-brand">
          <div className="nav-logo-wrapper">
            <img
              src="/logo-optimized.png"
              alt="Grub & Gulp Logo"
              width={36}
              height={36}
              className="nav-logo-img"
            />
          </div>
          <div>
            <span className="brand-name">Grub & Gulp</span>
            <span className="brand-badge">ADMIN PANEL</span>
          </div>
        </div>

        {/* User profile */}
        <div className="sidebar-profile">
          <div className="avatar-wrapper">
            <img src="/admin_avatar.jpg" alt="Admin Profile" className="profile-img" />
            <div className="online-indicator"></div>
          </div>
          <h3 className="profile-name">rtkill</h3>
          <p className="profile-role">Super Admin</p>

          <div className="profile-stats">
            <div className="p-stat">
              <span className="p-stat-val">{stats.total}</span>
              <span className="p-stat-lbl">Pins</span>
            </div>
            <div className="p-stat">
              <span className="p-stat-val">{stats.avgRating.toFixed(2)}</span>
              <span className="p-stat-lbl">G&G Rating</span>
            </div>
            <div className="p-stat">
              <span className="p-stat-val">{stats.countryCount}</span>
              <span className="p-stat-lbl">Countries</span>
            </div>
          </div>
        </div>

        {/* Navigation menu */}
        <nav className="sidebar-menu">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('tables');
              setIsAddingNew(false);
              setEditingPlace(null);
            }}
            className={`menu-item ${activeTab === 'tables' ? 'active' : ''}`}
          >
            <TableProperties size={16} />
            <span>Places Table</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('categories');
              setIsAddingNew(false);
              setEditingPlace(null);
            }}
            className={`menu-item ${activeTab === 'categories' ? 'active' : ''}`}
          >
            <Tags size={16} />
            <span>Categories</span>
          </button>
          <button
            onClick={() => {
              setIsAddingNew(true);
              setEditingPlace(null);
              setActiveTab('tables');
            }}
            className="menu-item-action"
          >
            <Plus size={16} />
            <span>Add New Pin</span>
          </button>
        </nav>

        {/* Logout / Go to Map */}
        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Link href="/" className="sidebar-footer-btn">
            <Map size={15} />
            <span>Go to Map</span>
          </Link>
          <button 
            onClick={handleLogout} 
            className="sidebar-footer-btn"
            style={{ border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', background: 'rgba(239, 68, 68, 0.05)', width: '100%', cursor: 'pointer' }}
          >
            <LogOut size={15} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <main className="glazzed-main">
        {/* Header bar */}
        <header className="glazzed-header">
          {activeTab === 'tables' && !isAddingNew && !editingPlace ? (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="header-search">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search pins, categories, reviews..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                value={selectedCountryFilter}
                onChange={(e) => {
                  setSelectedCountryFilter(e.target.value);
                  setSelectedProvinceFilter('All');
                }}
                className="country-filter-select"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="All" style={{ background: '#1c1d22', color: '#fff' }}>🗺️ All Countries</option>
                {adminUniqueCountries.map((c) => (
                  <option key={c} value={c} style={{ background: '#1c1d22', color: '#fff' }}>
                    {getCountryFlag(c)} {c}
                  </option>
                ))}
              </select>

              {selectedCountryFilter !== 'All' && adminUniqueProvinces.length > 0 && (
                <select
                  value={selectedProvinceFilter}
                  onChange={(e) => setSelectedProvinceFilter(e.target.value)}
                  className="province-filter-select"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: '#cbd5e1',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="All" style={{ background: '#1c1d22', color: '#fff' }}>📍 All Provinces</option>
                  {adminUniqueProvinces.map((prov) => (
                    <option key={prov} value={prov} style={{ background: '#1c1d22', color: '#fff' }}>
                      {prov}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={selectedVideoFilter}
                onChange={(e) => setSelectedVideoFilter(e.target.value as any)}
                className="video-filter-select"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="All" style={{ background: '#1c1d22', color: '#fff' }}>🎬 ทั้งหมด (ทุกสถานะวิดีโอ)</option>
                <option value="HasVideo" style={{ background: '#1c1d22', color: '#fff' }}>✅ มีคลิปวิดีโอรีวิวแล้ว</option>
                <option value="NoVideo" style={{ background: '#1c1d22', color: '#fff' }}>⚠️ ยังไม่มีคลิปวิดีโอ (0 VDO)</option>
              </select>
            </div>
          ) : (
            <div />
          )}
          <div className="header-actions">
            <div className="header-date">
              <Calendar size={14} />
              <span>{currentDate || 'Loading date...'}</span>
            </div>
            <Link href="/" className="header-map-link">
              <Map size={14} /> Map View
            </Link>
          </div>
        </header>

        {/* Scrollable body */}
        <div className="glazzed-body">
          {/* TAB 1: DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <div className="dashboard-view-content" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Header / Welcome Intro */}
              <div className="stats-intro-banner" style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: '24px' }}>📊</span>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0 }}>
                      Grub & Gulp Intelligence
                    </h1>
                  </div>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, maxWidth: '600px' }}>
                    ยินดีต้อนรับกลับคุณ <strong style={{ color: '#60a5fa' }}>rtkill</strong>! นี่คือแดชบอร์ดสรุปสถิติเชิงลึก ความสมบูรณ์ของข้อมูล และร้านอาหารยอดนิยมทั้งหมดในระบบ
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleBatchSyncGoogleData}
                    disabled={syncingBatch}
                    className="glazzed-neon-btn"
                    style={{ padding: '10px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: '10px', background: 'rgba(37, 99, 235, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#60a5fa', cursor: 'pointer' }}
                  >
                    {syncingBatch ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                    <span>{syncingBatch ? 'กำลังซิงค์ Google...' : 'ซิงค์ข้อมูล Google ล่าสุด'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingNew(true);
                      setEditingPlace(null);
                      setActiveTab('tables');
                    }}
                    style={{ padding: '10px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                  >
                    <Plus size={16} />
                    <span>เพิ่มหมุดใหม่</span>
                  </button>
                </div>
              </div>

              {/* Row 1: 4 Key Metric Intelligence Cards (KPI Grid) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                {/* Metric 1: Total Pins */}
                <div className="glazzed-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 750, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>หมุดร้านทั้งหมด</span>
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                      <MapPin size={18} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '28px', fontWeight: 850, color: '#fff', lineHeight: 1 }}>{dashboardData.total} <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>ร้าน</span></div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: 6 }}>กระจัดกระจายอยู่ใน {dashboardData.countryCount} ประเทศ</div>
                  </div>
                </div>

                {/* Metric 2: Avg Rating */}
                <div className="glazzed-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 750, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>คะแนนเฉลี่ยสะสม</span>
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#facc15' }}>
                      <Star size={18} fill="#facc15" />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '28px', fontWeight: 850, color: '#fff', lineHeight: 1 }}>{dashboardData.avgRating.toFixed(2)} <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8' }}>/ 5</span></div>
                    <div style={{ fontSize: '12px', color: '#10b981', marginTop: 6, fontWeight: 600 }}>⭐ {dashboardData.health.topRatedCount} ร้านคะแนนเกรด A+ (≥ 4.5)</div>
                  </div>
                </div>

                {/* Metric 3: Dominant Category */}
                <div className="glazzed-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 750, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>หมวดหมู่ยอดนิยม</span>
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                      {dashboardData.topCategoryEmoji}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '22px', fontWeight: 850, color: '#fff', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dashboardData.topCategory}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: 6 }}>มีทั้งหมด {dashboardData.topCategoryCount} ร้าน ({dashboardData.total > 0 ? Math.round((dashboardData.topCategoryCount / dashboardData.total) * 100) : 0}%)</div>
                  </div>
                </div>

                {/* Metric 4: Sync Health */}
                <div className="glazzed-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 750, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ความสมบูรณ์ข้อมูล Google</span>
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: dashboardData.health.unsyncedCount === 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(249, 115, 22, 0.15)', border: `1px solid ${dashboardData.health.unsyncedCount === 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(249, 115, 22, 0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: dashboardData.health.unsyncedCount === 0 ? '#10b981' : '#f97316' }}>
                      <Globe size={18} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '28px', fontWeight: 850, color: '#fff', lineHeight: 1 }}>{dashboardData.health.syncedPercent}%</div>
                    <div style={{ fontSize: '12px', color: dashboardData.health.unsyncedCount === 0 ? '#10b981' : '#f97316', marginTop: 6, fontWeight: 600 }}>
                      {dashboardData.health.unsyncedCount === 0 ? '✓ ซิงค์ครบทุกร้านแล้ว' : `⚠️ เหลือ ${dashboardData.health.unsyncedCount} ร้านที่ต้องซิงค์`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Distribution Split (Countries vs Categories) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
                {/* Geographic Breakdown - Donut Pie Chart */}
                <div className="glazzed-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>🗺️</span> สถิติจำนวนหมุดแยกตามประเทศ & จังหวัด
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                      {dashboardData.countryCount} ประเทศ
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 20, alignItems: 'center' }}>
                    {/* SVG Donut Chart with Center KPI */}
                    <div style={{ position: 'relative', width: '170px', height: '170px', margin: '0 auto', flexShrink: 0 }}>
                      <svg viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%', overflow: 'visible' }}>
                        {(() => {
                          const pieRadius = 65;
                          const circumference = 2 * Math.PI * pieRadius;
                          let accumulatedDash = 0;
                          const countryPalette: Record<string, string> = {
                            Thailand: '#3b82f6',
                            Japan: '#ec4899',
                            China: '#f59e0b',
                            Australia: '#10b981',
                            Taiwan: '#a855f7',
                            Singapore: '#ef4444',
                            'South Korea': '#06b6d4',
                            Vietnam: '#8b5cf6',
                          };
                          const fallbackColors = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#a855f7', '#06b6d4', '#ef4444', '#8b5cf6'];

                          return dashboardData.countryBreakdown.map((item, idx) => {
                            const slicePercent = item.count / (dashboardData.total || 1);
                            const sliceDash = slicePercent * circumference;
                            const strokeColor = countryPalette[item.name] || fallbackColors[idx % fallbackColors.length];
                            const currentOffset = accumulatedDash;
                            accumulatedDash += sliceDash;
                            const isHovered = hoveredCountry?.name === item.name;

                            return (
                              <circle
                                key={item.name}
                                r={pieRadius}
                                cx={100}
                                cy={100}
                                fill="transparent"
                                stroke={strokeColor}
                                strokeWidth={isHovered ? 26 : 20}
                                strokeDasharray={`${Math.max(sliceDash - 2.5, 0.5)} ${circumference - Math.max(sliceDash - 2.5, 0.5)}`}
                                strokeDashoffset={-currentOffset}
                                style={{
                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                  cursor: 'pointer',
                                  opacity: hoveredCountry && !isHovered ? 0.45 : 1,
                                  filter: isHovered ? `drop-shadow(0 0 8px ${strokeColor})` : 'none',
                                }}
                                onMouseEnter={() => setHoveredCountry(item)}
                                onMouseLeave={() => setHoveredCountry(null)}
                              />
                            );
                          });
                        })()}
                      </svg>

                      {/* Donut Center Dynamic KPI */}
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        pointerEvents: 'none',
                      }}>
                        {hoveredCountry ? (
                          <>
                            <span style={{ fontSize: '20px', lineHeight: 1 }}>{hoveredCountry.flag}</span>
                            <span style={{ fontSize: '18px', fontWeight: 850, color: '#fff', lineHeight: 1.1, marginTop: 2 }}>{hoveredCountry.count}</span>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>{hoveredCountry.percent}%</span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: '22px', fontWeight: 850, color: '#fff', lineHeight: 1 }}>{dashboardData.total}</span>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>หมุดทั้งหมด</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Detailed Legend List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '230px', overflowY: 'auto', paddingRight: 4 }}>
                      {(() => {
                        const countryPalette: Record<string, string> = {
                          Thailand: '#3b82f6',
                          Japan: '#ec4899',
                          China: '#f59e0b',
                          Australia: '#10b981',
                          Taiwan: '#a855f7',
                          Singapore: '#ef4444',
                          'South Korea': '#06b6d4',
                          Vietnam: '#8b5cf6',
                        };
                        const fallbackColors = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#a855f7', '#06b6d4', '#ef4444', '#8b5cf6'];

                        return dashboardData.countryBreakdown.map((item, idx) => {
                          const color = countryPalette[item.name] || fallbackColors[idx % fallbackColors.length];
                          const isHovered = hoveredCountry?.name === item.name;

                          return (
                            <div
                              key={item.name}
                              onMouseEnter={() => setHoveredCountry(item)}
                              onMouseLeave={() => setHoveredCountry(null)}
                              style={{
                                padding: '10px 14px',
                                borderRadius: '12px',
                                background: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                                border: `1px solid ${isHovered ? color : 'rgba(255, 255, 255, 0.06)'}`,
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}88` }} />
                                  <span style={{ fontSize: '14px' }}>{item.flag}</span>
                                  <span style={{ fontSize: '13.5px', fontWeight: 750, color: '#fff' }}>{item.name}</span>
                                </div>
                                <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                                  {item.count} ร้าน <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#94a3b8' }}>({item.percent}%)</span>
                                </span>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8', paddingLeft: 18 }}>
                                <span>📍 {item.provinceCount > 0 ? `${item.provinceCount} จังหวัดในระบบ` : 'ไม่ระบุจังหวัด'}</span>
                                {item.topProvince && item.topProvince !== 'Unspecified' && (
                                  <span style={{ color: '#cbd5e1' }}>สูงสุด: <strong>{item.topProvince}</strong></span>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                {/* Category Share Breakdown - Interactive Vector SVG Donut Pie Chart */}
                <div className="glazzed-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>🥗</span> สัดส่วนประเภทหมวดหมู่อาหาร
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      {dashboardData.categoryBreakdown.length} หมวดหมู่
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 20, alignItems: 'center' }}>
                    {/* SVG Donut Chart with Center KPI */}
                    <div style={{ position: 'relative', width: '170px', height: '170px', margin: '0 auto', flexShrink: 0 }}>
                      <svg viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%', overflow: 'visible' }}>
                        {(() => {
                          const pieRadius = 65;
                          const circumference = 2 * Math.PI * pieRadius;
                          let accumulatedDash = 0;

                          return dashboardData.categoryBreakdown.map((item) => {
                            const slicePercent = item.count / (dashboardData.total || 1);
                            const sliceDash = slicePercent * circumference;
                            const strokeColor = item.color;
                            const currentOffset = accumulatedDash;
                            accumulatedDash += sliceDash;
                            const isHovered = hoveredCategory?.name === item.name;

                            return (
                              <circle
                                key={item.name}
                                r={pieRadius}
                                cx={100}
                                cy={100}
                                fill="transparent"
                                stroke={strokeColor}
                                strokeWidth={isHovered ? 26 : 20}
                                strokeDasharray={`${Math.max(sliceDash - 2.5, 0.5)} ${circumference - Math.max(sliceDash - 2.5, 0.5)}`}
                                strokeDashoffset={-currentOffset}
                                style={{
                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                  cursor: 'pointer',
                                  opacity: hoveredCategory && !isHovered ? 0.45 : 1,
                                  filter: isHovered ? `drop-shadow(0 0 8px ${strokeColor})` : 'none',
                                }}
                                onMouseEnter={() => setHoveredCategory(item)}
                                onMouseLeave={() => setHoveredCategory(null)}
                              />
                            );
                          });
                        })()}
                      </svg>

                      {/* Center KPI Display */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          pointerEvents: 'none',
                        }}
                      >
                        {hoveredCategory ? (
                          <>
                            <span style={{ fontSize: '20px', lineHeight: 1 }}>{hoveredCategory.emoji}</span>
                            <span style={{ fontSize: '18px', fontWeight: 850, color: hoveredCategory.color, lineHeight: 1, marginTop: 4 }}>
                              {hoveredCategory.count} ร้าน
                            </span>
                            <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 700, marginTop: 2 }}>
                              {hoveredCategory.name} ({hoveredCategory.percent}%)
                            </span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: '22px', fontWeight: 850, color: '#fff', lineHeight: 1 }}>
                              {dashboardData.categoryBreakdown.length}
                            </span>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>
                              หมวดหมู่ทั้งหมด
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Detailed Category Legend Grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '230px', overflowY: 'auto', paddingRight: 4 }}>
                      {dashboardData.categoryBreakdown.map((item) => {
                        const isHovered = hoveredCategory?.name === item.name;

                        return (
                          <div
                            key={item.name}
                            onMouseEnter={() => setHoveredCategory(item)}
                            onMouseLeave={() => setHoveredCategory(null)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '10px',
                              background: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                              border: `1px solid ${isHovered ? item.color : 'rgba(255, 255, 255, 0.06)'}`,
                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}88` }} />
                              <span style={{ fontSize: '13px' }}>{item.emoji}</span>
                              <span style={{ fontSize: '12.5px', fontWeight: 750, color: '#fff' }}>{item.name}</span>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>
                              {item.count} ร้าน <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>({item.percent}%)</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Leaderboard & Action Center Split */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
                
                {/* Leaderboard: Top 5 Highest Rated Places */}
                <div className="glazzed-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>🏆</span> ร้านอาหารคะแนนสูงสุด 5 อันดับแรก (Leaderboard)
                    </h3>
                    <button onClick={() => setActiveTab('tables')} style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                      ดูตารางทั้งหมด →
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {dashboardData.topRatedPlaces.map((p, idx) => {
                      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                      const country = getCountryForPlace(p.lat, p.lng, p.google_data);
                      const flag = getCountryFlag(country);
                      const prov = getProvinceFromGoogleData(p.google_data);
                      const catEmoji = categories.find((c) => c.name === p.category)?.emoji || CATEGORY_EMOJIS[p.category] || '🍽️';

                      return (
                        <div
                          key={p.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '12px 14px',
                            background: idx === 0 ? 'rgba(234, 179, 8, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                            border: `1px solid ${idx === 0 ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                            borderRadius: '12px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{ fontSize: '18px', fontWeight: 800, width: 28, textAlign: 'center', flexShrink: 0 }}>
                            {medal}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {p.name}
                              </h4>
                              <span style={{ fontSize: '11px' }}>{flag}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#8c92b2', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>{catEmoji} {p.category}</span>
                              {prov && <span>· 📍 {prov}</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(234, 179, 8, 0.15)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.3)', color: '#facc15', fontSize: '12.5px', fontWeight: 800, flexShrink: 0 }}>
                            <Star size={12} fill="#facc15" />
                            <span>{p.rating.toFixed(2)}</span>
                          </div>
                          <button
                            onClick={() => {
                              setEditingPlace(p);
                              setIsAddingNew(false);
                              setActiveTab('tables');
                            }}
                            className="action-btn edit-btn"
                            title="แก้ไขหมุด"
                            style={{ flexShrink: 0 }}
                          >
                            <Edit2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Data Health & Quick Action Center */}
                <div className="glazzed-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>🛡️</span> ศูนย์ตรวจสอบคุณภาพข้อมูล & ทางลัด
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Alert 1: Unsynced Google Data */}
                    <div style={{ padding: '14px', borderRadius: '12px', background: dashboardData.health.unsyncedCount > 0 ? 'rgba(249, 115, 22, 0.08)' : 'rgba(16, 185, 129, 0.08)', border: `1px solid ${dashboardData.health.unsyncedCount > 0 ? 'rgba(249, 115, 22, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: dashboardData.health.unsyncedCount > 0 ? '#f97316' : '#10b981', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 750, color: '#fff' }}>
                            {dashboardData.health.unsyncedCount > 0 ? `พบ ${dashboardData.health.unsyncedCount} ร้านยังไม่ได้ซิงค์ข้อมูล Google` : 'ข้อมูล Google Places ซิงค์สมบูรณ์ครบถ้วน'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#8c92b2', marginTop: 2 }}>
                            {dashboardData.health.unsyncedCount > 0 ? 'กดปุ่มด้านขวาเพื่อซิงค์รายละเอียดร้านอัตโนมัติ' : 'รูปภาพ รีวิว และเวลาเปิดปิดดึงมาเรียบร้อยแล้ว'}
                          </div>
                        </div>
                      </div>
                      {dashboardData.health.unsyncedCount > 0 && (
                        <button
                          onClick={handleBatchSyncGoogleData}
                          disabled={syncingBatch}
                          style={{ padding: '6px 12px', borderRadius: '8px', background: '#f97316', border: 'none', color: '#fff', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                          {syncingBatch ? 'กำลังซิงค์...' : 'ซิงค์ทันที'}
                        </button>
                      )}
                    </div>

                    {/* Alert 2: Missing Notes */}
                    <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: dashboardData.health.missingNotesCount > 0 ? '#eab308' : '#10b981', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 750, color: '#fff' }}>
                            มี {dashboardData.health.missingNotesCount} ร้านยังไม่ได้เขียนโน้ตส่วนตัว
                          </div>
                          <div style={{ fontSize: '11px', color: '#8c92b2', marginTop: 2 }}>
                            การเขียนความรู้สึกและเมนูแนะนำช่วยให้รีวิวน่าสนใจขึ้น
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('tables')}
                        style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                      >
                        จัดการในตาราง
                      </button>
                    </div>

                    {/* Alert 3: Video Attached & Features */}
                    <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#a855f7', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 750, color: '#fff' }}>
                            มี {dashboardData.health.videoCount} ร้านที่แนบลิงก์วิดีโอรีวิว
                          </div>
                          <div style={{ fontSize: '11px', color: '#8c92b2', marginTop: 2 }}>
                            คลิป YouTube/TikTok เพิ่มความน่าสนใจให้หมุดร้าน
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Row 4: Recently Added Pins */}
              <div className="glazzed-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>⏱️</span> หมุดร้านค้าล่าสุดที่เพิ่มในระบบ (Recent Additions)
                  </h3>
                  <button onClick={() => setActiveTab('tables')} style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                    ดูทั้งหมด →
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                  {dashboardData.recentPlaces.map((p) => {
                    const country = getCountryForPlace(p.lat, p.lng, p.google_data);
                    const flag = getCountryFlag(country);
                    const prov = getProvinceFromGoogleData(p.google_data);
                    const catEmoji = categories.find((c) => c.name === p.category)?.emoji || CATEGORY_EMOJIS[p.category] || '🍽️';

                    return (
                      <div
                        key={p.id}
                        style={{
                          padding: '14px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: '#fff', margin: '0 0 2px 0' }}>{p.name}</h4>
                            <div style={{ fontSize: '11px', color: '#8c92b2' }}>{flag} {country} {prov ? `· ${prov}` : ''}</div>
                          </div>
                          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#facc15', background: 'rgba(234,179,8,0.1)', padding: '2px 6px', borderRadius: '6px' }}>
                            ★ {p.rating.toFixed(2)}
                          </span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{catEmoji} {p.category}</span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>{p.price_range}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: TABLES & CRUD VIEW */}
          {activeTab === 'tables' && (
            <div className="crud-view-content">
              {/* Frosted Table Card (Takes full width now) */}
              <div className="glazzed-card places-table-card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <h3>Review list & coordinates</h3>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button
                      onClick={handleBatchSyncGoogleData}
                      disabled={syncingBatch}
                      className="glazzed-neon-btn"
                      style={{
                        background: 'rgba(59, 130, 246, 0.15)',
                        borderColor: 'rgba(59, 130, 246, 0.4)',
                        color: '#60a5fa'
                      }}
                    >
                      {syncingBatch ? (
                        <>
                          <Loader2 className="animate-spin" size={14} />
                          <span>{syncProgress}</span>
                        </>
                      ) : (
                        <>
                          <Globe size={14} style={{ display: 'inline', marginRight: 4 }} />
                          <span>ซิงค์ข้อมูล Google ย้อนหลัง</span>
                        </>
                      )}
                    </button>
                    <button onClick={() => setIsAddingNew(true)} className="glazzed-neon-btn">
                      <Plus size={14} /> Add new place
                    </button>
                  </div>
                </div>

                <div className="table-wrapper">
                  {loading ? (
                    <div className="table-loading">
                      <Loader2 className="animate-spin" />
                      <span>Fetching review data...</span>
                    </div>
                  ) : filteredPlaces.length === 0 ? (
                    <div className="table-empty">No review places match your search criteria.</div>
                  ) : (
                    <table className="glazzed-table">
                      <thead>
                        <tr>
                          <th>Place Details</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Video Status</th>
                          <th>Country</th>
                          <th>Category</th>
                          <th style={{ minWidth: '100px' }}>Price</th>
                          <th style={{ whiteSpace: 'nowrap' }}>G&G Score</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPlaces.map((place) => {
                          const country = getCountryForPlace(place.lat, place.lng, place.google_data);
                          const flag = getCountryFlag(country);
                          const vCount = place.video_url
                            ? place.video_url.split(',').map((u) => u.trim()).filter(Boolean).length
                            : 0;

                          const isNotVisited = Boolean(
                            place.personal_notes &&
                            (place.personal_notes.includes('ยังไม่ได้ไป') ||
                             place.personal_notes.toLowerCase().includes('grub & gulp') ||
                             place.personal_notes.toLowerCase().includes('grup & gulp'))
                          );

                          return (
                            <tr key={place.id} className={editingPlace?.id === place.id ? 'editing-row' : ''}>
                              <td>
                                <div className="place-row-name" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <span style={isNotVisited ? { color: '#ef4444', fontWeight: 800 } : {}}>{place.name}</span>
                                  {place.google_data ? (
                                    <span style={{ 
                                      fontSize: '9px', 
                                      padding: '1px 5px', 
                                      borderRadius: '4px', 
                                      backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                                      color: '#10b981', 
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.3px',
                                      border: '1px solid rgba(16, 185, 129, 0.2)'
                                    }} title="ข้อมูลพิกัด เรตติ้ง เวลาเปิดปิด และรีวิว ซิงค์กับ Google Maps แล้ว">
                                      Synced
                                    </span>
                                  ) : (
                                    <span style={{ 
                                      fontSize: '9px', 
                                      padding: '1px 5px', 
                                      borderRadius: '4px', 
                                      backgroundColor: 'rgba(239, 68, 68, 0.15)', 
                                      color: '#f87171', 
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.3px',
                                      border: '1px solid rgba(239, 68, 68, 0.2)'
                                    }} title="ยังไม่มีข้อมูลเชิงลึกของ Google Maps ในหมุดนี้">
                                      Not Synced
                                    </span>
                                  )}
                                </div>
                                {place.personal_notes && (
                                  <div
                                    className="place-row-notes"
                                    style={isNotVisited ? { color: '#fca5a5' } : {}}
                                  >
                                    {place.personal_notes}
                                  </div>
                                )}
                              </td>

                              {/* Dedicated Video Status Column */}
                              <td>
                                {vCount > 0 ? (
                                  <span
                                    onClick={() => {
                                      setIsAddingNew(false);
                                      setEditingPlace(place);
                                    }}
                                    style={{ 
                                      fontSize: '11px', 
                                      padding: '3px 9px', 
                                      borderRadius: '6px', 
                                      backgroundColor: 'rgba(168, 85, 247, 0.18)', 
                                      color: '#c084fc', 
                                      fontWeight: 700,
                                      letterSpacing: '0.3px',
                                      border: '1px solid rgba(168, 85, 247, 0.35)',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      whiteSpace: 'nowrap',
                                      transition: 'all 0.15s ease',
                                    }}
                                    title={`มี ${vCount} วิดีโอรีวิว คลิกเพื่อเปิดแก้ไขและจัดการวิดีโอ`}
                                  >
                                    🎬 {vCount} VDO{vCount > 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span
                                    onClick={() => {
                                      setIsAddingNew(false);
                                      setEditingPlace(place);
                                    }}
                                    style={{ 
                                      fontSize: '11px', 
                                      padding: '3px 9px', 
                                      borderRadius: '6px', 
                                      backgroundColor: 'rgba(249, 115, 22, 0.12)', 
                                      color: '#fb923c', 
                                      fontWeight: 700,
                                      letterSpacing: '0.3px',
                                      border: '1px solid rgba(249, 115, 22, 0.25)',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      whiteSpace: 'nowrap',
                                      transition: 'all 0.15s ease',
                                    }}
                                    title="ยังไม่มีวิดีโอรีวิวในหมุดนี้ คลิกเพื่อแก้ไขและเพิ่มวิดีโอ"
                                  >
                                    🎬 0 VDO (ยังไม่มี)
                                  </span>
                                )}
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                    <span>{flag}</span>
                                    <span>{country}</span>
                                  </div>
                                  {getProvinceFromGoogleData(place.google_data) && (
                                    <span style={{ fontSize: '11px', color: '#8c92b2', paddingLeft: '22px', whiteSpace: 'nowrap' }}>
                                      📍 {getProvinceFromGoogleData(place.google_data)}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className="category-badge-pill" style={{
                                  backgroundColor: `rgba(255, 255, 255, 0.04)`,
                                  border: `1px solid rgba(255, 255, 255, 0.1)`,
                                  color: '#e2e8f0',
                                }}>
                                  {place.category}
                                </span>
                              </td>
                              <td className="place-row-price">{place.price_range}</td>
                            <td>
                              <div className="place-row-rating">
                                <Star size={12} fill="#ffa800" color="#ffa800" />
                                <span>{place.rating > 0 ? place.rating.toFixed(2) : '-'}</span>
                              </div>
                            </td>
                            <td>
                              <div className="action-buttons-wrap">
                                <button
                                  onClick={() => {
                                    setIsAddingNew(false);
                                    setEditingPlace(place);
                                  }}
                                  className="action-btn edit-btn"
                                  title="Edit Pin"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => handleDelete(place.id, place.name)}
                                  className="action-btn delete-btn"
                                  title="Delete Pin"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* 📑 ADD / EDIT POPUP MODAL (Clean centered glass card) */}
              {(editingPlace || isAddingNew) && (
                <div className="glazzed-modal-backdrop" onClick={() => { setEditingPlace(null); setIsAddingNew(false); }}>
                  <div className="glazzed-modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="drawer-header-strip">
                      <h4>{isAddingNew ? 'Create New Place' : 'Modify Place details'}</h4>
                      <button onClick={() => { setEditingPlace(null); setIsAddingNew(false); }} className="drawer-close-btn">
                        <X size={15} /> Close
                      </button>
                    </div>
                    <div className="drawer-body-wrap">
                      <AdminForm
                        editPlace={editingPlace}
                        onPlaceAdded={handlePlaceSaved}
                        onCancel={() => {
                          setEditingPlace(null);
                          setIsAddingNew(false);
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CATEGORIES MANAGEMENT VIEW */}
          {activeTab === 'categories' && (
            <div className="crud-view-content" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, alignItems: 'start' }}>
              
              {/* Column 1: Categories Card */}
              <div className="glazzed-card categories-card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Categories Management</h3>
                  <button onClick={() => { setIsAddingCategory(true); setEditingCategory(null); setCatForm({ name: '', color: '#E26D5C', emoji: '🍽️' }); }} className="glazzed-neon-btn">
                    <Plus size={14} /> Add Category
                  </button>
                </div>
                
                <div className="table-wrapper">
                  {loadingCats ? (
                    <div className="table-loading">
                      <Loader2 className="animate-spin" />
                      <span>Loading categories...</span>
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="table-empty">No categories available.</div>
                  ) : (
                    <table className="glazzed-table">
                      <thead>
                        <tr>
                          <th>Emoji</th>
                          <th>Category Name</th>
                          <th>Color Accent</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.map((cat) => (
                          <tr key={cat.id}>
                            <td style={{ fontSize: 20 }}>{cat.emoji}</td>
                            <td style={{ fontWeight: 700 }}>{cat.name}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: cat.color, display: 'inline-block' }}></span>
                                <span style={{ fontSize: 11, fontFamily: 'monospace' }}>{cat.color}</span>
                              </div>
                            </td>
                            <td>
                              <div className="action-buttons-wrap">
                                <button onClick={() => setEditingCategory(cat)} className="action-btn edit-btn">
                                  <Edit2 size={12} />
                                </button>
                                <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="action-btn delete-btn">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* 📑 ADD / EDIT CATEGORY MODAL */}
              {(isAddingCategory || editingCategory) && (
                <div className="glazzed-modal-backdrop" onClick={() => { setIsAddingCategory(false); setEditingCategory(null); setCatMessage(null); }}>
                  <div className="glazzed-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
                    <div className="drawer-header-strip">
                      <h4>{editingCategory ? 'Modify Category' : 'Create Category'}</h4>
                      <button onClick={() => { setIsAddingCategory(false); setEditingCategory(null); setCatMessage(null); }} className="drawer-close-btn">
                        <X size={15} /> Close
                      </button>
                    </div>
                    <div className="drawer-body-wrap">
                      <form onSubmit={handleSaveCategory} className="admin-form">
                        <div className="form-group">
                          <label htmlFor="catName">Category Name *</label>
                          <input
                            id="catName"
                            type="text"
                            value={catForm.name}
                            onChange={handleCatNameChange}
                            placeholder="e.g. Dessert, Shabu, Ramen"
                            required
                            className="form-input"
                          />
                        </div>

                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 16 }}>
                          <div className="form-group">
                            <label htmlFor="catEmoji">Emoji</label>
                            <input
                              id="catEmoji"
                              type="text"
                              value={catForm.emoji}
                              onChange={(e) => setCatForm(prev => ({ ...prev, emoji: e.target.value }))}
                              placeholder="🍽️"
                              className="form-input"
                              style={{ fontSize: 24, textAlign: 'center', width: '100%' }}
                            />
                          </div>
                          <div className="form-group">
                            <label htmlFor="catColor">Color Accent</label>
                            <input
                              id="catColor"
                              type="text"
                              value={catForm.color}
                              onChange={(e) => setCatForm(prev => ({ ...prev, color: e.target.value }))}
                              placeholder="#E26D5C"
                              className="form-input"
                              style={{ width: '100%' }}
                            />
                          </div>
                        </div>

                        {/* Color Presets Picker */}
                        <div className="form-group">
                          <label>Quick Accent Colors</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                            {COLOR_PRESETS.map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setCatForm(prev => ({ ...prev, color: preset }))}
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  backgroundColor: preset,
                                  border: catForm.color === preset ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)',
                                  cursor: 'pointer',
                                  transition: 'transform 100ms ease',
                                  transform: catForm.color === preset ? 'scale(1.15)' : 'scale(1)'
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        {catMessage && (
                          <div className={`form-message ${catMessage.type}`}>
                            {catMessage.text}
                          </div>
                        )}

                        <button type="submit" className="submit-btn" style={{ backgroundColor: catForm.color, color: '#000', fontWeight: 750, marginTop: 8 }}>
                          {editingCategory ? 'Save Changes' : 'Create Category'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </main>

      {/* GLAZZED NEON CSS MODULE */}
      <style>{`
        /* Top Layout Wrappers */
        .glazzed-admin-layout {
          display: flex;
          height: 100dvh;
          width: 100%;
          background: linear-gradient(135deg, #0d0f1b 0%, #151829 100%);
          color: #e2e8f0;
          font-family: var(--font-prompt), var(--font-noto-sans-thai), var(--font-outfit), 'Prompt', 'Noto Sans Thai', sans-serif;
          overflow: hidden;
        }

        /* SIDEBAR (Frosted dark bar) */
        .glazzed-sidebar {
          width: 260px;
          background: rgba(10, 11, 20, 0.85);
          backdrop-filter: blur(30px);
          border-right: 1px solid rgba(255, 255, 255, 0.04);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          padding: 24px 0;
          z-index: 100;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 24px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .brand-logo {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: linear-gradient(135deg, #ffa800, #ff4c29);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: 0 4px 15px rgba(255, 168, 0, 0.3);
        }

        .brand-name {
          font-size: 16px;
          font-weight: 800;
          color: #fff;
          display: block;
          letter-spacing: -0.3px;
        }

        .brand-badge {
          font-size: 9px;
          font-weight: 700;
          color: #ffa800;
          letter-spacing: 1px;
        }

        /* Profile Block */
        .sidebar-profile {
          padding: 24px;
          text-align: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .avatar-wrapper {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto 12px;
        }

        .profile-img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }

        .online-indicator {
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #10b981;
          border: 2px solid #0a0b14;
          box-shadow: 0 0 10px #10b981;
        }

        .profile-name {
          font-size: 16px;
          font-weight: 700;
          color: #fff;
        }

        .profile-role {
          font-size: 11px;
          color: #8c92b2;
          margin-top: 2px;
        }

        .profile-stats {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          margin-top: 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: var(--radius-sm);
          padding: 8px 4px;
        }

        .p-stat {
          display: flex;
          flex-direction: column;
        }

        .p-stat-val {
          font-size: 13px;
          font-weight: 750;
          color: #fff;
        }

        .p-stat-lbl {
          font-size: 9px;
          color: #8c92b2;
          text-transform: uppercase;
        }

        /* Sidebar Navigation Menu */
        .sidebar-menu {
          padding: 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: var(--radius-sm);
          color: #8c92b2;
          font-size: 13px;
          font-weight: 600;
          background: transparent;
          border: none;
          cursor: pointer;
          width: 100%;
          text-align: left;
          transition: all var(--transition-fast);
        }

        .menu-item:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.03);
        }

        .menu-item.active {
          background: linear-gradient(90deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%);
          border-left: 3px solid #3b82f6;
          color: #fff;
          padding-left: 13px;
        }

        .menu-item-action {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: var(--radius-sm);
          color: #ffa800;
          background: rgba(255, 168, 0, 0.06);
          border: 1px dashed rgba(255, 168, 0, 0.2);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          margin-top: 12px;
          transition: all var(--transition-fast);
        }

        .menu-item-action:hover {
          background: #ffa800;
          color: #000;
          box-shadow: 0 4px 15px rgba(255, 168, 0, 0.2);
        }

        .sidebar-footer {
          padding: 16px;
        }

        .sidebar-footer-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-sm);
          color: #8c92b2;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          transition: all var(--transition-fast);
        }

        .sidebar-footer-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.2);
        }

        /* MAIN PANEL */
        .glazzed-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: linear-gradient(180deg, #101424 0%, #151829 100%);
        }

        .glazzed-header {
          height: 64px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          padding: 0 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
          background: rgba(16, 20, 36, 0.4);
          backdrop-filter: blur(10px);
        }

        .header-search {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          padding: 8px 16px;
          border-radius: 50px;
          width: 320px;
        }

        .header-search input {
          background: transparent;
          border: none;
          outline: none;
          color: #fff;
          font-size: 13px;
          flex: 1;
        }

        .search-icon {
          color: #8c92b2;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .header-date {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #8c92b2;
          font-weight: 500;
        }

        .header-map-link {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: #3b82f6;
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          border-radius: 50px;
          text-decoration: none;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
          transition: all var(--transition-fast);
        }

        .header-map-link:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        .glazzed-body {
          flex: 1;
          overflow-y: auto;
          padding: 32px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.05) transparent;
        }

        /* DASHBOARD CONTENT */
        .glazzed-stats-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 24px;
          margin-bottom: 32px;
        }

        .stats-intro-title {
          font-size: 24px;
          font-weight: 800;
          color: #fff;
        }

        .stats-intro-desc {
          font-size: 13px;
          color: #8c92b2;
          margin-top: 4px;
          max-width: 480px;
        }

        .glazzed-circular-stats {
          display: flex;
          gap: 16px;
        }

        .circle-stat-card {
          width: 110px;
          height: 110px;
          border-radius: 50%;
          background: rgba(30, 36, 62, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        }

        .circle-stat-val {
          font-size: 20px;
          font-weight: 850;
          color: #fff;
        }

        .circle-stat-lbl {
          font-size: 9px;
          color: #8c92b2;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 2px;
        }

        /* Charts Section */
        .charts-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 24px;
          margin-bottom: 32px;
        }

        @media (max-width: 1024px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }
        }

        .glazzed-card {
          background: rgba(30, 36, 62, 0.25);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: var(--radius-lg);
          padding: 24px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .card-header h3 {
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          color: #fff;
          letter-spacing: 0.8px;
        }

        .card-header-badge {
          font-size: 11px;
          font-weight: 700;
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.12);
          padding: 4px 10px;
          border-radius: 50px;
        }

        .card-header-link {
          background: none;
          border: none;
          color: #ffa800;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .svg-chart {
          width: 100%;
          height: auto;
          overflow: visible;
        }

        /* Donut Chart styling */
        .donut-container {
          display: flex;
          align-items: center;
          justify-content: space-around;
          gap: 16px;
        }

        .donut-ring-wrapper {
          position: relative;
        }

        .donut-ring {
          width: 110px;
          height: 110px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
        }

        .donut-center {
          width: 78px;
          height: 78px;
          background: #111424;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .donut-val {
          font-size: 20px;
          font-weight: 850;
          color: #fff;
        }

        .donut-lbl {
          font-size: 9px;
          color: #8c92b2;
          text-transform: uppercase;
        }

        .donut-legend {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #8c92b2;
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: block;
        }

        /* Dashboard Split Row */
        .dashboard-split-row {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 24px;
        }

        @media (max-width: 900px) {
          .dashboard-split-row {
            grid-template-columns: 1fr;
          }
        }

        /* Recent reviews list */
        .messages-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .message-item {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-sm);
          padding: 14px;
          transition: all var(--transition-fast);
        }

        .message-item:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .message-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .message-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 750;
          color: #fff;
          background: rgba(255,255,255,0.03);
        }

        .message-name {
          font-size: 13px;
          font-weight: 700;
          color: #fff;
        }

        .message-time {
          font-size: 10px;
          color: #8c92b2;
          display: block;
        }

        .message-body {
          font-size: 12.5px;
          line-height: 1.5;
          color: #8c92b2;
        }

        /* Alerts boxes */
        .alerts-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .alert-box {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: var(--radius-sm);
          font-size: 12.5px;
          font-weight: 500;
          border: 1px solid transparent;
        }

        .alert-box.success {
          background: rgba(16, 185, 129, 0.04);
          border-color: rgba(16, 185, 129, 0.15);
          color: #34d399;
        }

        .alert-box.success .alert-dot-indicator {
          background-color: #10b981;
          box-shadow: 0 0 8px #10b981;
        }

        .alert-box.warning {
          background: rgba(245, 158, 11, 0.04);
          border-color: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
        }

        .alert-box.warning .alert-dot-indicator {
          background-color: #f59e0b;
          box-shadow: 0 0 8px #f59e0b;
        }

        .alert-box.info {
          background: rgba(59, 130, 246, 0.04);
          border-color: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
        }

        .alert-box.info .alert-dot-indicator {
          background-color: #3b82f6;
          box-shadow: 0 0 8px #3b82f6;
        }

        .alert-dot-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* TABLE VIEW (TAB 2) */
        .glazzed-neon-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #ffa800;
          color: #000;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          border-radius: 50px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(255, 168, 0, 0.3);
          transition: all var(--transition-fast);
        }

        .glazzed-neon-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.1);
        }

        .table-wrapper {
          overflow-x: auto;
          width: 100%;
        }

        .glazzed-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 13px;
        }

        .glazzed-table th {
          padding: 16px 20px;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 9.5px;
          color: #8c92b2;
          letter-spacing: 0.8px;
          border-bottom: 1.5px solid rgba(255, 255, 255, 0.05);
        }

        .glazzed-table td {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          vertical-align: middle;
        }

        .glazzed-table tbody tr:hover {
          background: rgba(255, 255, 255, 0.015);
        }

        .editing-row {
          background: rgba(59, 130, 246, 0.05) !important;
        }

        .place-row-name {
          font-weight: 750;
          color: #fff;
          font-size: 13.5px;
        }

        .place-row-notes {
          font-size: 11px;
          color: #8c92b2;
          max-width: 280px;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
          margin-top: 2px;
          font-weight: 400;
        }

        .category-badge-pill {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
        }

        .place-row-price {
          font-weight: 800;
          color: #fff;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        .place-row-rating {
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: 750;
          color: #fff;
        }

        /* Action Buttons */
        .action-buttons-wrap {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .action-btn {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: #8c92b2;
          transition: all var(--transition-fast);
        }

        .action-btn.edit-btn:hover {
          background: #3b82f6;
          border-color: #3b82f6;
          color: #fff;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);
        }

        .action-btn.delete-btn:hover {
          background: #ef4444;
          border-color: #ef4444;
          color: #fff;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
        }

        .table-loading {
          padding: 80px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: #8c92b2;
        }

        .table-loading svg {
          width: 32px;
          height: 32px;
          color: #3b82f6;
        }

        .table-empty {
          padding: 80px 20px;
          text-align: center;
          color: #8c92b2;
        }

        /* MODAL POPUP SECTION */
        .glazzed-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1100;
          background: rgba(8, 10, 20, 0.65);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fade-in var(--transition-fast) ease-out;
        }

        .glazzed-modal-content {
          background: rgba(22, 28, 54, 0.88);
          backdrop-filter: blur(30px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-lg);
          width: calc(100% - 32px);
          max-width: 580px;
          max-height: 85dvh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 80px rgba(0, 0, 0, 0.5);
          animation: scale-up var(--transition-base) cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes scale-up {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .drawer-header-strip {
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.01);
        }

        .drawer-header-strip h4 {
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #fff;
        }

        .drawer-close-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1.5px solid rgba(255, 255, 255, 0.08);
          color: #8c92b2;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: all var(--transition-fast);
        }

        .drawer-close-btn:hover {
          color: #fff;
          border-color: #fff;
        }

        .drawer-body-wrap {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        /* Glassmorphic overrides on standard forms */
        .glazzed-modal-content .admin-card {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }

        .glazzed-modal-content .admin-card-header {
          display: none !important; /* Hide redundant inner header */
        }

        .glazzed-modal-content .admin-form {
          padding: 0 !important;
        }

        .glazzed-modal-content .form-input,
        .glazzed-modal-content .form-select,
        .glazzed-modal-content .form-textarea {
          background: rgba(255, 255, 255, 0.02) !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
          color: #fff !important;
        }

        .glazzed-modal-content .form-input:focus,
        .glazzed-modal-content .form-select:focus,
        .glazzed-modal-content .form-textarea:focus {
          border-color: #3b82f6 !important;
          background: rgba(255, 255, 255, 0.04) !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15) !important;
        }

        .glazzed-modal-content .submit-btn {
          color: #000 !important;
          font-weight: 750 !important;
        }

        @media (max-width: 1024px) {
          .glazzed-crud-split {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
