/* js/rendering.js */

function renderBlock(blockData) {
    const blockElement = document.createElement('div');
    blockElement.classList.add('block', `block-type-${blockData.type}`);
    blockElement.dataset.id = blockData.id;
    blockData.element = blockElement;
    updateBlockVisualPosition(blockData);
    gameBoard.appendChild(blockElement);
}

function updateBlockVisualPosition(blockData) {
    if (!blockData.element) return;
    const baseX = blockData.col * BLOCK_SIZE;
    
    // Position blocks: Row 0 is below screen, Rows 1-12 are visible
    // Maps row 1 to y=(VISIBLE_GRID_HEIGHT-1)*BLOCK_SIZE, row 12 to y=0
    // Maps row 0 to y=VISIBLE_GRID_HEIGHT*BLOCK_SIZE
    let baseY = (VISIBLE_GRID_HEIGHT - blockData.row) * BLOCK_SIZE;
    
    blockData.element.style.left = `${baseX}px`;
    blockData.element.style.top = `${baseY}px`;
    // Apply rising offset to all blocks
    blockData.element.style.transform = `translateY(${-riseOffset}px)`;
}

function updateAllBlockVisualPositions() {
    blocks.forEach(block => {
        if (block && block.element) {
            updateBlockVisualPosition(block);
        }
    });
    renderCursor();
}

function renderCursor() {
    const baseX = cursor.col * BLOCK_SIZE;
    // Align cursor baseY calculation with block positioning (1-based index for visible rows)
    const baseY = (VISIBLE_GRID_HEIGHT - cursor.row) * BLOCK_SIZE;
    cursorElement.style.left = `${baseX}px`;
    cursorElement.style.top = `${baseY}px`;
    cursorElement.style.transform = `translateY(${-riseOffset}px)`;
}

function updateScoreDisplay() {
    scoreElement.textContent = `Score: ${score}`;
}

function updateChainDisplay() {
    chainElement.textContent = `Chain: x${currentChain}`;
}
