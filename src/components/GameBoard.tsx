'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Card, EmptySlot, StockPile, CompletedPile } from './Card';
import { useGame } from '@/contexts/GameContext';
import { getValidSequence, canMoveToColumn } from '@/lib/gameEngine';
import { Card as CardType } from '@/lib/types';
import { gameFeedback } from '@/lib/feedback';

// Hook to calculate responsive card dimensions - supports portrait (3-3-4) and landscape (10 across)
function useCardDimensions() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 375,
    height: typeof window !== 'undefined' ? window.innerHeight : 667,
  });

  useEffect(() => {
    const handleResize = () => setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return useMemo(() => {
    // Detect landscape mode (width > height and wide enough for 10 columns)
    const isLandscape = windowSize.width > windowSize.height && windowSize.width > 500;

    let cardWidth: number;
    let availableHeight: number;

    if (isLandscape) {
      // Landscape: fit all 10 columns across with small gaps
      // Width: (cardWidth * 10) + (gaps * 11) = windowWidth - padding
      // cardWidth = (windowWidth - padding - gaps) / 10
      cardWidth = Math.min(80, (windowSize.width - 60) / 10);
      // Available height: full height minus top bar and control bar
      availableHeight = windowSize.height - 120;
    } else {
      // Portrait: 3-3-4 layout - max 4 columns per row
      cardWidth = Math.min(72, (windowSize.width - 24) / 4);
      // Available height for each row (3 rows)
      availableHeight = (windowSize.height - 170) / 3;
    }

    const cardHeight = cardWidth * 1.38;
    const columnWidth = cardWidth + 4;
    // Card stacking offsets - show enough to see card type in corners
    // Face-down cards: minimal peek since they're hidden anyway
    const baseStackOffsetFacedown = Math.max(8, cardWidth * 0.12);
    // Face-up cards: larger peek to see the header strip with rank/suit
    const baseStackOffsetFaceup = Math.max(20, cardWidth * 0.28);

    return {
      cardWidth,
      cardHeight,
      columnWidth,
      baseStackOffsetFacedown,
      baseStackOffsetFaceup,
      availableHeight,
      isLandscape,
    };
  }, [windowSize.width, windowSize.height]);
}

// Calculate dynamic stack offsets for a column to fit within available height
function calculateDynamicStackOffsets(
  column: CardType[],
  cardHeight: number,
  baseOffsetFacedown: number,
  baseOffsetFaceup: number,
  availableHeight: number
): { facedownOffset: number; faceupOffset: number } {
  if (column.length <= 1) {
    return { facedownOffset: baseOffsetFacedown, faceupOffset: baseOffsetFaceup };
  }

  // Count face-down and face-up cards (excluding the last card which shows full height)
  let facedownCount = 0;
  let faceupCount = 0;
  for (let i = 0; i < column.length - 1; i++) {
    if (column[i].faceUp) {
      faceupCount++;
    } else {
      facedownCount++;
    }
  }

  // Calculate needed height with base offsets
  const neededHeight = cardHeight + (facedownCount * baseOffsetFacedown) + (faceupCount * baseOffsetFaceup);

  // If it fits, use base offsets
  if (neededHeight <= availableHeight) {
    return { facedownOffset: baseOffsetFacedown, faceupOffset: baseOffsetFaceup };
  }

  // Need to compress - calculate scale factor
  const stackSpace = availableHeight - cardHeight;
  if (stackSpace <= 0) {
    // Extreme case - just use minimum offsets
    return { facedownOffset: 4, faceupOffset: 8 };
  }

  // Distribute available space proportionally
  const totalBaseOffset = (facedownCount * baseOffsetFacedown) + (faceupCount * baseOffsetFaceup);
  const scale = stackSpace / totalBaseOffset;

  // Apply scale but enforce minimums (4px for facedown, 8px for faceup to show header)
  const facedownOffset = Math.max(4, baseOffsetFacedown * scale);
  const faceupOffset = Math.max(8, baseOffsetFaceup * scale);

  return { facedownOffset, faceupOffset };
}

// Row configuration: 3-3-4 layout for portrait, single row for landscape
const PORTRAIT_ROW_CONFIG = [
  [0, 1, 2],       // Row 1: columns 0-2
  [3, 4, 5],       // Row 2: columns 3-5
  [6, 7, 8, 9],    // Row 3: columns 6-9
];

const LANDSCAPE_ROW_CONFIG = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],  // All 10 columns in one row
];

interface DragState {
  fromCol: number;
  cardIndex: number;
  cards: CardType[];
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface Selection {
  column: number;
  cardIndex: number;
}

export function GameBoard() {
  const { gameState, moveCards, deal } = useGame();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { cardWidth, cardHeight, columnWidth, baseStackOffsetFacedown, baseStackOffsetFaceup, availableHeight, isLandscape } = useCardDimensions();

  // Select row config based on orientation
  const rowConfig = isLandscape ? LANDSCAPE_ROW_CONFIG : PORTRAIT_ROW_CONFIG;

  // Calculate column positions for drop detection
  const getColumnAtPosition = useCallback((x: number, y: number): number | null => {
    for (let i = 0; i < 10; i++) {
      const ref = columnRefs.current[i];
      if (ref) {
        const rect = ref.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top - 50 && y <= rect.bottom + 100) {
          return i;
        }
      }
    }
    return null;
  }, []);

