'use client';

import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number; // Duration in ms before auto-dismiss
}

/**
 * Splash screen that shows briefly when the app loads
 * Displays the splash_screen.jpg with a fade-out animation
 */
export function SplashScreen({ onComplete, duration = 2000 }: SplashScreenProps) {
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
      className={`
        fixed inset-0 z-[100] flex items-center justify-center
        bg-gray-900 cursor-pointer
        transition-opacity duration-500 ease-out
        ${isFading ? 'opacity-0' : 'opacity-100'}
      `}
      onClick={handleDismiss}
      onTouchEnd={handleDismiss}
    >
      <img
        src="/splash_screen.jpg"
        alt="Frosty Spider"
        className="max-w-full max-h-full object-contain"
        draggable={false}
      />

      {/* Tap to continue hint */}
      <div className={`
        absolute bottom-8 left-0 right-0 text-center
        text-gray-400 text-sm
        transition-opacity duration-300
        ${isFading ? 'opacity-0' : 'opacity-70'}
      `}>
        Tap to continue
      </div>
    </div>
  );
}
