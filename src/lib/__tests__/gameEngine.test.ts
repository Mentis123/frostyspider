import { describe, it, expect } from 'vitest';
import {
  createDeck,
  shuffleDeck,
  mulberry32,
  initializeGame,
  isValidSequence,
  canMoveToColumn,
  getValidSequence,
  hasCompleteSequence,
  executeMove,
  checkAndRemoveCompleteSequences,
  dealFromStock,
  isGameStuck,
} from '../gameEngine';
import { Card, GameState, Rank, DEFAULT_SETTINGS, RANKS } from '../types';

let nextId = 0;
function card(rank: Rank, suit: Card['suit'] = 'spades', faceUp = true): Card {
  return { id: `t${++nextId}`, rank, suit, faceUp };
}

// Build a face-up descending run, e.g. run('K', 'A') = K,Q,...,A of spades
function run(from: Rank, to: Rank, suit: Card['suit'] = 'spades'): Card[] {
  const fromIdx = RANKS.indexOf(from);
  const toIdx = RANKS.indexOf(to);
  const cards: Card[] = [];
  for (let i = fromIdx; i >= toIdx; i--) {
    cards.push(card(RANKS[i], suit));
  }
  return cards;
}

function stateWith(overrides: Partial<GameState>): GameState {
  return {
    tableau: Array.from({ length: 10 }, () => [] as Card[]),
    stock: [],
    completed: [],
    moves: 0,
    startTime: null,
    isWon: false,
    settings: DEFAULT_SETTINGS,
    ...overrides,
  };
}

describe('createDeck', () => {
  it('creates 104 cards for every suit count', () => {
    expect(createDeck(1)).toHaveLength(104);
    expect(createDeck(2)).toHaveLength(104);
    expect(createDeck(4)).toHaveLength(104);
  });

  it('uses only the configured suits', () => {
    expect(new Set(createDeck(1).map(c => c.suit))).toEqual(new Set(['spades']));
    expect(new Set(createDeck(2).map(c => c.suit))).toEqual(new Set(['spades', 'hearts']));
    expect(new Set(createDeck(4).map(c => c.suit)).size).toBe(4);
  });

  it('contains exactly 8 of each rank per suit configuration', () => {
    const deck = createDeck(1);
    for (const rank of RANKS) {
      expect(deck.filter(c => c.rank === rank)).toHaveLength(8);
    }
  });
});

