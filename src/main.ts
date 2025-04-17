// src/main.ts
import { Game } from './Game';
import { AudioManager } from './AudioManager';

console.log("Block Attack loading...");

// --- DOM Element Retrieval ---
const gameContainer = document.getElementById('game-container');
const startOverlay = document.getElementById('start-overlay');
const startButton = document.getElementById('start-button');
const gameOverOverlay = document.getElementById('game-over-overlay');
const restartButton = document.getElementById('restart-button');
const gameBoardElement = document.getElementById('game-board');
const scoreElement = document.getElementById('score');
const chainElement = document.getElementById('chain');
const cursorElement = document.getElementById('cursor');
const finalScoreElement = document.getElementById('final-score'); // Added for Game class

// --- Basic Error Handling ---
if (!gameContainer || !startOverlay || !startButton || !gameOverOverlay || !restartButton || !gameBoardElement || !scoreElement || !chainElement || !cursorElement || !finalScoreElement) {
    console.error("Fatal Error: Could not find all required DOM elements.");
    // Potentially display an error message to the user
} else {
    // --- Game Initialization ---
    let game: Game | null = null;
    let audioManager: AudioManager | null = null;

    console.log("DOM elements found.");

    // --- Event Listeners for Start/Restart ---
    startButton?.addEventListener('click', () => {
        console.log("Start button clicked");
        // Hide start overlay
        startOverlay.style.display = 'none';

        // Initialize and start the game
        if (!audioManager) {
            audioManager = new AudioManager();
            audioManager.allowAudio(); // Attempt to enable audio on user interaction
        }
        if (!game) {
            // Ensure all required elements are passed to the Game constructor
            game = new Game(
                gameBoardElement!,
                cursorElement!,
                scoreElement!,
                chainElement!,
                gameOverOverlay!,
                finalScoreElement!,
                audioManager!
            );
        }
        game.startGame();
    });

    restartButton?.addEventListener('click', () => {
        console.log("Restart button clicked");
        // Hide game over overlay - Game class will handle this on restart
        // gameOverOverlay.style.display = 'none';

        // Restart the game
        game?.restartGame();
    });

    console.log("Event listeners added.");

    // --- Initial State ---
    // Show start overlay initially
    startOverlay.style.display = 'flex';
    gameOverOverlay.style.display = 'none';
    cursorElement.style.display = 'none'; // Hide cursor until game starts

    console.log("Block Attack setup complete. Waiting for user interaction.");
}
