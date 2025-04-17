
// src/types.ts

/** Represents the possible states a block can be in. */
export type BlockState = 'idle' | 'swapping' | 'falling' | 'flashing' | 'clearing';

/** Represents a position on the grid. */
export interface Position {
  row: number;
  col: number;
}

/** Represents the type (color) of a block. */
export type BlockType = number; // Typically 0-5

/** Represents the data associated with a single block. */
export interface BlockData {
  id: number;
  row: number;
  col: number;
  type: BlockType;
  state: BlockState;
  element?: HTMLElement | null; // Optional reference to the DOM element
}

/** Represents the player's cursor. */
export interface CursorData extends Position {
  // Potentially add state if the cursor has different modes
}

/** Represents the overall game state. */
export type GameStatus = 'initial' | 'running' | 'paused' | 'gameover';

