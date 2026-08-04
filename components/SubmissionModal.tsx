'use client';

import { useState } from 'react';
import { X, Send, Video, MapPin, Map, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { createSubmission } from '@/lib/submissions';

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SubmissionModal({ isOpen, onClose, onSuccess }: SubmissionModalProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  if (!isOpen) return null;

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
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.error || 'เกิดข้อผิดพลาดในการส่งข้อมูล');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setVideoUrl('');
    setPlaceName('');
    setGoogleMapsUrl('');
    setErrorMsg('');
    setSubmittedSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-all duration-300">
      <div 
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-neutral-900/95 border border-amber-500/20 shadow-2xl text-neutral-100 p-6 md:p-8 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleResetAndClose}
          className="absolute top-5 right-5 p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {submittedSuccess ? (
          /* Success Screen */
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-white">ส่งข้อมูลเรียบร้อยแล้ว!</h3>
            <p className="text-neutral-300 text-sm max-w-sm mx-auto leading-relaxed">
              ขอบคุณที่ช่วยแนะนำสถานที่ครับ ข้อมูลของคุณจะเข้าสู่ระบบหลังบ้านเพื่อให้ Admin ตรวจสอบก่อนนำขึ้นหมุดบนแผนที่ 📌
            </p>
            <div className="pt-4">
              <button
                onClick={handleResetAndClose}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-all shadow-lg hover:shadow-amber-500/25"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        ) : (
          /* Form Screen */
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">แนะนำสถานที่ / ส่งลิงก์ VDO</h3>
                <p className="text-xs text-neutral-400">ใส่ข้อมูลอย่างน้อย 1 ช่องเพื่อส่งให้ Admin ตรวจสอบ</p>
              </div>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Field 1: Video Link */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-amber-400" />
                  <span>ลิงก์วิดีโอ (TikTok / YouTube / IG Reels)</span>
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.tiktok.com/@... หรือ https://youtu.be/..."
                  className="w-full px-4 py-3 rounded-xl bg-neutral-800/80 border border-neutral-700/80 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>

              {/* Field 2: Place Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>ชื่อสถานที่ / ร้านอาหาร</span>
                </label>
                <input
                  type="text"
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  placeholder="เช่น ต้มยำกุ้งโบราณ ตลาดพลู"
                  className="w-full px-4 py-3 rounded-xl bg-neutral-800/80 border border-neutral-700/80 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>

              {/* Field 3: Google Maps Link */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                  <Map className="w-4 h-4 text-amber-400" />
                  <span>ลิงก์ Google Maps</span>
                </label>
                <input
                  type="url"
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  placeholder="https://maps.google.com/?q=... หรือ https://goo.gl/maps/..."
                  className="w-full px-4 py-3 rounded-xl bg-neutral-800/80 border border-neutral-700/80 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>

              <div className="p-3 rounded-xl bg-neutral-800/40 border border-neutral-800 text-[12px] text-neutral-400 leading-relaxed">
                💡 <span className="font-medium text-neutral-300">หมายเหตุ:</span> สามารถกรอกข้อมูลแค่เพียงอย่างใดอย่างหนึ่ง หรือกรอกหลายอย่างพร้อมกันได้
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 text-sm font-medium hover:bg-neutral-800 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition-all shadow-lg hover:shadow-amber-500/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังส่ง...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>ส่งข้อมูล</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
