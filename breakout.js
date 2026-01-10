// --- 1. КОНСТАНТЫ И НАСТРОЙКИ ---
let paddleBottomMargin = 45;
const maxAutoplaySpeed = 30; 
const ballRadius = 8;
const brickWidth = 60;   
const brickPadding = 8;
const powerUpTypes = ['widerPaddle', 'extraBall', 'speedDown'];

// --- 2. СОСТОЯНИЕ ИГРЫ ---
let score = 0, level = 1;
let isGameOver = true, gameStarted = false; // autoplay удален, используем settings.auto
let paddleHeight = 18, paddleWidth = 100, targetPaddleWidth = 100, paddleX = 0;
let rightPressed = false, leftPressed = false;
let balls = [], particles = [], bricks = [], powerUps = [], floatingTexts = [], bgStars = [];
let shakeIntensity = 0, brickHeight = 25, brickOffsetTop = 110;
let needsLevelUp = false;
let paddleTimeout = null;

// Космос и Управление
let stars = [], starSpeed = 2, starAngle = 0, flightDirX = 0, flightDirY = 0, rotationSpeed = 0.0005;
let tiltSmooth = 0;
let isUserTouching = false; 
let paddleVelocity = 0;

// ОБЪЕКТ НАСТРОЕК (Единственный источник истины)
let settings = { 
    sound: true, 
    auto: false, 
    stars: true, 
    invert: true, 
    sens: 0.4,
    rank: 0
};

let lastClickTime = 0, clickCounter = 0;
let lastLClickTime = 0, lClickCounter = 0; 
let animationId = null;

let canvas, ctx, gameOverScreen, statusText, scoreText, startPrompt, startBtn;

// --- 3. UI КАРТЫ ---
const digitMaps = {
    '0': [1,1,1, 1,0,1, 1,0,1, 1,0,1, 1,1,1], '1': [0,1,0, 1,1,0, 0,1,0, 0,1,0, 1,1,1],
    '2': [1,1,1, 0,0,1, 1,1,1, 1,0,0, 1,1,1], '3': [1,1,1, 0,0,1, 1,1,1, 0,0,1, 1,1,1],
    '4': [1,0,1, 1,0,1, 1,1,1, 0,0,1, 0,0,1], '5': [1,1,1, 1,0,0, 1,1,1, 0,0,1, 1,1,1],
    '6': [1,1,1, 1,0,0, 1,1,1, 1,0,1, 1,1,1], '7': [1,1,1, 0,0,1, 0,1,0, 1,0,0, 1,0,0],
    '8': [1,1,1, 1,0,1, 1,1,1, 1,0,1, 1,1,1], '9': [1,1,1, 1,0,1, 1,1,1, 0,0,1, 1,1,1],
    'S': [0,1,1, 1,0,0, 0,1,0, 0,0,1, 1,1,0], 'L': [1,0,0, 1,0,0, 1,0,0, 1,0,0, 1,1,1]
};

const patterns = [
    [[0,0,0,1,1,0,0,0],[0,0,1,1,1,1,0,0],[0,1,1,1,1,1,1,0],[1,1,1,1,1,1,1,1]],
    [[0,1,1,0,1,1,0],[1,1,1,1,1,1,1],[1,1,1,1,1,1,1],[0,1,1,1,1,1,0],[0,0,1,1,1,0,0],[0,0,0,1,0,0,0]],
    [[0,1,1,1,1,1,0],[1,0,0,0,0,0,1],[1,0,1,0,1,0,1],[1,0,0,0,0,0,1],[1,0,1,1,1,0,1],[0,1,1,1,1,1,0]]
];

// --- 4. СИСТЕМНЫЕ (WAKE LOCK) ---
let wakeLock = null;
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => { if(!isGameOver) setTimeout(requestWakeLock, 1000); });
        }
    } catch (err) {}
}
setInterval(() => { if (gameStarted && !isGameOver && document.visibilityState === 'visible') requestWakeLock(); }, 10000);

