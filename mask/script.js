let revealInterval = null;
let currentSpeed = 50;
let currentBrushSize = 120;
let currentBrushType = 'splatter';
let currentRevealDirection = 'random';
let maskSVG = null;
let maskGroup = null;
let svgElement = null;
let autoRevealActive = true;
let experimentalMode = false;
let revealPoints = [];
let revealProgress = 0;
let contentAreas = [];
let paperScope = null;
let noiseGenerator = null;

const svgUpload = document.getElementById('svgUpload');
const svgContainer = document.getElementById('svgContainer');
const revealSpeedControl = document.getElementById('revealSpeed');
const speedValue = document.getElementById('speedValue');
const brushSizeControl = document.getElementById('brushSize');
const sizeValue = document.getElementById('sizeValue');
const brushTypeSelect = document.getElementById('brushType');
const revealDirectionSelect = document.getElementById('revealDirection');
const autoReveal = document.getElementById('autoReveal');
const experimentalCheckbox = document.getElementById('experimental');
const resetButton = document.getElementById('resetMask');
const uploadLabel = document.querySelector('.upload-label');

svgUpload.addEventListener('change', handleFileUpload);
revealSpeedControl.addEventListener('input', updateSpeed);
brushSizeControl.addEventListener('input', updateBrushSize);
brushTypeSelect.addEventListener('change', updateBrushType);
revealDirectionSelect.addEventListener('change', updateRevealDirection);
autoReveal.addEventListener('change', handleAutoRevealToggle);
experimentalCheckbox.addEventListener('change', handleExperimentalToggle);
resetButton.addEventListener('click', resetMask);

// Add keyboard support for upload label
uploadLabel.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        svgUpload.click();
    }
});

// Add event listeners for editable values
speedValue.addEventListener('keydown', handleEditKeydown);
speedValue.addEventListener('focus', handleEditFocus);
speedValue.addEventListener('blur', handleSpeedEditComplete);
sizeValue.addEventListener('keydown', handleEditKeydown);
sizeValue.addEventListener('focus', handleEditFocus);
sizeValue.addEventListener('blur', handleSizeEditComplete);

// Load saved SVG on page load
window.addEventListener('DOMContentLoaded', () => {
    loadSavedSettings();
    loadSavedSVG();
    loadSavedPanelPosition();
});

// Keyboard shortcuts
window.addEventListener('keydown', (event) => {
    // Check if user is typing in an input field
    if (event.target.tagName === 'INPUT' || event.target.contentEditable === 'true') {
        return;
    }
    
    // R key to reset mask
    if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        resetMask();
    }
    
    // Backtick key to toggle UI visibility and clear storage
    if (event.key === '`') {
        event.preventDefault();
        const panel = document.querySelector('.controls-panel');
        if (panel) {
            const isHidden = panel.style.display === 'none' || getComputedStyle(panel).display === 'none';
            
            // If toggling on, clear storage first to ensure clean state
            if (isHidden) {
                localStorage.clear();
                sessionStorage.clear();
                document.cookie.split(";").forEach((c) => {
                    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });
            }
            
            panel.style.setProperty('display', isHidden ? 'block' : 'none', 'important');
        }
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    if (svgElement) {
        updateMaskSize();
    }
});

// Make control panel draggable
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

const controlsPanel = document.querySelector('.controls-panel');

controlsPanel.addEventListener('mousedown', dragStart);
document.addEventListener('mousemove', drag);
document.addEventListener('mouseup', dragEnd);

function handleFileUpload(event) {
    const file = event.target.files[0];
    
    if (!file || file.type !== 'image/svg+xml') {
        alert('Please upload a valid SVG file');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const svgContent = e.target.result;
        
        // Create wrapper structure
        svgContainer.innerHTML = `
            <div class="svg-wrapper">
                ${svgContent}
            </div>
        `;
        
        // Save SVG to localStorage
        localStorage.setItem('savedSVG', svgContent);
        
        // Initialize the ink mask
        initializeInkMask();
    };
    
    reader.readAsText(file);
}

function initializeInkMask() {
    svgElement = svgContainer.querySelector('svg');
    
    if (!svgElement) return;
    
    // Analyze content if experimental mode is enabled
    if (experimentalMode) {
        analyzeContent();
    }
    
    // Create SVG mask
    createSVGMask();
    
    // Generate random reveal points
    generateRevealPoints();
    
    // Apply the mask
    applyMask();
    
    // Start auto reveal if enabled
    if (autoReveal.checked) {
        startAutoReveal();
    }
}

function createSVGMask() {
    const rect = svgElement.getBoundingClientRect();
    
    // Create mask SVG element
    maskSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    maskSVG.style.position = 'absolute';
    maskSVG.style.top = '0';
    maskSVG.style.left = '0';
    maskSVG.style.width = '100%';
    maskSVG.style.height = '100%';
    maskSVG.style.pointerEvents = 'none';
    
    // Create defs for the mask
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    // Create the mask element
    const mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
    mask.id = 'ink-reveal-mask';
    
    // Create a black rectangle that hides everything
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', 'black');
    mask.appendChild(bgRect);
    
    // Create group for white reveal shapes
    maskGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    maskGroup.setAttribute('fill', 'white');
    mask.appendChild(maskGroup);
    
    defs.appendChild(mask);
    maskSVG.appendChild(defs);
    
    // Add mask SVG to wrapper
    const wrapper = svgContainer.querySelector('.svg-wrapper');
    wrapper.appendChild(maskSVG);
}

