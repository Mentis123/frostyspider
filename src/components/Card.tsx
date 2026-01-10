'use client';

import React from 'react';
import { Card as CardType, Suit } from '@/lib/types';

interface CardProps {
  card: CardType;
  isSelected?: boolean;
  isHinted?: boolean;
  isImmersive?: boolean;
  onClick?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  stackOffset?: number;
  useBottomPosition?: boolean; // When true, use bottom instead of top for positioning
  isDragging?: boolean;
  style?: React.CSSProperties;
  cardWidth?: number;
  cardHeight?: number;
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
  useBottomPosition = false,
  isDragging = false,
  style,
  cardWidth = 60,
  cardHeight = 83,
}: CardProps) {
  // Positioning style: use bottom for landscape (bottom-up stacking) or top for portrait
  const positionStyle = useBottomPosition
    ? { bottom: stackOffset }
    : { top: stackOffset };
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
          width: cardWidth,
          height: cardHeight,
          ...positionStyle,
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

  // Calculate responsive font sizes based on card width
  const headerHeight = cardWidth * 0.28;
  const headerRankSize = cardWidth * 0.22;
  const headerSuitSize = cardWidth * 0.18;
  const centerRankSize = cardWidth * 0.7;
  const bottomSuitSize = cardWidth * 0.25;

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
        width: cardWidth,
        height: cardHeight,
        ...positionStyle,
        ...immersiveShadow,
        ...style,
      }}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* Header strip - visible when stacked - BIG rank + suit */}
      <div
        className={`absolute top-0 left-0 right-0 flex items-center justify-center gap-0.5 bg-white border-b border-gray-300 rounded-t-md ${colorClass}`}
        style={{ height: headerHeight }}
      >
        <span className="font-black leading-none" style={{ fontSize: headerRankSize }}>{card.rank}</span>
        <span className="leading-none" style={{ fontSize: headerSuitSize }}>{symbol}</span>
      </div>

      {/* Center - HUGE rank that fills the card */}
      <div
        className={`absolute inset-0 flex items-center justify-center ${colorClass} font-black`}
        style={{ fontSize: centerRankSize, paddingTop: cardWidth * 0.1 }}
      >
        {card.rank}
      </div>

      {/* Bottom - suit symbol */}
      <div
        className={`absolute bottom-0 left-0 right-0 flex justify-center ${colorClass}`}
        style={{ fontSize: bottomSuitSize }}
      >
        {symbol}
      </div>
    </div>
  );
}

// Empty card slot component
export function EmptySlot({
  onClick,
  cardWidth = 60,
  cardHeight = 83,
}: {
  onClick?: () => void;
  cardWidth?: number;
  cardHeight?: number;
}) {
  return (
    <div
      className={`
        rounded-lg
        border-2 border-dashed border-gray-400
        bg-gray-800/30
        ${onClick ? 'cursor-pointer hover:bg-gray-700/30' : ''}
      `}
      style={{
        width: cardWidth,
        height: cardHeight,
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
  cardWidth = 60,
  cardHeight = 83,
}: {
  remainingDeals: number;
  onClick: () => void;
  disabled: boolean;
  cardWidth?: number;
  cardHeight?: number;
}) {
  const piles = Math.ceil(remainingDeals / 10);

  return (
    <div className="relative" style={{ width: cardWidth, height: cardHeight }}>
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
                width: cardWidth,
                height: cardHeight,
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
        <EmptySlot cardWidth={cardWidth} cardHeight={cardHeight} />
      )}
    </div>
  );
}

// Completed sequence pile
export function CompletedPile({
  count,
  suit,
  cardWidth = 60,
  cardHeight = 83,
}: {
  count: number;
  suit?: Suit;
  cardWidth?: number;
  cardHeight?: number;
}) {
  return (
    <div className="relative" style={{ width: cardWidth, height: cardHeight }}>
      {count > 0 ? (
        <>
          {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-lg bg-gradient-to-br from-green-500 to-green-700 border-2 border-green-400 flex items-center justify-center"
              style={{
                width: cardWidth,
                height: cardHeight,
                top: -i * 2,
                left: i * 1,
                zIndex: 8 - i,
              }}
            >
              <span className="text-white" style={{ fontSize: cardWidth * 0.4 }}>
                {suit ? suitSymbols[suit] : '✓'}
              </span>
            </div>
          ))}
          <div className="absolute -bottom-3.5 left-0 right-0 text-center text-[0.5rem] text-gray-400">
            {count}/8
          </div>
        </>
      ) : (
        <EmptySlot cardWidth={cardWidth} cardHeight={cardHeight} />
      )}
    </div>
  );
}
