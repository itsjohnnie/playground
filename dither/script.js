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
const flipBtn = document.getElementById('flipBtn');
const cameraToast = document.getElementById('cameraToast');
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const closeLightbox = document.getElementById('closeLightbox');
const prevImage = document.getElementById('prevImage');
const nextImage = document.getElementById('nextImage');
const downloadImage = document.getElementById('downloadImage');
const aspectBtn = document.getElementById('aspectBtn');

// State
let stream = null;
let animationId = null;
let threshold = 128;
let grainSize = 1;
let ditherAlgorithm = 'floyd-steinberg';
let cameraActive = false;
let currentFacingMode = 'user';
let currentLightboxIndex = 0;
let aspectMode = 'portrait'; // 'portrait' or 'landscape' (desktop only)

// Performance optimization: reusable buffers
let grayBuffer = null;
let lastBufferSize = 0;

// Desktop detection
const isDesktop = () => window.innerWidth >= 1024;

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
    console.log('Dithering algorithm changed to:', ditherAlgorithm);
});

actionBtn.addEventListener('click', handleAction);
settingsBtn.addEventListener('click', () => togglePanel(settingsPanel));
galleryBtn.addEventListener('click', () => {
    togglePanel(galleryPanel);
    loadGallery();
});
closeSettings.addEventListener('click', () => togglePanel(settingsPanel));
closeGallery.addEventListener('click', () => togglePanel(galleryPanel));

// Camera flip button
flipBtn.addEventListener('click', async () => {
    if (!cameraActive) return;
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    console.log('Flipping camera to:', currentFacingMode);
    await stopCamera();
    await startCamera();
});

// Aspect ratio toggle (desktop only)
aspectBtn.addEventListener('click', () => {
    if (!isDesktop()) return;
    aspectMode = aspectMode === 'portrait' ? 'landscape' : 'portrait';
    updateAspectMode();
    updateAspectButtonIcon();
});

function updateAspectMode() {
    const container = document.querySelector('.camera-container');
    if (isDesktop()) {
        container.classList.remove('portrait-mode', 'landscape-mode');
        container.classList.add(`${aspectMode}-mode`);
    } else {
        container.classList.remove('portrait-mode', 'landscape-mode');
    }
}

function updateAspectButtonIcon() {
    if (!aspectBtn) return;
    const isPortrait = aspectMode === 'portrait';
    aspectBtn.querySelector('.aspect-portrait').style.display = isPortrait ? 'none' : 'block';
    aspectBtn.querySelector('.aspect-landscape').style.display = isPortrait ? 'block' : 'none';
}

// Update aspect mode on resize
window.addEventListener('resize', () => {
    updateAspectMode();
    // Show/hide aspect button based on desktop
    if (aspectBtn) {
        aspectBtn.style.display = isDesktop() && cameraActive ? 'flex' : 'none';
    }
});

// Swipe to dismiss for panels
let touchStartY = 0;
let touchStartTime = 0;

function setupSwipeToDismiss(panel) {
    panel.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
    }, { passive: true });

    panel.addEventListener('touchmove', (e) => {
        const touchY = e.touches[0].clientY;
        const deltaY = touchY - touchStartY;

        // Only allow downward swipes
        if (deltaY > 0) {
            panel.style.transform = `translateY(${deltaY}px)`;
        }
    }, { passive: true });

    panel.addEventListener('touchend', (e) => {
        const touchEndY = e.changedTouches[0].clientY;
        const deltaY = touchEndY - touchStartY;
        const deltaTime = Date.now() - touchStartTime;
        const velocity = deltaY / deltaTime;

        // Dismiss if swiped down more than 100px or fast swipe
        if (deltaY > 100 || (velocity > 0.5 && deltaY > 50)) {
            togglePanel(panel);
        }

        // Reset transform
        panel.style.transform = '';
    }, { passive: true });
}

setupSwipeToDismiss(settingsPanel);
setupSwipeToDismiss(galleryPanel);