  // Feedback helper
  const feedbackOptions = useMemo(() => ({
    soundEnabled: gameState.settings.soundEnabled,
    hapticEnabled: gameState.settings.hapticEnabled,
    immersiveEnabled: gameState.settings.immersiveEnabled,
  }), [gameState.settings.soundEnabled, gameState.settings.hapticEnabled, gameState.settings.immersiveEnabled]);

  const isImmersive = gameState.settings.immersiveEnabled;

  // Handle card tap (for tap-to-select-tap-to-move)
  const handleCardTap = useCallback(
    (column: number, cardIndex: number) => {
      const card = gameState.tableau[column][cardIndex];
      if (!card.faceUp) return;

      // Check if this card can be moved (is part of a valid sequence)
      const sequence = getValidSequence(gameState.tableau[column], cardIndex);
      if (!sequence) return;

      if (selection) {
        // If we have a selection, try to move to this column
        if (selection.column === column && selection.cardIndex === cardIndex) {
          // Tapped same card - deselect
          setSelection(null);
          gameFeedback('select', feedbackOptions);
        } else if (selection.column !== column) {
          // Try to move selected cards here
          const canMove = canMoveToColumn(
            getValidSequence(gameState.tableau[selection.column], selection.cardIndex) || [],
            gameState.tableau[column]
          );
          if (canMove) {
            moveCards(selection.column, selection.cardIndex, column);
            gameFeedback('move', feedbackOptions);
          } else {
            gameFeedback('invalid', feedbackOptions);
          }
          setSelection(null);
        } else {
          // Selected different card in same column - change selection
          setSelection({ column, cardIndex });
          gameFeedback('select', feedbackOptions);
        }
      } else {
        // No selection - select this card
        setSelection({ column, cardIndex });
        gameFeedback('select', feedbackOptions);
      }
    },
    [selection, gameState.tableau, gameState.settings, moveCards, feedbackOptions]
  );

  // Handle empty column tap
  const handleEmptyColumnTap = useCallback(
    (column: number) => {
      if (selection) {
        moveCards(selection.column, selection.cardIndex, column);
        gameFeedback('move', feedbackOptions);
        setSelection(null);
      }
    },
    [selection, moveCards, feedbackOptions]
  );

