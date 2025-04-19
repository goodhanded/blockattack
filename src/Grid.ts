// src/Grid.ts
import { Block } from './Block';
import { Position, BlockType, BlockState } from './types';
import {
    GRID_WIDTH,
    GRID_HEIGHT, // Logical height including buffer
    VISIBLE_GRID_HEIGHT,
    BLOCK_TYPES,
    MIN_MATCH_LENGTH
} from './constants';

/**
 * Manages the game's logical grid, block placement, and core mechanics like
 * matching, gravity, and row generation.
 */
export class Grid {
    public readonly width: number;
    public readonly height: number; // Total logical height (e.g., 12 visible + 1 buffer + 1 below = 14)
    public readonly visibleHeight: number; // Number of rows visible to the player
    private blocks: (Block | null)[][]; // 2D array representing the grid

    constructor() {
        this.width = GRID_WIDTH;
        this.visibleHeight = VISIBLE_GRID_HEIGHT;
        // Total height includes visible rows, one buffer row above, and one row below for generation
        this.height = this.visibleHeight + 2;
        this.blocks = this.createEmptyGrid();
        console.log(`Grid initialized with dimensions: ${this.width}x${this.height} (Visible: ${this.visibleHeight})`);
    }

    /**
     * Creates an empty grid filled with null values.
     */
    private createEmptyGrid(): (Block | null)[][] {
        return Array(this.height).fill(null).map(() => Array(this.width).fill(null));
    }

    /**
     * Checks if a given position is within the logical grid bounds.
     * @param row The row index.
     * @param col The column index.
     * @returns True if the position is valid, false otherwise.
     */
    isPositionValid(row: number, col: number): boolean {
        return row >= 0 && row < this.height && col >= 0 && col < this.width;
    }

    /**
     * Retrieves the block at a specific grid position.
     * @param row The row index.
     * @param col The column index.
     * @returns The Block object or null if the position is empty or invalid.
     */
    getBlock(row: number, col: number): Block | null {
        if (!this.isPositionValid(row, col)) {
            return null;
        }
        return this.blocks[row][col];
    }

    /**
     * Places a block at a specific grid position.
     * @param row The row index.
     * @param col The column index.
     * @param block The Block object or null to clear the position.
     */
    setBlock(row: number, col: number, block: Block | null): void {
        if (!this.isPositionValid(row, col)) {
            console.error(`Attempted to set block outside bounds: (${row}, ${col})`);
            return;
        }
        this.blocks[row][col] = block;
        if (block) {
            block.setPosition({ row, col });
        }
    }

    /**
     * Clears the entire grid and resets the block ID counter.
     */
    resetGrid(): void {
        this.blocks = this.createEmptyGrid();
        Block.resetIdCounter();
        console.log("Grid reset.");
    }

    /**
     * Fills the initial playable area (rows 1 to 6) with blocks.
     * Ensures no initial matches are created.
     */
    fillInitialBlocks(): void {
        console.log("Filling initial blocks...");
        for (let r = 1; r <= 6; r++) {
            for (let c = 0; c < this.width; c++) {
                let type: BlockType;
                let attempts = 0;
                do {
                    type = Math.floor(Math.random() * BLOCK_TYPES);
                    attempts++;
                } while (
                    attempts < 10 &&
                    ((
                        this.getBlock(r - 1, c)?.type === type &&
                        this.getBlock(r - 2, c)?.type === type
                    ) ||
                    (
                        this.getBlock(r, c - 1)?.type === type &&
                        this.getBlock(r, c - 2)?.type === type
                    ))
                );
                const newBlock = new Block(r, c, type);
                this.setBlock(r, c, newBlock);
            }
        }
        console.log("Initial blocks filled.");
    }

