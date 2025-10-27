// DOM Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const actionBtn = document.getElementById('actionBtn');
const settingsBtn = document.getElementById('settingsBtn');
const galleryBtn = document.getElementById('galleryBtn');
const lastPhotoThumb = document.getElementById('lastPhotoThumb');
const settingsPanel = document.getElementById('settingsPanel');
const galleryPanel = document.getElementById('galleryPanel');
const closeSettings = document.getElementById('closeSettings');
const closeGallery = document.getElementById('closeGallery');
const thresholdSlider = document.getElementById('threshold');
const thresholdValue = document.getElementById('thresholdValue');
const grainSlider = document.getElementById('grainSize');
const grainValue = document.getElementById('grainValue');
const ditherSelect = document.getElementById('ditherAlgorithm');
const galleryGrid = document.getElementById('galleryGrid');
const errorDiv = document.getElementById('error');

// State
let stream = null;
let animationId = null;
let threshold = 128;
let grainSize = 1;
let ditherAlgorithm = 'floyd-steinberg';
let cameraActive = false;

// LocalStorage for photos
const STORAGE_KEY = 'dithered_photos';

// Event Listeners
thresholdSlider.addEventListener('input', (e) => {
    threshold = parseInt(e.target.value);
    thresholdValue.textContent = threshold;
});

grainSlider.addEventListener('input', (e) => {
    grainSize = parseInt(e.target.value);
    grainValue.textContent = grainSize;
});

ditherSelect.addEventListener('change', (e) => {
    ditherAlgorithm = e.target.value;
});

actionBtn.addEventListener('click', handleAction);
settingsBtn.addEventListener('click', () => togglePanel(settingsPanel));
galleryBtn.addEventListener('click', () => {
    togglePanel(galleryPanel);
    loadGallery();
});
closeSettings.addEventListener('click', () => togglePanel(settingsPanel));
closeGallery.addEventListener('click', () => togglePanel(galleryPanel));

// Dual-purpose action button
async function handleAction() {
    if (!cameraActive) {
        await startCamera();
    } else {
        capturePhoto();
    }
}

// Toggle panels
function togglePanel(panel) {
    const isOpen = panel.classList.contains('open');
    document.querySelectorAll('.settings-panel, .gallery-panel').forEach(p => p.classList.remove('open'));
    if (!isOpen) panel.classList.add('open');
}

// Helper: convert to grayscale
function toGrayscale(r, g, b) {
    return r * 0.299 + g * 0.587 + b * 0.114;
}

// Simple threshold dithering (no error diffusion)
function simpleDither(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4 * grainSize) {
        const gray = toGrayscale(data[i], data[i + 1], data[i + 2]);
        const newGray = gray < threshold ? 0 : 255;

        // Apply to grain block
        for (let dy = 0; dy < grainSize; dy++) {
            for (let dx = 0; dx < grainSize; dx++) {
                const idx = i + (dy * canvas.width + dx) * 4;
                if (idx < data.length) {
                    data[idx] = data[idx + 1] = data[idx + 2] = newGray;
                }
            }
        }
    }
    return imageData;
}

