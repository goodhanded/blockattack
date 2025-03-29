# Block Attack

Block Attack is a fast-paced, single-player puzzle game inspired by the classic title *Tetris Attack* (also known as Panel de Pon or Puzzle League). In Block Attack, you control a two-block-wide cursor to swap adjacent blocks on a grid, aiming to clear matches and build combos and chains while preventing the stack from reaching the top.

## Overview

In Block Attack, the playfield is a 6-column by 12-row grid. New rows of random blocks continuously push up from the bottom, and the rate of rise increases as the game progresses. The player's goal is to keep the grid under control by swapping blocks to form horizontal or vertical lines of 3 or more identical blocks.

## Game Features

- **Two-Phase Clearing Mechanic:**
  - _Detection & Flashing:_ When 3 or more identical blocks are aligned, they are marked and flash briefly.
  - _Staggered Removal:_ After the flashing period, blocks are removed one by one with a slight delay, allowing chain reactions.

- **Combo and Chain System:**
  - **Combos:** Clearing more than 3 blocks in one match yields bonus points.
  - **Chains:** Consecutive clears triggered by falling blocks increase the chain multiplier, rewarding strategic swaps even during animations.

- **Continuous Rising Stack:**
  - Blocks continuously rise from the bottom, and the rate of new row generation accelerates over time.
  - The game ends if any block is pushed beyond the top visible row.

- **Responsive and Fluid Controls:**
  - **Keyboard:** Use arrow keys to move the two-block cursor and the Spacebar or X key to swap blocks.
  - **Mouse/Touch:** Click or tap on blocks to move the cursor and initiate swaps.
  - Input is accepted at all times, even while blocks are clearing or falling, allowing for advanced chain strategies.

- **Self-Contained Implementation:**
  - The entire game—including HTML, CSS, JavaScript, and audio assets encoded in base64—is contained in a single HTML file.
  - Designed to run out-of-the-box in any modern web browser without external dependencies.

## Controls

- **Keyboard Controls:**
  - **Arrow Keys:** Move the two-block cursor around the grid.
  - **Spacebar / X:** Swap the two horizontally adjacent blocks under the cursor.

- **Mouse/Touch Controls:**
  - Click/tap on the game board to reposition the cursor.
  - Tapping on adjacent blocks (when the cursor is in position) initiates a swap.

## How to Play

1. Open `index.html` in your web browser.
2. Click the **Start Game** button or press Enter/Space to begin.
3. Use the controls to swap blocks and create matches.
4. Earn points through combos (clearing 4+ blocks) and chains (sequential clears from falling blocks).
5. Try to prevent the rising stack from reaching the top of the grid.
6. Enjoy the challenge and chase your high score!

## Project Structure

```
.
├─ .DS_Store
├─ .gitignore
├─ index.html        // Main entry point and self-contained HTML file
├─ js
│  ├─ constants.js   // Game constants, audio data URIs, and configuration
│  ├─ game.js        // Core game logic, including block swapping, rising, and match detection
│  ├─ input.js       // Handles keyboard and mouse/touch inputs
│  └─ rendering.js   // Rendering logic for blocks, cursor, and UI updates
└─ style.css         // CSS for game layout, animations, and responsive design
```

## Technical Details

- **Grid & Block System:** The playfield is a 6x12 grid where each cell can be empty or occupied by a colored block. Blocks have states such as idle, swapping, falling, flashing, and clearing to manage animations and interactions.

- **Game Loop & Rising Mechanic:** Leveraging `requestAnimationFrame`, the game loop updates a rising offset to simulate the upward movement of blocks. When this offset reaches a full block height, a new row is generated at the bottom, and all blocks shift up.

- **Two-Phase Clearing:** Matched blocks first flash to indicate they will be cleared, then are removed sequentially with a small delay between each removal. This approach allows players to make swaps during animations, setting up chains and combos.

- **Audio Assets:** Sound effects for block swapping, clearing, and game over events are embedded as base64-encoded data within the JavaScript files, ensuring no external audio files are required.

## Contributing

Contributions, bug fixes, and feature suggestions are welcome! Feel free to fork the repository, make your changes, and submit a pull request.

## License

[Insert License Information Here]

---

Enjoy playing Block Attack, and may your combos and chains always stack up in your favor!
