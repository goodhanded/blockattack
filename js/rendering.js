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
    const baseY = (VISIBLE_GRID_HEIGHT - 1 - blockData.row) * BLOCK_SIZE;
    blockData.element.style.left = `${baseX}px`;
    blockData.element.style.top = `${baseY}px`;
    if (blockData.state !== 'falling' && blockData.state !== 'swapping') {
        blockData.element.style.transform = `translateY(${-riseOffset}px)`;
    } else {
        blockData.element.style.transform = `translateY(0px)`;
    }
}

function updateAllBlockVisualPositions() {
    blocks.forEach(block => {
        if (block.element) {
            updateBlockVisualPosition(block);
        }
    });
    renderCursor();
}

function renderCursor() {
    const baseX = cursor.col * BLOCK_SIZE;
    const baseY = (VISIBLE_GRID_HEIGHT - 1 - cursor.row) * BLOCK_SIZE;
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
