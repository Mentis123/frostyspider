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
      <div className="max-w-md">
        <a
          href="https://atmanacademy.io/vibe"
          target="_blank"
          rel="noreferrer"
          className="text-2xl sm:text-3xl font-semibold text-white hover:text-blue-300 transition-colors leading-snug"
        >
          A Birb Labs Artefact - Build Yours at the Vibe Academy
        </a>
        <p className="mt-3 text-sm text-gray-300">
          Opens in a new window.
        </p>
      </div>
    </div>
  );
}
