const paddleBottomMargin = 60;
const maxAutoplaySpeed = 15;

let score = 0;
let level = 1;
let isGameOver = false;
let gameStarted = false;
let autoplay = false;
let wakeLock = null;

let paddleHeight = 15;
let paddleWidth = 100;
let paddleX = 0;
let rightPressed = false;
let leftPressed = false;

let balls = [];
const ballRadius = 8;
let particles = [];

let bricks = [];
let powerUps = [];
const powerUpTypes = ['widerPaddle', 'extraBall', 'speedDown'];

let canvas, ctx, gameOverScreen, statusText, scoreText, scoreVal, levelVal, startPrompt, startBtn;

const patterns = [
    // Heart
    [[0,1,1,0,1,1,0],[1,1,1,1,1,1,1],[1,1,1,1,1,1,1],[0,1,1,1,1,1,0],[0,0,1,1,1,0,0],[0,0,0,1,0,0,0]],
    // Smile
    [[0,1,1,1,1,1,0],[1,0,0,0,0,0,1],[1,0,1,0,1,0,1],[1,0,0,0,0,0,1],[1,0,1,1,1,0,1],[0,1,1,1,1,1,0]],
    // Diamond
    [[0,0,0,1,0,0,0],[0,0,1,1,1,0,0],[0,1,1,1,1,1,0],[1,1,1,1,1,1,1],[0,1,1,1,1,1,0],[0,0,1,1,1,0,0],[0,0,0,1,0,0,0]],
    // Invader
    [[0,0,1,0,0,0,1,0,0],[0,0,0,1,1,1,0,0,0],[0,1,1,1,1,1,1,1,0],[1,1,0,1,1,1,0,1,1],[1,1,1,1,1,1,1,1,1],[0,0,1,0,0,0,1,0,0],[0,1,0,0,0,0,0,1,0]],
    // Star
    [[0,0,0,1,0,0,0],[1,1,1,1,1,1,1],[0,1,1,1,1,1,0],[0,1,0,1,0,1,0],[1,0,0,0,0,0,1]],
    // Cross
    [[0,0,1,1,1,0,0],[0,0,1,1,1,0,0],[1,1,1,1,1,1,1],[1,1,1,1,1,1,1],[0,0,1,1,1,0,0],[0,0,1,1,1,0,0]],
    // Checkerboard
    [[1,0,1,0,1,0,1],[0,1,0,1,0,1,0],[1,0,1,0,1,0,1],[0,1,0,1,0,1,0],[1,0,1,0,1,0,1]],
    // Box
    [[1,1,1,1,1,1,1],[1,0,0,0,0,0,1],[1,0,1,1,1,0,1],[1,0,0,0,0,0,1],[1,1,1,1,1,1,1]]
];

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) {}
}

function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    updatePaddleSize();
    paddleX = (canvas.width - paddleWidth) / 2;
}

function updatePaddleSize() {
    paddleWidth = canvas.width > 600 ? 120 : canvas.width * 0.3;
}

function getRandomPaddleOffset() {
    return (Math.random() - 0.5) * paddleWidth * 0.8;
}

function playSound(freq, type, duration) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
}

function initBricks() {
    bricks = [];
    let pattern;
    if (level <= patterns.length) {
        pattern = patterns[level - 1];
    } else {
        const rows = 5 + Math.floor(level / 5);
        const cols = 7 + Math.floor(level / 10);
        pattern = [];
        for (let r = 0; r < rows; r++) {
            pattern[r] = [];
            const half = Math.ceil(cols / 2);
            for (let c = 0; c < half; c++) pattern[r][c] = Math.random() > 0.4 ? 1 : 0;
            for (let c = half; c < cols; c++) pattern[r][c] = pattern[r][cols - 1 - c];
        }
    }
    const brickColumnCount = pattern[0].length;
    const brickRowCount = pattern.length;
    const brickPadding = 5;
    const availableWidth = canvas.width - 10;
    const brickWidth = (availableWidth / brickColumnCount) - brickPadding;
    const brickHeight = 20;

    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            bricks[c][r] = {
                x: c * (brickWidth + brickPadding) + 5,
                y: r * (brickHeight + brickPadding) + 60,
                status: pattern[r][c],
                color: `hsl(${(r * 45 + level * 30) % 360}, 85%, 60%)`,
                powerUp: Math.random() < 0.15 ? powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)] : null
            };
        }
    }
}

