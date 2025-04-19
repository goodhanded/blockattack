// src/Game.ts
import { Grid } from './Grid';
import { Renderer } from './Renderer';
import { InputHandler } from './InputHandler';
import { AudioManager } from './AudioManager';
import { Cursor } from './Cursor';
import { Block } from './Block';
import { GameStatus, BlockState } from './types';
import {
    BLOCK_SIZE,
    INITIAL_RISE_SPEED,
    MAX_RISE_SPEED,
    SPEED_INCREMENT_ON_COMMIT,
    FLASH_DURATION,
    INDIVIDUAL_REMOVE_DELAY,
    FALL_DURATION,
    SWAP_DURATION,
    MIN_MATCH_LENGTH
} from './constants';

/**
 * Orchestrates the entire game, managing state, components, and the main loop.
 */
export class Game {
    // Components
    private grid: Grid;
    private renderer: Renderer;
    private inputHandler: InputHandler;
    private audioManager: AudioManager;
    private cursor: Cursor;

    // Game State
    private status: GameStatus = 'initial';
    private score: number = 0;
    private currentChain: number = 0;
    private isProcessing: boolean = false; // Tracks if swaps, clears, or gravity are active
    private processingStartTimestamp: number = 0; // Tracks when isProcessing was last set to true
    private processingTimeoutMs: number = 2000; // 2 seconds timeout for processing operations

    // Continuous Rise State
    private riseOffset: number = 0; // Pixels the grid has risen visually
    private currentRiseSpeed: number = INITIAL_RISE_SPEED; // Pixels per second
    private lastTimestamp: number = 0;
    private animationFrameId: number | null = null;

    // Async operation tracking
    private activeClearPromises: Promise<void>[] = [];
    
    // Timeout tracking
    private currentFallTimeout: NodeJS.Timeout | null = null;

    constructor(
        gameBoardElement: HTMLElement,
        cursorElement: HTMLElement,
        scoreElement: HTMLElement,
        chainElement: HTMLElement,
        gameOverOverlay: HTMLElement,
        finalScoreElement: HTMLElement,
        audioManager: AudioManager // Pass pre-initialized AudioManager
    ) {
        console.log("Game class constructor started.");

        this.audioManager = audioManager;
        this.grid = new Grid();
        this.cursor = new Cursor(6, 2); // Initial cursor position
        this.renderer = new Renderer(
            gameBoardElement,
            cursorElement,
            scoreElement,
            chainElement,
            gameOverOverlay,
            finalScoreElement
        );
        // Pass the handleSwap method bound to 'this' as the callback
        this.inputHandler = new InputHandler(this.cursor, this.handleSwap.bind(this));

        console.log("Game components initialized.");
    }

    /**
     * Sets the isProcessing flag and logs the state change
     * @param value The new value for isProcessing
     * @param context Description of where this change is happening
     */
    private setProcessingFlag(value: boolean, context: string): void {
        const oldValue = this.isProcessing;
        this.isProcessing = value;

        if (value && !oldValue) {
            // Track when processing starts
            this.processingStartTimestamp = performance.now();
            console.log(`[${context}] PROCESSING START`);
        } else if (!value && oldValue) {
            // Calculate and log processing duration when it ends
            const duration = performance.now() - this.processingStartTimestamp;
            console.log(`[${context}] PROCESSING END after ${duration.toFixed(1)}ms`);
            this.processingStartTimestamp = 0;
        }
    }

