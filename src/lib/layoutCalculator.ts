/**
 * Intelligent Layout Calculator for FrostySpider
 *
 * Single source of truth for all layout calculations.
 * Uses actual container measurements instead of guessing.
 */

import { Card } from './types';

// Layout configuration
export interface LayoutConfig {
  containerWidth: number;
  containerHeight: number;
  safeAreaInsets?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

// Layout result
export interface LayoutResult {
  cardWidth: number;
  cardHeight: number;
  columnWidth: number;
  gapSize: number;
  isLandscape: boolean;
  rowConfig: number[][];
  rowHeights: number[];  // Max height for each row
}

// Stack offset result
export interface StackOffsets {
  faceDownOffset: number;
  faceUpOffset: number;
  needsScroll: boolean;
}

// Constants
const CARD_ASPECT_RATIO = 1.38;
const MIN_CARD_WIDTH = 50;
const MAX_CARD_WIDTH = 90;
const GAP_SIZE = 4;

// Minimum peek values to maintain touch targets and visibility
const MIN_FACEDOWN_PEEK = 4;   // Just enough to see card edge
const MIN_FACEUP_PEEK = 12;    // Enough to see header strip for identification

// Ideal peek values for comfortable viewing
const IDEAL_FACEDOWN_PEEK = 8;
const IDEAL_FACEUP_PEEK = 22;

// Row configurations
const PORTRAIT_ROW_CONFIG = [
  [0, 1, 2],       // Row 1: 3 columns
  [3, 4, 5],       // Row 2: 3 columns
  [6, 7, 8, 9],    // Row 3: 4 columns
];

const LANDSCAPE_ROW_CONFIG = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],  // All 10 columns
];

/**
 * Calculate the complete layout based on container dimensions
 */
export function calculateLayout(config: LayoutConfig): LayoutResult {
  const { containerWidth, containerHeight, safeAreaInsets } = config;

  // Apply safe area insets
  const safeWidth = containerWidth - (safeAreaInsets?.left || 0) - (safeAreaInsets?.right || 0);
  const safeHeight = containerHeight - (safeAreaInsets?.top || 0) - (safeAreaInsets?.bottom || 0);

  // Determine orientation
  // Landscape: width > height AND wide enough for 10 columns comfortably
  const isLandscape = containerWidth > containerHeight && containerWidth > 600;

  const rowConfig = isLandscape ? LANDSCAPE_ROW_CONFIG : PORTRAIT_ROW_CONFIG;

  let cardWidth: number;
  let rowHeights: number[];

  if (isLandscape) {
    // Landscape: fit 10 columns across
    // (cardWidth + gap) * 10 + gap = safeWidth
    // cardWidth = (safeWidth - gap * 11) / 10
    const availableWidth = safeWidth - (GAP_SIZE * 11);
    cardWidth = Math.min(MAX_CARD_WIDTH, Math.max(MIN_CARD_WIDTH, availableWidth / 10));

    // Single row gets full height
    rowHeights = [safeHeight - GAP_SIZE * 2];
  } else {
    // Portrait: max 4 columns per row (bottom row has 4)
    // (cardWidth + gap) * 4 + gap = safeWidth
    const availableWidth = safeWidth - (GAP_SIZE * 5);
    cardWidth = Math.min(MAX_CARD_WIDTH, Math.max(MIN_CARD_WIDTH, availableWidth / 4));

    // 3 rows with gaps between them
    // Give slightly more space to bottom row (4 columns vs 3)
    // Row 1: 3 cols, Row 2: 3 cols, Row 3: 4 cols
    // Weight distribution: 28%, 28%, 44% to give more room to the denser bottom row
    const totalGaps = GAP_SIZE * 4; // top, between rows (x2), bottom
    const availableForRows = safeHeight - totalGaps;

    rowHeights = [
      availableForRows * 0.28,
      availableForRows * 0.28,
      availableForRows * 0.44,
    ];
  }

  const cardHeight = cardWidth * CARD_ASPECT_RATIO;
  const columnWidth = cardWidth + GAP_SIZE;

  return {
    cardWidth,
    cardHeight,
    columnWidth,
    gapSize: GAP_SIZE,
    isLandscape,
    rowConfig,
    rowHeights,
  };
}

/**
 * Calculate smart stack offsets that compress to fit available height
 * Always ensures cards fit - no scrolling needed
 */