describe('shuffleDeck', () => {
  it('is deterministic for the same seed and differs across seeds', () => {
    const deck = createDeck(1);
    const a = shuffleDeck(deck, mulberry32(42)).map(c => c.id);
    const b = shuffleDeck(deck, mulberry32(42)).map(c => c.id);
    const c = shuffleDeck(deck, mulberry32(43)).map(c => c.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('preserves all cards', () => {
    const deck = createDeck(4);
    const shuffled = shuffleDeck(deck, mulberry32(7));
    expect(new Set(shuffled.map(c => c.id)).size).toBe(104);
  });
});

describe('initializeGame', () => {
  it('deals 54 cards to the tableau (6,6,6,6 then 5x6) and 50 to stock', () => {
    const game = initializeGame(DEFAULT_SETTINGS, 1);
    const counts = game.tableau.map(col => col.length);
    expect(counts).toEqual([6, 6, 6, 6, 5, 5, 5, 5, 5, 5]);
    expect(game.stock).toHaveLength(50);
  });

  it('turns only the top card of each column face up', () => {
    const game = initializeGame(DEFAULT_SETTINGS, 1);
    for (const col of game.tableau) {
      col.forEach((c, i) => expect(c.faceUp).toBe(i === col.length - 1));
    }
    expect(game.stock.every(c => !c.faceUp)).toBe(true);
  });

  it('produces identical deals for the same seed', () => {
    const a = initializeGame(DEFAULT_SETTINGS, 123);
    const b = initializeGame(DEFAULT_SETTINGS, 123);
    expect(a.tableau).toEqual(b.tableau);
    expect(a.stock).toEqual(b.stock);
  });
});

describe('isValidSequence / getValidSequence', () => {
  it('accepts a same-suit descending face-up run', () => {
    expect(isValidSequence(run('5', '2'))).toBe(true);
  });

  it('rejects mixed suits, gaps, and face-down cards', () => {
    expect(isValidSequence([card('5', 'spades'), card('4', 'hearts')])).toBe(false);
    expect(isValidSequence([card('5'), card('3')])).toBe(false);
    expect(isValidSequence([card('5', 'spades', false)])).toBe(false);
  });

  it('returns null for a face-down start or broken run', () => {
    const column = [card('9', 'spades', false), ...run('5', '3')];
    expect(getValidSequence(column, 0)).toBeNull();
    expect(getValidSequence(column, 1)).toHaveLength(3);
  });
});

describe('canMoveToColumn', () => {
  it('allows any suit onto a card one rank higher', () => {
    expect(canMoveToColumn([card('4', 'hearts')], [card('5', 'spades')])).toBe(true);
  });

  it('rejects equal or non-adjacent ranks', () => {
    expect(canMoveToColumn([card('5')], [card('5')])).toBe(false);
    expect(canMoveToColumn([card('3')], [card('5')])).toBe(false);
  });

  it('allows any card onto an empty column', () => {
    expect(canMoveToColumn([card('7')], [])).toBe(true);
  });

  it('never allows anything onto an Ace (the invariant hasCompleteSequence relies on)', () => {
    for (const rank of RANKS) {
      expect(canMoveToColumn([card(rank)], [card('A')])).toBe(false);
    }
  });
});

describe('hasCompleteSequence / checkAndRemoveCompleteSequences', () => {
  it('detects a full K-to-A same-suit run at the end of a column', () => {
    const column = [card('7', 'hearts', false), ...run('K', 'A')];
    const result = hasCompleteSequence(column);
    expect(result).not.toBeNull();
    expect(result!.start).toBe(1);
  });

  it('ignores runs that are mixed-suit or partially face down', () => {
    const mixed = [...run('K', '2'), card('A', 'hearts')];
    expect(hasCompleteSequence(mixed)).toBeNull();
    const hidden = run('K', 'A');
    hidden[0].faceUp = false;
    expect(hasCompleteSequence(hidden)).toBeNull();
  });

  it('removes the run, flips the revealed card, and wins at 8 completed', () => {
    const tableau = Array.from({ length: 10 }, () => [] as Card[]);
    tableau[0] = [card('7', 'hearts', false), ...run('K', 'A')];
    const state = stateWith({
      tableau,
      completed: Array.from({ length: 7 }, () => run('K', 'A')),
    });
    const next = checkAndRemoveCompleteSequences(state);
    expect(next.tableau[0]).toHaveLength(1);
    expect(next.tableau[0][0].faceUp).toBe(true);
    expect(next.completed).toHaveLength(8);
    expect(next.isWon).toBe(true);
  });
});

describe('executeMove', () => {
  it('moves a valid sequence and flips the exposed source card', () => {
    const tableau = Array.from({ length: 10 }, () => [] as Card[]);
    tableau[0] = [card('9', 'hearts', false), ...run('5', '4')];
    tableau[1] = [card('6', 'spades')];
    const state = stateWith({ tableau });

    const next = executeMove(state, 0, 1, 1);
    expect(next).not.toBeNull();
    expect(next!.tableau[1].map(c => c.rank)).toEqual(['6', '5', '4']);
    expect(next!.tableau[0]).toHaveLength(1);
    expect(next!.tableau[0][0].faceUp).toBe(true);
    expect(next!.moves).toBe(1);
  });

  it('returns null for invalid moves and same-column moves', () => {
    const tableau = Array.from({ length: 10 }, () => [] as Card[]);
    tableau[0] = [card('5')];
    tableau[1] = [card('3')];
    const state = stateWith({ tableau });
    expect(executeMove(state, 0, 0, 1)).toBeNull(); // 5 onto 3
    expect(executeMove(state, 0, 0, 0)).toBeNull(); // same column
  });

  it('does not mutate the input state', () => {
    const tableau = Array.from({ length: 10 }, () => [] as Card[]);
    tableau[0] = [card('5')];
    tableau[1] = [card('6')];
    const state = stateWith({ tableau });
    const snapshot = JSON.parse(JSON.stringify(state.tableau));
    executeMove(state, 0, 0, 1);
    expect(state.tableau).toEqual(snapshot);
  });
});

describe('dealFromStock', () => {
  it('deals one face-up card to each column', () => {
    const tableau = Array.from({ length: 10 }, () => [card('K', 'spades', true)]);
    const stock = Array.from({ length: 20 }, () => card('2', 'spades', false));
    const state = stateWith({ tableau, stock });

    const next = dealFromStock(state);
    expect(next).not.toBeNull();
    expect(next!.stock).toHaveLength(10);
    expect(next!.tableau.every(col => col.length === 2)).toBe(true);
    expect(next!.tableau.every(col => col[1].faceUp)).toBe(true);
  });

  it('refuses to deal onto an empty column or from an empty stock', () => {
    const tableau = Array.from({ length: 10 }, () => [card('K')]);
    tableau[3] = [];
    expect(dealFromStock(stateWith({ tableau, stock: [card('2')] }))).toBeNull();

    const full = Array.from({ length: 10 }, () => [card('K')]);
    expect(dealFromStock(stateWith({ tableau: full, stock: [] }))).toBeNull();
  });
});

describe('isGameStuck', () => {
  it('is false when a deal or a move is available', () => {
    const game = initializeGame(DEFAULT_SETTINGS, 5);
    expect(isGameStuck(game)).toBe(false);
  });

  it('is true when no moves remain and the stock is empty', () => {
    // Ten columns each topped by a same-rank card: nothing can move anywhere
    const tableau = Array.from({ length: 10 }, () => [card('7', 'spades', true)]);
    const state = stateWith({ tableau, stock: [] });
    expect(isGameStuck(state)).toBe(true);
  });
});
