'use client';

import React from 'react';
import { Card as CardType, Suit } from '@/lib/types';
import { FrostySpider } from './FrostySpider';

interface CardProps {
  card: CardType;
  isSelected?: boolean;
  isHinted?: boolean;
  isImmersive?: boolean;
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
  isImmersive = false,
  onClick,
  onMouseDown,
  onTouchStart,
  stackOffset = 0,
  isDragging = false,
  style,
}: CardProps) {
  const symbol = suitSymbols[card.suit];
  const colorClass = suitColors[card.suit];

  // Immersive push effect styles
  const immersiveClasses = isImmersive && card.faceUp && onClick
    ? 'transition-all duration-150 ease-out hover:translate-y-[2px] active:translate-y-[4px]'
    : '';

  const immersiveShadow = isImmersive && card.faceUp && onClick
    ? {
        boxShadow: '0 4px 0 rgba(0,0,0,0.25), 0 6px 12px rgba(0,0,0,0.15)',
      }
    : {};

  if (!card.faceUp) {
    // Face down card - Custom Frosty Spider card back!
    return (
      <div
        className="absolute rounded-lg border-2 border-blue-400 shadow-md select-none overflow-hidden"
        style={{
          width: 'var(--card-width)',
          height: 'var(--card-height)',
          top: stackOffset,
          ...style,
        }}
      >
        <img
          src="/card_back.jpg"
          alt="Card back"
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div
      className={`
        absolute rounded-lg
        bg-white border-2
        ${isSelected ? 'border-yellow-400 ring-2 ring-yellow-400 z-10' : 'border-gray-300'}
        ${isHinted ? 'border-green-400 ring-2 ring-green-400 animate-pulse' : ''}
        ${isDragging ? 'shadow-xl scale-105 z-50' : isImmersive ? '' : 'shadow-md'}
        ${onClick && !isImmersive ? 'cursor-pointer active:scale-95' : ''}
        ${onClick && isImmersive ? 'cursor-pointer' : ''}
        ${immersiveClasses}
        ${!isImmersive ? 'transition-transform duration-100' : ''}
        select-none touch-none
      `}
      style={{
        width: 'var(--card-width)',
        height: 'var(--card-height)',
        top: stackOffset,
        ...immersiveShadow,
        ...style,
      }}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* Header strip - visible when stacked - BIG rank + suit */}
      <div className={`absolute top-0 left-0 right-0 flex items-center justify-center gap-0.5 bg-white border-b border-gray-300 rounded-t-md ${colorClass}`}
        style={{ height: 'calc(var(--card-width) * 0.28)' }}>
        <span className="font-black leading-none" style={{ fontSize: 'calc(var(--card-width) * 0.22)' }}>{card.rank}</span>
        <span className="leading-none" style={{ fontSize: 'calc(var(--card-width) * 0.18)' }}>{symbol}</span>
      </div>

      {/* Center - HUGE rank that fills the card */}
      <div className={`absolute inset-0 flex items-center justify-center ${colorClass} font-black`}
        style={{ fontSize: 'calc(var(--card-width) * 0.7)', paddingTop: 'calc(var(--card-width) * 0.1)' }}>
        {card.rank}
      </div>

      {/* Bottom - suit symbol */}
      <div className={`absolute bottom-0 left-0 right-0 flex justify-center ${colorClass}`}
        style={{ fontSize: 'calc(var(--card-width) * 0.25)' }}>
        {symbol}
      </div>
    </div>
  );
}

// Empty card slot component
export function EmptySlot({ onClick }: { onClick?: () => void }) {
  return (
    <div
      className={`
        rounded-lg
        border-2 border-dashed border-gray-400
        bg-gray-800/30
        ${onClick ? 'cursor-pointer hover:bg-gray-700/30' : ''}
      `}
      style={{
        width: 'var(--card-width)',
        height: 'var(--card-height)',
      }}
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
    <div className="relative" style={{ width: 'var(--card-width)', height: 'var(--card-height)' }}>
      {piles > 0 ? (
        <>
          {/* Stack effect with custom card back */}
          {Array.from({ length: Math.min(piles, 5) }).map((_, i) => (
            <div
              key={i}
              className={`
                absolute rounded-lg
                border-2 border-blue-400
                overflow-hidden
                ${disabled ? 'opacity-50' : 'cursor-pointer active:scale-95'}
              `}
              style={{
                width: 'var(--card-width)',
                height: 'var(--card-height)',
                top: -i * 2,
                left: i * 1,
                zIndex: 5 - i,
              }}
              onClick={disabled ? undefined : onClick}
            >
              <img
                src="/card_back.jpg"
                alt="Card back"
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
          ))}
          {/* Card count - compact */}
          <div className="absolute -bottom-3.5 left-0 right-0 text-center text-[0.5rem] text-gray-400">
            {remainingDeals}
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
    <div className="relative" style={{ width: 'var(--card-width)', height: 'var(--card-height)' }}>
      {count > 0 ? (
        <>
          {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-lg bg-gradient-to-br from-green-500 to-green-700 border-2 border-green-400 flex items-center justify-center"
              style={{
                width: 'var(--card-width)',
                height: 'var(--card-height)',
                top: -i * 2,
                left: i * 1,
                zIndex: 8 - i,
              }}
            >
              <span className="text-white text-base sm:text-2xl">
                {suit ? suitSymbols[suit] : '✓'}
              </span>
            </div>
          ))}
          <div className="absolute -bottom-3.5 left-0 right-0 text-center text-[0.5rem] text-gray-400">
            {count}/8
          </div>
        </>
      ) : (
        <EmptySlot />
      )}
    </div>
  );
}
