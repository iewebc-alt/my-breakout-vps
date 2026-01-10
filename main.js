// main.js — FINAL STABLE
import { state } from './state.js';
import { initAudio, playNaturalSound } from './audio.js';
import { loadSettings, saveSettings } from './storage.js';
import { initStars, changeFlightCourse, drawAll } from './renderer.js';
import { update, initBricks, spawnBall, updatePaddleSize } from './physics.js';
import { setupEventListeners, resize } from './input.js';

async function requestWakeLock() {
    if (state.wakeLock) return;
    try {
        if ('wakeLock' in navigator) {
            state.wakeLock = await navigator.wakeLock.request('screen');
            state.wakeLock.addEventListener('release', () => { state.wakeLock = null; });
        }
    } catch (err) {}
}

// Wake Lock: Перезапрос каждые 20 секунд
setInterval(() => {
    if (state.gameStarted && !state.isGameOver) requestWakeLock();
}, 20000);

function startGame() {
    initAudio();
    requestWakeLock();
    state.gameStarted = true; state.isGameOver = false;
    state.score = 0; state.level = 1;
    state.balls = []; state.powerUps = [];
    state.startPrompt.style.display = "none";
    state.gameOverScreen.style.display = "none";
    updatePaddleSize(); 
    state.paddleWidth = state.targetPaddleWidth;
    initBricks(); spawnBall();
}

function endGame() {
    state.isGameOver = true;
    state.gameStarted = false;
    if (state.wakeLock) { state.wakeLock.release(); state.wakeLock = null; }
    if (state.gameOverScreen) {
        state.gameOverScreen.style.display = "flex";
        const scoreText = document.getElementById('score-text');
        if (scoreText) scoreText.textContent = "Ваш счёт: " + state.score;
    }
}

window.resetGame = () => startGame();

function gameLoop() {
    if (state.gameStarted && !state.isGameOver) {
        update();
        if (state.balls.length === 0) endGame();
    }
    drawAll();
    if (state.needsLevelUp) {
        state.needsLevelUp = false; state.level++;
        initBricks(); spawnBall(); playNaturalSound('powerup');
    }
    requestAnimationFrame(gameLoop);
}

document.addEventListener("DOMContentLoaded", () => {
    state.canvas = document.getElementById("gameCanvas");
    state.ctx = state.canvas.getContext("2d");
    state.startPrompt = document.getElementById("start-prompt");
    state.gameOverScreen = document.getElementById("game-over");
    state.startBtn = document.getElementById("start-btn");

    loadSettings();
    setupEventListeners();

    const settingsBtn = document.getElementById('settings-btn-icon');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings');

    if (settingsBtn) {
        settingsBtn.onclick = () => {
            const isHidden = settingsModal.style.display === 'none' || settingsModal.style.display === '';
            settingsModal.style.display = isHidden ? 'block' : 'none';
        };
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.onclick = () => {
            settingsModal.style.display = 'none';
            saveSettings();
        };
    }

    // Настройки
    document.getElementById('select-rank').onchange = (e) => {
        state.settings.rank = parseInt(e.target.value);
        updatePaddleSize();
        saveSettings();
    };

    document.getElementById('stars-slider').oninput = (e) => {
        state.settings.starDensity = parseInt(e.target.value);
        document.getElementById('stars-value').textContent = e.target.value;
        initStars();
        saveSettings();
    };

    document.getElementById('gyro-slider').oninput = (e) => {
        state.settings.sens = parseFloat(e.target.value);
        document.getElementById('gyro-value').textContent = e.target.value;
        saveSettings();
    };

    document.getElementById('spin-slider').oninput = (e) => {
        state.settings.spinStrength = parseFloat(e.target.value);
        document.getElementById('spin-value').textContent = e.target.value;
        saveSettings();
    };

    document.getElementById('select-bg').onchange = (e) => {
        state.settings.bgMode = e.target.value;
        saveSettings();
    };

    document.getElementById('toggle-sound').onchange = (e) => { state.settings.sound = e.target.checked; saveSettings(); };
    document.getElementById('toggle-autoplay').onchange = (e) => { state.settings.auto = e.target.checked; saveSettings(); };

    // ГИРОСКОП FIX: Запрос прав при нажатии кнопки
    state.startBtn.onclick = () => {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        console.log("Gyroscope access granted");
                    }
                    startGame();
                })
                .catch(e => {
                    console.error(e);
                    startGame();
                });
        } else {
            startGame();
        }
    };

    resize(); initStars(); setInterval(changeFlightCourse, 7000); gameLoop();
});