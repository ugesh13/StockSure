import React, { forwardRef, useImperativeHandle, useRef } from 'react';

/**
 * FullStop3DCube
 * 
 * Signature Animation:
 * Originates as the EXACT typographic full stop at the end of "MORE THAN A STORE."
 * in the hero headline.
 * 
 * When revealProgress/aboutProgress = 0:
 * - Sits inline at the punctuation position after "A STORE"
 * - Exact size of the period dot (~14px on desktop, ~10px mobile)
 * - Mint accent color (#A7F3D0)
 * - Rounded shape (border-radius: 50%)
 * - Flat 2D appearance (depth: 0)
 * 
 * As user scrolls into About Us (aboutProgress > 0):
 * - Detaches from headline and falls downward under gravity
 * - Morphs from rounded dot into enhanced 3D cube (~112px desktop, ~85px mobile)
 * - Has subtle rounded corners (~10px) on cube faces
 * - Shaded faces with rich emerald green (#174D32) and golden highlights
 * - Grows 3D depth along Z axis with 6 textured faces
 * - Spans 3D rotation (rotateX, rotateY, rotateZ) catching realistic lighting
 * - Face colors:
 *     Front:  #174D32 (Dark emerald green) with gold edge sheen
 *     Sides:  #103B26 (Deep green) / #123E29
 *     Top:    #246640 (Slightly lighter green) with golden ambient highlights
 *     Bottom: #0B281A (Green-black shadow base)
 * - Lands on parchment surface with realistic impact, settling bounce & contact shadow
 * - Reversible when scrolling backward
 */

