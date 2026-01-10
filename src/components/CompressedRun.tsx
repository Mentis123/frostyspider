'use client';

import React from 'react';
import { Card as CardType, Suit } from '@/lib/types';
import { getRunIndicatorHeight } from '@/lib/layoutCalculator';
import { Card } from './Card';

const suitSymbols: Record<Suit, string> = {
  spades: '\u2660',
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
};

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
  onExpandClick?: () => void;
}

/**
 * CompressedRun renders a sequence of 3+ cards in a compressed format:
 * - Shows the TOP card's rank prominently (the one you'd grab to move onto a higher card)
 * - Shows a run indicator with the range (e.g., "8 > 5" meaning 8 down to 5)
 * - When it's the last segment, shows the bottom card (lowest rank) fully visible
 *
 * For a run 8-7-6-5:
 * - cards[0] = 8 (top, highest rank, what you grab)
 * - cards[3] = 5 (bottom, lowest rank, normally visible at column bottom)
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
  onExpandClick,
}: CompressedRunProps) {
  if (cards.length === 0) return null;

  const topCard = cards[0]; // Top of run (highest rank, what you'd grab to move)
  const bottomCard = cards[cards.length - 1]; // Bottom of run (lowest rank)
  const runLength = cards.length;

  // Run indicator dimensions - use consistent calculation with layout
  const indicatorHeight = getRunIndicatorHeight(cardWidth);
  const indicatorFontSize = Math.max(10, cardWidth * 0.17);

  // Calculate total height for this component
  // If last in column: indicator + full card
  // If mid-column: just indicator height (next segment continues below)
  const totalHeight = isLastInColumn ? indicatorHeight + cardHeight : indicatorHeight;

  return (
    <div
      className="absolute"
      style={{
        top: stackOffset,
        width: cardWidth,
        height: totalHeight,
      }}
    >
      {/* Run indicator bar - shows the range of the compressed run */}
      <div
        className={`
          absolute left-0 right-0 flex items-center justify-center gap-0.5
          cursor-pointer select-none
          ${isSelected ? 'ring-2 ring-yellow-400' : ''}
        `}
        style={{
          top: 0,
          height: indicatorHeight,
          background: isSelected
            ? 'linear-gradient(to bottom, rgba(234, 179, 8, 0.95), rgba(202, 138, 4, 0.95))'
            : 'linear-gradient(to bottom, rgba(59, 130, 246, 0.95), rgba(37, 99, 235, 0.95))',
          borderRadius: 6,
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => {
          e.stopPropagation();
          // Clicking the run indicator selects from the TOP card (startIndex)
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
        {/* Top card rank (prominent - this is what you need to know!) */}
        <span
          className="font-black leading-none text-white"
          style={{ fontSize: indicatorFontSize * 1.1 }}
        >
          {topCard.rank}
        </span>
        <span
          className="text-white/80 leading-none"
          style={{ fontSize: indicatorFontSize * 0.85 }}
        >
          {suitSymbols[topCard.suit]}
        </span>

        {/* Arrow and count */}
        <span
          className="text-white/80 leading-none mx-0.5 font-medium"
          style={{ fontSize: indicatorFontSize * 0.75 }}
        >
          {'\u25BC'}{runLength}
        </span>

        {/* Bottom card rank */}
        <span
          className="font-bold leading-none text-white/90"
          style={{ fontSize: indicatorFontSize }}
        >
          {bottomCard.rank}
        </span>
        <span
          className="text-white/60 leading-none"
          style={{ fontSize: indicatorFontSize * 0.75 }}
        >
          {suitSymbols[bottomCard.suit]}
        </span>
      </div>

      {/* If this is the last segment in column, show the bottom card fully */}
      {isLastInColumn && (
        <div style={{ position: 'absolute', top: indicatorHeight }}>
          <Card
            card={bottomCard}
            stackOffset={0}
            isSelected={isSelected}
            isImmersive={isImmersive}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            onClick={() => {
              // Clicking the bottom card also selects from the top of the run
              // since that's how Spider works - you drag the whole valid sequence
              onCardClick?.(startIndex);
            }}
            onMouseDown={(e) => onMouseDown?.(e, startIndex)}
            onTouchStart={(e) => onTouchStart?.(e, startIndex)}
          />
        </div>
      )}
    </div>
  );
}