    /**
     * Initializes and starts a new game.
     */
    startGame(): void {
        if (this.status === 'running') return;
        console.log("Starting new game...");

        this.status = 'running';
        this.score = 0;
        this.currentChain = 0;
        this.isProcessing = false;
        this.riseOffset = 0;
        this.currentRiseSpeed = INITIAL_RISE_SPEED;
        this.lastTimestamp = 0;
        this.activeClearPromises = [];
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;

        this.renderer.clearBoard();
        this.grid.resetGrid();
        
        // Fill initial visible rows (1-6)
        this.grid.fillInitialBlocks(); 
        
        // Generate the row at position 0 (below visible grid)
        // This is important to have ready at the start so there's no gap
        const initialBottomRow = this.grid.generateNewRow();

        // Render initial state including all blocks
        const initialBlocks = this.grid.getAllBlocks();
        initialBlocks.forEach(block => {
            this.renderer.createBlockElement(block);
            this.renderer.updateBlockVisuals(block, this.riseOffset);
        });
        
        this.renderer.updateScoreDisplay(this.score);
        this.renderer.updateChainDisplay(this.currentChain);
        this.renderer.hideGameOver();
        this.renderer.renderCursor(this.cursor, this.riseOffset);

        this.inputHandler.setupEventListeners();

        console.log("Game initialized. Starting game loop.");
        this.startGameLoop();

        // Initial check for matches (unlikely with proper fill, but good practice)
        this.checkMatchesAndProcess();
    }

    /**
     * Restarts the game.
     */
    restartGame(): void {
        console.log("Restarting game...");
        this.inputHandler.removeEventListeners(); // Disable input during reset
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        // Reset promises and processing state
        this.activeClearPromises = [];
        this.isProcessing = false;
        this.status = 'initial';

        // Start a new game after a brief delay to ensure cleanup
        setTimeout(() => {
            this.startGame();
        }, 50); // Small delay
    }

    /**
     * Starts the main game loop using requestAnimationFrame.
     */
    private startGameLoop(): void {
        if (this.status !== 'running') return;
        this.lastTimestamp = performance.now();
        this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
    }

    /**
     * The main game loop function.
     * @param timestamp The current time provided by requestAnimationFrame.
     */
    private gameLoop(timestamp: number): void {
        if (this.status !== 'running') {
            this.animationFrameId = null;
            return;
        }

        const deltaTime = (timestamp - this.lastTimestamp) / 1000.0; // Delta time in seconds
        this.lastTimestamp = timestamp;

        // Update rise offset - smooth continuous motion
        this.riseOffset += this.currentRiseSpeed * deltaTime;

        // Check if a full block height has been reached
        if (this.riseOffset >= BLOCK_SIZE) {
            // Important: Store fractional part of rise offset before resetting
            const fractionalOffset = this.riseOffset % BLOCK_SIZE;
            const logicalRowsToCommit = Math.floor(this.riseOffset / BLOCK_SIZE);
            
            // Update cursor position BEFORE committing rise to maintain its relative position
            this.cursor.setPosition(this.cursor.row + logicalRowsToCommit, this.cursor.col);

            // IMPORTANT: First update all block visuals with the FULL rise offset
            // This ensures they're visually at the exact position before the "jump back"
            this.render();

            // Now reset rise offset to only the fractional part and shift the grid
            this.riseOffset = fractionalOffset;

            for (let i = 0; i < logicalRowsToCommit; i++) {
                if (this.status !== 'running') break;
                this.commitLogicalRise();
            }

            // Immediately render again with the new grid position and reset riseOffset
            // This eliminates any discontinuity in the visual position
            this.render();
            
            // Re-check game over after all commits are done
            if (this.status === 'running' && this.grid.checkGameOverCondition()) {
                this.triggerGameOver("Block reached top after commit.");
                return; // Exit loop immediately
            }
        }

        // For smoothness, we only want to render once per frame unless we're
        // processing a logical rise (which we already handled above)
        else {
            // Check for stuck processing flag on EVERY frame
            this.checkAndResetProcessingFlag(timestamp);
            
            // Render the current state
            this.render();
        }

        // Request the next frame
        this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
    }

    /**
     * Renders the current game state using the Renderer.
     */
    private render(): void {
        // Update all block visuals (position, state, rise offset)
        this.grid.getAllBlocks().forEach(block => {
            this.renderer.updateBlockVisuals(block, this.riseOffset);
        });
        // Update cursor position
        this.renderer.renderCursor(this.cursor, this.riseOffset);
        // Score and chain are updated when they change, but could be updated here too if needed.
    }

