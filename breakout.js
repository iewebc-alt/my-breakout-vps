// --- КОНСТАНТЫ ---
const paddleBottomMargin = 60;
const maxAutoplaySpeed = 24;
const ballRadius = 8;
const brickWidth = 60;   
const brickHeight = 25;  
const brickPadding = 8;
const brickOffsetTop = 100; // Опустил чуть ниже, чтобы освободить место под UI

// --- КАРТЫ ЦИФР (5x3 точки для отрисовки шариками) ---
const digitMaps = {
    '0': [1,1,1, 1,0,1, 1,0,1, 1,0,1, 1,1,1],
    '1': [0,1,0, 1,1,0, 0,1,0, 0,1,0, 1,1,1],
    '2': [1,1,1, 0,0,1, 1,1,1, 1,0,0, 1,1,1],
    '3': [1,1,1, 0,0,1, 1,1,1, 0,0,1, 1,1,1],
    '4': [1,0,1, 1,0,1, 1,1,1, 0,0,1, 0,0,1],
    '5': [1,1,1, 1,0,0, 1,1,1, 0,0,1, 1,1,1],
    '6': [1,1,1, 1,0,0, 1,1,1, 1,0,1, 1,1,1],
    '7': [1,1,1, 0,0,1, 0,1,0, 1,0,0, 1,0,0],
    '8': [1,1,1, 1,0,1, 1,1,1, 1,0,1, 1,1,1],
    '9': [1,1,1, 1,0,1, 1,1,1, 0,0,1, 1,1,1],
    ':': [0,0,0, 0,1,0, 0,0,0, 0,1,0, 0,0,0],
    'L': [1,0,0, 1,0,0, 1,0,0, 1,0,0, 1,1,1], // Для слова Level
    'S': [0,1,1, 1,0,0, 0,1,0, 0,0,1, 1,1,0]  // Для слова Score
};

// --- СОСТОЯНИЕ ---
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
let particles = [];
let bricks = [];
let powerUps = [];
let bgStars = [];
let floatingTexts = [];
let shakeIntensity = 0;

const powerUpTypes = ['widerPaddle', 'extraBall', 'speedDown'];
let canvas, ctx, gameOverScreen, statusText, scoreText, scoreVal, levelVal, startPrompt, startBtn;

const patterns = [
    [[0,0,0,1,1,0,0,0],[0,0,1,1,1,1,0,0],[0,1,1,1,1,1,1,0],[1,1,1,1,1,1,1,1]],
    [[0,1,1,0,1,1,0],[1,1,1,1,1,1,1],[1,1,1,1,1,1,1],[0,1,1,1,1,1,0],[0,0,1,1,1,0,0],[0,0,0,1,0,0,0]],
    [[0,1,1,1,1,1,0],[1,0,0,0,0,0,1],[1,0,1,0,1,0,1],[1,0,0,0,0,0,1],[1,0,1,1,1,0,1],[0,1,1,1,1,1,0]],
    [[0,0,1,0,0,1,0,0],[0,1,1,1,1,1,1,0],[1,1,0,1,1,0,1,1],[1,1,1,1,1,1,1,1],[0,0,1,0,0,1,0,0]],
    [[0,0,0,1,0,0,0],[0,0,1,1,1,0,0],[0,1,1,1,1,1,0],[1,1,1,1,1,1,1],[0,1,1,1,1,1,0],[0,0,1,1,1,0,0],[0,0,0,1,0,0,0]]
];

// --- СИСТЕМНЫЕ ФУНКЦИИ ---
async function requestWakeLock() {
    try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (err) {}
}

function applyShake(amount) { shakeIntensity = amount; }

function spawnFloatingText(x, y, text, color) {
    floatingTexts.push({ x, y, text, color, life: 1.0, size: 20 });
}

function playSound(freq, type, duration) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
}

function updatePaddleSize() {
    paddleWidth = canvas.width > 600 ? 120 : canvas.width * 0.3;
}

function initStars() {
    bgStars = [];
    for(let i=0; i<100; i++) {
        bgStars.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, size: Math.random()*2, opacity: Math.random() });
    }
}

