/* js/game.js */

// Global Game State Variables
let grid = [];
let blocks = [];
let cursor = { row: 6, col: 2 };
let score = 0;
let currentChain = 0;
let isGameOver = false;
let isProcessing = false;
let nextBlockId = 0;
let activeClearPromises = [];

// Continuous Rise State Variables
let riseOffset = 0;
let currentRiseSpeed = INITIAL_RISE_SPEED;
let lastTimestamp = 0;
let animationFrameId = null;

// DOM Elements
const gameBoard = document.getElementById('game-board');
const cursorElement = document.getElementById('cursor');
const scoreElement = document.getElementById('score');
const chainElement = document.getElementById('chain');
const gameOverOverlay = document.getElementById('game-over-overlay');
const finalScoreElement = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');
const startOverlay = document.getElementById('start-overlay');
const startButton = document.getElementById('start-button');

function initGame() {
    console.log("Initializing game...");
    isGameOver = false;
    isProcessing = false;
    score = 0;
    currentChain = 0;
    cursor = { row: 6, col: 2 };
    nextBlockId = 0;
    activeClearPromises = [];

    // Initialize with no rise offset
    riseOffset = 0; 
    currentRiseSpeed = INITIAL_RISE_SPEED;
    lastTimestamp = 0;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = null;

    // Clear any existing blocks
    gameBoard.querySelectorAll('.block').forEach(el => el.remove());

    // Initialize grid and blocks array (row 0 = below, 1-12 = visible, 13 = buffer)
    grid = Array(VISIBLE_GRID_HEIGHT + 2).fill(null).map(() => Array(GRID_WIDTH).fill(null));
    blocks = [];

    // Create initial stack of blocks (fill rows 1-6)
    for (let r = 1; r <= 6; r++) {
        generateNewRowData(r);
    }
    
    // Clear rows above initial stack (rows 7 to VISIBLE_GRID_HEIGHT + 1)
    for (let r = 7; r < VISIBLE_GRID_HEIGHT + 2; r++) {
        for (let c = 0; c < GRID_WIDTH; c++) {
            grid[r][c] = null;
        }
    }
    
    // Generate row at position 0 (below visible grid)
    generateNewRowData(0);

    // Render all blocks
    blocks.forEach(renderBlock);

    updateScoreDisplay();
    updateChainDisplay();
    renderCursor();

    gameOverOverlay.style.display = 'none';
    startOverlay.style.display = 'none';
    cursorElement.style.display = 'block';

    console.log("Game initialized. Starting continuous rise.");
    startGameLoop();
    checkMatchesAndProcess();
}

function startGameLoop() {
    if (isGameOver) return;
    lastTimestamp = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    if (isGameOver) {
        animationFrameId = null;
        return;
    }
    const deltaTime = (timestamp - lastTimestamp) / 1000.0;
    lastTimestamp = timestamp;
    
    // Update rise offset
    riseOffset += currentRiseSpeed * deltaTime;

    // When riseOffset reaches BLOCK_SIZE, commit the logical rise
    if (riseOffset >= BLOCK_SIZE) {
        riseOffset -= BLOCK_SIZE;
        commitLogicalRise();
        
        if (checkGameOverCondition()) {
            triggerGameOver("Block reached top after commit.");
            return;
        }
    }
    
    // Apply visual updates for all blocks
    updateAllBlockVisualPositions();

    animationFrameId = requestAnimationFrame(gameLoop);
}

function checkGameOverCondition() {
    // Check the buffer row (index VISIBLE_GRID_HEIGHT + 1)
    for (let c = 0; c < GRID_WIDTH; c++) {
        const block = grid[VISIBLE_GRID_HEIGHT]?.[c];
        if (block && block.state !== 'clearing' && block.state !== 'flashing') {
            console.log(`Game over condition met: Block ${block.id} at (${VISIBLE_GRID_HEIGHT}, ${c}) state: ${block.state}`);
            return true;
        }
    }
    return false;
}