// Dual-purpose action button
async function handleAction() {
    if (!cameraActive) {
        // Show toast to prompt user for camera permission
        cameraToast.classList.remove('hidden');
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

// Helper: convert to grayscale (inlined for performance in hot paths)
function toGrayscale(r, g, b) {
    return r * 0.299 + g * 0.587 + b * 0.114;
}

// Helper: get or create reusable grayscale buffer
function getGrayBuffer(size) {
    if (!grayBuffer || lastBufferSize !== size) {
        grayBuffer = new Float32Array(size);
        lastBufferSize = size;
    }
    return grayBuffer;
}

// Simple threshold dithering (no error diffusion) - optimized
function simpleDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const g = grainSize;

    for (let y = 0; y < height; y += g) {
        for (let x = 0; x < width; x += g) {
            const idx = (y * width + x) << 2;
            const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
            const newGray = gray < threshold ? 0 : 255;

            // Fill grain block
            const maxDy = Math.min(g, height - y);
            const maxDx = Math.min(g, width - x);
            for (let dy = 0; dy < maxDy; dy++) {
                const rowStart = ((y + dy) * width + x) << 2;
                for (let dx = 0; dx < maxDx; dx++) {
                    const i = rowStart + (dx << 2);
                    data[i] = data[i + 1] = data[i + 2] = newGray;
                }
            }
        }
    }
    return imageData;
}

// Floyd-Steinberg dithering (optimized)
function floydSteinbergDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const pixelCount = width * height;
    const gray = getGrayBuffer(pixelCount);

    // Pre-calculate constants
    const g = grainSize;
    const widthG = width * g;
    const e7_16 = 7 / 16;
    const e3_16 = 3 / 16;
    const e5_16 = 5 / 16;
    const e1_16 = 1 / 16;

    // Convert to grayscale in a single pass with inlined calculation
    for (let i = 0, j = 0; i < pixelCount; i++, j += 4) {
        gray[i] = data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114;
    }

    // Process with error diffusion
    for (let y = 0; y < height; y += g) {
        const yOffset = y * width;
        const nextRowOffset = yOffset + widthG;

        for (let x = 0; x < width; x += g) {
            const idx = yOffset + x;
            const oldPixel = gray[idx];
            const newPixel = oldPixel < threshold ? 0 : 255;
            const error = oldPixel - newPixel;

            // Fill grain block
            const maxDy = Math.min(g, height - y);
            const maxDx = Math.min(g, width - x);
            for (let dy = 0; dy < maxDy; dy++) {
                const rowStart = ((y + dy) * width + x) << 2;
                for (let dx = 0; dx < maxDx; dx++) {
                    const i = rowStart + (dx << 2);
                    data[i] = data[i + 1] = data[i + 2] = newPixel;
                }
            }

            // Distribute error
            const xPlusG = x + g;
            if (xPlusG < width) gray[idx + g] += error * e7_16;
            if (y + g < height) {
                if (x >= g) gray[nextRowOffset + x - g] += error * e3_16;
                gray[nextRowOffset + x] += error * e5_16;
                if (xPlusG < width) gray[nextRowOffset + xPlusG] += error * e1_16;
            }
        }
    }

    return imageData;
}

// Atkinson dithering (optimized)
function atkinsonDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const pixelCount = width * height;
    const gray = getGrayBuffer(pixelCount);

    const g = grainSize;
    const g2 = g * 2;
    const widthG = width * g;
    const widthG2 = width * g2;

    // Convert to grayscale
    for (let i = 0, j = 0; i < pixelCount; i++, j += 4) {
        gray[i] = data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114;
    }

    for (let y = 0; y < height; y += g) {
        const yOffset = y * width;

        for (let x = 0; x < width; x += g) {
            const idx = yOffset + x;
            const oldPixel = gray[idx];
            const newPixel = oldPixel < threshold ? 0 : 255;
            const error = (oldPixel - newPixel) * 0.125; // /8

            // Fill grain block
            const maxDy = Math.min(g, height - y);
            const maxDx = Math.min(g, width - x);
            for (let dy = 0; dy < maxDy; dy++) {
                const rowStart = ((y + dy) * width + x) << 2;
                for (let dx = 0; dx < maxDx; dx++) {
                    const i = rowStart + (dx << 2);
                    data[i] = data[i + 1] = data[i + 2] = newPixel;
                }
            }

            // Distribute error (Atkinson pattern)
            if (x + g < width) gray[idx + g] += error;
            if (x + g2 < width) gray[idx + g2] += error;
            if (y + g < height) {
                const nextRow = idx + widthG;
                if (x >= g) gray[nextRow - g] += error;
                gray[nextRow] += error;
                if (x + g < width) gray[nextRow + g] += error;
            }
            if (y + g2 < height) {
                gray[idx + widthG2] += error;
            }
        }
    }

    return imageData;
}