    /**
     * Generates a new row of blocks at the bottom (row 0).
     * Prevents immediate matches with the row above (row 1) and within the new row.
     * @returns An array of the newly created Block objects.
     */
    generateNewRow(): Block[] {
        console.log("Generating new row at index 0...");
        const newRowBlocks: Block[] = [];
        const rowAboveIndex = 1;

        for (let c = 0; c < this.width; c++) {
            let type: BlockType;
            let attempts = 0;
            const blockAbove = this.getBlock(rowAboveIndex, c);
            const blockLeft = c > 0 ? this.getBlock(0, c - 1) : null;
            const blockTwoLeft = c > 1 ? this.getBlock(0, c - 2) : null;

            do {
                type = Math.floor(Math.random() * BLOCK_TYPES);
                attempts++;
            } while (
                attempts < 10 &&
                blockAbove?.type === type && blockAbove?.state === 'idle' &&
                this.getBlock(rowAboveIndex + 1, c)?.type === type && this.getBlock(rowAboveIndex + 1, c)?.state === 'idle'
            );

            const newBlock = new Block(0, c, type);
            this.setBlock(0, c, newBlock);
            newRowBlocks.push(newBlock);
        }

        let requiresCheck = true;
        let checkCount = 0;
        while (requiresCheck && checkCount < 5) {
            requiresCheck = false;
            checkCount++;
            for (let c = 0; c < this.width - (MIN_MATCH_LENGTH - 1); c++) {
                const firstBlock = this.getBlock(0, c);
                if (!firstBlock) continue;
                let match = true;
                for (let i = 1; i < MIN_MATCH_LENGTH; i++) {
                    if (!this.getBlock(0, c + i) || this.getBlock(0, c + i)!.type !== firstBlock.type) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    const currentType = firstBlock.type;
                    let newType: BlockType;
                    do {
                        newType = Math.floor(Math.random() * BLOCK_TYPES);
                    } while (newType === currentType);
                    firstBlock.type = newType;
                    requiresCheck = true;
                    c = -1;
                }
            }
        }

        console.log("New row generated.");
        return newRowBlocks;
    }

    /**
     * Finds all groups of matching blocks (horizontal and vertical) in the visible grid.
     * Only considers blocks in the 'idle' state.
     * @returns An array of arrays, where each inner array contains matching Block objects.
     */
    findMatches(): Block[][] {
        const allMatches: Block[][] = [];
        const visitedHoriz = new Set<number>();
        const visitedVert = new Set<number>();

        for (let r = 1; r <= this.visibleHeight; r++) {
            for (let c = 0; c < this.width; c++) {
                const block = this.getBlock(r, c);
                if (!block || block.state !== 'idle') continue;

                // Horizontal matches
                if (!visitedHoriz.has(block.id)) {
                    const horizontalMatch: Block[] = [block];
                    for (let nc = c + 1; nc < this.width; nc++) {
                        const nextBlock = this.getBlock(r, nc);
                        if (nextBlock && nextBlock.state === 'idle' && nextBlock.type === block.type) {
                            horizontalMatch.push(nextBlock);
                        } else {
                            break;
                        }
                    }
                    if (horizontalMatch.length >= MIN_MATCH_LENGTH) {
                        allMatches.push(horizontalMatch);
                        horizontalMatch.forEach(b => visitedHoriz.add(b.id));
                    }
                }

                // Vertical matches
                if (!visitedVert.has(block.id)) {
                    const verticalMatch: Block[] = [block];
                    for (let nr = r + 1; nr <= this.visibleHeight; nr++) {
                        const nextBlock = this.getBlock(nr, c);
                        if (nextBlock && nextBlock.state === 'idle' && nextBlock.type === block.type) {
                            verticalMatch.push(nextBlock);
                        } else {
                            break;
                        }
                    }
                    if (verticalMatch.length >= MIN_MATCH_LENGTH) {
                        allMatches.push(verticalMatch);
                        verticalMatch.forEach(b => visitedVert.add(b.id));
                    }
                }
            }
        }
        return allMatches;
    }

    /**
     * Makes blocks fall down into empty spaces below them within the visible grid.
     * Updates block positions and sets their state to 'falling'.
     * @returns True if any blocks started falling, false otherwise.
     */
    applyGravity(): boolean {
        let blocksFell = false;

        for (let c = 0; c < this.width; c++) {
            let writeRow = 1;
            for (let readRow = 1; readRow <= this.visibleHeight; readRow++) {
                const block = this.getBlock(readRow, c);
                if (block !== null) {
                    if (readRow > writeRow) {
                        if (block.state === 'clearing' || block.state === 'flashing') {
                            console.warn(`Block ${block.id} trying to fall while ${block.state}. Skipping fall.`);
                            continue;
                        }

                        blocksFell = true;
                        this.setBlock(writeRow, c, block);
                        this.setBlock(readRow, c, null);
                        block.setState('falling');
                    }
                    writeRow++;
                }
            }
        }
        return blocksFell;
    }