    /**
     * Handles the logical consequences of the grid rising one full block height.
     */
    private commitLogicalRise(): void {
        if (this.status !== 'running') return;
        console.log("Committing logical rise.");

        // Do not change cursor position first - let it naturally rise with blocks
        // This is key to preventing the "drop down" effect on the cursor

        this.grid.shiftRowsUp(); // Shift existing blocks up logically

        // Check for game over immediately after shift
        if (this.grid.checkGameOverCondition()) {
            this.triggerGameOver("Block pushed into buffer row during commit.");
            return;
        }

        // Generate new row at the bottom (row 0)
        const newRowBlocks = this.grid.generateNewRow();
        
        // Immediately render the new blocks with the current rise offset
        newRowBlocks.forEach(block => {
            // Force idle state to prevent unintended gravity
            block.setState('idle');
            this.renderer.createBlockElement(block);
            this.renderer.updateBlockVisuals(block, this.riseOffset);
        });

        // Increase rise speed
        if (this.currentRiseSpeed < MAX_RISE_SPEED) {
            this.currentRiseSpeed += SPEED_INCREMENT_ON_COMMIT;
            this.currentRiseSpeed = Math.min(this.currentRiseSpeed, MAX_RISE_SPEED);
        }

        // Check for matches without applying unwanted gravity
        if (!this.isProcessing) {
            const matches = this.grid.findMatches();
            if (matches.length > 0) {
                this.setProcessingFlag(true, "new-row-match-check");
                
                // Convert matches to a flat array of unique blocks
                const uniqueBlocksToClear = Array.from(
                    new Set(matches.flat().filter(b => b !== null))
                );
                
                this.initiateClearing(uniqueBlocksToClear);
            }
        }
    }

    /**
     * Handles the swap request from the InputHandler.
     * @param row The row of the swap.
     * @param col1 The column of the first block.
     * @param col2 The column of the second block.
     */
    private handleSwap(row: number, col1: number, col2: number): void {
        if (this.status !== 'running' || this.isProcessing) {
            console.log(`Swap ignored: Status=${this.status}, Processing=${this.isProcessing}`);
            return;
        }

        const block1 = this.grid.getBlock(row, col1);
        const block2 = this.grid.getBlock(row, col2);

        // Prevent swapping empty spaces or blocks that are not idle/falling/swapping
        // Allow swapping falling blocks to enable advanced techniques
        const canSwap = (b: Block | null) => !b || ['idle', 'falling', 'swapping'].includes(b.state);

        if (!canSwap(block1) || !canSwap(block2)) {
            console.log("Cannot swap blocks in current state.");
            return;
        }

        console.log(`Handling swap at (${row}, ${col1}) <-> (${row}, ${col2})`);
        this.setProcessingFlag(true, "swap"); // Mark as processing START of swap

        // Perform the logical swap in the grid
        const swapped = this.grid.swapBlocks(row, col1, col2);

        if (swapped) {
            this.audioManager.playSound('swap');

            // Update visuals immediately for swapped blocks
            if (block1) this.renderer.updateBlockVisuals(block1, this.riseOffset);
            if (block2) this.renderer.updateBlockVisuals(block2, this.riseOffset);

            // After the swap animation duration, reset state and check gravity/matches
            setTimeout(() => {
                if (block1) block1.setState('idle');
                if (block2) block2.setState('idle');

                // Update visuals again after state reset
                if (block1) this.renderer.updateBlockVisuals(block1, this.riseOffset);
                if (block2) this.renderer.updateBlockVisuals(block2, this.riseOffset);

                // Apply gravity first, then check matches in the callback
                this.applyGravity(() => {
                    this.checkMatchesAndProcess(); // Check for matches after gravity settles
                });
            }, SWAP_DURATION);
        } else {
            this.setProcessingFlag(false, "swap-failed"); // Reset processing flag if swap didn't happen
        }
    }

