'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GameBoard } from './GameBoard';
import { ControlBar } from './ControlBar';
import { SettingsModal } from './SettingsModal';
import { WinModal } from './WinModal';
import { useGame } from '@/contexts/GameContext';
import { gameFeedback } from '@/lib/feedback';

export function Game() {
  const { gameState, newGame } = useGame();
  const [showSettings, setShowSettings] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
  const prevCompletedCount = useRef(gameState.completed.length);

  // Feedback options
  const feedbackOptions = useMemo(() => ({
    soundEnabled: gameState.settings.soundEnabled,
    hapticEnabled: gameState.settings.hapticEnabled,
  }), [gameState.settings.soundEnabled, gameState.settings.hapticEnabled]);

  // Show win modal when game is won
  useEffect(() => {
    if (gameState.isWon) {
      setShowWin(true);
      gameFeedback('win', feedbackOptions);
    }
  }, [gameState.isWon, feedbackOptions]);

  // Play feedback when a sequence is completed
  useEffect(() => {
    if (gameState.completed.length > prevCompletedCount.current) {
      // Only play complete sound if not the winning move (win sound is better)
      if (!gameState.isWon) {
        gameFeedback('complete', feedbackOptions);
      }
    }
    prevCompletedCount.current = gameState.completed.length;
  }, [gameState.completed.length, gameState.isWon, feedbackOptions]);

  const handleNewGameClick = () => {
    if (gameState.moves > 0 && !gameState.isWon) {
      setShowNewGameConfirm(true);
    } else {
      newGame();
    }
  };

  const confirmNewGame = () => {
    newGame();
    setShowNewGameConfirm(false);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-900">
      {/* Game area - maximized */}
      <main className="flex-1 overflow-hidden">
        <GameBoard />
      </main>

      {/* Compact control bar */}
      <ControlBar
        onSettingsClick={() => setShowSettings(true)}
        onNewGameClick={handleNewGameClick}
      />

      {/* Modals */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <WinModal isOpen={showWin} onClose={() => setShowWin(false)} />

      {/* New game confirmation */}
      {showNewGameConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-sm p-6 text-center">
            <h3 className="text-xl font-bold text-white mb-4">Start New Game?</h3>
            <p className="text-gray-400 mb-6">
              Your current game progress will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNewGameConfirm(false)}
                className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmNewGame}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              >
                New Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