function generateRevealPoints() {
    revealPoints = [];
    
    // Adjust point density based on brush size
    // Smaller brushes need more points to cover the same area
    const brushSizeMultiplier = 120 / currentBrushSize; // 120 is our default/reference size
    
    if (experimentalMode && contentAreas.length > 0) {
        // Experimental mode: simply add more density to content areas
        // Use same grid as standard mode but with extra points in content areas
        
        // First, create standard grid
        const baseGridSize = 18;
        const gridSize = Math.round(baseGridSize * Math.sqrt(brushSizeMultiplier));
        
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const x = (col + Math.random()) / gridSize;
                const y = (row + Math.random()) / gridSize;
                
                // Check if this point is in a content area
                let inContentArea = false;
                for (let area of contentAreas) {
                    if (x >= area.x - 0.1 && x <= area.x + area.width + 0.1 &&
                        y >= area.y - 0.1 && y <= area.y + area.height + 0.1) {
                        inContentArea = true;
                        break;
                    }
                }
                
                // Add more points in content areas
                const pointCount = inContentArea ? 3 : 1;
                for (let p = 0; p < pointCount; p++) {
                    revealPoints.push({
                        x: x + (Math.random() - 0.5) * 0.02,
                        y: y + (Math.random() - 0.5) * 0.02,
                        revealed: false
                    });
                }
            }
        }
        
        // Add edge coverage
        const edgeSteps = 20;
        for (let i = 0; i < edgeSteps; i++) {
            const t = i / edgeSteps;
            revealPoints.push({ x: t, y: 0, revealed: false });
            revealPoints.push({ x: t, y: 1, revealed: false });
            revealPoints.push({ x: 0, y: t, revealed: false });
            revealPoints.push({ x: 1, y: t, revealed: false });
        }
        
        // Add some random points
        const extraPoints = Math.round(30 * brushSizeMultiplier);
        for (let i = 0; i < extraPoints; i++) {
            revealPoints.push({
                x: Math.random(),
                y: Math.random(),
                revealed: false
            });
        }
        
        // Sort points based on reveal direction (no priority system)
        sortRevealPoints();
        return; // Exit early to avoid double sorting
    } else if (experimentalMode && contentAreas.length === 0) {
        // Fallback if no content areas found in experimental mode
    }
    
    if (!experimentalMode || contentAreas.length === 0) {
        // Standard mode: full coverage - ensure 100% reveal
        // Lower density for faster animation (~3 seconds)
        const baseGridSize = 12; // Reduced for faster animation
        const gridSize = Math.round(baseGridSize * Math.sqrt(brushSizeMultiplier));
        const pointsPerCell = 1; // One point per cell for speed
        
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                for (let p = 0; p < pointsPerCell; p++) {
                    const x = (col + Math.random()) / gridSize;
                    const y = (row + Math.random()) / gridSize;
                    revealPoints.push({
                        x: x,
                        y: y,
                        revealed: false
                        // No priority for standard mode
                    });
                }
            }
        }
        
        // Edge coverage for 100% reveal
        const edgeSteps = 12; // Reduced edge points
        for (let i = 0; i < edgeSteps; i++) {
            const t = i / edgeSteps;
            // Single row of edge points
            // Top and bottom edges
            revealPoints.push({ x: t, y: 0, revealed: false });
            revealPoints.push({ x: t, y: 1, revealed: false });
            // Left and right edges
            revealPoints.push({ x: 0, y: t, revealed: false });
            revealPoints.push({ x: 1, y: t, revealed: false });
        }
        
        // Just the four corners
        revealPoints.push({ x: 0, y: 0, revealed: false });
        revealPoints.push({ x: 1, y: 0, revealed: false });
        revealPoints.push({ x: 0, y: 1, revealed: false });
        revealPoints.push({ x: 1, y: 1, revealed: false });
        
        // Add center point for center-out mode
        revealPoints.push({ x: 0.5, y: 0.5, revealed: false });
        revealPoints.push({ x: 0.49, y: 0.5, revealed: false });
        revealPoints.push({ x: 0.51, y: 0.5, revealed: false });
        revealPoints.push({ x: 0.5, y: 0.49, revealed: false });
        revealPoints.push({ x: 0.5, y: 0.51, revealed: false });
        
        // Some additional random points to ensure no gaps
        const extraPoints = Math.round(20 * brushSizeMultiplier);
        for (let i = 0; i < extraPoints; i++) {
            revealPoints.push({
                x: Math.random(),
                y: Math.random(),
                revealed: false
            });
        }
    }
    
    // Sort points based on reveal direction
    sortRevealPoints();
}

function applyMask() {
    if (!svgElement) return;
    
    // Apply the mask to the SVG
    svgElement.style.mask = 'url(#ink-reveal-mask)';
    svgElement.style.webkitMask = 'url(#ink-reveal-mask)';
}

function startAutoReveal() {
    if (revealInterval) {
        clearInterval(revealInterval);
    }
    
    revealProgress = 0;
    
    revealInterval = setInterval(() => {
        revealNextPoint();
    }, currentSpeed);
}

