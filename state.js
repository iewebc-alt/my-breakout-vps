// state.js — Единственный источник истины (Single Source of Truth)

export const state = {
    // Основные параметры игры
    score: 0,
    level: 1,
    isGameOver: true,
    gameStarted: false,
    needsLevelUp: false,

    // Ракетка
    paddleHeight: 18,
    paddleWidth: 100,
    targetPaddleWidth: 100,
    paddleX: 0,
    paddleVelocity: 0,
    paddleBottomMargin: 45,
    paddleTimeout: null,
    
    // Управление
    rightPressed: false,
    leftPressed: false,
    isUserTouching: false,
    tiltSmooth: 0,

    // Игровые объекты
    balls: [],
    particles: [],
    bricks: [],
    powerUps: [],
    floatingTexts: [],

    // Эффекты и окружение
    shakeIntensity: 0,
    brickHeight: 25,
    brickOffsetTop: 110,
    stars: [],
    starSpeed: 2,
    starAngle: 0,
    flightDirX: 0,
    flightDirY: 0,
    rotationSpeed: 0,
    targetSpeed: 2,

    // Системные переменные
    lastClickTime: 0,
    clickCounter: 0,
    lastLClickTime: 0,
    lClickCounter: 0,
    animationId: null,
    wakeLock: null,

    // DOM Элементы (будут инициализированы в main.js)
    canvas: null,
    ctx: null,
    gameOverScreen: null,
    statusText: null,
    scoreText: null,
    startPrompt: null,
    startBtn: null,

    // Аудио контекст
    audioCtx: null,
    noiseBuffer: null,

    // Объект настроек
    settings: {
        sound: true,
        auto: false,
        stars: true,
        invert: true,
        sens: 0.4,
        rank: 0
    }
};