    /**
     * Shifts all blocks in the grid up by one row.
     * Called when the rise offset commits.
     * Does NOT generate the new row (that's done separately).
     */
    shiftRowsUp(): void {
        console.log("Shifting rows up...");

        // Create a temporary copy of the block references
        const tempBlocks: (Block | null)[][] = Array(this.height).fill(null)
            .map(() => Array(this.width).fill(null));
        
        // First pass: Copy all blocks to their new positions in the temp array
        for (let r = this.height - 1; r >= 0; r--) {
            for (let c = 0; c < this.width; c++) {
                const block = this.getBlock(r, c);
                const targetRow = r + 1;
                
                // Only move blocks that are within bounds
                if (targetRow < this.height) {
                    // Copy reference to temp array
                    tempBlocks[targetRow][c] = block;
                    
                    // Update block's internal position BUT PRESERVE STATE
                    if (block) {
                        // Remember original state
                        const originalState = block.state;
                        
                        // Update position property
                        block.setPosition({row: targetRow, col: c});
                        
                        // Restore original state if it was changed
                        if (block.state !== originalState) {
                            block.setState(originalState);
                        }
                    }
                } else if (block && block.state !== 'clearing' && block.state !== 'flashing') {
                    console.warn(`Block ${block.id} pushed out of bounds at (${targetRow}, ${c})`);
                }
            }
        }
        
        // Second pass: Update the main grid array from the temp array
        // This ensures we don't have conflicts during row shifting
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                this.blocks[r][c] = tempBlocks[r][c];
            }
        }
        
        // Clear the bottom row (row 0) to prepare for new blocks
        for (let c = 0; c < this.width; c++) {
            this.blocks[0][c] = null;
        }
        
        console.log("Rows shifted.");
    }

    /**
     * Checks if the game over condition is met (any non-clearing/flashing block in the buffer row).
     * The buffer row is at index `visibleHeight`.
     * @returns True if the game is over, false otherwise.
     */
    checkGameOverCondition(): boolean {
        const bufferRowIndex = this.visibleHeight;
        for (let c = 0; c < this.width; c++) {
            const block = this.getBlock(bufferRowIndex, c);
            if (block && block.state !== 'clearing' && block.state !== 'flashing') {
                console.log(`Game over condition met: Block ${block.id} at (${bufferRowIndex}, ${c}) state: ${block.state}`);
                return true;
            }
        }
        return false;
    }

    /**
     * Swaps two adjacent blocks horizontally within the visible grid.
     * @param r The row index (must be within visible grid: 1 to visibleHeight).
     * @param c1 The column index of the first block.
     * @param c2 The column index of the second block.
     * @returns True if the swap was initiated, false otherwise.
     */
    swapBlocks(r: number, c1: number, c2: number): boolean {
        if (r < 1 || r > this.visibleHeight) {
            console.warn(`Swap attempt outside visible rows: row ${r}`);
            return false;
        }
        if (c1 < 0 || c1 >= this.width || c2 < 0 || c2 >= this.width || Math.abs(c1 - c2) !== 1) {
            console.warn(`Invalid swap columns: ${c1}, ${c2}`);
            return false;
        }

        const block1 = this.getBlock(r, c1);
        const block2 = this.getBlock(r, c2);

        const canSwapState = (state: BlockState | undefined) =>
            state === 'idle' || state === 'falling' || state === 'swapping';

        if ((block1 && !canSwapState(block1.state)) || (block2 && !canSwapState(block2.state))) {
            console.log(`Cannot swap blocks in states: ${block1?.state}, ${block2?.state}`);
            return false;
        }

        this.setBlock(r, c1, block2);
        this.setBlock(r, c2, block1);

        if (block1) {
            block1.setState('swapping');
        }
        if (block2) {
            block2.setState('swapping');
        }

        console.log(`Swapped blocks at (${r}, ${c1}) <-> (${r}, ${c2})`);
        return true;
    }

    /**
     * Clears a block from the grid (sets the position to null).
     * Note: This is just the logical removal from the grid array.
     * Visual removal and state changes are handled elsewhere (Game/Renderer).
     * @param row The row index.
     * @param col The column index.
     */
    clearBlock(row: number, col: number): void {
        if (this.isPositionValid(row, col)) {
            this.blocks[row][col] = null;
        }
    }

    /**
     * Gets all blocks currently in the grid.
     * Useful for rendering or iterating over all blocks.
     * @returns A flat array of all Block objects in the grid.
     */
    getAllBlocks(): Block[] {
        const allBlocks: Block[] = [];
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                if (this.blocks[r][c]) {
                    allBlocks.push(this.blocks[r][c]!);
                }
            }
        }
        return allBlocks;
    }

    /**
     * Checks if any block in the grid is in one of the specified states.
     * @param states Array of block states to check for
     * @returns True if any block is in one of the specified states
     */
    isAnyBlockInState(states: BlockState[]): boolean {
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                const block = this.getBlock(r, c);
                if (block && states.includes(block.state)) {
                    return true;
                }
            }
        }
        return false;
    }
}
