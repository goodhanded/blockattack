// src/Renderer.ts
import { Block } from './Block';
import { Cursor } from './Cursor';
import { BLOCK_SIZE, VISIBLE_GRID_HEIGHT, GRID_WIDTH } from './constants';

/**
 * Handles all rendering tasks and direct DOM manipulation.
 */
export class Renderer {
    private gameBoardElement: HTMLElement;
    private cursorElement: HTMLElement;
    private scoreElement: HTMLElement;
    private chainElement: HTMLElement;
    private gameOverOverlay: HTMLElement;
    private finalScoreElement: HTMLElement;

    // Map to store block elements by block ID for quick access
    private blockElements: Map<number, HTMLElement> = new Map();

    constructor(
        gameBoardElement: HTMLElement,
        cursorElement: HTMLElement,
        scoreElement: HTMLElement,
        chainElement: HTMLElement,
        gameOverOverlay: HTMLElement,
        finalScoreElement: HTMLElement
    ) {
        this.gameBoardElement = gameBoardElement;
        this.cursorElement = cursorElement;
        this.scoreElement = scoreElement;
        this.chainElement = chainElement;
        this.gameOverOverlay = gameOverOverlay;
        this.finalScoreElement = finalScoreElement;

        // Set fixed dimensions for the game board
        // Add 6px to account for the border (3px on each side)
        this.gameBoardElement.style.width = `${(GRID_WIDTH * BLOCK_SIZE) + 6}px`;
        this.gameBoardElement.style.height = `${(VISIBLE_GRID_HEIGHT * BLOCK_SIZE) + 6}px`;
    }

    /**
     * Creates and adds a DOM element for a given block.
     * @param block The Block instance to render.
     */
    createBlockElement(block: Block): void {
        if (this.blockElements.has(block.id)) {
            console.warn(`Block element for ID ${block.id} already exists.`);
            return;
        }

        const blockElement = document.createElement('div');
        blockElement.classList.add('block', `block-type-${block.type}`);
        blockElement.dataset.id = block.id.toString();
        block.setElement(blockElement); // Link the element in the Block instance
        this.blockElements.set(block.id, blockElement);

        // Initial position and state update
        this.updateBlockVisuals(block, 0); // Initial render with zero offset

        this.gameBoardElement.appendChild(blockElement);
    }

    /**
     * Removes the DOM element associated with a block.
     * @param block The Block instance whose element should be removed.
     */
    removeBlockElement(block: Block): void {
        const element = this.blockElements.get(block.id);
        if (element) {
            element.remove();
            this.blockElements.delete(block.id);
            block.setElement(null); // Unlink element in the Block instance
        } else {
            // console.warn(`Attempted to remove non-existent element for block ID ${block.id}`);
        }
    }

    /**
     * Updates the visual position, state classes, and rise offset of a block element.
     * @param block The Block instance to update.
     * @param riseOffset The current global rise offset in pixels.
     */
    updateBlockVisuals(block: Block, riseOffset: number): void {
        const element = this.blockElements.get(block.id);
        if (!element) return;

        // Calculate horizontal position (always the same logic)
        const targetX = block.col * BLOCK_SIZE;
        
        // Calculate vertical position - convert logical grid coordinates to screen coordinates
        // Row 0 is the bottom of the grid, VISIBLE_GRID_HEIGHT is at the top
        const visualRow = VISIBLE_GRID_HEIGHT - block.row;
        const targetY = visualRow * BLOCK_SIZE;

        // We'll set these calculated positions as data attributes so they're not lost
        // during style updates
        element.dataset.baseX = targetX.toString();
        element.dataset.baseY = targetY.toString();

        // Set the base position without transition effect
        element.style.left = `${targetX}px`;
        element.style.top = `${targetY}px`;
        
        // Apply the rise offset in pure transform with no transition
        element.style.transform = `translateY(${-riseOffset}px)`;

        // Update state classes
        this.setBlockStateClass(element, block);
    }

    /**
     * Applies the correct CSS class based on the block's state.
     * @param element The HTMLElement of the block.
     * @param block The Block instance.
     */
    private setBlockStateClass(element: HTMLElement, block: Block): void {
        element.classList.remove('falling', 'swapping', 'flashing'); // Clear previous states
        element.style.opacity = '1'; // Reset opacity
        element.style.animation = 'none'; // Reset animation

        switch (block.state) {
            case 'falling':
                element.classList.add('falling');
                break;
            case 'swapping':
                element.classList.add('swapping');
                break;
            case 'flashing':
                element.classList.add('flashing');
                // Re-trigger animation if needed
                element.style.animation = ''; // Clear previous animation property if set to none
                void element.offsetWidth; // Trigger reflow
                element.style.animation = 'flash 0.4s infinite alternate';
                break;
            case 'clearing':
                // Opacity handled by removeBlocksSequentially in game logic for now
                // Could add a specific 'clearing' class if needed for transitions
                element.style.opacity = '0';
                break;
            case 'idle':
                // No specific class needed
                break;
        }
    }

    /**
     * Updates the visual position of the cursor element.
     * @param cursor The Cursor instance.
     * @param riseOffset The current global rise offset in pixels.
     */
    renderCursor(cursor: Cursor, riseOffset: number): void {
        // Calculate visual position (Y is inverted, similar to blocks)
        const visualRow = VISIBLE_GRID_HEIGHT - cursor.row;
        const targetY = visualRow * BLOCK_SIZE;
        const targetX = cursor.col * BLOCK_SIZE;

        this.cursorElement.style.left = `${targetX}px`;
        this.cursorElement.style.top = `${targetY}px`;
        
        // Apply the same transformation as blocks to ensure cursor rises smoothly with them
        // This ensures the cursor stays in the same relative position during rises
        this.cursorElement.style.transform = `translateY(${-riseOffset}px)`;
        this.cursorElement.style.display = 'block'; // Ensure visible
    }

    /** Updates the score display text. */
    updateScoreDisplay(score: number): void {
        this.scoreElement.textContent = `Score: ${score}`;
    }

    /** Updates the chain display text. */
    updateChainDisplay(chain: number): void {
        this.chainElement.textContent = `Chain: x${chain}`;
    }

    /** Shows the game over overlay with the final score. */
    showGameOver(score: number): void {
        this.finalScoreElement.textContent = `Final Score: ${score}`;
        this.gameOverOverlay.style.display = 'flex';
        this.cursorElement.style.display = 'none'; // Hide cursor
    }

    /** Hides the game over overlay. */
    hideGameOver(): void {
        this.gameOverOverlay.style.display = 'none';
    }

    /** Removes all block elements from the game board. */
    clearBoard(): void {
        this.blockElements.forEach(element => element.remove());
        this.blockElements.clear();
        console.log("Renderer cleared board elements.");
    }

    /** Hides the cursor element. */
    hideCursor(): void {
        this.cursorElement.style.display = 'none';
    }
}
