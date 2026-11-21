'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, useTransform, useSpring, MotionValue } from 'framer-motion';

export interface LetterConfig {
  char: string;
  isSpace?: boolean;
  driftMax: number;
  fallMax: number;
  rotMax: number;
  delayRatio: number;
  fallbackConvergeX: number;
}

// Line 1: "Find Your"
export const LINE_1_CONFIG: LetterConfig[] = [
  { char: 'F', driftMax: -65, fallMax: 170, rotMax: -16, delayRatio: 0.0, fallbackConvergeX: 160 },
  { char: 'i', driftMax: -30, fallMax: 205, rotMax: 10, delayRatio: 0.08, fallbackConvergeX: 125 },
  { char: 'n', driftMax: -55, fallMax: 155, rotMax: -9, delayRatio: 0.03, fallbackConvergeX: 90 },
  { char: 'd', driftMax: -22, fallMax: 195, rotMax: 12, delayRatio: 0.1, fallbackConvergeX: 52 },
  { char: ' ', isSpace: true, driftMax: 0, fallMax: 0, rotMax: 0, delayRatio: 0, fallbackConvergeX: 0 },
  { char: 'Y', driftMax: 42, fallMax: 180, rotMax: 14, delayRatio: 0.05, fallbackConvergeX: -50 },
  { char: 'o', driftMax: 75, fallMax: 225, rotMax: -12, delayRatio: 0.12, fallbackConvergeX: -88 },
  { char: 'u', driftMax: 38, fallMax: 165, rotMax: 9, delayRatio: 0.04, fallbackConvergeX: -122 },
  { char: 'r', driftMax: 85, fallMax: 200, rotMax: -15, delayRatio: 0.14, fallbackConvergeX: -155 },
];

// Line 2: "Dream Plants"
export const LINE_2_CONFIG: LetterConfig[] = [
  { char: 'D', driftMax: -95, fallMax: 190, rotMax: -18, delayRatio: 0.07, fallbackConvergeX: 215 },
  { char: 'r', driftMax: -70, fallMax: 155, rotMax: 12, delayRatio: 0.04, fallbackConvergeX: 172 },
  { char: 'e', driftMax: -80, fallMax: 215, rotMax: -14, delayRatio: 0.09, fallbackConvergeX: 135 },
  { char: 'a', driftMax: -45, fallMax: 175, rotMax: 8, delayRatio: 0.02, fallbackConvergeX: 98 },
  { char: 'm', driftMax: -60, fallMax: 235, rotMax: -15, delayRatio: 0.11, fallbackConvergeX: 56 },
  { char: ' ', isSpace: true, driftMax: 0, fallMax: 0, rotMax: 0, delayRatio: 0, fallbackConvergeX: 0 },
  { char: 'P', driftMax: 55, fallMax: 185, rotMax: 15, delayRatio: 0.06, fallbackConvergeX: -52 },
  { char: 'l', driftMax: 28, fallMax: 230, rotMax: -10, delayRatio: 0.13, fallbackConvergeX: -86 },
  { char: 'a', driftMax: 85, fallMax: 165, rotMax: 11, delayRatio: 0.04, fallbackConvergeX: -120 },
  { char: 'n', driftMax: 68, fallMax: 210, rotMax: -14, delayRatio: 0.08, fallbackConvergeX: -158 },
  { char: 't', driftMax: 98, fallMax: 195, rotMax: 16, delayRatio: 0.07, fallbackConvergeX: -192 },
  { char: 's', driftMax: 115, fallMax: 245, rotMax: -18, delayRatio: 0.15, fallbackConvergeX: -225 },
];

interface LetterItemProps {
  config: LetterConfig;
  targetX: number;
  targetY: number;
  scrollY: MotionValue<number>;
  s0: number;
  s1: number;
  s2: number;
  s3: number;
  s4: number;
  s5: number;
  setRef: (el: HTMLElement | null) => void;
}

