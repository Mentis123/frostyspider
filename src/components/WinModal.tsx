'use client';

import React, { useEffect, useState } from 'react';
import { useGame } from '@/contexts/GameContext';

interface WinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ConfettiPiece {
  left: number;
  delay: number;
  duration: number;
  color: string;
  emoji: string;
}

const CONFETTI_COLORS = ['#ff0', '#f0f', '#0ff', '#f00', '#0f0', '#00f'];
const CONFETTI_EMOJI = ['🕷️', '✨', '🎉', '⭐', '🏆'];

function formatTime(startTime: number | null): string {
  if (!startTime) return '0:00';
  const seconds = Math.floor((Date.now() - startTime) / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function WinModal({ isOpen, onClose }: WinModalProps) {
  const { gameState, newGame } = useGame();
  // Confetti positions and the final time are captured once when the modal
  // opens — randomizing in render would reshuffle them on every re-render
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [finalTime, setFinalTime] = useState('0:00');

  useEffect(() => {
    if (isOpen) {
      setFinalTime(formatTime(gameState.startTime));
      setConfetti(
        Array.from({ length: 50 }, () => ({
          left: Math.random() * 100,
          delay: Math.random() * 2,
          duration: 2 + Math.random() * 2,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          emoji: CONFETTI_EMOJI[Math.floor(Math.random() * CONFETTI_EMOJI.length)],
        }))
      );
      const timer = setTimeout(() => setConfetti([]), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, gameState.startTime]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNewGame = () => {
    newGame();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4">
      {/* Confetti animation */}
      {confetti.length > 0 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {confetti.map((piece, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${piece.left}%`,
                top: '-20px',
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
              }}
            >
              <span className="text-2xl" style={{ color: piece.color }}>
                {piece.emoji}
              </span>
            </div>
          ))}
        </div>
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label="You win"
        className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl w-full max-w-sm shadow-2xl text-center overflow-hidden max-h-full overflow-y-auto"
      >
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
                {finalTime}
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
            Congratulations, Frosty! You&apos;ve conquered the spider! 🕷️
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