// --- 5. ЗВУКОВОЙ ДВИЖОК ---
let audioCtx = null, noiseBuffer = null;
function initAudio() {
    if (audioCtx) return;
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AC();
        const size = audioCtx.sampleRate * 0.1;
        noiseBuffer = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    } catch(e) {}
}

function playNaturalSound(type) {
    if (!settings.sound || !audioCtx || !noiseBuffer) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    const noise = audioCtx.createBufferSource(), nGain = audioCtx.createGain();
    noise.buffer = noiseBuffer;
    switch(type) {
        case 'brick': osc.type = 'triangle'; osc.frequency.setValueAtTime(550, audioCtx.currentTime); gain.gain.setValueAtTime(0.2, audioCtx.currentTime); nGain.gain.setValueAtTime(0.1, audioCtx.currentTime); break;
        case 'wall': osc.type = 'sine'; osc.frequency.setValueAtTime(150, audioCtx.currentTime); gain.gain.setValueAtTime(0.15, audioCtx.currentTime); nGain.gain.setValueAtTime(0.05, audioCtx.currentTime); break;
        case 'paddle': osc.type = 'square'; osc.frequency.setValueAtTime(200, audioCtx.currentTime); gain.gain.setValueAtTime(0.25, audioCtx.currentTime); nGain.gain.setValueAtTime(0.15, audioCtx.currentTime); break;
        case 'powerup': osc.type = 'sine'; osc.frequency.setValueAtTime(440, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.2); gain.gain.setValueAtTime(0.2, audioCtx.currentTime); break;
    }
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    nGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.connect(gain); gain.connect(audioCtx.destination);
    noise.connect(nGain); nGain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    noise.start(); noise.stop(audioCtx.currentTime + 0.1);
}

// --- 6. КОСМОС (ДИНАМИКА) ---
function initStars() {
    stars = [];
    for(let i = 0; i < 200; i++) stars.push({ x: Math.random()*window.innerWidth - window.innerWidth/2, y: Math.random()*window.innerHeight - window.innerHeight/2, z: Math.random()*window.innerWidth });
}

function changeFlightCourse() {
    const targetX = (Math.random() - 0.5) * 15, targetY = (Math.random() - 0.5) * 15, targetSpeed = 2 + Math.random() * 10, targetRot = (Math.random() - 0.5) * 0.02;
    let step = 0;
    const interval = setInterval(() => {
        flightDirX += (targetX - flightDirX) * 0.05; flightDirY += (targetY - flightDirY) * 0.05;
        starSpeed += (targetSpeed - starSpeed) * 0.05; rotationSpeed += (targetRot - rotationSpeed) * 0.05;
        if (++step > 60) clearInterval(interval);
    }, 50);
}
setInterval(changeFlightCourse, 7000);

function updateAndDrawStars() {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!settings.stars) return;
    starAngle += rotationSpeed; 
    const cx = canvas.width / 2, cy = canvas.height / 2, speedMult = Math.max(0.5, settings.sens * 0.8);
    stars.forEach(s => {
        s.z -= starSpeed * speedMult; s.x += flightDirX; s.y += flightDirY;
        if (s.z <= 0) { s.z = canvas.width; s.x = Math.random() * canvas.width - cx; s.y = Math.random() * canvas.height - cy; }
        let k = 128.0 / s.z, px = s.x * k + cx, py = s.y * k + cy;
        let rotX = (px - cx) * Math.cos(starAngle) - (py - cy) * Math.sin(starAngle) + cx;
        let rotY = (px - cx) * Math.sin(starAngle) + (py - cy) * Math.cos(starAngle) + cy;
        if (rotX > 0 && rotX < canvas.width && rotY > 0 && rotY < canvas.height) {
            let size = (1 - s.z / canvas.width) * 3, shade = parseInt((1 - s.z / canvas.width) * 255);
            ctx.fillStyle = `rgb(${shade},${shade},${shade})`; ctx.fillRect(rotX, rotY, size, size);
        }
    });
}

