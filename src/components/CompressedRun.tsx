'use client';

import React from 'react';
import { Card as CardType } from '@/lib/types';
import { Card } from './Card';

interface CompressedRunProps {
  cards: CardType[];
  startIndex: number; // Index in the original column (where the top card is)
  stackOffset: number; // Y position offset
  isSelected?: boolean;
  isImmersive?: boolean;
  cardWidth: number;
  cardHeight: number;
  isLastInColumn: boolean;
  onCardClick?: (cardIndex: number) => void;
  onMouseDown?: (e: React.MouseEvent, cardIndex: number) => void;
  onTouchStart?: (e: React.TouchEvent, cardIndex: number) => void;
  faceUpPeek?: number; // Peek height for face-up cards
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
  isImmersive = false,
  cardWidth,
  cardHeight,
  isLastInColumn,
  onCardClick,
  onMouseDown,
  onTouchStart,
  faceUpPeek = 22,
}: CompressedRunProps) {
  if (cards.length === 0) return null;

  const topCard = cards[0]; // First card (highest rank, what you'd grab to move)
  const bottomCard = cards[cards.length - 1]; // Last card (lowest rank)

  // Middle cards are everything between first and last
  const hasMiddleCards = cards.length > 2;
  const middleCardCount = cards.length - 2; // Number of cards in the middle

  // Calculate peek height for the top card (responsive to card size)
  const topCardPeek = Math.max(16, cardWidth * 0.28); // Header height of card

  // Height for the stacked middle representation (slim, just shows there's a group)
  const middleStackHeight = hasMiddleCards ? Math.max(10, cardWidth * 0.15) : 0;

  // For runs of exactly 2 cards, just show both cards normally
  if (cards.length === 2) {
    const totalHeight = isLastInColumn ? topCardPeek + cardHeight : topCardPeek + faceUpPeek;

    return (
      <div
        className="absolute"
        style={{
          top: stackOffset,
          width: cardWidth,
          height: totalHeight,
        }}
      >
        {/* First card */}
        <Card
          card={topCard}
          stackOffset={0}
          isSelected={isSelected}
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
          isSelected={isSelected}
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
  // Top card peek + middle stack + bottom card (full if last, peek if not)
  const bottomCardHeight = isLastInColumn ? cardHeight : faceUpPeek;
  const totalHeight = topCardPeek + middleStackHeight + bottomCardHeight;

  return (
    <div
      className="absolute"
      style={{
        top: stackOffset,
        width: cardWidth,
        height: totalHeight,
      }}
    >
      {/* First/top card - shows with peek */}
      <Card
        card={topCard}
        stackOffset={0}
        isSelected={isSelected}
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
            ${isSelected ? 'ring-1 ring-yellow-400' : ''}
          `}
          style={{
            top: topCardPeek,
            height: middleStackHeight,
            width: cardWidth,
          }}
          onClick={(e) => {
            e.stopPropagation();
            // Select from the first middle card (startIndex + 1)
            onCardClick?.(startIndex + 1);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            onMouseDown?.(e, startIndex + 1);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            onTouchStart?.(e, startIndex + 1);
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
                borderColor: isSelected ? 'rgb(250, 204, 21)' : 'rgb(209, 213, 219)',
              }}
            />
          ))}
          {/* Run indicator showing the range (e.g., "9-3") */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 10 }}
          >
            <span
              className="text-gray-500 font-medium leading-none"
              style={{
                fontSize: Math.max(8, cardWidth * 0.12),
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
        isSelected={isSelected}
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
