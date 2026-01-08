// main.js — Точка входа и управление жизненным циклом
import { state } from './state.js';
import { initAudio, playNaturalSound } from './audio.js';
import { loadSettings, saveSettings } from './storage.js';
import { initStars, changeFlightCourse, drawAll } from './renderer.js';
import { update, initBricks, spawnBall, updatePaddleSize } from './physics.js';
import { setupEventListeners, resize } from './input.js';

// --- СИСТЕМНЫЕ (WAKE LOCK) ---
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            state.wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) {}
}

// Автоматическое восстановление Wake Lock при возврате на вкладку
document.addEventListener('visibilitychange', async () => {
    if (state.wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});

// --- УПРАВЛЕНИЕ СОСТОЯНИЕМ ---
function startGame() {
    initAudio();
    requestWakeLock();
    state.gameStarted = true;
    state.isGameOver = false;
    
    if (state.gameOverScreen) state.gameOverScreen.style.display = "none";
    if (state.startPrompt) state.startPrompt.style.display = "none";
    
    state.score = 0;
    state.level = 1;
    state.balls = [];
    state.powerUps = [];
    state.particles = [];
    state.floatingTexts = [];
    
    initBricks();
    spawnBall();
}

function endGame() {
    state.isGameOver = true;
    if (state.gameOverScreen) state.gameOverScreen.style.display = "block";
    if (state.statusText) state.statusText.textContent = "КОНЕЦ ИГРЫ";
    if (state.scoreText) state.scoreText.textContent = "Ваш счёт: " + state.score;
}

// Экспортируем в window для доступа из HTML (onclick="resetGame()")
window.resetGame = () => {
    startGame();
};

// --- ИГРОВОЙ ЦИКЛ ---
function gameLoop() {
    try {
        state.ctx.save();
        // Эффект тряски экрана
        if (state.shakeIntensity > 0.1) {
            state.ctx.translate((Math.random() - 0.5) * state.shakeIntensity, (Math.random() - 0.5) * state.shakeIntensity);
        }
        
        if (state.gameStarted && !state.isGameOver) {
            update();
            // Проверка на проигрыш (все шары улетели)
            if (state.balls.length === 0 && !state.isGameOver) {
                endGame();
            }
        }
        
        drawAll();
        state.ctx.restore();
    } catch (e) {
        console.error("Loop error:", e);
    }

    // Переход на новый уровень
    if (state.needsLevelUp) {
        state.needsLevelUp = false;
        state.level++;
        state.powerUps = [];
        state.particles = [];
        spawnBall();
        playNaturalSound('powerup');
    }

    state.animationId = requestAnimationFrame(gameLoop);
}

// --- ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ---
document.addEventListener("DOMContentLoaded", () => {
    // Привязка DOM элементов к state
    state.canvas = document.getElementById("gameCanvas");
    state.ctx = state.canvas.getContext("2d");
    state.gameOverScreen = document.getElementById("game-over");
    state.statusText = document.getElementById("status-text");
    state.scoreText = document.getElementById("score-text");
    state.startPrompt = document.getElementById("start-prompt");
    state.startBtn = document.getElementById("start-btn");

    loadSettings();
    setupEventListeners();

    // Настройка UI Настроек
    const settingsBtn = document.getElementById('settings-btn-icon');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');

    if (settingsBtn) settingsBtn.onclick = () => { settingsModal.style.display = 'block'; };
    if (closeSettingsBtn) closeSettingsBtn.onclick = () => { settingsModal.style.display = 'none'; };

    // Обработчики изменений в настройках
    document.getElementById('select-rank').onchange = (e) => { 
        state.settings.rank = parseInt(e.target.value); 
        updatePaddleSize();
        saveSettings(); 
    };
    document.getElementById('toggle-sound').onchange = (e) => { state.settings.sound = e.target.checked; saveSettings(); };
    document.getElementById('toggle-autoplay').onchange = (e) => { state.settings.auto = e.target.checked; saveSettings(); };
    document.getElementById('toggle-stars').onchange = (e) => { state.settings.stars = e.target.checked; saveSettings(); };
    document.getElementById('toggle-invert').onchange = (e) => { state.settings.invert = e.target.checked; saveSettings(); };
    document.getElementById('gyro-slider').oninput = (e) => { 
        state.settings.sens = parseFloat(e.target.value); 
        document.getElementById('gyro-value').textContent = state.settings.sens;
        saveSettings(); 
    };

    // Кнопка старта с запросом пермишенов (для iOS гироскопа)
    state.startBtn.onclick = () => {
        initAudio();
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') startGame();
                    else startGame(); // Все равно запускаем
                })
                .catch(() => startGame());
        } else {
            startGame();
        }
    };

    resize();
    initStars();
    setInterval(changeFlightCourse, 7000);
    gameLoop();
});
