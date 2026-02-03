'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { GameBoard } from './GameBoard';
import { ControlBar } from './ControlBar';
import { SettingsModal } from './SettingsModal';
import { WinModal } from './WinModal';
import { SplashScreen } from './SplashScreen';
import { SecondarySplashScreen } from './SecondarySplashScreen';
import { StackCompleteAnimation } from './StackCompleteAnimation';
import { useGame } from '@/contexts/GameContext';
import { gameFeedback, initAudio, musicManager } from '@/lib/feedback';
import { Card } from '@/lib/types';

export function Game() {
  const { gameState, newGame } = useGame();

  // Splash screen state - starts false to avoid hydration mismatch
  const [splashStage, setSplashStage] = useState<'primary' | 'secondary' | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [secondarySplashDuration, setSecondarySplashDuration] = useState(4000);

  // Check sessionStorage on client mount
  useEffect(() => {
    setIsClient(true);
    const hasSeenSplash = sessionStorage.getItem('frosty-spider-splash-shown');
    if (!hasSeenSplash) {
      setSecondarySplashDuration(7000);
      setSplashStage('primary');
    } else {
      setSecondarySplashDuration(4000);
      // If splash already shown, init audio immediately
      initAudio();
    }
  }, []);

  const handlePrimarySplashComplete = useCallback(() => {
    setSplashStage('secondary');
  }, []);

  const handleSecondarySplashComplete = useCallback(() => {
    setSplashStage(null);
    sessionStorage.setItem('frosty-spider-splash-shown', 'true');
    // Initialize audio after splash (user interaction helps unlock audio)
    initAudio();
    // Start music if enabled
    if (gameState.settings.musicEnabled) {
      musicManager.setEnabled(true);
    }
  }, [gameState.settings.musicEnabled]);

  const handleSplashComplete = useCallback(() => {
    if (showVibeAfterSplash) {
      setShowSplash(false);
      setShowVibeAfterSplash(false);
      setShowVibeSplash(true);
      return;
    }

    setShowSplash(false);
    finalizeSplashSequence();
  }, [finalizeSplashSequence, showVibeAfterSplash]);

  const handleVibeSplashComplete = useCallback(() => {
    setShowVibeSplash(false);
    finalizeSplashSequence();
  }, [finalizeSplashSequence]);

  // Handle music toggle from settings
  useEffect(() => {
    if (isClient && splashStage === null) {
      musicManager.setEnabled(gameState.settings.musicEnabled);
    }
  }, [gameState.settings.musicEnabled, isClient, splashStage]);

  const [showSettings, setShowSettings] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
  const [stackCompleteAnimation, setStackCompleteAnimation] = useState<Card[] | null>(null);
  const prevCompletedCount = useRef(gameState.completed.length);

  // Feedback options
  const feedbackOptions = useMemo(() => ({
    soundEnabled: gameState.settings.soundEnabled,
    hapticEnabled: gameState.settings.hapticEnabled,
    immersiveEnabled: gameState.settings.immersiveEnabled,
  }), [gameState.settings.soundEnabled, gameState.settings.hapticEnabled, gameState.settings.immersiveEnabled]);

  // Show win modal when game is won
  useEffect(() => {
    if (gameState.isWon) {
      setShowWin(true);
      gameFeedback('win', feedbackOptions);
    }
  }, [gameState.isWon, feedbackOptions]);

  // Play feedback and show animation when a sequence is completed
  useEffect(() => {
    if (gameState.completed.length > prevCompletedCount.current) {
      // Only play complete sound if not the winning move (win sound is better)
      if (!gameState.isWon) {
        gameFeedback('complete', feedbackOptions);
      }
      // Trigger the stack complete animation with the newly completed cards
      const newlyCompletedStack = gameState.completed[gameState.completed.length - 1];
      if (newlyCompletedStack && gameState.settings.animationsEnabled !== false) {
        setStackCompleteAnimation(newlyCompletedStack);
      }
    }
    prevCompletedCount.current = gameState.completed.length;
  }, [gameState.completed, gameState.isWon, feedbackOptions, gameState.settings.animationsEnabled]);

  const handleNewGameClick = () => {
    if (gameState.moves > 0 && !gameState.isWon) {
      setShowNewGameConfirm(true);
    } else {
      newGame();
    }
  };

  const handleShowSplash = useCallback(() => {
    setSecondarySplashDuration(4000);
    setSplashStage('primary');
  }, []);

  const handleShowVibeSplash = useCallback(() => {
    setShowVibeSplash(true);
  }, []);

  const confirmNewGame = () => {
    newGame();
    setShowNewGameConfirm(false);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-900">
      {/* Splash screen - shows briefly on first load */}
      {splashStage === 'primary' && (
        <SplashScreen onComplete={handlePrimarySplashComplete} duration={2500} />
      )}
      {splashStage === 'secondary' && (
        <SecondarySplashScreen
          onComplete={handleSecondarySplashComplete}
          duration={secondarySplashDuration}
        />
      )}

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
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onShowSplash={handleShowSplash}
        onShowVibeSplash={handleShowVibeSplash}
      />
      <WinModal isOpen={showWin} onClose={() => setShowWin(false)} />

      {/* Stack completion animation */}
      {stackCompleteAnimation && (
        <StackCompleteAnimation
          cards={stackCompleteAnimation}
          onComplete={() => setStackCompleteAnimation(null)}
        />
      )}

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
