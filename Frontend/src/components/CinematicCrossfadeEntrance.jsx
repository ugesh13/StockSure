import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import DynamicIslandNavbar from './DynamicIslandNavbar';
import GlassSpeechFeaturePanels from './GlassSpeechFeaturePanels';
import FullStop3DCube from './FullStop3DCube';
import AboutUsSection from './AboutUsSection';

/**
 * CinematicCrossfadeEntrance
 * 
 * Flow:
 * 1. Newly trimmed drone entrance video (/videos/drone-entrance.mp4, duration 3.834s)
 *    starts paused at frame 0 on initial page load (no autoplay).
 * 2. User scrolling down scrubs the drone video forward smoothly to the gate (0 -> 1600px).
 * 3. Stopping scroll freezes the video at its exact current frame.
 * 4. As user continues scrolling past the gate arrival distance (1600 -> 3000px),
 *    the drone scene seamlessly dissolves into the StockSure storefront hero page:
 *      - Storefront dusk image background (/new-stocksure-hero.jpg)
 *      - Dynamic Island floating glass navbar with staggered animation
 *      - "Know Our Story" pill button
 *      - Bold "MORE THAN A STORE." headline with light-green "A STORE" + signature full stop
 *      - Tagline: "StockSure is your everyday destination for freshness, quality and convenience."
 *      - Left-aligned speech-bubble glass feature panels with sequential unfolding
 * 5. Scrolling further (3000 -> 5200px) activates the Signature About Us Transition:
 *      - The exact typographic full stop at the end of "A STORE." detaches from the headline.
 *      - It accelerates downward under gravity while morphing into a solid 3D dark emerald cube (#174D32).
 *      - Develops sharp edges, thickness, and 3D depth, tumbling through 3D perspective.
 *      - The About Us section (warm parchment #E9DFCF) slides up smoothly to fill the viewport.
 *      - The cube impacts the landing plinth, performs a subtle controlled settling bounce,
 *        and casts a realistic contact shadow (#0B281A).
 *      - Editorial About Us content reveals in staggered harmony (eyebrow, headline, body, photo).
 * 6. Scrolling backward reverses the entire timeline smoothly and continuously.
 */

// Calibrated scroll track distances
const DRONE_TRACK_HEIGHT = 1600; // px of scroll to scrub trimmed drone video to gate
const CROSSFADE_TRACK_HEIGHT = 1400; // px of scroll to dissolve drone into storefront hero
const ABOUT_TRACK_HEIGHT = 2200; // px of scroll for full-stop cube fall & About Us section reveal

