'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import {
  GameState,
  GameSettings,
  DEFAULT_SETTINGS,
} from '@/lib/types';
import {
  initializeGame,
  executeMove,
  dealFromStock,
  findBestMove,
  cloneGameState,
} from '@/lib/gameEngine';

interface GameContextType {
  gameState: GameState;
  canUndo: boolean;
  canRedo: boolean;
  moveCards: (fromCol: number, cardIndex: number, toCol: number) => boolean;
  autoMove: (fromCol: number, cardIndex: number) => boolean;
  deal: () => boolean;
  undo: () => void;
  redo: () => void;
  newGame: (settings?: GameSettings) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
}

const GameContext = createContext<GameContextType | null>(null);

type Action =
  | { type: 'SET_STATE'; state: GameState }
  | { type: 'MOVE'; fromCol: number; cardIndex: number; toCol: number }
  | { type: 'DEAL' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'NEW_GAME'; settings?: GameSettings }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<GameSettings> };

interface StateWithHistory {
  current: GameState;
  history: GameState[]; // Past states for undo
  future: GameState[]; // Future states for redo
}

function reducer(state: StateWithHistory, action: Action): StateWithHistory {
  switch (action.type) {
    case 'SET_STATE':
      return {
        ...state,
        current: action.state,
      };

    case 'MOVE': {
      const newState = executeMove(
        state.current,
        action.fromCol,
        action.cardIndex,
        action.toCol
      );
      if (!newState) return state;

      return {
        current: newState,
        history: [...state.history, cloneGameState(state.current)],
        future: [], // Clear redo stack on new move
      };
    }

    case 'DEAL': {
      const newState = dealFromStock(state.current);
      if (!newState) return state;

      return {
        current: newState,
        history: [...state.history, cloneGameState(state.current)],
        future: [],
      };
    }

    case 'UNDO': {
      if (state.history.length === 0) return state;

      const previousState = state.history[state.history.length - 1];
      return {
        current: previousState,
        history: state.history.slice(0, -1),
        future: [cloneGameState(state.current), ...state.future],
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;

      const nextState = state.future[0];
      return {
        current: nextState,
        history: [...state.history, cloneGameState(state.current)],
        future: state.future.slice(1),
      };
    }

    case 'NEW_GAME': {
      const settings = action.settings || state.current.settings;
      return {
        current: initializeGame(settings),
        history: [],
        future: [],
      };
    }

    case 'UPDATE_SETTINGS': {
      return {
        ...state,
        current: {
          ...state.current,
          settings: {
            ...state.current.settings,
            ...action.settings,
          },
        },
      };
    }

    default:
      return state;
  }
}

const STORAGE_KEY = 'frosty-spider-solitaire';
const SETTINGS_KEY = 'frosty-spider-settings';

// Create a deterministic placeholder state for SSR (same on server and client)
// This prevents hydration mismatch since actual game init happens in useEffect
function createPlaceholderState(): GameState {
  return {
    tableau: Array(10).fill(null).map(() => []),
    stock: [],
    completed: [],
    moves: 0,
    startTime: null,
    isWon: false,
    settings: DEFAULT_SETTINGS,
  };
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = React.useState(false);
  const [state, dispatch] = useReducer(reducer, null, () => {
    // Initialize with empty placeholder - same on server and client
    return {
      current: createPlaceholderState(),
      history: [],
      future: [],
    };
  });

  // Load saved game and settings on mount (client-only)
  useEffect(() => {
    setIsClient(true);
    try {
      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      const settings: GameSettings = savedSettings
        ? { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) }
        : DEFAULT_SETTINGS;

      const savedGame = localStorage.getItem(STORAGE_KEY);
      if (savedGame) {
        const parsed = JSON.parse(savedGame);
        // Restore saved game with settings
        dispatch({
          type: 'SET_STATE',
          state: { ...parsed, settings },
        });
      } else {
        // Start new game with loaded settings
        dispatch({ type: 'NEW_GAME', settings });
      }
    } catch {
      // If parsing fails, start fresh
      dispatch({ type: 'NEW_GAME' });
    }
  }, []);

  // Save game state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.current));
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.current.settings));
    } catch {
      // Ignore storage errors
    }
  }, [state.current]);

  const moveCards = useCallback(
    (fromCol: number, cardIndex: number, toCol: number): boolean => {
      const stateBefore = state.current;
      dispatch({ type: 'MOVE', fromCol, cardIndex, toCol });
      // Check if state actually changed (move was valid)
      return true; // The reducer handles invalid moves by returning same state
    },
    [state.current]
  );

  const autoMove = useCallback(
    (fromCol: number, cardIndex: number): boolean => {
      const targetCol = findBestMove(state.current, fromCol, cardIndex);
      if (targetCol === null) return false;
      dispatch({ type: 'MOVE', fromCol, cardIndex, toCol: targetCol });
      return true;
    },
    [state.current]
  );

  const deal = useCallback((): boolean => {
    if (state.current.stock.length === 0) return false;
    if (state.current.tableau.some(col => col.length === 0)) return false;
    dispatch({ type: 'DEAL' });
    return true;
  }, [state.current]);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const newGame = useCallback((settings?: GameSettings) => {
    dispatch({ type: 'NEW_GAME', settings });
  }, []);

  const updateSettings = useCallback((settings: Partial<GameSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', settings });
  }, []);

  const value: GameContextType = {
    gameState: state.current,
    canUndo: state.history.length > 0,
    canRedo: state.future.length > 0,
    moveCards,
    autoMove,
    deal,
    undo,
    redo,
    newGame,
    updateSettings,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