// --- 7. ВСПОМОГАТЕЛЬНЫЕ ---
function drawBallString(str, x, y, size, color) {
    let curX = x; const s = str.toString();
    for (let i = 0; i < s.length; i++) {
        const map = digitMaps[s[i]]; if (!map) continue;
        const step = size / 4;
        ctx.save(); ctx.fillStyle = color;
        for (let j = 0; j < map.length; j++) {
            if (map[j]) { ctx.beginPath(); ctx.arc(curX + (j % 3) * step * 1.3, y + Math.floor(j / 3) * step * 1.3, step / 2, 0, 7); ctx.fill(); }
        }
        ctx.restore(); curX += size * 1.15;
    }
}

function keepPaddleInBounds() {
    if (paddleX < 0) paddleX = 0;
    if (paddleX > canvas.width - paddleWidth) paddleX = canvas.width - paddleWidth;
}

function updatePaddleSize() {
    const rankPaddleMult = [1.2, 1.0, 0.7][settings.rank || 0];
    targetPaddleWidth = Math.max(60, (canvas.width > 600 ? 120 : canvas.width * 0.35) * rankPaddleMult);
}

function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const isLand = canvas.width > canvas.height;
    brickHeight = isLand ? 18 : 25; brickOffsetTop = isLand ? 60 : 110;
    updatePaddleSize(); paddleWidth = targetPaddleWidth;
    paddleBottomMargin = isLand ? 25 : 45;
    keepPaddleInBounds(); initStars();
    if (gameStarted && !isGameOver) initBricks();
}

function initBricks() {
    bricks = []; 
    const brickColumnCount = Math.floor((canvas.width - 20) / (brickWidth + brickPadding));
    if (brickColumnCount <= 0) return; 
    const totalW = brickColumnCount * (brickWidth + brickPadding) - brickPadding;
    const offLeft = (canvas.width - totalW) / 2;
    const rows = 6 + (level % 8); 
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < rows; r++) {
            let isV = (level % 5 === 0) ? (c + r) % 2 === 0 : (level % 3 === 0) ? r % 2 === 0 : Math.random() > 0.3;
            bricks[c][r] = {
                x: c * (brickWidth + brickPadding) + offLeft, y: r * (brickHeight + brickPadding) + brickOffsetTop,
                status: isV ? 1 : 0, color: `hsl(${(r * 35 + level * 20 + c * 10) % 360}, 80%, 60%)`,
                powerUp: isV && Math.random() < 0.22 ? powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)] : null
            };
        }
    }
    if (bricks.flat().every(b => b.status === 0)) bricks[0][0].status = 1;
}

function spawnBall(x, y, dx, dy) {
    if (balls.length > 15) return;
    const rankSpeedMult = [1.0, 1.2, 1.5][settings.rank || 0];
    let speedFactor = (1 + (level - 1) * 0.15) * rankSpeedMult;
    let sDx = dx || (Math.random() - 0.5) * 8 * speedFactor; 
    if (Math.abs(sDx) < 2) sDx = sDx < 0 ? -3 : 3;
    balls.push({ x: x || canvas.width/2, y: y || canvas.height - 150, dx: sDx, dy: dy || -6 * speedFactor, pX: null, perfectHitPoint: 0, spin: 0 });
}

function predictLandingX(b) {
    let sX = b.x, sY = b.y, sDX = b.dx, sDY = b.dy, sSpin = (b.spin || 0);
    const pT = canvas.height - paddleHeight - paddleBottomMargin;
    for (let i = 0; i < 500; i++) {
        sDX += sSpin; sSpin *= 0.98;
        sX += sDX; sY += sDY;
        if (sX < ballRadius) { sX = ballRadius; sDX = Math.abs(sDX); }
        else if (sX > canvas.width - ballRadius) { sX = canvas.width - ballRadius; sDX = -Math.abs(sDX); }
        if (sY < ballRadius) sDY = Math.abs(sDY);
        if (sY >= pT && sDY > 0) return sX;
    }
    return sX;
}