export default function CinematicCrossfadeEntrance({ onStartShopping }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const heroBgRef = useRef(null);
  const heroContentRef = useRef(null);
  const headlineMoreThanRef = useRef(null);
  const headlineStoreRef = useRef(null);
  const taglineRef = useRef(null);
  const knowStoryBtnRef = useRef(null);
  const featurePanelsContainerRef = useRef(null);

  // About Us & 3D Cube Refs
  const fullStopCubeRef = useRef(null);
  const aboutStageRef = useRef(null);
  const targetLandingRef = useRef(null);
  const eyebrowRef = useRef(null);
  const headingRef = useRef(null);
  const bodyRef = useRef(null);
  const photoRef = useRef(null);
  const badgeRef = useRef(null);

  // Crossfade progress for DynamicIslandNavbar state [0.0 - 1.0]
  const [revealProgress, setRevealProgress] = useState(0);

  // Animation & Scroll tracking refs
  const scrollYRef = useRef(0);
  const smoothedDroneProgressRef = useRef(0);
  const smoothedCrossfadeRef = useRef(0);
  const smoothedAboutRef = useRef(0);
  const rafIdRef = useRef(null);
  const videoDurationRef = useRef(3.834);
  const deltaXRef = useRef(0);
  const deltaYRef = useRef(0);

  // Check prefers-reduced-motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // ---------------------------------------------------------------------------
  // 1. Initial Video Setup: Paused at Frame 0 (Strictly No Autoplay)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const handleLoadedMetadata = () => {
      videoDurationRef.current = vid.duration || 3.834;
      vid.pause();
      vid.currentTime = 0;
    };

    if (vid.readyState >= 1) {
      handleLoadedMetadata();
    } else {
      vid.addEventListener('loadedmetadata', handleLoadedMetadata);
    }

    vid.pause();
    vid.currentTime = 0;

    return () => {
      vid.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 2. Measure Target Landing Coordinates for 3D Cube (Hero full stop -> About Us)
  // ---------------------------------------------------------------------------
  const measureCoordinates = useCallback(() => {
    const dotEl = document.getElementById('hero-full-stop-container');
    const targetEl = targetLandingRef.current;
    if (!dotEl || !targetEl) return;

    const dotRect = dotEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const aboutStage = aboutStageRef.current;

    // Compensate for current aboutStage translateY so we calculate settled coordinates
    let currentAboutY = 0;
    if (aboutStage) {
      const style = window.getComputedStyle(aboutStage);
      const matrix = new DOMMatrixReadOnly(style.transform);
      currentAboutY = matrix.m42 || 0;
    }

    const settledTargetX = targetRect.left + targetRect.width / 2;
    const settledTargetY = targetRect.top - currentAboutY + targetRect.height / 2;

    const startX = dotRect.left + dotRect.width / 2;
    const startY = dotRect.top + dotRect.height / 2;

    deltaXRef.current = settledTargetX - startX;
    deltaYRef.current = settledTargetY - startY;
  }, []);

  useEffect(() => {
    measureCoordinates();
    window.addEventListener('resize', measureCoordinates);
    // Re-check after layout stabilization
    const timer = setTimeout(measureCoordinates, 400);
    return () => {
      window.removeEventListener('resize', measureCoordinates);
      clearTimeout(timer);
    };
  }, [measureCoordinates]);

  // ---------------------------------------------------------------------------
  // 3. Scroll Event Handler
  // ---------------------------------------------------------------------------
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    scrollYRef.current = container.scrollTop;
  }, []);

  // ---------------------------------------------------------------------------
  // 4. 60FPS rAF Engine for Smooth Video Scrubbing, Crossfade & 3D Cube Transition
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;

      const st = scrollYRef.current;
      const vid = videoRef.current;
      const heroBg = heroBgRef.current;
      const heroContent = heroContentRef.current;
      const aboutStage = aboutStageRef.current;
      const duration = videoDurationRef.current;

      // =======================================================================
      // PHASE 1: Drone Video Scrubbing (0px -> DRONE_TRACK_HEIGHT)
      // =======================================================================
      const targetDroneProgress = Math.min(Math.max(st / DRONE_TRACK_HEIGHT, 0), 1);
      let currDrone = smoothedDroneProgressRef.current;
      const droneDelta = targetDroneProgress - currDrone;

      if (Math.abs(droneDelta) < 0.0005) {
        currDrone = targetDroneProgress;
      } else {
        currDrone += droneDelta * 0.22;
      }
      smoothedDroneProgressRef.current = currDrone;

      if (vid && duration > 0) {
        const targetTime = Math.min(currDrone * duration, duration - 0.02);
        if (Math.abs(vid.currentTime - targetTime) > 0.02 && !vid.seeking) {
          vid.currentTime = targetTime;
        }
      }

      // =======================================================================
      // PHASE 2: Hero Crossfade (DRONE_TRACK_HEIGHT -> + CROSSFADE_TRACK_HEIGHT)
      // =======================================================================
      let targetCrossfade = 0;
      if (st >= DRONE_TRACK_HEIGHT) {
        targetCrossfade = Math.min(
          Math.max((st - DRONE_TRACK_HEIGHT) / CROSSFADE_TRACK_HEIGHT, 0),
          1
        );
      }

      let currCrossfade = smoothedCrossfadeRef.current;
      const crossfadeDelta = targetCrossfade - currCrossfade;

      if (Math.abs(crossfadeDelta) < 0.0005) {
        currCrossfade = targetCrossfade;
      } else {
        currCrossfade += crossfadeDelta * 0.18;
      }
      smoothedCrossfadeRef.current = currCrossfade;

      // =======================================================================
      // PHASE 3: Hero to About Us Section & 3D Cube Transformation
      // =======================================================================
      const aboutStart = DRONE_TRACK_HEIGHT + CROSSFADE_TRACK_HEIGHT;
      let targetAbout = 0;
      if (st >= aboutStart) {
        targetAbout = Math.min(Math.max((st - aboutStart) / ABOUT_TRACK_HEIGHT, 0), 1);
      }

      let currAbout = smoothedAboutRef.current;
      const aboutDelta = targetAbout - currAbout;

      if (Math.abs(aboutDelta) < 0.0005) {
        currAbout = targetAbout;
      } else {
        currAbout += aboutDelta * 0.18;
      }
      smoothedAboutRef.current = currAbout;

      // -----------------------------------------------------------------------
      // Apply Styles & Transforms via Direct DOM Manipulation (Zero Re-renders)
      // -----------------------------------------------------------------------

      // 1. Drone Video Opacity: fades out during Phase 2
      if (vid) {
        vid.style.opacity = Math.max(1 - currCrossfade, 0).toFixed(4);
      }

      // 2. Hero Background (Dusk Storefront Image)
      if (heroBg) {
        if (currAbout > 0) {
          const bgDim = Math.max(1 - currAbout * 1.6, 0);
          heroBg.style.opacity = (currCrossfade * bgDim).toFixed(4);
        } else {
          heroBg.style.opacity = currCrossfade.toFixed(4);
        }
      }

      // 3. Hero Content Layer: Headline, tagline, feature panels
      if (heroContent) {
        if (currAbout > 0) {
          heroContent.style.pointerEvents = currAbout > 0.4 ? 'none' : 'auto';
        } else {
          heroContent.style.opacity = currCrossfade.toFixed(4);
          heroContent.style.pointerEvents = currCrossfade > 0.4 ? 'auto' : 'none';
        }
      }

      // 4. Headline Typography Fade (MORE THAN A STORE) as the cube detaches
      if (headlineMoreThanRef.current && headlineStoreRef.current) {
        if (currAbout <= 0.08) {
          headlineMoreThanRef.current.style.opacity = '1';
          headlineStoreRef.current.style.opacity = '1';
        } else {
          const textFade = Math.max(1 - (currAbout - 0.08) / 0.22, 0);
          headlineMoreThanRef.current.style.opacity = textFade.toFixed(3);
          headlineStoreRef.current.style.opacity = textFade.toFixed(3);
        }
      }

      if (taglineRef.current && knowStoryBtnRef.current) {
        if (currAbout <= 0.05) {
          taglineRef.current.style.opacity = '1';
          knowStoryBtnRef.current.style.opacity = '1';
        } else {
          const elFade = Math.max(1 - (currAbout - 0.05) / 0.18, 0);
          taglineRef.current.style.opacity = elFade.toFixed(3);
          knowStoryBtnRef.current.style.opacity = elFade.toFixed(3);
        }
      }

      if (featurePanelsContainerRef.current) {
        if (currAbout <= 0.04) {
          featurePanelsContainerRef.current.style.opacity = '1';
        } else {
          const panelFade = Math.max(1 - (currAbout - 0.04) / 0.16, 0);
          featurePanelsContainerRef.current.style.opacity = panelFade.toFixed(3);
        }
      }

      // 5. Update Signature 3D Cube
      fullStopCubeRef.current?.update({
        progress: currAbout,
        deltaX: deltaXRef.current,
        deltaY: deltaYRef.current,
      });

      // 6. About Us Section Slide Up into View
      if (aboutStage) {
        if (currAbout <= 0) {
          aboutStage.style.transform = 'translateY(100%)';
          aboutStage.style.pointerEvents = 'none';
        } else {
          // Slide up curve: covers viewport between 0.04 and 0.76
          const slideP = Math.min(Math.max((currAbout - 0.04) / 0.72, 0), 1);
          const slideEase = prefersReducedMotion ? slideP : 1 - Math.pow(1 - slideP, 3);
          const translateY = (1 - slideEase) * 100;
          aboutStage.style.transform = `translateY(${translateY.toFixed(2)}%)`;
          aboutStage.style.pointerEvents = currAbout > 0.75 ? 'auto' : 'none';
        }
      }

      // 7. Staggered About Us Editorial Content Reveal (Synchronized with Cube Landing)
      if (eyebrowRef.current) {
        const t = Math.min(Math.max((currAbout - 0.74) / 0.09, 0), 1);
        eyebrowRef.current.style.opacity = t.toFixed(3);
        eyebrowRef.current.style.transform = `translateY(${((1 - t) * 16).toFixed(1)}px)`;
      }

      if (headingRef.current) {
        const t = Math.min(Math.max((currAbout - 0.77) / 0.10, 0), 1);
        headingRef.current.style.opacity = t.toFixed(3);
        headingRef.current.style.transform = `translateY(${((1 - t) * 20).toFixed(1)}px)`;
      }

      if (bodyRef.current) {
        const t = Math.min(Math.max((currAbout - 0.81) / 0.10, 0), 1);
        bodyRef.current.style.opacity = t.toFixed(3);
        bodyRef.current.style.transform = `translateY(${((1 - t) * 18).toFixed(1)}px)`;
      }

      if (photoRef.current) {
        const t = Math.min(Math.max((currAbout - 0.78) / 0.14, 0), 1);
        photoRef.current.style.opacity = t.toFixed(3);
        photoRef.current.style.transform = `scale(${(0.95 + t * 0.05).toFixed(3)})`;
      }

      if (badgeRef.current) {
        const t = Math.min(Math.max((currAbout - 0.86) / 0.12, 0), 1);
        badgeRef.current.style.opacity = t.toFixed(3);
        badgeRef.current.style.transform = `translateY(${((1 - t) * 14).toFixed(1)}px)`;
      }

      // 8. Update Navbar Reveal Progress State for Dynamic Island Animation
      setRevealProgress((prev) => {
        if (Math.abs(prev - currCrossfade) > 0.01 || currCrossfade === 0 || currCrossfade === 1) {
          return currCrossfade;
        }
        return prev;
      });

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [prefersReducedMotion]);

  // Total scrollable height: drone track + crossfade track + about track + viewport
  const totalTrackHeight =
    DRONE_TRACK_HEIGHT +
    CROSSFADE_TRACK_HEIGHT +
    ABOUT_TRACK_HEIGHT +
    (typeof window !== 'undefined' ? window.innerHeight : 800);

  const scrollToAbout = () => {
    containerRef.current?.scrollTo({
      top: DRONE_TRACK_HEIGHT + CROSSFADE_TRACK_HEIGHT + ABOUT_TRACK_HEIGHT,
      behavior: 'smooth',
    });
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="relative w-screen h-screen overflow-y-auto overflow-x-hidden select-none bg-black text-[#F8F7F3]"
      style={{ scrollBehavior: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      {/* Scroll track providing controlled, continuous, cinematic scroll distance */}
      <div
        className="relative w-full"
        style={{ height: `${totalTrackHeight}px` }}
      >
        {/* Pinned Viewport: Scenes remain pinned in this exact same viewport */}
        <div className="sticky top-0 w-full h-screen overflow-hidden flex items-center justify-center bg-black">
          
          {/* ===================================================================
              LAYER 1: NEWLY TRIMMED DRONE ENTRANCE VIDEO (/videos/drone-entrance.mp4)
              Scrubbed with scroll, holds final gate frame at end, zero autoplay
              =================================================================== */}
          <video
            ref={videoRef}
            src="/videos/drone-entrance.mp4"
            preload="auto"
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none will-change-[opacity] z-0"
            style={{ opacity: 1 }}
          />

          {/* ===================================================================
              LAYER 2: STOREFRONT DUSK IMAGE BACKGROUND (/new-stocksure-hero.jpg)
              Crossfades in smoothly over the drone final frame
              =================================================================== */}
          <div
            ref={heroBgRef}
            className="absolute inset-0 w-full h-full pointer-events-none will-change-[opacity] z-10"
            style={{ opacity: 0 }}
          >
            <img
              src="/new-stocksure-hero.jpg"
              alt="StockSure Supermarket Storefront"
              className="w-full h-full object-cover object-center"
            />
            {/* Subtle cinematic gradient vignette for depth and text legibility */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 pointer-events-none" />
          </div>

          {/* ===================================================================
              LAYER 3: ABOUT US SECTION (WARM PARCHMENT #E9DFCF)
              Slides up seamlessly underneath the falling 3D cube
              =================================================================== */}
          <div
            ref={aboutStageRef}
            className="absolute inset-0 w-full h-full z-20 will-change-transform"
            style={{
              transform: 'translateY(100%)',
              pointerEvents: 'none',
            }}
          >
            <AboutUsSection
              targetLandingRef={targetLandingRef}
              eyebrowRef={eyebrowRef}
              headingRef={headingRef}
              bodyRef={bodyRef}
              photoRef={photoRef}
              badgeRef={badgeRef}
            />
          </div>

          {/* ===================================================================
              LAYER 4: HERO CONTENT & SIGNATURE FULL STOP 3D CUBE
              Full stop starts in the headline and detaches to fall into About Us
              =================================================================== */}
          <div
            ref={heroContentRef}
            className="absolute inset-0 z-30 pointer-events-none overflow-visible will-change-[opacity]"
            style={{ opacity: 0 }}
          >
            {/* Headline and Tagline Container */}
            <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-14 md:px-20 z-30 pointer-events-none overflow-visible">
              <div className="max-w-2xl pointer-events-auto overflow-visible">
                
                {/* "Know Our Story" Glass Pill Button */}
                <button
                  ref={knowStoryBtnRef}
                  type="button"
                  onClick={scrollToAbout}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.14] backdrop-blur-md border border-white/20 text-[#A7F3D0] text-xs font-medium tracking-wider uppercase mb-5 w-fit shadow-lg transition-all duration-200 cursor-pointer active:scale-95 will-change-[opacity]"
                  aria-label="Know Our Story"
                >
                  <svg
                    className="w-3.5 h-3.5 text-[#86EFAC]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                  </svg>
                  <span className="text-white/95">Know Our Story</span>
                  <span className="text-[#86EFAC] text-xs font-bold ml-0.5">→</span>
                </button>

                {/* Clean, Bold Headline with light-green "A STORE" & EXACT Full Stop Cube */}
                <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[82px] font-black leading-[0.88] tracking-[-0.03em] uppercase drop-shadow-[0_12px_24px_rgba(0,0,0,0.9)] overflow-visible">
                  <span ref={headlineMoreThanRef} className="text-white block will-change-[opacity]">
                    MORE THAN
                  </span>
                  <span className="text-[#A7F3D0] inline-flex items-baseline mt-1.5 sm:mt-2 overflow-visible">
                    <span ref={headlineStoreRef} className="will-change-[opacity]">
                      A STORE
                    </span>
                    {/* The EXACT full stop element that morphs and falls as a 3D Cube */}
                    <FullStop3DCube
                      ref={fullStopCubeRef}
                      prefersReducedMotion={prefersReducedMotion}
                    />
                  </span>
                </h1>

                {/* Subtitle Tagline */}
                <p
                  ref={taglineRef}
                  className="mt-5 text-xs sm:text-sm md:text-base font-light text-stone-200/90 max-w-md tracking-wide leading-relaxed drop-shadow-md will-change-[opacity]"
                >
                  StockSure is your everyday destination for freshness, quality and convenience.
                </p>

              </div>
            </div>

            {/* Bottom Feature Panels: Left-aligned Speech-Bubble Glass Panels */}
            <div ref={featurePanelsContainerRef} className="will-change-[opacity]">
              <GlassSpeechFeaturePanels revealProgress={revealProgress} />
            </div>

          </div>

          {/* ===================================================================
              LAYER 5: DYNAMIC ISLAND FLOATING GLASS NAVBAR
              Floats above all scenes
              =================================================================== */}
          <DynamicIslandNavbar
            revealProgress={revealProgress}
            isSettled={revealProgress >= 0.85}
            onStartShopping={onStartShopping}
          />

        </div>

      </div>

      {/* Continuation Section */}
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
    </div>
  );
}