// Jarvis-Judice-Ninke dithering (optimized)
function jarvisDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const pixelCount = width * height;
    const gray = getGrayBuffer(pixelCount);

    const g = grainSize;
    const g2 = g * 2;
    const widthG = width * g;
    const widthG2 = width * g2;
    const invDiv = 1 / 48;

    for (let i = 0, j = 0; i < pixelCount; i++, j += 4) {
        gray[i] = data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114;
    }

    for (let y = 0; y < height; y += g) {
        const yOffset = y * width;

        for (let x = 0; x < width; x += g) {
            const idx = yOffset + x;
            const oldPixel = gray[idx];
            const newPixel = oldPixel < threshold ? 0 : 255;
            const error = (oldPixel - newPixel) * invDiv;

            const maxDy = Math.min(g, height - y);
            const maxDx = Math.min(g, width - x);
            for (let dy = 0; dy < maxDy; dy++) {
                const rowStart = ((y + dy) * width + x) << 2;
                for (let dx = 0; dx < maxDx; dx++) {
                    const i = rowStart + (dx << 2);
                    data[i] = data[i + 1] = data[i + 2] = newPixel;
                }
            }

            if (x + g < width) gray[idx + g] += error * 7;
            if (x + g2 < width) gray[idx + g2] += error * 5;
            if (y + g < height) {
                const row1 = idx + widthG;
                if (x >= g2) gray[row1 - g2] += error * 3;
                if (x >= g) gray[row1 - g] += error * 5;
                gray[row1] += error * 7;
                if (x + g < width) gray[row1 + g] += error * 5;
                if (x + g2 < width) gray[row1 + g2] += error * 3;
            }
            if (y + g2 < height) {
                const row2 = idx + widthG2;
                if (x >= g2) gray[row2 - g2] += error;
                if (x >= g) gray[row2 - g] += error * 3;
                gray[row2] += error * 5;
                if (x + g < width) gray[row2 + g] += error * 3;
                if (x + g2 < width) gray[row2 + g2] += error;
            }
        }
    }

    return imageData;
}

// Stucki dithering (optimized)
function stuckiDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const pixelCount = width * height;
    const gray = getGrayBuffer(pixelCount);

    const g = grainSize;
    const g2 = g * 2;
    const widthG = width * g;
    const widthG2 = width * g2;
    const invDiv = 1 / 42;

    for (let i = 0, j = 0; i < pixelCount; i++, j += 4) {
        gray[i] = data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114;
    }

    for (let y = 0; y < height; y += g) {
        const yOffset = y * width;

        for (let x = 0; x < width; x += g) {
            const idx = yOffset + x;
            const oldPixel = gray[idx];
            const newPixel = oldPixel < threshold ? 0 : 255;
            const error = (oldPixel - newPixel) * invDiv;

            const maxDy = Math.min(g, height - y);
            const maxDx = Math.min(g, width - x);
            for (let dy = 0; dy < maxDy; dy++) {
                const rowStart = ((y + dy) * width + x) << 2;
                for (let dx = 0; dx < maxDx; dx++) {
                    const i = rowStart + (dx << 2);
                    data[i] = data[i + 1] = data[i + 2] = newPixel;
                }
            }

            if (x + g < width) gray[idx + g] += error * 8;
            if (x + g2 < width) gray[idx + g2] += error * 4;
            if (y + g < height) {
                const row1 = idx + widthG;
                if (x >= g2) gray[row1 - g2] += error * 2;
                if (x >= g) gray[row1 - g] += error * 4;
                gray[row1] += error * 8;
                if (x + g < width) gray[row1 + g] += error * 4;
                if (x + g2 < width) gray[row1 + g2] += error * 2;
            }
            if (y + g2 < height) {
                const row2 = idx + widthG2;
                if (x >= g2) gray[row2 - g2] += error;
                if (x >= g) gray[row2 - g] += error * 2;
                gray[row2] += error * 4;
                if (x + g < width) gray[row2 + g] += error * 2;
                if (x + g2 < width) gray[row2 + g2] += error;
            }
        }
    }

    return imageData;
}

