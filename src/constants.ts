/* js/constants.js */

// --- Game Constants ---
export const GRID_WIDTH = 6;
export const GRID_HEIGHT = 12; // Playable rows (logical grid height)
export const VISIBLE_GRID_HEIGHT = 12; // Visible grid rows
export const BLOCK_SIZE = 40; // px
export const BLOCK_TYPES = 6; // Number of different block types/colors
export const MIN_MATCH_LENGTH = 3;

// Number of initial rows to pre-fill on game start
export const INITIAL_FILL_ROWS = 3; // Rows 1 through INITIAL_FILL_ROWS

// --- Continuous Rise Constants ---
export const INITIAL_RISE_SPEED = BLOCK_SIZE / 20.0; // Pixels per second (e.g., 1 block every 5 seconds)
export const MAX_RISE_SPEED = BLOCK_SIZE / 0.5;   // Pixels per second (e.g., 1 block every 0.5 seconds)
export const RISE_ACCELERATION = 0.05; // Pixels per second to add
export const SPEED_INCREMENT_ON_COMMIT = 0.2; // Pixels per second increase per row committed

// --- Animation/Timing Constants ---
export const FLASH_DURATION = 400; // ms for blocks to flash
export const INDIVIDUAL_REMOVE_DELAY = 50; // ms delay between each block removal
export const FALL_DURATION = 150; // ms for falling animation
export const SWAP_DURATION = 80; // ms for swap animation

// --- Grid Freeze Settings ---
export const FREEZE_DURATION = 2000; // ms to freeze grid after combos/chains

// --- Audio Assets and related functions removed, now handled by AudioManager.ts ---
