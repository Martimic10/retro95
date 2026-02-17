const COLS = 10;
const ROWS = 20;
const CELL = 20;
const BASE_DROP_MS = 500;

const PIECES = [
    { name: 'I', color: '#00ffff', shape: [[1, 1, 1, 1]] },
    { name: 'O', color: '#ffff00', shape: [[1, 1], [1, 1]] },
    { name: 'T', color: '#aa00ff', shape: [[0, 1, 0], [1, 1, 1]] },
    { name: 'S', color: '#00ff00', shape: [[0, 1, 1], [1, 1, 0]] },
    { name: 'Z', color: '#ff0000', shape: [[1, 1, 0], [0, 1, 1]] },
    { name: 'J', color: '#0044ff', shape: [[1, 0, 0], [1, 1, 1]] },
    { name: 'L', color: '#ff8800', shape: [[0, 0, 1], [1, 1, 1]] }
];

function cloneMatrix(matrix) {
    return matrix.map((row) => [...row]);
}

function rotateMatrix(matrix) {
    const h = matrix.length;
    const w = matrix[0].length;
    const rotated = Array.from({ length: w }, () => Array(h).fill(0));
    for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
            rotated[x][h - 1 - y] = matrix[y][x];
        }
    }
    return rotated;
}

function randomPiece() {
    const p = PIECES[Math.floor(Math.random() * PIECES.length)];
    return {
        name: p.name,
        color: p.color,
        shape: cloneMatrix(p.shape),
        x: Math.floor((COLS - p.shape[0].length) / 2),
        y: 0
    };
}

export function createTetrisGame({ canvas, onScoreChange, onGameOver, isActive }) {
    const ctx = canvas.getContext('2d');
    canvas.width = COLS * CELL;
    canvas.height = ROWS * CELL;

    let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    let piece = randomPiece();
    let score = 0;
    let lines = 0;
    let gameOver = false;
    let paused = false;
    let rafId = 0;
    let running = false;
    let destroyed = false;
    let lastTime = 0;
    let acc = 0;

    function emitScore() {
        onScoreChange({ score, lines });
    }

    function reset() {
        board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
        piece = randomPiece();
        score = 0;
        lines = 0;
        gameOver = false;
        paused = false;
        lastTime = 0;
        acc = 0;
        emitScore();
    }

    function collides(nextPiece) {
        for (let y = 0; y < nextPiece.shape.length; y += 1) {
            for (let x = 0; x < nextPiece.shape[y].length; x += 1) {
                if (!nextPiece.shape[y][x]) continue;
                const bx = nextPiece.x + x;
                const by = nextPiece.y + y;
                if (bx < 0 || bx >= COLS || by >= ROWS) return true;
                if (by >= 0 && board[by][bx]) return true;
            }
        }
        return false;
    }

    function mergePiece() {
        for (let y = 0; y < piece.shape.length; y += 1) {
            for (let x = 0; x < piece.shape[y].length; x += 1) {
                if (!piece.shape[y][x]) continue;
                const bx = piece.x + x;
                const by = piece.y + y;
                if (by < 0) continue;
                board[by][bx] = piece.color;
            }
        }
    }

    function clearLines() {
        let cleared = 0;
        for (let y = ROWS - 1; y >= 0; y -= 1) {
            if (board[y].every(Boolean)) {
                board.splice(y, 1);
                board.unshift(Array(COLS).fill(null));
                cleared += 1;
                y += 1;
            }
        }
        if (cleared > 0) {
            lines += cleared;
            score += cleared * 100;
            emitScore();
        }
    }

    function spawnNext() {
        piece = randomPiece();
        if (collides(piece)) {
            gameOver = true;
            onGameOver({ score, lines });
        }
    }

    function stepDown() {
        if (gameOver || paused) return;
        const next = { ...piece, y: piece.y + 1 };
        if (!collides(next)) {
            piece = next;
            return;
        }
        mergePiece();
        clearLines();
        spawnNext();
    }

    function move(dx) {
        if (gameOver || paused) return;
        const next = { ...piece, x: piece.x + dx };
        if (!collides(next)) {
            piece = next;
        }
    }

    function rotate() {
        if (gameOver || paused) return;
        const rotated = rotateMatrix(piece.shape);
        const next = { ...piece, shape: rotated };
        if (!collides(next)) {
            piece = next;
            return;
        }
        const kickRight = { ...next, x: next.x + 1 };
        const kickLeft = { ...next, x: next.x - 1 };
        if (!collides(kickRight)) piece = kickRight;
        else if (!collides(kickLeft)) piece = kickLeft;
    }

    function hardDrop() {
        if (gameOver || paused) return;
        let next = { ...piece, y: piece.y + 1 };
        while (!collides(next)) {
            piece = next;
            next = { ...piece, y: piece.y + 1 };
        }
        stepDown();
    }

    function drawCell(x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1);
    }

    function render() {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let y = 0; y < ROWS; y += 1) {
            for (let x = 0; x < COLS; x += 1) {
                if (board[y][x]) drawCell(x, y, board[y][x]);
            }
        }

        for (let y = 0; y < piece.shape.length; y += 1) {
            for (let x = 0; x < piece.shape[y].length; x += 1) {
                if (!piece.shape[y][x]) continue;
                drawCell(piece.x + x, piece.y + y, piece.color);
            }
        }

        if (paused && !gameOver) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px MS Sans Serif';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        }

        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px MS Sans Serif';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 8);
            ctx.font = '11px MS Sans Serif';
            ctx.fillText('Press Enter to Restart', canvas.width / 2, canvas.height / 2 + 14);
        }
    }

    function loop(timestamp) {
        if (destroyed || !canvas.isConnected || !running) return;

        if (isActive()) {
            if (!lastTime) lastTime = timestamp;
            const delta = timestamp - lastTime;
            lastTime = timestamp;
            acc += delta;

            while (acc >= BASE_DROP_MS) {
                stepDown();
                acc -= BASE_DROP_MS;
            }
        }

        render();
        rafId = requestAnimationFrame(loop);
    }

    function onKeyDown(event) {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            move(-1);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            move(1);
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            stepDown();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            rotate();
        } else if (event.key === ' ') {
            event.preventDefault();
            hardDrop();
        } else if (event.key.toLowerCase() === 'p') {
            event.preventDefault();
            paused = !paused;
        } else if (event.key === 'Enter' && gameOver) {
            event.preventDefault();
            reset();
        }
    }

    function start() {
        reset();
        render();
        running = true;
        rafId = requestAnimationFrame(loop);
    }

    function destroy() {
        destroyed = true;
        running = false;
        cancelAnimationFrame(rafId);
    }

    return {
        start,
        onKeyDown,
        destroy,
        pause() {
            running = false;
            cancelAnimationFrame(rafId);
        },
        resume() {
            if (destroyed || running) return;
            running = true;
            lastTime = 0;
            rafId = requestAnimationFrame(loop);
        }
    };
}
