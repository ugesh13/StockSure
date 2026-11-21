import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, ArrowRight, Compass, ShoppingCart } from 'lucide-react';
import { sound } from '../utils/audio';

export default function ScrollCinematicArrival({
  onComplete,
  onExploreStore,
}) {
  const containerRef = useRef(null);

  // Video element refs
  const droneRef = useRef(null);
  const enteriorRef = useRef(null);
  const interiorRef = useRef(null);

  // Video layer container refs (for direct 60fps opacity updates without React re-renders)
  const droneLayerRef = useRef(null);
  const enteriorLayerRef = useRef(null);
  const interiorLayerRef = useRef(null);

  // UI element refs (for direct DOM manipulation during scroll)
  const progressBarRef = useRef(null);
  const scrollHintRef = useRef(null);
  const skipButtonRef = useRef(null);

  // Discrete stage state (1: Road, 2: Storefront Reveal, 3: Entrance, 4: Interior Welcome)
  // ONLY changes when crossing stage boundaries (max 4 re-renders total across entire scroll)
  const [stage, setStage] = useState(1);
  const currentStageRef = useRef(1);

  // Smooth scroll tracking refs
  const rawProgressRef = useRef(0);
  const smoothedProgressRef = useRef(0);
  const targetTimesRef = useRef({ drone: 0.6, enterior: 0.1, interior: 0.1 });
  const rafIdRef = useRef(null);

  // Initialize videos on mount: pause at first frame, zero volume, primed for scrub
  useEffect(() => {
    const vids = [
      { ref: droneRef, startTime: 0.6 }, // Trim initial 0.6s static hovering
      { ref: enteriorRef, startTime: 0.1 },
      { ref: interiorRef, startTime: 0.1 },
    ];

    vids.forEach(({ ref, startTime }) => {
      const v = ref.current;
      if (v) {
        v.pause();
        v.currentTime = startTime;
        v.playbackRate = 1.0;
        // Warm up decoder buffer
        v.addEventListener('loadeddata', () => {
          v.pause();
          v.currentTime = startTime;
        }, { once: true });
      }
    });

    // Initial layer opacities
    if (droneLayerRef.current) droneLayerRef.current.style.opacity = '1';
    if (enteriorLayerRef.current) enteriorLayerRef.current.style.opacity = '0';
    if (interiorLayerRef.current) interiorLayerRef.current.style.opacity = '0';
  }, []);

  // Native scroll handler: records raw progress and updates discrete stage only
  const handleScroll = useCallback((e) => {
    const el = e.currentTarget;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) return;

    const p = Math.min(Math.max(el.scrollTop / maxScroll, 0), 1);
    rawProgressRef.current = p;

    // Discrete stage detection: Only triggers React re-render when changing stages
    let nextStage = 1;
    if (p > 0.72) nextStage = 4;
    else if (p > 0.52) nextStage = 3;
    else if (p > 0.27) nextStage = 2;

    if (nextStage !== currentStageRef.current) {
      currentStageRef.current = nextStage;
      setStage(nextStage);
    }
  }, []);

  // High-performance 60fps rAF loop for smooth scrubbing and zero DOM thrashing
  useEffect(() => {
    let active = true;

    // Helper to calculate video target times based on tuned pacing & curves
    const calculateTargets = (p) => {
      const d1 = droneRef.current?.duration || 7.93;
      const d2 = enteriorRef.current?.duration || 7.93;
      const d3 = interiorRef.current?.duration || 7.93;

      // -------------------------------------------------------------
      // SCENE 1: ROAD / DRONE ARRIVAL (0.00 to 0.34)
      // Pacing: ~1.4x perceived pace, trimmed initial 0.6s static pause.
      // 0.00 -> 0.22: brisk road travel (0.6s to 5.2s).
      // 0.22 -> 0.34: deliberate storefront reveal approaching doors (5.2s to 7.6s).
      // -------------------------------------------------------------
      let tDrone = 0.6;
      if (p <= 0.22) {
        const factor = Math.max(p / 0.22, 0);
        tDrone = 0.6 + factor * (5.2 - 0.6); // 1.4x brisk progression
      } else {
        const factor = Math.min(Math.max((p - 0.22) / 0.12, 0), 1);
        tDrone = 5.2 + factor * (Math.min(d1 - 0.15, 7.6) - 5.2); // deliberate reveal
      }

      // -------------------------------------------------------------
      // SCENE 2: ENTERIOR (0.28 to 0.70)
      // Pacing: ~1.2x pace through automatic glass sliding doors & entrance foyer.
      // -------------------------------------------------------------
      const factorEnterior = Math.min(Math.max((p - 0.28) / 0.40, 0), 1);
      const tEnterior = 0.1 + factorEnterior * (Math.min(d2 - 0.15, 7.6) - 0.1);

      // -------------------------------------------------------------
      // SCENE 3: INTERIOR (0.62 to 1.00)
      // Pacing: smooth living supermarket atmosphere, aisles, shoppers.
      // -------------------------------------------------------------
      const factorInterior = Math.min(Math.max((p - 0.62) / 0.36, 0), 1);
      const tInterior = 0.1 + factorInterior * (Math.min(d3 - 0.15, 7.2) - 0.1);

      return { tDrone, tEnterior, tInterior };
    };

    const tick = () => {
      if (!active) return;

      const targetP = rawProgressRef.current;
      let currP = smoothedProgressRef.current;

      // Responsive spring lerp: fast response during active scrolling,
      // snaps to exact position when stopped within delta < 0.001
      const delta = targetP - currP;
      if (Math.abs(delta) < 0.0008) {
        currP = targetP;
      } else {
        currP += delta * 0.32; // snappy yet silky smooth
      }
      smoothedProgressRef.current = currP;

      // Calculate video targets for smoothed position
      const { tDrone, tEnterior, tInterior } = calculateTargets(currP);

      // 1. Scrub Drone Video (active when progress <= 0.38)
      if (currP <= 0.38 && droneRef.current) {
        const v = droneRef.current;
        if (!v.seeking && Math.abs(v.currentTime - tDrone) > 0.025) {
          v.currentTime = tDrone;
        }
      }

      // 2. Scrub Enterior Video (active when progress between 0.26 and 0.74)
      if (currP >= 0.26 && currP <= 0.74 && enteriorRef.current) {
        const v = enteriorRef.current;
        if (!v.seeking && Math.abs(v.currentTime - tEnterior) > 0.025) {
          v.currentTime = tEnterior;
        }
      }

      // 3. Scrub Interior Video (active when progress >= 0.60)
      if (currP >= 0.60 && interiorRef.current) {
        const v = interiorRef.current;
        if (!v.seeking && Math.abs(v.currentTime - tInterior) > 0.025) {
          v.currentTime = tInterior;
        }
      }

      // Direct continuous crossfades without black gaps or DOM re-renders
      // Drone: 1.0 until 0.28, fades out 0.28 -> 0.36
      let droneOp = 0;
      if (currP <= 0.28) {
        droneOp = 1;
      } else if (currP <= 0.36) {
        droneOp = 1 - (currP - 0.28) / 0.08;
      }

      // Enterior: fades in 0.28 -> 0.36, solid until 0.62, fades out 0.62 -> 0.72
      let enteriorOp = 0;
      if (currP > 0.28 && currP <= 0.36) {
        enteriorOp = (currP - 0.28) / 0.08;
      } else if (currP > 0.36 && currP <= 0.62) {
        enteriorOp = 1;
      } else if (currP > 0.62 && currP <= 0.72) {
        enteriorOp = 1 - (currP - 0.62) / 0.10;
      }

      // Interior: fades in 0.62 -> 0.72, solid until 1.00
      let interiorOp = 0;
      if (currP > 0.62 && currP <= 0.72) {
        interiorOp = (currP - 0.62) / 0.10;
      } else if (currP > 0.72) {
        interiorOp = 1;
      }

      // Apply opacities directly to DOM layers
      if (droneLayerRef.current) {
        droneLayerRef.current.style.opacity = droneOp.toFixed(3);
        droneLayerRef.current.style.zIndex = droneOp > 0 ? '10' : '1';
      }
      if (enteriorLayerRef.current) {
        enteriorLayerRef.current.style.opacity = enteriorOp.toFixed(3);
        enteriorLayerRef.current.style.zIndex = enteriorOp > 0 ? '12' : '1';
      }
      if (interiorLayerRef.current) {
        interiorLayerRef.current.style.opacity = interiorOp.toFixed(3);
        interiorLayerRef.current.style.zIndex = interiorOp > 0 ? '14' : '1';
      }

      // Update progress bar
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${currP})`;
      }

      // Update scroll hints
      if (scrollHintRef.current) {
        scrollHintRef.current.style.opacity = currP > 0.82 ? '0' : '1';
      }
      if (skipButtonRef.current) {
        const showSkip = currP < 0.72;
        skipButtonRef.current.style.opacity = showSkip ? '1' : '0';
        skipButtonRef.current.style.pointerEvents = showSkip ? 'auto' : 'none';
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const handleStartShopping = (e) => {
    if (e) e.stopPropagation();
    sound.playChime();
    onComplete();
  };

  const handleExplore = (e) => {
    if (e) e.stopPropagation();
    sound.playChime();
    onExploreStore();
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="relative w-screen h-screen overflow-y-auto overflow-x-hidden select-none bg-black text-[#F8F7F3]"
      style={{ scrollBehavior: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      {/* Scroll track height: 420vh provides deep, luxurious travel without sluggishness */}
      <div className="relative w-full h-[420vh]">
        {/* Sticky viewport frame pinned to the screen */}
        <div className="sticky top-0 w-full h-screen overflow-hidden flex items-center justify-center bg-black">
          
          {/* Subtle Top Cinematic Progress Indicator */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10 z-40 overflow-hidden pointer-events-none">
            <div
              ref={progressBarRef}
              className="h-full w-full bg-gradient-to-r from-[#B9DCC2] via-[#C8E8D0] to-[#DDF3E4] origin-left transition-transform duration-75"
              style={{ transform: 'scaleX(0)' }}
            />
          </div>

          {/* ===================================================================
              VIDEO 1: DRONE (Road Approach & Facade Reveal)
              =================================================================== */}
          <div
            ref={droneLayerRef}
            className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none will-change-opacity"
            style={{ opacity: 1, zIndex: 10 }}
          >
            <video
              ref={droneRef}
              src="/videos/drone.mp4"
              preload="auto"
              muted
              playsInline
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25 pointer-events-none" />
          </div>

          {/* ===================================================================
              VIDEO 2: ENTERIOR (Supermarket Entrance & Automatic Doors)
              =================================================================== */}
          <div
            ref={enteriorLayerRef}
            className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none will-change-opacity"
            style={{ opacity: 0, zIndex: 1 }}
          >
            <video
              ref={enteriorRef}
              src="/videos/enterior.mp4"
              preload="auto"
              muted
              playsInline
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25 pointer-events-none" />
          </div>

          {/* ===================================================================
              VIDEO 3: INTERIOR (Living Supermarket Scene)
              =================================================================== */}
          <div
            ref={interiorLayerRef}
            className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none will-change-opacity"
            style={{ opacity: 0, zIndex: 1 }}
          >
            <video
              ref={interiorRef}
              src="/videos/interior.mp4"
              preload="auto"
              muted
              playsInline
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25 pointer-events-none" />
          </div>

          {/* ===================================================================
              CINEMATIC SCROLL STORYTELLING OVERLAYS
              Discrete stage transitions (smooth opacity + upward translate)
              =================================================================== */}
          <div className="absolute inset-0 flex flex-col justify-end pb-24 sm:pb-28 px-6 text-center z-30 pointer-events-none">
            
            {/* Stage 1: Road Arrival */}
            <div
              className={`transition-all duration-700 ease-out transform ${
                stage === 1
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 -translate-y-4 scale-95 pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-xl'
              }`}
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-[#C8E8D0]/30 text-[#DDF3E4] text-[11px] font-light tracking-widest uppercase mb-3 shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8E8D0] animate-ping" />
                <span>Cinematic Arrival</span>
              </div>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-light text-[#F8F7F3] tracking-tight max-w-2xl mx-auto drop-shadow-md">
                Your everyday shopping. <span className="font-normal italic text-[#C8E8D0]">Reimagined.</span>
              </h2>
              <p className="mt-2 text-xs sm:text-sm font-extralight text-stone-300 tracking-wider">
                Scroll down to approach the supermarket
              </p>
            </div>

            {/* Stage 2: Storefront Reveal */}
            <div
              className={`transition-all duration-700 ease-out transform ${
                stage === 2
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 -translate-y-4 scale-95 pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-xl'
              }`}
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-[#C8E8D0]/30 text-[#DDF3E4] text-[11px] font-light tracking-widest uppercase mb-3 shadow-lg">
                <span>The Storefront</span>
              </div>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-light text-[#F8F7F3] tracking-tight max-w-2xl mx-auto drop-shadow-md">
                A new way to <span className="font-normal italic text-[#C8E8D0]">explore.</span>
              </h2>
              <p className="mt-2 text-xs sm:text-sm font-extralight text-stone-300 tracking-wider">
                Approaching the glass sliding doors
              </p>
            </div>

            {/* Stage 3: Entering The Supermarket */}
            <div
              className={`transition-all duration-700 ease-out transform ${
                stage === 3
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 -translate-y-4 scale-95 pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-xl'
              }`}
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-[#C8E8D0]/30 text-[#DDF3E4] text-[11px] font-light tracking-widest uppercase mb-3 shadow-lg">
                <span>Store Entrance</span>
              </div>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-light text-[#F8F7F3] tracking-tight max-w-2xl mx-auto drop-shadow-md">
                Everything you need. <span className="font-normal italic text-[#C8E8D0]">A smarter experience.</span>
              </h2>
              <p className="mt-2 text-xs sm:text-sm font-extralight text-stone-300 tracking-wider">
                Stepping inside past the shopping bays
              </p>
            </div>

            {/* Stage 4: Welcome & Transition to Shopping */}
            <div
              className={`transition-all duration-700 ease-out transform ${
                stage === 4
                  ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                  : 'opacity-0 translate-y-4 scale-95 pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-xl'
              }`}
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#C8E8D0]/20 backdrop-blur-md border border-[#C8E8D0]/40 text-[#DDF3E4] text-[11px] font-light tracking-widest uppercase mb-3 shadow-lg">
                <span>Supermarket Interior</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-light text-[#F8F7F3] tracking-tight max-w-2xl mx-auto drop-shadow-md">
                Welcome to <span className="font-medium text-[#C8E8D0]">StockSure.</span>
              </h2>
              <p className="mt-2 text-xs sm:text-base font-extralight text-stone-200 tracking-wider max-w-md mx-auto">
                Explore a smarter way to shop with live inventory and shelf transparency.
              </p>

              {/* Action Buttons to Begin Shopping */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
                <button
                  onClick={handleStartShopping}
                  type="button"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-[#B9DCC2] via-[#C8E8D0] to-[#DDF3E4] hover:brightness-105 active:scale-[0.98] border border-[#A4D4AF] text-xs sm:text-sm font-semibold tracking-[0.16em] uppercase text-[#061a10] shadow-[0_8px_32px_rgba(46,125,78,0.35)] transition-all duration-300 hover:scale-[1.03] flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4 text-[#14532D]" />
                  <span>Start Shopping</span>
                  <ArrowRight className="w-4 h-4 text-[#14532D]" />
                </button>

                <button
                  onClick={handleExplore}
                  type="button"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-black/65 hover:bg-black/85 active:scale-[0.98] border border-white/20 hover:border-[#C8E8D0]/50 text-xs sm:text-sm font-light tracking-[0.14em] uppercase text-stone-200 hover:text-white transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-md"
                >
                  <Compass className="w-4 h-4 text-[#C8E8D0]" />
                  <span>Explore Store</span>
                </button>
              </div>
            </div>

          </div>

          {/* ===================================================================
              SCROLL INTERACTION HINT & PROGRESS INDICATOR
              =================================================================== */}
          <div
            ref={scrollHintRef}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-1.5 text-stone-400 transition-opacity duration-300 animate-pulse"
          >
            <span className="text-[10px] font-light tracking-[0.2em] uppercase">
              Scroll To Explore
            </span>
            <ChevronDown className="w-4 h-4 text-[#C8E8D0]" />
          </div>

          {/* Quick "Skip to Store" shortcut in bottom right */}
          <button
            ref={skipButtonRef}
            onClick={handleStartShopping}
            type="button"
            className="absolute bottom-6 right-6 z-40 px-3.5 py-1.5 rounded-full bg-neutral-950/70 hover:bg-neutral-950/90 backdrop-blur-md border border-white/10 hover:border-[#C8E8D0]/40 text-[11px] font-light tracking-wider text-stone-300 hover:text-white transition-all duration-200"
          >
            Skip Arrival →
          </button>

        </div>
      </div>
    </div>
  );
}
