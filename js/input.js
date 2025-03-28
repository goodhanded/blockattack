/* js/input.js */

document.addEventListener('keydown', handleKeyDown);

function handleKeyDown(event) {
    if (startOverlay.style.display === 'flex') {
         if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              audioContextAllowed = true;
              initGame();
         }
         return;
    }
    if (gameOverOverlay.style.display === 'flex') {
         if (event.key === 'Enter') {
              event.preventDefault();
              initGame();
         }
         return;
    }
    if (isGameOver) return;
    if (isProcessing) {
         console.log("Input ignored: Processing active.");
         return;
    }
    let moved = false;
    let newRow = cursor.row;
    let newCol = cursor.col;
    switch(event.key) {
         case 'ArrowLeft':
              if (cursor.col > 0) {
                    newCol--;
                    moved = true;
              }
              break;
         case 'ArrowRight':
              if (cursor.col < GRID_WIDTH - 2) {
                    newCol++;
                    moved = true;
              }
              break;
         case 'ArrowUp':
              if (cursor.row < GRID_HEIGHT - 1) {
                    newRow++;
                    moved = true;
              }
              break;
         case 'ArrowDown':
              if (cursor.row > 0) {
                    newRow--;
                    moved = true;
              }
              break;
         case ' ':
         case 'x':
         case 'X':
              event.preventDefault();
              swapBlocks(cursor.row, cursor.col, cursor.col + 1);
              break;
    }
    if (moved) {
         cursor.row = newRow;
         cursor.col = newCol;
         renderCursor();
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) {
         event.preventDefault();
    }
}

restartButton.addEventListener('click', () => {
    initGame();
});

startButton.addEventListener('click', () => {
    audioContextAllowed = true;
    swapSound.load();
    clearSound.load();
    gameOverSound.load();
    initGame();
});

gameBoard.addEventListener('click', (event) => {
    if (isGameOver || startOverlay.style.display === 'flex' || isProcessing) return;
    if (!audioContextAllowed) {
         audioContextAllowed = true;
         swapSound.load();
         clearSound.load();
         gameOverSound.load();
    }

    const rect = gameBoard.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top + riseOffset;

    const col = Math.floor(x / BLOCK_SIZE);
    const row = VISIBLE_GRID_HEIGHT - 1 - Math.floor(y / BLOCK_SIZE);

    if (col < 0 || col >= GRID_WIDTH || row < 0 || row >= GRID_HEIGHT) return;

    if (row === cursor.row && (col === cursor.col || col === cursor.col + 1)) {
         console.log("Tapped cursor location - swapping");
         swapBlocks(cursor.row, cursor.col, cursor.col + 1);
    } else {
         console.log(`Tapped: (${row}, ${col}). Moving cursor.`);
         cursor.row = row;
         cursor.col = Math.min(col, GRID_WIDTH - 2);
         renderCursor();
    }
});
