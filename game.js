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
    targetY: 300,
    rotation: 0
};

let pipes = [];
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let gameRunning = false;
let gameOver = false;
let frameCount = 0;

const pipeWidth = 52;
const pipeGap = 160;
const pipeSpeed = 2.5;

// Audio Variables
let audioContext;
let analyser;
let microphone;
let dataArray;
let volumeLevel = 0;
let smoothedVolume = 0;
let baselineVolume = 0;
let calibrationFrames = 0;

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
const calibrationMsg = document.getElementById('calibrationMsg');

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

    // Calibrate baseline volume in first 60 frames (1 second)
    if (calibrationFrames < 60) {
        baselineVolume = (baselineVolume * calibrationFrames + average) / (calibrationFrames + 1);
        calibrationFrames++;

        // Hide calibration message after calibration
        if (calibrationFrames === 60) {
            calibrationMsg.style.display = 'none';
        }
    }

    // Subtract baseline and normalize
    const adjustedAverage = Math.max(0, average - baselineVolume);
    volumeLevel = Math.min(100, (adjustedAverage / 100) * 100);

    // Smooth volume changes for more natural control
    smoothedVolume = smoothedVolume * 0.7 + volumeLevel * 0.3;

    // Update volume indicator
    volumeLevelBar.style.width = smoothedVolume + '%';

    return smoothedVolume;
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

// Draw bird with animation
function drawBird() {
    ctx.save();

    // Translate to bird center for rotation
    const centerX = bird.x + bird.width / 2;
    const centerY = bird.y + bird.height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((bird.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    // Bird body with gradient
    const gradient = ctx.createRadialGradient(centerX, centerY - 3, 2, centerX, centerY, bird.width / 2);
    gradient.addColorStop(0, '#FFE55C');
    gradient.addColorStop(1, '#FFD700');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, bird.width / 2, 0, Math.PI * 2);
    ctx.fill();

    // Animated wing flapping
    const wingAngle = Math.sin(frameCount * 0.3) * 0.3;

    // Wing
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.ellipse(centerX - 5, centerY + 5, 12, 8, wingAngle, 0, Math.PI * 2);
    ctx.fill();

    // Eye white
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(centerX + 8, centerY - 5, 5, 0, Math.PI * 2);
    ctx.fill();

    // Eye pupil
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(centerX + 10, centerY - 5, 3, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(centerX + 11, centerY - 6, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#FF8C00';
    ctx.beginPath();
    ctx.moveTo(centerX + 14, centerY);
    ctx.lineTo(centerX + 24, centerY - 3);
    ctx.lineTo(centerX + 24, centerY + 3);
    ctx.closePath();
    ctx.fill();

    // Beak highlight
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.moveTo(centerX + 14, centerY - 1);
    ctx.lineTo(centerX + 20, centerY - 2);
    ctx.lineTo(centerX + 20, centerY);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

// Draw pipes with gradients
function drawPipes() {
    pipes.forEach(pipe => {
        // Pipe gradient
        const pipeGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
        pipeGradient.addColorStop(0, '#2d8b3e');
        pipeGradient.addColorStop(0.5, '#3ea852');
        pipeGradient.addColorStop(1, '#2d8b3e');

        // Top pipe body
        ctx.fillStyle = pipeGradient;
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);

        // Top pipe cap with darker gradient
        const capGradient = ctx.createLinearGradient(pipe.x - 2, 0, pipe.x + pipeWidth + 2, 0);
        capGradient.addColorStop(0, '#1f5f2b');
        capGradient.addColorStop(0.5, '#2d8b3e');
        capGradient.addColorStop(1, '#1f5f2b');
        ctx.fillStyle = capGradient;
        ctx.fillRect(pipe.x - 3, pipe.topHeight - 25, pipeWidth + 6, 25);

        // Pipe border/highlight
        ctx.strokeStyle = '#1f5f2b';
        ctx.lineWidth = 2;
        ctx.strokeRect(pipe.x, 0, pipeWidth, pipe.topHeight);

        // Bottom pipe body
        ctx.fillStyle = pipeGradient;
        ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, canvas.height - pipe.bottomY);

        // Bottom pipe cap
        ctx.fillStyle = capGradient;
        ctx.fillRect(pipe.x - 3, pipe.bottomY, pipeWidth + 6, 25);

        // Bottom pipe border
        ctx.strokeStyle = '#1f5f2b';
        ctx.lineWidth = 2;
        ctx.strokeRect(pipe.x, pipe.bottomY, pipeWidth, canvas.height - pipe.bottomY);
    });
}

// Update game state
function update() {
    if (!gameRunning || gameOver) return;

    frameCount++;

    // Get current volume and map directly to target height
    const volume = getVolume();

    // Map volume to target Y position (0-100 volume -> canvas height range)
    // Higher volume = lower Y (top of screen)
    // Lower volume = higher Y (bottom of screen)
    const minY = 50; // Don't go too close to top
    const maxY = canvas.height - 100; // Don't go too close to bottom

    // Inverse mapping: 0 volume = bottom, 100 volume = top
    bird.targetY = maxY - (volume / 100) * (maxY - minY);

    // Smoothly move bird towards target Y using spring-like physics
    const diff = bird.targetY - bird.y;
    const springStrength = 0.15; // How quickly bird responds to volume changes
    const damping = 0.8; // Smooth out oscillations

    bird.velocity = bird.velocity * damping + diff * springStrength;

    // Limit velocity for safety
    bird.velocity = Math.max(-8, Math.min(8, bird.velocity));

    bird.y += bird.velocity;

    // Calculate rotation based on velocity
    bird.rotation = Math.max(-30, Math.min(30, bird.velocity * 3));

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

// Draw animated clouds
function drawCloud(x, y, scale) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x, y, 25 * scale, 0, Math.PI * 2);
    ctx.arc(x + 25 * scale, y, 30 * scale, 0, Math.PI * 2);
    ctx.arc(x + 50 * scale, y, 25 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

// Draw everything
function draw() {
    // Sky gradient background
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(0.7, '#98D8E8');
    skyGradient.addColorStop(1, '#B0E2F0');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Animated clouds moving slowly
    const cloudOffset = (frameCount * 0.2) % canvas.width;
    drawCloud(50 - cloudOffset * 0.3, 80, 0.8);
    drawCloud(250 - cloudOffset * 0.5, 120, 1);
    drawCloud(380 - cloudOffset * 0.4, 90, 0.9);
    drawCloud(-100 + canvas.width - cloudOffset * 0.3, 150, 0.85);

    // Ground
    ctx.fillStyle = '#8BC34A';
    ctx.fillRect(0, canvas.height - 30, canvas.width, 30);

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, canvas.height - 30, canvas.width, 5);

    drawPipes();
    drawBird();

    // Draw score on canvas
    ctx.fillStyle = '#FFF';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.strokeText(score, canvas.width / 2, 50);
    ctx.fillText(score, canvas.width / 2, 50);
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
    calibrationMsg.style.display = 'block';

    // Reset game state
    bird.y = 300;
    bird.velocity = 0;
    bird.rotation = 0;
    bird.targetY = 300;
    pipes = [];
    score = 0;
    gameOver = false;
    frameCount = 0;
    calibrationFrames = 0;
    baselineVolume = 0;
    smoothedVolume = 0;
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