function revealNextPoint() {
    // Calculate base speed to ensure ~3 second total reveal time
    // Adjust based on current speed setting
    const totalPoints = revealPoints.length;
    const targetTime = 3000; // 3 seconds in milliseconds
    const targetIntervals = targetTime / currentSpeed;
    const basePointsPerInterval = Math.ceil(totalPoints / targetIntervals);
    
    let pointsPerInterval;
    if (currentRevealDirection === 'random') {
        // Random reveal at consistent speed
        pointsPerInterval = Math.max(3, basePointsPerInterval);
    } else if (currentRevealDirection === 'center-out' || currentRevealDirection === 'out-center') {
        // Progressive reveal for smooth radial expansion
        const revealedRatio = revealPoints.filter(p => p.revealed).length / revealPoints.length;
        // Start slower and accelerate for natural expansion
        pointsPerInterval = Math.ceil(basePointsPerInterval * (0.5 + revealedRatio * 1.5));
    } else {
        // Directional reveals at consistent speed
        pointsPerInterval = Math.max(5, basePointsPerInterval);
    }
    
    let revealedCount = 0;
    for (let i = 0; i < pointsPerInterval; i++) {
        // Find the first unrevealed point in order
        const nextPoint = revealPoints.find(p => !p.revealed);
        
        if (!nextPoint) {
            if (revealedCount === 0) {
                // Final cleanup pass - fill entire mask to ensure 100% coverage
                fillEntireMask();
                clearInterval(revealInterval);
            }
            return;
        }
        
        nextPoint.revealed = true;
        revealedCount++;
        
        // Draw ink splatter at this point
        drawInkSplatter(nextPoint.x, nextPoint.y);
    }
}

function drawInkSplatter(xPercent, yPercent) {
    if (!maskGroup || !svgElement) return;
    
    const rect = svgElement.getBoundingClientRect();
    const x = xPercent * rect.width;
    const y = yPercent * rect.height;
    
    switch(currentBrushType) {
        case 'splatter':
            drawSplatter(x, y);
            break;
        case 'brush':
            drawBrushStroke(x, y);
            break;
        case 'airbrush':
            drawAirbrush(x, y);
            break;
        case 'watercolor':
            drawWatercolor(x, y);
            break;
    }
}

function drawSplatter(x, y) {
    // Create organic ink splatter effect with larger coverage
    const numSplatters = 5 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numSplatters; i++) {
        const offsetX = (Math.random() - 0.5) * currentBrushSize * 0.7;
        const offsetY = (Math.random() - 0.5) * currentBrushSize * 0.7;
        const size = currentBrushSize * (1.5 + Math.random() * 1.0);
        
        // Create irregular circle path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        // Build path data for irregular shape
        let pathData = '';
        const points = 12 + Math.floor(Math.random() * 6);
        
        for (let j = 0; j < points; j++) {
            const angle = (j / points) * Math.PI * 2;
            const radius = (size / 2) * (0.8 + Math.random() * 0.4);
            const px = x + offsetX + Math.cos(angle) * radius;
            const py = y + offsetY + Math.sin(angle) * radius;
            
            if (j === 0) {
                pathData += `M ${px} ${py}`;
            } else {
                pathData += ` L ${px} ${py}`;
            }
        }
        
        pathData += ' Z';
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'white');
        maskGroup.appendChild(path);
        
        // Add some smaller dots around for texture
        for (let k = 0; k < 5; k++) {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            const dotX = x + (Math.random() - 0.5) * size * 1.5;
            const dotY = y + (Math.random() - 0.5) * size * 1.5;
            const dotSize = 2 + Math.random() * 6;
            
            circle.setAttribute('cx', dotX);
            circle.setAttribute('cy', dotY);
            circle.setAttribute('r', dotSize);
            circle.setAttribute('fill', 'white');
            maskGroup.appendChild(circle);
        }
    }
}

