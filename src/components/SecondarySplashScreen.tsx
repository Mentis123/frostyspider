'use client';

import React, { useState, useEffect } from 'react';

interface SecondarySplashScreenProps {
  onComplete: () => void;
  duration?: number; // Duration in ms before auto-dismiss
}

/**
 * Secondary splash screen that shows after the main splash
 * Displays a branded message with a link
 */
export function SecondarySplashScreen({
  onComplete,
  duration = 3000,
}: SecondarySplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Start fading after duration - 500ms (for fade animation)
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, duration - 500);

    // Complete after full duration
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  // Allow tap/click to dismiss early
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
        <p className="text-lg sm:text-xl font-semibold text-white">
          A Birb Labs Artefact - Build Yours at the Vibe Academy
        </p>
        <a
          href="https://atmanacademy.io/vibe"
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="mt-4 inline-flex items-center justify-center rounded-full border border-blue-400/60 px-4 py-2 text-sm font-medium text-blue-200 hover:border-blue-300 hover:text-white transition"
        >
          Open Vibe Academy
        </a>
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
