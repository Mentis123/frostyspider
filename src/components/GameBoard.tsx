'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, EmptySlot, StockPile, CompletedPile } from './Card';
import { useGame } from '@/contexts/GameContext';
import { getValidSequence, canMoveToColumn } from '@/lib/gameEngine';
import { Card as CardType } from '@/lib/types';

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
        } else if (selection.column !== column) {
          // Try to move selected cards here
          const moved = moveCards(selection.column, selection.cardIndex, column);
          setSelection(null);
        } else {
          // Selected different card in same column - change selection
          setSelection({ column, cardIndex });
        }
      } else {
        // No selection - either auto-move (double tap) or select
        setSelection({ column, cardIndex });
      }
    },
    [selection, gameState.tableau, moveCards]
  );

  // Handle empty column tap
  const handleEmptyColumnTap = useCallback(
    (column: number) => {
      if (selection) {
        moveCards(selection.column, selection.cardIndex, column);
        setSelection(null);
      }
    },
    [selection, moveCards]
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
      moveCards(dragState.fromCol, dragState.cardIndex, targetCol);
    }

    setDragState(null);
  }, [dragState, getColumnAtPosition, moveCards]);

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

  // Card overlap for stacking
  const getStackOffset = (index: number, total: number, faceUp: boolean): number => {
    // Face down cards stack tighter
    if (!faceUp) return index * 8;
    // Face up cards show more
    return index * 24;
  };

  // Calculate total column height
  const getColumnHeight = (column: CardType[]): number => {
    let height = 72; // Base card height
    column.forEach((card, i) => {
      if (i > 0) {
        height += card.faceUp ? 24 : 8;
      }
    });
    return height;
  };

  return (
    <div
      ref={boardRef}
      className="relative w-full h-full bg-gradient-to-b from-green-800 to-green-900 overflow-hidden"
    >
      {/* Top bar - stock and completed piles */}
      <div className="flex justify-between items-start p-2 pb-0">
        <StockPile
          remainingDeals={gameState.stock.length}
          onClick={deal}
          disabled={!canDealCards}
        />
        <CompletedPile
          count={gameState.completed.length}
          suit={gameState.completed[0]?.[0]?.suit}
        />
      </div>

      {/* Tableau - 10 columns */}
      <div className="flex justify-center gap-1 px-1 pt-10 pb-4 overflow-x-auto">
        {gameState.tableau.map((column, colIndex) => {
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
                min-h-[200px]
                ${isValidTarget ? 'bg-green-600/30 rounded-lg' : ''}
              `}
              style={{
                width: 56,
                height: Math.max(200, getColumnHeight(column) + 20),
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
                    stackOffset += column[i].faceUp ? 24 : 8;
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

      {/* Dragging cards overlay */}
      {dragState && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: dragState.currentX - 26,
            top: dragState.currentY - 36,
          }}
        >
          {dragState.cards.map((card, i) => (
            <Card
              key={card.id}
              card={card}
              stackOffset={i * 24}
              isDragging
            />
          ))}
        </div>
      )}
    </div>
  );
}