// Burkes dithering (optimized)
function burkesDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const pixelCount = width * height;
    const gray = getGrayBuffer(pixelCount);

    const g = grainSize;
    const g2 = g * 2;
    const widthG = width * g;
    const invDiv = 1 / 32;

    for (let i = 0, j = 0; i < pixelCount; i++, j += 4) {
        gray[i] = data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114;
    }

    for (let y = 0; y < height; y += g) {
        const yOffset = y * width;

        for (let x = 0; x < width; x += g) {
            const idx = yOffset + x;
            const oldPixel = gray[idx];
            const newPixel = oldPixel < threshold ? 0 : 255;
            const error = (oldPixel - newPixel) * invDiv;

            const maxDy = Math.min(g, height - y);
            const maxDx = Math.min(g, width - x);
            for (let dy = 0; dy < maxDy; dy++) {
                const rowStart = ((y + dy) * width + x) << 2;
                for (let dx = 0; dx < maxDx; dx++) {
                    const i = rowStart + (dx << 2);
                    data[i] = data[i + 1] = data[i + 2] = newPixel;
                }
            }

            if (x + g < width) gray[idx + g] += error * 8;
            if (x + g2 < width) gray[idx + g2] += error * 4;
            if (y + g < height) {
                const row1 = idx + widthG;
                if (x >= g2) gray[row1 - g2] += error * 2;
                if (x >= g) gray[row1 - g] += error * 4;
                gray[row1] += error * 8;
                if (x + g < width) gray[row1 + g] += error * 4;
                if (x + g2 < width) gray[row1 + g2] += error * 2;
            }
        }
    }

    return imageData;
}

// Sierra dithering (optimized)
function sierraDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const pixelCount = width * height;
    const gray = getGrayBuffer(pixelCount);

    const g = grainSize;
    const g2 = g * 2;
    const widthG = width * g;
    const widthG2 = width * g2;
    const invDiv = 1 / 32;

    for (let i = 0, j = 0; i < pixelCount; i++, j += 4) {
        gray[i] = data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114;
    }

    for (let y = 0; y < height; y += g) {
        const yOffset = y * width;

        for (let x = 0; x < width; x += g) {
            const idx = yOffset + x;
            const oldPixel = gray[idx];
            const newPixel = oldPixel < threshold ? 0 : 255;
            const error = (oldPixel - newPixel) * invDiv;

            const maxDy = Math.min(g, height - y);
            const maxDx = Math.min(g, width - x);
            for (let dy = 0; dy < maxDy; dy++) {
                const rowStart = ((y + dy) * width + x) << 2;
                for (let dx = 0; dx < maxDx; dx++) {
                    const i = rowStart + (dx << 2);
                    data[i] = data[i + 1] = data[i + 2] = newPixel;
                }
            }

            if (x + g < width) gray[idx + g] += error * 5;
            if (x + g2 < width) gray[idx + g2] += error * 3;
            if (y + g < height) {
                const row1 = idx + widthG;
                if (x >= g2) gray[row1 - g2] += error * 2;
                if (x >= g) gray[row1 - g] += error * 4;
                gray[row1] += error * 5;
                if (x + g < width) gray[row1 + g] += error * 4;
                if (x + g2 < width) gray[row1 + g2] += error * 2;
            }
            if (y + g2 < height) {
                const row2 = idx + widthG2;
                if (x >= g) gray[row2 - g] += error * 2;
                gray[row2] += error * 3;
                if (x + g < width) gray[row2 + g] += error * 2;
            }
        }
    }

    return imageData;
}