function commitLogicalRise() {
    // Move all rows up one position (from buffer row down to row 0)
    for (let r = VISIBLE_GRID_HEIGHT + 1; r >= 0; r--) { 
        for (let c = 0; c < GRID_WIDTH; c++) {
            const block = grid[r]?.[c];
            if (block) {
                block.row++;
                // Check if block moved into the buffer row (VISIBLE_GRID_HEIGHT + 1)
                if (block.row > VISIBLE_GRID_HEIGHT + 1 && block.state !== 'clearing' && block.state !== 'flashing') {
                    triggerGameOver(`Block ${block.id} pushed beyond buffer row.`);
                    if (isGameOver) return;
                }
            }
            // Shift block up in the grid array
            if (r < VISIBLE_GRID_HEIGHT + 1) { 
                grid[r+1][c] = grid[r][c];
            }
        }
    }
    
    // Clear the row at position 0 before generating new blocks
    for (let c = 0; c < GRID_WIDTH; c++) {
        grid[0][c] = null;
    }
    
    // Generate and render new row at position 0 (below visible grid)
    generateNewRowData(0);
    
    // Speed up rising as game progresses
    if (currentRiseSpeed < MAX_RISE_SPEED) {
        currentRiseSpeed += SPEED_INCREMENT_ON_COMMIT;
        currentRiseSpeed = Math.min(currentRiseSpeed, MAX_RISE_SPEED);
    }
    
    if (!isProcessing) {
        checkMatchesAndProcess();
    }
}

function generateNewRowData(targetRow) {
    let newRowBlocks = [];
    for (let c = 0; c < GRID_WIDTH; c++) {
        let type;
        let attempts = 0;
        // Define checkRow outside the loop to make it accessible in the while condition
        const checkRow = targetRow + 1;
        do {
            type = Math.floor(Math.random() * BLOCK_TYPES);
            attempts++;
            // Check against row above (targetRow + 1)
        } while (attempts < 10 && grid[checkRow]?.[c] !== null && grid[checkRow][c].type === type && grid[checkRow][c].state === 'idle');
        
        const id = nextBlockId++;
        const newBlock = {
            id: id,
            row: targetRow,
            col: c,
            type: type,
            element: null,
            state: 'idle'
        };
        grid[targetRow][c] = newBlock;
        blocks.push(newBlock);
        newRowBlocks.push(newBlock);
        
        // Immediately render the block if it wasn't part of initialization
        if (animationFrameId !== null) {
            renderBlock(newBlock);
        }
    }
    
    // Prevent horizontal matches in the new row
    let requiresCheck = true;
    let checkCount = 0;
    while (requiresCheck && checkCount < 5) {
        requiresCheck = false;
        checkCount++;
        for (let c = 0; c < GRID_WIDTH - (MIN_MATCH_LENGTH - 1); c++) {
            const firstBlock = grid[targetRow][c];
            if (!firstBlock) continue;
            let match = true;
            for (let i = 1; i < MIN_MATCH_LENGTH; i++) {
                if (!grid[targetRow][c+i] || grid[targetRow][c+i].type !== firstBlock.type) {
                    match = false;
                    break;
                }
            }
            if (match) {
                const currentType = firstBlock.type;
                let newType;
                do {
                    newType = Math.floor(Math.random() * BLOCK_TYPES);
                } while (newType === currentType);
                firstBlock.type = newType;
                if (firstBlock.element) {
                    firstBlock.element.className = `block block-type-${newType}`;
                }
                requiresCheck = true;
                c = -1;
            }
        }
    }
    
    return newRowBlocks;
}

function swapBlocks(r, c1, c2) {
    // Adjust row bounds check (rows 1 to VISIBLE_GRID_HEIGHT are swappable)
    if (isGameOver || c1 < 0 || c1 >= GRID_WIDTH || c2 < 0 || c2 >= GRID_WIDTH || r < 1 || r > VISIBLE_GRID_HEIGHT) {
        return;
    }
    if (isProcessing) {
        console.log("Cannot swap while processing matches/gravity.");
        return;
    }
    const block1 = grid[r][c1];
    const block2 = grid[r][c2];

    if ((block1 && block1.state === 'clearing') || (block2 && block2.state === 'clearing')) {
        console.log("Cannot swap clearing blocks.");
        return;
    }
    console.log(`Swapping (${r},${c1}) and (${r},${c2})`);

    grid[r][c1] = block2;
    grid[r][c2] = block1;

    if (block1) {
        block1.col = c2;
        block1.state = 'swapping';
        if (block1.element) {
            block1.element.classList.add('swapping');
            updateBlockVisualPosition(block1);
        }
    }
    if (block2) {
        block2.col = c1;
        block2.state = 'swapping';
        if (block2.element) {
            block2.element.classList.add('swapping');
            updateBlockVisualPosition(block2);
        }
    }

    playSound(swapSound);
    isProcessing = true;
    setTimeout(() => {
        if (block1) {
            block1.state = 'idle';
            if(block1.element) block1.element.classList.remove('swapping');
        }
        if (block2) {
            block2.state = 'idle';
            if(block2.element) block2.element.classList.remove('swapping');
        }
        if(block1) updateBlockVisualPosition(block1);
        if(block2) updateBlockVisualPosition(block2);
        
        applyGravity(() => {
            checkMatchesAndProcess();
        });
    }, SWAP_DURATION);
}

