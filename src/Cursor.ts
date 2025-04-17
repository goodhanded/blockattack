
// src/Cursor.ts
import { Position, CursorData } from './types';
import { GRID_WIDTH, VISIBLE_GRID_HEIGHT } from './constants';

/**
 * Manages the state and position of the player's cursor.
 */
export class Cursor implements CursorData {
    public row: number;
    public col: number;

    constructor(initialRow: number, initialCol: number) {
        // Ensure initial position is valid within the visible grid
        this.row = Math.max(1, Math.min(initialRow, VISIBLE_GRID_HEIGHT));
        this.col = Math.max(0, Math.min(initialCol, GRID_WIDTH - 2)); // Cursor is 2 wide
        console.log(`Cursor initialized at (${this.row}, ${this.col})`);
    }

    /**
     * Moves the cursor in the specified direction, respecting grid boundaries.
     * @param direction The direction to move ('up', 'down', 'left', 'right').
     */
    move(direction: 'up' | 'down' | 'left' | 'right'): void {
        let newRow = this.row;
        let newCol = this.col;

        switch (direction) {
            case 'up':
                newRow++;
                break;
            case 'down':
                newRow--;
                break;
            case 'left':
                newCol--;
                break;
            case 'right':
                newCol++;
                break;
        }

        // Clamp row within visible grid (1 to VISIBLE_GRID_HEIGHT)
        this.row = Math.max(1, Math.min(newRow, VISIBLE_GRID_HEIGHT));

        // Clamp column (left edge of cursor) from 0 to GRID_WIDTH - 2
        this.col = Math.max(0, Math.min(newCol, GRID_WIDTH - 2));

        // console.log(`Cursor moved to (${this.row}, ${this.col})`);
    }

    /**
     * Sets the cursor's position directly, clamping to valid boundaries.
     * @param row The target row.
     * @param col The target column (left edge of the cursor).
     */
    setPosition(row: number, col: number): void {
        // Clamp row within visible grid (1 to VISIBLE_GRID_HEIGHT)
        this.row = Math.max(1, Math.min(row, VISIBLE_GRID_HEIGHT));
        // Clamp column (left edge of cursor) from 0 to GRID_WIDTH - 2
        this.col = Math.max(0, Math.min(col, GRID_WIDTH - 2));
        // console.log(`Cursor set to (${this.row}, ${this.col})`);
    }

    /**
     * Gets the column indices of the two blocks currently under the cursor.
     * @returns A tuple [col1, col2].
     */
    getSwapPositions(): [number, number] {
        return [this.col, this.col + 1];
    }
}
