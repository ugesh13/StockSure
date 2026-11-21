'use client';

import React, { useState } from 'react';
import { Sprout, Mail, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onSelectCategory: (catId: string) => void;
}

export default function Footer({ onSelectCategory }: FooterProps) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubscribed(true);
    setEmail('');
  };

  return (
    <footer className="bg-forest text-cream pt-20 pb-12 px-4 sm:px-8 border-t border-forest-700/60 mt-20 relative overflow-hidden">
      {/* Decorative botanical background blur */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-moss/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-sage/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-16 relative z-10">
        {/* Newsletter Callout Banner */}
        <div className="p-8 sm:p-12 rounded-[28px] bg-forest-900/60 border border-cream/10 backdrop-blur-md flex flex-col lg:flex-row items-center justify-between gap-8 shadow-elevated">
          <div className="space-y-2 max-w-lg text-center lg:text-left">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-sage-light">
              The Botanical Gazette
            </span>
            <h3 className="editorial-serif text-3xl sm:text-4xl font-light text-cream">
              Cultivate your botanical knowledge.
            </h3>
            <p className="text-xs sm:text-sm text-cream/70 leading-relaxed font-sans">
              Receive seasonal repotting calendars, greenhouse harvest releases, and masterclass
              horticulture advice delivered fortnightly.
            </p>
          </div>

          <div className="w-full lg:w-auto">
            {subscribed ? (
              <div className="p-4 rounded-button bg-moss/30 border border-moss/50 text-cream text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sage-light flex-shrink-0" />
                <span>You have been enrolled in The Botanical Gazette. Welcome!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 w-full sm:w-96">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-cream/40 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address..."
                    className="w-full pl-11 pr-4 py-3.5 rounded-input bg-cream/10 border border-cream/20 text-cream placeholder:text-cream/40 text-xs focus:outline-none focus:border-sage-light focus:ring-1 focus:ring-sage-light"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3.5 rounded-button bg-cream text-forest font-semibold text-xs uppercase tracking-wider hover:bg-cream-dark transition-all duration-300 shadow-soft flex items-center justify-center gap-1.5 flex-shrink-0"
                >
                  <span>Subscribe</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
            {error && <p className="text-xs text-red-300 mt-2">{error}</p>}
          </div>
        </div>

        {/* 4-Column Navigation Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5 text-cream">
              <div className="w-9 h-9 rounded-full bg-cream text-forest flex items-center justify-center shadow-sm">
                <Sprout className="w-5 h-5 text-forest" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-2xl font-bold tracking-widest leading-none">
                  VERDANT
                </span>
                <span className="text-[9px] uppercase tracking-[0.25em] text-sage-light font-semibold mt-0.5">
                  Botanical Sanctuary
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-cream/70 leading-relaxed font-sans max-w-sm">
              Cultivating living architectural botanicals with generational care. Certified
              100% peat-free, sustainably acclimated, and thoughtfully dispatched.
            </p>

            {/* Social SVGs */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-cream/10 hover:bg-cream/20 flex items-center justify-center text-cream transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-cream/10 hover:bg-cream/20 flex items-center justify-center text-cream transition-colors"
                aria-label="Facebook"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.667 5H18V0h-3.808C10.595 0 9 1.583 9 4.615V8z" />
                </svg>
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-cream/10 hover:bg-cream/20 flex items-center justify-center text-cream transition-colors"
                aria-label="Twitter / X"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Department Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-sage-light">
              Departments
            </h4>
            <ul className="space-y-2 text-xs text-cream/80 font-medium">
              <li>
                <button
                  onClick={() => onSelectCategory('indoor-plants')}
                  className="hover:text-cream hover:underline text-left"
                >
                  Indoor Plants
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectCategory('outdoor-plants')}
                  className="hover:text-cream hover:underline text-left"
                >
                  Outdoor Perennials
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectCategory('flowering-plants')}
                  className="hover:text-cream hover:underline text-left"
                >
                  Flowering Specimens
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectCategory('succulents')}
                  className="hover:text-cream hover:underline text-left"
                >
                  Succulents & Cacti
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectCategory('pots-planters')}
                  className="hover:text-cream hover:underline text-left"
                >
                  Artisanal Planters
                </button>
              </li>
            </ul>
          </div>

          {/* Plant Care & Wisdom */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-sage-light">
              Plant Care
            </h4>
            <ul className="space-y-2 text-xs text-cream/80 font-medium">
              <li>
                <a href="#plant-care" className="hover:text-cream hover:underline">
                  Watering Schedules
                </a>
              </li>
              <li>
                <a href="#plant-care" className="hover:text-cream hover:underline">
                  Sunlight & Exposure
                </a>
              </li>
              <li>
                <a href="#plant-care" className="hover:text-cream hover:underline">
                  Peat-Free Substrates
                </a>
              </li>
              <li>
                <a href="#plant-care" className="hover:text-cream hover:underline">
                  Safe for Pets Flora
                </a>
              </li>
              <li>
                <a href="#plant-care" className="hover:text-cream hover:underline">
                  Beginner Guides
                </a>
              </li>
            </ul>
          </div>

          {/* Sanctuary Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-sage-light">
              The Sanctuary
            </h4>
            <div className="space-y-2 text-xs text-cream/80 leading-relaxed">
              <p>Greenhouse Studio No. 4</p>
              <p>Cotswolds Botanical Way, UK</p>
              <p className="pt-2 text-cream">concierge@verdantbotanicals.com</p>
              <p>+44 (0) 1225 849 320</p>
              <div className="flex items-center gap-1.5 pt-2 text-sage-light font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Certified B-Corp Pending</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Legal bar */}
        <div className="pt-8 border-t border-cream/10 flex flex-col sm:flex-row items-center justify-between text-xs text-cream/60 gap-4">
          <p>© 2026 VERDANT Botanical Sanctuary Ltd. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-cream">Privacy Policy</a>
            <a href="#" className="hover:text-cream">Terms of Botanical Service</a>
            <a href="#" className="hover:text-cream">30-Day Guarantee Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
