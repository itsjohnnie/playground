const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const thresholdSlider = document.getElementById('threshold');
const thresholdValue = document.getElementById('thresholdValue');
const ditherSelect = document.getElementById('ditherAlgorithm');
const errorDiv = document.getElementById('error');

let stream = null;
let animationId = null;
let threshold = 128;
let ditherAlgorithm = 'floyd-steinberg';

// Update threshold value display
thresholdSlider.addEventListener('input', (e) => {
    threshold = parseInt(e.target.value);
    thresholdValue.textContent = threshold;
});

// Update dither algorithm
ditherSelect.addEventListener('change', (e) => {
    ditherAlgorithm = e.target.value;
    console.log('Algorithm changed to:', ditherAlgorithm);
});

// Helper function to convert to grayscale
function toGrayscale(r, g, b) {
    return r * 0.299 + g * 0.587 + b * 0.114;
}

// Simple threshold dithering (no error diffusion)
function simpleDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    for (let i = 0; i < data.length; i += 4) {
        const gray = toGrayscale(data[i], data[i + 1], data[i + 2]);
        const newGray = gray < threshold ? 0 : 255;
        data[i] = data[i + 1] = data[i + 2] = newGray;
    }

    return imageData;
}

// Floyd-Steinberg dithering
function floydSteinbergDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Create a copy to read from while modifying original
    const gray = new Float32Array(width * height);

    // Convert to grayscale
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            gray[y * width + x] = toGrayscale(data[idx], data[idx + 1], data[idx + 2]);
        }
    }

    // Apply dithering
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const oldPixel = gray[idx];
            const newPixel = oldPixel < threshold ? 0 : 255;
            const error = oldPixel - newPixel;

            // Set pixel
            const dataIdx = idx * 4;
            data[dataIdx] = data[dataIdx + 1] = data[dataIdx + 2] = newPixel;

            // Distribute error
            if (x + 1 < width) gray[idx + 1] += error * 7/16;
            if (y + 1 < height) {
                if (x > 0) gray[idx + width - 1] += error * 3/16;
                gray[idx + width] += error * 5/16;
                if (x + 1 < width) gray[idx + width + 1] += error * 1/16;
            }
        }
    }

    return imageData;
}

// Atkinson dithering
function atkinsonDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    const gray = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            gray[y * width + x] = toGrayscale(data[idx], data[idx + 1], data[idx + 2]);
        }
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const oldPixel = gray[idx];
            const newPixel = oldPixel < threshold ? 0 : 255;
            const error = (oldPixel - newPixel) / 8;

            const dataIdx = idx * 4;
            data[dataIdx] = data[dataIdx + 1] = data[dataIdx + 2] = newPixel;

            // Atkinson dithering pattern
            if (x + 1 < width) gray[idx + 1] += error;
            if (x + 2 < width) gray[idx + 2] += error;
            if (y + 1 < height) {
                if (x > 0) gray[idx + width - 1] += error;
                gray[idx + width] += error;
                if (x + 1 < width) gray[idx + width + 1] += error;
            }
            if (y + 2 < height) {
                gray[idx + width * 2] += error;
            }
        }
    }

    return imageData;
}

// Ordered (Bayer) dithering
function orderedDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // 8x8 Bayer matrix (normalized to 0-64)
    const bayerMatrix = [
        [ 0, 48, 12, 60,  3, 51, 15, 63],
        [32, 16, 44, 28, 35, 19, 47, 31],
        [ 8, 56,  4, 52, 11, 59,  7, 55],
        [40, 24, 36, 20, 43, 27, 39, 23],
        [ 2, 50, 14, 62,  1, 49, 13, 61],
        [34, 18, 46, 30, 33, 17, 45, 29],
        [10, 58,  6, 54,  9, 57,  5, 53],
        [42, 26, 38, 22, 41, 25, 37, 21]
    ];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const gray = toGrayscale(data[idx], data[idx + 1], data[idx + 2]);

            // Get Bayer threshold
            const bayerValue = bayerMatrix[y % 8][x % 8];
            const bayerThreshold = (bayerValue / 64) * 255;

            // Adjust threshold based on Bayer matrix
            const adjustedThreshold = threshold + (bayerThreshold - 128) * 0.5;
            const newGray = gray < adjustedThreshold ? 0 : 255;

            data[idx] = data[idx + 1] = data[idx + 2] = newGray;
        }
    }

    return imageData;
}

// Random threshold dithering
function randomDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const gray = toGrayscale(data[idx], data[idx + 1], data[idx + 2]);

            // Add random noise to threshold
            const randomThreshold = threshold + (Math.random() - 0.5) * 80;
            const newGray = gray < randomThreshold ? 0 : 255;

            data[idx] = data[idx + 1] = data[idx + 2] = newGray;
        }
    }

    return imageData;
}

// Apply selected dithering algorithm
function applyDithering(imageData) {
    switch (ditherAlgorithm) {
        case 'floyd-steinberg':
            return floydSteinbergDither(imageData);
        case 'atkinson':
            return atkinsonDither(imageData);
        case 'ordered':
            return orderedDither(imageData);
        case 'random':
            return randomDither(imageData);
        case 'simple':
            return simpleDither(imageData);
        default:
            return floydSteinbergDither(imageData);
    }
}

// Process video frame
function processFrame() {
    if (!stream) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Apply selected dithering
    const ditheredData = applyDithering(imageData);

    // Put processed image back on canvas
    ctx.putImageData(ditheredData, 0, 0);

    // Continue processing
    animationId = requestAnimationFrame(processFrame);
}

// Start camera
async function startCamera() {
    try {
        errorDiv.textContent = '';

        // Request camera access
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });

        video.srcObject = stream;

        // Wait for video metadata to load
        await new Promise((resolve) => {
            video.onloadedmetadata = resolve;
        });

        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Hide video, show canvas
        video.style.display = 'none';
        canvas.style.display = 'block';

        // Start processing frames
        processFrame();

        // Update button states
        startBtn.textContent = 'Stop Camera';
        captureBtn.disabled = false;

    } catch (err) {
        console.error('Error accessing camera:', err);
        errorDiv.textContent = `Error: ${err.message}. Please allow camera access.`;
    }
}

// Stop camera
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }

    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    video.style.display = 'block';
    canvas.style.display = 'none';

    startBtn.textContent = 'Start Camera';
    captureBtn.disabled = true;
}

// Capture photo
function capturePhoto() {
    const link = document.createElement('a');
    link.download = `dithered-${ditherAlgorithm}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Event listeners
startBtn.addEventListener('click', () => {
    if (stream) {
        stopCamera();
    } else {
        startCamera();
    }
});

captureBtn.addEventListener('click', capturePhoto);
