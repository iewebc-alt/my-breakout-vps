// --- 1. КОНСТАНТЫ ---
let paddleBottomMargin = 45;
const maxAutoplaySpeed = 26;
const ballRadius = 8;
const brickWidth = 60;   
const brickPadding = 8;
const powerUpTypes = ['widerPaddle', 'extraBall', 'speedDown'];

// --- 2. СОСТОЯНИЕ ---
let score = 0, level = 1, activeBricks = 0;
let isGameOver = true, gameStarted = false, autoplay = false;
let paddleHeight = 15, paddleWidth = 100, paddleX = 0;
let rightPressed = false, leftPressed = false;
let balls = [], particles = [], bricks = [], powerUps = [], floatingTexts = [], bgStars = [];
let shakeIntensity = 0, brickHeight = 25, brickOffsetTop = 110;
let needsLevelUp = false;

// КОСМОС
let stars = [], starSpeed = 2, starAngle = 0;
let flightDirX = 0, flightDirY = 0, rotationSpeed = 0.0005;

// НАСТРОЙКИ
let isSoundOn = true;
let isGyroOn = true;
let isGyroInverted = false;
let gyroSensitivity = 1.3;

let lastClickTime = 0, clickCounter = 0, animationId = null;
let isUserTouching = false;

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

// --- 4. WAKE LOCK ---
let wakeLock = null;
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => { setTimeout(requestWakeLock, 1000); });
        }
    } catch (err) {}
}
setInterval(() => { if (gameStarted && !isGameOver && document.visibilityState === 'visible') requestWakeLock(); }, 15000);

// --- 5. ЗВУК ---
let audioCtx = null, noiseBuffer = null;

function initAudio() {
    if (audioCtx) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return;
    }
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        audioCtx = new AudioContext();
        
        try {
            const size = audioCtx.sampleRate * 0.1;
            noiseBuffer = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
            const data = noiseBuffer.getChannelData(0);
            for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
        } catch(e) { }

        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        g.gain.value = 0.001;
        osc.connect(g); g.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + 0.01);
    } catch(e) { console.warn("Audio init failed"); }
}

function playNaturalSound(type) {
    if (!isSoundOn) return;
    if (!audioCtx || !noiseBuffer) return;
    try {
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
    } catch(e) {}
}

// --- 6. КОСМОС (ДИНАМИКА) ---
function initStars() {
    stars = [];
    for(let i = 0; i < 200; i++) {
        stars.push({
            x: Math.random() * canvas.width - canvas.width/2,
            y: Math.random() * canvas.height - canvas.height/2,
            z: Math.random() * canvas.width
        });
    }
}

function changeFlightCourse() {
    if (!gameStarted || isGameOver) return;
    const targetX = (Math.random() - 0.5) * 15; 
    const targetY = (Math.random() - 0.5) * 15;
    const targetSpeed = 2 + Math.random() * 10;
    const targetRot = (Math.random() - 0.5) * 0.02;

    let step = 0;
    const interval = setInterval(() => {
        flightDirX += (targetX - flightDirX) * 0.05;
        flightDirY += (targetY - flightDirY) * 0.05;
        starSpeed += (targetSpeed - starSpeed) * 0.05;
        rotationSpeed += (targetRot - rotationSpeed) * 0.05;
        step++;
        if (step > 60) clearInterval(interval);
    }, 50);
}
setInterval(changeFlightCourse, 7000);

function updateAndDrawStars() {
    starAngle += rotationSpeed; 
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    stars.forEach(s => {
        s.z -= starSpeed;
        s.x += flightDirX; s.y += flightDirY;
        if (s.z <= 0) { s.z = canvas.width; s.x = Math.random() * canvas.width - cx; s.y = Math.random() * canvas.height - cy; }
        let k = 128.0 / s.z;
        let px = s.x * k + cx; let py = s.y * k + cy;
        let rotX = (px - cx) * Math.cos(starAngle) - (py - cy) * Math.sin(starAngle) + cx;
        let rotY = (px - cx) * Math.sin(starAngle) + (py - cy) * Math.cos(starAngle) + cy;
        if (rotX > 0 && rotX < canvas.width && rotY > 0 && rotY < canvas.height) {
            let size = (1 - s.z / canvas.width) * 3;
            let shade = parseInt((1 - s.z / canvas.width) * 255);
            ctx.fillStyle = "rgb(" + shade + "," + shade + "," + shade + ")";
            ctx.fillRect(rotX, rotY, size, size);
        }
    });
}

