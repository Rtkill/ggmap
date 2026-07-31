'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  X, Star, BookOpen, Phone, Globe, Calendar, MessageSquare, Info, ClipboardList, UtensilsCrossed, MapPin, ExternalLink, Share2, Check
} from 'lucide-react';
import { Place, CATEGORY_COLORS, CATEGORY_EMOJIS } from '@/types/place';
import VideoPlayer from './VideoPlayer';

interface PlaceModalProps {
  place: Place | null;
  onClose: () => void;
}

const PRICE_LABELS: Record<string, string> = {
  '$': 'ราคาประหยัด (< 200฿)',
  '$$': 'ราคากลาง (200-600฿)',
  '$$$': 'ราคาสูง (600฿+)',
};

export default function PlaceModal({ place, onClose }: PlaceModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'grub' | 'google' | 'menu' | 'reviews' | 'about'>('grub');
  const [hoursOpen, setHoursOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  const handleShare = async () => {
    if (!place) return;
    const shareUrl = `${window.location.origin}/place/${place.id}`;
    const shareData = {
      title: `${place.name} — Grub & Gulp Around the World`,
      text: `พิกัดร้านเด็ด ${place.name} (${place.category}) บน Grub & Gulp Around the World`,
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
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2500);
      } catch (err) {
        console.error('Clipboard copy failed:', err);
      }
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Trap focus and handle body scroll lock
  useEffect(() => {
    if (place) {
      document.body.style.overflow = 'hidden';
      setActiveTab('grub'); // Reset to first tab on place switch
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [place]);

  if (!place) return null;

  const color = CATEGORY_COLORS[place.category] ?? '#E74C3C';
  const emoji = CATEGORY_EMOJIS[place.category] ?? '🍴';
  const googleMapsUrl = place.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;

  const renderRating = (rating: number) => {
    if (!rating || rating === 0) {
      return (
        <div className="rating-stars">
          <span className="rating-score" style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 600 }}>ยังไม่ได้ให้คะแนน G&G Score</span>
        </div>
      );
    }
    const full = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    return (
      <div className="rating-stars">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={16}
            className={i < full ? 'star-full' : i === full && hasHalf ? 'star-half' : 'star-empty'}
            fill={i < full ? color : 'none'}
            color={i < full || (i === full && hasHalf) ? color : '#444'}
          />
        ))}
        <span className="rating-score" style={{ color }}>{rating.toFixed(2)}</span>
        <span className="rating-max">/5</span>
      </div>
    );
  };

  // Google Places data extraction
  const g = place.google_data;

  // About tab attributes parsing
  const hasAttribute = (attr: string): boolean => {
    if (!g || !g.types) return false;
    return g.types.includes(attr);
  };

  // Clean raw HTML <br> tags in personal notes
  const cleanedNotes = place.personal_notes
    ? place.personal_notes.replace(/<br\s*\/?>/gi, '\n')
    : '';

  return (
    <>
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={onClose} />

      {/* Panel */}
      <div 
        className="modal-panel" 
        ref={panelRef} 
        role="dialog" 
        aria-modal="true" 
        aria-label={place.name}
        style={{ '--accent-color': color } as React.CSSProperties}
      >
        {/* Header strip */}
        <div className="modal-header">
          <div className="modal-header-content">
            <span className="modal-category-emoji">{emoji}</span>
            <div>
              <h2 className="modal-title">{place.name}</h2>
              <div className="modal-meta">
                <span className="modal-category-badge" style={{ backgroundColor: color }}>
                  {place.category}
                </span>
                <span className="modal-price" title={PRICE_LABELS[place.price_range] ?? ''}>
                  {place.price_range}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={handleShare}
              title="แชร์ร้านนี้"
              style={{
                background: 'rgba(255, 168, 0, 0.12)',
                border: '1px solid rgba(255, 168, 0, 0.25)',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffa800',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {copiedToast ? <Check size={16} style={{ color: '#22c55e' }} /> : <Share2 size={16} />}
            </button>
            <button className="modal-close-btn" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation (Segmented Pill Controller) */}
        <div className="modal-tabs">
          <button
            onClick={() => setActiveTab('grub')}
            className={`modal-tab-btn ${activeTab === 'grub' ? 'active' : ''}`}
          >
            <UtensilsCrossed size={13} />
            <span>Grub & Gulp</span>
          </button>
          <button
            onClick={() => setActiveTab('google')}
            className={`modal-tab-btn ${activeTab === 'google' ? 'active' : ''}`}
          >
            <Globe size={13} />
            <span>Google</span>
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`modal-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          >
            <MessageSquare size={13} />
            <span>Reviews</span>
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`modal-tab-btn ${activeTab === 'about' ? 'active' : ''}`}
          >
            <Info size={13} />
            <span>About</span>
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`modal-tab-btn ${activeTab === 'menu' ? 'active' : ''}`}
          >
            <ClipboardList size={13} />
            <span>Menu</span>
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          
          {/* TAB 1: GRUB AND GULP OVERVIEW */}
          {activeTab === 'grub' && (
            <div className="tab-pane-content">
              {/* Rating */}
              <div className="modal-section">
                <div className="modal-section-label">
                  <Star size={14} /> G&G Score
                </div>
                {renderRating(place.rating)}
              </div>

              {/* Video (Moved UP) */}
              {place.video_url && (
                <div className="modal-section">
                  <div className="modal-section-label">🎬 วิดีโอรีวิว</div>
                  <VideoPlayer url={place.video_url} />
                </div>
              )}

              {/* Personal Notes */}
              {cleanedNotes && (
                <div className="modal-section">
                  <div className="modal-section-label">
                    <BookOpen size={14} /> บันทึกส่วนตัว
                  </div>
                  <p className="modal-notes" style={{ whiteSpace: 'pre-wrap' }}>{cleanedNotes}</p>
                </div>
              )}

              {/* Share CTA Button */}
              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  onClick={handleShare}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(255, 168, 0, 0.18), rgba(255, 140, 0, 0.1))',
                    border: '1px solid rgba(255, 168, 0, 0.35)',
                    color: '#ffa800',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(255, 168, 0, 0.1)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {copiedToast ? (
                    <>
                      <Check size={16} style={{ color: '#22c55e' }} />
                      <span style={{ color: '#22c55e' }}>คัดลอกลิงก์ร้านเรียบร้อยแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Share2 size={16} />
                      <span>แชร์การ์ดร้านนี้ (LINE / FB / TikTok)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE MAPS OVERVIEW */}
          {activeTab === 'google' && (
            <div className="tab-pane-content">
              {!g ? (
                <div className="sync-placeholder">
                  <Globe size={32} style={{ marginBottom: 12, opacity: 0.6 }} />
                  <p>ยังไม่มีข้อมูลจาก Google Maps ในหมุดนี้</p>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>กรุณากดปุ่ม "ซิงค์ข้อมูล Google ย้อนหลัง" ในหน้าแอดมิน เพื่อดึงข้อมูลประวัติการเปิดปิด, รีวิว และระดับราคาย้อนหลังมาแสดงผลครับ</span>
                </div>
              ) : (
                <div className="google-info-list">
                  {/* Google Rating */}
                  <div className="google-info-item">
                    <Star size={18} fill="#ffb400" color="#ffb400" />
                    <div>
                      <div className="google-info-label">คะแนน Google Maps</div>
                      <div className="google-info-val" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                        <span style={{ fontSize: 18 }}>
                          {g.google_rating ? Number(g.google_rating).toFixed(1) : (g.rating && g.rating !== place.rating ? Number(g.rating).toFixed(1) : '-')}
                        </span>
                        <span style={{ color: '#8c92b2', fontWeight: 400 }}>({g.user_ratings_total || 0} รีวิว)</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  {g.editorial_summary?.overview && (
                    <div className="google-info-item">
                      <Info size={18} />
                      <div>
                        <div className="google-info-label">คำอธิบายย่อ</div>
                        <div className="google-info-val" style={{ fontStyle: 'italic' }}>"{g.editorial_summary.overview}"</div>
                      </div>
                    </div>
                  )}

                  {/* Address */}
                  {g.formatted_address && (
                    <div className="google-info-item">
                      <MapPin size={18} />
                      <div>
                        <div className="google-info-label">ที่อยู่</div>
                        <div className="google-info-val">{g.formatted_address}</div>
                      </div>
                    </div>
                  )}

                  {/* Phone */}
                  {g.formatted_phone_number && (
                    <div className="google-info-item">
                      <Phone size={18} />
                      <div>
                        <div className="google-info-label">เบอร์โทรศัพท์</div>
                        <div className="google-info-val">{g.formatted_phone_number}</div>
                      </div>
                    </div>
                  )}

                  {/* Website */}
                  {g.website && (
                    <div className="google-info-item">
                      <Globe size={18} />
                      <div>
                        <div className="google-info-label">เว็บไซต์</div>
                        <div className="google-info-val">
                          <a href={g.website} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>
                            {g.website.length > 40 ? g.website.substring(0, 40) + '...' : g.website}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Opening Hours */}
                  {g.opening_hours && (
                    <div className="google-info-item">
                      <Calendar size={18} />
                      <div style={{ width: '100%' }}>
                        <div className="google-info-label">เวลาเปิด-ปิด</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`status-badge ${g.opening_hours.open_now ? 'open' : 'closed'}`} style={{
                            fontSize: 11,
                            fontWeight: 750,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: g.opening_hours.open_now ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                            color: g.opening_hours.open_now ? '#10b981' : '#ef4444'
                          }}>
                            {g.opening_hours.open_now ? 'OPEN NOW' : 'CLOSED'}
                          </span>
                          <button 
                            onClick={() => setHoursOpen(!hoursOpen)} 
                            style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            {hoursOpen ? 'ซ่อนเวลาทำการทั้งสัปดาห์' : 'ดูเวลาทำการทั้งสัปดาห์'}
                          </button>
                        </div>
                        {hoursOpen && g.opening_hours.weekday_text && (
                          <div className="weekday-list">
                            {g.opening_hours.weekday_text.map((text: string, i: number) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MENU */}
          {activeTab === 'menu' && (
            <div className="tab-pane-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="sync-placeholder" style={{ padding: '20px 16px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.01)' }}>
                <ClipboardList size={32} style={{ marginBottom: 8, color: 'var(--accent-color, #3b82f6)' }} />
                <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>ช่องทางเรียกดูเมนูและรายการอาหาร</p>
                <span style={{ fontSize: 12.5, color: '#64748b', marginTop: 4, lineHeight: 1.4 }}>
                  เนื่องจากร้านอาหารและคาเฟ่ทั่วไปอาจไม่มีระบบเมนูดิจิทัลแยกเฉพาะ คุณสามารถเลือกใช้ช่องทางด่วนด้านล่างนี้เพื่อเรียกดูรายการอาหารและราคาล่าสุดได้ทันทีครับ
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Action 1: Google Image Search for Menu Photos directly */}
                <a 
                  href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(place.name + ' เมนู menu รูปภาพ')}`}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="maps-btn"
                  style={{ 
                    background: 'linear-gradient(135deg, #4285F4, #34A853)', 
                    color: '#fff', 
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '13px',
                    textDecoration: 'none',
                    boxShadow: '0 2px 6px rgba(66, 133, 244, 0.15)'
                  }}
                >
                  <ExternalLink size={15} /> 🔍 ค้นหารูปภาพเมนูบน Google Images (แนะนำ)
                </a>

                {/* Action 2: Official Website / Facebook Page */}
                {g && g.website && (
                  <a 
                    href={g.website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="maps-btn"
                    style={{ 
                      color: 'var(--accent-color, #2563eb)',
                      background: 'color-mix(in srgb, var(--accent-color, #2563eb) 10%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--accent-color, #2563eb) 25%, transparent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '12px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '13px',
                      textDecoration: 'none'
                    }}
                  >
                    <Globe size={15} /> 🌐 เข้าชมเพจ / เว็บไซต์ทางการของร้าน
                  </a>
                )}

                {/* Action 3: Google Maps Photos */}
                <a 
                  href={googleMapsUrl}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="maps-btn"
                  style={{ 
                    color: 'var(--text-primary, #121316)',
                    background: 'rgba(0, 0, 0, 0.04)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '13px',
                    textDecoration: 'none'
                  }}
                >
                  <MapPin size={15} /> 📍 เปิดดูรูปภาพและรีวิวบน Google Maps
                </a>
              </div>
            </div>
          )}

          {/* TAB 4: REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="tab-pane-content" style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              {!g || !g.reviews || g.reviews.length === 0 ? (
                <div className="sync-placeholder">
                  <MessageSquare size={32} style={{ marginBottom: 12, opacity: 0.6 }} />
                  <p>ยังไม่มีข้อมูลรีวิวจาก Google Maps ในหมุดนี้</p>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>กรุณากดปุ่ม "ซิงค์ข้อมูล Google ย้อนหลัง" ในหน้าแอดมิน เพื่อดึงรีวิวของร้านมาแสดงผลครับ</span>
                </div>
              ) : (
                <div className="review-list">
                  {g.reviews.map((rev: any, idx: number) => (
                    <div key={idx} className="review-item">
                      <div className="review-author">
                        <img src={rev.profile_photo_url || '/admin_avatar.jpg'} alt={rev.author_name} className="author-img" />
                        <div className="review-meta">
                          <div className="author-name">{rev.author_name}</div>
                          <div className="review-stars">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star 
                                key={i} 
                                size={12} 
                                fill={i < rev.rating ? '#ffb400' : 'none'} 
                                color={i < rev.rating ? '#ffb400' : '#444'} 
                              />
                            ))}
                            <span className="review-date" style={{ marginLeft: 8 }}>{rev.relative_time_description}</span>
                          </div>
                        </div>
                      </div>
                      <p className="review-text">{rev.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ABOUT ATTRIBUTES */}
          {activeTab === 'about' && (
            <div className="tab-pane-content" style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              {!g ? (
                <div className="sync-placeholder">
                  <Info size={32} style={{ marginBottom: 12, opacity: 0.6 }} />
                  <p>ยังไม่มีข้อมูลรายละเอียดบริการในหมุดนี้</p>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>กรุณากดปุ่ม "ซิงค์ข้อมูล Google ย้อนหลัง" ในหน้าแอดมิน เพื่อดึงรายละเอียดของร้านมาแสดงผลครับ</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  
                  {/* Google summary card grid */}
                  <div className="about-grid">
                    {/* 1. Dine-in */}
                    {(() => {
                      const isYes = g.dine_in === true || (!g.dine_in && (g.types?.includes('restaurant') || g.types?.includes('cafe') || g.types?.includes('food')));
                      return (
                        <div className={`about-card ${isYes ? 'yes' : 'no'}`}>
                          <span style={{ fontSize: 20 }}>🍽️</span>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 750, color: 'var(--text-primary, #0f172a)' }}>ทานที่ร้าน (Dine-in)</div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: isYes ? '#10b981' : '#94a3b8' }}>
                              {isYes ? '✓ มีบริการนั่งทาน' : '✗ ไม่มีนั่งทานในร้าน'}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 2. Takeout */}
                    {(() => {
                      const isYes = g.takeout === true || (!g.takeout && (g.types?.includes('restaurant') || g.types?.includes('cafe') || g.types?.includes('food')));
                      return (
                        <div className={`about-card ${isYes ? 'yes' : 'no'}`}>
                          <span style={{ fontSize: 20 }}>🛍️</span>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 750, color: 'var(--text-primary, #0f172a)' }}>สั่งกลับบ้าน (Takeout)</div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: isYes ? '#10b981' : '#94a3b8' }}>
                              {isYes ? '✓ มีบริการสั่งกลับ' : '✗ ไม่มีสั่งกลับบ้าน'}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 3. Delivery */}
                    {(() => {
                      const isYes = g.delivery === true || (!g.delivery && g.types?.includes('meal_delivery'));
                      return (
                        <div className={`about-card ${isYes ? 'yes' : 'no'}`}>
                          <span style={{ fontSize: 20 }}>🛵</span>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 750, color: 'var(--text-primary, #0f172a)' }}>เดลิเวอรี (Delivery)</div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: isYes ? '#10b981' : '#94a3b8' }}>
                              {isYes ? '✓ มีจัดส่งอาหาร' : '✗ ไม่มีบริการจัดส่ง'}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 4. Cafe/Bakery */}
                    {(() => {
                      const isYes = g.types?.includes('cafe') || g.types?.includes('bakery');
                      return (
                        <div className={`about-card ${isYes ? 'yes' : 'no'}`}>
                          <span style={{ fontSize: 20 }}>☕</span>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 750, color: 'var(--text-primary, #0f172a)' }}>ร้านกาแฟ & เบเกอรี่</div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: isYes ? '#10b981' : '#94a3b8' }}>
                              {isYes ? '✓ ขนม/เครื่องดื่ม' : '✗ เน้นอาหารหลัก'}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 5. Alcohol */}
                    {(() => {
                      const isYes = g.serves_beer === true || g.serves_wine === true || g.types?.includes('bar') || g.types?.includes('night_club');
                      return (
                        <div className={`about-card ${isYes ? 'yes' : 'no'}`}>
                          <span style={{ fontSize: 20 }}>🍺</span>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 750, color: 'var(--text-primary, #0f172a)' }}>เครื่องดื่มมึนเมา</div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: isYes ? '#10b981' : '#94a3b8' }}>
                              {isYes ? '✓ มีจำหน่ายสุรา/เบียร์' : '✗ ไม่มีเครื่องดื่มมึนเมา'}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 6. Reservable */}
                    {(() => {
                      const isYes = g.reservable === true;
                      return (
                        <div className={`about-card ${isYes ? 'yes' : 'no'}`}>
                          <span style={{ fontSize: 20 }}>📅</span>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 750, color: 'var(--text-primary, #0f172a)' }}>รับจองโต๊ะล่วงหน้า</div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: isYes ? '#10b981' : '#94a3b8' }}>
                              {isYes ? '✓ จองโต๊ะล่วงหน้าได้' : '✗ รับเฉพาะ Walk-in'}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 7. Vegetarian */}
                    {(() => {
                      const isYes = g.serves_vegetarian_food === true;
                      return (
                        <div className={`about-card ${isYes ? 'yes' : 'no'}`}>
                          <span style={{ fontSize: 20 }}>🥗</span>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 750, color: 'var(--text-primary, #0f172a)' }}>อาหารมังสวิรัติ</div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: isYes ? '#10b981' : '#94a3b8' }}>
                              {isYes ? '✓ มีเมนูเจ/มังฯ' : '✗ ไม่มีเมนูมังสวิรัติ'}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 8. Wheelchair Accessibility */}
                    {(() => {
                      const isYes = g.wheelchair_accessible_entrance === true;
                      return (
                        <div className={`about-card ${isYes ? 'yes' : 'no'}`}>
                          <span style={{ fontSize: 20 }}>♿</span>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 750, color: 'var(--text-primary, #0f172a)' }}>รองรับรถเข็น</div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: isYes ? '#10b981' : '#94a3b8' }}>
                              {isYes ? '✓ มีทางเข้าสำหรับรถเข็น' : '✗ ไม่ระบุข้อมูลรถเข็น'}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* 6 Custom about sections (from custom_about database object) */}
                  {g.custom_about && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, borderTop: '1px solid rgba(128,128,128,0.15)', paddingTop: 16 }}>
                      {(() => {
                        const sections = [
                          { key: 'popular_for', title: 'Popular for' },
                          { key: 'amenities', title: 'Amenities' },
                          { key: 'atmosphere', title: 'Atmosphere' },
                          { key: 'payments', title: 'Payments' },
                          { key: 'parking', title: 'Parking' }
                        ];
                        
                        return sections.map(sec => {
                          const items = g.custom_about[sec.key];
                          if (!Array.isArray(items) || items.length === 0) return null;
                          return (
                            <div key={sec.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <h4 style={{ fontSize: '13px', color: 'var(--text-primary, #0f172a)', margin: '0 0 4px 0', fontWeight: 750 }}>
                                {sec.title}
                              </h4>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                                {items.map(item => (
                                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12.5px', color: 'var(--text-secondary, #334155)' }}>
                                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span>
                                    <span>{item}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

          {/* Navigation Button */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="maps-btn"
            id={`maps-btn-${place.id}`}
          >
            <ExternalLink size={18} />
            Open in Google Maps
          </a>
        </div>
      </div>

      {/* MODAL TABS STYLE SHEET */}
      <style>{`
        .modal-tabs {
          display: flex;
          gap: 6px;
          padding: 6px;
          margin: 0 24px 16px;
          background: rgba(0, 0, 0, 0.04);
          border-radius: 12px;
          overflow-x: auto;
          scrollbar-width: none; /* Hide scrollbar for Firefox */
          -ms-overflow-style: none; /* Hide scrollbar for IE/Edge */
        }
        .modal-tabs::-webkit-scrollbar {
          display: none; /* Hide scrollbar for Chrome/Safari */
        }
        
        /* Dark Mode Compatibility override */
        :global(.dark) .modal-tabs {
          background: rgba(255, 255, 255, 0.02);
        }
        
        .modal-tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 8px;
          color: #334155;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .modal-tab-btn:hover {
          color: var(--text-primary, #121316);
          background: rgba(0, 0, 0, 0.06);
        }
        :global(.dark) .modal-tab-btn {
          color: #94a3b8;
        }
        :global(.dark) .modal-tab-btn:hover {
          color: var(--text-primary, #fff);
          background: rgba(255, 255, 255, 0.04);
        }
        
        .modal-tab-btn.active {
          color: var(--accent-color, #2563eb) !important;
          background: color-mix(in srgb, var(--accent-color, #2563eb) 12%, transparent) !important;
          border: 1px solid color-mix(in srgb, var(--accent-color, #2563eb) 35%, transparent) !important;
          box-shadow: 0 2px 6px color-mix(in srgb, var(--accent-color, #2563eb) 8%, transparent);
        }
        
        .tab-pane-content {
          animation: fade-in 200ms ease-out;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .sync-placeholder {
          text-align: center;
          padding: 32px 16px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px dashed rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .sync-placeholder p {
          font-size: 15px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 8px;
        }
        .sync-placeholder span {
          max-width: 320px;
          line-height: 1.5;
          color: #8c92b2;
        }

        .google-info-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .google-info-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .google-info-item svg {
          margin-top: 3px;
          flex-shrink: 0;
          color: #60a5fa;
        }
        .google-info-label {
          font-size: 10px;
          font-weight: 800;
          color: #8c92b2;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 3px;
        }
        .google-info-val {
          font-size: 13.5px;
          color: var(--text-primary, #e2e8f0);
          line-height: 1.4;
        }
        .weekday-list {
          margin-top: 10px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          font-size: 12px;
          color: #cbd5e1;
          display: flex;
          flex-direction: column;
          gap: 6px;
          animation: fade-in 150ms ease-out;
        }

        .review-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .review-item {
          padding: 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }
        .review-author {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .author-img {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
        }
        .review-meta {
          flex: 1;
        }
        .author-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary, #fff);
          margin-bottom: 2px;
        }
        .review-stars {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .review-date {
          font-size: 11px;
          color: #8c92b2;
        }
        .review-text {
          font-size: 13px;
          color: var(--text-primary, #cbd5e1);
          line-height: 1.5;
          margin: 0;
        }

        .about-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .about-card {
          padding: 12px 14px;
          background: rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 150ms ease;
        }
        :global(.dark) .about-card {
          background: rgba(255, 255, 255, 0.02);
          border-color: rgba(255, 255, 255, 0.05);
        }
        .about-card.yes {
          border-left: 3px solid #10b981;
          background: rgba(16, 185, 129, 0.04);
        }
        :global(.dark) .about-card.yes {
          background: rgba(16, 185, 129, 0.02);
        }
        .about-card.no {
          border-left: 3px solid #94a3b8;
          opacity: 0.7;
          background: rgba(0, 0, 0, 0.01);
        }
        :global(.dark) .about-card.no {
          background: rgba(255, 255, 255, 0.005);
        }
        
        @media (max-width: 480px) {
          .modal-tab-btn svg {
            display: none !important;
          }
          .modal-tab-btn {
            padding: 8px 4px;
            font-size: 9.5px;
          }
          .modal-tabs {
            margin: 0 16px 12px;
            padding: 4px;
            gap: 2px;
          }
        }
      `}</style>
    </>
  );
}
