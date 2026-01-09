'use client';

import React from 'react';

interface FrostySpiderProps {
  className?: string;
  size?: number;
}

/**
 * FrostySpider - A cute snowman with 8 spider legs
 * The mascot for FrostySpider Solitaire!
 */
export function FrostySpider({ className = '', size = 48 }: FrostySpiderProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Definitions for gradients */}
      <defs>
        <radialGradient id="frostyGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="snowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </linearGradient>
        <linearGradient id="hatGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e3a5f" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      {/* Subtle background glow */}
      <circle cx="32" cy="34" r="28" fill="url(#frostyGlow)" />

      {/* === SPIDER LEGS (8 total, 4 per side) === */}
      {/* Left side legs (top to bottom) */}
      <path
        d="M24 28 Q16 22 8 18 Q4 16 2 20"
        stroke="#60a5fa"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M23 32 Q14 30 6 28 Q2 27 1 32"
        stroke="#60a5fa"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M23 36 Q14 38 6 40 Q2 41 1 36"
        stroke="#60a5fa"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M24 40 Q16 46 8 50 Q4 52 2 48"
        stroke="#60a5fa"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Right side legs (top to bottom) */}
      <path
        d="M40 28 Q48 22 56 18 Q60 16 62 20"
        stroke="#60a5fa"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M41 32 Q50 30 58 28 Q62 27 63 32"
        stroke="#60a5fa"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M41 36 Q50 38 58 40 Q62 41 63 36"
        stroke="#60a5fa"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M40 40 Q48 46 56 50 Q60 52 62 48"
        stroke="#60a5fa"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* === SNOWMAN BODY === */}
      {/* Bottom body (largest) */}
      <circle
        cx="32"
        cy="46"
        r="12"
        fill="url(#snowGradient)"
        stroke="#93c5fd"
        strokeWidth="1"
      />

      {/* Middle body - where legs attach */}
      <circle
        cx="32"
        cy="32"
        r="10"
        fill="url(#snowGradient)"
        stroke="#93c5fd"
        strokeWidth="1"
      />

      {/* Head (smallest) */}
      <circle
        cx="32"
        cy="18"
        r="8"
        fill="url(#snowGradient)"
        stroke="#93c5fd"
        strokeWidth="1"
      />

      {/* === FACE === */}
      {/* Eyes - friendly dots */}
      <circle cx="29" cy="16" r="1.5" fill="#1e3a5f" />
      <circle cx="35" cy="16" r="1.5" fill="#1e3a5f" />

      {/* Eye shine/sparkle */}
      <circle cx="29.5" cy="15.5" r="0.5" fill="#ffffff" />
      <circle cx="35.5" cy="15.5" r="0.5" fill="#ffffff" />

      {/* Carrot nose */}
      <path
        d="M32 18 L36 19 L32 20 Z"
        fill="#f97316"
        stroke="#ea580c"
        strokeWidth="0.5"
      />

      {/* Smile - gentle curve */}
      <path
        d="M29 22 Q32 24 35 22"
        stroke="#1e3a5f"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
      />

      {/* === TOP HAT === */}
      {/* Hat brim */}
      <ellipse
        cx="32"
        cy="11"
        rx="7"
        ry="2"
        fill="url(#hatGradient)"
        stroke="#60a5fa"
        strokeWidth="0.5"
      />

      {/* Hat top */}
      <rect
        x="27"
        y="3"
        width="10"
        height="8"
        rx="1"
        fill="url(#hatGradient)"
        stroke="#60a5fa"
        strokeWidth="0.5"
      />

      {/* Hat band - icy blue */}
      <rect
        x="27"
        y="8"
        width="10"
        height="2"
        fill="#3b82f6"
      />

      {/* === SCARF === */}
      {/* Scarf wrap around neck */}
      <path
        d="M26 24 Q32 26 38 24"
        stroke="#3b82f6"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Scarf tail hanging */}
      <path
        d="M38 24 Q40 28 38 32"
        stroke="#3b82f6"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Scarf fringe */}
      <path
        d="M37 31 L36 34 M38 32 L38 35 M39 31 L40 34"
        stroke="#60a5fa"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* === SNOW SPARKLES === */}
      <circle cx="28" cy="44" r="0.8" fill="#ffffff" opacity="0.8" />
      <circle cx="36" cy="48" r="0.6" fill="#ffffff" opacity="0.7" />
      <circle cx="30" cy="30" r="0.5" fill="#ffffff" opacity="0.6" />
    </svg>
  );
}

/**
 * Simplified version for very small sizes (below 40px)
 */
export function FrostySpiderMini({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size}>
      {/* Simplified legs - just 4 visible curves each side */}
      <g stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" fill="none">
        {/* Left legs */}
        <path d="M12 14 Q6 10 2 8" />
        <path d="M11 16 Q5 16 1 16" />
        <path d="M11 18 Q5 20 1 20" />
        <path d="M12 20 Q6 24 2 26" />
        {/* Right legs */}
        <path d="M20 14 Q26 10 30 8" />
        <path d="M21 16 Q27 16 31 16" />
        <path d="M21 18 Q27 20 31 20" />
        <path d="M20 20 Q26 24 30 26" />
      </g>

      {/* Simple snowman - 3 circles */}
      <circle cx="16" cy="24" r="6" fill="#f0f9ff" stroke="#93c5fd" strokeWidth="0.5" />
      <circle cx="16" cy="16" r="5" fill="#f0f9ff" stroke="#93c5fd" strokeWidth="0.5" />
      <circle cx="16" cy="9" r="4" fill="#f0f9ff" stroke="#93c5fd" strokeWidth="0.5" />

      {/* Simple face */}
      <circle cx="14.5" cy="8" r="0.8" fill="#1e3a5f" />
      <circle cx="17.5" cy="8" r="0.8" fill="#1e3a5f" />
      <path d="M16 9.5 L18 10 L16 10.5" fill="#f97316" />

      {/* Mini hat */}
      <rect x="13" y="3" width="6" height="4" rx="0.5" fill="#0f172a" />
      <ellipse cx="16" cy="6" rx="4" ry="1" fill="#1e3a5f" />
    </svg>
  );
}