// Floyd-Steinberg dithering
function floydSteinbergDither(imageData) {
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

    for (let y = 0; y < height; y += grainSize) {
        for (let x = 0; x < width; x += grainSize) {
            const idx = y * width + x;
            const oldPixel = gray[idx];
            const newPixel = oldPixel < threshold ? 0 : 255;
            const error = oldPixel - newPixel;

            const dataIdx = idx * 4;
            for (let dy = 0; dy < grainSize && y + dy < height; dy++) {
                for (let dx = 0; dx < grainSize && x + dx < width; dx++) {
                    const i = ((y + dy) * width + (x + dx)) * 4;
                    data[i] = data[i + 1] = data[i + 2] = newPixel;
                }
            }

            if (x + grainSize < width) gray[idx + grainSize] += error * 7/16;
            if (y + grainSize < height) {
                if (x > 0) gray[idx + width * grainSize - grainSize] += error * 3/16;
                gray[idx + width * grainSize] += error * 5/16;
                if (x + grainSize < width) gray[idx + width * grainSize + grainSize] += error * 1/16;
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

    for (let y = 0; y < height; y += grainSize) {
        for (let x = 0; x < width; x += grainSize) {
            const idx = y * width + x;
            const oldPixel = gray[idx];
            const newPixel = oldPixel < threshold ? 0 : 255;
            const error = (oldPixel - newPixel) / 8;

            const dataIdx = idx * 4;
            for (let dy = 0; dy < grainSize && y + dy < height; dy++) {
                for (let dx = 0; dx < grainSize && x + dx < width; dx++) {
                    const i = ((y + dy) * width + (x + dx)) * 4;
                    data[i] = data[i + 1] = data[i + 2] = newPixel;
                }
            }

            if (x + grainSize < width) gray[idx + grainSize] += error;
            if (x + grainSize * 2 < width) gray[idx + grainSize * 2] += error;
            if (y + grainSize < height) {
                if (x > 0) gray[idx + width * grainSize - grainSize] += error;
                gray[idx + width * grainSize] += error;
                if (x + grainSize < width) gray[idx + width * grainSize + grainSize] += error;
            }
            if (y + grainSize * 2 < height) {
                gray[idx + width * grainSize * 2] += error;
            }
        }
    }

    return imageData;
}

// Jarvis-Judice-Ninke dithering
function jarvisDither(imageData) {
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

    for (let y = 0; y < height; y += grainSize) {
        for (let x = 0; x < width; x += grainSize) {
            const idx = y * width + x;
            const oldPixel = gray[idx];
            const newPixel = oldPixel < threshold ? 0 : 255;
            const error = (oldPixel - newPixel) / 48;

            const dataIdx = idx * 4;
            for (let dy = 0; dy < grainSize && y + dy < height; dy++) {
                for (let dx = 0; dx < grainSize && x + dx < width; dx++) {
                    const i = ((y + dy) * width + (x + dx)) * 4;
                    data[i] = data[i + 1] = data[i + 2] = newPixel;
                }
            }

            const g = grainSize;
            if (x + g < width) gray[idx + g] += error * 7;
            if (x + g * 2 < width) gray[idx + g * 2] += error * 5;
            if (y + g < height) {
                if (x - g * 2 >= 0) gray[idx + width * g - g * 2] += error * 3;
                if (x - g >= 0) gray[idx + width * g - g] += error * 5;
                gray[idx + width * g] += error * 7;
                if (x + g < width) gray[idx + width * g + g] += error * 5;
                if (x + g * 2 < width) gray[idx + width * g + g * 2] += error * 3;
            }
            if (y + g * 2 < height) {
                if (x - g * 2 >= 0) gray[idx + width * g * 2 - g * 2] += error;
                if (x - g >= 0) gray[idx + width * g * 2 - g] += error * 3;
                gray[idx + width * g * 2] += error * 5;
                if (x + g < width) gray[idx + width * g * 2 + g] += error * 3;
                if (x + g * 2 < width) gray[idx + width * g * 2 + g * 2] += error;
            }
        }
    }

    return imageData;
}

// Stucki dithering
function stuckiDither(imageData) {
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

    for (let y = 0; y < height; y += grainSize) {
        for (let x = 0; x < width; x += grainSize) {
            const idx = y * width + x;
            const oldPixel = gray[idx];
            const newPixel = oldPixel < threshold ? 0 : 255;
            const error = (oldPixel - newPixel) / 42;

            const dataIdx = idx * 4;
            for (let dy = 0; dy < grainSize && y + dy < height; dy++) {
                for (let dx = 0; dx < grainSize && x + dx < width; dx++) {
                    const i = ((y + dy) * width + (x + dx)) * 4;
                    data[i] = data[i + 1] = data[i + 2] = newPixel;
                }
            }

            const g = grainSize;
            if (x + g < width) gray[idx + g] += error * 8;
            if (x + g * 2 < width) gray[idx + g * 2] += error * 4;
            if (y + g < height) {
                if (x - g * 2 >= 0) gray[idx + width * g - g * 2] += error * 2;
                if (x - g >= 0) gray[idx + width * g - g] += error * 4;
                gray[idx + width * g] += error * 8;
                if (x + g < width) gray[idx + width * g + g] += error * 4;
                if (x + g * 2 < width) gray[idx + width * g + g * 2] += error * 2;
            }
            if (y + g * 2 < height) {
                if (x - g * 2 >= 0) gray[idx + width * g * 2 - g * 2] += error;
                if (x - g >= 0) gray[idx + width * g * 2 - g] += error * 2;
                gray[idx + width * g * 2] += error * 4;
                if (x + g < width) gray[idx + width * g * 2 + g] += error * 2;
                if (x + g * 2 < width) gray[idx + width * g * 2 + g * 2] += error;
            }
        }
    }

    return imageData;
}

// Burkes dithering
function burkesDither(imageData) {
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

    for (let y = 0; y < height; y += grainSize) {
        for (let x = 0; x < width; x += grainSize) {
            const idx = y * width + x;
            const oldPixel = gray[idx];
            const newPixel = oldPixel < threshold ? 0 : 255;
            const error = (oldPixel - newPixel) / 32;

            const dataIdx = idx * 4;
            for (let dy = 0; dy < grainSize && y + dy < height; dy++) {
                for (let dx = 0; dx < grainSize && x + dx < width; dx++) {
                    const i = ((y + dy) * width + (x + dx)) * 4;
                    data[i] = data[i + 1] = data[i + 2] = newPixel;
                }
            }

            const g = grainSize;
            if (x + g < width) gray[idx + g] += error * 8;
            if (x + g * 2 < width) gray[idx + g * 2] += error * 4;
            if (y + g < height) {
                if (x - g * 2 >= 0) gray[idx + width * g - g * 2] += error * 2;
                if (x - g >= 0) gray[idx + width * g - g] += error * 4;
                gray[idx + width * g] += error * 8;
                if (x + g < width) gray[idx + width * g + g] += error * 4;
                if (x + g * 2 < width) gray[idx + width * g + g * 2] += error * 2;
            }
        }
    }

    return imageData;
}

// Sierra dithering
function sierraDither(imageData) {
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

    for (let y = 0; y < height; y += grainSize) {
        for (let x = 0; x < width; x += grainSize) {
            const idx = y * width + x;
            const oldPixel = gray[idx];
            const newPixel = oldPixel < threshold ? 0 : 255;
            const error = (oldPixel - newPixel) / 32;

            const dataIdx = idx * 4;
            for (let dy = 0; dy < grainSize && y + dy < height; dy++) {
                for (let dx = 0; dx < grainSize && x + dx < width; dx++) {
                    const i = ((y + dy) * width + (x + dx)) * 4;
                    data[i] = data[i + 1] = data[i + 2] = newPixel;
                }
            }

            const g = grainSize;
            if (x + g < width) gray[idx + g] += error * 5;
            if (x + g * 2 < width) gray[idx + g * 2] += error * 3;
            if (y + g < height) {
                if (x - g * 2 >= 0) gray[idx + width * g - g * 2] += error * 2;
                if (x - g >= 0) gray[idx + width * g - g] += error * 4;
                gray[idx + width * g] += error * 5;
                if (x + g < width) gray[idx + width * g + g] += error * 4;
                if (x + g * 2 < width) gray[idx + width * g + g * 2] += error * 2;
            }
            if (y + g * 2 < height) {
                if (x - g >= 0) gray[idx + width * g * 2 - g] += error * 2;
                gray[idx + width * g * 2] += error * 3;
                if (x + g < width) gray[idx + width * g * 2 + g] += error * 2;
            }
        }
    }

    return imageData;
}

// Two-Row Sierra dithering
function sierraTwoDither(imageData) {
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

    for (let y = 0; y < height; y += grainSize) {
        for (let x = 0; x < width; x += grainSize) {
            const idx = y * width + x;
            const oldPixel = gray[idx];
            const newPixel = oldPixel < threshold ? 0 : 255;
            const error = (oldPixel - newPixel) / 16;

            const dataIdx = idx * 4;
            for (let dy = 0; dy < grainSize && y + dy < height; dy++) {
                for (let dx = 0; dx < grainSize && x + dx < width; dx++) {
                    const i = ((y + dy) * width + (x + dx)) * 4;
                    data[i] = data[i + 1] = data[i + 2] = newPixel;
                }
            }

            const g = grainSize;
            if (x + g < width) gray[idx + g] += error * 4;
            if (x + g * 2 < width) gray[idx + g * 2] += error * 3;
            if (y + g < height) {
                if (x - g * 2 >= 0) gray[idx + width * g - g * 2] += error;
                if (x - g >= 0) gray[idx + width * g - g] += error * 2;
                gray[idx + width * g] += error * 3;
                if (x + g < width) gray[idx + width * g + g] += error * 2;
                if (x + g * 2 < width) gray[idx + width * g + g * 2] += error;
            }
        }
    }

    return imageData;
}

// Sierra Lite dithering
function sierraLiteDither(imageData) {
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

    for (let y = 0; y < height; y += grainSize) {
        for (let x = 0; x < width; x += grainSize) {
            const idx = y * width + x;
            const oldPixel = gray[idx];
            const newPixel = oldPixel < threshold ? 0 : 255;
            const error = (oldPixel - newPixel) / 4;

            const dataIdx = idx * 4;
            for (let dy = 0; dy < grainSize && y + dy < height; dy++) {
                for (let dx = 0; dx < grainSize && x + dx < width; dx++) {
                    const i = ((y + dy) * width + (x + dx)) * 4;
                    data[i] = data[i + 1] = data[i + 2] = newPixel;
                }
            }

            const g = grainSize;
            if (x + g < width) gray[idx + g] += error * 2;
            if (y + g < height) {
                if (x - g >= 0) gray[idx + width * g - g] += error;
                gray[idx + width * g] += error;
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

    for (let y = 0; y < height; y += grainSize) {
        for (let x = 0; x < width; x += grainSize) {
            const idx = (y * width + x) * 4;
            const gray = toGrayscale(data[idx], data[idx + 1], data[idx + 2]);

            const bayerValue = bayerMatrix[Math.floor(y / grainSize) % 8][Math.floor(x / grainSize) % 8];
            const bayerThreshold = (bayerValue / 64) * 255;
            const adjustedThreshold = threshold + (bayerThreshold - 128) * 0.5;
            const newGray = gray < adjustedThreshold ? 0 : 255;

            for (let dy = 0; dy < grainSize && y + dy < height; dy++) {
                for (let dx = 0; dx < grainSize && x + dx < width; dx++) {
                    const i = ((y + dy) * width + (x + dx)) * 4;
                    data[i] = data[i + 1] = data[i + 2] = newGray;
                }
            }
        }
    }

    return imageData;
}

// Halftone dots dithering
function halftoneDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const dotSize = grainSize * 2;

    for (let y = 0; y < height; y += dotSize) {
        for (let x = 0; x < width; x += dotSize) {
            let sum = 0;
            let count = 0;

            // Calculate average brightness in dot area
            for (let dy = 0; dy < dotSize && y + dy < height; dy++) {
                for (let dx = 0; dx < dotSize && x + dx < width; dx++) {
                    const idx = ((y + dy) * width + (x + dx)) * 4;
                    sum += toGrayscale(data[idx], data[idx + 1], data[idx + 2]);
                    count++;
                }
            }

            const avg = sum / count;
            const dotRadius = ((255 - avg) / 255) * (dotSize / 2);

            // Draw halftone dot
            const centerX = x + dotSize / 2;
            const centerY = y + dotSize / 2;

            for (let dy = 0; dy < dotSize && y + dy < height; dy++) {
                for (let dx = 0; dx < dotSize && x + dx < width; dx++) {
                    const px = x + dx;
                    const py = y + dy;
                    const dist = Math.sqrt((px - centerX) ** 2 + (py - centerY) ** 2);
                    const idx = (py * width + px) * 4;
                    const newGray = dist < dotRadius ? 0 : 255;
                    data[idx] = data[idx + 1] = data[idx + 2] = newGray;
                }
            }
        }
    }

    return imageData;
}

// Random threshold dithering
function randomDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    for (let y = 0; y < height; y += grainSize) {
        for (let x = 0; x < width; x += grainSize) {
            const idx = (y * width + x) * 4;
            const gray = toGrayscale(data[idx], data[idx + 1], data[idx + 2]);

            const randomThreshold = threshold + (Math.random() - 0.5) * 80;
            const newGray = gray < randomThreshold ? 0 : 255;

            for (let dy = 0; dy < grainSize && y + dy < height; dy++) {
                for (let dx = 0; dx < grainSize && x + dx < width; dx++) {
                    const i = ((y + dy) * width + (x + dx)) * 4;
                    data[i] = data[i + 1] = data[i + 2] = newGray;
                }
            }
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
        case 'jarvis':
            return jarvisDither(imageData);
        case 'stucki':
            return stuckiDither(imageData);
        case 'burkes':
            return burkesDither(imageData);
        case 'sierra':
            return sierraDither(imageData);
        case 'sierra-two':
            return sierraTwoDither(imageData);
        case 'sierra-lite':
            return sierraLiteDither(imageData);
        case 'ordered':
            return orderedDither(imageData);
        case 'halftone':
            return halftoneDither(imageData);
        case 'random':
            return randomDither(imageData);
        case 'simple':
            return simpleDither(imageData);
        default:
            return floydSteinbergDither(imageData);
    }
}

// Camera Controls
async function startCamera() {
    try {
        errorDiv.textContent = '';
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
        video.srcObject = stream;
        await new Promise((resolve) => { video.onloadedmetadata = resolve; });
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        video.style.display = 'none';
        canvas.style.display = 'block';
        processFrame();
        cameraActive = true;
        actionBtn.setAttribute('aria-label', 'Capture Photo');
    } catch (err) {
        console.error('Error accessing camera:', err);
        errorDiv.textContent = `Error: ${err.message}`;
    }
}

function processFrame() {
    if (!stream) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const ditheredData = applyDithering(imageData);
    ctx.putImageData(ditheredData, 0, 0);
    animationId = requestAnimationFrame(processFrame);
}

function capturePhoto() {
    const dataUrl = canvas.toDataURL('image/png');
    savePhoto(dataUrl);
    updateThumbnail(dataUrl);
}

// Gallery Functions
function savePhoto(dataUrl) {
    const photos = getPhotos();
    photos.unshift({ id: Date.now(), data: dataUrl, algorithm: ditherAlgorithm });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photos.slice(0, 50))); // Keep last 50
}

function getPhotos() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
}

function deletePhoto(id) {
    const photos = getPhotos().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
    loadGallery();
    updateThumbnail();
}

function updateThumbnail(dataUrl) {
    const photos = getPhotos();
    const latest = dataUrl || (photos[0] && photos[0].data);
    if (latest) {
        lastPhotoThumb.style.backgroundImage = `url(${latest})`;
    }
}

function loadGallery() {
    const photos = getPhotos();
    galleryGrid.innerHTML = '';
    photos.forEach(photo => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.innerHTML = `
            <img src="${photo.data}" alt="Dithered photo">
            <button class="gallery-item-delete" onclick="deletePhoto(${photo.id})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        `;
        item.querySelector('img').addEventListener('click', () => {
            const a = document.createElement('a');
            a.href = photo.data;
            a.download = `dithered-${photo.algorithm}-${photo.id}.png`;
            a.click();
        });
        galleryGrid.appendChild(item);
    });
}

// Make deletePhoto globally accessible
window.deletePhoto = deletePhoto;

// Initialize thumbnail on load
updateThumbnail();
