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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
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

      <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl w-full max-w-sm shadow-2xl text-center overflow-hidden">
        {/* Trophy banner */}
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 py-6">
          <div className="text-6xl mb-2">🏆</div>
          <h2 className="text-3xl font-bold text-yellow-900">You Win!</h2>
        </div>

        {/* Stats */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="text-gray-400 text-sm">Moves</div>
              <div className="text-2xl font-bold text-white">{gameState.moves}</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <div className="text-gray-400 text-sm">Time</div>
              <div className="text-2xl font-bold text-white">
                {formatTime(gameState.startTime)}
              </div>
            </div>
          </div>

          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="text-gray-400 text-sm">Difficulty</div>
            <div className="text-xl font-bold text-white">
              {gameState.settings.suitCount === 1 && '1 Suit (Easy)'}
              {gameState.settings.suitCount === 2 && '2 Suits (Medium)'}
              {gameState.settings.suitCount === 4 && '4 Suits (Hard)'}
            </div>
          </div>

          <p className="text-gray-400 text-sm">
            Congratulations, Frosty! You've conquered the spider! 🕷️
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          <button
            onClick={handleNewGame}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-colors text-lg"
          >
            Play Again
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 px-4 text-gray-400 hover:text-white transition-colors"
          >
            View Board
          </button>
        </div>
      </div>
    </div>
  );
}