function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    updatePaddleSize();
    initStars();
    if (gameStarted && !isGameOver) initBricks();
    paddleX = (canvas.width - paddleWidth) / 2;
}

// --- ОТРИСОВКА ЦИФР ШАРИКАМИ ---
function drawDigit(char, x, y, size, color) {
    const map = digitMaps[char] || digitMaps['0'];
    const dotSize = size / 5;
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    for (let i = 0; i < map.length; i++) {
        if (map[i] === 1) {
            const r = Math.floor(i / 3);
            const c = i % 3;
            ctx.beginPath();
            ctx.arc(x + c * dotSize * 1.3, y + r * dotSize * 1.3, dotSize / 2, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.closePath();
        }
    }
    ctx.restore();
}

function drawString(str, x, y, size, color) {
    let currentX = x;
    for (let char of str.toString()) {
        drawDigit(char, currentX, y, size, color);
        currentX += size * 1.1;
    }
}

function drawUI() {
    // Рисуем Счёт (Score)
    drawString("S", 20, 25, 12, "#ffeb3b");
    drawString(score, 45, 25, 15, "#fff");

    // Рисуем Уровень (Level)
    const levelX = canvas.width - 100;
    drawString("L", levelX, 25, 12, "#00d2ff");
    drawString(level, levelX + 25, 25, 15, "#fff");
}

// --- ЛОГИКА ИГРЫ ---
function initBricks() {
    bricks = [];
    const brickColumnCount = Math.floor((canvas.width - 20) / (brickWidth + brickPadding));
    const totalBricksWidth = brickColumnCount * (brickWidth + brickPadding) - brickPadding;
    const currentOffsetLeft = (canvas.width - totalBricksWidth) / 2;
    const pattern = patterns[(level - 1) % patterns.length];
    const mapRows = pattern.length;
    const mapCols = pattern[0].length;
    const colShift = Math.max(0, Math.floor((brickColumnCount - mapCols) / 2));

    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < 12; r++) {
            let isVisible = (r < mapRows && c >= colShift && c < colShift + mapCols) ? pattern[r][c - colShift] === 1 : false;
            bricks[c][r] = {
                x: c * (brickWidth + brickPadding) + currentOffsetLeft,
                y: r * (brickHeight + brickPadding) + brickOffsetTop,
                status: isVisible ? 1 : 0,
                color: `hsl(${(r * 40 + level * 20) % 360}, 75%, 55%)`,
                powerUp: isVisible && Math.random() < 0.2 ? powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)] : null
            };
        }
    }
}

function spawnBall(x, y, dx, dy) {
    if (balls.length > 20) return;
    let startDx = dx || (Math.random() - 0.5) * 8;
    if (Math.abs(startDx) < 2) startDx = startDx < 0 ? -3 : 3;
    balls.push({
        x: x || canvas.width / 2,
        y: y || canvas.height - paddleBottomMargin - 100,
        dx: startDx, dy: dy || -6,
        paddleOffset: (Math.random() - 0.5) * paddleWidth * 0.8,
        predictedX: null
    });
}

function createParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push({ x, y, dx: (Math.random() - 0.5) * 8, dy: (Math.random() - 0.5) * 8, life: 1.0, color: color });
    }
}

function predictLandingX(ball) {
    let simX = ball.x; let simY = ball.y; let simDX = ball.dx; let simDY = ball.dy;
    const pTop = canvas.height - paddleHeight - paddleBottomMargin;
    for (let i = 0; i < 800; i++) {
        simX += simDX; simY += simDY;
        if (simX - ballRadius < 0) { simX = ballRadius; simDX = Math.abs(simDX); }
        else if (simX + ballRadius > canvas.width) { simX = canvas.width - ballRadius; simDX = -Math.abs(simDX); }
        if (simY - ballRadius < 0) { simY = ballRadius; simDY = Math.abs(simDY); }
        if (simY >= pTop && simDY > 0) return simX;
    }
    return simX;
}