function spawnBall(x, y, dx, dy) {
    balls.push({
        x: x || canvas.width / 2,
        y: y || canvas.height - paddleBottomMargin - 30,
        dx: dx || (Math.random() - 0.5) * 8,
        dy: dy || -6,
        paddleOffset: getRandomPaddleOffset()
    });
}

function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x, y: y,
            dx: (Math.random() - 0.5) * 4,
            dy: (Math.random() - 0.5) * 4,
            life: 1.0,
            color: color || "#fff"
        });
    }
}

function applyPowerUp(type) {
    if (type === 'widerPaddle') {
        const old = paddleWidth;
        paddleWidth = Math.min(canvas.width, paddleWidth * 1.6);
        setTimeout(() => { if (!isGameOver) paddleWidth = old; }, 8000);
    } else if (type === 'extraBall') {
        spawnBall(paddleX + paddleWidth / 2, canvas.height - paddleBottomMargin - 20);
    } else if (type === 'speedDown') {
        balls.forEach(b => { b.dx *= 0.6; b.dy *= 0.6; });
    }
}

function isLevelClear() {
    for (let c = 0; c < bricks.length; c++) {
        for (let r = 0; r < bricks[c].length; r++) {
            if (bricks[c][r].status === 1) return false;
        }
    }
    return true;
}

function drawBall(ball) {
    ctx.globalAlpha = 0.8;
    const grad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, ballRadius);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
    grad.addColorStop(0.3, "rgba(255, 255, 255, 0.4)");
    grad.addColorStop(1, "rgba(0, 242, 254, 0.2)");
    
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.closePath();
    ctx.globalAlpha = 1.0;
}

function drawPaddle() {
    if (paddleX < 0) paddleX = 0;
    if (paddleX > canvas.width - paddleWidth) paddleX = canvas.width - paddleWidth;
    const top = canvas.height - paddleHeight - paddleBottomMargin;
    
    ctx.globalAlpha = 0.7;
    const grad = ctx.createLinearGradient(paddleX, top, paddleX, top + paddleHeight);
    grad.addColorStop(0, "rgba(255, 126, 185, 0.8)");
    grad.addColorStop(0.1, "rgba(255, 255, 255, 0.9)");
    grad.addColorStop(0.2, "rgba(255, 101, 163, 0.6)");
    grad.addColorStop(1, "rgba(255, 101, 163, 0.4)");
    
    ctx.beginPath();
    ctx.roundRect(paddleX, top, paddleWidth, paddleHeight, 5);
    ctx.fillStyle = grad;
    ctx.fill();
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ff7eb9";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.closePath();
    ctx.globalAlpha = 1.0;
}

