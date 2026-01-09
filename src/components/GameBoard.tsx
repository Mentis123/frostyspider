'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Card, EmptySlot, StockPile, CompletedPile } from './Card';
import { useGame } from '@/contexts/GameContext';
import { getValidSequence, canMoveToColumn } from '@/lib/gameEngine';
import { Card as CardType } from '@/lib/types';
import { gameFeedback } from '@/lib/feedback';

// Hook to calculate responsive card dimensions for 3-3-4 layout
function useCardDimensions() {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 375
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return useMemo(() => {
    // Match CSS formula: min(72px, (100vw - 24px) / 4)
    const cardWidth = Math.min(72, (windowWidth - 24) / 4);
    const cardHeight = cardWidth * 1.38;
    const columnWidth = cardWidth + 4;
    // Very tight stack offsets for compact mobile layout
    const stackOffsetFacedown = Math.max(2, cardWidth * 0.05);
    const stackOffsetFaceup = Math.max(8, cardWidth * 0.14);

    return { cardWidth, cardHeight, columnWidth, stackOffsetFacedown, stackOffsetFaceup };
  }, [windowWidth]);
}

// Row configuration: 3-3-4 layout
const ROW_CONFIG = [
  [0, 1, 2],       // Row 1: columns 0-2
  [3, 4, 5],       // Row 2: columns 3-5
  [6, 7, 8, 9],    // Row 3: columns 6-9
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
  const { cardWidth, cardHeight, columnWidth, stackOffsetFacedown, stackOffsetFaceup } = useCardDimensions();

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
  }), [gameState.settings.soundEnabled, gameState.settings.hapticEnabled]);

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

  // Calculate total column height using responsive offsets
  const getColumnHeight = useCallback((column: CardType[]): number => {
    let height = cardHeight;
    column.forEach((card, i) => {
      if (i > 0) {
        height += card.faceUp ? stackOffsetFaceup : stackOffsetFacedown;
      }
    });
    return height;
  }, [cardHeight, stackOffsetFaceup, stackOffsetFacedown]);

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

      {/* Tableau - 3-3-4 row layout with minimal gaps */}
      <div className="flex flex-col items-center px-1 pt-1 pb-1 gap-0.5 overflow-y-auto h-full no-scrollbar">
        {ROW_CONFIG.map((rowCols, rowIndex) => (
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
                    column.map((card, cardIndex) => {
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
                        stackOffset += column[i].faceUp ? stackOffsetFaceup : stackOffsetFacedown;
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
                    })
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
              stackOffset={i * stackOffsetFaceup}
              isDragging
            />
          ))}
        </div>
      )}
    </div>
  );
}
