// state.js
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

    // Адаптивные размеры кирпичей
    currentBrickWidth: 60,
    currentBrickPadding: 8,
    brickHeight: 25,
    brickOffsetTop: 110,

    // Окружение
    stars: [],
    starSpeed: 2,
    starAngle: 0,
    flightDirX: 0,
    flightDirY: 0,
    rotationSpeed: 0,
    gridOffset: 0,

    // Настройки
    settings: {
        sound: true,
        auto: false,
        starDensity: 50,
        bgMode: 'grid',
        sens: 0.4,
        rank: 0,
        spinStrength: 0.15 // Сила кручения по умолчанию
    },

    wakeLock: null,
    canvas: null,
    ctx: null,
    gameOverScreen: null,
    statusText: null,
    scoreText: null,
    startPrompt: null,
    startBtn: null
};