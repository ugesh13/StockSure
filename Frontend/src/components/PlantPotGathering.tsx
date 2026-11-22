'use client';

import React from 'react';
import Image from 'next/image';
import { motion, useTransform, useSpring, MotionValue } from 'framer-motion';

interface PlantPotGatheringProps {
  scrollY: MotionValue<number>;
  aboutTop: number;
  windowHeight: number;
  heroScrollStart?: number;
}

interface PlantElementConfig {
  id: string;
  src: string;
  alt: string;
  style: {
    left: string;
    top: string;
    width: string;
    aspectRatio: string;
  };
  startOffset: {
    y: number;
    x: number;
    rotate: number;
    scale: number;
  };
  scrollRange: [number, number]; // [startProgress, endProgress] relative to scroll span
}

// Coordinate mappings relative to 432x578 master pot canvas
const PLANT_ELEMENTS: PlantElementConfig[] = [
  {
    id: 'stem-sedum',
    src: '/images/plant-leaf-1.png',
    alt: 'Tall sedum botanical stem',
    style: {
      left: '41.67%',
      top: '14.71%',
      width: '22.0%',
      aspectRatio: '95/175',
    },
    startOffset: { y: -240, x: -35, rotate: -18, scale: 0.7 },
    scrollRange: [0.25, 0.78],
  },
  {
    id: 'crassula-jade',
    src: '/images/plant-leaf-2.png',
    alt: 'Crassula jade succulent branch',
    style: {
      left: '60.18%',
      top: '24.22%',
      width: '27.78%',
      aspectRatio: '120/150',
    },
    startOffset: { y: -290, x: 50, rotate: 26, scale: 0.65 },
    scrollRange: [0.32, 0.82],
  },
  {
    id: 'haworthia-zebra',
    src: '/images/plant-leaf-3.png',
    alt: 'Striped haworthia zebra spire',
    style: {
      left: '27.78%',
      top: '31.14%',
      width: '24.31%',
      aspectRatio: '105/180',
    },
    startOffset: { y: -210, x: -60, rotate: -20, scale: 0.75 },
    scrollRange: [0.38, 0.85],
  },
  {
    id: 'echeveria-rosette',
    src: '/images/plant-leaf-4.png',
    alt: 'Blue echeveria center rosette',
    style: {
      left: '42.82%',
      top: '43.25%',
      width: '37.04%',
      aspectRatio: '160/135',
    },
    startOffset: { y: -310, x: 10, rotate: 16, scale: 0.6 },
    scrollRange: [0.45, 0.90],
  },
  {
    id: 'red-succulent',
    src: '/images/plant-leaf-5.png',
    alt: 'Reddish tipped succulent cluster',
    style: {
      left: '71.76%',
      top: '41.52%',
      width: '25.46%',
      aspectRatio: '110/125',
    },
    startOffset: { y: -220, x: 55, rotate: -15, scale: 0.75 },
    scrollRange: [0.40, 0.88],
  },
  {
    id: 'rim-succulent',
    src: '/images/plant-leaf-6.png',
    alt: 'Lower rim succulent foliage',
    style: {
      left: '18.52%',
      top: '46.71%',
      width: '25.46%',
      aspectRatio: '110/110',
    },
    startOffset: { y: -180, x: -40, rotate: 14, scale: 0.8 },
    scrollRange: [0.30, 0.80],
  },
];

function FallingPlantElement({
  element,
  scrollY,
  animStart,
  animEnd,
}: {
  element: PlantElementConfig;
  scrollY: MotionValue<number>;
  animStart: number;
  animEnd: number;
}) {
  const span = animEnd - animStart;
  const tStart = animStart + span * element.scrollRange[0];
  const tEnd = animStart + span * element.scrollRange[1];

  // Natural vertical falling motion down into the pot
  const yRaw = useTransform(scrollY, [tStart, tEnd], [element.startOffset.y, 0]);
  // Horizontal drift converging to exact pot center position
  const xRaw = useTransform(scrollY, [tStart, tEnd], [element.startOffset.x, 0]);
  // Natural rotational drift settling to 0
  const rotateRaw = useTransform(scrollY, [tStart, tEnd], [element.startOffset.rotate, 0]);
  // Perspective growth as elements fall forward into position
  const scaleRaw = useTransform(scrollY, [tStart, tEnd], [element.startOffset.scale, 1]);
  // Smooth fade-in
  const opacityRaw = useTransform(
    scrollY,
    [tStart, tStart + span * 0.12, tEnd - span * 0.05, animEnd],
    [0, 1, 1, 0] // Crossfades into the master composite at final completion
  );

  const springConfig = { stiffness: 85, damping: 20, mass: 0.7 };
  const y = useSpring(yRaw, springConfig);
  const x = useSpring(xRaw, springConfig);
  const rotate = useSpring(rotateRaw, springConfig);
  const scale = useSpring(scaleRaw, springConfig);
  const opacity = useTransform(opacityRaw, (v) => (v < 0.01 ? 0 : v));

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: element.style.left,
        top: element.style.top,
        width: element.style.width,
        aspectRatio: element.style.aspectRatio,
        x,
        y,
        rotate,
        scale,
        opacity,
        transformOrigin: 'center center',
      }}
      className="will-change-transform pointer-events-none z-30"
    >
      <div className="relative w-full h-full">
        <Image
          src={element.src}
          alt={element.alt}
          fill
          sizes="180px"
          className="object-contain filter drop-shadow-[0_8px_16px_rgba(18,34,22,0.28)]"
        />
      </div>
    </motion.div>
  );
}

