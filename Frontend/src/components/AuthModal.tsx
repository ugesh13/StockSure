'use client';

import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, AlertCircle, CheckCircle, ArrowRight, Sparkles, Phone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AuthModal() {
  const { isAuthModalOpen, authMode, closeAuthModal, setAuthMode, login, register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

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
      }
    } else {
      const res = await register(name, email, password, phone.trim() || undefined);
      if (!res.success) {
        setErrorMessage(res.message || 'Unable to register account.');
      } else {
        setSuccessMessage('Account created successfully!');
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
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest/50 backdrop-blur-md animate-fade-in">
      {/* Glassmorphism Auth Panel with 28px radius */}
      <div
        className="relative w-full max-w-md glass-panel rounded-modal bg-cream/95 border border-forest/15 shadow-elevated p-8 sm:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-forest/10 text-forest transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
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
        <div className="flex rounded-full bg-forest/5 p-1 mb-6 border border-forest/10">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all ${
              authMode === 'login' ? 'bg-forest text-cream shadow-sm' : 'text-darktext/70 hover:text-forest'
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
              authMode === 'register' ? 'bg-forest text-cream shadow-sm' : 'text-darktext/70 hover:text-forest'
            }`}
          >
            Register
          </button>
        </div>

        {/* Alerts */}
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
                    className="w-full pl-10 pr-4 py-3 rounded-input bg-cream-light/80 border border-forest/15 text-forest placeholder:text-darktext/40 text-xs focus:outline-none focus:border-forest/50"
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
                    className="w-full pl-10 pr-4 py-3 rounded-input bg-cream-light/80 border border-forest/15 text-forest placeholder:text-darktext/40 text-xs focus:outline-none focus:border-forest/50"
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
                className="w-full pl-10 pr-4 py-3 rounded-input bg-cream-light/80 border border-forest/15 text-forest placeholder:text-darktext/40 text-xs focus:outline-none focus:border-forest/50"
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
                className="w-full pl-10 pr-4 py-3 rounded-input bg-cream-light/80 border border-forest/15 text-forest placeholder:text-darktext/40 text-xs focus:outline-none focus:border-forest/50"
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
            <span>{isSubmitting ? 'Authenticating...' : authMode === 'login' ? 'Sign In' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Account Quick-Fill Helper */}
        {authMode === 'login' && (
          <div className="mt-6 pt-4 border-t border-forest/10 text-center">
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
  );
}