    /**
     * Checks for matches and initiates the clearing process if matches are found.
     */
    private checkMatchesAndProcess(): void {
        if (this.status !== 'running') return;

        // Skip processing only if there are actual operations in progress
        // If isProcessing is true but no active clear promises, we might be stuck - proceed anyway
        if (this.isProcessing && this.activeClearPromises.length > 0) {
            console.log("checkMatchesAndProcess: Skipped, active clearing in progress.");
            return;
        }

        // Always reset processing flag before starting, in case it was stuck
        if (this.isProcessing && this.activeClearPromises.length === 0) {
            console.warn("Processing flag found true with no active clears - resetting before continuing");
            this.setProcessingFlag(false, "match-check-pre-reset");
        }

        // Check for game over before processing matches
        if (this.grid.checkGameOverCondition()) {
            this.triggerGameOver("Stable block detected in buffer row before match check.");
            return;
        }

        // Now safely set processing flag
        this.setProcessingFlag(true, "match-check");
        const matches = this.grid.findMatches();

        if (matches.length > 0) {
            console.log(`Found ${matches.length} match groups. Chain: ${this.currentChain}`);
            this.currentChain++;
            this.renderer.updateChainDisplay(this.currentChain);
            this.audioManager.playSound('clear');

            let pointsEarned = 0;
            const basePointsPerBlock = 10;
            let comboBonus = 0;
            const chainBonus = this.currentChain > 1 ? (this.currentChain - 1) * 50 : 0;

            const uniqueBlocksToClear = new Set<Block>();
            matches.forEach(matchList => {
                matchList.forEach(block => {
                    // Only add idle blocks to the clear set
                    if (block && block.state === 'idle') {
                        uniqueBlocksToClear.add(block);
                    }
                });
                // Combo bonus for matches larger than the minimum
                if (matchList.length > MIN_MATCH_LENGTH) {
                    comboBonus += (matchList.length - MIN_MATCH_LENGTH) * 15;
                }
            });

            if (uniqueBlocksToClear.size === 0) {
                console.warn("Matches found, but no idle blocks to clear.");
                this.setProcessingFlag(false, "match-check-no-clears");

                this.applyGravity(() => {
                    this.checkMatchesAndProcess();
                });
                return;
            }

            pointsEarned = uniqueBlocksToClear.size * basePointsPerBlock + comboBonus + chainBonus;
            this.score += pointsEarned;
            this.renderer.updateScoreDisplay(this.score);

            this.initiateClearing(Array.from(uniqueBlocksToClear));

        } else {
            // No matches found
            if (this.currentChain > 0) {
                console.log(`Chain ended at x${this.currentChain}`);
                this.currentChain = 0;
                this.renderer.updateChainDisplay(this.currentChain);
            }

            // Only release processing lock if no clears are active
            if (this.activeClearPromises.length === 0) {
                this.setProcessingFlag(false, "match-check-no-matches");
            } else {
                console.log(`checkMatchesAndProcess: No matches, but ${this.activeClearPromises.length} clears are still active.`);
            }
        }
    }

    /**
     * Initiates the flashing and subsequent removal of matched blocks.
     * @param blocksToClear Array of Block objects to clear.
     */
    private initiateClearing(blocksToClear: Block[]): void {
        if (this.status !== 'running') return;

        console.log(`Initiating clear for ${blocksToClear.length} blocks. Chain: ${this.currentChain}`);

        // Set blocks to flashing state
        blocksToClear.forEach(block => {
            block.setState('flashing');
            this.renderer.updateBlockVisuals(block, this.riseOffset); // Update visuals for flashing
        });

        try {
            // Declare clearPromise outside the Promise constructor
            let clearPromise: Promise<void>;
            
            // Create a promise that resolves after blocks are removed and gravity is applied
            clearPromise = new Promise<void>((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    if (this.status !== 'running') {
                        console.log("Clear aborted due to game status change.");
                        return reject(new Error("Game ended during clear delay"));
                    }

                    try {
                        // Sort blocks for consistent removal order (optional, but nice)
                        const sortedBlocks = [...blocksToClear].sort((a, b) => {
                            if (a.row !== b.row) return a.row - b.row; // Bottom-up
                            return a.col - b.col; // Left-to-right
                        });
                        this.removeBlocksSequentially(sortedBlocks, resolve, reject); // Pass reject
                    } catch (err) {
                        console.error("Error in flash timeout callback:", err);
                        reject(err);
                    }
                }, FLASH_DURATION);
                
                // Store the timeout ID directly on the Promise object
                (clearPromise as any).timeoutId = timeoutId;
            });

            this.activeClearPromises.push(clearPromise);

