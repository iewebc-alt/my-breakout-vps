// physics.js — Ядро 2.1 (Stability Fix)
import { state } from './state.js';
import { config } from './config.js';
import { playNaturalSound } from './audio.js';

export function updatePaddleSize() {
    const rankMult = [1.2, 1.0, 0.7][state.settings.rank || 0];
    state.targetPaddleWidth = Math.max(60, (state.canvas.width > 600 ? 120 : state.canvas.width / 4) * rankMult);
}

export function keepPaddleInBounds() {
    if (state.paddleX < 0) state.paddleX = 0;
    if (state.paddleX > state.canvas.width - state.paddleWidth) state.paddleX = state.canvas.width - state.paddleWidth;
}

export function initBricks() {
    state.bricks = [];
    const pattern = config.levelPatterns[(state.level - 1) % config.levelPatterns.length];
    const rows = pattern.data.length;
    const cols = pattern.data[0].length;
    const sideMargin = 20;
    const availableWidth = state.canvas.width - (sideMargin * 2);
    const totalPadding = config.brickPadding * (cols - 1);
    state.currentBrickWidth = (availableWidth - totalPadding) / cols;
    state.currentBrickPadding = config.brickPadding;
    const totalW = cols * (state.currentBrickWidth + state.currentBrickPadding) - state.currentBrickPadding;
    const offLeft = (state.canvas.width - totalW) / 2;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (pattern.data[r][c] === 1) {
                if (!state.bricks[c]) state.bricks[c] = [];
                state.bricks[c][r] = {
                    x: c * (state.currentBrickWidth + state.currentBrickPadding) + offLeft,
                    y: r * (state.brickHeight + state.currentBrickPadding) + state.brickOffsetTop,
                    status: 1,
                    color: `hsl(${(r * 40 + state.level * 30) % 360}, 70%, 60%)`,
                    powerUp: Math.random() < 0.18 ? config.powerUpTypes[Math.floor(Math.random() * 3)] : null
                };
            }
        }
    }
}

export function spawnBall(x, y, dx, dy) {
    if (state.balls.length > 15) return;
    const speed = (1 + (state.level - 1) * 0.1) * [1, 1.2, 1.5][state.settings.rank];
    state.balls.push({
        x: x || state.canvas.width / 2,
        y: y || state.canvas.height - 150,
        dx: dx || (Math.random() - 0.5) * 8 * speed,
        dy: dy || -6 * speed,
        spin: 0, pX: null
    });
}

export function predictLandingX(b) {
    let sX = b.x, sY = b.y, sDX = b.dx, sDY = b.dy, sSpin = (b.spin || 0);
    const pT = state.canvas.height - state.paddleHeight - state.paddleBottomMargin;
    for (let i = 0; i < 500; i++) {
        sDX += sSpin; sSpin *= 0.98;
        sX += sDX; sY += sDY;
        if (sX < config.ballRadius) sDX = Math.abs(sDX);
        if (sX > state.canvas.width - config.ballRadius) sDX = -Math.abs(sDX);
        if (sY < config.ballRadius) sDY = Math.abs(sDY);
        if (sY >= pT && sDY > 0) return sX;
    }
    return sX;
}

export function recalculateTargets() {
    state.balls.forEach(b => { if (b.dy > 0) b.pX = predictLandingX(b); });
}

function resolveElasticCollision(a, b, rA, rB) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = rA + rB;
    if (dist < minDist && dist > 0) {
        const overlap = minDist - dist;
        const nx = dx / dist, ny = dy / dist;
        a.x -= nx * (overlap / 2); a.y -= ny * (overlap / 2);
        b.x += nx * (overlap / 2); b.y += ny * (overlap / 2);
        const v1n = a.dx * nx + a.dy * ny;
        const v2n = (b.dx || 0) * nx + (b.dy || 0) * ny;
        const impulse = v1n - v2n;
        if (impulse > 0) {
            const finalImpulse = impulse * 1.2;
            a.dx -= finalImpulse * nx; a.dy -= finalImpulse * ny;
            if (b.dx !== undefined) { b.dx += finalImpulse * nx; b.dy += finalImpulse * ny; }
            playNaturalSound('wall');
            recalculateTargets();
        }
    }
}