// --- 7. ВСПОМОГАТЕЛЬНЫЕ ---
function drawBallDigit(char, x, y, size, color) {
    const map = digitMaps[char]; if (!map) return;
    const step = size / 4;
    ctx.save(); ctx.fillStyle = color;
    for (let i = 0; i < map.length; i++) {
        if (map[i]) { ctx.beginPath(); ctx.arc(x + (i % 3) * step * 1.3, y + Math.floor(i / 3) * step * 1.3, step / 2, 0, 7); ctx.fill(); }
    }
    ctx.restore();
}

function drawBallString(str, x, y, size, color) {
    let curX = x; const s = str.toString();
    for (let i = 0; i < s.length; i++) { drawBallDigit(s[i], curX, y, size, color); curX += size * 1.15; }
}

function keepPaddleInBounds() {
    if (paddleX < 0) paddleX = 0;
    if (paddleX > canvas.width - paddleWidth) paddleX = canvas.width - paddleWidth;
}

function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const isLand = canvas.width > canvas.height;
    brickHeight = isLand ? 18 : 25; 
    brickOffsetTop = isLand ? 60 : 110;
    paddleWidth = Math.max(80, canvas.width > 600 ? 120 : canvas.width * 0.35);
    paddleBottomMargin = isLand ? 25 : 45;
    keepPaddleInBounds();
    initStars();
    if (gameStarted && !isGameOver) initBricks();
}

// --- 8. ГЕНЕРАТОР УРОВНЕЙ (АДАПТИВНЫЙ) ---
function initBricks() {
    bricks = []; activeBricks = 0;
    const brickColumnCount = Math.floor((canvas.width - 20) / (brickWidth + brickPadding));
    if (brickColumnCount <= 0) return; 

    const totalW = brickColumnCount * (brickWidth + brickPadding) - brickPadding;
    const offLeft = (canvas.width - totalW) / 2;
    
    // Адаптивная высота уровня
    const maxRows = Math.floor((canvas.height * 0.4) / (brickHeight + brickPadding));
    const rows = Math.min(maxRows, 6 + (level % 8)); 
    const type = level % 5; 

    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < rows; r++) {
            let isV = false;
            if (type === 0) isV = (c + r) % 2 === 0; 
            else if (type === 1) isV = r % 2 === 0; 
            else if (type === 2) isV = (c % 2 === 0 && r % 2 === 0) || (c % 2 !== 0 && r % 2 !== 0); 
            else if (type === 3) isV = Math.sin(c * 0.5 + r * 0.5) > 0; 
            else isV = Math.random() > 0.3; 

            if (isV) activeBricks++;
            bricks[c][r] = {
                x: c * (brickWidth + brickPadding) + offLeft, y: r * (brickHeight + brickPadding) + brickOffsetTop,
                status: isV ? 1 : 0, color: `hsl(${(r * 35 + level * 20 + c * 10) % 360}, 80%, 60%)`,
                powerUp: isV && Math.random() < 0.22 ? powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)] : null
            };
        }
    }
    if (activeBricks === 0) {
        bricks[0][0] = { x: offLeft, y: brickOffsetTop, status: 1, color: '#fff', powerUp: null };
        activeBricks = 1;
    }
}

function spawnBall(x, y, dx, dy) {
    if (balls.length > 15) return;
    let sDx = dx || (Math.random() - 0.5) * 8; if (Math.abs(sDx) < 2) sDx = sDx < 0 ? -3 : 3;
    balls.push({ x: x || canvas.width/2, y: y || canvas.height - 150, dx: sDx, dy: dy || -6, pX: null, off: 0 });
}

function predictLandingX(b) {
    let sX = b.x, sY = b.y, sDX = b.dx, sDY = b.dy;
    const pT = canvas.height - paddleHeight - paddleBottomMargin;
    for (let i = 0; i < 400; i++) {
        sX += sDX; sY += sDY;
        if (sX < ballRadius) { sX = ballRadius; sDX = Math.abs(sDX); }
        else if (sX > canvas.width - ballRadius) { sX = canvas.width - ballRadius; sDX = -Math.abs(sDX); }
        if (sY < ballRadius) sDY = Math.abs(sDY);
        if (sY >= pT && sDY > 0) return sX;
    }
    return sX;
}

