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

    // Manual rise callbacks
    private manualRiseStartCallback?: () => void;
    private manualRiseStopCallback?: () => void;
    private handleKeyUpBound: (event: KeyboardEvent) => void;

    // Bound event listener function to maintain 'this' context
    private handleKeyDownBound: (event: KeyboardEvent) => void;

    constructor(
        cursor: Cursor,
        swapCallback: SwapCallback,
        manualRiseStartCallback?: () => void,
        manualRiseStopCallback?: () => void
    ) {
        this.cursor = cursor;
        this.swapCallback = swapCallback;
        this.manualRiseStartCallback = manualRiseStartCallback;
        this.manualRiseStopCallback = manualRiseStopCallback;
        this.handleKeyDownBound = this.handleKeyDown.bind(this);
        this.handleKeyUpBound = this.handleKeyUp.bind(this);
        console.log("InputHandler initialized.");
    }

    /**
     * Sets up keyboard event listeners.
     */
    setupEventListeners(): void {
        if (this.isEnabled) return;
        document.addEventListener('keydown', this.handleKeyDownBound);
        document.addEventListener('keyup', this.handleKeyUpBound);
        this.isEnabled = true;
        console.log("Input listeners enabled.");
    }

    /**
     * Removes keyboard event listeners.
     */
    removeEventListeners(): void {
        if (!this.isEnabled) return;
        document.removeEventListener('keydown', this.handleKeyDownBound);
        document.removeEventListener('keyup', this.handleKeyUpBound);
        this.isEnabled = false;
        console.log("Input listeners disabled.");
    }

    /**
     * Handles the keydown event.
     * @param event The KeyboardEvent object.
     */
    private handleKeyDown(event: KeyboardEvent): void {
        if (!this.isEnabled) return;

        // Prevent default browser behavior for arrow keys, space, and shift
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyX', 'ShiftLeft'].includes(event.code)) {
            event.preventDefault();
        }

        switch (event.code) {
            case 'ShiftLeft':
                this.manualRiseStartCallback?.();
                break;
            case 'ArrowUp':
                this.cursor.move('up');
                break;
            case 'ArrowDown':
                this.cursor.move('down');
                break;
            case 'ArrowLeft':
                this.cursor.move('left');
                break;
            case 'ArrowRight':
                this.cursor.move('right');
                break;
            case 'Space':
            case 'KeyX':
                const [col1, col2] = this.cursor.getSwapPositions();
                this.swapCallback(this.cursor.row, col1, col2);
                break;
        }
        // Note: The rendering update after cursor move will be handled
        // by the main game loop calling renderer.renderCursor().
    }

    /**
     * Handles the keyup event.
     * @param event The KeyboardEvent object.
     */
    private handleKeyUp(event: KeyboardEvent): void {
        if (!this.isEnabled) return;
        if (event.code === 'ShiftLeft') {
            event.preventDefault();
            this.manualRiseStopCallback?.();
        }
    }
}
