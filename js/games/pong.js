const WIDTH = 520;
const HEIGHT = 300;
const PADDLE_W = 10;
const PADDLE_H = 56;
const BALL_SIZE = 8;
const TARGET_SCORE = 5;

export function createPongGame({ canvas, onScoreChange, onGameOver, isActive }) {
    const ctx = canvas.getContext('2d');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let playerY = HEIGHT / 2 - PADDLE_H / 2;
    let cpuY = HEIGHT / 2 - PADDLE_H / 2;
    let ball = { x: WIDTH / 2, y: HEIGHT / 2, vx: 3.2, vy: 2.2 };
    let playerScore = 0;
    let cpuScore = 0;
    let gameOver = false;
    let winner = null;
    let destroyed = false;
    let rafId = 0;
    let running = false;

    const keys = {
        up: false,
        down: false
    };

    function resetBall(direction = 1) {
        ball.x = WIDTH / 2;
        ball.y = HEIGHT / 2;
        ball.vx = 3.2 * direction;
        ball.vy = (Math.random() * 2 - 1) * 2.6;
    }

    function clampPaddle() {
        playerY = Math.max(0, Math.min(HEIGHT - PADDLE_H, playerY));
        cpuY = Math.max(0, Math.min(HEIGHT - PADDLE_H, cpuY));
    }

    function updatePlayer() {
        if (keys.up) playerY -= 5;
        if (keys.down) playerY += 5;
        clampPaddle();
    }

    function updateCpu() {
        const cpuCenter = cpuY + PADDLE_H / 2;
        if (cpuCenter < ball.y - 6) cpuY += 3.2;
        if (cpuCenter > ball.y + 6) cpuY -= 3.2;
        clampPaddle();
    }

    function intersectsPaddle(px, py, pw, ph, bx, by, bs) {
        return bx < px + pw && bx + bs > px && by < py + ph && by + bs > py;
    }

    function checkWin() {
        if (playerScore >= TARGET_SCORE) {
            gameOver = true;
            winner = 'player';
            onGameOver({ winner: 'player' });
        } else if (cpuScore >= TARGET_SCORE) {
            gameOver = true;
            winner = 'cpu';
            onGameOver({ winner: 'cpu' });
        }
    }

    function update() {
        if (gameOver) return;

        updatePlayer();
        updateCpu();

        ball.x += ball.vx;
        ball.y += ball.vy;

        if (ball.y <= 0 || ball.y + BALL_SIZE >= HEIGHT) {
            ball.vy *= -1;
        }

        if (intersectsPaddle(16, playerY, PADDLE_W, PADDLE_H, ball.x, ball.y, BALL_SIZE) && ball.vx < 0) {
            ball.vx *= -1;
            ball.vy += (ball.y - (playerY + PADDLE_H / 2)) * 0.05;
        }

        if (intersectsPaddle(WIDTH - 26, cpuY, PADDLE_W, PADDLE_H, ball.x, ball.y, BALL_SIZE) && ball.vx > 0) {
            ball.vx *= -1;
            ball.vy += (ball.y - (cpuY + PADDLE_H / 2)) * 0.05;
        }

        if (ball.x < -BALL_SIZE) {
            cpuScore += 1;
            onScoreChange({ player: playerScore, cpu: cpuScore });
            resetBall(1);
            checkWin();
        }

        if (ball.x > WIDTH + BALL_SIZE) {
            playerScore += 1;
            onScoreChange({ player: playerScore, cpu: cpuScore });
            resetBall(-1);
            checkWin();
        }
    }

    function renderNet() {
        ctx.fillStyle = '#555';
        for (let y = 0; y < HEIGHT; y += 14) {
            ctx.fillRect(WIDTH / 2 - 1, y, 2, 8);
        }
    }

    function render() {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        renderNet();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(16, playerY, PADDLE_W, PADDLE_H);
        ctx.fillRect(WIDTH - 26, cpuY, PADDLE_W, PADDLE_H);
        ctx.fillRect(ball.x, ball.y, BALL_SIZE, BALL_SIZE);

        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px MS Sans Serif';
            ctx.textAlign = 'center';
            ctx.fillText(winner === 'player' ? 'YOU WIN' : 'CPU WINS', WIDTH / 2, HEIGHT / 2 - 8);
            ctx.font = '11px MS Sans Serif';
            ctx.fillText('Press Enter to Restart', WIDTH / 2, HEIGHT / 2 + 16);
        }
    }

    function loop() {
        if (destroyed || !canvas.isConnected || !running) return;

        if (isActive()) {
            update();
            render();
        }

        rafId = requestAnimationFrame(loop);
    }

    function restart() {
        playerScore = 0;
        cpuScore = 0;
        gameOver = false;
        winner = null;
        playerY = HEIGHT / 2 - PADDLE_H / 2;
        cpuY = HEIGHT / 2 - PADDLE_H / 2;
        resetBall(Math.random() > 0.5 ? 1 : -1);
        onScoreChange({ player: playerScore, cpu: cpuScore });
        render();
    }

    function onKeyDown(event) {
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            keys.up = true;
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            keys.down = true;
        } else if (event.key === 'Enter' && gameOver) {
            event.preventDefault();
            restart();
        }
    }

    function onKeyUp(event) {
        if (event.key === 'ArrowUp') {
            keys.up = false;
        } else if (event.key === 'ArrowDown') {
            keys.down = false;
        }
    }

    function onMouseMove(event) {
        const rect = canvas.getBoundingClientRect();
        const ratio = canvas.height / rect.height;
        const y = (event.clientY - rect.top) * ratio;
        playerY = y - PADDLE_H / 2;
        clampPaddle();
    }

    function start() {
        restart();
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
        restart,
        onKeyDown,
        onKeyUp,
        onMouseMove,
        destroy,
        pause() {
            running = false;
            cancelAnimationFrame(rafId);
        },
        resume() {
            if (destroyed || running) return;
            running = true;
            rafId = requestAnimationFrame(loop);
        }
    };
}
