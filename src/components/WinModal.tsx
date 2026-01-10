'use client';

import React, { useEffect, useState } from 'react';
import { useGame } from '@/contexts/GameContext';

interface WinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WinModal({ isOpen, onClose }: WinModalProps) {
  const { gameState, newGame } = useGame();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatTime = (startTime: number | null): string => {
    if (!startTime) return '0:00';
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNewGame = () => {
    newGame();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4">
      {/* Confetti animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-20px',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <span
                className="text-2xl"
                style={{
                  color: ['#ff0', '#f0f', '#0ff', '#f00', '#0f0', '#00f'][
                    Math.floor(Math.random() * 6)
                  ],
                }}
              >
                {['🕷️', '✨', '🎉', '⭐', '🏆'][Math.floor(Math.random() * 5)]}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl w-full max-w-sm shadow-2xl text-center overflow-hidden max-h-full overflow-y-auto">
        {/* Trophy banner */}
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 py-3 sm:py-6">
          <div className="text-4xl sm:text-6xl mb-1 sm:mb-2">🏆</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-yellow-900">You Win!</h2>
        </div>

        {/* Stats */}
        <div className="p-3 sm:p-6 space-y-2 sm:space-y-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-gray-700/50 rounded-lg p-2 sm:p-3">
              <div className="text-gray-400 text-xs sm:text-sm">Moves</div>
              <div className="text-lg sm:text-2xl font-bold text-white">{gameState.moves}</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-2 sm:p-3">
              <div className="text-gray-400 text-xs sm:text-sm">Time</div>
              <div className="text-lg sm:text-2xl font-bold text-white">
                {formatTime(gameState.startTime)}
              </div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-2 sm:p-3">
              <div className="text-gray-400 text-xs sm:text-sm">Difficulty</div>
              <div className="text-lg sm:text-2xl font-bold text-white">
                {gameState.settings.suitCount === 1 && 'Easy'}
                {gameState.settings.suitCount === 2 && 'Medium'}
                {gameState.settings.suitCount === 4 && 'Hard'}
              </div>
            </div>
          </div>

          <p className="text-gray-400 text-xs sm:text-sm">
            Congratulations, Frosty! You've conquered the spider! 🕷️
          </p>
        </div>

        {/* Actions */}
        <div className="p-3 sm:p-4 border-t border-gray-700 flex gap-2 sm:block sm:space-y-2">
          <button
            onClick={handleNewGame}
            className="flex-1 sm:w-full py-2 sm:py-3 px-3 sm:px-4 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-colors text-base sm:text-lg"
          >
            Play Again
          </button>
          <button
            onClick={onClose}
            className="flex-1 sm:w-full py-2 px-3 sm:px-4 text-gray-400 hover:text-white transition-colors border border-gray-600 sm:border-0 rounded-lg sm:rounded-none"
          >
            View Board
          </button>
        </div>
      </div>
    </div>
  );
}