function applyPowerUp(type) {
    if (type === 'widerPaddle') {
        const orig = (canvas.width > 600 ? 120 : canvas.width * 0.3);
        paddleWidth = Math.min(canvas.width * 0.95, paddleWidth * 1.5);
        setTimeout(() => { if (!isGameOver) paddleWidth = orig; }, 10000);
    } else if (type === 'extraBall') {
        spawnBall(paddleX + paddleWidth / 2, canvas.height - paddleBottomMargin - 40);
    } else if (type === 'speedDown') {
        balls.forEach(b => { b.dx *= 0.7; b.dy *= 0.7; });
    }
}

function nextLevel() {
    level++;
    updatePaddleSize();
    balls = []; powerUps = []; particles = []; floatingTexts = [];
    initBricks(); spawnBall();
    playSound(800, 'sine', 0.4);
}

function endGame(win) {
    isGameOver = true; cancelAnimationFrame(animationId);
    gameOverScreen.style.display = "block";
    statusText.textContent = win ? "ПОБЕДА!" : "КОНЕЦ ИГРЫ";
    playSound(win ? 1000 : 150, 'square', 0.6);
}

// --- ОТРИСОВКА ОБЪЕКТОВ ---
function drawBall(ball) {
    ctx.save();
    ctx.shadowBlur = 15; ctx.shadowColor = "#fff";
    const grad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, ballRadius);
    grad.addColorStop(0, "#ffffff"); grad.addColorStop(1, "#00d2ff");
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill(); ctx.closePath();
    ctx.restore();
}

function drawPaddle() {
    if (paddleX < 0) paddleX = 0;
    if (paddleX > canvas.width - paddleWidth) paddleX = canvas.width - paddleWidth;
    const y = canvas.height - paddleHeight - paddleBottomMargin;
    ctx.save();
    ctx.shadowBlur = 20; ctx.shadowColor = "#076EFF";
    const grad = ctx.createLinearGradient(paddleX, y, paddleX, y + paddleHeight);
    grad.addColorStop(0, "#3a8dff"); grad.addColorStop(1, "#0047ab");
    ctx.beginPath(); ctx.roundRect(paddleX, y, paddleWidth, paddleHeight, 8);
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.stroke();
    ctx.closePath();
    ctx.restore();
}

function drawBricks() {
    bricks.forEach(column => {
        column.forEach(b => {
            if (b.status === 1) {
                ctx.save();
                ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, brickWidth, brickHeight);
                ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.fillRect(b.x, b.y, brickWidth, brickHeight/2);
                ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.strokeRect(b.x, b.y, brickWidth, brickHeight);
                if (b.powerUp) {
                    ctx.fillStyle = "#fff"; ctx.font = "14px Arial"; ctx.textAlign = "center";
                    ctx.fillText("★", b.x + brickWidth/2, b.y + brickHeight/2 + 5);
                }
                ctx.restore();
            }
        });
    });
}

function drawPowerUps() {
    const pTop = canvas.height - paddleHeight - paddleBottomMargin;
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i]; p.y += 3;
        ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = p.type === 'extraBall' ? '#ffeb3b' : '#4caf50';
        ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
        ctx.fillStyle = p.type === 'extraBall' ? '#ffeb3b' : p.type === 'widerPaddle' ? '#4caf50' : '#e91e63';
        ctx.fill(); ctx.restore();
        if (p.y + 11 > pTop && p.y - 11 < pTop + paddleHeight && p.x > paddleX && p.x < paddleX + paddleWidth) {
            applyPowerUp(p.type); powerUps.splice(i, 1); playSound(600, 'sine', 0.2);
        } else if (p.y > canvas.height) powerUps.splice(i, 1);
    }
}

function drawParticles() {
    particles.forEach((p, i) => {
        p.x += p.dx; p.y += p.dy; p.life -= 0.02;
        if (p.life <= 0) particles.splice(i, 1);
        else { ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI*2); ctx.fill(); }
    });
    ctx.globalAlpha = 1;
}

function drawFloatingTexts() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y -= 1.5; ft.life -= 0.015; ft.size += 0.5; // Растет при всплытии
        if (ft.life <= 0) floatingTexts.splice(i, 1);
        else {
            ctx.save();
            ctx.globalAlpha = ft.life;
            ctx.fillStyle = ft.color;
            ctx.shadowBlur = 15; ctx.shadowColor = ft.color;
            ctx.font = `bold ${ft.size}px Arial`;
            ctx.textAlign = "center";
            ctx.strokeStyle = "white"; ctx.lineWidth = 1;
            ctx.strokeText(ft.text, ft.x, ft.y);
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }
}

