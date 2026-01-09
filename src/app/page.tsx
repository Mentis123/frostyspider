'use client';

import { GameProvider } from '@/contexts/GameContext';
import { Game } from '@/components/Game';

export default function Home() {
  return (
    <GameProvider>
      <Game />
    </GameProvider>
  );
}
