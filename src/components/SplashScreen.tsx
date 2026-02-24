'use client';

import React, { useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

/**
 * Splash screen that shows when the app loads
 * Displays the splash_screen.jpg - tap to dismiss
 */
export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  // Tap/click to dismiss
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
