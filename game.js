// Game Configuration
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Make canvas responsive for mobile
function resizeCanvas() {
    const maxWidth = Math.min(window.innerWidth - 40, 400);
    const scale = maxWidth / 400;
    canvas.style.width = maxWidth + 'px';
    canvas.style.height = (600 * scale) + 'px';
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game Variables
let bird = {
    x: 50,
    y: 300,
    width: 34,
    height: 24,
    velocity: 0,
    gravity: 0.25
};

let pipes = [];
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let gameRunning = false;
let gameOver = false;

const pipeWidth = 52;
const pipeGap = 150;
const pipeSpeed = 2;

// Audio Variables
let audioContext;
let analyser;
let microphone;
let dataArray;
let volumeLevel = 0;

// UI Elements
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const startScreen = document.getElementById('startScreen');
const gameContainer = document.getElementById('gameContainer');
const gameOverScreen = document.getElementById('gameOverScreen');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('highScore');
const finalScoreDisplay = document.getElementById('finalScore');
const volumeLevelBar = document.getElementById('volumeLevel');

highScoreDisplay.textContent = highScore;

// Initialize Audio Context and Microphone
async function initAudio() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        microphone.connect(analyser);

        return true;
    } catch (err) {
        console.error('Error accessing microphone:', err);
        alert('Microphone access denied. Please allow microphone access to play the game.');
        return false;
    }
}

// Get volume level from microphone
function getVolume() {
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
    }
    const average = sum / dataArray.length;

    // Normalize to 0-100
    volumeLevel = Math.min(100, (average / 128) * 100);

    // Update volume indicator
    volumeLevelBar.style.width = volumeLevel + '%';

    return volumeLevel;
}

// Create new pipe
function createPipe() {
    const minHeight = 50;
    const maxHeight = canvas.height - pipeGap - minHeight;
    const height = Math.random() * (maxHeight - minHeight) + minHeight;

    pipes.push({
        x: canvas.width,
        topHeight: height,
        bottomY: height + pipeGap,
        scored: false
    });
}

// Draw bird
function drawBird() {
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(bird.x + bird.width / 2, bird.y + bird.height / 2, bird.width / 2, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(bird.x + bird.width / 2 + 8, bird.y + bird.height / 2 - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#FF6347';
    ctx.beginPath();
    ctx.moveTo(bird.x + bird.width, bird.y + bird.height / 2);
    ctx.lineTo(bird.x + bird.width + 10, bird.y + bird.height / 2 - 5);
    ctx.lineTo(bird.x + bird.width + 10, bird.y + bird.height / 2 + 5);
    ctx.closePath();
    ctx.fill();
}

// Draw pipes
function drawPipes() {
    ctx.fillStyle = '#228B22';

    pipes.forEach(pipe => {
        // Top pipe
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
        // Top pipe cap
        ctx.fillRect(pipe.x - 2, pipe.topHeight - 20, pipeWidth + 4, 20);

        // Bottom pipe
        ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, canvas.height - pipe.bottomY);
        // Bottom pipe cap
        ctx.fillRect(pipe.x - 2, pipe.bottomY, pipeWidth + 4, 20);
    });
}

// Update game state
function update() {
    if (!gameRunning || gameOver) return;

    // Get current volume and map to bird lift
    const volume = getVolume();

    // Map volume to upward force
    // Higher volume = more lift (negative velocity)
    // Lower volume = bird falls (gravity)
    const liftForce = (volume / 100) * 8; // Adjust this multiplier for sensitivity

    bird.velocity += bird.gravity;
    bird.velocity -= liftForce * 0.3; // Apply lift based on volume

    // Limit maximum fall and rise speed
    bird.velocity = Math.max(-6, Math.min(6, bird.velocity));

    bird.y += bird.velocity;

    // Keep bird in bounds
    if (bird.y < 0) {
        bird.y = 0;
        bird.velocity = 0;
    }
    if (bird.y + bird.height > canvas.height) {
        endGame();
    }

    // Update pipes
    pipes.forEach(pipe => {
        pipe.x -= pipeSpeed;

        // Score when passing pipe
        if (!pipe.scored && pipe.x + pipeWidth < bird.x) {
            pipe.scored = true;
            score++;
            scoreDisplay.textContent = score;
        }
    });

    // Remove off-screen pipes
    pipes = pipes.filter(pipe => pipe.x + pipeWidth > 0);

    // Check collisions
    checkCollisions();
}

// Check for collisions
function checkCollisions() {
    pipes.forEach(pipe => {
        // Check if bird is in the horizontal range of the pipe
        if (bird.x + bird.width > pipe.x && bird.x < pipe.x + pipeWidth) {
            // Check if bird hit top or bottom pipe
            if (bird.y < pipe.topHeight || bird.y + bird.height > pipe.bottomY) {
                endGame();
            }
        }
    });
}

// Draw everything
function draw() {
    // Clear canvas
    ctx.fillStyle = '#70c5ce';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(100, 100, 30, 0, Math.PI * 2);
    ctx.arc(130, 100, 40, 0, Math.PI * 2);
    ctx.arc(160, 100, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(280, 150, 25, 0, Math.PI * 2);
    ctx.arc(305, 150, 35, 0, Math.PI * 2);
    ctx.arc(330, 150, 25, 0, Math.PI * 2);
    ctx.fill();

    drawPipes();
    drawBird();
}

// Game loop
let lastPipeTime = 0;
function gameLoop(timestamp) {
    update();
    draw();

    // Create new pipe every 2 seconds
    if (gameRunning && !gameOver && timestamp - lastPipeTime > 2000) {
        createPipe();
        lastPipeTime = timestamp;
    }

    requestAnimationFrame(gameLoop);
}

// Start game
async function startGame() {
    const audioReady = await initAudio();
    if (!audioReady) return;

    startScreen.style.display = 'none';
    gameContainer.style.display = 'block';
    gameOverScreen.style.display = 'none';

    // Reset game state
    bird.y = 300;
    bird.velocity = 0;
    pipes = [];
    score = 0;
    gameOver = false;
    scoreDisplay.textContent = '0';

    gameRunning = true;
    lastPipeTime = performance.now();
    gameLoop(performance.now());
}

// End game
function endGame() {
    if (gameOver) return;

    gameOver = true;
    gameRunning = false;

    // Update high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        highScoreDisplay.textContent = highScore;
    }

    finalScoreDisplay.textContent = score;
    gameOverScreen.style.display = 'block';
}

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Prevent scrolling on mobile
document.body.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });
