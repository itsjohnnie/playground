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
});

// Helper function to convert to grayscale
function toGrayscale(r, g, b) {
    return r * 0.299 + g * 0.587 + b * 0.114;
}

// Helper function to set pixel
function setPixel(data, idx, value) {
    data[idx] = data[idx + 1] = data[idx + 2] = value;
}

// Helper function to get grayscale value at position
function getGray(data, width, x, y) {
    const idx = (y * width + x) * 4;
    return toGrayscale(data[idx], data[idx + 1], data[idx + 2]);
}

// Helper function to add error to pixel
function addError(data, width, height, x, y, error, factor) {
    if (x >= 0 && x < width && y >= 0 && y < height) {
        const idx = (y * width + x) * 4;
        const gray = toGrayscale(data[idx], data[idx + 1], data[idx + 2]);
        const newGray = Math.min(255, Math.max(0, gray + error * factor));
        setPixel(data, idx, newGray);
    }
}

// Floyd-Steinberg dithering
function floydSteinbergDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const gray = toGrayscale(data[idx], data[idx + 1], data[idx + 2]);
            const newGray = gray < threshold ? 0 : 255;
            const error = gray - newGray;

            setPixel(data, idx, newGray);

            addError(data, width, height, x + 1, y, error, 7/16);
            addError(data, width, height, x - 1, y + 1, error, 3/16);
            addError(data, width, height, x, y + 1, error, 5/16);
            addError(data, width, height, x + 1, y + 1, error, 1/16);
        }
    }

    return imageData;
}

// Atkinson dithering
function atkinsonDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const gray = toGrayscale(data[idx], data[idx + 1], data[idx + 2]);
            const newGray = gray < threshold ? 0 : 255;
            const error = (gray - newGray) / 8;

            setPixel(data, idx, newGray);

            addError(data, width, height, x + 1, y, error, 1);
            addError(data, width, height, x + 2, y, error, 1);
            addError(data, width, height, x - 1, y + 1, error, 1);
            addError(data, width, height, x, y + 1, error, 1);
            addError(data, width, height, x + 1, y + 1, error, 1);
            addError(data, width, height, x, y + 2, error, 1);
        }
    }

    return imageData;
}

// Ordered (Bayer) dithering
function orderedDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // 8x8 Bayer matrix
    const bayerMatrix = [
        [0, 32, 8, 40, 2, 34, 10, 42],
        [48, 16, 56, 24, 50, 18, 58, 26],
        [12, 44, 4, 36, 14, 46, 6, 38],
        [60, 28, 52, 20, 62, 30, 54, 22],
        [3, 35, 11, 43, 1, 33, 9, 41],
        [51, 19, 59, 27, 49, 17, 57, 25],
        [15, 47, 7, 39, 13, 45, 5, 37],
        [63, 31, 55, 23, 61, 29, 53, 21]
    ];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const gray = toGrayscale(data[idx], data[idx + 1], data[idx + 2]);
            const bayerValue = bayerMatrix[y % 8][x % 8];
            const scaledThreshold = threshold + (bayerValue - 32) * 2;
            const newGray = gray < scaledThreshold ? 0 : 255;
            setPixel(data, idx, newGray);
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
            const randomThreshold = threshold + (Math.random() - 0.5) * 100;
            const newGray = gray < randomThreshold ? 0 : 255;
            setPixel(data, idx, newGray);
        }
    }

    return imageData;
}

// Stucki dithering
function stuckiDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const gray = toGrayscale(data[idx], data[idx + 1], data[idx + 2]);
            const newGray = gray < threshold ? 0 : 255;
            const error = (gray - newGray) / 42;

            setPixel(data, idx, newGray);

            addError(data, width, height, x + 1, y, error, 8);
            addError(data, width, height, x + 2, y, error, 4);
            addError(data, width, height, x - 2, y + 1, error, 2);
            addError(data, width, height, x - 1, y + 1, error, 4);
            addError(data, width, height, x, y + 1, error, 8);
            addError(data, width, height, x + 1, y + 1, error, 4);
            addError(data, width, height, x + 2, y + 1, error, 2);
            addError(data, width, height, x - 2, y + 2, error, 1);
            addError(data, width, height, x - 1, y + 2, error, 2);
            addError(data, width, height, x, y + 2, error, 4);
            addError(data, width, height, x + 1, y + 2, error, 2);
            addError(data, width, height, x + 2, y + 2, error, 1);
        }
    }

    return imageData;
}

// Jarvis-Judice-Ninke dithering
function jarvisDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const gray = toGrayscale(data[idx], data[idx + 1], data[idx + 2]);
            const newGray = gray < threshold ? 0 : 255;
            const error = (gray - newGray) / 48;

            setPixel(data, idx, newGray);

            addError(data, width, height, x + 1, y, error, 7);
            addError(data, width, height, x + 2, y, error, 5);
            addError(data, width, height, x - 2, y + 1, error, 3);
            addError(data, width, height, x - 1, y + 1, error, 5);
            addError(data, width, height, x, y + 1, error, 7);
            addError(data, width, height, x + 1, y + 1, error, 5);
            addError(data, width, height, x + 2, y + 1, error, 3);
            addError(data, width, height, x - 2, y + 2, error, 1);
            addError(data, width, height, x - 1, y + 2, error, 3);
            addError(data, width, height, x, y + 2, error, 5);
            addError(data, width, height, x + 1, y + 2, error, 3);
            addError(data, width, height, x + 2, y + 2, error, 1);
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
        case 'stucki':
            return stuckiDither(imageData);
        case 'jarvis':
            return jarvisDither(imageData);
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
