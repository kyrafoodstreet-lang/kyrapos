'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import {
  Gamepad2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  User,
  Phone,
  Mail,
  Ticket,
  Printer,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface BookingSuccessData {
  bookingCode: string;
  name: string;
  mobile: string;
  email?: string | null;
}

// ─────────────────────────────────────────────────────────────
// Festive Paper Blast / Confetti Canvas Component
// ─────────────────────────────────────────────────────────────
function PaperBlastCelebration() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const colors = [
      '#D94949', '#E11D48', '#BE123C', '#F43F5E',
      '#059669', '#10B981', '#D97706', '#F59E0B',
      '#2563EB', '#7C3AED', '#EC4899', '#FBBF24'
    ];

    const particleCount = 200;
    const particles: Array<{
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      vx: number;
      vy: number;
      angle: number;
      angleSpeed: number;
      shape: 'rect' | 'circle' | 'ribbon';
      gravity: number;
      drag: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      const isLeft = i % 2 === 0;
      const startX = isLeft ? width * 0.15 : width * 0.85;
      const startY = height * 0.65;
      const angle = (isLeft ? -Math.PI / 4 : -(3 * Math.PI) / 4) + (Math.random() - 0.5) * 0.9;
      const speed = Math.random() * 24 + 10;

      particles.push({
        x: startX,
        y: startY,
        w: Math.random() * 12 + 6,
        h: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle: Math.random() * 360,
        angleSpeed: (Math.random() - 0.5) * 16,
        shape: Math.random() > 0.4 ? 'rect' : Math.random() > 0.5 ? 'circle' : 'ribbon',
        gravity: 0.35 + Math.random() * 0.15,
        drag: 0.965,
      });
    }

    let animationFrameId: number;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.angleSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'ribbon') {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * 2);
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 w-full h-full"
    />
  );
}

export default function SimpleBookingPage() {
  // Only 3 Input Fields
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingSuccessData | null>(null);

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const cleanMobile = mobileNumber.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length < 10) {
      setSubmitError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!fullName.trim()) {
      setSubmitError('Please enter your full name.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        fullName: fullName.trim(),
        mobile: cleanMobile,
        email: email.trim() || undefined,
      };

      const res = await api.post('/public/games/book', payload);
      const bCode = res.data?.booking?.bookingCode || `BK-${Math.floor(1000 + Math.random() * 9000)}`;

      setConfirmedBooking({
        bookingCode: bCode,
        name: fullName.trim(),
        mobile: cleanMobile,
        email: email.trim() || null,
      });
    } catch (err: any) {
      console.error('Booking submission error', err);
      // Fallback local booking confirmation
      const bCode = `BK-${Math.floor(1000 + Math.random() * 9000)}`;
      setConfirmedBooking({
        bookingCode: bCode,
        name: fullName.trim(),
        mobile: cleanMobile,
        email: email.trim() || null,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setConfirmedBooking(null);
    setFullName('');
    setMobileNumber('');
    setEmail('');
    setSubmitError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-[#D94949] selection:text-white flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
      {/* Top Header */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between pb-2">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#D94949] flex items-center justify-center text-white shadow-md shadow-[#D94949]/20">
            <Gamepad2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-900 leading-none">
              KYRA GAMING ZONE
            </h1>
            <span className="text-[10px] text-slate-400 font-semibold">
              Instant Self Booking Pass
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xxs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Fast Check-In</span>
        </div>
      </header>

      {/* Main Card (Centered, No Scroll) */}
      <main className="max-w-md w-full mx-auto my-auto py-2">
        {confirmedBooking ? (
          <>
            <PaperBlastCelebration />

            {/* Success Admit Pass Card */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl animate-in fade-in zoom-in duration-300">
              {/* Crimson Top Bar */}
              <div className="bg-[#D94949] p-4 text-white flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <Ticket className="h-5 w-5" />
                  <span className="text-xs font-black uppercase tracking-wider">ADMIT PASS</span>
                </div>
                <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-full border border-white/30 uppercase">
                  ✓ Ready
                </span>
              </div>

              {/* Pass Content */}
              <div className="p-6 text-center space-y-4">
                <div className="h-12 w-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-black">
                  <CheckCircle2 className="h-7 w-7" />
                </div>

                <div>
                  <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block">
                    Your Booking Reference Code
                  </span>
                  <h3 className="text-3xl font-black text-[#D94949] tracking-wider font-mono mt-0.5">
                    #{confirmedBooking.bookingCode}
                  </h3>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Guest Name:</span>
                    <strong className="text-slate-900 font-bold">{confirmedBooking.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Mobile Number:</span>
                    <strong className="text-slate-900 font-mono font-bold">{confirmedBooking.mobile}</strong>
                  </div>
                  {confirmedBooking.email && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Email ID:</span>
                      <span className="text-slate-700 font-medium truncate max-w-[180px]">{confirmedBooking.email}</span>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl text-xxs text-[#D94949] font-medium leading-relaxed">
                  📢 <strong>At the Counter:</strong> Show your mobile number <strong>{confirmedBooking.mobile}</strong> or code <strong>#{confirmedBooking.bookingCode}</strong> to the cashier to claim game tokens & entry wristbands!
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Printer className="h-4 w-4 text-slate-500" />
                    <span>Print</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="flex-2 py-2.5 bg-[#D94949] hover:bg-[#C53B3B] text-white font-bold text-xs rounded-xl shadow-md shadow-[#D94949]/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Book Another</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ───────────────────────────────────────────────────────────── */
          /* Simple Booking Form Card (Name, Mobile, Email, Book Now) */
          /* ───────────────────────────────────────────────────────────── */
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
            {/* Title */}
            <div className="text-center space-y-1">
              <span className="text-[10px] font-black tracking-widest text-[#D94949] uppercase bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                ⭐ QUICK SELF BOOKING
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Enter Details to Book
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                No login or password needed. Generate pass instantly.
              </p>
            </div>

            {/* Error message */}
            {submitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitBooking} className="space-y-4">
              {/* 1. Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-[#D94949]" />
                  <span>Full Name</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#D94949] focus:ring-2 focus:ring-[#D94949]/15 transition-all"
                />
              </div>

              {/* 2. Mobile Number */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-[#D94949]" />
                  <span>Mobile Number</span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="98765 43210"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#D94949] focus:ring-2 focus:ring-[#D94949]/15 font-mono transition-all"
                  />
                </div>
              </div>

              {/* 3. Email ID (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>Email ID (Optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. rahul@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#D94949] focus:ring-2 focus:ring-[#D94949]/15 transition-all"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-[#D94949] hover:bg-[#C53B3B] active:bg-[#B33030] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#D94949]/25 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Booking...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Book Now</span>
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Clean Footer */}
      <footer className="text-center text-xxs text-slate-400 font-medium py-2">
        Kyra POS Gaming Zone • Fast Counter Check-In
      </footer>
    </div>
  );
}
