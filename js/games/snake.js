const GRID_SIZE = 20;
const CELL_SIZE = 16;
const STEP_MS = 110;

function randomFood(snake) {
    while (true) {
        const food = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
        };
        if (!snake.some((segment) => segment.x === food.x && segment.y === food.y)) {
            return food;
        }
    }
}

export function createSnakeGame({ canvas, onScoreChange, onGameOver, isActive }) {
    const ctx = canvas.getContext('2d');
    canvas.width = GRID_SIZE * CELL_SIZE;
    canvas.height = GRID_SIZE * CELL_SIZE;

    let snake = [];
    let food = { x: 5, y: 5 };
    let direction = { x: 1, y: 0 };
    let nextDirection = { x: 1, y: 0 };
    let score = 0;
    let gameOver = false;
    let paused = false;
    let rafId = 0;
    let lastStep = 0;
    let destroyed = false;
    let running = false;

    function init() {
        snake = [
            { x: 9, y: 10 },
            { x: 8, y: 10 },
            { x: 7, y: 10 }
        ];
        food = randomFood(snake);
        direction = { x: 1, y: 0 };
        nextDirection = { x: 1, y: 0 };
        score = 0;
        gameOver = false;
        paused = false;
        lastStep = 0;
        onScoreChange(score);
    }

    function setDirection(dx, dy) {
        if (direction.x === -dx && direction.y === -dy) return;
        nextDirection = { x: dx, y: dy };
    }

    function update() {
        if (gameOver || paused) return;

        direction = nextDirection;
        const head = {
            x: snake[0].x + direction.x,
            y: snake[0].y + direction.y
        };

        if (head.x < 0 || head.y < 0 || head.x >= GRID_SIZE || head.y >= GRID_SIZE) {
            gameOver = true;
            onGameOver({ score });
            return;
        }

        if (snake.some((segment) => segment.x === head.x && segment.y === head.y)) {
            gameOver = true;
            onGameOver({ score });
            return;
        }

        snake.unshift(head);

        if (head.x === food.x && head.y === food.y) {
            score += 10;
            onScoreChange(score);
            food = randomFood(snake);
        } else {
            snake.pop();
        }
    }

    function drawCell(x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
    }

    function render() {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        drawCell(food.x, food.y, '#ff3030');

        snake.forEach((segment, index) => {
            drawCell(segment.x, segment.y, index === 0 ? '#88ff88' : '#44cc44');
        });

        if (paused && !gameOver) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px MS Sans Serif';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        }

        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px MS Sans Serif';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 6);
            ctx.font = '11px MS Sans Serif';
            ctx.fillText('Press Enter to Restart', canvas.width / 2, canvas.height / 2 + 16);
        }
    }

    function loop(timestamp) {
        if (destroyed || !canvas.isConnected || !running) return;

        if (isActive()) {
            if (!lastStep) lastStep = timestamp;
            if (timestamp - lastStep >= STEP_MS) {
                update();
                lastStep = timestamp;
            }
        }

        render();
        rafId = requestAnimationFrame(loop);
    }

    function start() {
        init();
        render();
        running = true;
        rafId = requestAnimationFrame(loop);
    }

    function restart() {
        init();
        render();
    }

    function onKeyDown(event) {
        const key = event.key;
        if (key === 'ArrowUp') {
            event.preventDefault();
            setDirection(0, -1);
        } else if (key === 'ArrowDown') {
            event.preventDefault();
            setDirection(0, 1);
        } else if (key === 'ArrowLeft') {
            event.preventDefault();
            setDirection(-1, 0);
        } else if (key === 'ArrowRight') {
            event.preventDefault();
            setDirection(1, 0);
        } else if (key === ' ') {
            event.preventDefault();
            paused = !paused;
        } else if (key === 'Enter' && gameOver) {
            event.preventDefault();
            restart();
        }
    }

    function destroy() {
        destroyed = true;
        running = false;
        cancelAnimationFrame(rafId);
    }

    return {
        start,
        restart,
        onKeyDown,
        destroy,
        pause() {
            running = false;
            cancelAnimationFrame(rafId);
        },
        resume() {
            if (destroyed || running) return;
            running = true;
            lastStep = 0;
            rafId = requestAnimationFrame(loop);
        },
        getScore() {
            return score;
        },
        isGameOver() {
            return gameOver;
        }
    };
}