export function calculateSmartOverlap(
  cards: Card[],
  cardHeight: number,
  maxStackHeight: number
): StackOffsets {
  const cardCount = cards.length;

  if (cardCount <= 1) {
    return {
      faceDownOffset: IDEAL_FACEDOWN_PEEK,
      faceUpOffset: IDEAL_FACEUP_PEEK,
      needsScroll: false,
    };
  }

  // Count face-down and face-up cards (excluding last card which shows full)
  let faceDownCount = 0;
  let faceUpCount = 0;
  for (let i = 0; i < cardCount - 1; i++) {
    if (cards[i].faceUp) {
      faceUpCount++;
    } else {
      faceDownCount++;
    }
  }

  const availableSpace = maxStackHeight - cardHeight;
  const totalCardsToOffset = faceDownCount + faceUpCount;

  // If no space for stacking or no cards to offset, use absolute minimums
  if (availableSpace <= 0 || totalCardsToOffset === 0) {
    // Scale down proportionally to fit - ensure all cards always visible
    const absoluteMinPeek = Math.max(2, availableSpace / Math.max(totalCardsToOffset, 1));
    return {
      faceDownOffset: absoluteMinPeek,
      faceUpOffset: absoluteMinPeek,
      needsScroll: false,
    };
  }

  // Calculate ideal total space needed
  const idealTotal = (faceDownCount * IDEAL_FACEDOWN_PEEK) + (faceUpCount * IDEAL_FACEUP_PEEK);

  // If ideal fits, use ideal offsets
  if (idealTotal <= availableSpace) {
    return {
      faceDownOffset: IDEAL_FACEDOWN_PEEK,
      faceUpOffset: IDEAL_FACEUP_PEEK,
      needsScroll: false,
    };
  }

  // Calculate minimum total space needed
  const minTotal = (faceDownCount * MIN_FACEDOWN_PEEK) + (faceUpCount * MIN_FACEUP_PEEK);

  // If even minimums don't fit, scale down proportionally to ensure all cards fit
  if (minTotal >= availableSpace) {
    // Calculate scale factor to make everything fit
    const scale = availableSpace / minTotal;
    return {
      faceDownOffset: Math.max(2, MIN_FACEDOWN_PEEK * scale),
      faceUpOffset: Math.max(3, MIN_FACEUP_PEEK * scale),
      needsScroll: false,
    };
  }

  // Interpolate between minimum and ideal based on available space
  // t = 0 means we're at minimum, t = 1 means we're at ideal
  const t = (availableSpace - minTotal) / (idealTotal - minTotal);

  return {
    faceDownOffset: MIN_FACEDOWN_PEEK + t * (IDEAL_FACEDOWN_PEEK - MIN_FACEDOWN_PEEK),
    faceUpOffset: MIN_FACEUP_PEEK + t * (IDEAL_FACEUP_PEEK - MIN_FACEUP_PEEK),
    needsScroll: false,
  };
}

/**
 * Calculate the actual stack height with given offsets
 */
export function calculateStackHeight(
  cards: Card[],
  cardHeight: number,
  offsets: StackOffsets
): number {
  if (cards.length === 0) return 0;
  if (cards.length === 1) return cardHeight;

  let height = cardHeight;
  for (let i = 0; i < cards.length - 1; i++) {
    height += cards[i].faceUp ? offsets.faceUpOffset : offsets.faceDownOffset;
  }
  return height;
}

/**
 * Calculate offsets for an expanded stack (no compression, but capped)
 */
export function calculateExpandedOffsets(
  cards: Card[],
  cardHeight: number,
  maxHeight: number
): StackOffsets {
  // Use ideal offsets first
  const idealOffsets: StackOffsets = {
    faceDownOffset: IDEAL_FACEDOWN_PEEK,
    faceUpOffset: IDEAL_FACEUP_PEEK,
    needsScroll: false,
  };

  const idealHeight = calculateStackHeight(cards, cardHeight, idealOffsets);

  // If ideal fits in max height, use ideal
  if (idealHeight <= maxHeight) {
    return idealOffsets;
  }

  // Otherwise, compress to fit maxHeight
  return calculateSmartOverlap(cards, cardHeight, maxHeight);
}

/**
 * Get row index for a column
 */
export function getRowForColumn(columnIndex: number, isLandscape: boolean): number {
  if (isLandscape) return 0;
  if (columnIndex < 3) return 0;
  if (columnIndex < 6) return 1;
  return 2;
}

/**
 * Get column position offset from card index
 */
export function getCardStackOffset(
  cards: Card[],
  cardIndex: number,
  offsets: StackOffsets
): number {
  let offset = 0;
  for (let i = 0; i < cardIndex; i++) {
    offset += cards[i].faceUp ? offsets.faceUpOffset : offsets.faceDownOffset;
  }
  return offset;
}
