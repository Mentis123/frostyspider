'use client';

import React, { useEffect } from 'react';

interface VibeSplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

export function VibeSplashScreen({ onComplete, duration = 3000 }: VibeSplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/95 text-center px-6">
      <div className="max-w-md space-y-3">
        <a
          href="https://atmanacademy.io/vibe"
          target="_blank"
          rel="noreferrer"
          className="text-2xl sm:text-3xl font-semibold text-white hover:text-blue-300 transition-colors leading-snug"
        >
          A Birb Labs Artefact - Build Yours at the Vibe Academy
        </a>
        <div className="text-sm sm:text-base text-gray-200 space-y-1">
          <p>
            From the Mind of{' '}
            <a
              href="https://x.com/adam_x_mentis"
              target="_blank"
              rel="noreferrer"
              className="text-blue-300 hover:text-blue-200 transition-colors"
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
              className="text-blue-300 hover:text-blue-200 transition-colors"
            >
              DMs Always Open!
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
