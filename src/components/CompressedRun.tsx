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
 * - First card (top of run, what you grab)
 * - A single stacked card representing all middle cards
 * - Last card (bottom of run, fully visible when at column end)
 *
 * For a run 9-8-7-6-5:
 * - cards[0] = 9 (top, shown with peek)
 * - cards[1-3] = 8,7,6 (middle, shown as single stacked card)
 * - cards[4] = 5 (bottom, shown fully if last in column)
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

  const isTopCardSelected = effectiveSelectedIndex !== -1 && startIndex >= effectiveSelectedIndex;
  const isBottomCardSelected = effectiveSelectedIndex !== -1 && (startIndex + cards.length - 1) >= effectiveSelectedIndex;

  // Middle section is selected if any middle card is at or after the selection
  // Middle cards are at indices startIndex+1 through startIndex+cards.length-2
  const lastMiddleIndex = startIndex + cards.length - 2;
  const isMiddleSelected = effectiveSelectedIndex !== -1 &&
    lastMiddleIndex >= effectiveSelectedIndex &&
    effectiveSelectedIndex <= lastMiddleIndex;

  // Middle cards are everything between first and last
  const hasMiddleCards = cards.length > 2;
  const middleCardCount = cards.length - 2; // Number of cards in the middle

  // Calculate peek height for the top card (responsive to card size)
  const topCardPeek = Math.max(16, cardWidth * 0.28); // Header height of card

  // Height for the stacked middle representation (includes space for run indicator)
  const middleStackHeight = hasMiddleCards ? Math.max(18, cardWidth * 0.22) : 0;

  // For runs of exactly 2 cards, just show both cards normally
  if (cards.length === 2) {
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
          isSelected={isTopCardSelected}
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
  // Top card peek + middle stack + bottom card (full if last, topCardPeek if not to show rank)
  const bottomCardHeight = isLastInColumn ? cardHeight : topCardPeek;
  const totalHeight = topCardPeek + middleStackHeight + bottomCardHeight;

  return (
    <div
      className="absolute"
      style={{
        ...containerPositionStyle,
        width: cardWidth,
        height: totalHeight,
      }}
    >
      {/* First/top card - shows with peek */}
      <Card
        card={topCard}
        stackOffset={0}
        isSelected={isTopCardSelected}
        isImmersive={isImmersive}
        cardWidth={cardWidth}
        cardHeight={cardHeight}
        onClick={() => onCardClick?.(startIndex)}
        onMouseDown={(e) => onMouseDown?.(e, startIndex)}
        onTouchStart={(e) => onTouchStart?.(e, startIndex)}
      />

      {/* Middle cards - represented as a single stacked element */}
      {hasMiddleCards && (
        <div
          className={`
            absolute left-0 right-0
            cursor-pointer select-none
            ${isMiddleSelected ? 'ring-1 ring-yellow-400' : ''}
          `}
          style={{
            top: topCardPeek,
            height: middleStackHeight,
            width: cardWidth,
            zIndex: 5, // Ensure middle section stacks above the top card
            overflow: 'visible', // Ensure indicator text isn't clipped
          }}
          onClick={(e) => {
            e.stopPropagation();
            // Calculate which middle card was clicked based on click position
            const rect = e.currentTarget.getBoundingClientRect();
            const clickY = e.clientY - rect.top;
            const clickRatio = clickY / rect.height;
            // Middle cards are at indices startIndex+1 through startIndex+cards.length-2
            const middleIndex = Math.min(
              Math.floor(clickRatio * middleCardCount),
              middleCardCount - 1
            );
            onCardClick?.(startIndex + 1 + middleIndex);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            // Calculate which middle card to drag based on click position
            const rect = e.currentTarget.getBoundingClientRect();
            const clickY = e.clientY - rect.top;
            const clickRatio = clickY / rect.height;
            const middleIndex = Math.min(
              Math.floor(clickRatio * middleCardCount),
              middleCardCount - 1
            );
            onMouseDown?.(e, startIndex + 1 + middleIndex);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            // Calculate which middle card to touch based on touch position
            const rect = e.currentTarget.getBoundingClientRect();
            const touch = e.touches[0];
            const touchY = touch.clientY - rect.top;
            const touchRatio = touchY / rect.height;
            const middleIndex = Math.min(
              Math.floor(touchRatio * middleCardCount),
              middleCardCount - 1
            );
            onTouchStart?.(e, startIndex + 1 + middleIndex);
          }}
        >
          {/* Stacked cards visual - multiple offset layers to show depth */}
          {Array.from({ length: Math.min(middleCardCount, 3) }).map((_, i) => (
            <div
              key={i}
              className="absolute bg-white border-l-2 border-r-2 border-gray-300"
              style={{
                left: 0,
                right: 0,
                top: i * 2,
                height: middleStackHeight - (i * 2),
                zIndex: 3 - i,
                borderColor: isMiddleSelected ? 'rgb(250, 204, 21)' : 'rgb(209, 213, 219)',
              }}
            />
          ))}
          {/* Run indicator showing the range (e.g., "8-4") */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 10 }}
          >
            <span
              className="text-gray-600 font-semibold leading-none bg-white/80 px-1 rounded"
              style={{
                fontSize: Math.max(10, cardWidth * 0.14),
              }}
            >
              {topCard.rank}-{bottomCard.rank}
            </span>
          </div>
        </div>
      )}

      {/* Bottom card - shown fully if last in column, or with peek */}
      <Card
        card={bottomCard}
        stackOffset={topCardPeek + middleStackHeight}
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
