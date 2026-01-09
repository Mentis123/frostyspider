'use client';

import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';

interface ControlBarProps {
  onSettingsClick: () => void;
  onNewGameClick: () => void;
}

export function ControlBar({ onSettingsClick, onNewGameClick }: ControlBarProps) {
  const { gameState, canUndo, canRedo, undo, redo } = useGame();
  const [elapsedTime, setElapsedTime] = useState('0:00');

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
    <div className="bg-gray-900 border-t border-gray-700">
      {/* Stats row */}
      <div className="flex justify-around items-center py-2 px-4 text-sm border-b border-gray-800">
        <div className="text-center">
          <span className="text-gray-500">Moves</span>
          <span className="ml-2 text-white font-medium">{gameState.moves}</span>
        </div>
        {gameState.settings.showTimer && (
          <div className="text-center">
            <span className="text-gray-500">Time</span>
            <span className="ml-2 text-white font-medium">{elapsedTime}</span>
          </div>
        )}
        <div className="text-center">
          <span className="text-gray-500">Suits</span>
          <span className="ml-2 text-white font-medium">{gameState.settings.suitCount}</span>
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex justify-around items-center py-3 px-2">
        <ControlButton
          onClick={undo}
          disabled={!canUndo}
          label="Undo"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          }
        />
        <ControlButton
          onClick={redo}
          disabled={!canRedo}
          label="Redo"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          }
        />
        <ControlButton
          onClick={onNewGameClick}
          label="New"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
        />
        <ControlButton
          onClick={onSettingsClick}
          label="Settings"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
      </div>
    </div>
  );
}

function ControlButton({
  onClick,
  disabled,
  label,
  icon,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center justify-center
        w-16 h-14 rounded-lg
        transition-colors
        ${disabled
          ? 'text-gray-600 cursor-not-allowed'
          : 'text-gray-300 hover:text-white hover:bg-gray-800 active:bg-gray-700'
        }
      `}
    >
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </button>
  );
}