function findPerfectHitPoint(ball) {
    const pT = canvas.height - paddleHeight - paddleBottomMargin;
    const activeBricksList = bricks.flat().filter(b => b.status === 1);
    if (activeBricksList.length === 0) return 0;
    const target = activeBricksList.reduce((prev, curr) => (curr.y > prev.y ? curr : prev));
    const targetCenterX = target.x + brickWidth / 2;
    const targetCenterY = target.y + brickHeight / 2;
    let bestHitPoint = 0; let minDistance = Infinity;
    for (let hp = -1; hp <= 1; hp += 0.05) {
        let simDX = hp * 9; let simDY = -Math.abs(ball.dy); let simX = ball.x; let simY = pT - ballRadius;
        for (let step = 0; step < 400; step++) {
            simX += simDX; simY += simDY;
            if (simX < ballRadius || simX > canvas.width - ballRadius) simDX = -simDX;
            if (simY < ballRadius) simDY = -simDY;
            let dist = Math.sqrt(Math.pow(simX - targetCenterX, 2) + Math.pow(simY - targetCenterY, 2));
            if (dist < minDistance) { minDistance = dist; bestHitPoint = hp; }
            if (simY > canvas.height || dist < 15) break;
        }
    }
    return bestHitPoint;
}

// --- 8. ОБНОВЛЕНИЕ ---
function update() {
    if (isGameOver || !gameStarted) return;
    const pY = canvas.height - paddleHeight - paddleBottomMargin;

    if (Math.abs(paddleWidth - targetPaddleWidth) > 1) {
        let oldW = paddleWidth;
        paddleWidth += (targetPaddleWidth - paddleWidth) * 0.1;
        paddleX -= (paddleWidth - oldW) / 2;
        if (settings.auto) balls.forEach(b => b.pX = null);
    }

    // ШАРЫ
    for (let i = balls.length - 1; i >= 0; i--) {
        let b = balls[i]; if (isNaN(b.x)) { balls.splice(i, 1); continue; }
        b.dx += (b.spin || 0);
        b.spin = (b.spin || 0) * 0.98;

        let speed = Math.sqrt(b.dx*b.dx + b.dy*b.dy), steps = (speed > ballRadius) ? 2 : 1;
        for (let s = 0; s < steps; s++) {
            b.x += b.dx/steps; b.y += b.dy/steps;
            
            if (b.x < ballRadius) { b.x = ballRadius; b.dx = Math.abs(b.dx); b.spin = 0; playNaturalSound('wall'); b.pX = null; }
            else if (b.x > canvas.width - ballRadius) { b.x = canvas.width - ballRadius; b.dx = -Math.abs(b.dx); b.spin = 0; playNaturalSound('wall'); b.pX = null; }
            
            if (b.y < ballRadius) { b.y = ballRadius; b.dy = Math.abs(b.dy); b.spin = 0; playNaturalSound('wall'); b.pX = null; }
            else if (b.y + ballRadius > pY) {
                if (b.x >= paddleX - ballRadius - 2 && b.x <= paddleX + paddleWidth + ballRadius + 2 && b.y < pY + paddleHeight) {
                    b.y = pY - ballRadius; b.dy = -Math.abs(b.dy);
                    b.spin = (paddleVelocity || 0) * 0.03;
                    let hp = (settings.auto && !isUserTouching) ? b.perfectHitPoint : (b.x - (paddleX + paddleWidth/2)) / (paddleWidth/2);
                    b.dx = hp * 9;
                    playNaturalSound('paddle'); b.pX = null;
                } else if (b.y > canvas.height + 20) { balls.splice(i, 1); if (balls.length === 0) { endGame(false); return; } break; }
            }
            bricks.forEach(col => col.forEach(br => {
                if (br.status && b.x+ballRadius > br.x && b.x-ballRadius < br.x+brickWidth && b.y+ballRadius > br.y && b.y-ballRadius < br.y+brickHeight) {
                    br.status = 0; b.dy = -b.dy; b.spin *= 0.5;
                    score += 10 * ([1, 2, 5][settings.rank || 0]);
                    if (br.powerUp) shakeIntensity = 10; playNaturalSound('brick'); b.pX = null;
                    for (let k=0; k<6; k++) particles.push({ x: b.x, y: b.y, dx: (Math.random()-0.5)*8, dy: (Math.random()-0.5)*8, life: 1.0, color: br.color });
                    floatingTexts.push({ x: br.x+brickWidth/2, y: br.y, text: "+" + (10 * ([1, 2, 5][settings.rank || 0])), color: br.color, life: 1.0, size: 24 });
                    if (br.powerUp) powerUps.push({x: br.x+brickWidth/2, y: br.y, type: br.powerUp, dy: 3.2, dx: 0, radius: 11});
                }
            }));
        }
    }

    // БОНУСЫ
    for(let i=powerUps.length-1; i>=0; i--) {
        let p = powerUps[i]; let prevY = p.y; p.x += (p.dx || 0); p.dx *= 0.95; p.y += p.dy;
        
        if (p.x < p.radius) { p.x = p.radius; p.dx = Math.abs(p.dx || 0); }
        if (p.x > canvas.width - p.radius) { p.x = canvas.width - p.radius; p.dx = -Math.abs(p.dx || 0); }
        if (p.y < p.radius) { p.y = p.radius; p.dy = Math.abs(p.dy); } // Отскок от потолка

        // ОТСКОК ОТ КИРПИЧЕЙ (НЕ РАЗРУШАЯ ИХ)
        bricks.forEach(col => col.forEach(br => { 
            if (br.status && p.x+p.radius > br.x && p.x-p.radius < br.x+brickWidth && p.y+p.radius > br.y && p.y-p.radius < br.y+brickHeight) { 
                p.dy = Math.abs(p.dy); // Отскакиваем вниз
                p.y = br.y + brickHeight + p.radius + 1; 
                playNaturalSound('wall'); 
            } 
        }));

        if (p.x >= paddleX - p.radius - 2 && p.x <= paddleX + paddleWidth + p.radius + 2 && p.y + p.radius >= pY && p.y < pY + paddleHeight) {
            if (p.type === 'extraBall') spawnBall(p.x, pY - 10);
            else if (p.type === 'widerPaddle') { if(paddleTimeout) clearTimeout(paddleTimeout); targetPaddleWidth = (canvas.width > 600 ? 120 : canvas.width * 0.35) * 1.6; paddleTimeout = setTimeout(()=> { if(!isGameOver) { updatePaddleSize(); } }, 10000); }
            powerUps.splice(i, 1); playNaturalSound('powerup');
        } else if (p.y > canvas.height) powerUps.splice(i, 1);
    }

    // ФИЗИКА СТОЛКНОВЕНИЙ
    let phys = [...balls.map(b=>({ref:b, r:ballRadius, type:'ball'})), ...powerUps.map(p=>({ref:p, r:p.radius, type:'powerup'}))];
    for (let i = 0; i < phys.length; i++) {
        for (let j = i + 1; j < phys.length; j++) {
            let a = phys[i], b = phys[j];
            let dx = b.ref.x - a.ref.x, dy = b.ref.y - a.ref.y, dist = Math.sqrt(dx*dx + dy*dy), minDist = a.r + b.r;
            if (dist < minDist && dist > 0) {
                let nx = dx / dist, ny = dy / dist, overlap = (minDist - dist) / 2;
                a.ref.x -= nx * overlap; a.ref.y -= ny * overlap; b.ref.x += nx * overlap; b.ref.y += ny * overlap;
                let imp = 2.0;
                if (a.type === 'ball') { a.ref.dx -= nx * imp; a.ref.dy -= ny * imp; } else { a.ref.dx = (a.ref.dx || 0) - nx * imp * 2; }
                if (b.type === 'ball') { b.ref.dx += nx * imp; b.ref.dy += ny * imp; } else { b.ref.dx = (b.ref.dx || 0) + nx * imp * 2; }
                playNaturalSound('wall');
            }
        }
    }

    if (settings.auto && balls.length && !isUserTouching) {
        let targets = [...balls.filter(b => b.dy > 0), ...powerUps.filter(p => p.type === 'extraBall')];
        let target = targets.reduce((p, c) => (!p || c.y > p.y) ? c : p, null);
        let tX = canvas.width / 2;
        if (target) {
            if (target.y > canvas.height * 0.3) {
                if (target.dy !== undefined) { if (!target.pX) { target.pX = predictLandingX(target); target.perfectHitPoint = findPerfectHitPoint(target); } tX = target.pX - (target.perfectHitPoint * (paddleWidth / 2)); }
                else { tX = target.x; }
            } else { tX = target.x || target.ref?.x || canvas.width/2; }
        }
        let diff = tX - paddleWidth/2 - paddleX;
        let urgent = (target && (target.y || target.ref?.y || 0) > canvas.height * 0.8);
        if (Math.abs(diff) > (urgent ? 1 : 5)) paddleX += Math.sign(diff) * Math.min(Math.abs(diff), maxAutoplaySpeed);
    }

    if (rightPressed) { paddleX += 10; paddleVelocity = 10; } 
    else if (leftPressed) { paddleX -= 10; paddleVelocity = -10; }
    else if (!settings.auto && !isUserTouching) { paddleVelocity *= 0.8; }

    keepPaddleInBounds();
    particles.forEach(p => { p.x += p.dx; p.y += p.dy; p.life -= 0.02; }); particles = particles.filter(p => p.life > 0);
    floatingTexts.forEach(ft => { ft.y -= 1.5; ft.life -= 0.015; ft.size += 0.5; }); floatingTexts = floatingTexts.filter(ft => ft.life > 0);
    if (shakeIntensity > 0) shakeIntensity *= 0.9;
    if (bricks.flat().every(b => b.status === 0)) needsLevelUp = true;
}