function checkMatchesAndProcess() {
    if (isProcessing && !activeClearPromises.length) {
        return;
    }
    if (checkGameOverCondition()) {
        triggerGameOver(`Stable block detected in buffer row before match check.`);
        return;
    }
    isProcessing = true;
    const matches = findMatches();
    if (matches.length > 0) {
        currentChain++;
        updateChainDisplay();
        let pointsEarned = 0;
        let basePointsPerBlock = 10;
        let comboBonus = 0;
        let chainBonus = currentChain > 1 ? (currentChain - 1) * 50 : 0;
        const uniqueBlocksToClear = new Set();
        matches.forEach(matchList => {
            matchList.forEach(block => {
                if (block && block.state === 'idle') {
                    uniqueBlocksToClear.add(block);
                }
            });
            if (matchList.length > MIN_MATCH_LENGTH) {
                comboBonus += (matchList.length - MIN_MATCH_LENGTH) * 15;
            }
        });
        if (uniqueBlocksToClear.size === 0) {
            console.warn("Matches array non-empty, but uniqueBlocksToClear is empty.");
            isProcessing = false;
            return;
        }
        pointsEarned = uniqueBlocksToClear.size * basePointsPerBlock + comboBonus + chainBonus;
        score += pointsEarned;
        updateScoreDisplay();
        
        initiateClearing(Array.from(uniqueBlocksToClear));
    } else {
        if (currentChain > 0) {
            currentChain = 0;
            updateChainDisplay();
        }
        isProcessing = false;
    }
}

function findMatches() {
    const allMatches = [];
    const checkedBlocks = new Set();
    
    // Loop through visible rows (1 to VISIBLE_GRID_HEIGHT)
    for (let r = 1; r <= VISIBLE_GRID_HEIGHT; r++) {
        for (let c = 0; c < GRID_WIDTH; c++) {
            const block = grid[r][c];
            if (!block || block.state !== 'idle' || checkedBlocks.has(block.id)) continue;
            const blockType = block.type;
            
            let horizontalMatch = [block];
            for (let nc = c+1; nc < GRID_WIDTH; nc++) {
                const nextBlock = grid[r][nc];
                if (nextBlock && nextBlock.state === 'idle' && nextBlock.type === blockType) {
                    horizontalMatch.push(nextBlock);
                } else {
                    break;
                }
            }
            if (horizontalMatch.length >= MIN_MATCH_LENGTH) {
                allMatches.push(horizontalMatch);
                horizontalMatch.forEach(b => checkedBlocks.add(b.id));
            }
            
            if (!checkedBlocks.has(block.id)) {
                let verticalMatch = [block];
                for (let nr = r+1; nr <= VISIBLE_GRID_HEIGHT; nr++) {
                    const nextBlock = grid[nr][c];
                    if (nextBlock && nextBlock.state === 'idle' && nextBlock.type === blockType) {
                        verticalMatch.push(nextBlock);
                    } else {
                        break;
                    }
                }
                if (verticalMatch.length >= MIN_MATCH_LENGTH) {
                    allMatches.push(verticalMatch);
                    verticalMatch.forEach(b => checkedBlocks.add(b.id));
                }
            }
        }
    }
    return allMatches;
}

function initiateClearing(blocksToProcess) {
    const validBlocksToClear = blocksToProcess.filter(b => {
        return b && b.element && grid[b.row]?.[b.col]?.id === b.id && b.state === 'idle';
    });

    if (validBlocksToClear.length === 0) {
        applyGravity(() => {
            if (!findMatches().length) {
                isProcessing = false;
                if (currentChain > 0) {
                    currentChain = 0;
                    updateChainDisplay();
                }
            } else {
                checkMatchesAndProcess();
            }
        });
        return;
    }

    console.log(`Initiating clear for ${validBlocksToClear.length} blocks. Chain: ${currentChain}`);
    playSound(clearSound);

    validBlocksToClear.forEach(block => {
        block.state = 'flashing';
        if (block.element) {
            block.element.classList.add('flashing');
        }
    });

    const clearPromise = new Promise(resolve => {
        setTimeout(() => {
            const sortedBlocks = [...validBlocksToClear].sort((a, b) => {
                    if (a.row !== b.row) return a.row - b.row;
                    return a.col - b.col;
            });
            removeBlocksSequentially(sortedBlocks, resolve);
        }, FLASH_DURATION);
    });

    activeClearPromises.push(clearPromise);

    clearPromise.then(() => {
        activeClearPromises = activeClearPromises.filter(p => p !== clearPromise);
    }).catch(err => {
        console.error("Error during clearing process:", err);
        activeClearPromises = activeClearPromises.filter(p => p !== clearPromise);
        isProcessing = false;
    });
}