// --- 9. ОБНОВЛЕНИЕ ---
function update() {
    if (isGameOver) return;
    const pY = canvas.height - paddleHeight - paddleBottomMargin;

    // ШАРЫ
    for (let i = balls.length - 1; i >= 0; i--) {
        let b = balls[i]; 
        if (isNaN(b.x) || isNaN(b.y)) { balls.splice(i, 1); continue; }

        let speed = Math.sqrt(b.dx*b.dx + b.dy*b.dy);
        let steps = (speed > ballRadius) ? 2 : 1;
        let stepDX = b.dx / steps;
        let stepDY = b.dy / steps;

        for (let s = 0; s < steps; s++) {
            b.x += stepDX; b.y += stepDY;
            if (Math.abs(b.dx) < 0.8) b.dx += (b.dx < 0 ? -0.5 : 0.5);

            if (b.x < ballRadius) { b.x = ballRadius; b.dx = Math.abs(b.dx); playNaturalSound('wall'); b.pX = null; }
            else if (b.x > canvas.width - ballRadius) { b.x = canvas.width - ballRadius; b.dx = -Math.abs(b.dx); playNaturalSound('wall'); b.pX = null; }
            
            if (b.y < ballRadius) { b.y = ballRadius; b.dy = Math.abs(b.dy); playNaturalSound('wall'); b.pX = null; }
            else if (b.y + ballRadius > pY) {
                if (b.x >= paddleX - ballRadius - 2 && b.x <= paddleX + paddleWidth + ballRadius + 2 && b.y < pY + paddleHeight) {
                    b.y = pY - ballRadius; b.dy = -Math.abs(b.dy);
                    b.dx = ((b.x - (paddleX + paddleWidth/2)) / (paddleWidth/2)) * 9;
                    playNaturalSound('paddle'); b.pX = null; b.off = (Math.random()-0.5)*paddleWidth*0.7;
                } else if (b.y > canvas.height + 20) {
                    balls.splice(i, 1);
                    if (balls.length === 0) { endGame(false); return; }
                    break;
                }
            }

            let hit = false;
            for (let c = 0; c < bricks.length; c++) {
                for (let r = 0; r < bricks[c].length; r++) {
                    let br = bricks[c][r];
                    if (br.status && b.x+ballRadius > br.x && b.x-ballRadius < br.x+brickWidth && b.y+ballRadius > br.y && b.y-ballRadius < br.y+brickHeight) {
                        br.status = 0; b.dy = -b.dy; score += 10; activeBricks--;
                        hit = true;
                        if (br.powerUp) shakeIntensity = 10; 
                        playNaturalSound('brick'); b.pX = null;
                        for (let k=0; k<6; k++) particles.push({ x: b.x, y: b.y, dx: (Math.random()-0.5)*8, dy: (Math.random()-0.5)*8, life: 1.0, color: br.color });
                        floatingTexts.push({ x: br.x+brickWidth/2, y: br.y, text: "+10", color: br.color, life: 1.0, size: 24 });
                        if (br.powerUp) powerUps.push({x: br.x+brickWidth/2, y: br.y, type: br.powerUp, dy: 3.2, radius: 11});
                        if (activeBricks <= 0) needsLevelUp = true;
                        break;
                    }
                }
                if (hit) break;
            }
        }
    }

    // БОНУСЫ
    for(let i=powerUps.length-1; i>=0; i--) {
        let p = powerUps[i]; 
        let prevY = p.y;
        p.x += (p.dx || 0); p.dx = (p.dx || 0) * 0.95; 
        p.y += p.dy;
        if (p.x < p.radius) { p.x = p.radius; p.dx = -p.dx; }
        if (p.x > canvas.width - p.radius) { p.x = canvas.width - p.radius; p.dx = -p.dx; }

        if (p.y + 11 >= pY && prevY + 11 <= pY + paddleHeight) {
            if (p.x + 11 >= paddleX && p.x - 11 <= paddleX + paddleWidth) {
                if (p.type === 'extraBall') spawnBall(p.x, pY - 10);
                else if (p.type === 'widerPaddle') { 
                    let orig = (canvas.width > 600 ? 120 : canvas.width * 0.35); 
                    paddleWidth *= 1.5; setTimeout(()=> { if(!isGameOver) paddleWidth = orig; }, 10000); 
                }
                powerUps.splice(i, 1); playNaturalSound('powerup');
                continue;
            }
        } 
        if (p.y > canvas.height) powerUps.splice(i, 1);
    }

    // ФИЗИКА
    let physicsEntities = [];
    balls.forEach(b => physicsEntities.push({x: b.x, y: b.y, r: ballRadius, ref: b, type: 'ball'}));
    powerUps.forEach(p => physicsEntities.push({x: p.x, y: p.y, r: p.radius, ref: p, type: 'powerup'}));

    for (let i = 0; i < physicsEntities.length; i++) {
        for (let j = i + 1; j < physicsEntities.length; j++) {
            let a = physicsEntities[i], b = physicsEntities[j];
            let dx = b.x - a.x, dy = b.y - a.y;
            let dist = Math.sqrt(dx*dx + dy*dy), minDist = a.r + b.r;
            if (dist < minDist && dist > 0) {
                let nx = dx / dist, ny = dy / dist, overlap = (minDist - dist) / 2;
                a.ref.x -= nx * overlap; a.ref.y -= ny * overlap;
                b.ref.x += nx * overlap; b.ref.y += ny * overlap;
                let impulse = 2.0; 
                if (a.type === 'ball') { a.ref.dx -= nx * impulse; a.ref.dy -= ny * impulse; } else { a.ref.dx = (a.ref.dx || 0) - nx * impulse * 2; }
                if (b.type === 'ball') { b.ref.dx += nx * impulse; b.ref.dy += ny * impulse; } else { b.ref.dx = (b.ref.dx || 0) + nx * impulse * 2; }
                if (a.type === 'ball' && b.type === 'ball') playNaturalSound('wall');
            }
        }
    }

    // АВТОПИЛОТ
    if (autoplay && balls.length && !isUserTouching) {
        let target = balls.reduce((p, c) => (c.dy > 0 && (!p || c.y > p.y) ? c : p), null);
        let tX = canvas.width / 2;
        if (target) {
            if (target.y > canvas.height * 0.45) {
                if (!target.pX) target.pX = predictLandingX(target);
                tX = target.pX + target.off;
            } else {
                let goodP = powerUps.filter(p => p.type !== 'speedDown');
                if (goodP.length > 0) tX = goodP.reduce((p, c) => (c.y > p.y ? c : p)).x;
                else tX = target.x;
            }
        }
        let diff = tX - paddleWidth/2 - paddleX;
        paddleX += Math.sign(diff) * Math.min(Math.abs(diff), maxAutoplaySpeed);
        keepPaddleInBounds();
    }

    if (rightPressed) paddleX += 10; if (leftPressed) paddleX -= 10;
    keepPaddleInBounds();

    particles.forEach(p => { p.x += p.dx; p.y += p.dy; p.life -= 0.02; }); particles = particles.filter(p => p.life > 0);
    floatingTexts.forEach(ft => { ft.y -= 1.5; ft.life -= 0.015; ft.size += 0.5; }); floatingTexts = floatingTexts.filter(ft => ft.life > 0);
    if (shakeIntensity > 0) shakeIntensity *= 0.9;

    if (needsLevelUp) {
        needsLevelUp = false; level++;
        changeFlightCourse(); 
        initBricks(); balls = []; spawnBall();
        playNaturalSound('powerup');
    }
}