// Two-Row Sierra dithering (optimized)
function sierraTwoDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const pixelCount = width * height;
    const gray = getGrayBuffer(pixelCount);

    const g = grainSize;
    const g2 = g * 2;
    const widthG = width * g;
    const invDiv = 1 / 16;

    for (let i = 0, j = 0; i < pixelCount; i++, j += 4) {
        gray[i] = data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114;
    }

    for (let y = 0; y < height; y += g) {
        const yOffset = y * width;

        for (let x = 0; x < width; x += g) {
            const idx = yOffset + x;
            const oldPixel = gray[idx];
            const newPixel = oldPixel < threshold ? 0 : 255;
            const error = (oldPixel - newPixel) * invDiv;

            const maxDy = Math.min(g, height - y);
            const maxDx = Math.min(g, width - x);
            for (let dy = 0; dy < maxDy; dy++) {
                const rowStart = ((y + dy) * width + x) << 2;
                for (let dx = 0; dx < maxDx; dx++) {
                    const i = rowStart + (dx << 2);
                    data[i] = data[i + 1] = data[i + 2] = newPixel;
                }
            }

            if (x + g < width) gray[idx + g] += error * 4;
            if (x + g2 < width) gray[idx + g2] += error * 3;
            if (y + g < height) {
                const row1 = idx + widthG;
                if (x >= g2) gray[row1 - g2] += error;
                if (x >= g) gray[row1 - g] += error * 2;
                gray[row1] += error * 3;
                if (x + g < width) gray[row1 + g] += error * 2;
                if (x + g2 < width) gray[row1 + g2] += error;
            }
        }
    }

    return imageData;
}

// Sierra Lite dithering (optimized)
function sierraLiteDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const pixelCount = width * height;
    const gray = getGrayBuffer(pixelCount);

    const g = grainSize;
    const widthG = width * g;

    for (let i = 0, j = 0; i < pixelCount; i++, j += 4) {
        gray[i] = data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114;
    }

    for (let y = 0; y < height; y += g) {
        const yOffset = y * width;

        for (let x = 0; x < width; x += g) {
            const idx = yOffset + x;
            const oldPixel = gray[idx];
            const newPixel = oldPixel < threshold ? 0 : 255;
            const error = (oldPixel - newPixel) * 0.25; // /4

            const maxDy = Math.min(g, height - y);
            const maxDx = Math.min(g, width - x);
            for (let dy = 0; dy < maxDy; dy++) {
                const rowStart = ((y + dy) * width + x) << 2;
                for (let dx = 0; dx < maxDx; dx++) {
                    const i = rowStart + (dx << 2);
                    data[i] = data[i + 1] = data[i + 2] = newPixel;
                }
            }

            if (x + g < width) gray[idx + g] += error * 2;
            if (y + g < height) {
                const row1 = idx + widthG;
                if (x >= g) gray[row1 - g] += error;
                gray[row1] += error;
            }
        }
    }

    return imageData;
}

// Ordered (Bayer) dithering - optimized with flat matrix
const bayerMatrix8x8 = new Uint8Array([
     0, 48, 12, 60,  3, 51, 15, 63,
    32, 16, 44, 28, 35, 19, 47, 31,
     8, 56,  4, 52, 11, 59,  7, 55,
    40, 24, 36, 20, 43, 27, 39, 23,
     2, 50, 14, 62,  1, 49, 13, 61,
    34, 18, 46, 30, 33, 17, 45, 29,
    10, 58,  6, 54,  9, 57,  5, 53,
    42, 26, 38, 22, 41, 25, 37, 21
]);

function orderedDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const g = grainSize;

    for (let y = 0; y < height; y += g) {
        const by = ((y / g) & 7) << 3; // (y/g % 8) * 8

        for (let x = 0; x < width; x += g) {
            const idx = (y * width + x) << 2;
            const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;

            const bx = (x / g) & 7; // x/g % 8
            const bayerValue = bayerMatrix8x8[by + bx];
            const adjustedThreshold = threshold + ((bayerValue * 3.984375) - 128) * 0.5; // bayerValue/64*255 = bayerValue*3.984375
            const newGray = gray < adjustedThreshold ? 0 : 255;

            // Fill grain block
            const maxDy = Math.min(g, height - y);
            const maxDx = Math.min(g, width - x);
            for (let dy = 0; dy < maxDy; dy++) {
                const rowStart = ((y + dy) * width + x) << 2;
                for (let dx = 0; dx < maxDx; dx++) {
                    const i = rowStart + (dx << 2);
                    data[i] = data[i + 1] = data[i + 2] = newGray;
                }
            }
        }
    }

    return imageData;
}

// Halftone dots dithering (optimized)
function halftoneDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const dotSize = grainSize << 1; // * 2
    const halfDot = dotSize * 0.5;
    const invDotSize = 1 / dotSize;

    for (let y = 0; y < height; y += dotSize) {
        for (let x = 0; x < width; x += dotSize) {
            let sum = 0;
            let count = 0;

            const maxDy = Math.min(dotSize, height - y);
            const maxDx = Math.min(dotSize, width - x);

            // Calculate average brightness in dot area
            for (let dy = 0; dy < maxDy; dy++) {
                const rowStart = ((y + dy) * width + x) << 2;
                for (let dx = 0; dx < maxDx; dx++) {
                    const idx = rowStart + (dx << 2);
                    sum += data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
                    count++;
                }
            }

            const avg = sum / count;
            const dotRadius = (255 - avg) * 0.00392156862745098 * halfDot; // /255
            const dotRadiusSq = dotRadius * dotRadius;

            // Draw halftone dot
            const centerX = x + halfDot;
            const centerY = y + halfDot;

            for (let dy = 0; dy < maxDy; dy++) {
                const py = y + dy;
                const dyFromCenter = py - centerY;
                const dySq = dyFromCenter * dyFromCenter;
                const rowStart = (py * width + x) << 2;

                for (let dx = 0; dx < maxDx; dx++) {
                    const px = x + dx;
                    const dxFromCenter = px - centerX;
                    const distSq = dxFromCenter * dxFromCenter + dySq;
                    const idx = rowStart + (dx << 2);
                    const newGray = distSq < dotRadiusSq ? 0 : 255;
                    data[idx] = data[idx + 1] = data[idx + 2] = newGray;
                }
            }
        }
    }

    return imageData;
}

