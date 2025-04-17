
// src/InputHandler.ts
import { Cursor } from './Cursor';

/** Type definition for the swap callback function. */
type SwapCallback = (row: number, col1: number, col2: number) => void;

/**
 * Manages user input (keyboard) and translates it into game actions.
 */
export class InputHandler {
    private cursor: Cursor;
    private swapCallback: SwapCallback;
    private isEnabled: boolean = false;

    // Bound event listener function to maintain 'this' context
    private handleKeyDownBound: (event: KeyboardEvent) => void;

    constructor(cursor: Cursor, swapCallback: SwapCallback) {
        this.cursor = cursor;
        this.swapCallback = swapCallback;
        this.handleKeyDownBound = this.handleKeyDown.bind(this);
        console.log("InputHandler initialized.");
    }

    /**
     * Sets up keyboard event listeners.
     */
    setupEventListeners(): void {
        if (this.isEnabled) return;
        document.addEventListener('keydown', this.handleKeyDownBound);
        this.isEnabled = true;
        console.log("Input listeners enabled.");
    }

    /**
     * Removes keyboard event listeners.
     */
    removeEventListeners(): void {
        if (!this.isEnabled) return;
        document.removeEventListener('keydown', this.handleKeyDownBound);
        this.isEnabled = false;
        console.log("Input listeners disabled.");
    }

    /**
     * Handles the keydown event.
     * @param event The KeyboardEvent object.
     */
    private handleKeyDown(event: KeyboardEvent): void {
        if (!this.isEnabled) return;

        // Prevent default browser behavior for arrow keys and space
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyX'].includes(event.code)) {
            event.preventDefault();
        }

        switch (event.code) {
            case 'ArrowUp':
                this.cursor.move('up');
                // Need to trigger render update (will be handled by Game loop)
                break;
            case 'ArrowDown':
                this.cursor.move('down');
                // Need to trigger render update
                break;
            case 'ArrowLeft':
                this.cursor.move('left');
                // Need to trigger render update
                break;
            case 'ArrowRight':
                this.cursor.move('right');
                // Need to trigger render update
                break;
            case 'Space':
            case 'KeyX': // Allow X as an alternative swap key
                const [col1, col2] = this.cursor.getSwapPositions();
                this.swapCallback(this.cursor.row, col1, col2);
                break;
        }
        // Note: The rendering update after cursor move will be handled
        // by the main game loop calling renderer.renderCursor().
    }
}
