'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';
import { gameFeedback } from '@/lib/feedback';

interface ControlBarProps {
  onSettingsClick: () => void;
  onNewGameClick: () => void;
}

export function ControlBar({ onSettingsClick, onNewGameClick }: ControlBarProps) {
  const { gameState, canUndo, canRedo, undo, redo } = useGame();
  const [elapsedTime, setElapsedTime] = useState('0:00');

  // Feedback options
  const feedbackOptions = useMemo(() => ({
    soundEnabled: gameState.settings.soundEnabled,
    hapticEnabled: gameState.settings.hapticEnabled,
  }), [gameState.settings.soundEnabled, gameState.settings.hapticEnabled]);

  // Undo with feedback
  const handleUndo = useCallback(() => {
    undo();
    gameFeedback('undo', feedbackOptions);
  }, [undo, feedbackOptions]);

  // Redo with feedback
  const handleRedo = useCallback(() => {
    redo();
    gameFeedback('undo', feedbackOptions);
  }, [redo, feedbackOptions]);

  // Update timer
  useEffect(() => {
    if (!gameState.startTime || gameState.isWon) {
      if (!gameState.startTime) setElapsedTime('0:00');
      return;
    }

    const updateTimer = () => {
      const seconds = Math.floor((Date.now() - gameState.startTime!) / 1000);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      setElapsedTime(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [gameState.startTime, gameState.isWon]);

  return (
    <div className="bg-gray-800/95 backdrop-blur-sm border-t border-gray-700 px-2 py-1.5">
      {/* Single compact row with stats and controls */}
      <div className="flex items-center justify-between gap-1">
        {/* Stats - compact inline */}
        <div className="flex items-center gap-2 text-xs min-w-0">
          <span className="text-gray-400">
            <span className="text-white font-medium">{gameState.moves}</span> moves
          </span>
          {gameState.settings.showTimer && (
            <span className="text-gray-400">
              <span className="text-white font-medium">{elapsedTime}</span>
            </span>
          )}
        </div>

        {/* Control buttons - compact */}
        <div className="flex items-center gap-0.5">
          <CompactButton onClick={handleUndo} disabled={!canUndo} icon="undo" />
          <CompactButton onClick={handleRedo} disabled={!canRedo} icon="redo" />
          <CompactButton onClick={onNewGameClick} icon="new" />
          <CompactButton onClick={onSettingsClick} icon="settings" />
        </div>
      </div>
    </div>
  );
}

function CompactButton({
  onClick,
  disabled,
  icon,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: 'undo' | 'redo' | 'new' | 'settings';
}) {
  const icons = {
    undo: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    ),
    redo: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
      </svg>
    ),
    new: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    settings: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center justify-center
        w-10 h-10 rounded-lg
        transition-colors
        ${disabled
          ? 'text-gray-600 cursor-not-allowed'
          : 'text-gray-300 hover:text-white hover:bg-gray-700 active:bg-gray-600'
        }
      `}
    >
      {icons[icon]}
    </button>
  );
}
