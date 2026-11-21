import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * ScrollDroneEntrance
 * 
 * Scroll-controlled drone entrance sequence:
 * - Scrubbing is 100% scroll-driven (no autoplay).
 * - Pauses at initial frame 0 on page load.
 * - Scrolling down scrubs forward; scrolling up scrubs backward.
 * - Stopping scroll freezes the video at the exact current frame.
 * - When reaching the final gate frame, displays minimal "PRESS ENTER TO ENTER" prompt.
 * - Prompt disappears if user scrolls back up.
 * - Triggers entrance on Enter key press or prompt click.
 */
export default function ScrollDroneEntrance({ onTriggerEnter, isTransitioning }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  
  // Progress & Animation Loop Refs
  const scrollProgressRef = useRef(0);
  const smoothedProgressRef = useRef(0);
  const rafIdRef = useRef(null);
  const durationRef = useRef(0);
  const isTransitioningRef = useRef(isTransitioning);

  // UI state for prompt visibility
  const [isAtEnd, setIsAtEnd] = useState(false);

  useEffect(() => {
    isTransitioningRef.current = isTransitioning;
  }, [isTransitioning]);

  // Initial video setup: ensure strictly paused at frame 0 (no autoplay)
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const handleLoadedMetadata = () => {
      durationRef.current = vid.duration || 7.93;
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

  // Scroll listener: maps container scroll position to progression [0, 1]
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll <= 0) return;

    const progress = Math.min(Math.max(container.scrollTop / maxScroll, 0), 1);
    scrollProgressRef.current = progress;
  }, []);

  // 60FPS Lerp Scrubbing Loop for silky-smooth forward and reverse playback
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;

      const vid = videoRef.current;
      const targetProgress = scrollProgressRef.current;
      let curr = smoothedProgressRef.current;

      // Responsive interpolation factor for smooth scrubbing
      const delta = targetProgress - curr;
      if (Math.abs(delta) < 0.0005) {
        curr = targetProgress;
      } else {
        curr += delta * 0.22;
      }
      smoothedProgressRef.current = curr;

      // Update video frame if duration is loaded
      if (vid && durationRef.current > 0) {
        const targetTime = Math.min(
          curr * durationRef.current,
          durationRef.current - 0.02
        );
        if (Math.abs(vid.currentTime - targetTime) > 0.02 && !vid.seeking) {
          vid.currentTime = targetTime;
        }
      }

      // Check if user has reached the final gate frame (progress >= 98.5%)
      const atGate = curr >= 0.985;
      setIsAtEnd((prev) => (prev !== atGate ? atGate : prev));

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  // Entrance trigger dispatcher (guards against duplicate calls)
  const handleEnterAction = useCallback(() => {
    if (isTransitioningRef.current || !isAtEnd) return;
    if (onTriggerEnter) onTriggerEnter();
  }, [isAtEnd, onTriggerEnter]);

  // Keyboard Enter listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.code === 'Enter') {
        if (isAtEnd && !isTransitioningRef.current) {
          e.preventDefault();
          handleEnterAction();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAtEnd, handleEnterAction]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`relative w-screen h-screen ${
        isTransitioning ? 'overflow-hidden' : 'overflow-y-auto'
      } overflow-x-hidden select-none bg-black`}
      style={{ scrollBehavior: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      {/* Scroll track: 350vh provides an intentional, immersive scrubbing distance */}
      <div className="relative w-full h-[350vh]">
        
        {/* Sticky Fullscreen Video Viewport */}
        <div className="sticky top-0 w-full h-screen overflow-hidden flex items-center justify-center bg-black">
          
          {/* Original Drone Video (Untouched Asset) */}
          <video
            ref={videoRef}
            src="/videos/drone.mp4"
            preload="auto"
            muted
            playsInline
            className="w-full h-full object-cover sm:object-contain bg-black pointer-events-none"
          />

          {/* Minimal, Premium "PRESS ENTER TO ENTER" Prompt */}
          <div
            className={`absolute bottom-12 sm:bottom-16 left-1/2 -translate-x-1/2 z-20 transition-all duration-500 ease-out ${
              isAtEnd && !isTransitioning
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
          >
            <button
              type="button"
              onClick={handleEnterAction}
              disabled={isTransitioning}
              className="group cursor-pointer flex items-center gap-3 px-6 py-3 rounded-full bg-black/65 hover:bg-black/85 backdrop-blur-xl border border-white/20 hover:border-emerald-400/60 shadow-[0_8px_32px_rgba(0,0,0,0.6)] transition-all duration-300 transform hover:scale-[1.03] active:scale-95"
              aria-label="Press Enter to Enter StockSure"
            >
              {/* Subtle pulsing green indicator dot */}
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>

              {/* Minimal Clean Text */}
              <span className="text-xs sm:text-sm font-light tracking-[0.28em] text-white/90 group-hover:text-emerald-300 transition-colors uppercase select-none">
                Press Enter to Enter
              </span>

              {/* Keyboard badge styling */}
              <kbd className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-mono font-medium text-emerald-400 bg-white/10 group-hover:bg-emerald-500/20 border border-emerald-400/40 rounded shadow-sm">
                ↵
              </kbd>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
