// renderer.js — Визуальный движок
import { state } from './state.js';
import { config } from './config.js';

export function initStars() {
    state.stars = [];
    for (let i = 0; i < 200; i++) {
        state.stars.push({
            x: Math.random() * window.innerWidth - window.innerWidth / 2,
            y: Math.random() * window.innerHeight - window.innerHeight / 2,
            z: Math.random() * window.innerWidth
        });
    }
}

export function changeFlightCourse() {
    const targetX = (Math.random() - 0.5) * 15;
    const targetY = (Math.random() - 0.5) * 15;
    const targetSpeed = 1 + Math.random() * 4;
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

export function updateAndDrawStars() {
    const { ctx, canvas, settings, stars, starAngle, rotationSpeed, starSpeed, flightDirX, flightDirY } = state;
    
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (!settings.stars) return;

    state.starAngle += state.rotationSpeed;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const speedMult = Math.max(0.1, 1 - state.starSpeed / 10);

    stars.forEach(s => {
        s.z -= state.starSpeed;
        s.x += state.flightDirX;
        s.y += state.flightDirY;

        if (s.z <= 0) {
            s.z = canvas.width;
            s.x = Math.random() * canvas.width - cx;
            s.y = Math.random() * canvas.height - cy;
        }

        let k = 128.0 / s.z;
        let px = s.x * k + cx;
        let py = s.y * k + cy;

        let rotX = (px - cx) * Math.cos(state.starAngle) - (py - cy) * Math.sin(state.starAngle) + cx;
        let rotY = (px - cx) * Math.sin(state.starAngle) + (py - cy) * Math.cos(state.starAngle) + cy;

        if (rotX > 0 && rotX < canvas.width && rotY > 0 && rotY < canvas.height) {
            let size = (1 - s.z / canvas.width) * 3;
            let shade = parseInt((1 - s.z / canvas.width) * 255);
            ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
            ctx.fillRect(rotX, rotY, size, size);
        }
    });
}

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
                ctx.arc(curX + (j % 3) * step * 1.2, y + Math.floor(j / 3) * step * 1.2, step / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
        curX += size * 1.15;
    }
}

export function drawAll() {
    const { ctx, canvas, gameStarted, score, level, bricks, paddleX, paddleWidth, paddleHeight, paddleBottomMargin, balls, powerUps, particles, floatingTexts } = state;
    
    if (!ctx) return;

    updateAndDrawStars();

    if (gameStarted) {
        // UI: Score and Level
        drawBallString("S", 25, 35, 12, "#fbbf24");
        drawBallString(score, 55, 35, 12, "#fff");
        const lX = canvas.width - 110;
        drawBallString("L", lX, 35, 12, "#3b82f6");
        drawBallString(level, lX + 30, 35, 12, "#fff");

        // Bricks
        bricks.forEach(col => col.forEach(b => {
            if (b.status) {
                ctx.fillStyle = b.color;
                ctx.beginPath();
                ctx.roundRect(b.x, b.y, config.brickWidth, state.brickHeight, 4);
                ctx.fill();
                ctx.fillStyle = "rgba(255,255,255,0.2)";
                ctx.fillRect(b.x, b.y, config.brickWidth, 3);
                if (b.powerUp) {
                    ctx.fillStyle = "#fff";
                    ctx.font = "16px Arial";
                    ctx.textAlign = "center";
                    ctx.fillText("★", b.x + config.brickWidth / 2, b.y + state.brickHeight / 2 + 5);
                }
            }
        }));

        const pY = canvas.height - paddleHeight - paddleBottomMargin;

        // Paddle
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#0072ff";
        const pG = ctx.createLinearGradient(paddleX, 0, paddleX + paddleWidth, 0);
        pG.addColorStop(0, "#ff3300");
        pG.addColorStop(0.25, "#ffcc00");
        pG.addColorStop(0.5, "#00ffcc");
        pG.addColorStop(0.75, "#0072ff");
        pG.addColorStop(1, "#8000ff");
        ctx.beginPath();
        ctx.roundRect(paddleX, pY, paddleWidth, paddleHeight, 10);
        ctx.fillStyle = pG;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1;
        for (let i = 1; i < 5; i++) {
            let lx = paddleX + (paddleWidth / 5) * i;
            ctx.moveTo(lx, pY); ctx.lineTo(lx, pY + paddleHeight);
        }
        ctx.stroke();
        ctx.restore();

        // Balls
        balls.forEach(b => {
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#fff";
            ctx.beginPath();
            ctx.arc(b.x, b.y, config.ballRadius, 0, Math.PI * 2);
            ctx.fillStyle = "#fff";
            ctx.fill();
            ctx.restore();
        });

        // Power-ups
        powerUps.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 11, 0, 7);
            const color = p.type === 'extraBall' ? '#fbbf24' : p.type === 'widerPaddle' ? '#3b82f6' : '#f43f5e';
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = "#fff";
            ctx.font = "bold 12px Arial";
            ctx.textAlign = "center";
            ctx.fillText(p.type === 'extraBall' ? 'B' : p.type === 'widerPaddle' ? 'W' : 'S', p.x, p.y + 4);
        });

        // Particles
        particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        });

        // Floating Texts
        floatingTexts.forEach(ft => {
            ctx.globalAlpha = ft.life;
            ctx.fillStyle = ft.color;
            ctx.font = `bold ${ft.size}px Arial`;
            ctx.textAlign = "center";
            ctx.fillText(ft.text, ft.x, ft.y);
        });
        ctx.globalAlpha = 1.0;
    }
}
