/**
 * ============================================================================
 * VIBE ACADEMY SPLASH SCREEN - Reusable Template
 * ============================================================================
 *
 * Drop this component into any React/Next.js app to display a branded
 * "Made by Vibe Academy" splash screen.
 *
 * SETUP:
 * 1. Copy this file into your project (e.g. src/components/VibeAcademySplash.tsx)
 * 2. Import and render it in your root layout or main page component
 * 3. Provide an `onComplete` callback to dismiss it
 *
 * REQUIREMENTS:
 * - React 18+
 * - Tailwind CSS (uses utility classes for styling)
 * - If using Next.js App Router, the 'use client' directive is included
 *
 * CUSTOMIZATION:
 * - `duration`: how long the splash stays visible (default 4000ms)
 * - `sessionKey`: sessionStorage key to track if user has seen it (prevents
 *   repeat displays within the same browser session)
 * - The design uses a dark overlay (gray-950/95) with blue accent colors
 *
 * EXAMPLE USAGE:
 *
 *   import { VibeAcademySplash } from '@/components/VibeAcademySplash';
 *
 *   export default function App() {
 *     const [showSplash, setShowSplash] = useState(true);
 *
 *     return (
 *       <>
 *         {showSplash && (
 *           <VibeAcademySplash onComplete={() => setShowSplash(false)} />
 *         )}
 *         <YourAppContent />
 *       </>
 *     );
 *   }
 *
 * SESSION-AWARE EXAMPLE (only show once per session):
 *
 *   export default function App() {
 *     const [showSplash, setShowSplash] = useState(false);
 *
 *     useEffect(() => {
 *       const seen = sessionStorage.getItem('vibe-splash-shown');
 *       if (!seen) setShowSplash(true);
 *     }, []);
 *
 *     return (
 *       <>
 *         {showSplash && (
 *           <VibeAcademySplash
 *             onComplete={() => {
 *               setShowSplash(false);
 *               sessionStorage.setItem('vibe-splash-shown', 'true');
 *             }}
 *           />
 *         )}
 *         <YourAppContent />
 *       </>
 *     );
 *   }
 *
 * ============================================================================
 */

'use client';

import React, { useState, useEffect } from 'react';

interface VibeAcademySplashProps {
  /** Called when the splash is dismissed (auto or manual) */
  onComplete: () => void;
  /** Time in ms before auto-dismiss (default: 4000) */
  duration?: number;
}

export function VibeAcademySplash({
  onComplete,
  duration = 4000,
}: VibeAcademySplashProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Start fade-out 500ms before dismissal
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, duration - 500);

    // Dismiss after full duration
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  // Tap/click anywhere to dismiss early
  const handleDismiss = () => {
    setIsFading(true);
    setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center
        bg-gray-950/95 cursor-pointer
        transition-opacity duration-500 ease-out
        ${isFading ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleDismiss}
      onTouchEnd={handleDismiss}
    >
      <div className="max-w-sm px-6 text-center">
        {/* Main message */}
        <p className="text-lg sm:text-xl font-semibold text-white">
          A Birb Labs Artefact - Build Yours at the Vibe Academy
        </p>

        {/* CTA button - links to Vibe Academy */}
        <a
          href="https://atmanacademy.io/academy"
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="mt-4 inline-flex items-center justify-center rounded-full
            border border-blue-400/60 px-4 py-2 text-sm font-medium
            text-blue-200 hover:border-blue-300 hover:text-white transition"
        >
          Open Vibe Academy
        </a>

        {/* Attribution */}
        <div className="mt-5 space-y-1 text-sm text-gray-300">
          <p>
            From the Mind of{' '}
            <a
              href="https://x.com/adam_x_mentis"
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="font-semibold text-blue-200 hover:text-white transition"
            >
              Mentis
            </a>
          </p>
          <p>Love it? Got Feedback?</p>
          <p>
            <a
              href="https://x.com/adam_x_mentis"
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="font-semibold text-blue-200 hover:text-white transition"
            >
              DMs Always Open!
            </a>
          </p>
        </div>
      </div>

      {/* Dismiss hint */}
      <div
        className={`absolute bottom-8 left-0 right-0 text-center
          text-gray-400 text-sm
          transition-opacity duration-300
          ${isFading ? 'opacity-0' : 'opacity-70'}`}
      >
        Tap to continue
      </div>
    </div>
  );
}