// --- 9. ОТРИСОВКА ---
function drawAll() {
    if (!ctx) return;
    updateAndDrawStars();
    if (gameStarted) {
        drawBallString("S", 25, 35, 12, "#fbbf24"); drawBallString(score, 55, 35, 16, "#fff");
        const lX = canvas.width - 110; drawBallString("L", lX, 35, 12, "#3b82f6"); drawBallString(level, lX + 28, 35, 16, "#fff");
        bricks.forEach(col => col.forEach(b => { if (b.status) { ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, brickWidth, brickHeight); ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.fillRect(b.x, b.y, brickWidth, 3); if (b.powerUp) { ctx.fillStyle = "#fff"; ctx.font = "bold 14px Arial"; ctx.textAlign = "center"; ctx.fillText("★", b.x + brickWidth/2, b.y + brickHeight/2 + 5); } } }));
        const pY = canvas.height - paddleHeight - paddleBottomMargin;
        ctx.save(); ctx.shadowBlur = 15; ctx.shadowColor = "#0072ff";
        const pG = ctx.createLinearGradient(paddleX, 0, paddleX + paddleWidth, 0);
        pG.addColorStop(0, "#ff3300"); pG.addColorStop(0.25, "#ffcc00"); pG.addColorStop(0.5, "#0072ff"); pG.addColorStop(0.75, "#ffcc00"); pG.addColorStop(1, "#ff3300");
        ctx.beginPath(); ctx.roundRect(paddleX, pY, paddleWidth, paddleHeight, paddleHeight/2);
        ctx.fillStyle = pG; ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 1;
        for(let i=1; i<5; i++) { let lx = paddleX + (paddleWidth/5)*i; ctx.moveTo(lx, pY); ctx.lineTo(lx, pY + paddleHeight); }
        ctx.stroke(); ctx.restore();
        balls.forEach(b => { ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = "#fff"; ctx.beginPath(); ctx.arc(b.x, b.y, ballRadius, 0, 7); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore(); });
        powerUps.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, 7); let color = p.type === 'extraBall' ? '#fbbf24' : p.type === 'widerPaddle' ? '#4caf50' : '#f43f5e'; ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.stroke(); ctx.fillStyle = "#000"; ctx.font = "bold 12px Arial"; ctx.textAlign = "center"; ctx.fillText(p.type === 'extraBall' ? 'B' : p.type === 'widerPaddle' ? 'W' : 'S', p.x, p.y + 4); });
        particles.forEach(p => { ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 3, 3); });
        floatingTexts.forEach(ft => { ctx.globalAlpha = ft.life; ctx.fillStyle = ft.color; ctx.font = `bold ${Math.floor(ft.size)}px Arial`; ctx.textAlign = "center"; ctx.fillText(ft.text, ft.x, ft.y); });
    }
}