function drawBricks() {
    const brickPadding = 5;
    const brickHeight = 20;
    const brickWidth = (canvas.width - 10) / (bricks.length || 1) - brickPadding;
    
    for (let c = 0; c < bricks.length; c++) {
        for (let r = 0; r < bricks[c].length; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                const x = b.x;
                const y = b.y;
                const w = brickWidth;
                const h = brickHeight;
                const color = b.color;
                
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = color;
                ctx.fillRect(x, y, w, h);

                const centerX = x + w / 2;
                const centerY = y + h / 2;
                const darker = `hsla(${(r * 45 + level * 30) % 360}, 85%, 40%, 0.7)`;
                const lighter = `hsla(${(r * 45 + level * 30) % 360}, 90%, 75%, 0.8)`;

                ctx.fillStyle = lighter;
                ctx.beginPath();
                ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(centerX, centerY);
                ctx.fill();

                ctx.fillStyle = darker;
                ctx.beginPath();
                ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(centerX, centerY);
                ctx.fill();

                ctx.lineWidth = 1;
                ctx.strokeStyle = "rgba(255,255,255,0.7)";
                ctx.beginPath();
                ctx.moveTo(x, y + h); ctx.lineTo(x, y); ctx.lineTo(x + w, y);
                ctx.stroke();

                ctx.globalAlpha = 1.0;
                const sparkleSize = 4 + Math.sin(Date.now() / 200) * 1;
                const glintGrad = ctx.createRadialGradient(x + 5, y + 5, 0, x + 5, y + 5, sparkleSize);
                glintGrad.addColorStop(0, "rgba(255,255,255,0.9)");
                glintGrad.addColorStop(1, "rgba(255,255,255,0)");
                ctx.fillStyle = glintGrad;
                ctx.beginPath();
                ctx.arc(x + 5, y + 5, sparkleSize, 0, Math.PI * 2);
                ctx.fill();

                if (b.powerUp) {
                    const pulse = Math.sin(Date.now() / 150) * 0.2 + 1;
                    ctx.save();
                    ctx.translate(x + w / 2, y + h / 2);
                    ctx.scale(pulse, pulse);
                    ctx.fillStyle = "#ffffff";
                    ctx.beginPath();
                    for (let i = 0; i < 5; i++) {
                        ctx.rotate(Math.PI / 5); ctx.lineTo(0, 0 - (h / 3)); ctx.rotate(Math.PI / 5); ctx.lineTo(0, 0 - (h / 7));
                    }
                    ctx.fill();
                    ctx.restore();
                }
            }
        }
    }
    ctx.globalAlpha = 1.0;
}

function drawPowerUps() {
    const paddleTop = canvas.height - paddleHeight - paddleBottomMargin;
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i];
        p.dy += 0.1;
        p.x += (p.dx || 0);
        p.y += p.dy;

        if (p.x + 12 > canvas.width || p.x - 12 < 0) {
            p.dx = -(p.dx || 0);
            p.x = p.x < 12 ? 12 : canvas.width - 12;
        }
        if (p.y + 12 > canvas.height) {
            p.y = canvas.height - 12;
            p.dy = -Math.abs(p.dy) * 0.7;
        }

        ctx.globalAlpha = 0.7;
        const color = p.type === 'extraBall' ? '#fbbf24' : p.type === 'widerPaddle' ? '#34d399' : '#f472b6';
        const grad = ctx.createRadialGradient(p.x - 4, p.y - 4, 2, p.x, p.y, 12);
        grad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
        grad.addColorStop(0.2, color);
        grad.addColorStop(1, "rgba(255, 255, 255, 0.1)");
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.stroke();
        ctx.closePath();
        ctx.globalAlpha = 1.0;

        if (p.y > paddleTop - 10 && p.y < paddleTop + paddleHeight + 10 && p.x > paddleX && p.x < paddleX + paddleWidth) {
            applyPowerUp(p.type);
            powerUps.splice(i, 1);
            playSound(600, 'sine', 0.2);
        } else if (p.y > canvas.height - paddleBottomMargin + 10) powerUps.splice(i, 1);
    }
}

function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.dx; p.y += p.dy; p.life -= 0.02;
        if (p.life <= 0) particles.splice(i, 1);
        else {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 2, 2);
            ctx.globalAlpha = 1;
        }
    }
}

let lastToggle = 0;
let clickCount = 0;
function handleSecretToggle(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const now = Date.now();
    if (now - lastToggle < 500) {
        clickCount++;
    } else {
        clickCount = 1;
    }
    lastToggle = now;
    if (clickCount >= 3) {
        autoplay = !autoplay;
        clickCount = 0;
    }
}

