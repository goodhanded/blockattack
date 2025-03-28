/* js/game.js */

// Global Game State Variables
let grid = [];
let blocks = [];
let cursor = { row: 5, col: 2 };
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
    cursor = { row: 5, col: 2 };
    nextBlockId = 0;
    activeClearPromises = [];

    riseOffset = 0;
    currentRiseSpeed = INITIAL_RISE_SPEED;
    lastTimestamp = 0;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = null;

    // Clear any existing blocks
    gameBoard.querySelectorAll('.block').forEach(el => el.remove());

    // Initialize grid and blocks array (grid has an extra buffer row)
    grid = Array(GRID_HEIGHT + 1).fill(null).map(() => Array(GRID_WIDTH).fill(null));
    blocks = [];

    // Create initial stack (bottom 5 rows)
    for (let r = 0; r < 5; r++) {
         generateNewRowData(r);
    }
    // Clear remaining rows (above initial stack)
    for (let r = 5; r < GRID_HEIGHT + 1; r++){
         for (let c = 0; c < GRID_WIDTH; c++){
              grid[r][c] = null;
         }
    }

    // Render initial blocks
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
    riseOffset += currentRiseSpeed * deltaTime;

    let rowsCommitted = 0;
    while (riseOffset >= BLOCK_SIZE) {
         riseOffset -= BLOCK_SIZE;
         commitLogicalRise();
         rowsCommitted++;
    }
    updateAllBlockVisualPositions();

    if (rowsCommitted > 0 && checkGameOverCondition()) {
         triggerGameOver("Block reached top after commit.");
         return;
    }
    animationFrameId = requestAnimationFrame(gameLoop);
}

function checkGameOverCondition() {
    for (let c = 0; c < GRID_WIDTH; c++) {
         const block = grid[GRID_HEIGHT]?.[c];
         if (block && block.state !== 'clearing' && block.state !== 'flashing') {
              console.log(`Game over condition met: Block ${block.id} at (${GRID_HEIGHT}, ${c}) state: ${block.state}`);
              return true;
         }
    }
    return false;
}

function commitLogicalRise() {
    for (let r = GRID_HEIGHT; r >= 0; r--) {
         for (let c = 0; c < GRID_WIDTH; c++) {
              const block = grid[r][c];
              if (block) {
                    block.row++;
                    if (block.row > GRID_HEIGHT && block.state !== 'clearing' && block.state !== 'flashing') {
                         triggerGameOver(`Block ${block.id} pushed beyond buffer row.`);
                         if(isGameOver) return;
                    }
              }
              if (r < GRID_HEIGHT) {
                    grid[r+1][c] = grid[r][c];
              }
         }
    }
    for (let c = 0; c < GRID_WIDTH; c++){
         grid[0][c] = null;
    }
    const newRowBlockData = generateNewRowData(0);
    newRowBlockData.forEach(renderBlock);
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
         do {
              type = Math.floor(Math.random() * BLOCK_TYPES);
              attempts++;
         } while (attempts < 10 && targetRow > 0 && grid[targetRow+1]?.[c] !== null && grid[targetRow+1][c].type === type && grid[targetRow+1][c].state === 'idle');
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
    }
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
                    requiresCheck = true;
                    c = -1;
              }
         }
    }
    return newRowBlocks;
}

function swapBlocks(r, c1, c2) {
    if (isGameOver || c1 < 0 || c1 >= GRID_WIDTH || c2 < 0 || c2 >= GRID_WIDTH || r < 0 || r >= GRID_HEIGHT + 1) {
         if (r >= GRID_HEIGHT) return;
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
    
    for (let r = 0; r < GRID_HEIGHT; r++) {
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
                   for (let nr = r+1; nr < GRID_HEIGHT; nr++) {
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
         let writeRow = 0;
         for (let readRow = 0; readRow < GRID_HEIGHT; readRow++) {
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

    blocks.forEach(b => {
         if (b.element) {
              b.element.classList.remove('flashing', 'falling', 'swapping');
              b.element.style.animation = 'none';
              b.element.style.transition = 'none';
              updateBlockVisualPosition(b);
         }
    });
    cursorElement.style.display = 'none';
}