function gameLoop() {
    try {
        ctx.save();
        if (shakeIntensity > 0.1) ctx.translate((Math.random()-0.5)*shakeIntensity, (Math.random()-0.5)*shakeIntensity);
        if (gameStarted && !isGameOver) update();
        drawAll(); ctx.restore();
    } catch(e) {}
    if (needsLevelUp) { needsLevelUp = false; level++; powerUps = []; updatePaddleSize(); targetPaddleWidth = paddleWidth; changeFlightCourse(); initBricks(); balls = []; spawnBall(); playNaturalSound('powerup'); }
    animationId = requestAnimationFrame(gameLoop);
}

// --- 10. УПРАВЛЕНИЕ И НАСТРОЙКИ ---
function saveSettings() { localStorage.setItem('breakout_v11_final', JSON.stringify(settings)); }
function loadSettings() {
    try {
        const saved = JSON.parse(localStorage.getItem('breakout_v11_final') || '{}');
        settings = Object.assign(settings, saved);
        setTimeout(() => {
            if(document.getElementById('select-rank')) document.getElementById('select-rank').value = settings.rank;
            if(document.getElementById('toggle-sound')) document.getElementById('toggle-sound').checked = settings.sound;
            if(document.getElementById('toggle-autoplay')) document.getElementById('toggle-autoplay').checked = settings.auto;
            if(document.getElementById('toggle-stars')) document.getElementById('toggle-stars').checked = settings.stars;
            if(document.getElementById('toggle-invert')) document.getElementById('toggle-invert').checked = settings.invert;
            if(document.getElementById('gyro-slider')) document.getElementById('gyro-slider').value = settings.sens;
            if(document.getElementById('gyro-value')) document.getElementById('gyro-value').textContent = settings.sens;
        }, 100);
    } catch(e) {}
}

