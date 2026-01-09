'use client';

import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { GameSettings } from '@/lib/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { gameState, updateSettings, newGame } = useGame();
  const { settings } = gameState;

  if (!isOpen) return null;

  const handleSuitCountChange = (suitCount: 1 | 2 | 4) => {
    updateSettings({ suitCount });
  };

  const handleNewGame = () => {
    newGame(settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Suit Count */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Number of Suits
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([1, 2, 4] as const).map(count => (
                <button
                  key={count}
                  onClick={() => handleSuitCountChange(count)}
                  className={`
                    py-3 px-4 rounded-lg font-medium text-center transition-colors
                    ${settings.suitCount === count
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }
                  `}
                >
                  <div className="text-lg">{count}</div>
                  <div className="text-xs opacity-75">
                    {count === 1 ? 'Easy' : count === 2 ? 'Medium' : 'Hard'}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {settings.suitCount === 1 && '♠ All Spades - Frosty\'s favorite!'}
              {settings.suitCount === 2 && '♠♥ Spades & Hearts'}
              {settings.suitCount === 4 && '♠♥♦♣ All suits - Expert mode'}
            </p>
          </div>

          {/* Toggle Options */}
          <div className="space-y-3">
            <ToggleOption
              label="Sound Effects"
              checked={settings.soundEnabled}
              onChange={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            />
            <ToggleOption
              label="Haptic Feedback"
              checked={settings.hapticEnabled}
              onChange={() => updateSettings({ hapticEnabled: !settings.hapticEnabled })}
            />
            <ToggleOption
              label="Animations"
              checked={settings.animationsEnabled}
              onChange={() => updateSettings({ animationsEnabled: !settings.animationsEnabled })}
            />
            <ToggleOption
              label="Auto-Complete Sequences"
              checked={settings.autoComplete}
              onChange={() => updateSettings({ autoComplete: !settings.autoComplete })}
            />
            <ToggleOption
              label="Show Timer"
              checked={settings.showTimer}
              onChange={() => updateSettings({ showTimer: !settings.showTimer })}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          <button
            onClick={handleNewGame}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-colors"
          >
            New Game with These Settings
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 px-4 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-300">{label}</span>
      <button
        onClick={onChange}
        className={`
          relative w-12 h-6 rounded-full transition-colors
          ${checked ? 'bg-blue-600' : 'bg-gray-600'}
        `}
      >
        <span
          className={`
            absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
            ${checked ? 'left-7' : 'left-1'}
          `}
        />
      </button>
    </div>
  );
}
