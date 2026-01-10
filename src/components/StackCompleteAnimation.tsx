'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Card as CardType } from '@/lib/types';

interface StackCompleteAnimationProps {
  cards: CardType[];
  onComplete: () => void;
  startPosition?: { x: number; y: number };
}

// Snowflake shapes for variety
const SNOWFLAKE_CHARS = ['*', '*', '*', '*'];

// Snowflake component
function Snowflake({ delay, duration, left, size, char }: { delay: number; duration: number; left: number; size: number; char: string }) {
  return (
    <div
      className="absolute animate-snowfall pointer-events-none"
      style={{
        left: `${left}%`,
        top: '-20px',
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        fontSize: `${size}px`,
        opacity: 0.9,
      }}
    >
      {char}
    </div>
  );
}

// Mini card for animation
function MiniCard({ card, style, className }: { card: CardType; style?: React.CSSProperties; className?: string }) {
  const suitSymbols: Record<string, string> = {
    spades: '\u2660',
    hearts: '\u2665',
    diamonds: '\u2666',
    clubs: '\u2663',
  };
  const suitColors: Record<string, string> = {
    spades: 'text-gray-900',
    hearts: 'text-red-600',
    diamonds: 'text-red-600',
    clubs: 'text-gray-900',
  };

  return (
    <div
      className={`absolute bg-white rounded-md shadow-lg flex flex-col items-center justify-center ${className || ''}`}
      style={{
        width: 40,
        height: 56,
        ...style,
      }}
    >
      <span className={`text-xs font-bold ${suitColors[card.suit]}`}>
        {card.rank}
      </span>
      <span className={`text-sm ${suitColors[card.suit]}`}>
        {suitSymbols[card.suit]}
      </span>
    </div>
  );
}