function drawBackground() {
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    bgStars.forEach(s => {
        ctx.fillStyle = `rgba(255,255,255,${s.opacity})`; ctx.fillRect(s.x, s.y, s.size, s.size);
        s.opacity += (Math.random()-0.5)*0.05; if(s.opacity < 0) s.opacity = 0; if(s.opacity > 1) s.opacity = 1;
    });
}

// --- ГЛАВНЫЙ ЦИКЛ ---
let animationId;
function draw() {
    if (isGameOver) return;
    ctx.save();
    if (shakeIntensity > 0) {
        ctx.translate((Math.random()-0.5)*shakeIntensity, (Math.random()-0.5)*shakeIntensity);
        shakeIntensity *= 0.9; if (shakeIntensity < 0.1) shakeIntensity = 0;
    }
    drawBackground(); 
    drawUI(); // Наш новый шариковый интерфейс
    drawBricks(); drawPaddle(); drawPowerUps(); drawParticles(); drawFloatingTexts();

    const pTop = canvas.height - paddleHeight - paddleBottomMargin;
    let lowestBrickY = 0;
    bricks.forEach(col => col.forEach(br => { if (br.status === 1) lowestBrickY = Math.max(lowestBrickY, br.y); }));
    const activationLine = Math.max(canvas.height / 2, lowestBrickY + brickHeight + 20);

    balls.forEach((b, i) => {
        drawBall(b); b.x += b.dx; b.y += b.dy;
        if (Math.abs(b.dx) < 0.5) b.dx += (b.dx < 0 ? -1.5 : 1.5);

        if (b.x - ballRadius < 0) { b.x = ballRadius; b.dx = Math.abs(b.dx); playSound(400, 'sine', 0.05); b.predictedX = null; } 
        else if (b.x + ballRadius > canvas.width) { b.x = canvas.width - ballRadius; b.dx = -Math.abs(b.dx); playSound(400, 'sine', 0.05); b.predictedX = null; }

        if (b.y - ballRadius < 0) { b.y = ballRadius; b.dy = Math.abs(b.dy); playSound(400, 'sine', 0.05); b.predictedX = null; } 
        else if (b.y + ballRadius > pTop) {
            if (b.x > paddleX && b.x < paddleX + paddleWidth && b.y < pTop + paddleHeight) {
                b.y = pTop - ballRadius; b.dy = -Math.abs(b.dy); 
                b.dx = ((b.x - (paddleX + paddleWidth / 2)) / (paddleWidth / 2)) * 8 + (Math.random() - 0.5) * 2;
                playSound(300, 'square', 0.1); b.paddleOffset = (Math.random() - 0.5) * paddleWidth * 0.7; b.predictedX = null;
            } else if (b.y > canvas.height) { balls.splice(i, 1); playSound(150, 'sawtooth', 0.2); if (balls.length === 0) endGame(false); }
        }

        bricks.forEach(column => {
            column.forEach(br => {
                if (br.status === 1 && b.x + ballRadius > br.x && b.x - ballRadius < br.x + brickWidth && b.y + ballRadius > br.y && b.y - ballRadius < br.y + brickHeight) {
                    br.status = 0; b.dy = -b.dy; score += 10;
                    
                    applyShake(7); 
                    createParticles(b.x, b.y, br.color); 
                    spawnFloatingText(br.x + brickWidth/2, br.y, "+10", br.color);
                    
                    playSound(500 + Math.random()*100, 'sine', 0.08); b.predictedX = null;
                    if (br.powerUp) powerUps.push({x: br.x + brickWidth/2, y: br.y, type: br.powerUp, dy: 2});
                    if (bricks.flat().every(b => b.status === 0)) nextLevel();
                }
            });
        });

        for (let j = i + 1; j < balls.length; j++) {
            const b2 = balls[j]; const dx = b2.x - b.x; const dy = b2.y - b.y; const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < ballRadius * 2) {
                [b.dx, b2.dx] = [b2.dx, b.dx]; [b.dy, b2.dy] = [b2.dy, b.dy];
                applyShake(4); playSound(350, 'triangle', 0.05); b.predictedX = null; b2.predictedX = null;
            }
        }
    });

    if (autoplay) {
        let priorityBall = balls.reduce((prev, curr) => (curr.dy > 0 && (prev == null || curr.y > prev.y) ? curr : prev), null);
        let targetX = canvas.width / 2;
        if (priorityBall) {
            if (priorityBall.y > activationLine) {
                if (!priorityBall.predictedX) priorityBall.predictedX = predictLandingX(priorityBall);
                targetX = priorityBall.predictedX + (priorityBall.paddleOffset || 0);
            } else {
                let usefulPowerUps = powerUps.filter(p => p.type !== 'speedDown');
                if (usefulPowerUps.length > 0) {
                    targetX = usefulPowerUps.reduce((prev, curr) => (curr.y > prev.y ? curr : prev)).x;
                } else { targetX = priorityBall.x; }
            }
        }
        let diff = targetX - paddleWidth / 2 - paddleX;
        let currentSpeed = (priorityBall && priorityBall.y > activationLine) ? maxAutoplaySpeed : 10;
        if (Math.abs(diff) > 2) paddleX += Math.sign(diff) * Math.min(Math.abs(diff), currentSpeed);
    }

    if (rightPressed) paddleX += 10; if (leftPressed) paddleX -= 10;
    ctx.restore(); animationId = requestAnimationFrame(draw);
}