function handleSpeedBoost() { balls.forEach(b => { b.dx *= 1.15; b.dy *= 1.15; b.pX = null; }); playNaturalSound('powerup'); spawnFloatingText(canvas.width/2, canvas.height/2, "SPEED BOOST!", "#ff0"); }
function handleSecretToggle() { settings.auto = !settings.auto; document.getElementById('toggle-autoplay').checked = settings.auto; saveSettings(); playNaturalSound('powerup'); }
function endGame(win) { isGameOver = true; if(gameOverScreen) gameOverScreen.style.display = "block"; if(statusText) statusText.textContent = win ? "ПОБЕДА!" : "КОНЕЦ ИГРЫ"; if(scoreText) scoreText.textContent = "Ваш счёт: " + score; }
function startGame() { initAudio(); requestWakeLock(); gameStarted = true; isGameOver = false; if(startPrompt) startPrompt.style.display = "none"; if(gameOverScreen) gameOverScreen.style.display = "none"; score = 0; level = 1; balls = []; powerUps = []; particles = []; floatingTexts = []; resize(); initBricks(); spawnBall(); }
window.resetGame = () => { startGame(); };

function handleOrientation(e) {
    if (!gameStarted || isGameOver || settings.auto || isUserTouching || settings.sens <= 0) return;
    let tilt = (window.orientation === 90 || window.orientation === -90) ? e.beta : e.gamma;
    let dir = settings.invert ? 1 : -1;
    if (tilt !== null && Math.abs(tilt) > 1.5) { let move = tilt * dir * settings.sens; paddleX += move; paddleVelocity = move; keepPaddleInBounds(); }
}