function handleOrientation(e) {
    if (!gameStarted || isGameOver || autoplay) return;
    let tilt = 0;
    const orientation = window.orientation;

    if (orientation === 90) tilt = e.beta;
    else if (orientation === -90) tilt = -e.beta;
    else if (orientation === 180) tilt = -e.gamma;
    else tilt = e.gamma;

    if (tilt !== null && Math.abs(tilt) > 2) {
        const speed = Math.max(-15, Math.min(15, tilt * 0.8));
        paddleX += speed;
    }
}

function endGame(win) {
    isGameOver = true;
    cancelAnimationFrame(animationId);
    gameOverScreen.style.display = "block";
    statusText.textContent = win ? "ПОБЕДА" : "КОНЕЦ ИГРЫ";
}

window.resetGame = function() {
    score = 0; level = 1; isGameOver = false;
    balls = []; powerUps = []; particles = [];
    if (gameOverScreen) gameOverScreen.style.display = "none";
    resize(); initBricks(); spawnBall();
    draw();
}

function startGame() {
    gameStarted = true;
    startPrompt.style.display = "none";
    requestWakeLock();

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation, true);
                }
            })
            .catch(console.error);
    } else {
        window.addEventListener('deviceorientation', handleOrientation, true);
    }

    window.resetGame();
}

let animationId;
function draw() {
    if (isGameOver) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1e1b4b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawBricks(); drawPaddle(); drawPowerUps(); drawParticles();

    const paddleTop = canvas.height - paddleHeight - paddleBottomMargin;
    const brickPadding = 5;
    const brickWidth = (canvas.width - 10) / (bricks.length || 1) - brickPadding;

    for (let i = balls.length - 1; i >= 0; i--) {
        const b = balls[i];
        if (isNaN(b.x) || isNaN(b.y)) { balls.splice(i, 1); continue; }
        drawBall(b);
        b.x += b.dx; b.y += b.dy;
        
        if (Math.abs(b.dy) < 0.5) b.dy = b.dy < 0 ? -1 : 1;
        
        if (b.x + ballRadius > canvas.width) { b.dx = -b.dx; b.x = canvas.width - ballRadius; }
        else if (b.x - ballRadius < 0) { b.dx = -b.dx; b.x = ballRadius; }
        
        if (b.y - ballRadius < 0) { b.dy = -b.dy; b.y = ballRadius; }
        else if (b.y + ballRadius > paddleTop) {
            if (b.x > paddleX && b.x < paddleX + paddleWidth) {
                b.y = paddleTop - ballRadius;
                b.dy = -Math.abs(b.dy);
                b.dx = ((b.x - (paddleX + paddleWidth / 2)) / (paddleWidth / 2)) * 8;
                b.paddleOffset = getRandomPaddleOffset();
            } else if (b.y > canvas.height) {
                balls.splice(i, 1);
                if (balls.length === 0) { endGame(false); return; }
            }
        }

        for (let j = i + 1; j < balls.length; j++) {
            const b2 = balls[j];
            const dx = b2.x - b.x; const dy = b2.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = ballRadius * 2;
            if (dist < minDist) {
                const overlap = minDist - dist; const nx = dx / dist; const ny = dy / dist;
                const moveX = nx * overlap / 2; const moveY = ny * overlap / 2;
                b.x -= moveX; b.y -= moveY; b2.x += moveX; b2.y += moveY;
                const rvx = b2.dx - b.dx; const rvy = b2.dy - b.dy;
                if (rvx * nx + rvy * ny < 0) { [b.dx, b2.dx] = [b2.dx, b.dx]; [b.dy, b2.dy] = [b2.dy, b.dy]; }
                createParticles(b.x + moveX, b.y + moveY, "#fff");
            }
        }

        for (let c = 0; c < bricks.length; c++) {
            for (let r = 0; r < bricks[c].length; r++) {
                const br = bricks[c][r];
                if (br.status === 1) {
                    if (b.x + ballRadius > br.x && b.x - ballRadius < br.x + brickWidth && b.y + ballRadius > br.y && b.y - ballRadius < br.y + 20) {
                        br.status = 0; b.dy = -b.dy; score += 10;
                        scoreVal.textContent = score;
                        if (br.powerUp) powerUps.push({x: br.x + brickWidth/2, y: br.y, type: br.powerUp, dy: 2, dx: (Math.random() - 0.5) * 4});
                        if (isLevelClear()) { level++; levelVal.textContent = level; initBricks(); }
                    }
                }
            }
        }

        for (let p of powerUps) {
            const dx = p.x - b.x; const dy = p.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = ballRadius + 12;
            if (dist < minDist) {
                const overlap = minDist - dist; const nx = dx / dist; const ny = dy / dist;
                b.x -= nx * (overlap / 2); b.y -= ny * (overlap / 2); p.x += nx * (overlap / 2); p.y += ny * (overlap / 2);
                const rvx = (p.dx || 0) - b.dx; const rvy = p.dy - b.dy;
                if (rvx * nx + rvy * ny < 0) { [b.dx, p.dx] = [p.dx || 0, b.dx]; [b.dy, p.dy] = [p.dy, b.dy]; }
                createParticles(p.x, p.y, "#ff0");
            }
        }
    }

    if (autoplay && balls.length > 0) {
        let target = null; let maxY = -1;
        balls.forEach(b => { if (b.dy > 0 && b.y > maxY) { maxY = b.y; target = b; } });
        if (!target || target.y < canvas.height * 0.4) {
            powerUps.forEach(p => { if (p.type !== 'speedDown' && p.y > maxY) { maxY = p.y; target = p; } });
        }
        let tx = target ? target.x - paddleWidth / 2 + (target.paddleOffset || 0) : (canvas.width - paddleWidth) / 2;
        if (balls.length > 1) {
            powerUps.forEach(p => {
                if (p.type === 'speedDown' && Math.abs(p.x - (paddleX + paddleWidth / 2)) < paddleWidth) {
                    if (p.x < paddleX + paddleWidth / 2) tx += 50; else tx -= 50;
                }
            });
        }
        balls.forEach(b => { if (b.dy > 0 && b.y > paddleTop - 20) { if (b.x < paddleX || b.x > paddleX + paddleWidth) paddleX = b.x - paddleWidth / 2; } });
        let diff = tx - paddleX;
        paddleX += Math.sign(diff) * Math.min(Math.abs(diff), maxAutoplaySpeed);
    }

    if (rightPressed) paddleX += 10; if (leftPressed) paddleX -= 10;
    animationId = requestAnimationFrame(draw);
}

