'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Star, MapPin, Globe, Tag, ChevronRight, Share2, Check } from 'lucide-react';
import { Place, DbCategory, CATEGORY_EMOJIS, CATEGORY_COLORS } from '@/types/place';
import { getCountryForPlace, getCountryFlag, getProvinceFromGoogleData } from '@/lib/country';
import './rankings.css';

// ─── Helper: "ยังไม่ได้ไป" detection ───────────────────────────────────────────
function isNotVisited(p: Place): boolean {
  return Boolean(
    p.personal_notes &&
    (p.personal_notes.includes('ยังไม่ได้ไป') ||
     p.personal_notes.toLowerCase().includes('grub & gulp') ||
     p.personal_notes.toLowerCase().includes('grup & gulp'))
  );
}

// ─── Category Emoji Map with Fallbacks for All Common Food Categories ───────────
const FALLBACK_CATEGORY_EMOJIS: Record<string, string> = {
  'BBQ': '🍖',
  'Bar': '🍸',
  'Buffet': '🍱',
  'Cafe': '☕',
  'Dessert': '🍰',
  'Dim Sum': '🥟',
  'Noodle': '🍜',
  'Pizza': '🍕',
  'Restaurant': '🍽️',
  'Sea Food': '🦞',
  'Sushi': '🍣',
  'Fine Dining': '🥂',
  'Street Food': '🌮',
  'Bar & Cafe': '☕',
  'All': '🗺️',
};

