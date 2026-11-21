import React, { useEffect, useRef, useCallback } from 'react';

export default function DroneScrollExperience() {
  const containerRef = useRef(null);
  const droneRef = useRef(null);

  // Smooth scroll tracking refs
  const rawProgressRef = useRef(0);
  const smoothedProgressRef = useRef(0);
  const rafIdRef = useRef(null);

  // Initialize drone video: paused at frame 0, muted, zero autoplay
  useEffect(() => {
    const v = droneRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
      v.playbackRate = 1.0;
      v.addEventListener('loadeddata', () => {
        v.pause();
        v.currentTime = 0;
      }, { once: true });
    }
  }, []);

  // Handle native scroll event to calculate progress
  const handleScroll = useCallback((e) => {
    const el = e.currentTarget;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) return;

    rawProgressRef.current = Math.min(Math.max(el.scrollTop / maxScroll, 0), 1);
  }, []);

  // High-performance 60fps rAF scrubbing loop (zero DOM re-rendering overhead)
  useEffect(() => {
    let active = true;

    const tick = () => {
      if (!active) return;

      const targetP = rawProgressRef.current;
      let currP = smoothedProgressRef.current;

      // Responsive spring interpolation: instant response during active scroll, snaps cleanly on stop
      const delta = targetP - currP;
      if (Math.abs(delta) < 0.0008) {
        currP = targetP;
      } else {
        currP += delta * 0.35;
      }
      smoothedProgressRef.current = currP;

      // Map progress smoothly across full duration of the original untouched drone video
      const v = droneRef.current;
      if (v) {
        const duration = v.duration && !isNaN(v.duration) ? v.duration : 7.93;
        // Scrub safely across 0s to duration - 0.08s
        const targetTime = currP * Math.max(0, duration - 0.08);

        if (!v.seeking && Math.abs(v.currentTime - targetTime) > 0.02) {
          v.currentTime = targetTime;
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
      className="relative w-screen h-screen overflow-y-auto overflow-x-hidden select-none bg-black"
      style={{ scrollBehavior: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      {/* Scroll track: 350vh height provides deliberate, cinematic scroll depth */}
      <div className="relative w-full h-[350vh]">
        {/* Sticky viewport frame pinned to screen: 100% pure video, no overlays, no text, no buttons */}
        <div className="sticky top-0 w-full h-screen overflow-hidden flex items-center justify-center bg-black">
          <video
            ref={droneRef}
            src="/videos/drone.mp4"
            preload="auto"
            muted
            playsInline
            className="w-full h-full object-contain pointer-events-none"
          />
        </div>
      </div>
    </div>
  );
}