// --- 10. ОТРИСОВКА ---
function drawAll() {
    if (!ctx) return;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    updateAndDrawStars();
    drawBallString("S", 25, 35, 12, "#fbbf24"); drawBallString(score, 55, 35, 16, "#fff");
    const lX = canvas.width - 110; drawBallString("L", lX, 35, 12, "#3b82f6"); drawBallString(level, lX + 28, 35, 16, "#fff");

    bricks.forEach(col => col.forEach(b => {
        if (b.status) {
            ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, brickWidth, brickHeight);
            ctx.fillStyle = "rgba(255,255,255,0.2)"; ctx.fillRect(b.x, b.y, brickWidth, 3);
            if (b.powerUp) { ctx.fillStyle = "#fff"; ctx.font = "bold 14px Arial"; ctx.textAlign = "center"; ctx.fillText("★", b.x + brickWidth/2, b.y + brickHeight/2 + 5); }
        }
    }));
    const pY = canvas.height - paddleHeight - paddleBottomMargin;
    ctx.save(); ctx.shadowBlur = 15; ctx.shadowColor = "#0072ff";
    const pG = ctx.createLinearGradient(paddleX, pY, paddleX, pY + paddleHeight);
    pG.addColorStop(0, "#3a8dff"); pG.addColorStop(1, "#0047ab");
    ctx.beginPath(); ctx.rect(paddleX, pY, paddleWidth, paddleHeight);
    ctx.fillStyle = pG; ctx.fill(); ctx.restore();
    balls.forEach(b => { ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = "#fff"; ctx.beginPath(); ctx.arc(b.x, b.y, ballRadius, 0, 7); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore(); });
    powerUps.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, 7);
        let color = p.type === 'extraBall' ? '#fbbf24' : p.type === 'widerPaddle' ? '#4caf50' : '#f43f5e';
        ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.stroke();
        ctx.fillStyle = "#000"; ctx.font = "bold 12px Arial"; ctx.textAlign = "center";
        ctx.fillText(p.type === 'extraBall' ? 'B' : p.type === 'widerPaddle' ? 'W' : 'S', p.x, p.y + 4);
    });
    particles.forEach(p => { ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 3, 3); });
    floatingTexts.forEach(ft => { ctx.globalAlpha = ft.life; ctx.fillStyle = ft.color; ctx.font = `bold ${Math.floor(ft.size)}px Arial`; ctx.textAlign = "center"; ctx.fillText(ft.text, ft.x, ft.y); });
    ctx.globalAlpha = 1;
}