function drawBrushStroke(x, y) {
    // Combined brush stroke with best features from brush, paint, and marker
    const strokeLength = currentBrushSize * 2.5;
    const strokeWidth = currentBrushSize * 0.9;
    const angle = Math.random() * Math.PI * 2;
    
    // Main stroke with slight curve
    const mainPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const startX = x - Math.cos(angle) * strokeLength * 0.5;
    const startY = y - Math.sin(angle) * strokeLength * 0.5;
    const endX = x + Math.cos(angle) * strokeLength * 0.5;
    const endY = y + Math.sin(angle) * strokeLength * 0.5;
    
    // Add natural curve
    const controlOffset = strokeLength * 0.15;
    const perpAngle = angle + Math.PI / 2;
    const cx = x + Math.cos(perpAngle) * controlOffset * (Math.random() - 0.5);
    const cy = y + Math.sin(perpAngle) * controlOffset * (Math.random() - 0.5);
    
    mainPath.setAttribute('d', `M ${startX} ${startY} Q ${cx} ${cy} ${endX} ${endY}`);
    mainPath.setAttribute('stroke', 'white');
    mainPath.setAttribute('stroke-width', strokeWidth);
    mainPath.setAttribute('stroke-linecap', 'round');
    mainPath.setAttribute('fill', 'none');
    mainPath.setAttribute('opacity', '0.95');
    maskGroup.appendChild(mainPath);
    
    // Add texture strokes for richness
    const textureCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < textureCount; i++) {
        const texturePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const offset = (i - textureCount/2) * strokeWidth * 0.2;
        const tStartX = startX + Math.cos(perpAngle) * offset;
        const tStartY = startY + Math.sin(perpAngle) * offset;
        const tEndX = endX + Math.cos(perpAngle) * offset;
        const tEndY = endY + Math.sin(perpAngle) * offset;
        
        texturePath.setAttribute('d', `M ${tStartX} ${tStartY} L ${tEndX} ${tEndY}`);
        texturePath.setAttribute('stroke', 'white');
        texturePath.setAttribute('stroke-width', strokeWidth * 0.3);
        texturePath.setAttribute('stroke-linecap', 'round');
        texturePath.setAttribute('opacity', '0.6');
        texturePath.setAttribute('fill', 'none');
        maskGroup.appendChild(texturePath);
    }
    
    // Add a few dots for additional texture
    const dotCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < dotCount; i++) {
        const t = Math.random();
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const dotX = startX + t * (endX - startX) + (Math.random() - 0.5) * strokeWidth * 0.3;
        const dotY = startY + t * (endY - startY) + (Math.random() - 0.5) * strokeWidth * 0.3;
        
        circle.setAttribute('cx', dotX);
        circle.setAttribute('cy', dotY);
        circle.setAttribute('r', strokeWidth * 0.1 + Math.random() * strokeWidth * 0.1);
        circle.setAttribute('fill', 'white');
        circle.setAttribute('opacity', '0.7');
        maskGroup.appendChild(circle);
    }
}

function drawAirbrush(x, y) {
    // Create soft airbrush effect with gradients
    const defs = maskSVG.querySelector('defs');
    const gradientId = `airbrush-gradient-${Date.now()}-${Math.random()}`;
    
    // Create radial gradient
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    gradient.setAttribute('id', gradientId);
    
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', 'white');
    stop1.setAttribute('stop-opacity', '1');
    
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '60%');
    stop2.setAttribute('stop-color', 'white');
    stop2.setAttribute('stop-opacity', '0.6');
    
    const stop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop3.setAttribute('offset', '100%');
    stop3.setAttribute('stop-color', 'white');
    stop3.setAttribute('stop-opacity', '0');
    
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    gradient.appendChild(stop3);
    defs.appendChild(gradient);
    
    // Create circle with gradient (larger for better coverage)
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', currentBrushSize * 2.0);
    circle.setAttribute('fill', `url(#${gradientId})`);
    maskGroup.appendChild(circle);
    
    // Add some scattered dots for texture
    for (let i = 0; i < 10; i++) {
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * currentBrushSize;
        const dotX = x + Math.cos(angle) * distance;
        const dotY = y + Math.sin(angle) * distance;
        const dotSize = Math.random() * 3 + 1;
        
        dot.setAttribute('cx', dotX);
        dot.setAttribute('cy', dotY);
        dot.setAttribute('r', dotSize);
        dot.setAttribute('fill', 'white');
        dot.setAttribute('opacity', 0.5);
        maskGroup.appendChild(dot);
    }
}


function initializePaper() {
    if (!paperScope && window.paper) {
        paperScope = new paper.PaperScope();
        // Create a canvas element for Paper.js
        const canvas = document.createElement('canvas');
        canvas.style.display = 'none';
        document.body.appendChild(canvas);
        paperScope.setup(canvas);
    }
    
    if (!noiseGenerator && window.SimplexNoise) {
        noiseGenerator = new SimplexNoise();
    }
}

function drawWatercolor(x, y) {
    initializePaper();
    if (!paperScope) {
        drawSplatter(x, y);
        return;
    }
    
    paperScope.activate();
    
    // Create organic watercolor blob
    const size = currentBrushSize * (1.0 + Math.random() * 0.5);
    const center = new paperScope.Point(x, y);
    
    // Create base shape with organic edges
    const path = new paperScope.Path();
    const points = 20;
    const baseRadius = size / 2;
    
    for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const noise = noiseGenerator ? noiseGenerator.noise2D(Math.cos(angle) * 2, Math.sin(angle) * 2) : (Math.random() - 0.5);
        const radius = baseRadius * (1 + noise * 0.3);
        const point = center.add(new paperScope.Point(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius
        ));
        path.add(point);
    }
    
    path.closed = true;
    path.smooth({ type: 'catmull-rom', factor: 0.5 });
    
    // Convert to SVG path
    const svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svgPath.setAttribute('d', path.exportSVG().getAttribute('d'));
    svgPath.setAttribute('fill', 'white');
    svgPath.setAttribute('opacity', '0.9');
    maskGroup.appendChild(svgPath);
    
    // Add bleeding effect with smaller blobs
    const bleedCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < bleedCount; i++) {
        const bleedPath = new paperScope.Path.Circle({
            center: center.add(new paperScope.Point(
                (Math.random() - 0.5) * size * 0.8,
                (Math.random() - 0.5) * size * 0.8
            )),
            radius: size * (0.1 + Math.random() * 0.2)
        });
        
        bleedPath.smooth();
        
        const bleedSvg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        bleedSvg.setAttribute('d', bleedPath.exportSVG().getAttribute('d'));
        bleedSvg.setAttribute('fill', 'white');
        bleedSvg.setAttribute('opacity', '0.7');
        maskGroup.appendChild(bleedSvg);
    }
    
    path.remove();
}