// Random threshold dithering (optimized)
function randomDither(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const g = grainSize;

    for (let y = 0; y < height; y += g) {
        for (let x = 0; x < width; x += g) {
            const idx = (y * width + x) << 2;
            const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;

            const randomThreshold = threshold + (Math.random() - 0.5) * 80;
            const newGray = gray < randomThreshold ? 0 : 255;

            const maxDy = Math.min(g, height - y);
            const maxDx = Math.min(g, width - x);
            for (let dy = 0; dy < maxDy; dy++) {
                const rowStart = ((y + dy) * width + x) << 2;
                for (let dx = 0; dx < maxDx; dx++) {
                    const i = rowStart + (dx << 2);
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
            video: { facingMode: currentFacingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
        video.srcObject = stream;
        await new Promise((resolve) => { video.onloadedmetadata = resolve; });

        // Explicitly play the video
        await video.play();

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        video.style.display = 'none';
        canvas.style.display = 'block';
        processFrame();
        cameraActive = true;
        actionBtn.setAttribute('aria-label', 'Capture Photo');

        // Hide camera toast and show flip button
        cameraToast.classList.add('hidden');
        flipBtn.style.display = 'flex';

        // Show aspect button on desktop only
        if (aspectBtn) {
            aspectBtn.style.display = isDesktop() ? 'flex' : 'none';
            updateAspectMode();
            updateAspectButtonIcon();
        }

        console.log('Camera started successfully with facing mode:', currentFacingMode);
    } catch (err) {
        console.error('Error accessing camera:', err);
        errorDiv.textContent = `Error: ${err.message}`;
        cameraToast.classList.remove('hidden');
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    // Hide aspect button when camera stops
    if (aspectBtn) {
        aspectBtn.style.display = 'none';
    }
}

function processFrame() {
    if (!stream) {
        console.log('processFrame stopped: no stream');
        return;
    }
    if (video.paused || video.ended) {
        console.log('Video is paused or ended');
        return;
    }
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
    photos.forEach((photo, index) => {
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
            openLightbox(index);
        });
        galleryGrid.appendChild(item);
    });
}

// Make deletePhoto globally accessible
window.deletePhoto = deletePhoto;

// Lightbox Functions
function openLightbox(index) {
    const photos = getPhotos();
    if (photos.length === 0) return;

    currentLightboxIndex = index;
    updateLightboxImage();
    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Update navigation button visibility
    updateNavButtons();
}

function closeLightboxModal() {
    lightbox.style.display = 'none';
    document.body.style.overflow = '';
}

function updateLightboxImage() {
    const photos = getPhotos();
    if (photos.length === 0) return;

    const photo = photos[currentLightboxIndex];
    lightboxImage.src = photo.data;
    updateNavButtons();
}

function updateNavButtons() {
    const photos = getPhotos();
    prevImage.style.display = currentLightboxIndex > 0 ? 'flex' : 'none';
    nextImage.style.display = currentLightboxIndex < photos.length - 1 ? 'flex' : 'none';
}

function showPrevImage() {
    if (currentLightboxIndex > 0) {
        currentLightboxIndex--;
        updateLightboxImage();
    }
}

function showNextImage() {
    const photos = getPhotos();
    if (currentLightboxIndex < photos.length - 1) {
        currentLightboxIndex++;
        updateLightboxImage();
    }
}

function downloadCurrentImage() {
    const photos = getPhotos();
    const photo = photos[currentLightboxIndex];
    const a = document.createElement('a');
    a.href = photo.data;
    a.download = `dithered-${photo.algorithm}-${photo.id}.png`;
    a.click();
}

// Lightbox event listeners
closeLightbox.addEventListener('click', closeLightboxModal);
prevImage.addEventListener('click', showPrevImage);
nextImage.addEventListener('click', showNextImage);
downloadImage.addEventListener('click', downloadCurrentImage);

// Close lightbox on overlay click
lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.classList.contains('lightbox-overlay')) {
        closeLightboxModal();
    }
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (lightbox.style.display === 'flex') {
        if (e.key === 'Escape') closeLightboxModal();
        if (e.key === 'ArrowLeft') showPrevImage();
        if (e.key === 'ArrowRight') showNextImage();
    }
});

// Touch swipe for lightbox navigation
let lightboxTouchStartX = 0;
let lightboxTouchStartTime = 0;

lightboxImage.addEventListener('touchstart', (e) => {
    lightboxTouchStartX = e.touches[0].clientX;
    lightboxTouchStartTime = Date.now();
}, { passive: true });

lightboxImage.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - lightboxTouchStartX;
    const deltaTime = Date.now() - lightboxTouchStartTime;
    const velocity = Math.abs(deltaX) / deltaTime;

    // Swipe left to go to next image
    if (deltaX < -50 || (velocity > 0.5 && deltaX < -30)) {
        showNextImage();
    }
    // Swipe right to go to previous image
    else if (deltaX > 50 || (velocity > 0.5 && deltaX > 30)) {
        showPrevImage();
    }
}, { passive: true });

// Prevent pull-to-refresh and scrolling on mobile
document.body.addEventListener('touchmove', (e) => {
    // Allow scrolling within panels when they're open
    // Also allow touch on canvas and video elements
    if (e.target.closest('.settings-panel.open') ||
        e.target.closest('.gallery-panel.open') ||
        e.target.closest('.lightbox') ||
        e.target.closest('canvas') ||
        e.target.closest('video')) {
        return;
    }
    e.preventDefault();
}, { passive: false });

// Prevent bounce/overscroll on iOS
document.body.addEventListener('touchstart', (e) => {
    if (e.target === document.body) {
        e.preventDefault();
    }
}, { passive: false });

// Initialize thumbnail on load
updateThumbnail();
