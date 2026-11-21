import React, { useState, useEffect, useRef } from 'react';
import PressToEnterPrompt from './PressToEnterPrompt';
import { sound } from '../utils/audio';
import { ArrowRight, RotateCcw } from 'lucide-react';

// Sequence States:
// 1. 'DRONE_PLAYING'     - Drone video plays fullscreen approaching StockSure
// 2. 'ARRIVED_WAITING'   - Drone video settled on final frame, "PRESS TO ENTER" visible
// 3. 'DOORS_OPENING'     - Automatic glass doors slide open sideways, camera moves forward
// 4. 'INTERIOR_PLAYING'  - Real interior video playing with authentic shoppers moving naturally

export default function VideoEntrance({
  droneSrc = '/videos/drone-1.mp4',
  interiorSrc = '/videos/interior-1.mp4',
  isInside,
  setIsInside,
}) {
  const [phase, setPhase] = useState('DRONE_PLAYING');
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [sensorActive, setSensorActive] = useState(false);
  const [cameraPassingThrough, setCameraPassingThrough] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const droneVideoRef = useRef(null);
  const interiorVideoRef = useRef(null);
  const isTransitioningRef = useRef(false);

  // 1. Autoplay Drone Video on mount
  useEffect(() => {
    const droneVideo = droneVideoRef.current;
    if (droneVideo) {
      droneVideo.currentTime = 0;
      droneVideo.play().catch((err) => {
        console.warn('Autoplay prevented by browser, waiting for user interaction:', err);
      });
    }
  }, [droneSrc]);

  // Handle Drone Video Ending: hold final frame and reveal "PRESS TO ENTER"
  const handleDroneVideoEnded = () => {
    if (phase !== 'DRONE_PLAYING') return;

    // Freeze video on final frame to prevent any black screen or flicker
    const droneVideo = droneVideoRef.current;
    if (droneVideo) {
      droneVideo.pause();
    }

    setPhase('ARRIVED_WAITING');
  };

  // Alternative timeupdate check in case browser 'ended' event behaves inconsistently
  const handleDroneTimeUpdate = () => {
    const droneVideo = droneVideoRef.current;
    if (!droneVideo) return;

    if (
      phase === 'DRONE_PLAYING' &&
      droneVideo.duration > 0 &&
      droneVideo.currentTime >= droneVideo.duration - 0.08
    ) {
      droneVideo.pause();
      setPhase('ARRIVED_WAITING');
    }
  };

  // 2. USER PRESSES ENTER
  const handleEnter = () => {
    if (
      isTransitioningRef.current ||
      phase === 'DOORS_OPENING' ||
      phase === 'INTERIOR_PLAYING'
    ) {
      return;
    }
    isTransitioningRef.current = true;
    setPhase('DOORS_OPENING');

    // Step A: Trigger door sensor LED
    setSensorActive(true);

    // Step B: Play welcoming entrance chime & sliding door whisper
    sound.playChime();
    sound.playDoorSlide();

    // Step C: Prepare and start interior video in background
    const interiorVideo = interiorVideoRef.current;
    if (interiorVideo) {
      interiorVideo.currentTime = 0;
      interiorVideo.play().catch((err) => console.warn('Interior play error:', err));
    }

    // Step D: Automatic glass doors slide open sideways
    setTimeout(() => {
      setDoorsOpen(true);
    }, 250);

    // Step E: Camera smoothly pushes forward through the entrance opening
    setTimeout(() => {
      setCameraPassingThrough(true);
    }, 500);

    // Step F: Complete transition into interior video
    setTimeout(() => {
      setPhase('INTERIOR_PLAYING');
      setIsInside(true);
      isTransitioningRef.current = false;
    }, 2800);

    // Step G: Reveal welcome UI after camera settles inside
    setTimeout(() => {
      setShowWelcome(true);
    }, 4200);
  };

  // Keyboard navigation (Enter or Space)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (phase === 'ARRIVED_WAITING') {
          e.preventDefault();
          handleEnter();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase]);

  // Reset sequence to re-experience arrival
  const handleReset = () => {
    setDoorsOpen(false);
    setSensorActive(false);
    setCameraPassingThrough(false);
    setIsInside(false);
    setShowWelcome(false);
    isTransitioningRef.current = false;

    const interiorVideo = interiorVideoRef.current;
    if (interiorVideo) {
      interiorVideo.pause();
      interiorVideo.currentTime = 0;
    }

    const droneVideo = droneVideoRef.current;
    if (droneVideo) {
      droneVideo.currentTime = 0;
      droneVideo.play().catch(() => {});
    }

    setPhase('DRONE_PLAYING');
  };

  return (
    <div
      onClick={phase === 'ARRIVED_WAITING' ? handleEnter : undefined}
      className="relative w-screen h-screen overflow-hidden bg-black select-none flex items-center justify-center cursor-default"
    >
      {/* =========================================================================
          LAYER 0: Supermarket Interior Video (Featuring Real Supermarket Shoppers)
          ========================================================================= */}
      <div
        className="absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out"
        style={{
          opacity: phase === 'INTERIOR_PLAYING' ? 1 : cameraPassingThrough ? 0.95 : 0,
          zIndex: 10,
        }}
      >
        <video
          ref={interiorVideoRef}
          src={interiorSrc}
          preload="auto"
          muted
          playsInline
          loop
          className="w-full h-full object-cover will-change-transform"
          style={{
            transform: phase === 'INTERIOR_PLAYING' ? 'scale(1.0)' : 'scale(1.08)',
            transition: 'transform 2.8s cubic-bezier(0.2, 0.85, 0.25, 1)',
          }}
        />

        {/* Subtle warm retail lighting vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

        {/* Minimal Welcome Card (Revealed only after entering and camera settles) */}
        {showWelcome && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 transition-all duration-1000 ease-out animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-center gap-4 px-6 py-3 rounded-full bg-black/45 backdrop-blur-md border border-white/[0.1] shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>

                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-light tracking-wide text-white">
                    Welcome to <span className="text-emerald-400 font-normal">StockSure</span>
                  </span>
                  <span className="hidden sm:inline-block text-[11px] font-extralight tracking-wider text-white/50 border-l border-white/10 pl-2">
                    Good Food. Better Choices.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/35 text-[11px] font-light text-emerald-300 transition-all duration-200"
                >
                  <span>Explore Store</span>
                  <ArrowRight className="w-3 h-3" />
                </button>

                <button
                  onClick={handleReset}
                  type="button"
                  title="Re-experience Drone Arrival"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-[11px] font-light text-white/70 hover:text-white transition-all duration-200"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Arrival</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          LAYER 1: Drone Arrival Video Scene & Automatic Sliding Glass Doors
          ========================================================================= */}
      <div
        className="absolute inset-0 w-full h-full transition-opacity duration-900 ease-in-out"
        style={{
          opacity: phase === 'INTERIOR_PLAYING' ? 0 : 1,
          pointerEvents: phase === 'INTERIOR_PLAYING' ? 'none' : 'auto',
          zIndex: 20,
        }}
      >
        {/* Fullscreen Drone Video */}
        <div
          className="relative w-full h-full will-change-transform"
          style={{
            transform: cameraPassingThrough
              ? 'scale(1.9) translate3d(0px, -2%, 0px)'
              : 'scale(1.0)',
            transition: 'transform 2.4s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <video
            ref={droneVideoRef}
            src={droneSrc}
            preload="auto"
            muted
            playsInline
            onEnded={handleDroneVideoEnded}
            onTimeUpdate={handleDroneTimeUpdate}
            className="w-full h-full object-cover"
          />

          {/* =====================================================================
              LAYER 2: Realistic Automatic Sliding Glass Doors
              Positioned precisely across the entrance doors at the end of drone flight:
              Left: 46.2%, Top: 53.5%, Width: 10.2%, Height: 10.5%
              ===================================================================== */}
          <div
            className="absolute overflow-hidden pointer-events-none transition-opacity duration-500"
            style={{
              left: '46.2%',
              top: '53.5%',
              width: '10.2%',
              height: '10.5%',
              opacity: phase === 'ARRIVED_WAITING' || phase === 'DOORS_OPENING' ? 1 : 0,
            }}
          >
            {/* Left Sliding Door Panel */}
            <div
              className="absolute top-0 bottom-0 left-0 w-1/2 will-change-transform"
              style={{
                transform: doorsOpen ? 'translateX(-102%)' : 'translateX(0%)',
                transition: 'transform 1.8s cubic-bezier(0.25, 1, 0.35, 1)',
              }}
            >
              <img
                src="/drone_door_left.png"
                alt="Automatic Glass Door (Left)"
                className="w-full h-full object-fill"
              />
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.15] to-transparent pointer-events-none transition-opacity duration-700"
                style={{
                  transform: doorsOpen ? 'translateX(-50%)' : 'translateX(0%)',
                  opacity: doorsOpen ? 0 : 1,
                }}
              />
            </div>

            {/* Right Sliding Door Panel */}
            <div
              className="absolute top-0 bottom-0 right-0 w-1/2 will-change-transform"
              style={{
                transform: doorsOpen ? 'translateX(102%)' : 'translateX(0%)',
                transition: 'transform 1.8s cubic-bezier(0.25, 1, 0.35, 1)',
              }}
            >
              <img
                src="/drone_door_right.png"
                alt="Automatic Glass Door (Right)"
                className="w-full h-full object-fill"
              />
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.15] to-transparent pointer-events-none transition-opacity duration-700"
                style={{
                  transform: doorsOpen ? 'translateX(50%)' : 'translateX(0%)',
                  opacity: doorsOpen ? 0 : 1,
                }}
              />
            </div>
          </div>

          {/* Door Header Sensor Module Indicator */}
          <div
            className="absolute pointer-events-none -translate-x-1/2 flex items-center justify-center transition-opacity duration-500"
            style={{
              left: '51.3%',
              top: '53.1%',
              width: '10px',
              height: '4px',
              opacity: phase === 'ARRIVED_WAITING' || phase === 'DOORS_OPENING' ? 1 : 0,
            }}
          >
            <div className="relative w-full h-full bg-[#111111] rounded-[1px] border border-black/80 flex items-center justify-center shadow-sm">
              <div
                className="w-1 h-0.5 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: sensorActive ? '#22c55e' : '#52525b',
                  boxShadow: sensorActive
                    ? '0 0 6px #22c55e, 0 0 12px rgba(34, 197, 94, 0.7)'
                    : 'none',
                  filter: sensorActive ? 'brightness(1.5)' : 'brightness(0.6)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          INTERACTION PROMPT: "(o) PRESS TO ENTER"
          Appears once the drone flight finishes and settles on the final frame
          ========================================================================= */}
      <PressToEnterPrompt
        onClick={handleEnter}
        isVisible={phase === 'ARRIVED_WAITING'}
      />
    </div>
  );
}
