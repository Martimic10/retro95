import { requirePro, isPro } from '../os/pro.js';
import { createSnakeGame } from '../games/snake.js';
import { createPongGame } from '../games/pong.js';
import { createTetrisGame } from '../games/tetris.js';
import { create2048Game } from '../games/2048.js';

function getGameWindowActive(container) {
    const windowEl = container.closest('.window');
    return Boolean(container.isConnected && windowEl && windowEl.style.display !== 'none');
}

function bindCanvasScaling(canvas, wrap, baseWidth, baseHeight) {
    function applyScale() {
        const styles = window.getComputedStyle(wrap);
        const paddingX = parseFloat(styles.paddingLeft || '0') + parseFloat(styles.paddingRight || '0');
        const paddingY = parseFloat(styles.paddingTop || '0') + parseFloat(styles.paddingBottom || '0');

        const availableWidth = Math.max(0, wrap.clientWidth - paddingX);
        const availableHeight = Math.max(0, wrap.clientHeight - paddingY);
        if (!availableWidth || !availableHeight) return;

        const scale = Math.max(0.1, Math.min(availableWidth / baseWidth, availableHeight / baseHeight));
        canvas.style.width = `${Math.floor(baseWidth * scale)}px`;
        canvas.style.height = `${Math.floor(baseHeight * scale)}px`;
    }

    applyScale();
    const observer = new ResizeObserver(() => applyScale());
    observer.observe(wrap);
    return () => observer.disconnect();
}

const gamesHubApp = {
    id: 'gamesHub',
    name: 'Games',
    desktopName: 'Games',
    icon: '🎮',
    defaultSize: { w: 470, h: 360 },
    singleInstance: true,
    showOnDesktop: true,
    createWindowContent({ os }) {
        const root = document.createElement('div');
        root.className = 'games-hub';

        const title = document.createElement('div');
        title.className = 'label';
        title.textContent = 'Retro95 Games';

        const list = document.createElement('div');
        list.className = 'games-hub-list';

        const games = [
            { id: 'snake', name: 'Snake', icon: '🐍', pro: false },
            { id: 'pong', name: 'Pong', icon: '🏓', pro: false },
            { id: 'tetris', name: 'Tetris', icon: '🧱', pro: true },
            { id: '2048', name: '2048', icon: '🔢', pro: true }
        ];

        let selectedId = games[0].id;

        function launchGame(id) {
            const game = games.find((g) => g.id === id);
            if (!game) return;
            if (game.pro) {
                requirePro(() => os.launchApp(id));
            } else {
                os.launchApp(id);
            }
        }

        function renderSelection() {
            list.querySelectorAll('.games-hub-item').forEach((item) => {
                item.classList.toggle('selected', item.dataset.appId === selectedId);
            });
        }

        function renderList() {
            list.innerHTML = '';
            games.forEach((game) => {
                const item = document.createElement('button');
                item.type = 'button';
                item.className = 'games-hub-item';
                item.dataset.appId = game.id;
                const badge = game.pro ? (isPro() ? 'UNLOCKED' : 'PRO') : 'FREE';
                item.innerHTML = `
                    <div class="games-hub-icon">${game.icon}</div>
                    <div class="games-hub-name">${game.name}</div>
                    <div class="games-hub-badge">${badge}</div>
                `;

                item.addEventListener('click', () => {
                    selectedId = game.id;
                    renderSelection();
                });
                item.addEventListener('dblclick', () => launchGame(game.id));
                list.appendChild(item);
            });
            renderSelection();
        }

        const statsDivider = document.createElement('div');
        statsDivider.className = 'games-hub-divider';

        const statsBox = document.createElement('div');
        statsBox.className = 'games-hub-stats';

        function renderStats() {
            const stats = os.getGameStats();
            statsBox.innerHTML = `
                Snake High Score: ${stats.snakeHighScore}<br>
                Pong Wins: ${stats.pongWins}<br>
                2048 Best: ${stats.game2048BestScore || 0}<br>
                Total Games Played: ${stats.gamesPlayed}
            `;
        }

        root.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && selectedId) {
                event.preventDefault();
                launchGame(selectedId);
            }
            if ((event.key === 'ArrowDown' || event.key === 'ArrowRight') && games.length > 1) {
                event.preventDefault();
                const index = games.findIndex((g) => g.id === selectedId);
                selectedId = games[(index + 1) % games.length].id;
                renderSelection();
            }
            if ((event.key === 'ArrowUp' || event.key === 'ArrowLeft') && games.length > 1) {
                event.preventDefault();
                const index = games.findIndex((g) => g.id === selectedId);
                selectedId = games[(index - 1 + games.length) % games.length].id;
                renderSelection();
            }
        });

        function onProUnlocked() {
            renderList();
            renderStats();
        }

        window.addEventListener('retro95:proUnlocked', onProUnlocked);

        const cleanupObserver = new MutationObserver(() => {
            if (!root.isConnected) {
                window.removeEventListener('retro95:proUnlocked', onProUnlocked);
                cleanupObserver.disconnect();
            }
        });
        cleanupObserver.observe(document.body, { childList: true, subtree: true });

        root.tabIndex = 0;
        root.append(title, list, statsDivider, statsBox);
        renderList();
        renderStats();
        window.setTimeout(() => root.focus(), 0);
        return root;
    }
};

