import React, { useMemo } from 'react';
import { ShieldCheck, Zap, Smile } from 'lucide-react';

/**
 * GlassSpeechFeaturePanels
 * 
 * Features:
 * 1. Refined Glassmorphism Appearance:
 *    - Translucent smoky glass with backdrop blur, top highlight reflection, and depth shadow.
 * 2. Speech-Bubble Silhouette with Sharp Pointed Extension:
 *    - Rounded pill card with a subtle, sharp pointed tip/extension at the bottom trailing edge
 *      that blends seamlessly with the glass panel and its border.
 * 3. Left-Aligned Positioning:
 *    - Placed toward the left side of the viewport with ~30-40px clearance from the bottom.
 * 4. Scroll-Triggered Sequential Unfolding:
 *    - Reveals one panel at a time as the user scrolls down.
 *    - Each panel unfolds/expands horizontally from its anchor tip using clip-path, scale, and translate.
 *    - Synchronized with scroll progression (reversible on scroll up, freezes on stop).
 *    - Respects prefers-reduced-motion.
 */

const FEATURE_PANELS = [
  {
    id: 'fresh-products',
    title: 'Fresh Products',
    subtitle: 'Always',
    startProgress: 0.28,
    endProgress: 0.48,
    renderIcon: () => (
      <svg
        className="w-4 h-4 text-[#86EFAC]"
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
    ),
  },
  {
    id: 'trusted-quality',
    title: 'Trusted Quality',
    subtitle: 'Always',
    startProgress: 0.48,
    endProgress: 0.68,
    renderIcon: () => <ShieldCheck className="w-4 h-4 text-[#86EFAC]" />,
  },
  {
    id: 'convenient-shopping',
    title: 'Convenient',
    subtitle: 'Shopping',
    startProgress: 0.68,
    endProgress: 0.85,
    renderIcon: () => <Zap className="w-4 h-4 text-[#86EFAC]" />,
  },
  {
    id: 'happier-you',
    title: 'A Happier',
    subtitle: 'You',
    startProgress: 0.85,
    endProgress: 1.0,
    renderIcon: () => <Smile className="w-4 h-4 text-[#86EFAC]" />,
  },
];

export default function GlassSpeechFeaturePanels({ revealProgress = 0 }) {
  // Check reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  return (
    <div className="absolute bottom-8 sm:bottom-10 left-6 sm:left-14 md:left-20 z-30 pointer-events-none max-w-full">
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 pointer-events-auto">
        {FEATURE_PANELS.map((panel) => {
          // Calculate local progress [0.0 - 1.0] for sequential reveal
          const raw = (revealProgress - panel.startProgress) / (panel.endProgress - panel.startProgress);
          const t = Math.min(Math.max(raw, 0), 1);

          // If not started yet, keep hidden
          if (t <= 0) return null;

          // Smooth cubic easeOut curve
          const ease = prefersReducedMotion ? 1 : 1 - Math.pow(1 - t, 3);

          // Unfolding animation styles
          const unfoldClip = prefersReducedMotion
            ? 'none'
            : `inset(0 ${(1 - ease) * 100}% 0 0 round 16px)`;
          const scale = prefersReducedMotion ? 1 : (0.88 + ease * 0.12).toFixed(3);
          const translateY = prefersReducedMotion ? 0 : ((1 - ease) * 10).toFixed(1);
          const opacity = Math.min(ease * 1.5, 1).toFixed(3);

          return (
            <div
              key={panel.id}
              className="relative group transition-all duration-200 hover:-translate-y-0.5 cursor-pointer will-change-[transform,opacity,clip-path]"
              style={{
                clipPath: unfoldClip,
                WebkitClipPath: unfoldClip,
                transform: `translateY(${translateY}px) scale(${scale})`,
                transformOrigin: 'bottom left',
                opacity,
              }}
            >
              {/* Glass Panel Body */}
              <div
                className="relative flex items-center gap-2.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-[rgba(18,20,24,0.58)] backdrop-blur-2xl border border-white/15 shadow-[0_12px_32px_rgba(0,0,0,0.45)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.22)] hover:border-emerald-400/40 hover:bg-[rgba(24,28,34,0.7)] transition-colors duration-200"
              >
                {/* Icon Container */}
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 shadow-sm">
                  {panel.renderIcon()}
                </div>

                {/* Text Content */}
                <div className="flex flex-col text-left whitespace-nowrap pr-1">
                  <span className="text-xs sm:text-[13px] font-medium text-white tracking-tight leading-snug">
                    {panel.title}
                  </span>
                  <span className="text-[10px] font-light text-[#A7F3D0] tracking-wide leading-none mt-0.5">
                    {panel.subtitle}
                  </span>
                </div>
              </div>

              {/* Seamless Sharp Pointed Extension (Speech-Bubble Silhouette) */}
              <div
                className="absolute -bottom-1.5 left-5 w-2.5 h-2.5 bg-[rgba(18,20,24,0.58)] backdrop-blur-2xl border-r border-b border-white/15 rotate-45 shadow-[2px_2px_4px_rgba(0,0,0,0.25)] pointer-events-none group-hover:border-emerald-400/40 group-hover:bg-[rgba(24,28,34,0.7)] transition-colors duration-200"
                style={{ opacity: ease > 0.3 ? 1 : 0 }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
