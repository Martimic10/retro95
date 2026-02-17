const SIZE = 8;
const MINES = 10;
const STATS_KEY = 'retroos_minesweeper_stats_v1';

function createBoard() {
    const board = [];
    for (let y = 0; y < SIZE; y += 1) {
        const row = [];
        for (let x = 0; x < SIZE; x += 1) {
            row.push({ mine: false, revealed: false, flagged: false, adjacent: 0 });
        }
        board.push(row);
    }
    return board;
}

function forEachNeighbor(x, y, fn) {
    for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= SIZE || ny >= SIZE) continue;
            fn(nx, ny);
        }
    }
}

function loadStats() {
    try {
        const raw = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
        return {
            gamesPlayed: Number(raw.gamesPlayed) || 0,
            bestTime: Number(raw.bestTime) || null
        };
    } catch (_error) {
        return { gamesPlayed: 0, bestTime: null };
    }
}

function saveStats(stats) {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

const minesweeperApp = {
    id: 'minesweeper',
    name: 'Minesweeper',
    desktopName: 'Minesweeper',
    icon: '💣',
    defaultSize: { w: 360, h: 430 },
    singleInstance: false,
    createWindowContent({ os }) {
        const stats = loadStats();
        const root = document.createElement('div');
        root.className = 'minesweeper';

        const top = document.createElement('div');
        top.className = 'minesweeper-top';

        const status = document.createElement('div');
        status.className = 'minesweeper-status';

        const faceBtn = document.createElement('button');
        faceBtn.className = 'btn';
        faceBtn.textContent = ':)';

        const timer = document.createElement('div');
        timer.className = 'minesweeper-status';

        top.append(status, faceBtn, timer);

        const grid = document.createElement('div');
        grid.className = 'minesweeper-grid';

        const footer = document.createElement('div');
        footer.className = 'minesweeper-footer';

        root.append(top, grid, footer);

        let board = createBoard();
        let startedAt = 0;
        let tick = null;
        let gameOver = false;

        function renderFooter(message) {
            const best = stats.bestTime ? `${stats.bestTime}s` : '--';
            footer.textContent = `${message || 'Find all mines.'}  Games: ${stats.gamesPlayed}  Best: ${best}`;
        }

        function updateTimer() {
            if (!startedAt || gameOver) {
                timer.textContent = '000';
                return;
            }
            const seconds = Math.floor((Date.now() - startedAt) / 1000);
            timer.textContent = String(seconds).padStart(3, '0');
        }

        function countFlags() {
            let flags = 0;
            for (const row of board) {
                for (const cell of row) if (cell.flagged) flags += 1;
            }
            return flags;
        }

        function updateStatus() {
            status.textContent = `${String(MINES - countFlags()).padStart(3, '0')}`;
        }

        function placeMines(excludeX, excludeY) {
            let placed = 0;
            while (placed < MINES) {
                const x = Math.floor(Math.random() * SIZE);
                const y = Math.floor(Math.random() * SIZE);
                if (board[y][x].mine) continue;
                if (x === excludeX && y === excludeY) continue;
                board[y][x].mine = true;
                placed += 1;
            }

            for (let y = 0; y < SIZE; y += 1) {
                for (let x = 0; x < SIZE; x += 1) {
                    let count = 0;
                    forEachNeighbor(x, y, (nx, ny) => {
                        if (board[ny][nx].mine) count += 1;
                    });
                    board[y][x].adjacent = count;
                }
            }
        }

        function revealFlood(x, y) {
            const stack = [[x, y]];
            while (stack.length) {
                const [cx, cy] = stack.pop();
                const cell = board[cy][cx];
                if (cell.revealed || cell.flagged) continue;
                cell.revealed = true;
                if (cell.adjacent !== 0) continue;
                forEachNeighbor(cx, cy, (nx, ny) => {
                    const next = board[ny][nx];
                    if (!next.revealed && !next.flagged && !next.mine) {
                        stack.push([nx, ny]);
                    }
                });
            }
        }

        function revealAllMines() {
            for (const row of board) {
                for (const cell of row) {
                    if (cell.mine) cell.revealed = true;
                }
            }
        }

        function didWin() {
            let hiddenSafe = 0;
            for (const row of board) {
                for (const cell of row) {
                    if (!cell.mine && !cell.revealed) hiddenSafe += 1;
                }
            }
            return hiddenSafe === 0;
        }

        function endGame(won) {
            gameOver = true;
            faceBtn.textContent = won ? 'B)' : ':(';
            if (tick) {
                clearInterval(tick);
                tick = null;
            }

            const seconds = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
            if (won) {
                if (!stats.bestTime || seconds < stats.bestTime) stats.bestTime = seconds;
                saveStats(stats);
                os.unlockAchievement('minesweeper_win');
                os.showToast(`Minesweeper clear in ${seconds}s`);
                renderFooter('You win!');
            } else {
                renderFooter('Boom! You hit a mine.');
            }
            renderGrid();
        }

        function onReveal(x, y) {
            if (gameOver) return;
            const cell = board[y][x];
            if (cell.flagged || cell.revealed) return;

            if (!startedAt) {
                placeMines(x, y);
                startedAt = Date.now();
                tick = setInterval(updateTimer, 250);
            }

            if (cell.mine) {
                revealAllMines();
                endGame(false);
                return;
            }

            if (cell.adjacent === 0) revealFlood(x, y);
            else cell.revealed = true;

            if (didWin()) {
                endGame(true);
            } else {
                renderGrid();
            }
        }

        function onFlag(x, y) {
            if (gameOver) return;
            const cell = board[y][x];
            if (cell.revealed) return;
            cell.flagged = !cell.flagged;
            updateStatus();
            renderGrid();
        }

        function renderGrid() {
            grid.innerHTML = '';
            for (let y = 0; y < SIZE; y += 1) {
                for (let x = 0; x < SIZE; x += 1) {
                    const cell = board[y][x];
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'minesweeper-cell';

                    if (cell.revealed) {
                        btn.classList.add('revealed');
                        if (cell.mine) btn.textContent = '*';
                        else if (cell.adjacent > 0) btn.textContent = String(cell.adjacent);
                    } else if (cell.flagged) {
                        btn.textContent = 'F';
                    }

                    btn.addEventListener('click', () => onReveal(x, y));
                    btn.addEventListener('contextmenu', (event) => {
                        event.preventDefault();
                        onFlag(x, y);
                    });

                    grid.appendChild(btn);
                }
            }
            updateStatus();
            updateTimer();
        }

        function newGame() {
            if (tick) {
                clearInterval(tick);
                tick = null;
            }
            stats.gamesPlayed += 1;
            saveStats(stats);
            board = createBoard();
            startedAt = 0;
            gameOver = false;
            faceBtn.textContent = ':)';
            renderGrid();
            renderFooter('New game started.');
        }

        faceBtn.addEventListener('click', newGame);
        newGame();
        return root;
    }
};

export default minesweeperApp;
