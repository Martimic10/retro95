const SIZE = 4;

function createGrid() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function cloneGrid(grid) {
    return grid.map((row) => [...row]);
}

function randomEmptyCell(grid) {
    const empty = [];
    for (let y = 0; y < SIZE; y += 1) {
        for (let x = 0; x < SIZE; x += 1) {
            if (grid[y][x] === 0) empty.push({ x, y });
        }
    }
    if (!empty.length) return null;
    return empty[Math.floor(Math.random() * empty.length)];
}

function addRandomTile(grid) {
    const cell = randomEmptyCell(grid);
    if (!cell) return false;
    grid[cell.y][cell.x] = Math.random() < 0.9 ? 2 : 4;
    return true;
}

function slideLine(line) {
    const nonZero = line.filter((v) => v !== 0);
    const result = [];
    let score = 0;

    for (let i = 0; i < nonZero.length; i += 1) {
        if (nonZero[i] !== 0 && nonZero[i] === nonZero[i + 1]) {
            const merged = nonZero[i] * 2;
            result.push(merged);
            score += merged;
            i += 1;
        } else {
            result.push(nonZero[i]);
        }
    }

    while (result.length < SIZE) result.push(0);
    return { line: result, score };
}

function moveGrid(grid, direction) {
    const next = createGrid();
    let moved = false;
    let gained = 0;

    const read = (x, y) => grid[y][x];
    const write = (x, y, v) => { next[y][x] = v; };

    for (let i = 0; i < SIZE; i += 1) {
        const line = [];
        for (let j = 0; j < SIZE; j += 1) {
            if (direction === 'left') line.push(read(j, i));
            if (direction === 'right') line.push(read(SIZE - 1 - j, i));
            if (direction === 'up') line.push(read(i, j));
            if (direction === 'down') line.push(read(i, SIZE - 1 - j));
        }

        const { line: slided, score } = slideLine(line);
        gained += score;

        for (let j = 0; j < SIZE; j += 1) {
            const value = slided[j];
            if (direction === 'left') write(j, i, value);
            if (direction === 'right') write(SIZE - 1 - j, i, value);
            if (direction === 'up') write(i, j, value);
            if (direction === 'down') write(i, SIZE - 1 - j, value);
        }
    }

    for (let y = 0; y < SIZE; y += 1) {
        for (let x = 0; x < SIZE; x += 1) {
            if (next[y][x] !== grid[y][x]) moved = true;
        }
    }

    return { moved, grid: next, score: gained };
}

function hasMoves(grid) {
    for (let y = 0; y < SIZE; y += 1) {
        for (let x = 0; x < SIZE; x += 1) {
            if (grid[y][x] === 0) return true;
            if (x + 1 < SIZE && grid[y][x] === grid[y][x + 1]) return true;
            if (y + 1 < SIZE && grid[y][x] === grid[y + 1][x]) return true;
        }
    }
    return false;
}

export function create2048Game({ onChange, onGameOver }) {
    let grid = createGrid();
    let score = 0;
    let gameOver = false;

    function emit() {
        onChange({ grid: cloneGrid(grid), score, gameOver });
    }

    function reset() {
        grid = createGrid();
        score = 0;
        gameOver = false;
        addRandomTile(grid);
        addRandomTile(grid);
        emit();
    }

    function move(direction) {
        if (gameOver) return;
        const result = moveGrid(grid, direction);
        if (!result.moved) return;

        grid = result.grid;
        score += result.score;
        addRandomTile(grid);

        if (!hasMoves(grid)) {
            gameOver = true;
            onGameOver({ score });
        }

        emit();
    }

    function onKeyDown(event) {
        const key = event.key.toLowerCase();
        if (key === 'arrowleft' || key === 'a') {
            event.preventDefault();
            move('left');
        } else if (key === 'arrowright' || key === 'd') {
            event.preventDefault();
            move('right');
        } else if (key === 'arrowup' || key === 'w') {
            event.preventDefault();
            move('up');
        } else if (key === 'arrowdown' || key === 's') {
            event.preventDefault();
            move('down');
        }
    }

    return {
        reset,
        onKeyDown,
        getScore() { return score; },
        isGameOver() { return gameOver; }
    };
}
