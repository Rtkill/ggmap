'use client';

import Image from 'next/image';
import { useState, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Settings, Globe, MapPin, Compass, UtensilsCrossed, Search, X, Trophy } from 'lucide-react';
import { Place, DbCategory } from '@/types/place';
import CategoryFilter from '@/components/Map/CategoryFilter';
import PlaceModal from '@/components/PlaceModal';
import { getCountryFromLatLng, getCountryForPlace, getCountryFlag, getProvinceFromGoogleData } from '@/lib/country';

// Dynamic import for Leaflet (no SSR)
const MapView = dynamic(() => import('@/components/Map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="map-loading">
      <div className="map-loading-inner">
        <div className="map-loading-spinner" />
        <p>กำลังโหลดแผนที่...</p>
      </div>
    </div>
  ),
});

export default function HomePage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['All']);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Check if admin is logged in
  useEffect(() => {
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setIsAdminLoggedIn(true);
        }
      })
      .catch((err) => console.log('Auth check error:', err));
  }, []);

  // Country & Province Geolocation & selection states
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedProvince, setSelectedProvince] = useState<string>('All');
  const [detectedCountry, setDetectedCountry] = useState<string>('');
  const [detectedCoords, setDetectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocationLoaded, setIsLocationLoaded] = useState(false);

  // Dynamic categories list
  const [categories, setCategories] = useState<DbCategory[]>([]);

  const loadPlaces = useCallback(async () => {
    try {
      const { getPlaces } = await import('@/lib/places');
      const data = await getPlaces();
      setPlaces(data);
    } catch (err) {
      console.error('Failed to load places:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const { getCategories } = await import('@/lib/places');
      const cats = await getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  useEffect(() => {
    loadPlaces();
    loadCategories();
  }, [loadPlaces, loadCategories]);

  // Auto-select place if ?place=ID parameter is present in URL
  useEffect(() => {
    if (places.length === 0) return;
    const searchParams = new URLSearchParams(window.location.search);
    const placeId = searchParams.get('place');
    if (placeId) {
      const found = places.find((p) => String(p.id) === String(placeId));
      if (found) {
        const country = getCountryForPlace(found.lat, found.lng, found.google_data);
        if (country) setSelectedCountry(country);
        setSelectedPlace(found);
      }
    }
  }, [places]);

  // Compute unique countries that actually contain places in our database, sorted by place count descending
  const uniqueCountries = useMemo(() => {
    const counts: Record<string, number> = {};
    places.forEach((p) => {
      const c = getCountryForPlace(p.lat, p.lng, p.google_data);
      counts[c] = (counts[c] ?? 0) + 1;
    });
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  }, [places]);

  // Handle location detection on mount
  useEffect(() => {
    if (uniqueCountries.length === 0 || isLocationLoaded) return;

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setDetectedCoords({ lat, lng });

          const matchedCountry = getCountryFromLatLng(lat, lng);
          setDetectedCountry(matchedCountry);

          if (uniqueCountries.includes(matchedCountry)) {
            setSelectedCountry(matchedCountry);
          } else {
            setSelectedCountry(uniqueCountries[0] || 'Thailand');
          }
          setIsLocationLoaded(true);
        },
        (err) => {
          console.warn('Geolocation failed or denied:', err);
          setSelectedCountry(uniqueCountries[0] || 'Thailand');
          setIsLocationLoaded(true);
        },
        { timeout: 5000, maximumAge: 60000 }
      );
    } else {
      setSelectedCountry(uniqueCountries[0] || 'Thailand');
      setIsLocationLoaded(true);
    }
  }, [uniqueCountries, isLocationLoaded]);

  // Compute available provinces in selected country
  const availableProvinces = useMemo(() => {
    if (!selectedCountry) return [];
    const provSet = new Set<string>();
    places.forEach((p) => {
      if (getCountryForPlace(p.lat, p.lng, p.google_data) === selectedCountry) {
        const prov = getProvinceFromGoogleData(p.google_data);
        if (prov) provSet.add(prov);
      }
    });
    return Array.from(provSet).sort();
  }, [places, selectedCountry]);

  // Auto-select nearest province if user GPS is available and matches a province with pins
  useEffect(() => {
    if (!selectedCountry || availableProvinces.length === 0) return;

    if (detectedCoords && detectedCountry === selectedCountry) {
      let minDistance = Infinity;
      let nearestProv = '';

      places.forEach((p) => {
        if (getCountryForPlace(p.lat, p.lng, p.google_data) === selectedCountry) {
          const prov = getProvinceFromGoogleData(p.google_data);
          if (prov && availableProvinces.includes(prov)) {
            const dist = Math.hypot(p.lat - detectedCoords.lat, p.lng - detectedCoords.lng);
            if (dist < minDistance) {
              minDistance = dist;
              nearestProv = prov;
            }
          }
        }
      });

      if (nearestProv && minDistance < 1.5) {
        setSelectedProvince(nearestProv);
      }
    }
  }, [selectedCountry, availableProvinces, detectedCoords, detectedCountry, places]);

  // Category counts based on selected country & province
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const scopePlaces = places.filter((p) => {
      const countryMatch = getCountryForPlace(p.lat, p.lng, p.google_data) === selectedCountry;
      if (!countryMatch) return false;

      if (selectedProvince !== 'All') {
        const prov = getProvinceFromGoogleData(p.google_data);
        if (prov !== selectedProvince) return false;
      }
      return true;
    });

    scopePlaces.forEach((p) => {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    });
    return counts;
  }, [places, selectedCountry, selectedProvince]);

  // Unvisited places count in active country & province (for admin filter pill)
  const unvisitedCount = useMemo(() => {
    return places.filter((p) => {
      const countryMatch = getCountryForPlace(p.lat, p.lng, p.google_data) === selectedCountry;
      if (!countryMatch) return false;

      if (selectedProvince !== 'All') {
        const prov = getProvinceFromGoogleData(p.google_data);
        if (prov !== selectedProvince) return false;
      }

      const isNotVisited = Boolean(
        p.personal_notes &&
        (p.personal_notes.includes('ยังไม่ได้ไป') ||
         p.personal_notes.toLowerCase().includes('grub & gulp') ||
         p.personal_notes.toLowerCase().includes('grup & gulp'))
      );

      return isNotVisited;
    }).length;
  }, [places, selectedCountry, selectedProvince]);

  // Places filtered by selected country, province, categories & searchQuery
  const filteredPlaces = useMemo(() => {
    const isAll = selectedCategories.length === 0 || selectedCategories.includes('All');
    const isUnvisitedFilter = selectedCategories.includes('ยังไม่ได้ไป');
    const query = searchQuery.trim().toLowerCase();

    return places.filter((p) => {
      const countryMatch = getCountryForPlace(p.lat, p.lng, p.google_data) === selectedCountry;
      if (!countryMatch) return false;

      if (selectedProvince !== 'All') {
        const prov = getProvinceFromGoogleData(p.google_data);
        if (prov !== selectedProvince) return false;
      }

      const isNotVisited = Boolean(
        p.personal_notes &&
        (p.personal_notes.includes('ยังไม่ได้ไป') ||
         p.personal_notes.toLowerCase().includes('grub & gulp') ||
         p.personal_notes.toLowerCase().includes('grup & gulp'))
      );

      if (isUnvisitedFilter && !isNotVisited) return false;

      const remainingCategories = selectedCategories.filter((c) => c !== 'ยังไม่ได้ไป');
      if (remainingCategories.length > 0 && !remainingCategories.includes('All')) {
        if (!remainingCategories.includes(p.category)) return false;
      }

      if (query) {
        const nameMatch = p.name.toLowerCase().includes(query);
        const notesMatch = p.personal_notes?.toLowerCase().includes(query);
        const catMatch = p.category.toLowerCase().includes(query);
        return nameMatch || notesMatch || catMatch;
      }

      return true;
    });
  }, [places, selectedCountry, selectedProvince, selectedCategories, searchQuery]);

  // Autocomplete matching results for search dropdown
  const matchingSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.trim().toLowerCase();

    return places.filter((p) => {
      const countryMatch = getCountryForPlace(p.lat, p.lng, p.google_data) === selectedCountry;
      if (!countryMatch) return false;

      return (
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        (p.personal_notes && p.personal_notes.toLowerCase().includes(query))
      );
    }).slice(0, 8);
  }, [places, selectedCountry, searchQuery]);

  const filteredCount = filteredPlaces.length;

  return (
    <div className="app-layout">
      {/* Top Nav */}
      <nav className="top-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Link href="/" className="nav-brand" style={{ flexShrink: 0 }}>
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
            <span className="nav-title">Grub & Gulp</span>
            <span className="nav-subtitle">Around the World</span>
          </div>
        </Link>

        {/* Right Side: Rankings Button + Search Box + Places Count Badge */}
        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <Link
            href="/rankings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, rgba(255, 168, 0, 0.12), rgba(255, 140, 0, 0.08))',
              border: '1px solid rgba(255, 168, 0, 0.25)',
              borderRadius: '20px',
              padding: '5px 12px',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(255, 168, 0, 0.08)',
            }}
          >
            <Trophy size={14} style={{ color: '#ffa800' }} />
            <span>อันดับร้านเด็ด</span>
          </Link>
          {/* Top Nav Search Box with Autocomplete Dropdown */}
          <div className="nav-search-wrapper" style={{ position: 'relative', width: '200px' }}>
            <div className="nav-search-input-box" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(0, 0, 0, 0.04)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: '20px',
              padding: '4px 10px',
              transition: 'all 0.2s ease',
            }}>
              <Search size={13} style={{ color: '#64748b', flexShrink: 0 }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาร้าน..."
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  width: '100%',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#94a3b8' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {searchQuery.trim() !== '' && (
              <div className="nav-search-dropdown" style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: '280px',
                background: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                maxHeight: '320px',
                overflowY: 'auto',
                zIndex: 1000,
                padding: '6px 0',
              }}>
                {matchingSearchResults.length === 0 ? (
                  <div style={{ padding: '12px 16px', fontSize: '12.5px', color: '#94a3b8', textAlign: 'center' }}>
                    ไม่พบร้านอาหารที่ตรงกับคำค้นหา
                  </div>
                ) : (
                  matchingSearchResults.map((place) => {
                    const country = getCountryForPlace(place.lat, place.lng, place.google_data);
                    const flag = getCountryFlag(country);
                    return (
                      <div
                        key={place.id}
                        onClick={() => {
                          setSelectedPlace(place);
                          setSearchQuery('');
                        }}
                        style={{
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          borderBottom: '1px solid rgba(0, 0, 0, 0.03)',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>{place.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: 1 }}>
                            {flag} {country} · {place.category}
                          </div>
                        </div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#eab308' }}>
                          ★ {place.rating.toFixed(2)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="stat-item" style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={14} />
            <span><strong>{loading ? '...' : filteredCount}</strong> ร้าน</span>
          </div>
        </div>
      </nav>

      {/* Ultra-Compact Combined Single-Row Location Filter Bar */}
      {uniqueCountries.length > 0 && (
        <div className="location-compact-bar">
          {/* Country Selector */}
          <div className="compact-selector-group">
            <span className="compact-label">🌍</span>
            <div className="compact-pills-container">
              {uniqueCountries.map((country) => (
                <button
                  key={country}
                  onClick={() => {
                    setSelectedCountry(country);
                    setSelectedProvince('All');
                    setSelectedCategories(['All']);
                  }}
                  className={`compact-pill-btn ${selectedCountry === country ? 'active' : ''}`}
                >
                  <span className="flag-icon">{getCountryFlag(country)}</span>
                  <span>{country}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="compact-divider" />

          {/* Province Selector (On Same Row) */}
          <div className="compact-selector-group">
            <span className="compact-label">📍</span>
            <div className="compact-pills-container">
              <button
                onClick={() => {
                  setSelectedProvince('All');
                  setSelectedCategories(['All']);
                }}
                className={`compact-pill-btn prov ${selectedProvince === 'All' ? 'active' : ''}`}
              >
                ทั้งหมด ({selectedCountry})
              </button>

              {availableProvinces.map((prov) => (
                <button
                  key={prov}
                  onClick={() => {
                    setSelectedProvince(prov);
                    setSelectedCategories(['All']);
                  }}
                  className={`compact-pill-btn prov ${selectedProvince === prov ? 'active' : ''}`}
                >
                  {prov}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <CategoryFilter
        selectedCategories={selectedCategories}
        onChange={setSelectedCategories}
        counts={categoryCounts}
        categories={categories}
        isAdminLoggedIn={isAdminLoggedIn}
        unvisitedCount={unvisitedCount}
      />



      {/* Map (Pass places matching active country, province & category filters) */}
      <MapView
        places={filteredPlaces}
        selectedCategories={selectedCategories}
        onPlaceClick={setSelectedPlace}
        categories={categories}
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* Place Detail Modal */}
      <PlaceModal
        place={selectedPlace}
        onClose={() => setSelectedPlace(null)}
      />

      <style>{`
        .map-loading {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-base);
        }
        .map-loading-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          color: var(--text-secondary);
          font-size: 14px;
        }
        .map-loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-default);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        /* Country Selector Styles */
        .country-selector-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 24px;
          background: var(--bg-elevated);
          border-bottom: 1px solid var(--border-default);
          overflow-x: auto;
          scrollbar-width: none; /* Firefox */
        }
        .country-selector-bar::-webkit-scrollbar {
          display: none; /* Safari and Chrome */
        }
        .country-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
          white-space: nowrap;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .country-pills-scroll {
          display: flex;
          gap: 8px;
        }
        .country-pill-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--bg-base);
          border: 1px solid var(--border-default);
          border-radius: 20px;
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          white-space: nowrap;
        }
        .country-pill-btn:hover {
          color: var(--text-primary);
          border-color: var(--text-secondary);
        }
        .country-pill-btn.active {
          color: var(--text-primary);
          background: var(--accent-primary);
          border-color: var(--accent-primary);
          box-shadow: 0 2px 8px var(--accent-glow);
        }
        .flag-icon {
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
