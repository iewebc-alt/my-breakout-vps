// physics.js — Математическое ядро и расчеты
import { state } from './state.js';
import { config } from './config.js';
import { playNaturalSound } from './audio.js';

export function updatePaddleSize() {
    const rankPaddleMult = [1.2, 1.0, 0.7][state.settings.rank || 0];
    state.targetPaddleWidth = Math.max(60, (state.canvas.width > 600 ? 120 : state.canvas.width / 4) * rankPaddleMult);
}

export function keepPaddleInBounds() {
    if (state.paddleX < 0) state.paddleX = 0;
    if (state.paddleX > state.canvas.width - state.paddleWidth) {
        state.paddleX = state.canvas.width - state.paddleWidth;
    }
}

export function initBricks() {
    state.bricks = [];
    const brickColumnCount = Math.floor((state.canvas.width - 20) / (config.brickWidth + config.brickPadding));
    if (brickColumnCount <= 0) return;
    
    const totalW = brickColumnCount * (config.brickWidth + config.brickPadding) - config.brickPadding;
    const offLeft = (state.canvas.width - totalW) / 2;
    const rows = 6 + (state.level % 8);

    for (let c = 0; c < brickColumnCount; c++) {
        state.bricks[c] = [];
        for (let r = 0; r < rows; r++) {
            let isV = (state.level % 5 === 0) ? (c + r) % 2 === 0 : (state.level % 3 === 0 ? c % 2 === 0 : true);
            state.bricks[c][r] = {
                x: c * (config.brickWidth + config.brickPadding) + offLeft,
                y: r * (state.brickHeight + config.brickPadding) + state.brickOffsetTop,
                status: isV ? 1 : 0,
                color: `hsl(${(r * 35 + state.level * 20 + c * 10) % 360}, 70%, 60%)`,
                powerUp: isV && Math.random() < 0.22 ? config.powerUpTypes[Math.floor(Math.random() * config.powerUpTypes.length)] : null
            };
        }
    }
    if (state.bricks.flat().every(b => b.status === 0)) state.bricks[0][0].status = 1;
}

export function spawnBall(x, y, dx, dy) {
    if (state.balls.length > 15) return;
    const rankSpeedMult = [1.0, 1.2, 1.5][state.settings.rank || 0];
    let speedFactor = (1 + (state.level - 1) * 0.15) * rankSpeedMult;
    let sDx = dx || (Math.random() - 0.5) * 8 * speedFactor;
    if (Math.abs(sDx) < 2) sDx = sDx < 0 ? -3 : 3;
    state.balls.push({
        x: x || state.canvas.width / 2,
        y: y || state.canvas.height - 150,
        dx: sDx,
        dy: dy || -6 * speedFactor,
        spin: 0,
        pX: null,
        perfectHitPoint: 0
    });
}

export function predictLandingX(b) {
    let sX = b.x, sY = b.y, sDX = b.dx, sDY = b.dy, sSpin = (b.spin || 0);
    const pT = state.canvas.height - state.paddleHeight - state.paddleBottomMargin;
    for (let i = 0; i < 500; i++) {
        sDX += sSpin; sSpin *= 0.98;
        sX += sDX; sY += sDY;
        if (sX < config.ballRadius) { sX = config.ballRadius; sDX = Math.abs(sDX); }
        else if (sX > state.canvas.width - config.ballRadius) { sX = state.canvas.width - config.ballRadius; sDX = -Math.abs(sDX); }
        if (sY < config.ballRadius) sDY = Math.abs(sDY);
        if (sY >= pT && sDY > 0) return sX;
    }
    return sX;
}

export function findPerfectHitPoint(ball) {
    const pT = state.canvas.height - state.paddleHeight - state.paddleBottomMargin;
    const activeBricksList = state.bricks.flat().filter(b => b.status === 1);
    if (activeBricksList.length === 0) return 0;
    const target = activeBricksList.reduce((prev, curr) => (curr.y > prev.y ? curr : prev));
    const targetCenterX = target.x + config.brickWidth / 2;
    const targetCenterY = target.y + state.brickHeight / 2;
    let bestHitPoint = 0; let minDistance = Infinity;

    for (let hp = -1; hp <= 1; hp += 0.05) {
        let simDX = hp * 9; let simDY = -Math.abs(ball.dy); let simX = ball.x; let simY = pT;
        for (let step = 0; step < 400; step++) {
            simX += simDX; simY += simDY;
            if (simX < config.ballRadius || simX > state.canvas.width - config.ballRadius) simDX = -simDX;
            if (simY < config.ballRadius) simDY = -simDY;
            let dist = Math.sqrt(Math.pow(simX - targetCenterX, 2) + Math.pow(simY - targetCenterY, 2));
            if (dist < minDistance) { minDistance = dist; bestHitPoint = hp; }
            if (simY > state.canvas.height || dist < 15) break;
        }
    }
    return bestHitPoint;
}