const snakeApp = {
    id: 'snake',
    name: 'Snake',
    desktopName: 'Snake',
    icon: '🐍',
    defaultSize: { w: 430, h: 470 },
    showOnDesktop: false,
    createWindowContent({ os }) {
        const root = document.createElement('div');
        root.className = 'retro-game';

        const scoreLine = document.createElement('div');
        scoreLine.className = 'retro-game-score';
        scoreLine.textContent = 'Score: 0';

        const canvasWrap = document.createElement('div');
        canvasWrap.className = 'retro-game-canvas-wrap';

        const canvas = document.createElement('canvas');
        canvas.className = 'retro-game-canvas';
        canvasWrap.appendChild(canvas);

        const hint = document.createElement('div');
        hint.className = 'retro-game-hint';
        hint.textContent = 'Arrow Keys to Move - Space to Pause - Enter to Restart';

        root.append(scoreLine, canvasWrap, hint);

        const game = createSnakeGame({
            canvas,
            isActive: () => getGameWindowActive(root),
            onScoreChange(score) {
                scoreLine.textContent = `Score: ${score}`;
            },
            onGameOver({ score }) {
                const stats = os.getGameStats();
                const nextHigh = Math.max(stats.snakeHighScore || 0, score);
                os.updateGameStats({
                    gamesPlayed: (stats.gamesPlayed || 0) + 1,
                    snakeHighScore: nextHigh
                });
            }
        });

        function onKeyDown(event) {
            game.onKeyDown(event);
        }

        document.addEventListener('keydown', onKeyDown);
        const stopCanvasScaling = bindCanvasScaling(canvas, canvasWrap, 320, 320);
        const activityTimer = window.setInterval(() => {
            if (!root.isConnected) return;
            if (getGameWindowActive(root)) game.resume();
            else game.pause();
        }, 150);

        const cleanupObserver = new MutationObserver(() => {
            if (!root.isConnected) {
                document.removeEventListener('keydown', onKeyDown);
                stopCanvasScaling();
                window.clearInterval(activityTimer);
                game.destroy();
                cleanupObserver.disconnect();
            }
        });
        cleanupObserver.observe(document.body, { childList: true, subtree: true });

        game.start();
        return root;
    }
};

const pongApp = {
    id: 'pong',
    name: 'Pong',
    desktopName: 'Pong',
    icon: '🏓',
    defaultSize: { w: 620, h: 460 },
    showOnDesktop: false,
    createWindowContent({ os }) {
        const root = document.createElement('div');
        root.className = 'retro-game';

        const scoreLine = document.createElement('div');
        scoreLine.className = 'retro-game-score';
        scoreLine.textContent = 'Player 0 : 0 CPU';

        const canvasWrap = document.createElement('div');
        canvasWrap.className = 'retro-game-canvas-wrap';

        const canvas = document.createElement('canvas');
        canvas.className = 'retro-game-canvas';
        canvasWrap.appendChild(canvas);

        const hint = document.createElement('div');
        hint.className = 'retro-game-hint';
        hint.textContent = 'Move Mouse or Arrow Keys - First to 5 Wins';

        root.append(scoreLine, canvasWrap, hint);

        const game = createPongGame({
            canvas,
            isActive: () => getGameWindowActive(root),
            onScoreChange({ player, cpu }) {
                scoreLine.textContent = `Player ${player} : ${cpu} CPU`;
            },
            onGameOver({ winner }) {
                const stats = os.getGameStats();
                os.updateGameStats({
                    gamesPlayed: (stats.gamesPlayed || 0) + 1,
                    pongWins: (stats.pongWins || 0) + (winner === 'player' ? 1 : 0)
                });
            }
        });

        function onKeyDown(event) {
            game.onKeyDown(event);
        }

        function onKeyUp(event) {
            game.onKeyUp(event);
        }

        function onMouseMove(event) {
            if (event.target === canvas || canvas.contains(event.target)) {
                game.onMouseMove(event);
            }
        }

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        canvas.addEventListener('mousemove', onMouseMove);
        const stopCanvasScaling = bindCanvasScaling(canvas, canvasWrap, 520, 300);
        const activityTimer = window.setInterval(() => {
            if (!root.isConnected) return;
            if (getGameWindowActive(root)) game.resume();
            else game.pause();
        }, 150);

        const cleanupObserver = new MutationObserver(() => {
            if (!root.isConnected) {
                document.removeEventListener('keydown', onKeyDown);
                document.removeEventListener('keyup', onKeyUp);
                canvas.removeEventListener('mousemove', onMouseMove);
                stopCanvasScaling();
                window.clearInterval(activityTimer);
                game.destroy();
                cleanupObserver.disconnect();
            }
        });
        cleanupObserver.observe(document.body, { childList: true, subtree: true });

        game.start();
        return root;
    }
};