function gameLoop() {
    if (isGameOver) return;
    try {
        ctx.save();
        if (shakeIntensity > 0.1) ctx.translate((Math.random()-0.5)*shakeIntensity, (Math.random()-0.5)*shakeIntensity);
        update(); drawAll(); ctx.restore();
    } catch(e) { console.error(e); }
    animationId = requestAnimationFrame(gameLoop);
}

// --- 11. НАСТРОЙКИ И ЗАПУСК ---
function loadSettings() {
    const savedSound = localStorage.getItem('breakout_sound');
    const savedAutoplay = localStorage.getItem('breakout_autoplay');
    const savedGyro = localStorage.getItem('breakout_gyro');
    const savedSens = localStorage.getItem('breakout_sensitivity');
    const savedInvert = localStorage.getItem('breakout_gyro_invert');

    if (savedSound !== null) isSoundOn = (savedSound === 'true');
    if (savedAutoplay !== null) autoplay = (savedAutoplay === 'true');
    if (savedGyro !== null) isGyroOn = (savedGyro === 'true');
    if (savedSens !== null) gyroSensitivity = parseFloat(savedSens);
    if (savedInvert !== null) isGyroInverted = (savedInvert === 'true');

    if(document.getElementById('toggle-sound')) document.getElementById('toggle-sound').checked = isSoundOn;
    if(document.getElementById('toggle-autoplay')) document.getElementById('toggle-autoplay').checked = autoplay;
    if(document.getElementById('toggle-gyro')) document.getElementById('toggle-gyro').checked = isGyroOn;
    if(document.getElementById('toggle-invert')) document.getElementById('toggle-invert').checked = isGyroInverted;
    if(document.getElementById('gyro-slider')) document.getElementById('gyro-slider').value = gyroSensitivity;
}

function saveSettings() {
    localStorage.setItem('breakout_sound', isSoundOn);
    localStorage.setItem('breakout_autoplay', autoplay);
    localStorage.setItem('breakout_gyro', isGyroOn);
    localStorage.setItem('breakout_sensitivity', gyroSensitivity);
    localStorage.setItem('breakout_gyro_invert', isGyroInverted);
}

function handleSecretToggle() {
    const now = Date.now();
    if (now - lastClickTime < 500) clickCounter++; else clickCounter = 1;
    lastClickTime = now;
    if (clickCounter >= 3) { 
        autoplay = !autoplay; 
        clickCounter = 0; 
        playNaturalSound('powerup');
        if(document.getElementById('toggle-autoplay')) document.getElementById('toggle-autoplay').checked = autoplay;
        saveSettings();
    }
}

function endGame(win) {
    isGameOver = true; 
    if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
    if(gameOverScreen) gameOverScreen.style.display = "block";
    if(statusText) statusText.textContent = win ? "ПОБЕДА!" : "КОНЕЦ ИГРЫ";
    if(scoreText) scoreText.textContent = "Ваш счёт: " + score;
}

