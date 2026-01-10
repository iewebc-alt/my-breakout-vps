// state.js — Единственный источник истины
export const state = {
    score: 0,
    level: 1,
    isGameOver: true,
    gameStarted: false,
    needsLevelUp: false,

    paddleHeight: 18,
    paddleWidth: 100,
    targetPaddleWidth: 100,
    paddleX: 0,
    paddleVelocity: 0,
    paddleBottomMargin: 45,
    paddleTimeout: null,
    paddleBonusTime: 0,

    balls: [],
    particles: [],
    bricks: [],
    powerUps: [],
    floatingTexts: [],

    // Адаптивность кирпичей
    currentBrickWidth: 60,
    currentBrickPadding: 8,
    brickHeight: 25,
    brickOffsetTop: 110,

    // Окружение и Hyperdrive
    stars: [],
    starSpeed: 2,
    starAngle: 0,
    flightDirX: 0,
    flightDirY: 0,
    rotationSpeed: 0,
    gridOffset: 0,
    
    // ИСТОРИЯ ДЛЯ АНТИ-СТИКА (Обязательная инициализация Map)
    ballPosHistory: new Map(), 

    settings: {
        sound: true,
        auto: false,
        starDensity: 50,
        bgMode: 'warp',
        sens: 0.4,
        rank: 0,
        spinStrength: 0.15
    },

    wakeLock: null,
    canvas: null,
    ctx: null,
    startPrompt: null,
    gameOverScreen: null,
    statusText: null,
    scoreText: null,
    startBtn: null
};