document.addEventListener("DOMContentLoaded", () => {
    canvas = document.getElementById("gameCanvas"); ctx = canvas.getContext("2d");
    gameOverScreen = document.getElementById("game-over"); statusText = document.getElementById("status-text");
    scoreText = document.getElementById("score-text"); startPrompt = document.getElementById("start-prompt"); startBtn = document.getElementById("start-btn");
    loadSettings();
    const settingsBtn = document.getElementById('settings-btn-icon');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');
    if(settingsBtn) settingsBtn.onclick = () => { settingsModal.style.display = 'block'; };
    if(closeSettingsBtn) closeSettingsBtn.onclick = () => { settingsModal.style.display = 'none'; };
    document.getElementById('select-rank').onchange = (e) => { settings.rank = parseInt(e.target.value); updatePaddleSize(); paddleWidth = targetPaddleWidth; saveSettings(); };
    document.getElementById('toggle-sound').onchange = (e) => { settings.sound = e.target.checked; saveSettings(); };
    document.getElementById('toggle-autoplay').onchange = (e) => { settings.auto = e.target.checked; saveSettings(); };
    document.getElementById('toggle-stars').onchange = (e) => { settings.stars = e.target.checked; saveSettings(); };
    document.getElementById('toggle-invert').onchange = (e) => { settings.invert = e.target.checked; saveSettings(); };
    document.getElementById('gyro-slider').oninput = (e) => { settings.sens = parseFloat(e.target.value); document.getElementById('gyro-value').textContent = settings.sens; saveSettings(); };
    canvas.addEventListener("pointerdown", e => { if (e.clientX > canvas.width - 120 && e.clientY < 100) { const now = Date.now(); if (now - lastLClickTime < 500) lClickCounter++; else lClickCounter = 1; lastLClickTime = now; if (lClickCounter >= 3) { handleSpeedBoost(); lClickCounter = 0; } } else if (e.clientY < 100) { const now = Date.now(); if (now - lastClickTime < 500) clickCounter++; else clickCounter = 1; lastClickTime = now; if (clickCounter >= 3) { handleSecretToggle(); clickCounter = 0; } } else { isUserTouching = true; initAudio(); } });
    canvas.addEventListener("pointerup", () => { isUserTouching = false; paddleVelocity = 0; });
    canvas.addEventListener("touchmove", e => { if (gameStarted) { e.preventDefault(); let touch = e.touches[0]; let rect = canvas.getBoundingClientRect(); let newX = (touch.clientX - rect.left) - paddleWidth / 2; paddleVelocity = newX - paddleX; paddleX = newX; keepPaddleInBounds(); isUserTouching = true; } }, {passive: false});
    window.addEventListener("mousemove", e => { if (gameStarted && !settings.auto) { paddleX = e.clientX - paddleWidth / 2; keepPaddleInBounds(); } });
    startBtn.onclick = () => { initAudio(); if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') { DeviceOrientationEvent.requestPermission().then(state => { if (state === 'granted') window.addEventListener('deviceorientation', handleOrientation); startGame(); }).catch(() => startGame()); } else { window.addEventListener('deviceorientation', handleOrientation); startGame(); } };
    resize(); initStars(); gameLoop();
});