const tetrisApp = {
    id: 'tetris',
    name: 'Tetris',
    desktopName: 'Tetris',
    icon: '🧱',
    defaultSize: { w: 430, h: 540 },
    showOnDesktop: false,
    proOnly: true,
    createWindowContent({ os }) {
        const root = document.createElement('div');
        root.className = 'retro-game';

        const scoreLine = document.createElement('div');
        scoreLine.className = 'retro-game-score';
        scoreLine.textContent = 'Score: 0  Lines: 0';

        const canvasWrap = document.createElement('div');
        canvasWrap.className = 'retro-game-canvas-wrap';

        const canvas = document.createElement('canvas');
        canvas.className = 'retro-game-canvas';
        canvasWrap.appendChild(canvas);

        const hint = document.createElement('div');
        hint.className = 'retro-game-hint';
        hint.textContent = 'Arrow Keys Move/Rotate - Space Hard Drop - P Pause - Enter Restart';

        root.append(scoreLine, canvasWrap, hint);

        const game = createTetrisGame({
            canvas,
            isActive: () => getGameWindowActive(root),
            onScoreChange({ score, lines }) {
                scoreLine.textContent = `Score: ${score}  Lines: ${lines}`;
            },
            onGameOver() {
                const stats = os.getGameStats();
                os.updateGameStats({
                    gamesPlayed: (stats.gamesPlayed || 0) + 1
                });
            }
        });

        function onKeyDown(event) {
            game.onKeyDown(event);
        }

        document.addEventListener('keydown', onKeyDown);
        const stopCanvasScaling = bindCanvasScaling(canvas, canvasWrap, 200, 400);
        const activityTimer = window.setInterval(() => {
            if (!root.isConnected) return;
            if (getGameWindowActive(root)) game.resume();
            else game.pause();
        }, 150);

        const cleanupObserver = new MutationObserver(() => {
            if (!root.isConnected) {
                document.removeEventListener('keydown', onKeyDown);
                stopCanvasScaling();
                window.clearInterval(activityTimer);
                game.destroy();
                cleanupObserver.disconnect();
            }
        });
        cleanupObserver.observe(document.body, { childList: true, subtree: true });

        game.start();
        return root;
    }
};

const game2048App = {
    id: '2048',
    name: '2048',
    desktopName: '2048',
    icon: '🔢',
    defaultSize: { w: 420, h: 500 },
    showOnDesktop: false,
    proOnly: true,
    createWindowContent({ os }) {
        const root = document.createElement('div');
        root.className = 'retro-game';

        const scoreLine = document.createElement('div');
        scoreLine.className = 'retro-game-score';
        scoreLine.textContent = 'Score: 0';

        const boardWrap = document.createElement('div');
        boardWrap.className = 'game2048-wrap';
        const board = document.createElement('div');
        board.className = 'game2048-board';
        boardWrap.appendChild(board);

        const controls = document.createElement('div');
        controls.className = 'settings-row';
        const newBtn = document.createElement('button');
        newBtn.className = 'btn';
        newBtn.textContent = 'New Game';
        controls.appendChild(newBtn);

        const hint = document.createElement('div');
        hint.className = 'retro-game-hint';
        hint.textContent = 'Arrow Keys or WASD to Move';

        root.append(scoreLine, boardWrap, controls, hint);

        const game = create2048Game({
            onChange({ grid, score, gameOver }) {
                scoreLine.textContent = `Score: ${score}`;
                renderGrid(grid, gameOver);
            },
            onGameOver({ score }) {
                const stats = os.getGameStats();
                os.updateGameStats({
                    gamesPlayed: (stats.gamesPlayed || 0) + 1,
                    game2048BestScore: Math.max(stats.game2048BestScore || 0, score)
                });
            }
        });

        function renderGrid(grid, gameOver) {
            board.innerHTML = '';
            for (let y = 0; y < 4; y += 1) {
                for (let x = 0; x < 4; x += 1) {
                    const cell = document.createElement('div');
                    cell.className = 'game2048-tile';
                    const value = grid[y][x];
                    cell.textContent = value === 0 ? '' : String(value);
                    cell.dataset.value = String(value);
                    board.appendChild(cell);
                }
            }

            if (gameOver) {
                const overlay = document.createElement('div');
                overlay.className = 'game2048-overlay';
                overlay.textContent = 'Game Over';
                board.appendChild(overlay);
            }
        }

        function onKeyDown(event) {
            game.onKeyDown(event);
        }

        document.addEventListener('keydown', onKeyDown);
        newBtn.addEventListener('click', () => game.reset());

        const cleanupObserver = new MutationObserver(() => {
            if (!root.isConnected) {
                document.removeEventListener('keydown', onKeyDown);
                cleanupObserver.disconnect();
            }
        });
        cleanupObserver.observe(document.body, { childList: true, subtree: true });

        game.reset();
        return root;
    }
};

export { snakeApp, pongApp, tetrisApp, game2048App };
export default gamesHubApp;
