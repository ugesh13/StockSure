import React, { useState, useEffect, useRef } from 'react';
import PressToEnterPrompt from './PressToEnterPrompt';
import SupermarketInterior from './SupermarketInterior';
import { sound } from '../utils/audio';

// Sequence States:
// 1. 'DRONE_APPROACH' - Cinematic drone descends and moves forward along approach road
// 2. 'READY'          - Drone settled at closed entrance doors, prompt visible
// 3. 'ENTERING'       - Doors slide open, camera glides forward through entrance threshold
// 4. 'INSIDE'         - Living supermarket interior with moving shoppers and warm lighting

export default function SupermarketEntrance({ isInside, setIsInside }) {
  const [phase, setPhase] = useState('DRONE_APPROACH');
  const [droneFlightStarted, setDroneFlightStarted] = useState(false);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [sensorActive, setSensorActive] = useState(false);
  const [cameraPassingThrough, setCameraPassingThrough] = useState(false);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const isTransitioningRef = useRef(false);

  // 1. INITIAL OPENING: Drone camera approach sequence
  useEffect(() => {
    // Initiate smooth forward flight and descent after brief establishing pause
    const flightTimer = setTimeout(() => {
      setDroneFlightStarted(true);
    }, 400);

    // Drone flight completes and settles at the entrance doors after 6.4s
    const settleTimer = setTimeout(() => {
      setPhase('READY');
    }, 6600);

    return () => {
      clearTimeout(flightTimer);
      clearTimeout(settleTimer);
    };
  }, []);

  // Subtle natural mouse parallax (only when settled)
  const handleMouseMove = (e) => {
    if (phase === 'ENTERING') return;
    const { clientWidth, clientHeight } = document.documentElement;
    const x = (e.clientX / clientWidth - 0.5) * 6;
    const y = (e.clientY / clientHeight - 0.5) * 6;
    setMouseOffset({ x, y });
  };

  // 2. & 3. ENTERING INTERACTION (Press to Enter or Enter key)
  const handleEnter = () => {
    if (isTransitioningRef.current || phase === 'ENTERING' || phase === 'INSIDE') {
      return;
    }
    isTransitioningRef.current = true;
    setPhase('ENTERING');

    // Trigger door sensor LED
    setSensorActive(true);

    // Play subtle audio chime and sliding door whisper
    sound.playChime();
    sound.playDoorSlide();

    // Automatic glass sliding doors open smoothly
    setTimeout(() => {
      setDoorsOpen(true);
    }, 300);

    // Camera smoothly glides forward through the entrance threshold
    setTimeout(() => {
      setCameraPassingThrough(true);
    }, 550);

    // Transition to INSIDE
    setTimeout(() => {
      setPhase('INSIDE');
      setIsInside(true);
      isTransitioningRef.current = false;
    }, 3200);
  };

  // Keyboard navigation (Enter or Space)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (phase === 'READY') {
          e.preventDefault();
          handleEnter();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase]);

  // Reset to re-experience entrance from beginning
  const handleReset = () => {
    setDoorsOpen(false);
    setSensorActive(false);
    setCameraPassingThrough(false);
    setIsInside(false);
    setDroneFlightStarted(false);
    setPhase('DRONE_APPROACH');
    isTransitioningRef.current = false;

    // Restart flight
    setTimeout(() => {
      setDroneFlightStarted(true);
    }, 400);

    setTimeout(() => {
      setPhase('READY');
    }, 6600);
  };

  // Camera Transformation Calculation
  const getCameraStyle = () => {
    if (phase === 'DRONE_APPROACH') {
      if (!droneFlightStarted) {
        // High elevated starting position above the approach road
        return {
          transform: 'scale(1.0) translate3d(0px, 0px, 0px)',
          transformOrigin: '51.36% 55.2%',
          transition: 'transform 0.1s ease-out',
        };
      }
      // Continuous drone glide and descent along the road toward the entrance
      return {
        transform: 'scale(3.8) translate3d(0px, 0px, 0px)',
        transformOrigin: '51.36% 55.2%',
        transition: 'transform 6.2s cubic-bezier(0.25, 0.9, 0.3, 1)',
      };
    }

    if (phase === 'READY') {
      // Settled naturally at the closed entrance doors
      return {
        transform: `scale(3.8) translate3d(${mouseOffset.x * 0.4}px, ${mouseOffset.y * 0.3}px, 0px)`,
        transformOrigin: '51.36% 55.2%',
        transition: 'transform 0.6s ease-out',
      };
    }

    if (phase === 'ENTERING') {
      // Continuous forward camera movement passing through the open doorway
      return {
        transform: cameraPassingThrough
          ? 'scale(8.2) translate3d(0px, -2px, 0px)'
          : 'scale(3.8) translate3d(0px, 0px, 0px)',
        transformOrigin: '51.36% 55.2%',
        transition: 'transform 2.8s cubic-bezier(0.22, 1, 0.36, 1)',
      };
    }

    // phase === 'INSIDE'
    return {
      transform: `scale(1.02) translate3d(${mouseOffset.x * 0.6}px, ${mouseOffset.y * 0.6}px, 0px)`,
      transformOrigin: '50% 50%',
      transition: 'transform 0.8s ease-out',
    };
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onClick={phase === 'READY' ? handleEnter : undefined}
      className="relative w-screen h-screen overflow-hidden bg-[#070908] flex items-center justify-center cursor-default select-none"
    >
      {/* 
        Responsive 16:9 cinematic stage that seamlessly covers the entire display
      */}
      <div
        className="relative will-change-transform flex items-center justify-center pointer-events-none"
        style={{
          width: 'max(100vw, calc(100vh * 1.7778))',
          height: 'max(100vh, calc(100vw * 0.5625))',
          ...getCameraStyle(),
        }}
      >
        {/* =========================================================================
            LAYER 0: Supermarket Interior with Living Shoppers
            ========================================================================= */}
        <SupermarketInterior
          isInside={phase === 'INSIDE'}
          isEntering={phase === 'ENTERING'}
          onReset={handleReset}
        />

        {/* =========================================================================
            LAYER 1: Exterior Building & Drone Approach Scene
            ========================================================================= */}
        <div
          className="absolute inset-0 w-full h-full transition-opacity duration-800 ease-in-out"
          style={{
            opacity: phase === 'INSIDE' ? 0 : 1,
            pointerEvents: phase === 'INSIDE' ? 'none' : 'auto',
          }}
        >
          {/* Primary Uncompressed High-Resolution StockSure Reference Image */}
          <img
            src="/stocksure_drone_reference.jpg"
            alt="StockSure Supermarket Entrance and Approach Road"
            className="w-full h-full object-cover"
            style={{ imageRendering: '-webkit-optimize-contrast' }}
          />

          {/* =====================================================================
              LAYER 2: Automatic Sliding Glass Double Doors
              Positioned precisely across the main entrance portal aperture:
              Left: 45.898%, Top: 50.694%, Width: 10.9375%, Height: 9.375%
              ===================================================================== */}
          <div
            className="absolute overflow-hidden"
            style={{
              left: '45.898%',
              top: '50.694%',
              width: '10.9375%',
              height: '9.375%',
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
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.14] to-transparent pointer-events-none transition-opacity duration-700"
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
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.14] to-transparent pointer-events-none transition-opacity duration-700"
                style={{
                  transform: doorsOpen ? 'translateX(50%)' : 'translateX(0%)',
                  opacity: doorsOpen ? 0 : 1,
                }}
              />
            </div>
          </div>

          {/* =====================================================================
              LAYER 3: Overhead Motion Sensor Module on the Door Lintel
              ===================================================================== */}
          <div
            className="absolute pointer-events-none -translate-x-1/2 flex items-center justify-center"
            style={{
              left: '51.367%',
              top: '50.15%',
              width: '10px',
              height: '4px',
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
          Appears once the drone approaches and settles in front of the doors
          ========================================================================= */}
      <PressToEnterPrompt
        onClick={handleEnter}
        isVisible={phase === 'READY'}
      />
    </div>
  );
}
