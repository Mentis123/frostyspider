'use client';

import React, { useState, useEffect } from 'react';
import { GameBoard } from './GameBoard';
import { ControlBar } from './ControlBar';
import { SettingsModal } from './SettingsModal';
import { WinModal } from './WinModal';
import { useGame } from '@/contexts/GameContext';

export function Game() {
  const { gameState, newGame } = useGame();
  const [showSettings, setShowSettings] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);

  // Show win modal when game is won
  useEffect(() => {
    if (gameState.isWon) {
      setShowWin(true);
    }
  }, [gameState.isWon]);

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
      {/* Header */}
      <header className="bg-gray-800 px-4 py-2 flex items-center justify-center border-b border-gray-700">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-2xl">🕷️</span>
          Frosty Spider
        </h1>
      </header>

      {/* Game area */}
      <main className="flex-1 overflow-hidden">
        <GameBoard />
      </main>

      {/* Control bar */}
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
