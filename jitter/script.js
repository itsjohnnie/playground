let jitterInterval = null;
let currentSpeed = 200;
let currentIntensity = 3;
let filterCounter = 0;

const svgUpload = document.getElementById('svgUpload');
const svgContainer = document.getElementById('svgContainer');
const speedControl = document.getElementById('speedControl');
const speedValue = document.getElementById('speedValue');
const intensityControl = document.getElementById('intensityControl');
const intensityValue = document.getElementById('intensityValue');
const realisticJitter = document.getElementById('realisticJitter');
const uploadLabel = document.querySelector('.upload-label');

svgUpload.addEventListener('change', handleFileUpload);
speedControl.addEventListener('input', updateSpeed);
intensityControl.addEventListener('input', updateIntensity);
realisticJitter.addEventListener('change', handleRealisticToggle);

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
intensityValue.addEventListener('keydown', handleEditKeydown);
intensityValue.addEventListener('focus', handleEditFocus);
intensityValue.addEventListener('blur', handleIntensityEditComplete);

// Load saved SVG on page load
window.addEventListener('DOMContentLoaded', () => {
    loadSavedSVG();
    loadSavedPanelPosition();
});

// Keyboard shortcuts
window.addEventListener('keydown', (event) => {
    // Check if user is typing in an input field
    if (event.target.tagName === 'INPUT' || event.target.contentEditable === 'true') {
        return;
    }
    
    // Space key to pause/resume jitter
    if (event.key === ' ') {
        event.preventDefault();
        toggleJitter();
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
        svgContainer.innerHTML = svgContent;
        
        // Save SVG to localStorage
        localStorage.setItem('savedSVG', svgContent);
        
        const svg = svgContainer.querySelector('svg');
        if (svg) {
            svg.style.transition = 'none';
            startJitterAnimation(svg);
        }
    };
    
    reader.readAsText(file);
}

function startJitterAnimation(svg) {
    if (jitterInterval) {
        clearInterval(jitterInterval);
    }
    
    if (realisticJitter.checked) {
        createRealisticJitterFilter(svg);
        jitterInterval = setInterval(() => {
            updateRealisticJitter(svg);
        }, currentSpeed);
    } else {
        removeRealisticJitterFilter(svg);
        jitterInterval = setInterval(() => {
            const x = (Math.random() - 0.5) * currentIntensity * 2;
            const y = (Math.random() - 0.5) * currentIntensity * 2;
            const rotate = (Math.random() - 0.5) * currentIntensity * 0.5;
            
            svg.style.transform = `translate(${x}px, ${y}px) rotate(${rotate}deg)`;
        }, currentSpeed);
    }
}

function updateSpeed(event) {
    currentSpeed = parseInt(event.target.value);
    speedValue.textContent = currentSpeed + 'ms';
    
    const svg = svgContainer.querySelector('svg');
    if (svg) {
        startJitterAnimation(svg);
    }
}

function updateIntensity(event) {
    currentIntensity = parseInt(event.target.value);
    intensityValue.textContent = currentIntensity + 'px';
}

function stopJitterAnimation() {
    if (jitterInterval) {
        clearInterval(jitterInterval);
        jitterInterval = null;
    }
}

function handleRealisticToggle() {
    const svg = svgContainer.querySelector('svg');
    if (svg) {
        startJitterAnimation(svg);
    }
}

function createRealisticJitterFilter(svg) {
    const defs = svg.querySelector('defs') || svg.insertBefore(document.createElementNS('http://www.w3.org/2000/svg', 'defs'), svg.firstChild);
    
    const existingFilter = defs.querySelector('#jitter-filter');
    if (existingFilter) {
        existingFilter.remove();
    }
    
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'jitter-filter');
    
    const turbulence = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence');
    turbulence.setAttribute('type', 'fractalNoise');
    turbulence.setAttribute('baseFrequency', '0.04');
    turbulence.setAttribute('numOctaves', '5');
    turbulence.setAttribute('result', 'noise');
    turbulence.setAttribute('seed', '0');
    
    const displacement = document.createElementNS('http://www.w3.org/2000/svg', 'feDisplacementMap');
    displacement.setAttribute('in', 'SourceGraphic');
    displacement.setAttribute('in2', 'noise');
    displacement.setAttribute('scale', currentIntensity.toString());
    
    filter.appendChild(turbulence);
    filter.appendChild(displacement);
    defs.appendChild(filter);
    
    svg.style.filter = 'url(#jitter-filter)';
}

function updateRealisticJitter(svg) {
    const turbulence = svg.querySelector('feTurbulence');
    if (turbulence) {
        filterCounter++;
        turbulence.setAttribute('seed', filterCounter.toString());
        
        const displacement = svg.querySelector('feDisplacementMap');
        if (displacement) {
            displacement.setAttribute('scale', currentIntensity.toString());
        }
    }
}

function removeRealisticJitterFilter(svg) {
    svg.style.filter = '';
    const filter = svg.querySelector('#jitter-filter');
    if (filter) {
        filter.remove();
    }
}

function loadSavedSVG() {
    const savedSVG = localStorage.getItem('savedSVG');
    if (savedSVG) {
        svgContainer.innerHTML = savedSVG;
        const svg = svgContainer.querySelector('svg');
        if (svg) {
            svg.style.transition = 'none';
            startJitterAnimation(svg);
        }
    }
}

function toggleJitter() {
    const svg = svgContainer.querySelector('svg');
    if (!svg) return;
    
    if (jitterInterval) {
        // Pause jitter - just stop the interval, keep current state
        clearInterval(jitterInterval);
        jitterInterval = null;
    } else {
        // Resume jitter from current state
        startJitterAnimation(svg);
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
    
    if (!isNaN(value) && value >= 50 && value <= 500) {
        // Round to nearest 10
        value = Math.round(value / 10) * 10;
        currentSpeed = value;
        speedControl.value = value;
        speedValue.textContent = value + 'ms';
        
        const svg = svgContainer.querySelector('svg');
        if (svg) {
            startJitterAnimation(svg);
        }
    } else {
        speedValue.textContent = currentSpeed + 'ms';
    }
}

function handleIntensityEditComplete(event) {
    const text = event.target.textContent;
    const value = parseInt(text);
    
    if (!isNaN(value) && value >= 1 && value <= 16) {
        currentIntensity = value;
        intensityControl.value = value;
        intensityValue.textContent = value + 'px';
    } else {
        intensityValue.textContent = currentIntensity + 'px';
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