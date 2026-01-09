// Card suits and ranks
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  faceUp: boolean;
}

export interface GameState {
  tableau: Card[][]; // 10 columns
  stock: Card[]; // Remaining cards to deal (50 cards, 5 deals of 10)
  completed: Card[][]; // Completed sequences (8 total to win)
  moves: number;
  startTime: number | null;
  isWon: boolean;
  settings: GameSettings;
}

export interface GameSettings {
  suitCount: 1 | 2 | 4; // Number of suits to use
  soundEnabled: boolean;
  hapticEnabled: boolean;
  immersiveEnabled: boolean; // Visual push effects for tactile feel
  animationsEnabled: boolean;
  autoComplete: boolean;
  showTimer: boolean;
}

export interface Move {
  type: 'move' | 'deal' | 'complete';
  from?: { column: number; cardIndex: number };
  to?: { column: number };
  cards?: Card[];
  flippedCard?: { column: number; cardIndex: number };
  completedColumn?: number;
}

export interface HistoryEntry {
  state: GameState;
  move: Move;
}

// Rank values for comparison
export const RANK_VALUES: Record<Rank, number> = {
  'A': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
};

export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

// Default settings (Frosty's preferred way - single suit)
export const DEFAULT_SETTINGS: GameSettings = {
  suitCount: 1,
  soundEnabled: true,
  hapticEnabled: true,
  immersiveEnabled: true,
  animationsEnabled: true,
  autoComplete: true,
  showTimer: true,
};
