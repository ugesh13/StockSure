'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ArrowRight, Sparkles, ShieldCheck, SunMedium, Droplets, Volume2, VolumeX } from 'lucide-react';

interface HeroProps {
  onExplore: () => void;
  onFindPlant: () => void;
}

export default function Hero({ onExplore, onFindPlant }: HeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    // Check user preference for reduced motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(motionQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    if (motionQuery.addEventListener) {
      motionQuery.addEventListener('change', handleMotionChange);
    } else {
      motionQuery.addListener(handleMotionChange);
    }

    return () => {
      if (motionQuery.removeEventListener) {
        motionQuery.removeEventListener('change', handleMotionChange);
      } else {
        motionQuery.removeListener(handleMotionChange);
      }
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      if (isReducedMotion) {
        videoRef.current.pause();
      } else {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setVideoPlaying(true))
            .catch(() => {
              // Browser autoplay policy handled gracefully
            });
        }
      }
    }
  }, [isReducedMotion]);

  const toggleSound = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  return (
    <section className="relative w-full min-h-[92vh] lg:min-h-screen overflow-hidden flex flex-col justify-center pt-28 sm:pt-36 pb-16 px-4 sm:px-8 isolate bg-forest-900">
      {/* Edge-to-Edge Video Background Container */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
        {/* High-Resolution Fallback Poster to guarantee zero layout shift and immediate visual richness */}
        <Image
          src="/images/hero-poster.jpg"
          alt="StockSure botanical nursery greenhouse sanctuary"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />

        {/* Video Asset from Reference folder */}
        {!isReducedMotion && (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            preload="auto"
            poster="/images/hero-poster.jpg"
            onPlaying={() => setVideoPlaying(true)}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ${
              videoPlaying ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <source src="/reference/nursery_shop.mp4" type="video/mp4" />
            <source src="/references/Nursery_shop.mp4" type="video/mp4" />
            <source src="/references/nursery_shop.mp4" type="video/mp4" />
          </video>
        )}

        {/* Subtle dark green botanical gradient overlay for pristine typography contrast */}
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-forest-900/90 via-forest-900/70 to-forest-900/50 pointer-events-none" />
        <div className="absolute inset-0 z-10 bg-forest/20 mix-blend-multiply pointer-events-none" />

        {/* Delicate vignette bottom transition to harmonize with the cream section beneath */}
        <div className="absolute bottom-0 left-0 right-0 z-10 h-28 bg-gradient-to-t from-cream via-cream/30 to-transparent pointer-events-none" />
      </div>

      {/* Hero Content Layer */}
      <div className="relative max-w-7xl mx-auto w-full z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Text & Editorial Typography */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6 sm:space-y-8 text-cream">
            {/* Subtle Pill Tag */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cream/10 backdrop-blur-md border border-cream/20 w-fit text-xs font-semibold text-cream uppercase tracking-widest shadow-sm animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              <span>Living Botanical Sanctuary & Nursery</span>
            </div>

            {/* Headline */}
            <div className="space-y-3">
              <h1 className="editorial-serif text-5xl sm:text-6xl md:text-7xl font-light text-cream leading-[1.05] tracking-tight drop-shadow-sm">
                Bring nature <br />
                <span className="italic font-normal font-serif text-sage-light">closer.</span>
              </h1>
              <p className="text-lg sm:text-xl font-light text-cream/90 tracking-wide font-sans max-w-lg leading-relaxed">
                Thoughtfully grown. Beautifully lived.
              </p>
            </div>

            {/* Editorial Philosophy note */}
            <p className="text-sm sm:text-base text-cream/80 leading-relaxed max-w-xl font-light">
              We cultivate healthy, architectural botanicals in certified organic, peat-free soil.
              From majestic indoor specimens to courtyard perennials, each plant is acclimated to thrive in your sanctuary.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={onExplore}
                className="px-8 py-4 rounded-button bg-cream text-forest font-semibold text-sm sm:text-base hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-elevated flex items-center gap-3 group"
              >
                <span>Explore the collection</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-forest" />
              </button>

              <button
                onClick={onFindPlant}
                className="px-8 py-4 rounded-button border border-cream/30 text-cream font-medium text-sm sm:text-base hover:bg-cream/15 hover:border-cream/50 transition-all duration-300 flex items-center gap-2 group bg-forest-900/30 backdrop-blur-md"
              >
                <Sparkles className="w-4 h-4 text-earth-light group-hover:rotate-12 transition-transform" />
                <span>Find your plant</span>
              </button>

              {/* Discreet Sound Toggle */}
              <button
                onClick={toggleSound}
                aria-label={isMuted ? 'Unmute nursery atmosphere' : 'Mute nursery atmosphere'}
                className="hidden sm:inline-flex p-3 rounded-button border border-cream/20 text-cream/80 hover:text-cream hover:bg-cream/10 backdrop-blur-md transition-colors"
                title={isMuted ? 'Unmute ambience' : 'Mute ambience'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-cream/15 max-w-lg">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-cream/10 backdrop-blur-sm border border-cream/15 flex items-center justify-center text-sage-light flex-shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-[11px] leading-tight">
                  <span className="font-bold text-cream block">30-Day Guarantee</span>
                  <span className="text-cream/70">Healthy arrival</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-cream/10 backdrop-blur-sm border border-cream/15 flex items-center justify-center text-sage-light flex-shrink-0">
                  <SunMedium className="w-4 h-4" />
                </div>
                <div className="text-[11px] leading-tight">
                  <span className="font-bold text-cream block">Acclimated</span>
                  <span className="text-cream/70">Ready for home</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-cream/10 backdrop-blur-sm border border-cream/15 flex items-center justify-center text-sage-light flex-shrink-0">
                  <Droplets className="w-4 h-4" />
                </div>
                <div className="text-[11px] leading-tight">
                  <span className="font-bold text-cream block">Peat-Free</span>
                  <span className="text-cream/70">100% sustainable</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Architectural Glass Nursery Badge Showcase */}
          <div className="lg:col-span-5 relative hidden lg:flex flex-col items-end justify-center">
            <div className="p-6 rounded-[24px] bg-forest-900/60 backdrop-blur-md border border-cream/20 shadow-glass text-cream max-w-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-cream/15">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-sage-light">
                    Nursery Greenhouse Live
                  </span>
                </div>
                <span className="text-[11px] text-cream/70 font-mono">GH-01</span>
              </div>

              <div className="space-y-1">
                <p className="font-serif text-2xl font-light text-cream">
                  Botanical Living Collection
                </p>
                <p className="text-xs text-cream/80 leading-relaxed">
                  Every plant shown is tended by certified horticulturists in peat-free organic substrate, naturally acclimated to indoor light.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-2.5 rounded-[14px] bg-cream/10 border border-cream/10">
                  <span className="text-[10px] text-cream/60 block uppercase font-mono">Microclimate</span>
                  <span className="font-semibold text-cream">72°F · 65% Hum</span>
                </div>
                <div className="p-2.5 rounded-[14px] bg-cream/10 border border-cream/10">
                  <span className="text-[10px] text-cream/60 block uppercase font-mono">Cultivation</span>
                  <span className="font-semibold text-cream">100% Peat-Free</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
