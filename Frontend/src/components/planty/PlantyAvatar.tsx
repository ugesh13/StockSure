'use client';

import React from 'react';

interface PlantyAvatarProps {
  size?: number;
  variant?: 'head' | 'full';
  className?: string;
}

export default function PlantyAvatar({ size = 32, variant = 'head', className = '' }: PlantyAvatarProps) {
  if (variant === 'full') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        <path d="M140 40L143 48L151 51L143 54L140 62L137 54L129 51L137 48L140 40Z" fill="#F2D34B" />
        <path d="M18 64L20 70L26 72L20 74L18 80L16 74L10 72L16 70L18 64Z" fill="#F2D34B" />

        {/* Sprout */}
        <path d="M80 32C80 20 88 12 98 14C100 24 92 30 80 32Z" fill="#4BAA34" />
        <path d="M80 32C80 22 72 15 62 17C60 27 68 31 80 32Z" fill="#5EC144" />
        <path d="M80 40C80 35 80 32 80 30" stroke="#388426" strokeWidth="3.5" strokeLinecap="round" />

        {/* Robot Head Outer Casing */}
        <rect x="32" y="36" width="96" height="68" rx="32" fill="#FFFFFF" stroke="#DCEBC5" strokeWidth="3" />
        <rect x="24" y="52" width="10" height="36" rx="5" fill="#4BAA34" />
        <rect x="126" y="52" width="10" height="36" rx="5" fill="#4BAA34" />

        {/* Visor Screen */}
        <rect x="44" y="46" width="72" height="48" rx="22" fill="#1A281E" />
        {/* Cyan Eyes */}
        <path d="M56 64C58 59 64 59 66 64" stroke="#68F4C6" strokeWidth="4" strokeLinecap="round" />
        <path d="M94 64C96 59 102 59 104 64" stroke="#68F4C6" strokeWidth="4" strokeLinecap="round" />
        {/* Mouth */}
        <path d="M74 74C76 77 84 77 86 74" stroke="#68F4C6" strokeWidth="3" strokeLinecap="round" />
        {/* Blush Cheeks */}
        <ellipse cx="53" cy="74" rx="4.5" ry="3" fill="#FF8A8A" opacity="0.85" />
        <ellipse cx="107" cy="74" rx="4.5" ry="3" fill="#FF8A8A" opacity="0.85" />

        {/* Torso */}
        <path d="M48 100C48 98 56 96 80 96C104 96 112 98 112 100V132C112 142 100 148 80 148C60 148 48 142 48 132V100Z" fill="#FFFFFF" />
        <path d="M52 104C52 102 60 100 80 100C100 100 108 102 108 104V130C108 140 98 144 80 144C62 144 52 140 52 130V104Z" fill="#3E8F2B" />
      </svg>
    );
  }

  // Head variant (compact)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Sprout */}
      <path d="M50 24C50 14 56 8 64 10C66 18 60 22 50 24Z" fill="#4BAA34" />
      <path d="M50 24C50 16 44 11 36 13C34 21 40 23 50 24Z" fill="#5EC144" />
      <path d="M50 30C50 26 50 24 50 22" stroke="#388426" strokeWidth="3" strokeLinecap="round" />

      {/* Head Outer Casing */}
      <rect x="14" y="26" width="72" height="54" rx="26" fill="#FFFFFF" stroke="#DCEBC5" strokeWidth="2.5" />
      <rect x="8" y="40" width="8" height="26" rx="4" fill="#4BAA34" />
      <rect x="84" y="40" width="8" height="26" rx="4" fill="#4BAA34" />

      {/* Visor */}
      <rect x="24" y="34" width="52" height="38" rx="18" fill="#1A281E" />
      {/* Cyan Eyes */}
      <path d="M34 49C36 45 40 45 42 49" stroke="#68F4C6" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M58 49C60 45 64 45 66 49" stroke="#68F4C6" strokeWidth="3.5" strokeLinecap="round" />
      {/* Smile */}
      <path d="M46 58C48 60 52 60 54 58" stroke="#68F4C6" strokeWidth="2.5" strokeLinecap="round" />
      {/* Cheeks */}
      <circle cx="32" cy="57" r="3" fill="#FF8A8A" opacity="0.85" />
      <circle cx="68" cy="57" r="3" fill="#FF8A8A" opacity="0.85" />
    </svg>
  );
}
