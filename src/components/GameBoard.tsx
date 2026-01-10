'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Card, EmptySlot, StockPile, CompletedPile } from './Card';
import { useGame } from '@/contexts/GameContext';
import { getValidSequence, canMoveToColumn } from '@/lib/gameEngine';
import { Card as CardType } from '@/lib/types';
import { gameFeedback } from '@/lib/feedback';
import {
  calculateLayout,
  calculateSmartOverlap,
  calculateExpandedOffsets,
  getCardStackOffset,
  isStackCompressed,
  calculateSegmentLayout,
  topOffsetToBottomOffset,
  ColumnSegment,
  SegmentLayout,
  LayoutResult,
  StackOffsets,
} from '@/lib/layoutCalculator';
import { CompressedRun } from './CompressedRun';

// Hook to observe container dimensions using ResizeObserver
function useContainerDimensions(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    observer.observe(containerRef.current);

    // Initial measurement
    const rect = containerRef.current.getBoundingClientRect();
    setDimensions({ width: rect.width, height: rect.height });

    return () => observer.disconnect();
  }, []);

  return dimensions;
}

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
  const [expandedColumn, setExpandedColumn] = useState<number | null>(null);

  // Refs for measurement and drop detection
  const boardRef = useRef<HTMLDivElement>(null);
  const tableauContainerRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Measure actual container dimensions
  const containerDimensions = useContainerDimensions(tableauContainerRef);

  // Calculate layout based on actual container size
  const layout = useMemo<LayoutResult>(() => {
    if (containerDimensions.width === 0 || containerDimensions.height === 0) {
      // Return sensible defaults until container is measured
      return {
        cardWidth: 60,
        cardHeight: 83,
        columnWidth: 64,
        gapSize: 4,
        isLandscape: false,
        rowConfig: [[0, 1, 2], [3, 4, 5], [6, 7, 8, 9]],
        rowHeights: [200, 200, 200],
      };
    }
    return calculateLayout({
      containerWidth: containerDimensions.width,
      containerHeight: containerDimensions.height,
    });
  }, [containerDimensions]);

  const { cardWidth, cardHeight, columnWidth, gapSize, isLandscape, rowConfig, rowHeights } = layout;

  // Handle column tap to expand/collapse
  const handleColumnTap = useCallback((colIndex: number) => {
    if (expandedColumn === colIndex) {
      setExpandedColumn(null);
    } else {
      setExpandedColumn(colIndex);
    }
  }, [expandedColumn]);

  // Calculate column positions for drop detection
  // Finds the closest column to the drop point to avoid issues with overlapping detection zones
  const getColumnAtPosition = useCallback((x: number, y: number): number | null => {
    let closestCol: number | null = null;
    let closestDistance = Infinity;

    for (let i = 0; i < 10; i++) {
      const ref = columnRefs.current[i];
      if (ref) {
        const rect = ref.getBoundingClientRect();
        // Check if point is within generous detection area
        if (x >= rect.left - 10 && x <= rect.right + 10 && y >= rect.top - 50 && y <= rect.bottom + 100) {
          // Calculate distance to center of column
          const centerX = (rect.left + rect.right) / 2;
          const centerY = (rect.top + rect.bottom) / 2;
          const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

          if (distance < closestDistance) {
            closestDistance = distance;
            closestCol = i;
          }
        }
      }
    }
    return closestCol;
  }, []);

  // Feedback helper
  const feedbackOptions = useMemo(() => ({
    soundEnabled: gameState.settings.soundEnabled,
    hapticEnabled: gameState.settings.hapticEnabled,
    immersiveEnabled: gameState.settings.immersiveEnabled,
  }), [gameState.settings.soundEnabled, gameState.settings.hapticEnabled, gameState.settings.immersiveEnabled]);

  const isImmersive = gameState.settings.immersiveEnabled;

  // Handle card tap (tap-to-select-tap-to-move)
  const handleCardTap = useCallback(
    (column: number, cardIndex: number) => {
      const card = gameState.tableau[column][cardIndex];
      if (!card.faceUp) return;

      const sequence = getValidSequence(gameState.tableau[column], cardIndex);
      if (!sequence) return;

      if (selection) {
        if (selection.column === column && selection.cardIndex === cardIndex) {
          setSelection(null);
          gameFeedback('select', feedbackOptions);
        } else if (selection.column !== column) {
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
          setSelection({ column, cardIndex });
          gameFeedback('select', feedbackOptions);
        }
      } else {
        setSelection({ column, cardIndex });
        gameFeedback('select', feedbackOptions);
      }
    },
    [selection, gameState.tableau, moveCards, feedbackOptions]
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

      // Collapse any expanded column when starting to drag
      setExpandedColumn(null);

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

  const handleDeal = useCallback(() => {
    if (canDealCards) {
      deal();
      gameFeedback('deal', feedbackOptions);
    }
  }, [canDealCards, deal, feedbackOptions]);

  // Get row index for a column
  const getRowIndex = (colIndex: number): number => {
    for (let rowIdx = 0; rowIdx < rowConfig.length; rowIdx++) {
      if (rowConfig[rowIdx].includes(colIndex)) {
        return rowIdx;
      }
    }
    return 0;
  };

  // Calculate offsets and heights for each column using segment-based layout
  const columnLayouts = useMemo(() => {
    return gameState.tableau.map((column, colIndex) => {
      const rowIndex = getRowIndex(colIndex);
      const maxHeight = rowHeights[rowIndex] || 200;
      const isExpanded = expandedColumn === colIndex;

      // For expanded columns, calculate with more generous max (double row height)
      const expandedMaxHeight = Math.min(maxHeight * 2, containerDimensions.height - 80);

      // Use segment-based layout for compression (disabled when expanded)
      const segmentLayout = calculateSegmentLayout(
        column,
        cardHeight,
        isExpanded ? expandedMaxHeight : maxHeight,
        !isExpanded, // Use compression when NOT expanded
        cardWidth
      );

      // Also calculate traditional offsets for backward compatibility
      const offsets: StackOffsets = isExpanded
        ? calculateExpandedOffsets(column, cardHeight, expandedMaxHeight)
        : calculateSmartOverlap(column, cardHeight, maxHeight);

      // Calculate actual stack height (use segment layout when compressed)
      let stackHeight = segmentLayout.totalHeight;
      if (stackHeight === 0 && column.length > 0) {
        stackHeight = cardHeight;
      }

      // Check if this stack is compressed (has runs that could be compressed)
      const hasCompressibleRuns = segmentLayout.segments.some(s => s.type === 'run');
      const isCompressed = isStackCompressed(offsets, column.length) || hasCompressibleRuns;

      return {
        offsets,
        stackHeight,
        maxHeight: isExpanded ? expandedMaxHeight : maxHeight,
        needsScroll: false,
        isCompressed,
        segmentLayout,
        useSegmentRendering: !isExpanded && hasCompressibleRuns,
      };
    });
  }, [gameState.tableau, rowHeights, cardHeight, expandedColumn, containerDimensions.height]);

  return (
    <div
      ref={boardRef}
      className="relative w-full h-full bg-gradient-to-b from-green-800 to-green-900 overflow-hidden flex flex-col"
    >
      {/* Top bar - stock and completed piles (smaller to maximize tableau space) */}
      <div className="flex justify-between items-start px-2 pt-1 pb-1 flex-shrink-0">
        <StockPile
          remainingDeals={gameState.stock.length}
          onClick={handleDeal}
          disabled={!canDealCards}
          cardWidth={Math.round(cardWidth * 0.6)}
          cardHeight={Math.round(cardHeight * 0.6)}
        />
        <CompletedPile
          count={gameState.completed.length}
          suit={gameState.completed[0]?.[0]?.suit}
          cardWidth={Math.round(cardWidth * 0.6)}
          cardHeight={Math.round(cardHeight * 0.6)}
        />
      </div>

      {/* Tableau container - measured by ResizeObserver */}
      <div
        ref={tableauContainerRef}
        className="flex-1 flex flex-col items-center px-2 pb-2 gap-1 overflow-hidden"
      >
        {rowConfig.map((rowCols, rowIndex) => (
          <div
            key={rowIndex}
            className="flex justify-center items-end"
            style={{
              gap: gapSize,
              height: rowHeights[rowIndex] || 'auto',
              minHeight: cardHeight + 20,
            }}
          >
            {rowCols.map((colIndex) => {
              const column = gameState.tableau[colIndex];
              const columnLayout = columnLayouts[colIndex];
              const isDropTarget =
                (dragState && dragState.fromCol !== colIndex) ||
                (selection && selection.column !== colIndex);
              const isValidTarget = isDropTarget && isValidDropTarget(colIndex);
              const isExpanded = expandedColumn === colIndex;

              return (
                <div
                  key={colIndex}
                  ref={el => { columnRefs.current[colIndex] = el; }}
                  className={`
                    relative flex-shrink-0 flex flex-col justify-end
                    ${isValidTarget ? 'bg-green-600/30 rounded-lg' : ''}
                    ${isExpanded ? 'z-30' : ''}
                  `}
                  style={{
                    width: columnWidth,
                    height: '100%',
                    maxHeight: columnLayout.maxHeight,
                  }}
                  onClick={() => column.length === 0 && handleEmptyColumnTap(colIndex)}
                >
                  {column.length === 0 ? (
                    <EmptySlot
                      onClick={() => handleEmptyColumnTap(colIndex)}
                      cardWidth={cardWidth}
                      cardHeight={cardHeight}
                    />
                  ) : (
                    <>
                    <div
                      className={`relative mt-auto ${columnLayout.needsScroll ? 'overflow-y-auto no-scrollbar' : ''}`}
                      style={{
                        height: Math.min(columnLayout.stackHeight, columnLayout.maxHeight),
                        width: '100%',
                      }}
                      onClick={(e) => {
                        if (e.target === e.currentTarget) {
                          handleColumnTap(colIndex);
                        }
                      }}
                    >
                      {/* Use segment-based rendering when we have compressible runs */}
                      {columnLayout.useSegmentRendering ? (
                        // Segment-based rendering with run compression
                        columnLayout.segmentLayout.segments.map((segment, segmentIndex) => {
                          const topOffset = columnLayout.segmentLayout.segmentOffsets[segmentIndex];
                          const isLastSegment = segmentIndex === columnLayout.segmentLayout.segments.length - 1;

                          // In landscape, use bottom positioning for bottom-up stacking
                          const segmentOffset = isLandscape
                            ? topOffsetToBottomOffset(topOffset, cardHeight, columnLayout.stackHeight)
                            : topOffset;

                          if (segment.type === 'run') {
                            // Check if any card in this run is being dragged
                            const isDragged = dragState &&
                              dragState.fromCol === colIndex &&
                              dragState.cardIndex >= segment.startIndex &&
                              dragState.cardIndex <= segment.endIndex;

                            // Check if any card in this run is selected
                            const isSelected = selection &&
                              selection.column === colIndex &&
                              selection.cardIndex >= segment.startIndex &&
                              selection.cardIndex <= segment.endIndex;

                            return (
                              <div
                                key={`run-${segment.startIndex}`}
                                style={{ opacity: isDragged ? 0.3 : 1 }}
                              >
                                <CompressedRun
                                  cards={segment.cards}
                                  startIndex={segment.startIndex}
                                  stackOffset={segmentOffset}
                                  isSelected={!!isSelected}
                                  selectedCardIndex={isSelected ? selection.cardIndex : undefined}
                                  isImmersive={isImmersive}
                                  cardWidth={cardWidth}
                                  cardHeight={cardHeight}
                                  isLastInColumn={isLastSegment}
                                  onCardClick={(cardIndex) => handleCardTap(colIndex, cardIndex)}
                                  onMouseDown={(e, cardIndex) => handleMouseDown(e, colIndex, cardIndex)}
                                  onTouchStart={(e, cardIndex) => handleTouchStart(e, colIndex, cardIndex)}
                                  faceUpPeek={columnLayout.segmentLayout.faceUpOffset}
                                  useBottomPosition={isLandscape}
                                />
                              </div>
                            );
                          }

                          // Face-down or single cards - render individually
                          return segment.cards.map((card, cardInSegmentIndex) => {
                            const cardIndex = segment.startIndex + cardInSegmentIndex;
                            const isDragged = dragState &&
                              dragState.fromCol === colIndex &&
                              cardIndex >= dragState.cardIndex;
                            const isSelected = selection &&
                              selection.column === colIndex &&
                              cardIndex >= selection.cardIndex;

                            // Calculate offset for this card within the segment
                            let cardTopOffset = topOffset;
                            for (let i = 0; i < cardInSegmentIndex; i++) {
                              cardTopOffset += segment.cards[i].faceUp
                                ? columnLayout.segmentLayout.faceUpOffset
                                : columnLayout.segmentLayout.faceDownOffset;
                            }

                            // In landscape, convert to bottom offset
                            const cardOffset = isLandscape
                              ? topOffsetToBottomOffset(cardTopOffset, cardHeight, columnLayout.stackHeight)
                              : cardTopOffset;

                            return (
                              <div
                                key={card.id}
                                style={{ opacity: isDragged ? 0.3 : 1 }}
                              >
                                <Card
                                  card={card}
                                  stackOffset={cardOffset}
                                  useBottomPosition={isLandscape}
                                  isSelected={!!isSelected}
                                  isImmersive={isImmersive}
                                  cardWidth={cardWidth}
                                  cardHeight={cardHeight}
                                  onClick={() => {
                                    if (!card.faceUp) {
                                      handleColumnTap(colIndex);
                                    } else {
                                      handleCardTap(colIndex, cardIndex);
                                    }
                                  }}
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
                        })
                      ) : (
                        // Traditional card-by-card rendering (when expanded or no runs)
                        column.map((card, cardIndex) => {
                          const isDragged =
                            dragState &&
                            dragState.fromCol === colIndex &&
                            cardIndex >= dragState.cardIndex;

                          const isSelected =
                            selection &&
                            selection.column === colIndex &&
                            cardIndex >= selection.cardIndex;

                          const topOffset = getCardStackOffset(column, cardIndex, columnLayout.offsets);

                          // In landscape, convert to bottom offset for bottom-up stacking
                          const stackOffset = isLandscape
                            ? topOffsetToBottomOffset(topOffset, cardHeight, columnLayout.stackHeight)
                            : topOffset;

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
                                useBottomPosition={isLandscape}
                                isSelected={!!isSelected}
                                isImmersive={isImmersive}
                                cardWidth={cardWidth}
                                cardHeight={cardHeight}
                                onClick={() => {
                                  if (!card.faceUp && columnLayout.isCompressed && !isExpanded) {
                                    handleColumnTap(colIndex);
                                  } else {
                                    handleCardTap(colIndex, cardIndex);
                                  }
                                }}
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
                    </>
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
              stackOffset={i * 25}
              isDragging
              cardWidth={cardWidth}
              cardHeight={cardHeight}
            />
          ))}
        </div>
      )}
    </div>
  );
}