function fillEntireMask() {
    if (!maskGroup || !svgElement) return;
    
    // Create a final rectangle that covers the entire SVG to ensure 100% reveal
    const rect = svgElement.getBoundingClientRect();
    const finalRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    finalRect.setAttribute('x', '0');
    finalRect.setAttribute('y', '0');
    finalRect.setAttribute('width', rect.width);
    finalRect.setAttribute('height', rect.height);
    finalRect.setAttribute('fill', 'white');
    finalRect.setAttribute('opacity', '1');
    maskGroup.appendChild(finalRect);
}

function resetMask() {
    if (!maskGroup) return;
    
    // Clear all reveal shapes
    while (maskGroup.firstChild) {
        maskGroup.removeChild(maskGroup.firstChild);
    }
    
    // Reset reveal points
    revealPoints.forEach(p => p.revealed = false);
    revealProgress = 0;
    
    
    // Restart auto reveal if enabled
    if (autoReveal.checked) {
        startAutoReveal();
    }
}

function updateMaskSize() {
    if (!svgElement || !maskSVG) return;
    
    const rect = svgElement.getBoundingClientRect();
    maskSVG.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
}

function updateSpeed(event) {
    currentSpeed = parseInt(event.target.value);
    speedValue.textContent = currentSpeed + 'ms';
    
    // Save to localStorage
    localStorage.setItem('revealSpeed', currentSpeed);
    
    if (autoReveal.checked && revealInterval) {
        startAutoReveal();
    }
}

function updateBrushSize(event) {
    currentBrushSize = parseInt(event.target.value);
    sizeValue.textContent = currentBrushSize + 'px';
    
    // Save to localStorage
    localStorage.setItem('brushSize', currentBrushSize);
    
    // Regenerate points with new density
    if (svgElement) {
        if (experimentalMode) {
            analyzeContent();
        }
        generateRevealPoints();
        resetMask();
    }
}

function updateBrushType(event) {
    currentBrushType = event.target.value;
    
    // Save to localStorage
    localStorage.setItem('brushType', currentBrushType);
}

function updateRevealDirection(event) {
    currentRevealDirection = event.target.value;
    
    // Save to localStorage
    localStorage.setItem('revealDirection', currentRevealDirection);
    
    // Re-sort existing points if we have them
    if (revealPoints.length > 0) {
        sortRevealPoints();
        
        // If currently revealing, restart with new order
        if (autoReveal.checked && maskGroup) {
            resetMask();
        }
    }
}


function sortRevealPoints() {
    switch(currentRevealDirection) {
        case 'left-right':
            revealPoints.sort((a, b) => {
                // Primary sort by x, secondary by y for same x values
                if (Math.abs(a.x - b.x) < 0.01) {
                    return a.y - b.y;
                }
                return a.x - b.x;
            });
            break;
        case 'right-left':
            revealPoints.sort((a, b) => {
                if (Math.abs(a.x - b.x) < 0.01) {
                    return a.y - b.y;
                }
                return b.x - a.x;
            });
            break;
        case 'top-bottom':
            revealPoints.sort((a, b) => {
                if (Math.abs(a.y - b.y) < 0.01) {
                    return a.x - b.x;
                }
                return a.y - b.y;
            });
            break;
        case 'bottom-top':
            revealPoints.sort((a, b) => {
                if (Math.abs(a.y - b.y) < 0.01) {
                    return a.x - b.x;
                }
                return b.y - a.y;
            });
            break;
        case 'tl-br':
            // Top-left to Bottom-right diagonal
            revealPoints.sort((a, b) => {
                // Sort by sum of normalized x and y coordinates
                const sumA = a.x + a.y;
                const sumB = b.x + b.y;
                if (Math.abs(sumA - sumB) < 0.01) {
                    // For same diagonal, sort by x
                    return a.x - b.x;
                }
                return sumA - sumB;
            });
            break;
        case 'bl-tr':
            // Bottom-left to Top-right diagonal
            revealPoints.sort((a, b) => {
                // Sort by difference of y and x (y - x)
                const diffA = a.y - a.x;
                const diffB = b.y - b.x;
                if (Math.abs(diffA - diffB) < 0.01) {
                    // For same diagonal, sort by x
                    return a.x - b.x;
                }
                return diffB - diffA;
            });
            break;
        case 'center-out':
            revealPoints.sort((a, b) => {
                // Calculate distance from center
                const distA = Math.sqrt(Math.pow(a.x - 0.5, 2) + Math.pow(a.y - 0.5, 2));
                const distB = Math.sqrt(Math.pow(b.x - 0.5, 2) + Math.pow(b.y - 0.5, 2));
                
                // Sort by distance for circular expansion
                return distA - distB;
            });
            break;
        case 'out-center':
            revealPoints.sort((a, b) => {
                const distA = Math.sqrt(Math.pow(a.x - 0.5, 2) + Math.pow(a.y - 0.5, 2));
                const distB = Math.sqrt(Math.pow(b.x - 0.5, 2) + Math.pow(b.y - 0.5, 2));
                // Sort by distance descending (far to near)
                return distB - distA;
            });
            break;
        case 'random':
        default:
            // True random - shuffle all points
            for (let i = revealPoints.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [revealPoints[i], revealPoints[j]] = [revealPoints[j], revealPoints[i]];
            }
            break;
    }
}

