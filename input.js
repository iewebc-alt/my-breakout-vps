// input.js — Управление и система приоритетов
import { state } from './state.js';
import { updatePaddleSize, keepPaddleInBounds, initBricks } from './physics.js';
import { initStars } from './renderer.js';
import { saveSettings } from './storage.js';
import { playNaturalSound, initAudio } from './audio.js';

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
    if (state.gameStarted && !state.isGameOver) initBricks();
}

export function handleOrientation(e) {
    const { settings, gameStarted, isGameOver, isUserTouching } = state;
    // ПРИОРИТЕТ: Если пользователь касается экрана, гироскоп игнорируется
    if (!gameStarted || isGameOver || settings.auto || isUserTouching || settings.sens === 0) return;

    let tilt = (window.orientation === 90 || window.orientation === -90) ? e.beta : e.gamma;
    if (tilt !== null && Math.abs(tilt) > 1.5) {
        let move = tilt * settings.sens * 2; 
        state.paddleX += move;
        state.paddleVelocity = move;
        keepPaddleInBounds();
    }
}

export function setupEventListeners() {
    // Касание (Touch/Pointer) — Высший приоритет
    state.canvas.addEventListener("pointerdown", e => {
        state.isUserTouching = true;
        initAudio();
    });

    const endTouch = () => {
        state.isUserTouching = false;
        state.paddleVelocity = 0;
    };
    state.canvas.addEventListener("pointerup", endTouch);
    state.canvas.addEventListener("pointercancel", endTouch);

    state.canvas.addEventListener("touchmove", e => {
        if (state.gameStarted) {
            e.preventDefault();
            state.isUserTouching = true; // Подтверждаем приоритет
            const touch = e.touches[0];
            const rect = state.canvas.getBoundingClientRect();
            const newX = (touch.clientX - rect.left) - state.paddleWidth / 2;
            state.paddleVelocity = newX - state.paddleX;
            state.paddleX = newX;
            keepPaddleInBounds();
        }
    }, { passive: false });

    window.addEventListener("mousemove", e => {
        if (state.gameStarted && !state.settings.auto && !state.isUserTouching) {
            const rect = state.canvas.getBoundingClientRect();
            const newX = (e.clientX - rect.left) - state.paddleWidth / 2;
            state.paddleVelocity = newX - state.paddleX;
            state.paddleX = newX;
            keepPaddleInBounds();
        }
    });

    window.addEventListener("resize", resize);
    window.addEventListener("deviceorientation", handleOrientation);
}