'use client';

import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, AlertCircle, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AuthModal() {
  const { isAuthModalOpen, authMode, closeAuthModal, setAuthMode, login, register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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
      const res = await register(name, email, password);
      if (!res.success) {
        setErrorMessage(res.message || 'Unable to register account.');
      } else {
        setSuccessMessage('Account created successfully!');
      }
    }

    setIsSubmitting(false);
  };

  const handleFillDemoUser = () => {
    setEmail('elena@verdantbotanicals.com');
    setPassword('plantlover2026');
    setErrorMessage('');
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
            {authMode === 'login' ? 'Botanical Portal' : 'Create Sanctuary Account'}
          </h3>
          <p className="text-xs text-darktext/70">
            {authMode === 'login'
              ? 'Sign in to access order tracking and nursery benefits'
              : 'Join our botanical community for acclimated specimens'}
          </p>
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
                  placeholder="Elena Vance"
                  className="w-full pl-10 pr-4 py-3 rounded-input bg-cream-light/80 border border-forest/15 text-forest placeholder:text-darktext/40 text-xs focus:outline-none focus:border-forest/50"
                  required
                />
              </div>
            </div>
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
                placeholder="elena@verdantbotanicals.com"
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
              <span>Fill Demo Account: Elena Vance</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
