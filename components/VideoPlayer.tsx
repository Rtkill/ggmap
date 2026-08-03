'use client';

import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Loader2 } from 'lucide-react';

interface VideoPlayerProps {
  url: string; // Comma-separated list of video URLs
}

interface EmbedInfo {
  type: 'youtube' | 'tiktok' | 'instagram' | 'unknown';
  embedSrc: string;
  isShortLink?: boolean;
}

function getVideoEmbed(url: string, resolvedMap: Record<string, string>): EmbedInfo {
  if (!url) return { type: 'unknown', embedSrc: '' };

  // YouTube: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    return {
      type: 'youtube',
      embedSrc: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1&autoplay=0`,
    };
  }

  // If already resolved in state map
  if (resolvedMap[url]) {
    return {
      type: 'tiktok',
      embedSrc: `https://www.tiktok.com/embed/v2/${resolvedMap[url]}`,
    };
  }

  // TikTok full video link: tiktok.com/@user/video/ID or video/ID
  const ttMatch = url.match(/video\/(\d+)/);
  if (ttMatch) {
    return {
      type: 'tiktok',
      embedSrc: `https://www.tiktok.com/embed/v2/${ttMatch[1]}`,
    };
  }

  // TikTok short links (vt.tiktok.com, vm.tiktok.com, v.tiktok.com, tiktok.com/t/)
  if (/(?:vt|vm|v)\.tiktok\.com|tiktok\.com\/t\//i.test(url)) {
    return {
      type: 'tiktok',
      embedSrc: '',
      isShortLink: true,
    };
  }

  // Instagram Reels: instagram.com/reel/CODE
  const igMatch = url.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/);
  if (igMatch) {
    return {
      type: 'instagram',
      embedSrc: `https://www.instagram.com/p/${igMatch[1]}/embed/`,
    };
  }

  return { type: 'unknown', embedSrc: '' };
}

export default function VideoPlayer({ url }: VideoPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [resolvedMap, setResolvedMap] = useState<Record<string, string>>({});
  const [resolvingUrls, setResolvingUrls] = useState<Record<string, boolean>>({});

  // Split multiple URLs by comma
  const videoUrls = useMemo(() => {
    if (!url) return [];
    return url
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);
  }, [url]);

  const activeUrl = videoUrls[currentIndex] || '';
  const embedInfo = useMemo(() => getVideoEmbed(activeUrl, resolvedMap), [activeUrl, resolvedMap]);
  const { type, embedSrc, isShortLink } = embedInfo;

  // Auto-resolve short links (vt.tiktok.com, vm.tiktok.com, etc.)
  useEffect(() => {
    if (isShortLink && activeUrl && !resolvedMap[activeUrl] && !resolvingUrls[activeUrl]) {
      setResolvingUrls((prev) => ({ ...prev, [activeUrl]: true }));
      fetch('/api/resolve-tiktok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: activeUrl }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.videoId) {
            setResolvedMap((prev) => ({ ...prev, [activeUrl]: data.videoId }));
          }
        })
        .catch((err) => console.error('Failed to resolve TikTok short link:', err))
        .finally(() => {
          setResolvingUrls((prev) => ({ ...prev, [activeUrl]: false }));
        });
    }
  }, [isShortLink, activeUrl, resolvedMap, resolvingUrls]);

  if (videoUrls.length === 0) return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % videoUrls.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + videoUrls.length) % videoUrls.length);
  };

  const renderVideoContent = () => {
    if (isShortLink && !embedSrc) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', minHeight: 220 }}>
          <Loader2 size={32} className="animate-spin" style={{ color: '#ff0050' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
            ♪ กำลังโหลดวิดีโอ TikTok...
          </span>
        </div>
      );
    }

    if (type === 'unknown') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: 12, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
          <Play size={32} style={{ color: 'var(--accent-primary)' }} />
          <a
            href={activeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="video-external-link"
            style={{ width: 'auto', marginTop: 0 }}
          >
            🎬 เปิดดูวิดีโอรีวิวภายนอก →
          </a>
        </div>
      );
    }

    const aspectClass = type === 'tiktok' ? 'video-aspect-tiktok' : type === 'instagram' ? 'video-aspect-9-16' : 'video-aspect-16-9';

    return (
      <div className={`video-frame-container ${aspectClass}`}>
        <iframe
          src={embedSrc}
          title={`Video Review ${currentIndex + 1}`}
          className="video-iframe"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
        />
      </div>
    );
  };

  return (
    <div className="video-wrapper">
      {/* Header with platform name and Carousel Indicators */}
      <div className="video-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {type === 'youtube' && <span>▶ YouTube</span>}
          {type === 'tiktok' && <span>♪ TikTok</span>}
          {type === 'instagram' && <span>📸 Instagram</span>}
          {type === 'unknown' && <span>🔗 External Review</span>}
        </div>
        {videoUrls.length > 1 && (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>
            {currentIndex + 1} / {videoUrls.length}
          </span>
        )}
      </div>

      {/* Main video area with navigation overlay if multiple */}
      <div style={{ position: 'relative' }}>
        {renderVideoContent()}

        {/* Carousel Arrow Controls */}
        {videoUrls.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="carousel-control-btn left"
              aria-label="Previous Video"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNext}
              className="carousel-control-btn right"
              aria-label="Next Video"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>

      <style>{`
        .carousel-control-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(18, 19, 22, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          transition: all 150ms ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        .carousel-control-btn:hover {
          background: var(--accent-primary);
          color: var(--text-primary);
          box-shadow: 0 4px 16px var(--accent-glow);
        }

        .carousel-control-btn.left {
          left: 10px;
        }

        .carousel-control-btn.right {
          right: 10px;
        }
      `}</style>
    </div>
  );
}