function handleAutoRevealToggle() {
    autoRevealActive = autoReveal.checked;
    
    // Save to localStorage
    localStorage.setItem('autoReveal', autoRevealActive);
    
    if (autoRevealActive && maskGroup) {
        startAutoReveal();
    } else {
        clearInterval(revealInterval);
        revealInterval = null;
    }
}


function handleEditKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        event.target.blur();
    }
}

function handleEditFocus(event) {
    const text = event.target.textContent;
    const numberOnly = parseInt(text);
    if (!isNaN(numberOnly)) {
        event.target.textContent = numberOnly;
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(event.target);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

function handleSpeedEditComplete(event) {
    const text = event.target.textContent;
    let value = parseInt(text);
    
    if (!isNaN(value) && value >= 10 && value <= 80) {
        // Round to nearest 10
        value = Math.round(value / 10) * 10;
        currentSpeed = value;
        revealSpeedControl.value = value;
        speedValue.textContent = value + 'ms';
        
        // Save to localStorage
        localStorage.setItem('revealSpeed', currentSpeed);
        
        if (autoReveal.checked && maskGroup) {
            startAutoReveal();
        }
    } else {
        speedValue.textContent = currentSpeed + 'ms';
    }
}

function handleSizeEditComplete(event) {
    const text = event.target.textContent;
    let value = parseInt(text);
    
    if (!isNaN(value) && value >= 20 && value <= 200) {
        // Round to nearest 10
        value = Math.round(value / 10) * 10;
        currentBrushSize = value;
        brushSizeControl.value = value;
        sizeValue.textContent = value + 'px';
        
        // Save to localStorage
        localStorage.setItem('brushSize', currentBrushSize);
    } else {
        sizeValue.textContent = currentBrushSize + 'px';
    }
}

function loadSavedSVG() {
    const savedSVG = localStorage.getItem('savedSVG');
    if (savedSVG) {
        svgContainer.innerHTML = `
            <div class="svg-wrapper">
                ${savedSVG}
            </div>
        `;
        initializeInkMask();
    }
}

function dragStart(e) {
    // Don't drag if clicking on interactive elements
    if (e.target.tagName === 'INPUT' || 
        e.target.tagName === 'LABEL' || 
        e.target.tagName === 'SPAN' || 
        e.target.tagName === 'BUTTON' ||
        e.target.tagName === 'SELECT' ||
        e.target.closest('.control-row') || 
        e.target.closest('.control-group')) {
        return;
    }
    
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    
    if (e.target === controlsPanel || controlsPanel.contains(e.target)) {
        isDragging = true;
        controlsPanel.style.cursor = 'grabbing';
    }
}

function drag(e) {
    if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        
        xOffset = currentX;
        yOffset = currentY;
        
        controlsPanel.style.transform = `translate(${currentX}px, ${currentY}px)`;
    }
}

function dragEnd(e) {
    initialX = currentX;
    initialY = currentY;
    
    isDragging = false;
    controlsPanel.style.cursor = 'grab';
    
    // Save position to localStorage
    localStorage.setItem('panelPosition', JSON.stringify({ x: xOffset, y: yOffset }));
}

function loadSavedPanelPosition() {
    const savedPosition = localStorage.getItem('panelPosition');
    if (savedPosition) {
        const position = JSON.parse(savedPosition);
        xOffset = position.x;
        yOffset = position.y;
        controlsPanel.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
    }
}

function loadSavedSettings() {
    // Load reveal speed
    const savedSpeed = localStorage.getItem('revealSpeed');
    if (savedSpeed) {
        currentSpeed = parseInt(savedSpeed);
        revealSpeedControl.value = currentSpeed;
        speedValue.textContent = currentSpeed + 'ms';
    }
    
    // Load brush size
    const savedSize = localStorage.getItem('brushSize');
    if (savedSize) {
        currentBrushSize = parseInt(savedSize);
        brushSizeControl.value = currentBrushSize;
        sizeValue.textContent = currentBrushSize + 'px';
    }
    
    // Load brush type
    const savedType = localStorage.getItem('brushType');
    if (savedType) {
        currentBrushType = savedType;
        brushTypeSelect.value = currentBrushType;
    }
    
    // Load auto reveal setting
    const savedAutoReveal = localStorage.getItem('autoReveal');
    if (savedAutoReveal !== null) {
        autoRevealActive = savedAutoReveal === 'true';
        autoReveal.checked = autoRevealActive;
    }
    
    // Load experimental setting
    const savedExperimental = localStorage.getItem('experimental');
    if (savedExperimental !== null) {
        experimentalMode = savedExperimental === 'true';
        experimentalCheckbox.checked = experimentalMode;
    }
    
    // Load reveal direction
    const savedDirection = localStorage.getItem('revealDirection');
    if (savedDirection) {
        currentRevealDirection = savedDirection;
        revealDirectionSelect.value = currentRevealDirection;
    }
    
}

function analyzeContent() {
    contentAreas = [];
    
    if (!svgElement) return;
    
    
    // Get SVG viewBox for proper coordinate transformation
    let viewBox = svgElement.viewBox?.baseVal;
    let svgWidth, svgHeight, viewBoxX = 0, viewBoxY = 0;
    
    if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
        svgWidth = viewBox.width;
        svgHeight = viewBox.height;
        viewBoxX = viewBox.x;
        viewBoxY = viewBox.y;
    } else {
        // Fallback to getBoundingClientRect
        const svgRect = svgElement.getBoundingClientRect();
        svgWidth = svgElement.width?.baseVal?.value || svgRect.width;
        svgHeight = svgElement.height?.baseVal?.value || svgRect.height;
    }
    
    // Get all visual elements in the SVG, including nested ones
    const visualElements = svgElement.querySelectorAll('path, circle, rect, ellipse, line, polyline, polygon, text, image, use');
    
    // Also process groups but not their children (to avoid duplicates)
    const groups = svgElement.querySelectorAll('g');
    const processedElements = new Set();
    
    // Helper function to check if element has visible fill or stroke
    function hasVisibleContent(element) {
        const computedStyle = window.getComputedStyle(element);
        const fill = computedStyle.fill;
        const stroke = computedStyle.stroke;
        const fillOpacity = computedStyle.fillOpacity;
        const strokeOpacity = computedStyle.strokeOpacity;
        
        // Check if element has visible fill
        const hasVisibleFill = fill && fill !== 'none' && fill !== 'transparent' && 
                               fillOpacity !== '0' && computedStyle.opacity !== '0';
        
        // Check if element has visible stroke
        const hasVisibleStroke = stroke && stroke !== 'none' && stroke !== 'transparent' && 
                                strokeOpacity !== '0' && computedStyle.opacity !== '0' &&
                                parseFloat(computedStyle.strokeWidth) > 0;
        
        return hasVisibleFill || hasVisibleStroke;
    }
    
    // Process visual elements
    visualElements.forEach(element => {
        try {
            // Skip if already processed as part of a group
            if (processedElements.has(element)) return;
            
            // Skip if element is not visible
            const computedStyle = window.getComputedStyle(element);
            if (computedStyle.display === 'none' || 
                computedStyle.visibility === 'hidden' ||
                computedStyle.opacity === '0') {
                return;
            }
            
            // Skip if element has no visible content
            if (!hasVisibleContent(element)) {
                return;
            }
            
            // Get bounding box in SVG coordinate space
            let bbox;
            if (element.getBBox) {
                try {
                    bbox = element.getBBox();
                    
                    // Skip empty bounding boxes
                    if (bbox.width === 0 || bbox.height === 0) {
                        return;
                    }
                    
                    // Apply any transform on the element
                    const transform = element.getCTM();
                    if (transform) {
                        // Transform the bbox corners
                        const corners = [
                            { x: bbox.x, y: bbox.y },
                            { x: bbox.x + bbox.width, y: bbox.y },
                            { x: bbox.x, y: bbox.y + bbox.height },
                            { x: bbox.x + bbox.width, y: bbox.y + bbox.height }
                        ];
                        
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        corners.forEach(corner => {
                            const transformed = svgElement.createSVGPoint();
                            transformed.x = corner.x;
                            transformed.y = corner.y;
                            const result = transformed.matrixTransform(transform);
                            minX = Math.min(minX, result.x);
                            minY = Math.min(minY, result.y);
                            maxX = Math.max(maxX, result.x);
                            maxY = Math.max(maxY, result.y);
                        });
                        
                        bbox = {
                            x: minX - viewBoxX,
                            y: minY - viewBoxY,
                            width: maxX - minX,
                            height: maxY - minY
                        };
                    }
                } catch (e) {
                    // Some elements might throw on getBBox, skip them
                    return;
                }
            } else {
                return;
            }
            
            // Convert to relative coordinates (0-1 range)
            if (bbox.width > 0 && bbox.height > 0) {
                contentAreas.push({
                    x: bbox.x / svgWidth,
                    y: bbox.y / svgHeight,
                    width: bbox.width / svgWidth,
                    height: bbox.height / svgHeight
                });
            }
            
            processedElements.add(element);
        } catch (e) {
            // Skip elements that can't be measured
        }
    });
    
    // Process groups
    groups.forEach(group => {
        try {
            if (processedElements.has(group)) return;
            
            const computedStyle = window.getComputedStyle(group);
            if (computedStyle.display === 'none' || 
                computedStyle.visibility === 'hidden' ||
                computedStyle.opacity === '0') {
                return;
            }
            
            // Check if group has any visible children
            const children = group.querySelectorAll('*');
            let hasVisible = false;
            for (let child of children) {
                if (hasVisibleContent(child)) {
                    hasVisible = true;
                    break;
                }
            }
            
            if (!hasVisible) return;
            
            const bbox = group.getBBox();
            if (bbox.width > 0 && bbox.height > 0) {
                // Apply group transform
                const transform = group.getCTM();
                if (transform) {
                    // Similar transform logic as above
                    const corners = [
                        { x: bbox.x, y: bbox.y },
                        { x: bbox.x + bbox.width, y: bbox.y },
                        { x: bbox.x, y: bbox.y + bbox.height },
                        { x: bbox.x + bbox.width, y: bbox.y + bbox.height }
                    ];
                    
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    corners.forEach(corner => {
                        const transformed = svgElement.createSVGPoint();
                        transformed.x = corner.x;
                        transformed.y = corner.y;
                        const result = transformed.matrixTransform(transform);
                        minX = Math.min(minX, result.x);
                        minY = Math.min(minY, result.y);
                        maxX = Math.max(maxX, result.x);
                        maxY = Math.max(maxY, result.y);
                    });
                    
                    contentAreas.push({
                        x: (minX - viewBoxX) / svgWidth,
                        y: (minY - viewBoxY) / svgHeight,
                        width: (maxX - minX) / svgWidth,
                        height: (maxY - minY) / svgHeight
                    });
                } else {
                    contentAreas.push({
                        x: bbox.x / svgWidth,
                        y: bbox.y / svgHeight,
                        width: bbox.width / svgWidth,
                        height: bbox.height / svgHeight
                    });
                }
                
                // Mark all children as processed
                children.forEach(child => processedElements.add(child));
            }
            
            processedElements.add(group);
        } catch (e) {
            // Skip groups that can't be measured
        }
    });
    
    // Filter out areas that are outside the viewBox
    contentAreas = contentAreas.filter(area => {
        return area.x < 1 && area.y < 1 && 
               area.x + area.width > 0 && area.y + area.height > 0;
    });
    
    // Merge overlapping areas with more intelligent merging
    contentAreas = mergeOverlappingAreas(contentAreas);
    
}