export default function PlantPotGathering({
  scrollY,
  aboutTop,
  windowHeight,
  heroScrollStart = 0,
}: PlantPotGatheringProps) {
  const start = heroScrollStart;
  const effectiveTop = aboutTop > 0 ? aboutTop : (windowHeight > 0 ? windowHeight * 2 : 1800);
  const span = Math.max(effectiveTop - start, windowHeight > 0 ? windowHeight : 900);

  // Animation window synchronized with scroll progress as user enters About Us
  const animStart = start + span * 0.25;
  const animGatherPoint = start + span * 0.88;
  const animComplete = start + span * 1.08;

  // Stone bowl reveal: stays anchored inside About Us with realistic depth
  const bowlOpacityRaw = useTransform(
    scrollY,
    [animStart, animStart + span * 0.25],
    [0.1, 1]
  );
  const bowlScaleRaw = useTransform(
    scrollY,
    [animStart, animStart + span * 0.25],
    [0.92, 1]
  );
  const bowlOpacity = useSpring(bowlOpacityRaw, { stiffness: 90, damping: 22 });
  const bowlScale = useSpring(bowlScaleRaw, { stiffness: 90, damping: 22 });

  // Master composite arrangement: crossfades in smoothly as individual elements finish gathering
  const masterOpacityRaw = useTransform(
    scrollY,
    [animGatherPoint, animComplete],
    [0, 1]
  );
  const masterOpacity = useSpring(masterOpacityRaw, { stiffness: 90, damping: 22 });

  // Subtle ambient growth bloom / light reflex
  const bloomOpacityRaw = useTransform(
    scrollY,
    [animGatherPoint, animComplete, animComplete + 200],
    [0, 0.45, 0.15]
  );
  const bloomOpacity = useSpring(bloomOpacityRaw, { stiffness: 80, damping: 20 });

  return (
    <div
      id="plant-pot-gathering-wrapper"
      className="relative w-64 sm:w-80 md:w-96 lg:w-[430px] xl:w-[460px] aspect-[432/578] pointer-events-none select-none"
    >
      {/* 1. Realistic Stone Bowl Base (Always stays anchored with realistic depth and shadow) */}
      <motion.div
        style={{ opacity: bowlOpacity, scale: bowlScale }}
        className="absolute inset-0 w-full h-full z-10 will-change-transform"
      >
        <Image
          src="/images/pot-bowl-base.png"
          alt="Artisan ceramic stone planter bowl"
          fill
          priority
          sizes="(max-width: 640px) 260px, (max-width: 1024px) 380px, 460px"
          className="object-contain filter drop-shadow-[0_24px_38px_rgba(18,34,22,0.38)] drop-shadow-[0_8px_16px_rgba(0,0,0,0.2)]"
        />
      </motion.div>

      {/* 2. Falling Plant & Leaf Elements (Gathering toward center of the pot) */}
      {PLANT_ELEMENTS.map((el) => (
        <FallingPlantElement
          key={el.id}
          element={el}
          scrollY={scrollY}
          animStart={animStart}
          animEnd={animGatherPoint}
        />
      ))}

      {/* 3. Master Plant Arrangement (Seamless photorealistic assembly locked inside the pot) */}
      <motion.div
        style={{ opacity: masterOpacity }}
        className="absolute inset-0 w-full h-full z-20 pointer-events-none"
      >
        <Image
          src="/images/pot.png"
          alt="Fully assembled Verdant botanical succulent arrangement"
          fill
          priority
          sizes="(max-width: 640px) 260px, (max-width: 1024px) 380px, 460px"
          className="object-contain filter drop-shadow-[0_24px_36px_rgba(18,34,22,0.35)] drop-shadow-[0_6px_14px_rgba(0,0,0,0.18)]"
        />
      </motion.div>

      {/* 4. Subtle Botanical Light Bloom on completed plant */}
      <motion.div
        style={{ opacity: bloomOpacity }}
        className="absolute inset-x-8 top-12 h-64 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.4)_0%,rgba(184,197,174,0.15)_50%,transparent_80%)] pointer-events-none z-30 filter blur-xl"
      />
    </div>
  );
}
