import React, { useEffect, useRef, useCallback } from 'react';
import StockSureHero, { LETTER_PHYSICS } from './StockSureHero';

export default function UnifiedScrollExperience() {
  const containerRef = useRef(null);

  // Stage 1: Drone Video Refs
  const droneSectionRef = useRef(null);
  const droneVidRef = useRef(null);

  // Stage 2: Hero Section Refs
  const heroSectionRef = useRef(null);
  const heroContainerRef = useRef(null);
  const heroHeadlineRef = useRef(null);
  const heroLetterRefs = useRef([]);
  const heroUiRef = useRef({});

  // Performance tracking refs (rAF loop)
  const scrollYRef = useRef(0);
  const smoothedScrollYRef = useRef(0);
  const rafIdRef = useRef(null);

  // Initialize Drone video: paused at frame 0, muted, zero autoplay
  useEffect(() => {
    const v = droneVidRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
      v.playbackRate = 1.0;
      v.addEventListener(
        'loadeddata',
        () => {
          v.pause();
          v.currentTime = 0;
        },
        { once: true }
      );
    }
  }, []);

  // Window/Container scroll handler
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    scrollYRef.current = containerRef.current.scrollTop;
  }, []);

  // Coordinated 60fps rAF Animation Engine
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;

      const targetY = scrollYRef.current;
      let currY = smoothedScrollYRef.current;

      // Snappy yet silky smooth spring interpolation
      const delta = targetY - currY;
      if (Math.abs(delta) < 0.5) {
        currY = targetY;
      } else {
        currY += delta * 0.35;
      }
      smoothedScrollYRef.current = currY;

      const viewportH = window.innerHeight || 800;

      // -----------------------------------------------------------------------
      // STAGE 1: DRONE ENTRANCE SECTION
      // Height: 240vh (Scroll distance: 1.4 * viewportH)
      // -----------------------------------------------------------------------
      const droneScrollDistance = 1.4 * viewportH;
      const p1 = Math.min(Math.max(currY / droneScrollDistance, 0), 1);

      const droneVid = droneVidRef.current;
      if (droneVid) {
        const dur = droneVid.duration && !isNaN(droneVid.duration) ? droneVid.duration : 7.93;
        const targetTime = p1 * Math.max(0, dur - 0.08);

        if (!droneVid.seeking && Math.abs(droneVid.currentTime - targetTime) > 0.02) {
          droneVid.currentTime = targetTime;
        }
      }

      // -----------------------------------------------------------------------
      // STAGE 2: STOCKSURE HERO SECTION REVEAL & TYPOGRAPHY ANIMATION
      // Starts right as Drone reaches its end (at droneScrollDistance)
      // Height: 280vh (Scroll distance: 1.8 * viewportH)
      // -----------------------------------------------------------------------
      const heroStartOffset = droneScrollDistance;
      const heroScrollDistance = 1.8 * viewportH;
      const yInHero = currY - heroStartOffset;
      const p2 = Math.min(Math.max(yInHero / heroScrollDistance, 0), 1);

      // Hero UI Elements visibility and entry
      if (heroContainerRef.current) {
        // Crossfade into hero seamlessly as drone reaches completion
        let heroOpacity = 0;
        if (currY < heroStartOffset - 0.2 * viewportH) {
          heroOpacity = 0;
        } else if (currY <= heroStartOffset) {
          heroOpacity = (currY - (heroStartOffset - 0.2 * viewportH)) / (0.2 * viewportH);
        } else {
          heroOpacity = 1;
        }
        heroContainerRef.current.style.opacity = heroOpacity.toFixed(3);
      }

      // "BEYOND THE CODE" Scroll-Driven Typography Animation
      if (heroHeadlineRef.current) {
        // Phase A: Initial presentation (p2: 0.0 -> 0.30)
        // Phase B: Dramatic Scaling & 3D Perspective (p2: 0.30 -> 0.65)
        // Phase C: 3D Letter Tumbling & Dispersal (p2: 0.65 -> 0.95)

        if (p2 <= 0.30) {
          // Resting hero position matching design
          heroHeadlineRef.current.style.transform = `scale(1) translate3d(0, 0, 0) rotateX(0deg)`;
          
          // Reset letters to crisp alignment
          heroLetterRefs.current.forEach((el) => {
            if (el) {
              el.style.transform = `translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) rotateZ(0deg)`;
              el.style.opacity = '1';
            }
          });
        } else if (p2 <= 0.65) {
          // Dramatic scaling and perspective tilt
          const scaleFactor = (p2 - 0.30) / 0.35; // 0 to 1
          const scale = 1.0 + scaleFactor * 0.45; // Scales up to 1.45x
          const rotX = -scaleFactor * 8; // subtle 3D tilt
          const transZ = scaleFactor * 120; // moves forward into viewport

          heroHeadlineRef.current.style.transform = `scale(${scale.toFixed(3)}) translate3d(0, ${(-scaleFactor * 25).toFixed(1)}px, ${transZ.toFixed(1)}px) rotateX(${rotX.toFixed(2)}deg)`;

          // Letters stay together during scale
          heroLetterRefs.current.forEach((el) => {
            if (el) {
              el.style.transform = `translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) rotateZ(0deg)`;
              el.style.opacity = '1';
            }
          });
        } else {
          // Letters break off baseline and disperse in 3D physics (like "BEYOND THE CODE")
          const disperseProgress = Math.min((p2 - 0.65) / 0.30, 1); // 0 to 1
          const baseScale = 1.45;

          heroHeadlineRef.current.style.transform = `scale(${baseScale}) translate3d(0, -25px, 120px) rotateX(-8deg)`;

          // Apply individual 3D transformation vectors with stagger
          heroLetterRefs.current.forEach((el, idx) => {
            if (!el) return;
            const physics = LETTER_PHYSICS[idx] || { rx: 20, ry: -20, rz: 15, tx: 50, ty: 100, tz: 150 };

            // Staggered delay for each letter
            const stagger = (idx / heroLetterRefs.current.length) * 0.25;
            const letterT = Math.min(Math.max((disperseProgress - stagger) / (1 - stagger), 0), 1);

            // Ease out cubic
            const eased = 1 - Math.pow(1 - letterT, 2.5);

            const rx = (physics.rx * eased).toFixed(1);
            const ry = (physics.ry * eased).toFixed(1);
            const rz = (physics.rz * eased).toFixed(1);
            const tx = (physics.tx * eased * 1.5).toFixed(1);
            const ty = (physics.ty * eased * 1.6).toFixed(1);
            const tz = (physics.tz * eased * 1.4).toFixed(1);
            const op = (1 - eased * 0.45).toFixed(2);

            el.style.transform = `translate3d(${tx}px, ${ty}px, ${tz}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`;
            el.style.opacity = op;
          });
        }
      }

      // Parallax fade for tagline and feature bar during dispersal
      if (heroUiRef.current) {
        const { tagline, featureBar, badge } = heroUiRef.current;
        const uiFade = p2 > 0.45 ? Math.max(1 - (p2 - 0.45) / 0.30, 0.15) : 1;
        if (tagline) tagline.style.opacity = uiFade.toFixed(2);
        if (badge) badge.style.opacity = uiFade.toFixed(2);
        if (featureBar) {
          const barY = p2 > 0.45 ? (p2 - 0.45) * 60 : 0;
          featureBar.style.transform = `translateY(${barY.toFixed(1)}px)`;
          featureBar.style.opacity = uiFade.toFixed(2);
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
      className="relative w-screen h-screen overflow-y-auto overflow-x-hidden select-none bg-black text-[#F8F7F3]"
      style={{ scrollBehavior: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      {/* =====================================================================
          STAGE 1: DRONE ENTRANCE SECTION (240vh Track with Sticky Viewport)
          Strictly paused at frame 0, pure video, scrubbed by scrolling
          ===================================================================== */}
      <section
        ref={droneSectionRef}
        className="relative w-full h-[240vh] bg-black"
      >
        <div className="sticky top-0 w-full h-screen overflow-hidden flex items-center justify-center bg-black">
          <video
            ref={droneVidRef}
            src="/videos/drone.mp4"
            preload="auto"
            muted
            playsInline
            className="w-full h-full object-contain pointer-events-none"
          />
        </div>
      </section>

      {/* =====================================================================
          STAGE 2: STOCKSURE HERO SECTION (280vh Track with Sticky Viewport)
          Reveals automatically upon completing Drone entrance!
          Features "MORE THAN A STORE." 3D typography animation
          ===================================================================== */}
      <section
        ref={heroSectionRef}
        className="relative w-full h-[280vh] bg-black"
      >
        <div className="sticky top-0 w-full h-screen overflow-hidden bg-black">
          <StockSureHero
            ref={heroContainerRef}
            headlineRef={heroHeadlineRef}
            letterRefs={heroLetterRefs}
            heroUiRef={heroUiRef}
          />
        </div>
      </section>

      {/* =====================================================================
          STAGE 3: NORMAL SCROLLING CONTINUATION FOOTER
          Provides natural continuation so user is never trapped in scroll
          ===================================================================== */}
      <section className="relative w-full py-20 px-6 sm:px-12 bg-[#061a10] border-t border-emerald-500/20 text-center">
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
    </div>
  );
}
