'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Phone,
  ChevronDown,
  FastForward,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface GateEntryProps {
  initialMode?: 'login' | 'register';
  onClose?: () => void;
}

export default function GateEntry({ initialMode, onClose }: GateEntryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login, register } = useAuth();

  // Mode: check URL searchParam `mode` first, then prop, default to 'login'
  const paramMode = searchParams?.get('mode');
  const [authMode, setAuthMode] = useState<'login' | 'register'>(
    paramMode === 'register' || initialMode === 'register' ? 'register' : 'login'
  );

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Video & Scroll Scrubbing State
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1

  // Target and current progress for lerping
  const targetPRef = useRef(0);
  const currentPRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  // If already logged in, redirect to profile
  useEffect(() => {
    if (user && !user.is_guest) {
      router.push('/profile');
    }
  }, [user, router]);

  // Check prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setIsReducedMotion(true);
      setProgress(1);
      currentPRef.current = 1;
      targetPRef.current = 1;
    }
    const handler = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
      if (e.matches) {
        setProgress(1);
        currentPRef.current = 1;
        targetPRef.current = 1;
      }
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Scroll listener & lerp animation loop
  useEffect(() => {
    if (isReducedMotion) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const maxScroll = Math.max(docHeight - winHeight, 1);
      const raw = Math.min(Math.max(scrollY / maxScroll, 0), 1);
      targetPRef.current = raw;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    let isRunning = true;
    const loop = () => {
      if (!isRunning) return;

      const diff = targetPRef.current - currentPRef.current;
      if (Math.abs(diff) > 0.0005) {
        currentPRef.current += diff * 0.16;
      } else {
        currentPRef.current = targetPRef.current;
      }

      const p = currentPRef.current;
      setProgress(p);

      // Scrub video currentTime
      const video = videoRef.current;
      if (video && video.duration && !videoError) {
        const targetTime = p * video.duration;
        if (Math.abs(video.currentTime - targetTime) > 0.02) {
          video.currentTime = targetTime;
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      window.removeEventListener('scroll', handleScroll);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isReducedMotion, videoError]);

  // Skip intro helper: jumps to 1
  const handleSkipIntro = () => {
    const docHeight = document.documentElement.scrollHeight;
    const winHeight = window.innerHeight;
    const maxScroll = Math.max(docHeight - winHeight, 0);
    window.scrollTo({ top: maxScroll, behavior: 'smooth' });
    targetPRef.current = 1;
  };

  // Exit helper
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.push('/');
    }
  };

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (authMode === 'register' && (!name || name.trim().length < 2)) {
      setErrorMessage('Please provide your full name.');
      return;
    }

    setIsSubmitting(true);

    if (authMode === 'login') {
      const res = await login(email, password);
      if (!res.success) {
        setErrorMessage(res.message || 'Unable to sign in. Please check credentials.');
      } else {
        router.push('/shop');
      }
    } else {
      const res = await register(name, email, password, phone.trim() || undefined);
      if (!res.success) {
        setErrorMessage(res.message || 'Unable to register account.');
      } else {
        setSuccessMessage('Account created successfully!');
        router.push('/shop');
      }
    }

    setIsSubmitting(false);
  };

  const handleFillDemoUser = async () => {
    setEmail('priya@stocksure.in');
    setPassword('Password123!');
    setErrorMessage('');
    setIsSubmitting(true);
    const res = await login('priya@stocksure.in', 'Password123!');
    if (!res.success) {
      setErrorMessage(res.message || 'Unable to sign in with demo account.');
    } else {
      router.push('/shop');
    }
    setIsSubmitting(false);
  };

  // Card opacity: reveals at >= 0.97, hides at < 0.95
  const isCardVisible = isReducedMotion || progress >= 0.97;

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-[var(--gate-avg,#6c5d3b)] select-none"
      style={{ minHeight: isReducedMotion ? '100vh' : '450vh' }}
    >
      {/* Fixed Fullscreen Presentation Viewport */}
      <div className="fixed inset-0 w-full h-full overflow-hidden flex items-center justify-center pointer-events-none">
        {/* Background / Video Layer */}
        {!videoError ? (
          <video
            ref={videoRef}
            src="/videos/gate-scrub.mp4"
            poster="/images/gate-first.jpg"
            autoPlay={false}
            muted={true}
            playsInline={true}
            controls={false}
            preload="auto"
            onLoadedData={() => setIsVideoLoaded(true)}
            onError={() => {
              console.warn('Video scrub load error, falling back to static poster.');
              setVideoError(true);
            }}
            className="w-full h-full object-cover pointer-events-none"
          />
        ) : (
          <img
            src="/images/gate-last.jpg"
            alt="StockSure Nursery Gate Sanctuary"
            className="w-full h-full object-cover pointer-events-none"
          />
        )}

        {/* Ambient Warm Vignette & Overlay */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-700"
          style={{
            background: `radial-gradient(ellipse at center, transparent 35%, rgba(60, 68, 35, 0.4) 75%, rgba(89, 55, 28, 0.75) 100%)`,
            opacity: progress > 0.8 ? 0.9 : 0.6,
          }}
        />

        {/* Top Controls: Close (X) & Skip Intro */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-40 pointer-events-auto">
          {/* Logo badge */}
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-cream/90 backdrop-blur-md border border-forest/15 shadow-soft">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="editorial-serif font-bold text-xs uppercase tracking-widest text-forest">
              StockSure Sanctuary
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!isReducedMotion && progress < 0.95 && (
              <button
                type="button"
                onClick={handleSkipIntro}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-cream/90 hover:bg-cream text-forest text-xs font-semibold backdrop-blur-md border border-forest/15 shadow-soft transition-all hover:scale-105"
                title="Skip to login"
              >
                <span>Skip to Sign In</span>
                <FastForward className="w-3.5 h-3.5 text-moss" />
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-full bg-cream/90 hover:bg-cream text-forest border border-forest/15 shadow-soft backdrop-blur-md transition-all hover:scale-105"
              aria-label="Close"
              title="Close and return"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Hint: "Scroll down to enter" */}
        {!isReducedMotion && progress <= 0.05 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-cream z-30 pointer-events-none animate-bounce">
            <div className="px-4 py-1.5 rounded-full bg-forest/80 backdrop-blur-md border border-white/20 text-xs font-semibold tracking-wider uppercase shadow-elevated flex items-center gap-2">
              <span>Scroll down to enter nursery</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Preload Progress Indicator (hidden once loaded) */}
        {!isVideoLoaded && !videoError && !isReducedMotion && (
          <div className="absolute bottom-6 right-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 text-white/90 text-[11px] backdrop-blur-md z-30">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-sage-light" />
            <span>Buffering sanctuary video...</span>
          </div>
        )}

        {/* ================= REVEALED LOGIN / REGISTER CARD ================= */}
        <div
          ref={cardRef}
          className={`relative z-[60] w-full max-w-md mx-4 pointer-events-auto transition-all duration-400 transform ${
            isCardVisible
              ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
              : 'opacity-0 translate-y-6 scale-95 pointer-events-none'
          }`}
          onWheel={(e) => {
            // Stop scroll propagation so typing or scrolling within the card stays contained
            e.stopPropagation();
          }}
        >
          <div className="relative rounded-[28px] bg-cream/95 backdrop-blur-xl border border-[var(--gate-edge,#7d6346)]/25 shadow-elevated p-8 sm:p-9 text-darktext">
            {/* Header Lock Icon */}
            <div className="text-center space-y-2 mb-6">
              <div className="w-12 h-12 rounded-full bg-forest text-cream mx-auto flex items-center justify-center shadow-soft">
                <Lock className="w-5 h-5 text-sage-light" />
              </div>
              <h3 className="editorial-serif text-3xl font-light text-forest">
                {authMode === 'login' ? 'StockSure Portal' : 'Create StockSure Account'}
              </h3>
              <p className="text-xs text-darktext/70">
                {authMode === 'login'
                  ? 'Sign in to access order tracking and nursery benefits'
                  : 'Join our community for fresh plants and instant delivery'}
              </p>
            </div>

            {/* Continue with Google Button */}
            <div className="mb-5">
              <a
                href="/backend/auth/google"
                className="w-full py-3 rounded-button bg-white hover:bg-neutral-50 text-darktext font-semibold text-xs border border-forest/20 shadow-xs flex items-center justify-center gap-2.5 transition-all hover:shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </a>

              <div className="relative my-4 flex items-center justify-center">
                <span className="w-full border-t border-forest/10" />
                <span className="bg-cream/95 px-3 text-[11px] uppercase tracking-wider text-darktext/50 font-semibold absolute">
                  or
                </span>
              </div>
            </div>

            {/* Tab switch between Login and Register */}
            <div className="flex rounded-full bg-forest/5 p-1 mb-5 border border-forest/10">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMessage('');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all ${
                  authMode === 'login'
                    ? 'bg-forest text-cream shadow-sm'
                    : 'text-darktext/70 hover:text-forest'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setErrorMessage('');
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all ${
                  authMode === 'register'
                    ? 'bg-forest text-cream shadow-sm'
                    : 'text-darktext/70 hover:text-forest'
                }`}
              >
                Register
              </button>
            </div>

            {/* Error & Success Alerts */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-[14px] bg-red-50/90 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 rounded-[14px] bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'register' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-darktext/80 block">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-forest/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Priya Sharma"
                        className="w-full pl-10 pr-4 py-2.5 rounded-input bg-white/90 border border-forest/15 text-forest placeholder:text-darktext/40 text-xs focus:outline-none focus:border-forest"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-darktext/80 block">
                      Phone (Optional)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-forest/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-10 pr-4 py-2.5 rounded-input bg-white/90 border border-forest/15 text-forest placeholder:text-darktext/40 text-xs focus:outline-none focus:border-forest"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-darktext/80 block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-forest/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="priya@stocksure.in"
                    className="w-full pl-10 pr-4 py-2.5 rounded-input bg-white/90 border border-forest/15 text-forest placeholder:text-darktext/40 text-xs focus:outline-none focus:border-forest"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-darktext/80 block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-forest/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-input bg-white/90 border border-forest/15 text-forest placeholder:text-darktext/40 text-xs focus:outline-none focus:border-forest"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-button bg-forest text-cream font-semibold text-xs uppercase tracking-wider hover:bg-forest-700 transition-all duration-300 shadow-soft hover:shadow-elevated flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                <span>
                  {isSubmitting
                    ? 'Authenticating...'
                    : authMode === 'login'
                    ? 'Sign In'
                    : 'Create Account'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Demo Account Quick-Fill Helper */}
            {authMode === 'login' && (
              <div className="mt-5 pt-3 border-t border-forest/10 text-center">
                <button
                  type="button"
                  onClick={handleFillDemoUser}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-forest/5 hover:bg-forest/10 text-[11px] font-semibold text-forest border border-forest/10 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-earth" />
                  <span>Fill Demo: priya@stocksure.in</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
