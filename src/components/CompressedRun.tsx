'use client';

import React from 'react';
import { Card as CardType } from '@/lib/types';
import { Card } from './Card';

interface CompressedRunProps {
  cards: CardType[];
  startIndex: number; // Index in the original column (where the top card is)
  stackOffset: number; // Y position offset
  isSelected?: boolean;
  selectedCardIndex?: number; // The actual card index that was selected (for partial highlighting)
  isImmersive?: boolean;
  cardWidth: number;
  cardHeight: number;
  isLastInColumn: boolean;
  onCardClick?: (cardIndex: number) => void;
  onMouseDown?: (e: React.MouseEvent, cardIndex: number) => void;
  onTouchStart?: (e: React.TouchEvent, cardIndex: number) => void;
  faceUpPeek?: number; // Peek height for face-up cards
  useBottomPosition?: boolean; // When true, use bottom instead of top for positioning
}

/**
 * CompressedRun renders a sequence of 3+ cards showing:
 * - A compact indicator bar at top showing the run range (e.g., "K-J")
 * - The bottom card fully visible (when at column end)
 *
 * For a run K-Q-J:
 * - Shows indicator bar "K-J" at top
 * - Shows J card (bottom) fully visible if last in column
 */
export function CompressedRun({
  cards,
  startIndex,
  stackOffset,
  isSelected = false,
  selectedCardIndex,
  isImmersive = false,
  cardWidth,
  cardHeight,
  isLastInColumn,
  onCardClick,
  onMouseDown,
  onTouchStart,
  faceUpPeek = 22,
  useBottomPosition = false,
}: CompressedRunProps) {
  // Positioning style for the container
  const containerPositionStyle = useBottomPosition
    ? { bottom: stackOffset }
    : { top: stackOffset };
  if (cards.length === 0) return null;

  const topCard = cards[0]; // First card (highest rank, what you'd grab to move)
  const bottomCard = cards[cards.length - 1]; // Last card (lowest rank)

  // Calculate which parts should be highlighted based on selectedCardIndex
  // A card is selected if its index is >= the selectedCardIndex
  const effectiveSelectedIndex = isSelected && selectedCardIndex !== undefined
    ? selectedCardIndex
    : isSelected
    ? startIndex // Fallback: if isSelected but no index, highlight from start
    : -1; // No selection

  const isRunSelected = effectiveSelectedIndex !== -1 && startIndex >= effectiveSelectedIndex;
  const isBottomCardSelected = effectiveSelectedIndex !== -1 && (startIndex + cards.length - 1) >= effectiveSelectedIndex;

  // Height for the indicator bar (compact)
  const indicatorHeight = Math.max(18, cardWidth * 0.22);

  // For runs of exactly 2 cards, just show both cards normally
  if (cards.length === 2) {
    const topCardPeek = Math.max(16, cardWidth * 0.28);
    const totalHeight = isLastInColumn ? topCardPeek + cardHeight : topCardPeek + faceUpPeek;

    return (
      <div
        className="absolute"
        style={{
          ...containerPositionStyle,
          width: cardWidth,
          height: totalHeight,
        }}
      >
        {/* First card */}
        <Card
          card={topCard}
          stackOffset={0}
          isSelected={isRunSelected}
          isImmersive={isImmersive}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
          onClick={() => onCardClick?.(startIndex)}
          onMouseDown={(e) => onMouseDown?.(e, startIndex)}
          onTouchStart={(e) => onTouchStart?.(e, startIndex)}
        />
        {/* Second/bottom card */}
        <Card
          card={bottomCard}
          stackOffset={topCardPeek}
          isSelected={isBottomCardSelected}
          isImmersive={isImmersive}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
          onClick={() => onCardClick?.(startIndex + 1)}
          onMouseDown={(e) => onMouseDown?.(e, startIndex + 1)}
          onTouchStart={(e) => onTouchStart?.(e, startIndex + 1)}
        />
      </div>
    );
  }

  // Calculate total height for runs of 3+ cards
  // Indicator bar at top + bottom card (full height if last in column)
  const totalHeight = indicatorHeight + (isLastInColumn ? cardHeight : faceUpPeek);

  return (
    <div
      className="absolute"
      style={{
        ...containerPositionStyle,
        width: cardWidth,
        height: totalHeight,
      }}
    >
      {/* Compact indicator bar showing the run range */}
      <div
        className={`
          absolute left-0 right-0 top-0
          cursor-pointer select-none
          bg-white rounded-t-lg border-2 border-b-0
          ${isRunSelected ? 'border-yellow-400 ring-1 ring-yellow-400' : 'border-gray-300'}
        `}
        style={{
          height: indicatorHeight,
          width: cardWidth,
          zIndex: 5,
        }}
        onClick={(e) => {
          e.stopPropagation();
          // Clicking the indicator selects from the top card
          onCardClick?.(startIndex);
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onMouseDown?.(e, startIndex);
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          onTouchStart?.(e, startIndex);
        }}
      >
        {/* Stacked visual effect - subtle lines to indicate multiple cards */}
        <div className="absolute inset-0 overflow-hidden rounded-t-lg">
          {Array.from({ length: Math.min(cards.length - 1, 4) }).map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 bg-gray-200"
              style={{
                top: i * 3,
                height: 1,
                opacity: 0.5 - (i * 0.1),
              }}
            />
          ))}
        </div>
        {/* Run indicator showing the range (e.g., "K-J") */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 10 }}
        >
          <span
            className="text-gray-700 font-bold leading-none"
            style={{
              fontSize: Math.max(11, cardWidth * 0.16),
            }}
          >
            {topCard.rank}-{bottomCard.rank}
          </span>
        </div>
      </div>

      {/* Bottom card - shown fully if last in column */}
      <Card
        card={bottomCard}
        stackOffset={indicatorHeight}
        isSelected={isBottomCardSelected}
        isImmersive={isImmersive}
        cardWidth={cardWidth}
        cardHeight={cardHeight}
        onClick={() => onCardClick?.(startIndex + cards.length - 1)}
        onMouseDown={(e) => onMouseDown?.(e, startIndex + cards.length - 1)}
        onTouchStart={(e) => onTouchStart?.(e, startIndex + cards.length - 1)}
      />
    </div>
  );
}