// Seeded pseudo-random number generator for consistent results
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function StackCompleteAnimation({ cards, onComplete, startPosition }: StackCompleteAnimationProps) {
  const [phase, setPhase] = useState<'gather' | 'snake' | 'stack' | 'celebrate'>('gather');
  const [animatedCards, setAnimatedCards] = useState<number[]>([]);
  const [stackedCards, setStackedCards] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate positions
  const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 200;
  const targetY = 60; // Near top where completed pile is
  const targetX = typeof window !== 'undefined' ? window.innerWidth - 80 : 320;

  // Generate snowflakes with seeded random values (computed once)
  const snowflakes = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      delay: seededRandom(i * 1.1) * 2,
      duration: 2 + seededRandom(i * 2.2) * 2,
      left: seededRandom(i * 3.3) * 100,
      size: 16 + seededRandom(i * 4.4) * 16,
      char: SNOWFLAKE_CHARS[Math.floor(seededRandom(i * 5.5) * 4)],
    }));
  }, []);

  // Generate sparkle positions (computed once)
  const sparkles = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: 20 + seededRandom(i * 6.6) * 60,
      top: 20 + seededRandom(i * 7.7) * 40,
      delay: seededRandom(i * 8.8) * 0.5,
    }));
  }, []);

  useEffect(() => {
    // Phase 1: Cards gather at center (brief pause)
    const gatherTimer = setTimeout(() => {
      setPhase('snake');
    }, 200);

    return () => clearTimeout(gatherTimer);
  }, []);

  useEffect(() => {
    if (phase !== 'snake') return;

    // Phase 2: Cards snake up one by one
    const cardDelay = 80; // ms between each card
    const timers: NodeJS.Timeout[] = [];
    cards.forEach((_, index) => {
      const timer = setTimeout(() => {
        setAnimatedCards(prev => [...prev, index]);
      }, index * cardDelay);
      timers.push(timer);
    });

    // After all cards animated, move to stack phase
    const stackTimer = setTimeout(() => {
      setPhase('stack');
    }, cards.length * cardDelay + 300);
    timers.push(stackTimer);

    return () => timers.forEach(t => clearTimeout(t));
  }, [phase, cards]);

  useEffect(() => {
    if (phase !== 'stack') return;

    // Phase 3: Cards stack on completed pile
    const stackDelay = 50;
    const timers: NodeJS.Timeout[] = [];
    cards.forEach((_, index) => {
      const timer = setTimeout(() => {
        setStackedCards(prev => [...prev, index]);
      }, index * stackDelay);
      timers.push(timer);
    });

    // After stacking, celebrate then complete
    const celebrateTimer = setTimeout(() => {
      setPhase('celebrate');
    }, cards.length * stackDelay + 200);
    timers.push(celebrateTimer);

    return () => timers.forEach(t => clearTimeout(t));
  }, [phase, cards]);

  useEffect(() => {
    if (phase !== 'celebrate') return;

    // End animation after celebration
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 1500);

    return () => clearTimeout(completeTimer);
  }, [phase, onComplete]);

  const getCardPosition = (index: number) => {
    const startX = startPosition?.x || centerX;
    const startY = startPosition?.y || 400;

    if (phase === 'gather') {
      // Cards at starting position
      return {
        x: startX,
        y: startY + index * 2,
        rotation: 0,
        scale: 1,
      };
    }

    if (phase === 'snake') {
      if (animatedCards.includes(index)) {
        // Card is snaking upward in a wavy pattern
        const progress = 1;
        const waveAmplitude = 40;
        const waveFrequency = 2;
        const yProgress = startY - (startY - 150) * progress;
        const xOffset = Math.sin((index / cards.length) * Math.PI * waveFrequency) * waveAmplitude;

        return {
          x: centerX + xOffset,
          y: yProgress - index * 3, // Slight vertical offset for stack effect
          rotation: (index % 2 === 0 ? 1 : -1) * 5,
          scale: 1,
        };
      }
      // Card waiting to animate
      return {
        x: startX,
        y: startY + index * 2,
        rotation: 0,
        scale: 1,
      };
    }

    if (phase === 'stack' || phase === 'celebrate') {
      if (stackedCards.includes(index)) {
        // Card is stacked at completed pile
        return {
          x: targetX,
          y: targetY + (12 - index) * 1.5, // Stack with slight offset, King on bottom
          rotation: 0,
          scale: 0.9,
        };
      }
      // Card still in center waiting to stack
      const waveAmplitude = 40;
      const waveFrequency = 2;
      const xOffset = Math.sin((index / cards.length) * Math.PI * waveFrequency) * waveAmplitude;
      return {
        x: centerX + xOffset,
        y: 150 - index * 3,
        rotation: (index % 2 === 0 ? 1 : -1) * 5,
        scale: 1,
      };
    }

    return { x: startX, y: startY, rotation: 0, scale: 1 };
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 pointer-events-none overflow-hidden"
    >
      {/* Snowflakes background */}
      <div className="absolute inset-0 text-white">
        {snowflakes.map(flake => (
          <Snowflake key={flake.id} {...flake} />
        ))}
      </div>

      {/* Celebration text */}
      {phase === 'celebrate' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-bounce-in text-center">
            <div className="text-4xl mb-2">*</div>
            <div className="text-xl font-bold text-white drop-shadow-lg bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Stack Complete!
            </div>
            <div className="text-3xl mt-1">*</div>
          </div>
        </div>
      )}

      {/* Animated cards */}
      {cards.map((card, index) => {
        const pos = getCardPosition(index);
        return (
          <MiniCard
            key={card.id}
            card={card}
            className="transition-all ease-out"
            style={{
              transform: `translate(${pos.x - 20}px, ${pos.y - 28}px) rotate(${pos.rotation}deg) scale(${pos.scale})`,
              transitionDuration: phase === 'snake' ? '400ms' : '250ms',
              zIndex: phase === 'stack' || phase === 'celebrate'
                ? (stackedCards.includes(index) ? 100 - index : 50 + index)
                : 50 + index,
            }}
          />
        );
      })}

      {/* Sparkle effects during celebrate */}
      {phase === 'celebrate' && (
        <>
          {sparkles.map(sparkle => (
            <div
              key={`sparkle-${sparkle.id}`}
              className="absolute animate-sparkle text-2xl"
              style={{
                left: `${sparkle.left}%`,
                top: `${sparkle.top}%`,
                animationDelay: `${sparkle.delay}s`,
              }}
            >
              *
            </div>
          ))}
        </>
      )}
    </div>
  );
}