document.addEventListener("DOMContentLoaded", () => {
    canvas = document.getElementById("gameCanvas"); ctx = canvas.getContext("2d");
    gameOverScreen = document.getElementById("game-over"); statusText = document.getElementById("status-text");
    scoreVal = document.getElementById("score-val"); levelVal = document.getElementById("level-val");
    startPrompt = document.getElementById("start-prompt"); startBtn = document.getElementById("start-btn");
    
    startPrompt.querySelector("h1").addEventListener("click", handleSecretToggle);
    if (scoreVal) {
        const scoreContainer = scoreVal.parentElement;
        scoreContainer.style.pointerEvents = "auto";
        scoreContainer.style.cursor = "pointer";
        scoreContainer.addEventListener("click", handleSecretToggle);
    }
    startBtn.addEventListener("click", startGame);
    
    window.addEventListener("keydown", e => { if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") rightPressed = true; if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") leftPressed = true; });
    window.addEventListener("keyup", e => { if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") rightPressed = false; if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") leftPressed = false; });
    window.addEventListener("mousemove", e => { if (gameStarted && !autoplay) paddleX = e.clientX - paddleWidth / 2; });
    window.addEventListener("touchmove", e => { if (gameStarted && !autoplay) paddleX = e.touches[0].clientX - paddleWidth / 2; e.preventDefault(); }, {passive:false});
    resize();
});