// --- УПРАВЛЕНИЕ ---
window.resetGame = function() {
    score = 0; level = 1; isGameOver = false;
    balls = []; powerUps = []; particles = []; floatingTexts = [];
    gameOverScreen.style.display = "none";
    resize(); initBricks(); spawnBall(); draw();
}

let lastClickTime = 0; let clickCounter = 0;
function handleSecretToggle(e) {
    const now = Date.now();
    if (now - lastClickTime < 500) clickCounter++; else clickCounter = 1;
    lastClickTime = now;
    if (clickCounter >= 3) {
        autoplay = !autoplay; clickCounter = 0;
        playSound(autoplay ? 800 : 400, 'triangle', 0.2);
    }
}

function handleOrientation(e) {
    if (!gameStarted || isGameOver || autoplay) return;
    let tilt = (window.orientation === 90 || window.orientation === -90) ? e.beta : e.gamma;
    if (tilt !== null && Math.abs(tilt) > 1.5) paddleX += tilt * 1.2;
}

document.addEventListener("DOMContentLoaded", () => {
    canvas = document.getElementById("gameCanvas"); ctx = canvas.getContext("2d");
    gameOverScreen = document.getElementById("game-over"); statusText = document.getElementById("status-text");
    startPrompt = document.getElementById("start-prompt"); startBtn = document.getElementById("start-btn");

    // Тройной клик теперь работает по области заголовка И по верхнему краю холста
    startPrompt.querySelector("h1").addEventListener("pointerdown", handleSecretToggle);
    canvas.addEventListener("pointerdown", (e) => { if(e.clientY < 100) handleSecretToggle(); });

    startBtn.onclick = () => { 
        gameStarted = true; startPrompt.style.display = "none"; requestWakeLock();
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission().then(state => { if (state === 'granted') window.addEventListener('deviceorientation', handleOrientation); }).catch(console.error);
        } else { window.addEventListener('deviceorientation', handleOrientation); }
        window.resetGame(); 
    };
    window.addEventListener("keydown", e => { if (e.key.includes("Right")) rightPressed = true; if (e.key.includes("Left")) leftPressed = true; });
    window.addEventListener("keyup", e => { if (e.key.includes("Right")) rightPressed = false; if (e.key.includes("Left")) leftPressed = false; });
    window.addEventListener("mousemove", e => { if (gameStarted && !autoplay) paddleX = e.clientX - paddleWidth / 2; });
    window.addEventListener("touchmove", e => { if (gameStarted && !autoplay) paddleX = e.touches[0].clientX - paddleWidth / 2; e.preventDefault(); }, {passive:false});
    window.addEventListener('resize', resize); resize();
});
