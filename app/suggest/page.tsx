'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Send, Video, MapPin, Map, CheckCircle2, AlertCircle, Loader2, Sparkles, ArrowLeft } from 'lucide-react';
import { createSubmission } from '@/lib/submissions';

export default function SuggestPage() {
  const [videoUrl, setVideoUrl] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!videoUrl.trim() && !placeName.trim() && !googleMapsUrl.trim()) {
      setErrorMsg('กรุณากรอกข้อมูลอย่างน้อย 1 ช่อง (ลิงก์วิดีโอ, ชื่อสถานที่ หรือ ลิงก์แผนที่)');
      return;
    }

    setLoading(true);
    try {
      const res = await createSubmission({
        video_url: videoUrl,
        place_name: placeName,
        google_maps_url: googleMapsUrl,
      });

      if (res.success) {
        setSubmittedSuccess(true);
      } else {
        setErrorMsg(res.error || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setVideoUrl('');
    setPlaceName('');
    setGoogleMapsUrl('');
    setErrorMsg('');
    setSubmittedSuccess(false);
  };

  return (
    <div className="suggest-wrapper">
      {/* Top Header Navigation */}
      <header className="suggest-header">
        <Link href="/" className="back-btn">
          <ArrowLeft size={16} />
          <span>กลับไปยังแผนที่</span>
        </Link>

        <div className="brand-badge">
          <div className="brand-logo-frame">
            <img src="/logo-optimized.png" alt="Grub & Gulp" className="brand-logo-img" />
          </div>
          <div className="brand-text">
            <span className="brand-title">Grub & Gulp</span>
            <span className="brand-subtitle">Around the World</span>
          </div>
        </div>
      </header>

      {/* Main Container Card */}
      <main className="suggest-main">
        <div className="suggest-card">
          {submittedSuccess ? (
            /* Success View */
            <div className="success-container">
              <div className="success-icon-wrap">
                <CheckCircle2 size={44} />
              </div>
              <h2 className="success-title">ส่งข้อมูลเรียบร้อยแล้ว!</h2>
              <p className="success-desc">
                ขอบคุณที่ช่วยแนะนำสถานที่ครับ ข้อมูลของคุณถูกส่งไปรอ Admin ตรวจสอบเพื่อปักหมุดแล้ว 📌
              </p>
              <div className="success-actions">
                <button type="button" onClick={handleResetForm} className="btn-secondary">
                  ส่งข้อมูลอีกครั้ง
                </button>
                <Link href="/" className="btn-primary">
                  ดูแผนที่ทั้งหมด
                </Link>
              </div>
            </div>
          ) : (
            /* Form View */
            <div className="form-container">
              {/* Form Title & Icon Header */}
              <div className="card-top-strip">
                <div className="sparkle-icon-wrap">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h1 className="card-main-title">แนะนำสถานที่ / ส่งลิงก์ VDO</h1>
                  <p className="card-sub-title">ส่งข้อมูลเพื่อให้ Admin ตรวจสอบก่อนนำขึ้นหมุด</p>
                </div>
              </div>

              {/* Error Alert Box */}
              {errorMsg && (
                <div className="error-alert">
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Form Inputs */}
              <form onSubmit={handleSubmit} className="suggest-form">
                {/* Field 1: Video Link */}
                <div className="field-group">
                  <label htmlFor="video_url" className="field-label">
                    <Video size={16} className="icon-amber" />
                    <span>ลิงก์วิดีโอ (TikTok / YouTube / IG Reels)</span>
                  </label>
                  <input
                    id="video_url"
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.tiktok.com/@... หรือ https://youtu.be/..."
                    className="field-input"
                  />
                </div>

                {/* Field 2: Place Name */}
                <div className="field-group">
                  <label htmlFor="place_name" className="field-label">
                    <MapPin size={16} className="icon-amber" />
                    <span>ชื่อสถานที่ / ร้านอาหาร</span>
                  </label>
                  <input
                    id="place_name"
                    type="text"
                    value={placeName}
                    onChange={(e) => setPlaceName(e.target.value)}
                    placeholder="เช่น ต้มยำกุ้งโบราณ ตลาดพลู"
                    className="field-input"
                  />
                </div>

                {/* Field 3: Google Maps Link */}
                <div className="field-group">
                  <label htmlFor="maps_link" className="field-label">
                    <Map size={16} className="icon-amber" />
                    <span>ลิงก์ Google Maps</span>
                  </label>
                  <input
                    id="maps_link"
                    type="url"
                    value={googleMapsUrl}
                    onChange={(e) => setGoogleMapsUrl(e.target.value)}
                    placeholder="https://maps.google.com/?q=... หรือ https://goo.gl/maps/..."
                    className="field-input"
                  />
                </div>

                {/* Notice Tip */}
                <div className="tip-box">
                  💡 <strong>หมายเหตุ:</strong> สามารถกรอกข้อมูลแค่เพียงอย่างใดอย่างหนึ่ง หรือกรอกหลายอย่างพร้อมกันได้ครับ
                </div>

                {/* Submit Action */}
                <div className="submit-wrap">
                  <button type="submit" disabled={loading} className="btn-submit">
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>กำลังส่งข้อมูล...</span>
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>ส่งข้อมูลสถานที่</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="suggest-footer">
        © Grub & Gulp · Private Submission Link
      </footer>

      {/* Custom Styles matching Grub & Gulp Cream & Golden Amber Theme */}
      <style>{`
        .suggest-wrapper {
          min-height: 100dvh;
          width: 100%;
          background: #f5f4f0;
          color: #121316;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 16px;
          font-family: var(--font-prompt), var(--font-noto-sans-thai), var(--font-outfit), 'Prompt', 'Noto Sans Thai', sans-serif;
          box-sizing: border-box;
        }

        .suggest-header {
          max-width: 480px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 4px;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ffffff;
          border: 1px solid rgba(18, 19, 22, 0.1);
          padding: 8px 14px;
          border-radius: 20px;
          color: #585c6d;
          font-size: 12.5px;
          font-weight: 600;
          text-decoration: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          transition: all 0.2s ease;
        }
        .back-btn:hover {
          color: #121316;
          border-color: #ffa800;
          box-shadow: 0 4px 12px rgba(255, 168, 0, 0.15);
        }

        .brand-badge {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .brand-logo-frame {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          border: 1px solid rgba(18, 19, 22, 0.08);
          overflow: hidden;
          padding: 3px;
        }

        .brand-logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .brand-text {
          display: flex;
          flex-direction: column;
        }

        .brand-title {
          font-size: 14px;
          font-weight: 800;
          color: #121316;
          line-height: 1.1;
        }

        .brand-subtitle {
          font-size: 10.5px;
          color: #ffa800;
          font-weight: 700;
        }

        .suggest-main {
          max-width: 480px;
          width: 100%;
          margin: 16px auto;
        }

        .suggest-card {
          background: #ffffff;
          border: 1px solid rgba(18, 19, 22, 0.08);
          border-radius: 28px;
          padding: 28px 24px;
          box-shadow: 0 16px 40px rgba(18, 19, 22, 0.06);
        }

        @media (min-width: 640px) {
          .suggest-card {
            padding: 36px 32px;
          }
        }

        .card-top-strip {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 20px;
        }

        .sparkle-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          background: rgba(255, 168, 0, 0.12);
          border: 1px solid rgba(255, 168, 0, 0.3);
          color: #ffa800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .card-main-title {
          font-size: 19px;
          font-weight: 800;
          color: #121316;
          letter-spacing: -0.3px;
          margin: 0;
          line-height: 1.2;
        }

        .card-sub-title {
          font-size: 12.5px;
          color: #585c6d;
          margin-top: 3px;
        }

        .error-alert {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #dc2626;
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 12.5px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          line-height: 1.4;
        }

        .suggest-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field-label {
          font-size: 12.5px;
          font-weight: 700;
          color: #334155;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .icon-amber {
          color: #ffa800;
        }

        .field-input {
          width: 100%;
          padding: 14px 16px;
          border-radius: 14px;
          background: #f8f7f4;
          border: 1.5px solid #e2e0d8;
          font-size: 14px;
          color: #121316;
          outline: none;
          transition: all 0.2s ease;
          font-family: inherit;
          box-sizing: border-box;
        }

        .field-input::placeholder {
          color: #94a3b8;
        }

        .field-input:focus {
          background: #ffffff;
          border-color: #ffa800;
          box-shadow: 0 0 0 3px rgba(255, 168, 0, 0.15);
        }

        .tip-box {
          background: #faf9f6;
          border: 1px solid #ebe8de;
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 12px;
          color: #585c6d;
          line-height: 1.5;
        }

        .submit-wrap {
          margin-top: 4px;
        }

        .btn-submit {
          width: 100%;
          padding: 15px 20px;
          border-radius: 16px;
          background: linear-gradient(135deg, #ffa800, #ff8c00);
          border: none;
          color: #121316;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 8px 24px rgba(255, 168, 0, 0.3);
          transition: all 0.2s ease;
        }

        .btn-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 28px rgba(255, 168, 0, 0.4);
        }

        .btn-submit:active:not(:disabled) {
          transform: translateY(0);
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Success View Styling */
        .success-container {
          text-align: center;
          padding: 24px 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .success-icon-wrap {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: rgba(34, 197, 94, 0.12);
          border: 2px solid rgba(34, 197, 94, 0.3);
          color: #16a34a;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .success-title {
          font-size: 22px;
          font-weight: 800;
          color: #121316;
          margin-bottom: 8px;
        }

        .success-desc {
          font-size: 13.5px;
          color: #585c6d;
          max-width: 320px;
          line-height: 1.5;
          margin-bottom: 24px;
        }

        .success-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        }

        @media (min-width: 480px) {
          .success-actions {
            flex-direction: row;
          }
        }

        .btn-secondary {
          flex: 1;
          padding: 12px 18px;
          border-radius: 14px;
          background: #f1f0ea;
          border: 1px solid #e2e0d8;
          color: #334155;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-secondary:hover {
          background: #e5e3dc;
        }

        .btn-primary {
          flex: 1;
          padding: 12px 18px;
          border-radius: 14px;
          background: #ffa800;
          border: none;
          color: #121316;
          font-size: 13.5px;
          font-weight: 800;
          text-decoration: none;
          text-align: center;
          box-shadow: 0 4px 14px rgba(255, 168, 0, 0.25);
          transition: all 0.2s ease;
        }
        .btn-primary:hover {
          background: #ff9800;
        }

        .suggest-footer {
          text-align: center;
          font-size: 12px;
          color: #8e92a8;
          padding: 12px 0;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
