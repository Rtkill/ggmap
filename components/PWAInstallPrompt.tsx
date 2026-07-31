'use client';

import { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share, PlusSquare } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('SW registered:', reg.scope))
        .catch((err) => console.log('SW registration failed:', err));
    }

    // 2. Check if already installed / standalone
    const isInStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    if (isInStandalone) {
      setIsStandalone(true);
      return;
    }

    // 3. Check if user already dismissed prompt recently
    const dismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // Hide for 3 days if dismissed
      if (Date.now() - dismissedTime < 3 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // 4. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      // Delay showing iOS guide so user can see main UI first
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // 5. Listen for Android/Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted PWA install');
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    localStorage.setItem('pwa_prompt_dismissed', String(Date.now()));
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: 'calc(100% - 32px)',
        maxWidth: '420px',
        background: 'linear-gradient(135deg, #1d1726 0%, #15101d 100%)',
        border: '1px solid rgba(255, 168, 0, 0.35)',
        borderRadius: '20px',
        padding: '16px 18px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 168, 0, 0.15)',
        color: '#ffffff',
        fontFamily: "'Prompt', 'Outfit', sans-serif",
        animation: 'pwa-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #ffa800, #ff8c00)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              boxShadow: '0 4px 12px rgba(255, 168, 0, 0.3)',
            }}
          >
            🏆
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
              ติดตั้งแอป Grub & Gulp
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.65)', marginTop: 2 }}>
              เพิ่มลงหน้าจอโทรศัพท์ ใช้งานลื่นเหมือนแอปจริง
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.4)',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Android 1-Click Install Button */}
      {!isIOS && deferredPrompt && (
        <button
          type="button"
          onClick={handleInstallClick}
          style={{
            width: '100%',
            padding: '10px 16px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #ffa800 0%, #ff8c00 100%)',
            border: 'none',
            color: '#121316',
            fontSize: '13px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 4px 14px rgba(255, 168, 0, 0.3)',
            transition: 'all 0.2s ease',
          }}
        >
          <Download size={15} />
          <span>กดเซฟลงหน้าจอโทรศัพท์ (คลิกเดียว)</span>
        </button>
      )}

      {/* iOS Instructions Guide Toggle */}
      {isIOS && (
        <div>
          {!showIOSGuide ? (
            <button
              type="button"
              onClick={() => setShowIOSGuide(true)}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ffa800 0%, #ff8c00 100%)',
                border: 'none',
                color: '#121316',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(255, 168, 0, 0.3)',
              }}
            >
              <Smartphone size={15} />
              <span>ดูวิธีเพิ่มลงหน้าจอ iPhone</span>
            </button>
          ) : (
            <div
              style={{
                marginTop: 8,
                padding: '10px 12px',
                background: 'rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '11.5px',
                color: '#cbd5e1',
                lineHeight: 1.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontWeight: 700, color: '#ffa800' }}>
                <Share size={13} />
                <span>วิธีติดตั้งบน iPhone (Safari):</span>
              </div>
              <ol style={{ paddingLeft: 18, margin: 0 }}>
                <li>กดปุ่ม <strong>แชร์ (Share 🔗)</strong> บน Safari ด้านล่าง</li>
                <li>เลื่อนลงมาแล้วกด <strong>เพิ่มไปยังหน้าจอโฮม (Add to Home Screen ➕)</strong></li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
