import {
  Card,
  GameState,
  GameSettings,
  Move,
  Rank,
  Suit,
  RANKS,
  SUITS,
  RANK_VALUES,
  DEFAULT_SETTINGS,
} from './types';

// Generate a unique card ID
let cardIdCounter = 0;
function generateCardId(): string {
  return `card_${++cardIdCounter}`;
}

// Create a deck based on suit count setting
export function createDeck(suitCount: 1 | 2 | 4): Card[] {
  const cards: Card[] = [];
  const suitsToUse: Suit[] =
    suitCount === 1 ? ['spades'] :
    suitCount === 2 ? ['spades', 'hearts'] :
    SUITS;

  // We need 104 cards total (8 complete sequences)
  const decksPerSuit = suitCount === 1 ? 8 : suitCount === 2 ? 4 : 2;

  for (let deck = 0; deck < decksPerSuit; deck++) {
    for (const suit of suitsToUse) {
      for (const rank of RANKS) {
        cards.push({
          id: generateCardId(),
          suit,
          rank,
          faceUp: false,
        });
      }
    }
  }

  return cards;
}

// Fisher-Yates shuffle
export function shuffleDeck(cards: Card[]): Card[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Initialize a new game
export function initializeGame(settings: GameSettings = DEFAULT_SETTINGS): GameState {
  cardIdCounter = 0; // Reset counter for new game

  const deck = shuffleDeck(createDeck(settings.suitCount));
  const tableau: Card[][] = Array.from({ length: 10 }, () => []);

  // Deal 54 cards to tableau
  // First 4 columns get 6 cards, remaining 6 columns get 5 cards
  let cardIndex = 0;
  for (let col = 0; col < 10; col++) {
    const cardCount = col < 4 ? 6 : 5;
    for (let i = 0; i < cardCount; i++) {
      const card = { ...deck[cardIndex++] };
      // Only the top card (last dealt) is face up
      card.faceUp = i === cardCount - 1;
      tableau[col].push(card);
    }
  }

  // Remaining 50 cards go to stock (5 deals of 10)
  const stock = deck.slice(54).map(card => ({ ...card, faceUp: false }));

  return {
    tableau,
    stock,
    completed: [],
    moves: 0,
    startTime: null,
    isWon: false,
    settings,
  };
}

// Check if a sequence of cards is valid (descending, same suit)
export function isValidSequence(cards: Card[]): boolean {
  if (cards.length === 0) return true;
  if (cards.length === 1) return cards[0].faceUp;

  for (let i = 0; i < cards.length - 1; i++) {
    const current = cards[i];
    const next = cards[i + 1];

    if (!current.faceUp || !next.faceUp) return false;
    if (current.suit !== next.suit) return false;
    if (RANK_VALUES[current.rank] !== RANK_VALUES[next.rank] + 1) return false;
  }

  return true;
}

// Check if cards can be moved to a column
export function canMoveToColumn(cards: Card[], targetColumn: Card[]): boolean {
  if (cards.length === 0) return false;
  if (!cards[0].faceUp) return false;

  // Can always move to empty column
  if (targetColumn.length === 0) return true;

  const topCard = targetColumn[targetColumn.length - 1];
  const movingCard = cards[0];

  // Moving card must be one rank lower than target
  // In Spider, any suit can stack on any suit (but only same-suit sequences can be completed)
  return RANK_VALUES[topCard.rank] === RANK_VALUES[movingCard.rank] + 1;
}

// Get the valid moveable sequence from a position
export function getValidSequence(column: Card[], startIndex: number): Card[] | null {
  if (startIndex < 0 || startIndex >= column.length) return null;

  const sequence = column.slice(startIndex);
  if (sequence.length === 0) return null;
  if (!sequence[0].faceUp) return null;

  if (!isValidSequence(sequence)) return null;

  return sequence;
}

// Check if a column has a complete sequence (K to A, same suit)
export function hasCompleteSequence(column: Card[]): { start: number; cards: Card[] } | null {
  if (column.length < 13) return null;

  // Check from the bottom of the visible (face-up) cards
  for (let i = column.length - 13; i >= 0; i--) {
    const sequence = column.slice(i, i + 13);

    // All cards must be face up
    if (!sequence.every(card => card.faceUp)) continue;

    // Must be K to A
    if (sequence[0].rank !== 'K' || sequence[12].rank !== 'A') continue;

    // Must be same suit and valid sequence
    const suit = sequence[0].suit;
    let valid = true;
    for (let j = 0; j < 12; j++) {
      if (sequence[j].suit !== suit ||
          RANK_VALUES[sequence[j].rank] !== RANK_VALUES[sequence[j + 1].rank] + 1) {
        valid = false;
        break;
      }
    }

    if (valid) {
      return { start: i, cards: sequence };
    }
  }

  return null;
}

// Execute a move
export function executeMove(state: GameState, fromCol: number, cardIndex: number, toCol: number): GameState | null {
  if (fromCol === toCol) return null;

  const column = state.tableau[fromCol];
  const sequence = getValidSequence(column, cardIndex);

  if (!sequence) return null;
  if (!canMoveToColumn(sequence, state.tableau[toCol])) return null;

  // Create new state
  const newTableau = state.tableau.map(col => [...col]);

  // Remove cards from source
  const movedCards = newTableau[fromCol].splice(cardIndex);

  // Add cards to destination
  newTableau[toCol].push(...movedCards);

  // Flip the new top card if there is one and it's face down
  if (newTableau[fromCol].length > 0) {
    const topCard = newTableau[fromCol][newTableau[fromCol].length - 1];
    if (!topCard.faceUp) {
      newTableau[fromCol][newTableau[fromCol].length - 1] = { ...topCard, faceUp: true };
    }
  }

  let newState: GameState = {
    ...state,
    tableau: newTableau,
    moves: state.moves + 1,
    startTime: state.startTime || Date.now(),
  };

  // Check for completed sequences
  newState = checkAndRemoveCompleteSequences(newState);

  return newState;
}

// Check and remove complete sequences
export function checkAndRemoveCompleteSequences(state: GameState): GameState {
  const newTableau = state.tableau.map(col => [...col]);
  const newCompleted = [...state.completed];
  let changed = false;

  for (let col = 0; col < 10; col++) {
    const complete = hasCompleteSequence(newTableau[col]);
    if (complete) {
      // Remove the sequence
      newCompleted.push(newTableau[col].splice(complete.start, 13));
      changed = true;

      // Flip new top card if needed
      if (newTableau[col].length > 0) {
        const topCard = newTableau[col][newTableau[col].length - 1];
        if (!topCard.faceUp) {
          newTableau[col][newTableau[col].length - 1] = { ...topCard, faceUp: true };
        }
      }
    }
  }

  if (!changed) return state;

  const isWon = newCompleted.length === 8;

  return {
    ...state,
    tableau: newTableau,
    completed: newCompleted,
    isWon,
  };
}

// Deal cards from stock
export function dealFromStock(state: GameState): GameState | null {
  if (state.stock.length === 0) return null;

  // Cannot deal if any column is empty
  if (state.tableau.some(col => col.length === 0)) return null;

  const newTableau = state.tableau.map(col => [...col]);
  const newStock = [...state.stock];

  // Deal one card to each column
  for (let col = 0; col < 10; col++) {
    if (newStock.length > 0) {
      const card = { ...newStock.shift()!, faceUp: true };
      newTableau[col].push(card);
    }
  }

  let newState: GameState = {
    ...state,
    tableau: newTableau,
    stock: newStock,
    moves: state.moves + 1,
    startTime: state.startTime || Date.now(),
  };

  // Check for completed sequences
  newState = checkAndRemoveCompleteSequences(newState);

  return newState;
}

// Find the best auto-move for a card
export function findBestMove(state: GameState, fromCol: number, cardIndex: number): number | null {
  const sequence = getValidSequence(state.tableau[fromCol], cardIndex);
  if (!sequence) return null;

  const movingCard = sequence[0];
  let bestCol: number | null = null;
  let bestScore = -1;

  for (let col = 0; col < 10; col++) {
    if (col === fromCol) continue;
    if (!canMoveToColumn(sequence, state.tableau[col])) continue;

    let score = 0;
    const targetColumn = state.tableau[col];

    if (targetColumn.length > 0) {
      const topCard = targetColumn[targetColumn.length - 1];
      // Prefer same suit (better for completing sequences)
      if (topCard.suit === movingCard.suit) {
        score += 100;
      }
      // Prefer columns with more cards (consolidate)
      score += targetColumn.length;
    } else {
      // Moving to empty column - lower priority unless moving a King
      if (movingCard.rank === 'K') {
        score += 50;
      } else {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCol = col;
    }
  }

  return bestCol;
}

// Check if the game is stuck (no moves possible)
export function isGameStuck(state: GameState): boolean {
  // Can we deal?
  if (state.stock.length > 0 && !state.tableau.some(col => col.length === 0)) {
    return false;
  }

  // Can we make any move?
  for (let fromCol = 0; fromCol < 10; fromCol++) {
    const column = state.tableau[fromCol];
    for (let cardIndex = 0; cardIndex < column.length; cardIndex++) {
      if (!column[cardIndex].faceUp) continue;

      const sequence = getValidSequence(column, cardIndex);
      if (!sequence) continue;

      for (let toCol = 0; toCol < 10; toCol++) {
        if (toCol === fromCol) continue;
        if (canMoveToColumn(sequence, state.tableau[toCol])) {
          return false;
        }
      }
    }
  }

  return true;
}

// Deep clone game state
export function cloneGameState(state: GameState): GameState {
  return {
    tableau: state.tableau.map(col => col.map(card => ({ ...card }))),
    stock: state.stock.map(card => ({ ...card })),
    completed: state.completed.map(seq => seq.map(card => ({ ...card }))),
    moves: state.moves,
    startTime: state.startTime,
    isWon: state.isWon,
    settings: { ...state.settings },
  };
}
