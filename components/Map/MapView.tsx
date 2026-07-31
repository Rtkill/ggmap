'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { Place, DbCategory } from '@/types/place';

interface MapViewProps {
  places: Place[];
  selectedCategory?: string;
  selectedCategories?: string[];
  onPlaceClick: (place: Place) => void;
  categories: DbCategory[];
  isAdminLoggedIn?: boolean;
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export default function MapView({ places, selectedCategory, selectedCategories, onPlaceClick, categories, isAdminLoggedIn }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<import('leaflet').Map | null>(null);
  const markersLayerRef = useRef<import('leaflet').LayerGroup | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    // Guard: if container already has a Leaflet instance attached, remove it first
    const container = mapRef.current as HTMLElement & { _leaflet_id?: number };
    if (container._leaflet_id) {
      // A stale instance exists (e.g. from StrictMode double-invoke) — clean it up
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
      markersLayerRef.current = null;
      delete container._leaflet_id;
    }

    if (leafletMapRef.current) return;

    let isMounted = true;

    const initMap = async () => {
      const L = (await import('leaflet')).default;

      // Re-check after async gap (StrictMode cleanup may have run)
      if (!isMounted || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        center: [13.7563, 100.5018],
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
        tap: false,
      } as L.MapOptions & { tap?: boolean });

      L.tileLayer(TILE_URL, {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: TILE_ATTRIBUTION,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      leafletMapRef.current = map;
      setMapReady(true);
    };

    initMap();

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  const prevFilterKeyRef = useRef<string>('');

  // Update markers when places or filter changes
  useEffect(() => {
    const updateMarkers = async () => {
      if (!leafletMapRef.current || !markersLayerRef.current || !mapReady) return;

      const activeCats = selectedCategories ?? (selectedCategory ? [selectedCategory] : ['All']);
      const catsKey = [...activeCats].sort().join(',');

      const currentFilterKey = `${isAdminLoggedIn ? 'admin' : 'user'}_${catsKey}_${places.map((p) => p.id).join(',')}`;
      if (currentFilterKey === prevFilterKeyRef.current) return;
      prevFilterKeyRef.current = currentFilterKey;

      const L = (await import('leaflet')).default;
      const { createCustomMarker } = await import('./CustomMarker');

      markersLayerRef.current.clearLayers();

      places.forEach((place) => {
        const catInfo = categories.find((c) => c.name === place.category);
        let color = catInfo?.color ?? '#E74C3C';
        const emoji = catInfo?.emoji ?? '🍽️';

        const isNotVisited = Boolean(
          place.personal_notes &&
          (place.personal_notes.includes('ยังไม่ได้ไป') ||
           place.personal_notes.toLowerCase().includes('grub & gulp') ||
           place.personal_notes.toLowerCase().includes('grup & gulp'))
        );

        if (isAdminLoggedIn && isNotVisited) {
          color = '#94a3b8'; // Light silver/grey for unvisited admin pins
        }

        const icon = createCustomMarker(place.category, color, emoji);
        const marker = L.marker([place.lat, place.lng], { icon });

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onPlaceClick(place);
        });

        marker.bindTooltip(place.name, {
          direction: 'top',
          offset: [0, -50],
          className: 'map-tooltip',
          interactive: false,
        });

        markersLayerRef.current!.addLayer(marker);
      });
    };

    updateMarkers();
  }, [places, selectedCategory, selectedCategories, onPlaceClick, mapReady, categories, isAdminLoggedIn]);

  // Track previous place set to avoid resetting zoom on pin clicks or modal state changes
  const prevPlacesKeyRef = useRef<string>('');

  // Auto-center map to fit markers ONLY when place dataset changes (e.g. switching country)
  useEffect(() => {
    const autoFit = async () => {
      if (!leafletMapRef.current || !mapReady || places.length === 0) return;

      const currentKey = places.map((p) => p.id).sort().join(',');
      if (currentKey === prevPlacesKeyRef.current) return;
      prevPlacesKeyRef.current = currentKey;

      const L = (await import('leaflet')).default;
      
      const points = places.map((p) => [p.lat, p.lng] as [number, number]);
      const bounds = L.latLngBounds(points);
      
      leafletMapRef.current.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 13,
        animate: true,
        duration: 1.2,
      });
    };

    autoFit();
  }, [places, mapReady]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationError('เบราว์เซอร์ของคุณไม่รองรับ GPS');
      return;
    }
    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const L = (await import('leaflet')).default;
        if (!leafletMapRef.current) return;

        const { latitude: lat, longitude: lng } = pos.coords;
        leafletMapRef.current.flyTo([lat, lng], 14, { duration: 1.5 });

        // Add a pulsing "you are here" marker
        const youAreHere = L.divIcon({
          className: '',
          html: `<div class="locate-pulse"><div class="locate-dot"></div></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        L.marker([lat, lng], { icon: youAreHere })
          .addTo(leafletMapRef.current)
          .bindPopup('📍 คุณอยู่ที่นี่')
          .openPopup();

        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocationError('ไม่สามารถดึงตำแหน่งได้: ' + err.message);
        setTimeout(() => setLocationError(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="map-wrapper">
      <div ref={mapRef} className="map-container" />

      {/* Locate Me Button */}
      <button
        className={`locate-btn ${locating ? 'locating' : ''}`}
        onClick={handleLocateMe}
        disabled={locating}
        title="ร้านใกล้ตัว — ดึงพิกัด GPS"
        id="locate-me-btn"
      >
        {locating ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          <Navigation size={20} />
        )}
        <span>{locating ? 'กำลังค้นหา...' : 'ร้านใกล้ตัว'}</span>
      </button>

      {/* Location Error Toast */}
      {locationError && (
        <div className="location-error-toast">
          <MapPin size={14} />
          {locationError}
        </div>
      )}
    </div>
  );
}
