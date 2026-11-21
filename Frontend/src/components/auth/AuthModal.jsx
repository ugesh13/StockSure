import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Lock, Mail, User, Phone, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { useShop } from '../../context/ShopContext';

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const { login, register, showToast } = useShop();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Reset errors when mode changes
  useEffect(() => {
    setErrorMsg(null);
  }, [mode]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'register' && !name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const user = await login(trimmedEmail, password);
        showToast(`Welcome back, ${user.name || 'Shopper'}!`);
      } else {
        const user = await register({
          name: name.trim(),
          email: trimmedEmail,
          password,
          phone: phone.trim(),
        });
        showToast(`Account created! Welcome, ${user.name}!`);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        window.location.hash = '#shop';
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setMode('login');
    setEmail('shopper1@stocksure.example');
    setPassword('StockSure@2026');
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Dark Translucent Backdrop with Blur */}
      <div
        onClick={() => !loading && onClose()}
        className="fixed inset-0 bg-black/65 backdrop-blur-md transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* Floating Glassmorphic Modal Dialog */}
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden z-10 transition-all duration-300 animate-fade-in-up"
        style={{
          background: 'linear-gradient(145deg, rgba(17, 33, 24, 0.88) 0%, rgba(10, 20, 15, 0.94) 100%)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '1px solid rgba(165, 199, 170, 0.25)',
          boxShadow: `
            0 24px 64px -12px rgba(0, 0, 0, 0.75),
            inset 0 1px 1px 0 rgba(255, 255, 255, 0.2),
            inset 0 -1px 1px 0 rgba(0, 0, 0, 0.5)
          `,
        }}
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#C8E8D0]/5 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header */}
        <div className="p-6 sm:p-7 pb-4 flex items-start justify-between relative">
          <div className="flex items-center gap-3">
            {/* StockSure Emblem */}
            <div className="w-10 h-10 rounded-2xl bg-white/[0.08] border border-white/20 flex items-center justify-center shadow-inner">
              <svg
                className="w-5 h-5 text-[#C8E8D0]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-white">Stock<span className="text-[#C8E8D0]">Sure</span></span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wider bg-emerald-500/20 text-[#A5C7AA] border border-emerald-500/30">
                  RETAIL
                </span>
              </div>
              <p className="text-xs text-stone-300 font-light mt-0.5">
                {mode === 'login' ? 'Sign in to access online shopping' : 'Join StockSure for live store shopping'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => !loading && onClose()}
            className="p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle Switch */}
        <div className="px-6 sm:px-7">
          <div className="grid grid-cols-2 p-1 rounded-xl bg-black/40 border border-white/10">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-emerald-600/40 text-white border border-[#A5C7AA]/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-emerald-600/40 text-white border border-[#A5C7AA]/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 pt-4 space-y-4">
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs font-medium flex items-start gap-2 animate-fade-in-up">
              <span className="font-bold text-rose-300">⚠️</span>
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {/* Register-only: Name */}
          {mode === 'register' && (
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-stone-300 block mb-1.5">
                Full Name
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full bg-black/35 border border-white/15 focus:border-[#A5C7AA] focus:ring-1 focus:ring-[#A5C7AA] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-stone-400 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-stone-300 block mb-1.5">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-black/35 border border-white/15 focus:border-[#A5C7AA] focus:ring-1 focus:ring-[#A5C7AA] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-stone-400 outline-none transition-all"
              />
            </div>
          </div>

          {/* Password Field with Show/Hide toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium uppercase tracking-wider text-stone-300 block">
                Password
              </label>
              <span className="text-[10px] text-stone-400">Min. 6 characters</span>
            </div>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/35 border border-white/15 focus:border-[#A5C7AA] focus:ring-1 focus:ring-[#A5C7AA] rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-stone-400 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-stone-400 hover:text-stone-200 transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Register-only: Phone */}
          {mode === 'register' && (
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-stone-300 block mb-1.5">
                Phone Number (Optional)
              </label>
              <div className="relative flex items-center">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-black/35 border border-white/15 focus:border-[#A5C7AA] focus:ring-1 focus:ring-[#A5C7AA] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-stone-400 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#183D2B] via-[#246640] to-[#183D2B] hover:brightness-110 active:scale-[0.99] border border-[#A5C7AA]/40 text-white text-xs sm:text-sm font-semibold tracking-wide shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#C8E8D0]" />
                <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
              </>
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In & Start Shopping' : 'Create Account & Continue'}</span>
                <span className="text-[#C8E8D0] font-bold">→</span>
              </>
            )}
          </button>

          {/* Quick Demo Credentials Autofill */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-stone-400">
            <span>Tester / Demo Account:</span>
            <button
              type="button"
              onClick={fillDemoAccount}
              className="inline-flex items-center gap-1 text-[#C8E8D0] hover:text-white underline font-medium cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Use Shopper1 Demo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
