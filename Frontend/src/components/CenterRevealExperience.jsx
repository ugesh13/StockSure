import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShoppingCart, ShieldCheck, Zap, Smile, ChevronDown } from 'lucide-react';

export default function CenterRevealExperience() {
  const containerRef = useRef(null);
  const droneVidRef = useRef(null);
  const heroWrapperRef = useRef(null);
  const scrollPromptRef = useRef(null);

  // Flow State: Drone plays naturally first -> when complete, scroll-reveal unlocks
  const [droneFinished, setDroneFinished] = useState(false);
  const droneFinishedRef = useRef(false);

  // Scroll tracking refs for 60fps rAF loop
  const scrollYRef = useRef(0);
  const smoothedProgressRef = useRef(0);
  const rafIdRef = useRef(null);

  // ---------------------------------------------------------------------------
  // 1. DRONE VIDEO NATURAL PLAYBACK
  // Starts automatically at frame 0, plays naturally without scroll control
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const vid = droneVidRef.current;
    if (vid) {
      vid.currentTime = 0;
      vid.playbackRate = 1.0;
      vid.play().catch((err) => {
        console.warn('Drone autoplay notice:', err);
      });
    }
  }, []);

  // When drone video reaches the gate/entrance, sequence is complete
  const handleDroneEnded = () => {
    const vid = droneVidRef.current;
    if (vid) vid.pause(); // Hold final frame at the gate
    droneFinishedRef.current = true;
    setDroneFinished(true);
  };

  const handleDroneTimeUpdate = () => {
    const vid = droneVidRef.current;
    if (!vid) return;
    // When video arrives at the supermarket gate (near end of clip)
    if (vid.duration > 0 && vid.currentTime >= vid.duration - 0.12) {
      handleDroneEnded();
    }
  };

  // ---------------------------------------------------------------------------
  // 2. SCROLL HANDLER: ONLY active after drone sequence finishes
  // Controls the center-origin portal expansion of the hero page
  // ---------------------------------------------------------------------------
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    // If drone has not completed yet, keep viewport at top
    if (!droneFinishedRef.current) {
      if (containerRef.current.scrollTop > 0) {
        containerRef.current.scrollTop = 0;
      }
      return;
    }

    scrollYRef.current = containerRef.current.scrollTop;
  }, []);

  // ---------------------------------------------------------------------------
  // 3. 60FPS rAF ANIMATION ENGINE FOR CENTER-OPENING REVEAL
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;

      if (droneFinishedRef.current) {
        const vh = window.innerHeight || 800;
        // Reveal transition distance: 1.2 viewport heights of scroll
        const revealDistance = 1.2 * vh;
        const targetProgress = Math.min(Math.max(scrollYRef.current / revealDistance, 0), 1);

        // Responsive spring interpolation
        let currP = smoothedProgressRef.current;
        const delta = targetProgress - currP;
        if (Math.abs(delta) < 0.001) {
          currP = targetProgress;
        } else {
          currP += delta * 0.35;
        }
        smoothedProgressRef.current = currP;

        // Apply center-origin portal expansion to Hero layer
        if (heroWrapperRef.current) {
          // Circle radius expands from 0% (center) to 150% (covering corners of widescreen)
          const radius = (currP * 150).toFixed(2);
          heroWrapperRef.current.style.clipPath = `circle(${radius}% at 50% 50%)`;
          heroWrapperRef.current.style.WebkitClipPath = `circle(${radius}% at 50% 50%)`;

          // Subtle cinematic scale from 0.94 -> 1.0 as it expands
          const scale = (0.94 + currP * 0.06).toFixed(3);
          heroWrapperRef.current.style.transform = `scale(${scale})`;

          // Ensure hero is visible once reveal begins
          heroWrapperRef.current.style.opacity = currP > 0.005 ? '1' : '0';
          heroWrapperRef.current.style.pointerEvents = currP > 0.85 ? 'auto' : 'none';
        }

        // Fade out and hide the "Scroll to Enter" prompt once user begins scrolling
        if (scrollPromptRef.current) {
          const promptOpacity = Math.max(1 - currP * 4, 0);
          scrollPromptRef.current.style.opacity = promptOpacity.toFixed(2);
          scrollPromptRef.current.style.display = promptOpacity <= 0.01 ? 'none' : 'flex';
        }
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`relative w-screen h-screen ${
        droneFinished ? 'overflow-y-auto' : 'overflow-hidden'
      } overflow-x-hidden select-none bg-black text-[#F8F7F3]`}
      style={{ scrollBehavior: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      {/* Scroll track: 250vh allows deliberate, smooth portal reveal from center */}
      <div className={`relative w-full ${droneFinished ? 'h-[250vh]' : 'h-screen'}`}>
        
        {/* Pinned Viewport Container */}
        <div className="sticky top-0 w-full h-screen overflow-hidden flex items-center justify-center bg-black">
          
          {/* ===================================================================
              STAGE 1: ORIGINAL DRONE ENTRANCE VIDEO
              Natural normal playback, zero UI, holds final frame at gate
              =================================================================== */}
          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black pointer-events-none">
            <video
              ref={droneVidRef}
              src="/videos/drone.mp4"
              preload="auto"
              muted
              playsInline
              autoPlay
              onEnded={handleDroneEnded}
              onTimeUpdate={handleDroneTimeUpdate}
              className="w-full h-full object-contain"
            />
          </div>

          {/* ===================================================================
              PROMPT: Appears ONLY after drone arrives at the gate
              Invites user to scroll to initiate the center reveal
              =================================================================== */}
          {droneFinished && (
            <div
              ref={scrollPromptRef}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-2 text-white/90 animate-fadeIn transition-opacity duration-300"
            >
              <div className="px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-[#86EFAC]/30 text-[#86EFAC] text-xs font-light tracking-widest uppercase shadow-lg">
                Scroll to Enter
              </div>
              <ChevronDown className="w-5 h-5 text-[#86EFAC] animate-bounce" />
            </div>
          )}

          {/* ===================================================================
              STAGE 2: STOCKSURE HERO PAGE — CENTER-OPENING REVEAL
              Opens from the exact center (50% 50%) via GPU-accelerated clipPath
              Displays the complete StockSure hero graphic cleanly with NO card,
              NO duplicate text, and pixel-perfect interactive navigation.
              =================================================================== */}
          <div
            ref={heroWrapperRef}
            className="absolute inset-0 w-full h-full will-change-transform will-change-clip-path overflow-hidden z-20 pointer-events-none flex items-center justify-center bg-black"
            style={{
              clipPath: 'circle(0% at 50% 50%)',
              WebkitClipPath: 'circle(0% at 50% 50%)',
              transform: 'scale(0.94)',
              opacity: 0,
            }}
          >
            {/* Aspect-Locked 16:9 Stage: guarantees pixel-perfect overlay alignment across all screen sizes */}
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
              <div className="relative w-full aspect-[16/9] max-h-screen max-w-[177.78vh]">
                
                {/* Clean Pristine Hero Graphic */}
                <img
                  src="/hero-image.jpg"
                  alt="StockSure Supermarket Storefront"
                  className="w-full h-full object-cover"
                />

                {/* -------------------------------------------------------------
                    Interactive Navbar Overlay (Anchored to 16:9 Graphic)
                    ------------------------------------------------------------- */}
                <header className="absolute top-0 left-0 right-0 z-40 px-4 sm:px-10 py-3 sm:py-5 pointer-events-none">
                  <div className="flex items-center justify-between px-3 sm:px-6 py-2 rounded-full pointer-events-auto">
                    
                    {/* Brand Logo Click Target */}
                    <button
                      type="button"
                      onClick={() => {
                        if (containerRef.current) containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-28 sm:w-36 h-9 rounded-lg opacity-0 hover:opacity-20 transition-opacity cursor-pointer"
                      aria-label="StockSure Home"
                    />

                    {/* Nav Links Interactive Targets */}
                    <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-light text-transparent">
                      <a
                        href="#about"
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById('experience-details')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="cursor-pointer px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors"
                        aria-label="About"
                      >
                        About
                      </a>
                      <a
                        href="#branches"
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById('experience-details')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="cursor-pointer px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors"
                        aria-label="Branches"
                      >
                        Branches
                      </a>
                      <a
                        href="#vision"
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById('experience-details')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="cursor-pointer px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors"
                        aria-label="Our Vision"
                      >
                        Our Vision
                      </a>
                      <a
                        href="#contact"
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById('experience-details')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="cursor-pointer px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors"
                        aria-label="Contact"
                      >
                        Contact
                      </a>
                    </nav>

                    {/* Start Shopping Button Click Target */}
                    <button
                      type="button"
                      onClick={() => {
                        document.getElementById('experience-details')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="w-28 sm:w-36 h-8 sm:h-9 rounded-full cursor-pointer hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all duration-200 active:scale-95"
                      aria-label="Start Shopping"
                    />

                  </div>
                </header>

                {/* -------------------------------------------------------------
                    Interactive Feature Pillars (Anchored to 16:9 Graphic)
                    ------------------------------------------------------------- */}
                <div className="absolute bottom-3 sm:bottom-6 left-4 sm:left-10 right-4 sm:right-10 z-30 pointer-events-none">
                  <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-6 px-3 sm:px-8 py-2 pointer-events-auto">
                    <div
                      className="h-8 sm:h-11 rounded-xl cursor-pointer hover:bg-white/[0.08] transition-colors"
                      onClick={() => document.getElementById('experience-details')?.scrollIntoView({ behavior: 'smooth' })}
                      title="Fresh Products Always"
                    />
                    <div
                      className="h-8 sm:h-11 rounded-xl cursor-pointer hover:bg-white/[0.08] transition-colors"
                      onClick={() => document.getElementById('experience-details')?.scrollIntoView({ behavior: 'smooth' })}
                      title="Trusted Quality Always"
                    />
                    <div
                      className="h-8 sm:h-11 rounded-xl cursor-pointer hover:bg-white/[0.08] transition-colors"
                      onClick={() => document.getElementById('experience-details')?.scrollIntoView({ behavior: 'smooth' })}
                      title="Convenient Shopping"
                    />
                    <div
                      className="h-8 sm:h-11 rounded-xl cursor-pointer hover:bg-white/[0.08] transition-colors"
                      onClick={() => document.getElementById('experience-details')?.scrollIntoView({ behavior: 'smooth' })}
                      title="A Happier You"
                    />
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Normal Scrolling Content: unlocks smoothly after portal is fully revealed */}
      {droneFinished && (
        <section id="experience-details" className="relative w-full py-20 px-6 sm:px-12 bg-[#061a10] border-t border-emerald-500/20 text-center">
          <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs tracking-widest uppercase">
              <span>Everyday Freshness</span>
            </div>
            <h3 className="text-2xl sm:text-4xl font-light text-white tracking-tight">
              Experience the Future of Supermarket Shopping
            </h3>
            <p className="text-xs sm:text-sm font-light text-stone-300 max-w-md">
              Smart live inventory, visual shelf transparency, and verified freshness at your fingertips.
            </p>
            <div className="text-[11px] text-stone-400 mt-8 tracking-wider">
              © 2026 StockSure Retail Technologies. All rights reserved.
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