function startGame() {
    initAudio(); 
    if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
    gameStarted = true; isGameOver = false;
    if(startPrompt) startPrompt.style.display = "none";
    if(gameOverScreen) gameOverScreen.style.display = "none";
    score = 0; level = 1; balls = []; powerUps = []; particles = []; floatingTexts = [];
    resize(); initBricks(); spawnBall(); 
    gameLoop();
}

window.resetGame = () => { startGame(); };

function handleOrientation(e) {
    if (!gameStarted || isGameOver || autoplay || !isGyroOn) return;
    if (isUserTouching) return;

    let tilt = (window.orientation === 90 || window.orientation === -90) ? e.beta : e.gamma;
    let direction = isGyroInverted ? 1 : -1;
    
    if (tilt !== null && Math.abs(tilt) > 1.5) { 
        paddleX += tilt * direction * gyroSensitivity; 
        keepPaddleInBounds(); 
    }
}

document.addEventListener("DOMContentLoaded", () => {
    canvas = document.getElementById("gameCanvas"); ctx = canvas.getContext("2d");
    gameOverScreen = document.getElementById("game-over"); 
    statusText = document.getElementById("status-text");
    scoreText = document.getElementById("score-text");
    startPrompt = document.getElementById("start-prompt"); startBtn = document.getElementById("start-btn");
    
    loadSettings();

    const settingsBtn = document.getElementById('settings-btn-icon');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');

    if(settingsBtn) settingsBtn.onclick = () => { settingsModal.style.display = 'block'; };
    if(closeSettingsBtn) closeSettingsBtn.onclick = () => { settingsModal.style.display = 'none'; };

    if(document.getElementById('toggle-sound')) document.getElementById('toggle-sound').onchange = (e) => { isSoundOn = e.target.checked; saveSettings(); };
    if(document.getElementById('toggle-autoplay')) document.getElementById('toggle-autoplay').onchange = (e) => { autoplay = e.target.checked; saveSettings(); };
    if(document.getElementById('toggle-gyro')) document.getElementById('toggle-gyro').onchange = (e) => { isGyroOn = e.target.checked; saveSettings(); };
    if(document.getElementById('toggle-invert')) document.getElementById('toggle-invert').onchange = (e) => { isGyroInverted = e.target.checked; saveSettings(); };
    if(document.getElementById('gyro-slider')) document.getElementById('gyro-slider').oninput = (e) => { gyroSensitivity = parseFloat(e.target.value); saveSettings(); };

    const unlock = () => { initAudio(); };
    window.addEventListener('touchstart', unlock, {once:true});
    window.addEventListener('click', unlock, {once:true});

    startBtn.onclick = () => {
        initAudio();
        requestWakeLock();
        if (isGyroOn && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission().then(state => {
                if (state === 'granted') window.addEventListener('deviceorientation', handleOrientation);
                startGame();
            }).catch(() => startGame());
        } else {
            if (isGyroOn) window.addEventListener('deviceorientation', handleOrientation);
            startGame();
        }
    };

    canvas.addEventListener("pointerdown", e => { 
        if (e.clientY < 100) {
            const now = Date.now();
            if (now - lastClickTime < 500) clickCounter++; else clickCounter = 1;
            lastClickTime = now;
            if (clickCounter >= 3) { handleSecretToggle(); clickCounter = 0; }
        } else isUserTouching = true;
    });
    canvas.addEventListener("pointerup", () => isUserTouching = false);
    
    canvas.addEventListener("touchmove", e => { 
        if (gameStarted && !autoplay) { 
            e.preventDefault(); 
            let touch = e.touches[0];
            let rect = canvas.getBoundingClientRect();
            paddleX = (touch.clientX - rect.left) - paddleWidth / 2;
            keepPaddleInBounds(); 
            isUserTouching = true; 
        } 
    }, {passive: false});

    window.addEventListener("keydown", e => { if (e.key.includes("Right")) rightPressed = true; if (e.key.includes("Left")) leftPressed = true; });
    window.addEventListener("keyup", e => { if (e.key.includes("Right")) rightPressed = false; if (e.key.includes("Left")) leftPressed = false; });
    window.addEventListener("mousemove", e => { if (gameStarted && !autoplay) { paddleX = e.clientX - paddleWidth / 2; keepPaddleInBounds(); } });
    
    window.addEventListener('resize', resize);
    resize();
});
