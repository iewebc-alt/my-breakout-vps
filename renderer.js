// renderer.js — Визуальный движок 2.0
import { state } from './state.js';
import { config } from './config.js';

// ЭКСПОРТ: Инициализация звезд
export function initStars() {
    const area = window.innerWidth * window.innerHeight;
    const count = Math.floor((area / 10000) * (state.settings.starDensity / 5));
    state.stars = [];
    for (let i = 0; i < count; i++) {
        state.stars.push({
            x: Math.random() * window.innerWidth - window.innerWidth / 2,
            y: Math.random() * window.innerHeight - window.innerHeight / 2,
            z: Math.random() * window.innerWidth,
            o: Math.random()
        });
    }
}

// ЭКСПОРТ: Смена курса полета
export function changeFlightCourse() {
    const targetX = (Math.random() - 0.5) * 15;
    const targetY = (Math.random() - 0.5) * 15;
    const targetSpeed = 2 + Math.random() * 8;
    const targetRotation = (Math.random() - 0.5) * 0.02;

    let step = 0;
    const interval = setInterval(() => {
        state.flightDirX += (targetX - state.flightDirX) * 0.05;
        state.flightDirY += (targetY - state.flightDirY) * 0.05;
        state.starSpeed += (targetSpeed - state.starSpeed) * 0.05;
        state.rotationSpeed += (targetRotation - state.rotationSpeed) * 0.05;
        if (++step > 60) clearInterval(interval);
    }, 50);
}

// Внутренняя функция: 3D Сетка
function draw3DGrid() {
    const { ctx, canvas, flightDirX, flightDirY, starSpeed } = state;
    ctx.strokeStyle = 'rgba(0, 114, 255, 0.2)';
    ctx.lineWidth = 1;
    state.gridOffset = (state.gridOffset + starSpeed) % 40;
    const vPY = canvas.height / 2 + flightDirY * 20;
    const vPX = canvas.width / 2 + flightDirX * 20;
    ctx.beginPath();
    for (let i = 0; i < 20; i++) {
        const y = vPY + Math.pow(1.3, i) + state.gridOffset;
        if (y > canvas.height) break;
        ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
    }
    for (let i = -10; i <= 10; i++) {
        ctx.moveTo(vPX, vPY); ctx.lineTo(vPX + i * vPX * 0.5, canvas.height);
    }
    ctx.stroke();
}

// Внутренняя функция: Матрица
function drawMatrix() {
    const { ctx, canvas } = state;
    ctx.fillStyle = "rgba(0, 20, 0, 0.15)";
    ctx.font = "15px monospace";
    for(let i = 0; i < 20; i++) {
        const x = (Math.sin(i) * 500 + 500) % canvas.width;
        const y = (Date.now() / 10 + i * 100) % canvas.height;
        ctx.fillStyle = "#0f0";
        ctx.fillText(Math.random() > 0.5 ? "1" : "0", x, y);
    }
}

// ЭКСПОРТ: Обновление и отрисовка звезд
export function updateAndDrawStars() {
    const { ctx, canvas, settings, stars, starSpeed, starAngle } = state;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (settings.bgMode === 'grid') draw3DGrid();
    else if (settings.bgMode === 'matrix') drawMatrix();
    if (settings.starDensity === 0) return;
    state.starAngle += state.rotationSpeed;
    const cx = canvas.width / 2, cy = canvas.height / 2;
    stars.forEach(s => {
        s.z -= starSpeed * (settings.bgMode === 'warp' ? 5 : 1);
        if (s.z <= 0) s.z = canvas.width;
        let k = 128.0 / s.z;
        let px = s.x * k + cx, py = s.y * k + cy;
        let rotX = (px - cx) * Math.cos(starAngle) - (py - cy) * Math.sin(starAngle) + cx;
        let rotY = (px - cx) * Math.sin(starAngle) + (py - cy) * Math.cos(starAngle) + cy;
        if (rotX > 0 && rotX < canvas.width && rotY > 0 && rotY < canvas.height) {
            let size = (1 - s.z / canvas.width) * 3;
            ctx.fillStyle = `rgba(255,255,255,${s.o})`;
            ctx.fillRect(rotX, rotY, size, size);
        }
    });
}