export function update() {
    if (state.isGameOver || !state.gameStarted) return;
    const pY = state.canvas.height - state.paddleHeight - state.paddleBottomMargin;

    if (state.paddleBonusTime > 0) {
        state.paddleBonusTime -= 16.6;
        if (state.paddleBonusTime <= 0) updatePaddleSize();
    }

    if (Math.abs(state.paddleWidth - state.targetPaddleWidth) > 0.5) {
        const oldW = state.paddleWidth;
        state.paddleWidth += (state.targetPaddleWidth - state.paddleWidth) * 0.1;
        state.paddleX -= (state.paddleWidth - oldW) / 2;
    }

    // 1. Столкновения объектов (Fix: bodies instead of all)
    const bodies = [
        ...state.balls.map(b => ({ o: b, r: config.ballRadius })),
        ...state.powerUps.map(p => ({ o: p, r: p.radius }))
    ];
    for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
            resolveElasticCollision(bodies[i].o, bodies[j].o, bodies[i].r, bodies[j].r);
        }
    }

    // 2. Мячи
    state.balls.forEach((b, idx) => {
        b.dx += b.spin; b.spin *= 0.98;
        b.x += b.dx; b.y += b.dy;
        if (b.x < config.ballRadius) { b.x = config.ballRadius; b.dx = Math.abs(b.dx) + 0.1; playNaturalSound('wall'); recalculateTargets(); }
        if (b.x > state.canvas.width - config.ballRadius) { b.x = state.canvas.width - config.ballRadius; b.dx = -Math.abs(b.dx) - 0.1; playNaturalSound('wall'); recalculateTargets(); }
        if (b.y < config.ballRadius) { b.y = config.ballRadius; b.dy = Math.abs(b.dy); playNaturalSound('wall'); recalculateTargets(); }

        if (b.y + config.ballRadius > pY && b.y - config.ballRadius < pY + state.paddleHeight) {
            if (b.x > state.paddleX - 5 && b.x < state.paddleX + state.paddleWidth + 5) {
                b.y = pY - config.ballRadius - 1;
                b.dy = -Math.abs(b.dy);
                b.spin = (state.paddleVelocity - b.dx) * state.settings.spinStrength;
                playNaturalSound('paddle'); recalculateTargets();
            }
        }
        if (b.y > state.canvas.height) state.balls.splice(idx, 1);

        state.bricks.forEach(col => col.forEach(br => {
            if (br && br.status) {
                const closestX = Math.max(br.x, Math.min(b.x, br.x + state.currentBrickWidth));
                const closestY = Math.max(br.y, Math.min(b.y, br.y + state.brickHeight));
                const dist = Math.sqrt((b.x - closestX)**2 + (b.y - closestY)**2);
                if (dist < config.ballRadius) {
                    const overlapX = config.ballRadius - Math.abs(b.x - closestX);
                    const overlapY = config.ballRadius - Math.abs(b.y - closestY);
                    if (overlapX < overlapY) b.dx *= -1; else b.dy *= -1;
                    br.status = 0; state.score += 10 * (state.settings.rank + 1);
                    playNaturalSound('brick'); recalculateTargets();
                    if (br.powerUp) state.powerUps.push({ x: br.x + state.currentBrickWidth/2, y: br.y, dy: 3, dx: (Math.random()-0.5)*4, radius: 11, type: br.powerUp });
                }
            }
        }));
    });

    // 3. Бонусы
    state.powerUps.forEach((p, idx) => {
        p.x += (p.dx || 0); p.y += p.dy;
        if (p.x < p.radius) { p.x = p.radius; p.dx = Math.abs(p.dx || 0); playNaturalSound('wall'); }
        if (p.x > state.canvas.width - p.radius) { p.x = state.canvas.width - p.radius; p.dx = -Math.abs(p.dx || 0); playNaturalSound('wall'); }
        if (p.y < p.radius) { p.y = p.radius; p.dy = Math.abs(p.dy); playNaturalSound('wall'); }

        state.bricks.forEach(col => col.forEach(br => {
            if (br && br.status && p.x + p.radius > br.x && p.x - p.radius < br.x + state.currentBrickWidth && p.y + p.radius > br.y && p.y - p.radius < br.y + state.brickHeight) {
                p.dy *= -1; p.dx = (Math.random() - 0.5) * 4; playNaturalSound('wall');
            }
        }));

        if (p.y + p.radius > pY && p.y - p.radius < pY + state.paddleHeight && p.x > state.paddleX - 5 && p.x < state.paddleX + state.paddleWidth + 5) {
            state.score += 10 * (state.settings.rank + 1);
            if (p.type === 'extraBall') spawnBall();
            if (p.type === 'widerPaddle') { state.targetPaddleWidth = state.canvas.width * 0.45; state.paddleBonusTime = 10000; }
            state.powerUps.splice(idx, 1); playNaturalSound('powerup');
        }
        if (p.y > state.canvas.height + 50) state.powerUps.splice(idx, 1);
    });

    // 4. Автопилот (Приоритет: Touch > AI)
    if (state.settings.auto && !state.isUserTouching) {
        let targets = [...state.balls.filter(b => b.dy > 0), ...state.powerUps];
        const target = targets.reduce((p, c) => (!p || c.y > p.y) ? c : p, null);
        if (target) {
            let tX = target.pX || target.x;
            let diff = tX - (state.paddleX + state.paddleWidth / 2);
            state.paddleX += Math.sign(diff) * Math.min(Math.abs(diff), config.maxAutoplaySpeed);
            state.paddleVelocity = Math.sign(diff) * 10;
        }
    }
    keepPaddleInBounds();
    if (state.bricks.flat().every(b => b && b.status === 0)) state.needsLevelUp = true;
}