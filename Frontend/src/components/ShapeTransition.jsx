import React, { useEffect, useState } from 'react';

/**
 * ShapeTransition
 * 
 * Modular placeholder architecture for cinematic shape-based transitions.
 * Isolated and configurable so the shape animation geometry and timing can be
 * easily customized or replaced later without altering the surrounding application.
 * 
 * Configurable Shape Geometries:
 * - 'circle': Expanding circular aperture originating from center (Default)
 * - 'diamond': Geometric diamond iris expansion
 * - 'hexagon': Six-sided aperture reveal
 * - 'shutter': Horizontal cinematic shutter reveal
 */
export const SHAPE_CONFIGS = {
  circle: (p) => `circle(${(p * 150).toFixed(2)}% at 50% 50%)`,
  diamond: (p) => {
    const s = (p * 150).toFixed(2);
    return `polygon(50% ${50 - s}%, ${50 + s}% 50%, 50% ${50 + s}%, ${50 - s}% 50%)`;
  },
  hexagon: (p) => {
    const s = (p * 140).toFixed(2);
    return `polygon(50% ${50 - s}%, ${50 + s * 0.866}% ${50 - s * 0.5}%, ${50 + s * 0.866}% ${50 + s * 0.5}%, 50% ${50 + s}%, ${50 - s * 0.866}% ${50 + s * 0.5}%, ${50 - s * 0.866}% ${50 - s * 0.5}%)`;
  },
  shutter: (p) => {
    const half = (p * 50).toFixed(2);
    return `polygon(0% ${50 - half}%, 100% ${50 - half}%, 100% ${50 + half}%, 0% ${50 + half}%)`;
  },
};

export default function ShapeTransition({
  isActive,
  shapeType = 'circle',
  durationMs = 1200,
  onComplete,
  children,
}) {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setProgress(0);
      setIsDone(false);
      return;
    }

    let start = null;
    let rafId = null;

    const tick = (timestamp) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const raw = Math.min(elapsed / durationMs, 1);

      // Smooth cinematic easeOutCubic
      const eased = 1 - Math.pow(1 - raw, 3);
      setProgress(eased);

      if (raw < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setIsDone(true);
        if (onComplete) onComplete();
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isActive, durationMs, onComplete]);

  // Do not render if transition has not started yet
  if (!isActive && progress === 0) {
    return null;
  }

  // Once transition is complete, render children fully unclipped
  if (isDone) {
    return (
      <div className="absolute inset-0 w-full h-full z-30 pointer-events-auto">
        {children}
      </div>
    );
  }

  const shapeFn = SHAPE_CONFIGS[shapeType] || SHAPE_CONFIGS.circle;
  const clipPathValue = shapeFn(progress);

  return (
    <div
      className="absolute inset-0 w-full h-full z-30 overflow-hidden pointer-events-auto will-change-[clip-path,transform]"
      style={{
        clipPath: clipPathValue,
        WebkitClipPath: clipPathValue,
      }}
    >
      {children}
    </div>
  );
}
