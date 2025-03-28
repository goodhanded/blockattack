/* js/constants.js */

// --- Game Constants ---
const GRID_WIDTH = 6;
const GRID_HEIGHT = 12; // Playable rows (logical grid height)
const VISIBLE_GRID_HEIGHT = 12; // Visible grid rows
const BLOCK_SIZE = 40; // px
const BLOCK_TYPES = 6; // Number of different block types/colors
const MIN_MATCH_LENGTH = 3;

// --- Continuous Rise Constants ---
const INITIAL_RISE_SPEED = BLOCK_SIZE / 15.0; // Pixels per second (e.g., 1 block every 5 seconds)
const MAX_RISE_SPEED = BLOCK_SIZE / 0.5;   // Pixels per second (e.g., 1 block every 0.5 seconds)
const RISE_ACCELERATION = 0.5; // Pixels per second to add (not actively used)
const SPEED_INCREMENT_ON_COMMIT = 1.0; // Pixels per second increase per row committed

const FLASH_DURATION = 400; // ms for blocks to flash
const INDIVIDUAL_REMOVE_DELAY = 50; // ms delay between each block removal
const FALL_DURATION = 150; // ms for falling animation
const SWAP_DURATION = 80; // ms for swap animation

// --- Audio Assets ---
const swapSound = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' + Array(100).join('100'));
const clearSound = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' + Array(150).join('123'));
const gameOverSound = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' + Array(300).join('987'));

let audioContextAllowed = false;

function playSound(sound) {
    if (!audioContextAllowed) return;
    sound.currentTime = 0;
    sound.play().catch(e => console.warn("Audio play failed:", e));
}