function mergeOverlappingAreas(areas) {
    if (areas.length === 0) return areas;
    
    // First pass: merge truly overlapping areas
    let merged = [];
    const used = new Array(areas.length).fill(false);
    
    for (let i = 0; i < areas.length; i++) {
        if (used[i]) continue;
        
        let current = {...areas[i]};
        used[i] = true;
        
        // Check for overlaps with remaining areas
        let foundOverlap;
        do {
            foundOverlap = false;
            for (let j = i + 1; j < areas.length; j++) {
                if (used[j]) continue;
                
                const other = areas[j];
                
                // Check if areas actually overlap (no padding for first pass)
                if (!(current.x + current.width < other.x || 
                      other.x + other.width < current.x || 
                      current.y + current.height < other.y || 
                      other.y + other.height < current.y)) {
                    
                    // Merge areas
                    const minX = Math.min(current.x, other.x);
                    const minY = Math.min(current.y, other.y);
                    const maxX = Math.max(current.x + current.width, other.x + other.width);
                    const maxY = Math.max(current.y + current.height, other.y + other.height);
                    
                    current = {
                        x: minX,
                        y: minY,
                        width: maxX - minX,
                        height: maxY - minY
                    };
                    
                    used[j] = true;
                    foundOverlap = true;
                }
            }
        } while (foundOverlap);
        
        merged.push(current);
    }
    
    // Second pass: merge very close areas (but be more conservative)
    const finalMerged = [];
    const secondPassUsed = new Array(merged.length).fill(false);
    
    for (let i = 0; i < merged.length; i++) {
        if (secondPassUsed[i]) continue;
        
        let current = {...merged[i]};
        secondPassUsed[i] = true;
        
        // Only merge if areas are VERY close and would benefit from merging
        let foundClose;
        do {
            foundClose = false;
            for (let j = i + 1; j < merged.length; j++) {
                if (secondPassUsed[j]) continue;
                
                const other = merged[j];
                
                // Calculate distance between areas
                const xGap = Math.max(0, Math.max(other.x - (current.x + current.width), 
                                                  current.x - (other.x + other.width)));
                const yGap = Math.max(0, Math.max(other.y - (current.y + current.height), 
                                                  current.y - (other.y + other.height)));
                
                // Only merge if very close (2% of viewport) and aligned on one axis
                const maxGap = 0.02;
                const shouldMerge = (xGap < maxGap && yGap < maxGap) ||
                                   (xGap === 0 && yGap < maxGap * 3) || // Vertically aligned
                                   (yGap === 0 && xGap < maxGap * 3);    // Horizontally aligned
                
                if (shouldMerge) {
                    // Check if merging would create a reasonably sized area
                    const minX = Math.min(current.x, other.x);
                    const minY = Math.min(current.y, other.y);
                    const maxX = Math.max(current.x + current.width, other.x + other.width);
                    const maxY = Math.max(current.y + current.height, other.y + other.height);
                    
                    const newWidth = maxX - minX;
                    const newHeight = maxY - minY;
                    
                    // Don't merge if it would create an area that's too large relative to content
                    const currentArea = current.width * current.height;
                    const otherArea = other.width * other.height;
                    const newArea = newWidth * newHeight;
                    const contentRatio = (currentArea + otherArea) / newArea;
                    
                    if (contentRatio > 0.3) { // At least 30% of merged area should be content
                        current = {
                            x: minX,
                            y: minY,
                            width: newWidth,
                            height: newHeight
                        };
                        
                        secondPassUsed[j] = true;
                        foundClose = true;
                    }
                }
            }
        } while (foundClose);
        
        finalMerged.push(current);
    }
    
    // Sort by area size (larger areas first) for better reveal order
    finalMerged.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    
    return finalMerged;
}

function handleExperimentalToggle() {
    experimentalMode = experimentalCheckbox.checked;
    
    // Save to localStorage
    localStorage.setItem('experimental', experimentalMode);
    
    // Only regenerate if we have an SVG loaded
    if (svgElement && maskGroup) {
        if (experimentalMode) {
            analyzeContent();
        }
        generateRevealPoints();
        resetMask();
    }
}