            // When this specific clear sequence finishes (including gravity)...
            clearPromise.then(() => {
                console.log("Clear promise resolved.");
                // Remove this promise from the active list
                this.activeClearPromises = this.activeClearPromises.filter(p => p !== clearPromise);
                // Check for more matches ONLY if this was the last active clear
                if (this.activeClearPromises.length === 0) {
                    console.log("Last clear finished, checking for new matches.");
                    this.setProcessingFlag(false, "clear-complete"); // Release lock BEFORE checking again
                    this.checkMatchesAndProcess();
                } else {
                    console.log(`${this.activeClearPromises.length} clears still active.`);
                }
            }).catch(error => {
                console.error("Error during clearing process:", error);
                this.activeClearPromises = this.activeClearPromises.filter(p => p !== clearPromise);
                // Ensure processing lock is released on error if no other clears are active
                if (this.activeClearPromises.length === 0) {
                    console.log("All clear promises resolved/rejected. Releasing processing lock.");
                    this.setProcessingFlag(false, "clear-error");
                }
            });
        } catch (error) {
            console.error("Critical error initializing clearing process:", error);
            // Always reset processing if we encounter a critical error
            this.setProcessingFlag(false, "critical-error");
        }
    }

    /**
     * Removes blocks one by one with a delay, then applies gravity.
     * @param blocksToRemove Array of Block objects remaining to be removed.
     * @param onComplete Callback function to call when all blocks are removed and gravity is done.
     * @param onError Callback function for errors during removal.
     */
    private removeBlocksSequentially(
        blocksToRemove: Block[],
        onComplete: () => void,
        onError: (reason?: any) => void
    ): void {
        if (this.status !== 'running') {
            console.log("Sequential removal aborted due to game status change.");
            return onError(new Error("Game ended during sequential removal"));
        }

        const block = blocksToRemove.shift(); // Get the next block

        if (block) {
            // Double-check the block is still in the grid and in a clearable state
            const gridBlock = this.grid.getBlock(block.row, block.col);
            if (gridBlock && gridBlock.id === block.id && (block.state === 'flashing' || block.state === 'clearing')) {
                block.setState('clearing'); // Mark as logically clearing
                this.renderer.updateBlockVisuals(block, this.riseOffset); // Update visuals (e.g., opacity via CSS)

                // Logically remove from grid AFTER visual state is set
                this.grid.clearBlock(block.row, block.col);

                // Schedule visual removal from DOM slightly later
                setTimeout(() => {
                    if (this.status === 'running') { // Check status again before DOM removal
                        this.renderer.removeBlockElement(block);
                    }
                }, 100); // Delay matching CSS transition for opacity
            } else {
                console.warn(`Skipping removal of block ${block.id}: Grid mismatch or state changed. State: ${block.state}, Grid: ${gridBlock?.id}`);
            }
        }

        // If more blocks remain, schedule the next removal
        if (blocksToRemove.length > 0) {
            setTimeout(() => {
                this.removeBlocksSequentially(blocksToRemove, onComplete, onError);
            }, INDIVIDUAL_REMOVE_DELAY);
        } else {
            // Last block removed, now apply gravity
            // Use requestAnimationFrame to ensure DOM updates are flushed before gravity logic
            requestAnimationFrame(() => {
                if (this.status === 'running') {
                    this.applyGravity(onComplete); // Gravity application calls onComplete when done
                } else {
                    onError(new Error("Game ended before gravity after removal"));
                }
            });
        }
    }

    /**
     * Applies gravity to make blocks fall into empty spaces.
     * @param onComplete Callback function to call after gravity settles.
     */
    private applyGravity(onComplete?: () => void): void {
        if (this.status !== 'running') {
            this.setProcessingFlag(false, "gravity-game-not-running");
            if (onComplete) onComplete(); // Still call callback if provided
            return;
        }

        const blocksFell = this.grid.applyGravity(); // Grid handles logical falling

        if (blocksFell) {
            // Update visuals for falling blocks immediately
            this.grid.getAllBlocks().forEach(block => {
                if (block.state === 'falling') {
                    this.renderer.updateBlockVisuals(block, this.riseOffset);
                }
            });

            // Store the timeout ID for possible cleanup
            const fallTimeoutId = setTimeout(() => {
                if (this.status !== 'running') {
                    this.setProcessingFlag(false, "gravity-timeout-game-not-running");
                    if (onComplete) onComplete();
                    return;
                }

                this.grid.getAllBlocks().forEach(block => {
                    if (block.state === 'falling') {
                        block.setState('idle');
                        this.renderer.updateBlockVisuals(block, this.riseOffset); // Update visual state
                    }
                });

                // Check if there are new matches formed after blocks fell
                const newMatches = this.grid.findMatches();

                // If we found new matches, make sure we process them for chain reactions
                if (newMatches.length > 0) {
                    console.log(`Found ${newMatches.length} new match groups after gravity. Continuing chain.`);
                    
                    // Call the completion callback first if provided
                    if (onComplete) onComplete();
                    
                    // Process the new matches to start the chain reaction
                    this.checkMatchesAndProcess();
                    return;
                }

                // When no active clear promises and no matches, explicitly reset processing flag
                if (this.activeClearPromises.length === 0) {
                    console.log("No active clear promises, gravity complete");
                    if (newMatches.length === 0) {
                        console.log("No matches found after gravity, releasing processing lock");
                        this.setProcessingFlag(false, "gravity-complete-no-matches");
                    } else {
                        console.log("Matches found after gravity, keeping processing lock");
                    }
                } else {
                    console.log(`${this.activeClearPromises.length} clears still active after gravity`);
                }

                // Gravity finished, call the completion callback (which might trigger checkMatchesAndProcess)
                if (onComplete) onComplete();
            }, FALL_DURATION);

            // Store timeout for potential cleanup
            this.currentFallTimeout = fallTimeoutId;
        } else {
            // No blocks fell, explicitly reset processing flag if no other activities
            if (this.activeClearPromises.length === 0) {
                console.log("No blocks fell and no active clear promises, releasing processing lock");
                this.setProcessingFlag(false, "gravity-no-blocks-fell");
            } else {
                console.log(`No blocks fell but ${this.activeClearPromises.length} clears are still active`);
            }
            // Call completion callback immediately
            if (onComplete) onComplete();
        }
    }

    /**
     * Emergency method to force reset the processing flag if stuck
     * Will be called on every frame
     * @param timestamp Current timestamp from requestAnimationFrame
     */
    private checkAndResetProcessingFlag(timestamp: number): void {
        // Case 1: Check for timeout - if processing has been active for too long
        if (this.isProcessing && this.processingStartTimestamp > 0) {
            const processingDuration = timestamp - this.processingStartTimestamp;
            if (processingDuration > this.processingTimeoutMs) {
                console.warn(`Processing timeout after ${processingDuration.toFixed(1)}ms! Forcing reset...`);
                this.setProcessingFlag(false, "timeout-reset");
                return;
            }
        }

        // Case 2: Check for stuck state - if processing is true but no active operations
        if (this.isProcessing && 
            this.activeClearPromises.length === 0 &&
            this.grid.findMatches().length === 0 &&
            !this.grid.isAnyBlockInState(['falling', 'swapping', 'flashing', 'clearing'])) {
            
            console.warn("Processing flag stuck in true state! Resetting to allow input...");
            this.setProcessingFlag(false, "stuck-state-reset");
        }
    }

    /**
     * Triggers the game over state.
     * @param reason A string explaining why the game ended.
     */
    private triggerGameOver(reason: string): void {
        if (this.status === 'gameover') return; // Already game over
        console.error("Game Over:", reason);

        this.status = 'gameover';
        this.inputHandler.removeEventListeners(); // Disable input

        // Stop the game loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Clear any pending timeouts or promises related to game logic
        this.activeClearPromises = []; // Clear promises array
        this.isProcessing = true; // Prevent any further processing

        this.audioManager.playSound('gameOver');

        // Final render to ensure blocks are in correct final positions without rise offset
        this.riseOffset = 0;
        this.render(); // Render final state

        // Show game over overlay using the renderer
        this.renderer.showGameOver(this.score);
    }
}