function removeBlocksSequentially(blocksToRemove, onComplete) {
    const block = blocksToRemove.shift();

    if (block) {
        const gridBlock = grid[block.row]?.[block.col];
        if(gridBlock && gridBlock.id === block.id && (block.state === 'flashing' || block.state === 'clearing')) {
            block.state = 'clearing';
            if (block.element) {
                block.element.classList.remove('flashing');
                block.element.style.opacity = '0';
                setTimeout(() => {
                    block.element.remove();
                }, 100);
            }

            const blockIndex = blocks.findIndex(b => b.id === block.id);
            if (blockIndex > -1) {
                blocks.splice(blockIndex, 1);
            } else {
                console.warn(`Block ${block.id} not found in blocks array during removal.`);
            }

            grid[block.row][block.col] = null;
        } else {
            console.warn(`Skipping removal of block ${block.id}: Grid mismatch or state changed. State: ${block.state}, Grid: ${gridBlock?.id}`);
        }
    }

    if (blocksToRemove.length === 0) {
        requestAnimationFrame(() => {
            applyGravity(onComplete);
        });
        return;
    } else {
        setTimeout(() => removeBlocksSequentially(blocksToRemove, onComplete), INDIVIDUAL_REMOVE_DELAY);
    }
}

function applyGravity(onComplete) {
    let blocksFell = false;

    for (let c = 0; c < GRID_WIDTH; c++) {
        let writeRow = 1; // Start writing from the bottom visible row (index 1)
        // Read from bottom visible row up to the top visible row
        for (let readRow = 1; readRow <= VISIBLE_GRID_HEIGHT; readRow++) {
            const block = grid[readRow][c];
            if (block !== null) {
                if (readRow > writeRow) {
                    if (block.state === 'clearing' || block.state === 'flashing') {
                        console.warn(`Block ${block.id} trying to fall while ${block.state}. Skipping fall.`);
                        grid[readRow][c] = null;
                        continue;
                    }

                    blocksFell = true;
                    grid[writeRow][c] = block;
                    grid[readRow][c] = null;
                    block.row = writeRow;
                    block.state = 'falling';

                    if(block.element) {
                        block.element.classList.add('falling');
                        updateBlockVisualPosition(block);
                    }
                }
                writeRow++;
            }
        }
    }

    if (blocksFell) {
        setTimeout(() => {
            blocks.forEach(block => {
                if (block && block.state === 'falling') {
                    block.state = 'idle';
                    if(block.element) {
                        block.element.classList.remove('falling');
                        updateBlockVisualPosition(block);
                    }
                }
            });
            isProcessing = false;
            checkMatchesAndProcess();
            if (onComplete) onComplete();
        }, FALL_DURATION);
    } else {
        let matchesExist = false;
        if(currentChain > 0) {
            matchesExist = findMatches().length > 0;
            if (!matchesExist) {
                    currentChain = 0;
                    updateChainDisplay();
            }
        }

        if(!matchesExist) {
            isProcessing = false;
        }
        if (onComplete) onComplete();
        if (matchesExist) {
            checkMatchesAndProcess();
        }
    }
}

function triggerGameOver(reason) {
    if (isGameOver) return;
    console.error("Game Over:", reason);
    isGameOver = true;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    activeClearPromises = [];
    isProcessing = true;
    
    playSound(gameOverSound);

    finalScoreElement.textContent = `Final Score: ${score}`;
    gameOverOverlay.style.display = 'flex';

    // Remove all blocks when game over
    blocks.forEach(b => {
        if (b && b.element) {
            b.element.classList.remove('flashing', 'falling', 'swapping');
            b.element.style.animation = 'none';
            b.element.style.transition = 'none';
            updateBlockVisualPosition(b);
        }
    });
    cursorElement.style.display = 'none';
}
