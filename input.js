// input.js — Обработчики событий и управление
import { state } from './state.js';
import { updatePaddleSize, keepPaddleInBounds, initBricks } from './physics.js';
import { initStars } from './renderer.js';
import { playNaturalSound, initAudio } from './audio.js';
import { saveSettings } from './storage.js';

export function resize() {
    if (!state.canvas) return;
    state.canvas.width = window.innerWidth;
    state.canvas.height = window.innerHeight;
    
    const isLand = state.canvas.width > state.canvas.height;
    state.brickHeight = isLand ? 18 : 25;
    state.brickOffsetTop = isLand ? 60 : 110;
    
    updatePaddleSize();
    state.paddleWidth = state.targetPaddleWidth;
    state.paddleBottomMargin = isLand ? 25 : 45;
    
    keepPaddleInBounds();
    initStars();
    
    if (state.gameStarted && !state.isGameOver) {
        initBricks();
    }
}

export function handleOrientation(e) {
    if (!state.gameStarted || state.isGameOver || state.settings.auto || state.isUserTouching || state.settings.sens === 0) return;
    
    // Учитываем ориентацию экрана
    let tilt = (window.orientation === 90 || window.orientation === -90) ? e.beta : e.gamma;
    let dir = state.settings.invert ? 1 : -1;
    
    if (tilt !== null && Math.abs(tilt) > 1.5) {
        let move = tilt * dir * state.settings.sens;
        state.paddleX += move;
        state.paddleVelocity = move;
    }
}

export function handleSecretToggle() {
    state.settings.auto = !state.settings.auto;
    const autoEl = document.getElementById('toggle-autoplay');
    if (autoEl) autoEl.checked = state.settings.auto;
    saveSettings();
    playNaturalSound('powerup');
}

export function setupEventListeners() {
    // Клик/Тап для активации аудио и секретного автопилота
    state.canvas.addEventListener("pointerdown", e => {
        if (e.clientX > state.canvas.width * 0.8) {
            const now = Date.now();
            if (now - state.lastLClickTime < 500) state.lClickCounter++;
            else state.lClickCounter = 1;
            state.lastLClickTime = now;
            
            if (state.lClickCounter >= 3) {
                handleSecretToggle();
                state.lClickCounter = 0;
            }
        } else {
            state.isUserTouching = true;
            initAudio(); // Важно для разблокировки звука в браузерах
        }
    });

    state.canvas.addEventListener("pointerup", () => {
        state.isUserTouching = false;
        state.paddleVelocity = 0;
    });

    // Движение пальцем (Touch)
    state.canvas.addEventListener("touchmove", e => {
        if (state.gameStarted) {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = state.canvas.getBoundingClientRect();
            const newX = (touch.clientX - rect.left) - state.paddleWidth / 2;
            state.paddleVelocity = newX - state.paddleX;
            state.paddleX = newX;
        }
    }, { passive: false });

    // Движение мышью
    window.addEventListener("mousemove", e => {
        if (state.gameStarted && !state.settings.auto && !state.isUserTouching) {
            const rect = state.canvas.getBoundingClientRect();
            const newX = (e.clientX - rect.left) - state.paddleWidth / 2;
            state.paddleVelocity = newX - state.paddleX;
            state.paddleX = newX;
        }
    });

    // Клавиатура (стрелки)
    window.addEventListener("keydown", e => {
        if (e.key === "ArrowRight") state.rightPressed = true;
        if (e.key === "ArrowLeft") state.leftPressed = true;
    });
    window.addEventListener("keyup", e => {
        if (e.key === "ArrowRight") state.rightPressed = false;
        if (e.key === "ArrowLeft") state.leftPressed = false;
    });

    window.addEventListener("resize", resize);
    window.addEventListener("deviceorientation", handleOrientation);
}
