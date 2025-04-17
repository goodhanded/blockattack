
// src/Block.ts
import { BlockData, BlockState, BlockType, Position } from './types';

/**
 * Represents a single block in the game grid.
 */
export class Block implements BlockData {
    public id: number;
    public row: number;
    public col: number;
    public type: BlockType;
    public state: BlockState;
    public element: HTMLElement | null = null; // Reference to the DOM element, managed by Renderer

    private static nextId = 0;

    constructor(row: number, col: number, type: BlockType) {
        this.id = Block.nextId++;
        this.row = row;
        this.col = col;
        this.type = type;
        this.state = 'idle'; // Blocks start as idle
    }

    /**
     * Updates the block's logical position.
     * @param newPosition The new row and column for the block.
     */
    setPosition(newPosition: Position): void {
        this.row = newPosition.row;
        this.col = newPosition.col;
    }

    /**
     * Sets the block's current state.
     * @param newState The new state for the block.
     */
    setState(newState: BlockState): void {
        this.state = newState;
        // Note: Visual updates based on state (like adding/removing CSS classes)
        // will be handled by the Renderer class.
    }

    /**
     * Associates a DOM element with this block instance.
     * @param element The HTMLElement representing this block visually.
     */
    setElement(element: HTMLElement | null): void {
        this.element = element;
        if (this.element) {
            this.element.dataset.id = this.id.toString(); // Store ID on the element
        }
    }

    /**
     * Resets the static ID counter, useful for testing or restarting.
     */
    static resetIdCounter(): void {
        Block.nextId = 0;
    }
}
