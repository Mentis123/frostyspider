'use client';

import React from 'react';
import { Card as CardType, Suit } from '@/lib/types';

interface CardProps {
  card: CardType;
  isSelected?: boolean;
  isHinted?: boolean;
  onClick?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  stackOffset?: number;
  isDragging?: boolean;
  style?: React.CSSProperties;
}

const suitSymbols: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const suitColors: Record<Suit, string> = {
  spades: 'text-gray-900',
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-gray-900',
};

export function Card({
  card,
  isSelected = false,
  isHinted = false,
  onClick,
  onMouseDown,
  onTouchStart,
  stackOffset = 0,
  isDragging = false,
  style,
}: CardProps) {
  const symbol = suitSymbols[card.suit];
  const colorClass = suitColors[card.suit];

  if (!card.faceUp) {
    // Face down card
    return (
      <div
        className={`
          absolute w-[52px] h-[72px] rounded-lg
          bg-gradient-to-br from-blue-600 to-blue-800
          border-2 border-blue-400
          shadow-md
          flex items-center justify-center
          select-none
        `}
        style={{
          top: stackOffset,
          ...style,
        }}
      >
        <div className="w-10 h-14 rounded border border-blue-400 bg-blue-700 flex items-center justify-center">
          <span className="text-blue-300 text-2xl">🕷️</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        absolute w-[52px] h-[72px] rounded-lg
        bg-white border-2
        ${isSelected ? 'border-yellow-400 ring-2 ring-yellow-400 z-10' : 'border-gray-300'}
        ${isHinted ? 'border-green-400 ring-2 ring-green-400 animate-pulse' : ''}
        ${isDragging ? 'shadow-xl scale-105 z-50' : 'shadow-md'}
        ${onClick ? 'cursor-pointer active:scale-95' : ''}
        transition-transform duration-100
        select-none touch-none
      `}
      style={{
        top: stackOffset,
        ...style,
      }}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* Top left */}
      <div className={`absolute top-1 left-1 ${colorClass} text-xs font-bold leading-none`}>
        <div>{card.rank}</div>
        <div className="text-sm">{symbol}</div>
      </div>

      {/* Center */}
      <div className={`absolute inset-0 flex items-center justify-center ${colorClass} text-2xl`}>
        {symbol}
      </div>

      {/* Bottom right (inverted) */}
      <div className={`absolute bottom-1 right-1 ${colorClass} text-xs font-bold leading-none rotate-180`}>
        <div>{card.rank}</div>
        <div className="text-sm">{symbol}</div>
      </div>
    </div>
  );
}

// Empty card slot component
export function EmptySlot({ onClick }: { onClick?: () => void }) {
  return (
    <div
      className={`
        w-[52px] h-[72px] rounded-lg
        border-2 border-dashed border-gray-400
        bg-gray-800/30
        ${onClick ? 'cursor-pointer hover:bg-gray-700/30' : ''}
      `}
      onClick={onClick}
    />
  );
}

// Stock pile component
export function StockPile({
  remainingDeals,
  onClick,
  disabled,
}: {
  remainingDeals: number;
  onClick: () => void;
  disabled: boolean;
}) {
  const piles = Math.ceil(remainingDeals / 10);

  return (
    <div className="relative w-[52px] h-[72px]">
      {piles > 0 ? (
        <>
          {/* Stack effect */}
          {Array.from({ length: Math.min(piles, 5) }).map((_, i) => (
            <div
              key={i}
              className={`
                absolute w-[52px] h-[72px] rounded-lg
                bg-gradient-to-br from-blue-600 to-blue-800
                border-2 border-blue-400
                ${disabled ? 'opacity-50' : 'cursor-pointer active:scale-95'}
              `}
              style={{
                top: -i * 2,
                left: i * 1,
                zIndex: 5 - i,
              }}
              onClick={disabled ? undefined : onClick}
            />
          ))}
          {/* Card count */}
          <div className="absolute -bottom-6 left-0 right-0 text-center text-xs text-gray-300">
            {remainingDeals} left
          </div>
        </>
      ) : (
        <EmptySlot />
      )}
    </div>
  );
}

// Completed sequence pile
export function CompletedPile({ count, suit }: { count: number; suit?: Suit }) {
  return (
    <div className="relative w-[52px] h-[72px]">
      {count > 0 ? (
        <>
          {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
            <div
              key={i}
              className={`
                absolute w-[52px] h-[72px] rounded-lg
                bg-gradient-to-br from-green-500 to-green-700
                border-2 border-green-400
                flex items-center justify-center
              `}
              style={{
                top: -i * 2,
                left: i * 1,
                zIndex: 8 - i,
              }}
            >
              <span className="text-white text-2xl">
                {suit ? suitSymbols[suit] : '✓'}
              </span>
            </div>
          ))}
          <div className="absolute -bottom-6 left-0 right-0 text-center text-xs text-gray-300">
            {count}/8
          </div>
        </>
      ) : (
        <EmptySlot />
      )}
    </div>
  );
}