  // Touch/drag handling
  const handleDragStart = useCallback(
    (column: number, cardIndex: number, clientX: number, clientY: number) => {
      const card = gameState.tableau[column][cardIndex];
      if (!card.faceUp) return;

      const sequence = getValidSequence(gameState.tableau[column], cardIndex);
      if (!sequence) return;

      setDragState({
        fromCol: column,
        cardIndex,
        cards: sequence,
        startX: clientX,
        startY: clientY,
        currentX: clientX,
        currentY: clientY,
      });
      setSelection(null);
    },
    [gameState.tableau]
  );

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    setDragState(prev =>
      prev ? { ...prev, currentX: clientX, currentY: clientY } : null
    );
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!dragState) return;

    const targetCol = getColumnAtPosition(dragState.currentX, dragState.currentY);
    if (targetCol !== null && targetCol !== dragState.fromCol) {
      const canMove = canMoveToColumn(dragState.cards, gameState.tableau[targetCol]);
      if (canMove) {
        moveCards(dragState.fromCol, dragState.cardIndex, targetCol);
        gameFeedback('move', feedbackOptions);
      } else {
        gameFeedback('invalid', feedbackOptions);
      }
    }

    setDragState(null);
  }, [dragState, getColumnAtPosition, moveCards, gameState.tableau, feedbackOptions]);

  // Mouse events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, column: number, cardIndex: number) => {
      e.preventDefault();
      handleDragStart(column, cardIndex, e.clientX, e.clientY);
    },
    [handleDragStart]
  );

  // Touch events
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, column: number, cardIndex: number) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      handleDragStart(column, cardIndex, touch.clientX, touch.clientY);
    },
    [handleDragStart]
  );

  // Global mouse/touch move handlers
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      handleDragMove(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = () => {
      handleDragEnd();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [dragState, handleDragMove, handleDragEnd]);

  // Calculate if a move to a column is valid (for highlighting)
  const isValidDropTarget = useCallback(
    (column: number): boolean => {
      if (!dragState) {
        if (!selection) return false;
        const sequence = getValidSequence(
          gameState.tableau[selection.column],
          selection.cardIndex
        );
        if (!sequence) return false;
        return canMoveToColumn(sequence, gameState.tableau[column]);
      }
      return canMoveToColumn(dragState.cards, gameState.tableau[column]);
    },
    [dragState, selection, gameState.tableau]
  );

  const canDealCards = gameState.stock.length > 0 && !gameState.tableau.some(col => col.length === 0);

  // Handle deal with feedback
  const handleDeal = useCallback(() => {
    if (canDealCards) {
      deal();
      gameFeedback('deal', feedbackOptions);
    }
  }, [canDealCards, deal, feedbackOptions]);

  // Calculate total column height using dynamic offsets
  const getColumnHeight = useCallback((column: CardType[]): number => {
    const { facedownOffset, faceupOffset } = calculateDynamicStackOffsets(
      column, cardHeight, baseStackOffsetFacedown, baseStackOffsetFaceup, availableHeight
    );
    let height = cardHeight;
    column.forEach((card, i) => {
      if (i > 0) {
        height += card.faceUp ? faceupOffset : facedownOffset;
      }
    });
    return height;
  }, [cardHeight, baseStackOffsetFacedown, baseStackOffsetFaceup, availableHeight]);

  return (
    <div
      ref={boardRef}
      className="relative w-full h-full bg-gradient-to-b from-green-800 to-green-900 overflow-hidden"
    >
      {/* Compact top bar - stock and completed piles */}
      <div className="flex justify-between items-start px-1 pt-1">
        <StockPile
          remainingDeals={gameState.stock.length}
          onClick={handleDeal}
          disabled={!canDealCards}
        />
        <CompletedPile
          count={gameState.completed.length}
          suit={gameState.completed[0]?.[0]?.suit}
        />
      </div>

      {/* Tableau - 3-3-4 row layout (portrait) or 10-across (landscape) */}
      <div className={`flex flex-col items-center px-1 pt-1 pb-1 gap-0.5 overflow-y-auto h-full no-scrollbar ${isLandscape ? 'justify-start' : ''}`}>
        {rowConfig.map((rowCols, rowIndex) => (
          <div
            key={rowIndex}
            className="flex justify-center"
            style={{ gap: 'var(--card-gap)' }}
          >
            {rowCols.map((colIndex) => {
              const column = gameState.tableau[colIndex];
              const isDropTarget =
                (dragState && dragState.fromCol !== colIndex) ||
                (selection && selection.column !== colIndex);
              const isValidTarget = isDropTarget && isValidDropTarget(colIndex);

              return (
                <div
                  key={colIndex}
                  ref={el => { columnRefs.current[colIndex] = el; }}
                  className={`
                    relative flex-shrink-0
                    ${isValidTarget ? 'bg-green-600/30 rounded-lg' : ''}
                  `}
                  style={{
                    width: columnWidth,
                    minHeight: cardHeight + 10,
                    height: Math.max(cardHeight + 10, getColumnHeight(column) + 4),
                  }}
                  onClick={() => column.length === 0 && handleEmptyColumnTap(colIndex)}
                >
                  {column.length === 0 ? (
                    <EmptySlot onClick={() => handleEmptyColumnTap(colIndex)} />
                  ) : (
                    (() => {
                      // Calculate dynamic offsets for this column
                      const { facedownOffset, faceupOffset } = calculateDynamicStackOffsets(
                        column, cardHeight, baseStackOffsetFacedown, baseStackOffsetFaceup, availableHeight
                      );
                      return column.map((card, cardIndex) => {
                        // Don't render cards being dragged in their original position
                        const isDragged =
                          dragState &&
                          dragState.fromCol === colIndex &&
                          cardIndex >= dragState.cardIndex;

                        const isSelected =
                          selection &&
                          selection.column === colIndex &&
                          cardIndex >= selection.cardIndex;

                        let stackOffset = 0;
                        for (let i = 0; i < cardIndex; i++) {
                          stackOffset += column[i].faceUp ? faceupOffset : facedownOffset;
                        }

                        return (
                          <div
                            key={card.id}
                            style={{
                              opacity: isDragged ? 0.3 : 1,
                            }}
                          >
                            <Card
                              card={card}
                              stackOffset={stackOffset}
                              isSelected={!!isSelected}
                              isImmersive={isImmersive}
                              onClick={() => handleCardTap(colIndex, cardIndex)}
                              onMouseDown={(e: React.MouseEvent) =>
                                card.faceUp && handleMouseDown(e, colIndex, cardIndex)
                              }
                              onTouchStart={(e: React.TouchEvent) =>
                                card.faceUp && handleTouchStart(e, colIndex, cardIndex)
                              }
                            />
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Dragging cards overlay */}
      {dragState && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: dragState.currentX - cardWidth / 2,
            top: dragState.currentY - cardHeight / 2,
          }}
        >
          {dragState.cards.map((card, i) => (
            <Card
              key={card.id}
              card={card}
              stackOffset={i * baseStackOffsetFaceup}
              isDragging
            />
          ))}
        </div>
      )}
    </div>
  );
}