export default function RankingsPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states: Default to G&G Rank tab on the left!
  const [selectedCountry, setSelectedCountry] = useState<string>('ทั้งหมด');
  const [selectedProvince, setSelectedProvince] = useState<string>('ทั้งหมด');
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [scoreMode, setScoreMode] = useState<'gg' | 'google'>('gg');
  const [sharedPlaceId, setSharedPlaceId] = useState<string | null>(null);

  const handleSharePlace = async (e: React.MouseEvent, p: Place) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/place/${p.id}`;
    const shareData = {
      title: `${p.name} — Grub & Gulp Around the World`,
      text: `พิกัดร้านเด็ด ${p.name} (${p.category}) บน Grub & Gulp Around the World`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share canceled:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setSharedPlaceId(String(p.id));
        setTimeout(() => setSharedPlaceId(null), 2500);
      } catch (err) {
        console.error('Clipboard copy failed:', err);
      }
    }
  };

  // Load data
  const loadData = useCallback(async () => {
    try {
      const { getPlaces, getCategories } = await import('@/lib/places');
      const [placesData, catsData] = await Promise.all([getPlaces(), getCategories()]);
      setPlaces(placesData);
      setCategories(catsData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Helper to get category emoji dynamically
  const getCategoryEmoji = useCallback((catName: string): string => {
    const dbCat = categories.find((c) => c.name === catName);
    if (dbCat && dbCat.emoji) return dbCat.emoji;
    if (CATEGORY_EMOJIS[catName]) return CATEGORY_EMOJIS[catName];
    if (FALLBACK_CATEGORY_EMOJIS[catName]) return FALLBACK_CATEGORY_EMOJIS[catName];
    return '🍽️';
  }, [categories]);

  // ─── Compute unique countries (sorted by place count desc) ────────────────────
  const uniqueCountries = useMemo(() => {
    const counts: Record<string, number> = {};
    places.forEach((p) => {
      const c = getCountryForPlace(p.lat, p.lng, p.google_data);
      counts[c] = (counts[c] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name]) => name);
  }, [places]);

  // ─── Available provinces for selected country ─────────────────────────────────
  const availableProvinces = useMemo(() => {
    const provSet = new Set<string>();
    places.forEach((p) => {
      const c = getCountryForPlace(p.lat, p.lng, p.google_data);
      if (selectedCountry === 'ทั้งหมด' || c === selectedCountry) {
        const prov = getProvinceFromGoogleData(p.google_data);
        if (prov) provSet.add(prov);
      }
    });
    return Array.from(provSet).sort();
  }, [places, selectedCountry]);

  // ─── Available categories used by places ──────────────────────────────────────
  const usedCategories = useMemo(() => {
    const catSet = new Set<string>();
    places.forEach((p) => catSet.add(p.category));
    return Array.from(catSet).sort();
  }, [places]);

  // Reset province when country changes
  useEffect(() => {
    setSelectedProvince('ทั้งหมด');
  }, [selectedCountry]);

  // ─── Filtered & Sorted Rankings (LIMITED TO TOP 10) ───────────────────────────
  const rankedPlaces = useMemo(() => {
    let filtered = places.filter((p) => {
      // Country filter
      if (selectedCountry !== 'ทั้งหมด') {
        const c = getCountryForPlace(p.lat, p.lng, p.google_data);
        if (c !== selectedCountry) return false;
      }
      // Province filter
      if (selectedProvince !== 'ทั้งหมด') {
        const prov = getProvinceFromGoogleData(p.google_data);
        if (prov !== selectedProvince) return false;
      }
      // Category filter
      if (selectedCategory !== 'ทั้งหมด') {
        if (p.category !== selectedCategory) return false;
      }
      // G&G Rank mode: exclude not-visited
      if (scoreMode === 'gg') {
        if (isNotVisited(p)) return false;
        if (!p.rating || p.rating <= 0) return false;
      }
      return true;
    });

    // Sort:
    // G&G Rank mode: sort by exact float rating (no rounding up)
    if (scoreMode === 'gg') {
      filtered.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        const rA = a.google_data?.rating ?? 0;
        const rB = b.google_data?.rating ?? 0;
        return rB - rA;
      });
    } else {
      // Google Rank mode
      filtered.sort((a, b) => {
        const rA = a.google_data?.rating ?? a.google_data?.google_rating ?? 0;
        const rB = b.google_data?.rating ?? b.google_data?.google_rating ?? 0;
        if (rB !== rA) return rB - rA;
        const cA = a.google_data?.user_ratings_total ?? 0;
        const cB = b.google_data?.user_ratings_total ?? 0;
        return cB - cA;
      });
    }

    // STRICTLY LIMIT TO TOP 10 PLACES
    return filtered.slice(0, 10);
  }, [places, selectedCountry, selectedProvince, selectedCategory, scoreMode]);

  const top3 = rankedPlaces.slice(0, 3);
  const restPlaces = rankedPlaces.slice(3);

  // ─── Stats ────────────────────────────────────────────────────────────────────
  const totalPlaces = places.length;
  const totalVisited = places.filter(p => !isNotVisited(p)).length;
  const totalCountries = uniqueCountries.length;

  const getMedalEmoji = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  if (loading) {
    return (
      <div className="rankings-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>กำลังโหลดอันดับร้านเด็ด...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rankings-page">
      {/* Back button */}
      <Link href="/" className="rankings-back-btn">
        <ArrowLeft size={14} />
        <span>แผนที่</span>
      </Link>

      {/* Hero */}
      <div className="rankings-hero">
        <span className="hero-trophy">🏆</span>
        <h1 className="hero-title">10 อันดับร้านเด็ด</h1>
        <p className="hero-subtitle">จัดอันดับ 10 ร้านอาหาร & เครื่องดื่มที่ดีที่สุดรอบโลก</p>

        {/* Stats */}
        <div className="stats-bar">
          <div className="stat-box">
            <div className="stat-box-value">{totalPlaces}</div>
            <div className="stat-box-label">ร้านทั้งหมด</div>
          </div>
          <div className="stat-box">
            <div className="stat-box-value">{totalVisited}</div>
            <div className="stat-box-label">ไปกินมาแล้ว</div>
          </div>
          <div className="stat-box">
            <div className="stat-box-value">{totalCountries}</div>
            <div className="stat-box-label">ประเทศ</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="rankings-controls">
        <div className="controls-card">
          <div className="controls-row">
            {/* Country */}
            <div className="control-group">
              <div className="control-label">
                <Globe size={12} />
                <span>ประเทศ</span>
              </div>
              <select
                className="control-select"
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
              >
                <option value="ทั้งหมด">🌍 ทุกประเทศ</option>
                {uniqueCountries.map((c) => (
                  <option key={c} value={c}>
                    {getCountryFlag(c)} {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Province */}
            <div className="control-group">
              <div className="control-label">
                <MapPin size={12} />
                <span>จังหวัด / เมือง</span>
              </div>
              <select
                className="control-select"
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
              >
                <option value="ทั้งหมด">📍 ทั้งหมด</option>
                {availableProvinces.map((prov) => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="control-group">
              <div className="control-label">
                <Tag size={12} />
                <span>หมวดหมู่</span>
              </div>
              <select
                className="control-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="ทั้งหมด">🗺️ ทุกหมวดหมู่</option>
                {usedCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {getCategoryEmoji(cat)} {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Score mode toggle: G&G Rank with Crown 👑 icon */}
          <div className="score-toggle">
            <button
              type="button"
              className={`score-tab ${scoreMode === 'gg' ? 'active' : ''}`}
              onClick={() => setScoreMode('gg')}
            >
              <span className="score-tab-icon">👑</span>
              <span>G&G Rank</span>
            </button>
            <button
              type="button"
              className={`score-tab ${scoreMode === 'google' ? 'active' : ''}`}
              onClick={() => setScoreMode('google')}
            >
              <span className="score-tab-icon">⭐</span>
              <span>Google Rank</span>
            </button>
          </div>
        </div>
      </div>

      {/* Podium Section: Top 3 */}
      {top3.length > 0 && (
        <div className="podium-section">
          <div className="podium-row">
            {[1, 0, 2].map((idx) => {
              const p = top3[idx];
              if (!p) return null;
              const country = getCountryForPlace(p.lat, p.lng, p.google_data);
              const flag = getCountryFlag(country);
              const province = getProvinceFromGoogleData(p.google_data);
              const catEmoji = getCategoryEmoji(p.category);
              const catColor = CATEGORY_COLORS[p.category] || '#E74C3C';
              const notVisited = isNotVisited(p);
              const actualRank = idx + 1;

              return (
                <div
                  key={p.id}
                  className={`podium-card rank-${actualRank}`}
                  onClick={() => {
                    if (p.google_maps_url) {
                      window.open(p.google_maps_url, '_blank');
                    }
                  }}
                >
                  {actualRank === 1 && <div className="podium-glow" />}
                  <button
                    type="button"
                    onClick={(e) => handleSharePlace(e, p)}
                    title="แชร์การ์ดร้านนี้"
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      background: 'rgba(0, 0, 0, 0.06)',
                      border: 'none',
                      borderRadius: '50%',
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      zIndex: 5,
                    }}
                  >
                    {sharedPlaceId === String(p.id) ? <Check size={13} style={{ color: '#22c55e' }} /> : <Share2 size={13} />}
                  </button>
                  <span className="podium-rank-num">#{actualRank}</span>
                  <span className="podium-medal">{getMedalEmoji(actualRank)}</span>
                  <div className="podium-name">{p.name}</div>
                  <div className="podium-meta">
                    <span>{flag}</span>
                    <span>{province || country}</span>
                  </div>

                  {scoreMode === 'gg' ? (
                    <>
                      <div className="podium-score">
                        👑 {p.rating ? p.rating.toFixed(2) : '-'}
                      </div>
                      <div className="podium-score-label">
                        Google {(p.google_data?.rating ?? 0).toFixed(1)} ⭐ ({(p.google_data?.user_ratings_total ?? 0).toLocaleString()} รีวิว)
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="podium-score">
                        ⭐ {(p.google_data?.rating ?? 0).toFixed(1)}
                      </div>
                      <div className="podium-score-label">
                        {(p.google_data?.user_ratings_total ?? 0).toLocaleString()} รีวิว
                        <div style={{ marginTop: 2, fontWeight: 700, color: notVisited ? '#f97316' : '#ffa800' }}>
                          {notVisited ? '👑 G&G ยังไม่ได้ไป' : `👑 G&G Score: ${p.rating.toFixed(2)}`}
                        </div>
                      </div>
                    </>
                  )}

                  <span className="podium-category-tag" style={{ color: catColor }}>
                    {catEmoji} {p.category}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rest of Rankings (Top 4 to Top 10) */}
      <div className="rankings-list-section">
        <div className="rankings-list-header">
          <div className="rankings-list-title">
            <Trophy size={16} style={{ color: 'var(--accent-primary)' }} />
            <span>Top 10 อันดับแรก</span>
          </div>
          <span className="rankings-count">{rankedPlaces.length} ร้าน</span>
        </div>

        {rankedPlaces.length === 0 ? (
          <div className="rankings-empty">
            <span className="rankings-empty-emoji">🔍</span>
            <div className="rankings-empty-text">ไม่พบร้านตามเงื่อนไขที่เลือก</div>
            <div className="rankings-empty-sub">
              {scoreMode === 'gg'
                ? 'ลองเปลี่ยนตัวกรอง หรือร้านอาจยังไม่ได้ให้คะแนน G&G Score'
                : 'ลองเปลี่ยนตัวกรองประเทศ จังหวัด หรือหมวดหมู่'}
            </div>
          </div>
        ) : (
          <div className="rankings-list">
            {restPlaces.map((p, i) => {
              const rank = i + 4; // 4th to 10th
              const country = getCountryForPlace(p.lat, p.lng, p.google_data);
              const flag = getCountryFlag(country);
              const province = getProvinceFromGoogleData(p.google_data);
              const catEmoji = getCategoryEmoji(p.category);
              const catColor = CATEGORY_COLORS[p.category] || '#E74C3C';
              const notVisited = isNotVisited(p);

              return (
                <div
                  key={p.id}
                  className="rank-card"
                  style={{ '--rank-accent': catColor } as React.CSSProperties}
                  onClick={() => {
                    if (p.google_maps_url) {
                      window.open(p.google_maps_url, '_blank');
                    }
                  }}
                >
                  <div className={`rank-position ${rank <= 10 ? 'top-10' : ''}`}>
                    {rank}
                  </div>
                  <div className="rank-info">
                    <div className="rank-name">{p.name}</div>
                    <div className="rank-details">
                      <span>{flag} {province || country}</span>
                      <span className="rank-detail-dot" />
                      <span style={{ color: catColor }}>{catEmoji} {p.category}</span>
                      <span className="rank-detail-dot" />
                      {notVisited ? (
                        <span style={{ color: '#f97316', fontWeight: 600 }}>👑 G&G ยังไม่ได้ไป</span>
                      ) : (
                        <span style={{ color: '#ffa800', fontWeight: 600 }}>👑 G&G Score: {p.rating.toFixed(2)}</span>
                      )}
                    </div>
                  </div>

                  <div className="rank-scores">
                    {scoreMode === 'gg' ? (
                      <>
                        <div className="rank-main-score gg">
                          <span style={{ fontSize: 14 }}>👑</span>
                          <span>{p.rating ? p.rating.toFixed(2) : '-'}</span>
                        </div>
                        <div className="rank-sub-score">
                          Google {(p.google_data?.rating ?? 0).toFixed(1)} ⭐
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="rank-main-score google">
                          <span style={{ fontSize: 14 }}>⭐</span>
                          <span>{(p.google_data?.rating ?? 0).toFixed(1)}</span>
                        </div>
                        <div className="rank-sub-score">
                          {(p.google_data?.user_ratings_total ?? 0).toLocaleString()} รีวิว
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleSharePlace(e, p)}
                    title="แชร์การ์ดร้านนี้"
                    style={{
                      background: 'rgba(0, 0, 0, 0.04)',
                      border: 'none',
                      borderRadius: '50%',
                      width: 30,
                      height: 30,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      flexShrink: 0,
                      marginRight: 4,
                    }}
                  >
                    {sharedPlaceId === String(p.id) ? <Check size={14} style={{ color: '#22c55e' }} /> : <Share2 size={14} />}
                  </button>
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)', opacity: 0.4, flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