const FullStop3DCube = forwardRef(function FullStop3DCube({ prefersReducedMotion = false }, ref) {
  const containerRef = useRef(null);
  const cubeSceneRef = useRef(null);
  const shadowRef = useRef(null);
  
  // 6 Face refs for direct 60fps DOM updates
  const frontFaceRef = useRef(null);
  const backFaceRef = useRef(null);
  const rightFaceRef = useRef(null);
  const leftFaceRef = useRef(null);
  const topFaceRef = useRef(null);
  const bottomFaceRef = useRef(null);

  // Expose imperative update method called directly by rAF loop
  useImperativeHandle(ref, () => ({
    update({ progress = 0, deltaX = 0, deltaY = 0 }) {
      const container = containerRef.current;
      const cubeScene = cubeSceneRef.current;
      const shadow = shadowRef.current;
      if (!container || !cubeScene) return;

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const targetSize = isMobile ? 85 : 112;
      const startSize = isMobile ? 10 : 14;
      const targetRadius = isMobile ? 8 : 10;

      // When at rest in hero heading (progress == 0)
      if (progress <= 0) {
        container.style.transform = 'translate3d(0px, 0px, 0px)';
        container.style.width = '0.18em';
        container.style.height = '0.18em';
        container.style.marginLeft = '0.04em';
        container.style.verticalAlign = 'baseline';

        cubeScene.style.width = '100%';
        cubeScene.style.height = '100%';
        cubeScene.style.transform = 'rotateX(0deg) rotateY(0deg) rotateZ(0deg)';

        if (frontFaceRef.current) {
          frontFaceRef.current.style.transform = 'translateZ(0px)';
          frontFaceRef.current.style.borderRadius = '50%';
          frontFaceRef.current.style.backgroundColor = '#A7F3D0';
          frontFaceRef.current.style.boxShadow = 'none';
        }

        const otherFaces = [
          backFaceRef.current,
          rightFaceRef.current,
          leftFaceRef.current,
          topFaceRef.current,
          bottomFaceRef.current,
        ];
        otherFaces.forEach((face) => {
          if (face) {
            face.style.opacity = '0';
            face.style.transform = 'translateZ(0px)';
          }
        });

        if (shadow) {
          shadow.style.opacity = '0';
        }
        return;
      }

      // Reduced motion bypass
      if (prefersReducedMotion) {
        const t = Math.min(Math.max(progress, 0), 1);
        container.style.transform = `translate3d(${deltaX * t}px, ${deltaY * t}px, 0px)`;
        container.style.width = `${targetSize}px`;
        container.style.height = `${targetSize}px`;
        cubeScene.style.width = `${targetSize}px`;
        cubeScene.style.height = `${targetSize}px`;
        cubeScene.style.transform = 'rotateX(-22deg) rotateY(35deg) rotateZ(-4deg)';
        if (frontFaceRef.current) {
          frontFaceRef.current.style.transform = `translateZ(${targetSize / 2}px)`;
          frontFaceRef.current.style.borderRadius = `${targetRadius}px`;
          frontFaceRef.current.style.backgroundColor = '#174D32';
        }
        return;
      }

      // -----------------------------------------------------------------------
      // STAGE 1: Detachment & Acceleration (progress: 0.0 -> 0.76)
      // STAGE 2: Impact & Settling Bounce   (progress: 0.76 -> 0.90)
      // STAGE 3: Settled on Parchment      (progress: 0.90 -> 1.00)
      // -----------------------------------------------------------------------
      const tFall = Math.min(Math.max(progress / 0.76, 0), 1);

      // Quadratic gravity acceleration for realistic heavy fall
      const fallCurveY = Math.pow(tFall, 1.75);
      
      // Smooth horizontal easing toward target X
      const fallCurveX = tFall < 0.5 
        ? 2 * tFall * tFall 
        : 1 - Math.pow(-2 * tFall + 2, 2) / 2;

      // Settling bounce after impact (progress: 0.76 -> 0.92)
      let bounceOffset = 0;
      let bounceRot = 0;
      if (progress > 0.76 && progress <= 0.92) {
        const tb = (progress - 0.76) / 0.16; // 0.0 -> 1.0
        // Damped sine wave bounce
        bounceOffset = Math.sin(tb * Math.PI) * 16 * Math.exp(-tb * 2.8);
        bounceRot = Math.sin(tb * Math.PI * 1.5) * 3 * (1 - tb);
      }

      // Cube size progression: startSize (period) -> targetSize (enhanced 112px / 85px)
      const currSize = startSize + tFall * (targetSize - startSize);
      
      // Center compensation: as container expands, shift back by half the expansion delta
      // so the center of the cube tracks the center of the target landing zone perfectly
      const centerOffsetX = (currSize - startSize) / 2;
      const centerOffsetY = (currSize - startSize) / 2;

      const currX = deltaX * fallCurveX - centerOffsetX;
      const currY = deltaY * fallCurveY - bounceOffset - centerOffsetY;

      // Apply container translation
      container.style.transform = `translate3d(${currX.toFixed(2)}px, ${currY.toFixed(2)}px, 0px)`;
      container.style.width = `${currSize.toFixed(1)}px`;
      container.style.height = `${currSize.toFixed(1)}px`;
      cubeScene.style.width = `${currSize.toFixed(1)}px`;
      cubeScene.style.height = `${currSize.toFixed(1)}px`;

      // Border radius: 50% (dot) -> targetRadius (subtle rounded corners on cube faces)
      const radiusProgress = Math.min(tFall / 0.35, 1);
      const borderRadius = `${(50 * (1 - radiusProgress) + targetRadius * radiusProgress).toFixed(1)}px`;

      // 3D Half-depth (distance of each face from center)
      // Expands from 0 to currSize / 2
      const depthProgress = Math.min(tFall / 0.35, 1);
      const halfDepth = (currSize / 2) * depthProgress;

      // Face colors: Front face morphs from #A7F3D0 (mint) to #174D32 (emerald)
      // rgb(167, 243, 208) -> rgb(23, 77, 50)
      const colorT = Math.min(tFall / 0.5, 1);
      const cr = Math.round(167 + colorT * (23 - 167));
      const cg = Math.round(243 + colorT * (77 - 243));
      const cb = Math.round(208 + colorT * (50 - 208));
      const frontColor = `rgb(${cr}, ${cg}, ${cb})`;

      // 3D Rotation during descent -> settling to architectural resting isometric angle
      // Resting angle: rotX = -22deg, rotY = 35deg, rotZ = -4deg
      const rotX = -22 + (1 - tFall) * 260 + bounceRot;
      const rotY = 35 + (1 - tFall) * 440;
      const rotZ = -4 + (1 - tFall) * 160;
      cubeScene.style.transform = `rotateX(${rotX.toFixed(1)}deg) rotateY(${rotY.toFixed(1)}deg) rotateZ(${rotZ.toFixed(1)}deg)`;

      // Update 6 Cube Faces
      const sideOpacity = Math.min(tFall / 0.25, 1).toFixed(3);

      if (frontFaceRef.current) {
        frontFaceRef.current.style.transform = `translateZ(${halfDepth.toFixed(1)}px)`;
        frontFaceRef.current.style.borderRadius = borderRadius;
        frontFaceRef.current.style.backgroundColor = frontColor;
        frontFaceRef.current.style.boxShadow = depthProgress > 0.5 
          ? 'inset 0 1px 2px rgba(255,240,190,0.35), inset 0 -1px 3px rgba(0,0,0,0.35)' 
          : 'none';
      }

      if (backFaceRef.current) {
        backFaceRef.current.style.transform = `rotateY(180deg) translateZ(${halfDepth.toFixed(1)}px)`;
        backFaceRef.current.style.borderRadius = borderRadius;
        backFaceRef.current.style.opacity = sideOpacity;
      }

      if (rightFaceRef.current) {
        rightFaceRef.current.style.transform = `rotateY(90deg) translateZ(${halfDepth.toFixed(1)}px)`;
        rightFaceRef.current.style.borderRadius = borderRadius;
        rightFaceRef.current.style.opacity = sideOpacity;
      }

      if (leftFaceRef.current) {
        leftFaceRef.current.style.transform = `rotateY(-90deg) translateZ(${halfDepth.toFixed(1)}px)`;
        leftFaceRef.current.style.borderRadius = borderRadius;
        leftFaceRef.current.style.opacity = sideOpacity;
      }

      if (topFaceRef.current) {
        topFaceRef.current.style.transform = `rotateX(90deg) translateZ(${halfDepth.toFixed(1)}px)`;
        topFaceRef.current.style.borderRadius = borderRadius;
        topFaceRef.current.style.opacity = sideOpacity;
        topFaceRef.current.style.boxShadow = depthProgress > 0.5
          ? 'inset 0 1px 4px rgba(255, 235, 175, 0.65), inset 0 0 14px rgba(255, 230, 160, 0.25)'
          : 'none';
      }

      if (bottomFaceRef.current) {
        bottomFaceRef.current.style.transform = `rotateX(-90deg) translateZ(${halfDepth.toFixed(1)}px)`;
        bottomFaceRef.current.style.borderRadius = borderRadius;
        bottomFaceRef.current.style.opacity = sideOpacity;
      }

      // Contact Shadow on Parchment Floor
      if (shadow) {
        if (progress < 0.45) {
          shadow.style.opacity = '0';
        } else {
          // As cube lands, shadow darkens and sharpens
          const shadowT = Math.min(Math.max((progress - 0.45) / 0.35, 0), 1);
          const shadowScale = 0.6 + shadowT * 0.45 - (bounceOffset / 16) * 0.25;
          const shadowOpacity = (shadowT * 0.88 - (bounceOffset / 16) * 0.3).toFixed(3);
          shadow.style.opacity = shadowOpacity;
          shadow.style.transform = `rotateX(68deg) scale(${shadowScale.toFixed(2)})`;
        }
      }
    },
  }));

  return (
    <span
      ref={containerRef}
      id="hero-full-stop-container"
      className="inline-block relative z-30 pointer-events-none will-change-[transform,width,height]"
      style={{
        width: '0.18em',
        height: '0.18em',
        marginLeft: '0.04em',
        verticalAlign: 'baseline',
      }}
    >
      {/* 3D Perspective Scene */}
      <div
        ref={cubeSceneRef}
        className="relative w-full h-full will-change-transform"
        style={{
          transformStyle: 'preserve-3d',
          perspective: '1400px',
        }}
      >
        {/* 1. FRONT FACE: #174D32 (Dark emerald green) */}
        <div
          ref={frontFaceRef}
          className="absolute inset-0 backface-hidden border border-white/[0.12]"
          style={{
            backgroundColor: '#A7F3D0',
            borderRadius: '50%',
            transform: 'translateZ(0px)',
          }}
        />

        {/* 2. BACK FACE: #0B281A (Green-black depth) */}
        <div
          ref={backFaceRef}
          className="absolute inset-0 backface-hidden border border-black/30"
          style={{
            backgroundColor: '#0B281A',
            opacity: 0,
            transform: 'translateZ(0px)',
          }}
        />

        {/* 3. RIGHT FACE: #103B26 (Deep green side) */}
        <div
          ref={rightFaceRef}
          className="absolute inset-0 backface-hidden border border-black/25"
          style={{
            backgroundColor: '#103B26',
            boxShadow: 'inset 0 0 18px rgba(0,0,0,0.35)',
            opacity: 0,
            transform: 'translateZ(0px)',
          }}
        />

        {/* 4. LEFT FACE: #123E29 (Deep shadow side) */}
        <div
          ref={leftFaceRef}
          className="absolute inset-0 backface-hidden border border-black/25"
          style={{
            backgroundColor: '#123E29',
            opacity: 0,
            transform: 'translateZ(0px)',
          }}
        />

        {/* 5. TOP FACE: #246640 (Slightly lighter green catching top light with golden sheen) */}
        <div
          ref={topFaceRef}
          className="absolute inset-0 backface-hidden border border-amber-200/40"
          style={{
            backgroundColor: '#246640',
            boxShadow: 'inset 0 1px 4px rgba(255,235,175,0.65), inset 0 0 14px rgba(255,230,160,0.25)',
            opacity: 0,
            transform: 'translateZ(0px)',
          }}
        />

        {/* 6. BOTTOM FACE: #0B281A (Green-black base) */}
        <div
          ref={bottomFaceRef}
          className="absolute inset-0 backface-hidden"
          style={{
            backgroundColor: '#0B281A',
            opacity: 0,
            transform: 'translateZ(0px)',
          }}
        />
      </div>

      {/* Realistic Ambient Contact Shadow on Parchment Floor */}
      <div
        ref={shadowRef}
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-36 h-12 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(11,40,26,0.76) 0%, rgba(11,40,26,0.22) 50%, rgba(11,40,26,0) 74%)',
          borderRadius: '50%',
          opacity: 0,
          transform: 'rotateX(68deg) scale(0.6)',
        }}
      />
    </span>
  );
});

export default FullStop3DCube;