// ЭКСПОРТ: Отрисовка текста из шариков
export function drawBallString(str, x, y, size, color) {
    const { ctx } = state;
    let curX = x;
    const s = str.toString();
    for (let i = 0; i < s.length; i++) {
        const map = config.digitMaps[s[i]];
        if (!map) continue;
        const step = size / 4;
        ctx.save();
        ctx.fillStyle = color;
        for (let j = 0; j < map.length; j++) {
            if (map[j]) {
                ctx.beginPath();
                ctx.arc(curX + (j % 3) * step * 1.3, y + Math.floor(j / 3) * step * 1.3, step / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
        curX += size * 1.15;
    }
}

// ЭКСПОРТ: Главная функция отрисовки
export function drawAll() {
    const { ctx, canvas, gameStarted, score, level, bricks, paddleX, paddleWidth, paddleHeight, paddleBottomMargin, balls, powerUps, paddleBonusTime, currentBrickWidth } = state;
    if (!ctx) return;

    updateAndDrawStars();

    if (gameStarted) {
        drawBallString("S", 25, 35, 12, "#fbbf24");
        drawBallString(score, 55, 35, 16, "#fff");
        const lX = canvas.width - 110;
        drawBallString("L", lX, 35, 12, "#3b82f6");
        drawBallString(level, lX + 28, 35, 16, "#fff");

        bricks.forEach(col => col.forEach(b => {
            if (b && b.status) {
                ctx.fillStyle = b.color;
                ctx.beginPath();
                ctx.roundRect(b.x, b.y, currentBrickWidth, state.brickHeight, 4);
                ctx.fill();
                ctx.fillStyle = "rgba(255,255,255,0.2)";
                ctx.fillRect(b.x, b.y, currentBrickWidth, 3);
                if (b.powerUp) {
                    ctx.fillStyle = "#fff";
                    ctx.font = "bold 14px Arial";
                    ctx.textAlign = "center";
                    let icon = b.powerUp === 'widerPaddle' ? '★' : b.powerUp === 'extraBall' ? 'B' : 'S';
                    ctx.fillText(icon, b.x + currentBrickWidth / 2, b.y + state.brickHeight / 2 + 5);
                }
            }
        }));

        const pY = canvas.height - paddleHeight - paddleBottomMargin;
        ctx.save();
        ctx.shadowBlur = 15; ctx.shadowColor = "#0072ff";
        const pG = ctx.createLinearGradient(paddleX, 0, paddleX + paddleWidth, 0);
        pG.addColorStop(0, "#ff3300"); pG.addColorStop(0.25, "#ffcc00"); pG.addColorStop(0.5, "#0072ff"); pG.addColorStop(0.75, "#ffcc00"); pG.addColorStop(1, "#ff3300");
        ctx.beginPath();
        ctx.roundRect(paddleX, pY, paddleWidth, paddleHeight, paddleHeight / 2);
        ctx.fillStyle = pG; ctx.fill();

        if (paddleBonusTime > 0) {
            ctx.fillStyle = "#fff"; ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
            ctx.fillText(`${(paddleBonusTime / 1000).toFixed(1)}s`, paddleX + paddleWidth / 2, pY + paddleHeight - 5);
        }
        ctx.restore();

        balls.forEach(b => {
            ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = "#fff";
            ctx.beginPath(); ctx.arc(b.x, b.y, config.ballRadius, 0, Math.PI * 2);
            ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore();
        });

        powerUps.forEach(p => {
            ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
            let color = p.type === 'extraBall' ? '#fbbf24' : p.type === 'widerPaddle' ? '#4caf50' : '#f43f5e';
            ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = "#000"; ctx.font = "bold 12px Arial"; ctx.textAlign = "center";
            ctx.fillText(p.type === 'extraBall' ? 'B' : p.type === 'widerPaddle' ? 'W' : 'S', p.x, p.y + 4);
        });
    }
}