export function update() {
    if (state.isGameOver || !state.gameStarted) return;
    const pY = state.canvas.height - state.paddleHeight - state.paddleBottomMargin;

    // Анимация изменения ширины ракетки
    if (Math.abs(state.paddleWidth - state.targetPaddleWidth) > 1) {
        let oldW = state.paddleWidth;
        state.paddleWidth += (state.targetPaddleWidth - state.paddleWidth) * 0.1;
        state.paddleX -= (state.paddleWidth - oldW) / 2;
        if (state.settings.auto) state.balls.forEach(b => b.pX = null);
    }

    // Физика шаров (Sub-stepping)
    for (let i = state.balls.length - 1; i >= 0; i--) {
        let b = state.balls[i];
        if (isNaN(b.x)) { state.balls.splice(i, 1); continue; }
        b.dx += (b.spin || 0);
        b.spin = (b.spin || 0) * 0.98;

        let speed = Math.sqrt(b.dx * b.dx + b.dy * b.dy);
        let steps = (speed > config.ballRadius) ? Math.ceil(speed / (config.ballRadius * 0.5)) : 1;

        for (let s = 0; s < steps; s++) {
            b.x += b.dx / steps; b.y += b.dy / steps;

            if (b.x < config.ballRadius) { b.x = config.ballRadius; b.dx = Math.abs(b.dx); playNaturalSound('wall'); }
            else if (b.x > state.canvas.width - config.ballRadius) { b.x = state.canvas.width - config.ballRadius; b.dx = -Math.abs(b.dx); playNaturalSound('wall'); }

            if (b.y < config.ballRadius) { b.y = config.ballRadius; b.dy = Math.abs(b.dy); playNaturalSound('wall'); }
            else if (b.y + config.ballRadius > pY) {
                if (b.x >= state.paddleX - config.ballRadius - 2 && b.x <= state.paddleX + state.paddleWidth + config.ballRadius + 2) {
                    b.y = pY - config.ballRadius; b.dy = -Math.abs(b.dy);
                    b.spin = (state.paddleVelocity || 0) * 0.03;
                    if (state.settings.auto && !state.isUserTouching) {
                        b.perfectHitPoint = findPerfectHitPoint(b);
                        b.dx = b.perfectHitPoint * 9;
                    } else {
                        let hitPos = (b.x - (state.paddleX + state.paddleWidth / 2)) / (state.paddleWidth / 2);
                        b.dx = hitPos * 9;
                    }
                    playNaturalSound('paddle'); b.pX = null;
                } else if (b.y > state.canvas.height + 20) {
                    state.balls.splice(i, 1);
                    break;
                }
            }

            // Коллизии с кирпичами
            state.bricks.forEach(col => col.forEach(br => {
                if (br.status && b.x + config.ballRadius > br.x && b.x - config.ballRadius < br.x + config.brickWidth &&
                    b.y + config.ballRadius > br.y && b.y - config.ballRadius < br.y + state.brickHeight) {
                    br.status = 0; b.dy = -b.dy; b.spin *= 0.5;
                    state.score += 10 * ([1, 2, 5][state.settings.rank || 0]);
                    if (br.powerUp) state.shakeIntensity = 10;
                    playNaturalSound('brick');
                    for (let k = 0; k < 6; k++) state.particles.push({
                        x: b.x, y: b.y, dx: (Math.random() - 0.5) * 5, dy: (Math.random() - 0.5) * 5,
                        size: Math.random() * 4 + 2, life: 1, color: br.color
                    });
                    state.floatingTexts.push({ x: br.x + config.brickWidth / 2, y: br.y, text: "+10", life: 1, size: 14, color: br.color });
                    if (br.powerUp) state.powerUps.push({
                        x: br.x + config.brickWidth / 2, y: br.y, dy: 3, type: br.powerUp, radius: 10
                    });
                }
            }));
        }
    }

    // Физика бонусов
    for (let i = state.powerUps.length - 1; i >= 0; i--) {
        let p = state.powerUps[i];
        p.y += p.dy;
        if (p.x >= state.paddleX - p.radius && p.x <= state.paddleX + state.paddleWidth + p.radius &&
            p.y + p.radius >= pY && p.y - p.radius <= pY + state.paddleHeight) {
            if (p.type === 'extraBall') spawnBall(p.x, pY - 10);
            else if (p.type === 'widerPaddle') {
                if (state.paddleTimeout) clearTimeout(state.paddleTimeout);
                state.targetPaddleWidth = state.canvas.width * 0.4;
                state.paddleTimeout = setTimeout(() => { if (!state.isGameOver) updatePaddleSize(); }, 8000);
            } else if (p.type === 'speedDown') {
                state.balls.forEach(b => { b.dx *= 0.7; b.dy *= 0.7; });
            }
            state.powerUps.splice(i, 1);
            playNaturalSound('powerup');
        } else if (p.y > state.canvas.height) state.powerUps.splice(i, 1);
    }

    // Автопилот
    if (state.settings.auto && state.balls.length && !state.isUserTouching) {
        let targets = [...state.balls.filter(b => b.dy > 0), ...state.powerUps];
        let target = targets.reduce((p, c) => (!p || c.y > p.y) ? c : p, null);
        let tX = state.canvas.width / 2;
        if (target) {
            if (target.dy !== undefined && target.dx !== undefined) { // Это шар
                if (!target.pX) target.pX = predictLandingX(target);
                tX = target.pX;
            } else { tX = target.x; }
        }
        let diff = tX - (state.paddleX + state.paddleWidth / 2);
        state.paddleX += Math.sign(diff) * Math.min(Math.abs(diff), config.maxAutoplaySpeed);
        state.paddleVelocity = Math.sign(diff) * 10;
    }

    // Ручное управление
    if (state.rightPressed) { state.paddleX += 10; state.paddleVelocity = 10; }
    else if (state.leftPressed) { state.paddleX -= 10; state.paddleVelocity = -10; }
    else if (!state.settings.auto && !state.isUserTouching) { state.paddleVelocity *= 0.8; }

    keepPaddleInBounds();

    // Обновление частиц и текста
    state.particles.forEach(p => { p.x += p.dx; p.y += p.dy; p.life -= 0.02; });
    state.particles = state.particles.filter(p => p.life > 0);
    state.floatingTexts.forEach(ft => { ft.y -= 1.5; ft.life -= 0.015; });
    state.floatingTexts = state.floatingTexts.filter(ft => ft.life > 0);

    if (state.shakeIntensity > 0) state.shakeIntensity *= 0.9;
    if (state.bricks.flat().every(b => b.status === 0)) state.needsLevelUp = true;
}
