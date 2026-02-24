'use client';

import React, { useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';
import { GameSettings } from '@/lib/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowSplash: () => void;
}

// Detect iOS (Safari, Chrome, Firefox on iOS all use WebKit)
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function SettingsModal({ isOpen, onClose, onShowSplash }: SettingsModalProps) {
  const { gameState, updateSettings, newGame } = useGame();
  const { settings } = gameState;
  const onIOS = useMemo(() => isIOS(), []);

  if (!isOpen) return null;

  const handleSuitCountChange = (suitCount: 1 | 2 | 4) => {
    updateSettings({ suitCount });
  };

  const handleNewGame = () => {
    newGame(settings);
    onClose();
  };

  const handleShowSplash = () => {
    onClose();
    onShowSplash();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="settings-modal bg-gray-800 rounded-xl w-full max-w-sm shadow-2xl flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="settings-header flex justify-between items-center p-3 sm:p-4 border-b border-gray-700 shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="settings-content p-3 sm:p-4 space-y-4 sm:space-y-6 overflow-y-auto flex-1 min-h-0 overscroll-contain">
          {/* Suit Count */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Number of Suits
            </label>
            <div className="suit-buttons grid grid-cols-3 gap-2">
              {([1, 2, 4] as const).map(count => (
                <button
                  key={count}
                  onClick={() => handleSuitCountChange(count)}
                  className={`
                    py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-medium text-center transition-colors
                    ${settings.suitCount === count
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }
                  `}
                >
                  <div className="text-base sm:text-lg">{count}</div>
                  <div className="suit-label text-xs opacity-75">
                    {count === 1 ? 'Easy' : count === 2 ? 'Medium' : 'Hard'}
                  </div>
                </button>
              ))}
            </div>
            <p className="suit-description text-xs text-gray-500 mt-1 sm:mt-2">
              {settings.suitCount === 1 && '♠ All Spades - Frosty\'s favorite!'}
              {settings.suitCount === 2 && '♠♥ Spades & Hearts'}
              {settings.suitCount === 4 && '♠♥♦♣ All suits - Expert mode'}
            </p>
          </div>

          {/* Toggle Options */}
          <div className="space-y-2 sm:space-y-3">
            <ToggleOption
              label="Sound Effects"
              checked={settings.soundEnabled}
              onChange={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            />
            <ToggleOption
              label="Background Music"
              checked={settings.musicEnabled}
              onChange={() => updateSettings({ musicEnabled: !settings.musicEnabled })}
            />
            <ToggleOption
              label="Haptic Feedback"
              checked={settings.hapticEnabled}
              onChange={() => updateSettings({ hapticEnabled: !settings.hapticEnabled })}
              note={onIOS ? 'Not supported on iOS devices' : undefined}
            />
            <ToggleOption
              label="Immersive Mode"
              checked={settings.immersiveEnabled}
              onChange={() => updateSettings({ immersiveEnabled: !settings.immersiveEnabled })}
              note="Visual push effects for tactile feel"
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

          {/* Splash Screen Button */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-gray-500">Splash Screen</p>
            <button
              onClick={handleShowSplash}
              className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm"
            >
              Replay Splash Screen
            </button>
          </div>
        </div>

        {/* Footer - always visible */}
        <div className="settings-footer p-3 sm:p-4 border-t border-gray-700 shrink-0 flex flex-col gap-2">
          <button
            onClick={handleNewGame}
            className="flex-1 py-2 sm:py-3 px-4 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-colors text-sm sm:text-base"
          >
            New Game
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-sm sm:text-base"
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
  note,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  note?: string;
}) {
  return (
    <div>
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
      {note && <p className="text-xs text-gray-500 mt-1">{note}</p>}
    </div>
  );
}