function AnimatedLetter({
  config,
  targetX,
  targetY,
  scrollY,
  s0,
  s1,
  s2,
  s3,
  s4,
  s5,
  setRef,
}: LetterItemProps) {
  const { driftMax, fallMax, rotMax, delayRatio, isSpace } = config;

  // Staggered start timing per letter
  const startP = s0 + (s1 - s0) * (0.20 + delayRatio * 0.80);

  // 1. Horizontal movement:
  // Starts at 0 in Hero -> drifts laterally during fall across About Us -> converges to pot center
  const xRaw = useTransform(
    scrollY,
    [s0, startP, s2, s3, s4, s5],
    [0, 0, driftMax * 0.90, driftMax * 0.40, targetX, targetX]
  );

  // 2. Vertical movement:
  // Starts at 0 in Hero -> falls downward through Hero and deep into About Us -> curves and gathers at exact center of pot
  const midFallY = s2 * 1.15 + fallMax;
  const lateFallY = s3 * 1.05 + fallMax * 0.5 + (targetY - s3) * 0.45;
  const yRaw = useTransform(
    scrollY,
    [s0, startP, s2, s3, s4, s5],
    [0, 0, midFallY, lateFallY, targetY, targetY]
  );

  // 3. Rotation:
  // Rotates organically during fall -> straightens as it reaches gathering point
  const rotateRaw = useTransform(
    scrollY,
    [s0, startP, s2, s3, s4, s5],
    [0, 0, rotMax * 0.85, rotMax * 0.30, 0, 0]
  );

  // 4. Opacity:
  // Visible during fall -> compacts at s4 -> dissolves into the emerging succulent pot by s5
  const opacityRaw = useTransform(
    scrollY,
    [s0, s1, s2, s3, s4, s5],
    [1, 1, 1, 1, 0.98, 0]
  );
  const opacity = useTransform(opacityRaw, (v) => (v < 0.02 ? 0 : v));

  // 5. Scale (Letters compact and visually merge into the pot):
  const scaleRaw = useTransform(
    scrollY,
    [s0, s2, s3, s4, s5],
    [1, 0.98, 0.92, 0.72, 0.18]
  );

  const springSettings = { stiffness: 105, damping: 24, mass: 0.8 };
  const x = useSpring(xRaw, springSettings);
  const y = useSpring(yRaw, springSettings);
  const rotate = useSpring(rotateRaw, springSettings);
  const scale = useSpring(scaleRaw, springSettings);

  if (isSpace) {
    return <span className="inline-block w-3 sm:w-5">&nbsp;</span>;
  }

  return (
    <motion.span
      ref={setRef}
      style={{
        x,
        y,
        rotate,
        opacity,
        scale,
      }}
      className="inline-block origin-center will-change-transform drop-shadow-[0_3px_12px_rgba(0,0,0,0.85)] drop-shadow-[0_6px_24px_rgba(18,38,24,0.7)] relative z-50"
    >
      {config.char}
    </motion.span>
  );
}

interface AnimatedHeroLettersProps {
  scrollY: MotionValue<number>;
  windowHeight: number;
  aboutTop: number;
}

export default function AnimatedHeroLetters({
  scrollY,
  windowHeight,
  aboutTop,
}: AnimatedHeroLettersProps) {
  const letterRefs = useRef<{ [key: string]: HTMLElement | null }>({});
  const [targets, setTargets] = useState<{ [key: string]: { x: number; y: number } }>({});

  // Dynamic coordinate alignment: Measure each letter's exact vector to the center of the succulent pot image in document space
  useEffect(() => {
    const measure = () => {
      const potEl = document.getElementById('succulent-pot-image-wrapper') || document.getElementById('succulent-pot-anchor');
      if (!potEl) return;
      const potRect = potEl.getBoundingClientRect();
      const scroll = window.scrollY || window.pageYOffset;
      const potDocX = potRect.left + potRect.width / 2 + window.scrollX;
      const potDocY = potRect.top + potRect.height / 2 + scroll;

      const newTargets: { [key: string]: { x: number; y: number } } = {};
      Object.entries(letterRefs.current).forEach(([k, el]) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const letterDocX = rect.left + rect.width / 2 + window.scrollX;
        const letterDocY = rect.top + rect.height / 2 + scroll;
        newTargets[k] = {
          x: potDocX - letterDocX,
          y: potDocY - letterDocY,
        };
      });
      setTargets(newTargets);
    };

    measure();
    window.addEventListener('resize', measure);
    const timer = setTimeout(measure, 400);
    return () => {
      window.removeEventListener('resize', measure);
      clearTimeout(timer);
    };
  }, [windowHeight, aboutTop]);

  // Exact Scroll Animation Milestones:
  const H = aboutTop > 0 ? aboutTop : (windowHeight > 0 ? windowHeight : 900);

  const s0 = 0;
  const s1 = H * 0.10;
  const s2 = H * 0.38;
  const s3 = H * 0.65;
  const s4 = H * 0.85;
  const s5 = H * 0.92;

  const defaultTargetY = aboutTop > 0 ? aboutTop : (windowHeight > 0 ? windowHeight : 900);

  return (
    <div className="relative w-full flex flex-col items-center justify-center select-none">
      <h1 className="relative z-50 font-playfair font-bold text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[86px] text-white tracking-tight leading-[1.04]">
        {/* Line 1: "Find Your" */}
        <span className="flex items-center justify-center">
          {LINE_1_CONFIG.map((cfg, idx) => {
            const k = `l1-${idx}-${cfg.char}`;
            const targetX = targets[k]?.x ?? cfg.fallbackConvergeX;
            const targetY = targets[k]?.y ?? defaultTargetY;
            return (
              <AnimatedLetter
                key={k}
                config={cfg}
                targetX={targetX}
                targetY={targetY}
                scrollY={scrollY}
                s0={s0}
                s1={s1}
                s2={s2}
                s3={s3}
                s4={s4}
                s5={s5}
                setRef={(el) => {
                  letterRefs.current[k] = el;
                }}
              />
            );
          })}
        </span>

        {/* Line 2: "Dream Plants" */}
        <span className="flex items-center justify-center">
          {LINE_2_CONFIG.map((cfg, idx) => {
            const k = `l2-${idx}-${cfg.char}`;
            const targetX = targets[k]?.x ?? cfg.fallbackConvergeX;
            const targetY = targets[k]?.y ?? defaultTargetY;
            return (
              <AnimatedLetter
                key={k}
                config={cfg}
                targetX={targetX}
                targetY={targetY}
                scrollY={scrollY}
                s0={s0}
                s1={s1}
                s2={s2}
                s3={s3}
                s4={s4}
                s5={s5}
                setRef={(el) => {
                  letterRefs.current[k] = el;
                }}
              />
            );
          })}
        </span>
      </h1>
    </div>
  );
}
