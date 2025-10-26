const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const startBtn = document.getElementById('startBtn');
const captureBtn = document.getElementById('captureBtn');
const thresholdSlider = document.getElementById('threshold');
const thresholdValue = document.getElementById('thresholdValue');
const errorDiv = document.getElementById('error');

let stream = null;
let animationId = null;
let threshold = 128;

// Update threshold value display
thresholdSlider.addEventListener('input', (e) => {
    threshold = parseInt(e.target.value);
    thresholdValue.textContent = threshold;
});

// Floyd-Steinberg dithering algorithm
function floydSteinbergDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Convert to grayscale and apply dithering
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;

            // Convert to grayscale
            const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;

            // Determine new pixel value (black or white)
            const newGray = gray < threshold ? 0 : 255;

            // Calculate quantization error
            const error = gray - newGray;

            // Set pixel to black or white
            data[idx] = data[idx + 1] = data[idx + 2] = newGray;

            // Distribute error to neighboring pixels (Floyd-Steinberg)
            if (x + 1 < width) {
                const rightIdx = (y * width + (x + 1)) * 4;
                const rightGray = data[rightIdx] * 0.299 + data[rightIdx + 1] * 0.587 + data[rightIdx + 2] * 0.114;
                const newRightGray = Math.min(255, Math.max(0, rightGray + error * 7/16));
                data[rightIdx] = data[rightIdx + 1] = data[rightIdx + 2] = newRightGray;
            }

            if (y + 1 < height) {
                if (x > 0) {
                    const bottomLeftIdx = ((y + 1) * width + (x - 1)) * 4;
                    const blGray = data[bottomLeftIdx] * 0.299 + data[bottomLeftIdx + 1] * 0.587 + data[bottomLeftIdx + 2] * 0.114;
                    const newBLGray = Math.min(255, Math.max(0, blGray + error * 3/16));
                    data[bottomLeftIdx] = data[bottomLeftIdx + 1] = data[bottomLeftIdx + 2] = newBLGray;
                }

                const bottomIdx = ((y + 1) * width + x) * 4;
                const bottomGray = data[bottomIdx] * 0.299 + data[bottomIdx + 1] * 0.587 + data[bottomIdx + 2] * 0.114;
                const newBottomGray = Math.min(255, Math.max(0, bottomGray + error * 5/16));
                data[bottomIdx] = data[bottomIdx + 1] = data[bottomIdx + 2] = newBottomGray;

                if (x + 1 < width) {
                    const bottomRightIdx = ((y + 1) * width + (x + 1)) * 4;
                    const brGray = data[bottomRightIdx] * 0.299 + data[bottomRightIdx + 1] * 0.587 + data[bottomRightIdx + 2] * 0.114;
                    const newBRGray = Math.min(255, Math.max(0, brGray + error * 1/16));
                    data[bottomRightIdx] = data[bottomRightIdx + 1] = data[bottomRightIdx + 2] = newBRGray;
                }
            }
        }
    }

    return imageData;
}

// Process video frame
function processFrame() {
    if (!stream) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Apply dithering
    const ditheredData = floydSteinbergDither(imageData);

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
                width: { ideal: 1280 },
                height: { ideal: 720 }
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
    link.download = `dithered-photo-${Date.now()}.png`;
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
