// Get DOM elements
const iconContent = document.querySelector('.icon-content');
const innerBorder = document.querySelector('.inner-border');
const glowLayer = document.querySelector('.glow-layer');
const glassLayer = document.querySelector('.glass-layer');
const requestButton = document.getElementById('requestPermission');

// State
let isMotionEnabled = false;
let gamma = 0; // left-right tilt (-90 to 90)
let beta = 0;  // front-back tilt (-180 to 180)

// Check if device motion permission is needed (iOS 13+)
function checkMotionPermission() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+ requires permission
        requestButton.style.display = 'block';
        requestButton.addEventListener('click', requestMotionPermission);
    } else {
        // Permission not needed or already granted
        enableMotion();
    }
}

// Request motion permission for iOS
async function requestMotionPermission() {
    try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
            requestButton.style.display = 'none';
            enableMotion();
        } else {
            alert('Motion permission denied. The effect requires device motion access.');
        }
    } catch (error) {
        console.error('Error requesting motion permission:', error);
        alert('Error requesting motion permission: ' + error.message);
    }
}

// Enable motion tracking
function enableMotion() {
    isMotionEnabled = true;
    window.addEventListener('deviceorientation', handleOrientation, true);

    // Start animation loop
    requestAnimationFrame(updateIcon);
}

// Handle device orientation changes
function handleOrientation(event) {
    // gamma: left-right tilt in degrees (-90 to 90)
    // beta: front-back tilt in degrees (-180 to 180)
    gamma = event.gamma || 0;
    beta = event.beta || 0;
}

// Smooth animation values
let smoothGamma = 0;
let smoothBeta = 0;
const smoothing = 0.1;

// Update icon appearance based on orientation
function updateIcon() {
    if (isMotionEnabled) {
        // Smooth the values
        smoothGamma += (gamma - smoothGamma) * smoothing;
        smoothBeta += (beta - smoothBeta) * smoothing;

        // Calculate glow position (inverted for natural feel)
        // When tilted right, glow appears on left, etc.
        const glowX = 50 - (smoothGamma * 1.5); // -90 to 90 becomes ~185 to -85
        const glowY = 50 - ((smoothBeta - 45) * 1.5); // Adjust for typical phone holding angle

        // Clamp values
        const clampedX = Math.max(0, Math.min(100, glowX));
        const clampedY = Math.max(0, Math.min(100, glowY));

        // Update glow position
        glowLayer.style.setProperty('--glow-x', `${clampedX}%`);
        glowLayer.style.setProperty('--glow-y', `${clampedY}%`);

        // Calculate glass gradient angle based on tilt
        const angle = Math.atan2(smoothBeta - 45, smoothGamma) * (180 / Math.PI);
        glassLayer.style.setProperty('--glass-angle', `${angle + 135}deg`);

        // Calculate shine intensity based on tilt
        const tiltIntensity = Math.sqrt(smoothGamma * smoothGamma + (smoothBeta - 45) * (smoothBeta - 45)) / 90;
        const shineOpacity = 0.3 + (tiltIntensity * 0.4);
        glassLayer.style.setProperty('--shine-opacity', shineOpacity);

        // Update inner border based on gyroscope
        // Border angle follows the tilt direction
        const borderAngle = angle + 90; // Perpendicular to the glass angle for nice effect
        innerBorder.style.setProperty('--border-angle', `${borderAngle}deg`);

        // Calculate which edge is "up" (brightest) based on tilt
        // Normalize gamma and beta to create color intensity
        const normalizedGamma = smoothGamma / 90; // -1 to 1
        const normalizedBeta = (smoothBeta - 45) / 90; // -1 to 1

        // Create dynamic border colors based on position
        // The side facing "up" gets brighter
        const brightnessBoost = 1 + (tiltIntensity * 0.5);
        const baseOpacity = 0.6 + (tiltIntensity * 0.3);

        innerBorder.style.setProperty('--border-color-1', `rgba(147, 197, 253, ${baseOpacity * brightnessBoost})`);
        innerBorder.style.setProperty('--border-color-2', `rgba(96, 165, 250, ${baseOpacity * 0.8})`);
        innerBorder.style.setProperty('--border-color-3', `rgba(59, 130, 246, ${baseOpacity * 0.6})`);
        innerBorder.style.setProperty('--border-opacity', 0.8 + (tiltIntensity * 0.2));

        // Apply 3D transform to icon
        const maxTilt = 15; // degrees
        const tiltX = (smoothBeta - 45) / 6; // Front-back tilt
        const tiltY = -smoothGamma / 6; // Left-right tilt

        const clampedTiltX = Math.max(-maxTilt, Math.min(maxTilt, tiltX));
        const clampedTiltY = Math.max(-maxTilt, Math.min(maxTilt, tiltY));

        iconContent.style.transform = `
            perspective(1000px)
            rotateX(${clampedTiltX}deg)
            rotateY(${clampedTiltY}deg)
            scale(1.0)
        `;
    }

    requestAnimationFrame(updateIcon);
}

// Fallback mouse/touch interaction for desktop
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (e) => {
    if (!isMotionEnabled) {
        const rect = iconContent.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        mouseX = ((e.clientX - centerX) / window.innerWidth) * 100;
        mouseY = ((e.clientY - centerY) / window.innerHeight) * 100;

        // Update glow position based on mouse
        const glowX = 50 + mouseX * 2;
        const glowY = 50 + mouseY * 2;

        glowLayer.style.setProperty('--glow-x', `${glowX}%`);
        glowLayer.style.setProperty('--glow-y', `${glowY}%`);

        // Apply subtle 3D transform
        const tiltX = -mouseY / 5;
        const tiltY = mouseX / 5;

        iconContent.style.transform = `
            perspective(1000px)
            rotateX(${tiltX}deg)
            rotateY(${tiltY}deg)
            scale(1.0)
        `;

        // Update glass angle
        const angle = Math.atan2(mouseY, mouseX) * (180 / Math.PI);
        glassLayer.style.setProperty('--glass-angle', `${angle + 135}deg`);

        // Update inner border for mouse interaction
        const borderAngle = angle + 90;
        innerBorder.style.setProperty('--border-angle', `${borderAngle}deg`);

        const distance = Math.sqrt(mouseX * mouseX + mouseY * mouseY) / 100;
        const baseOpacity = 0.6 + (distance * 0.3);
        const brightnessBoost = 1 + (distance * 0.5);

        innerBorder.style.setProperty('--border-color-1', `rgba(147, 197, 253, ${baseOpacity * brightnessBoost})`);
        innerBorder.style.setProperty('--border-color-2', `rgba(96, 165, 250, ${baseOpacity * 0.8})`);
        innerBorder.style.setProperty('--border-color-3', `rgba(59, 130, 246, ${baseOpacity * 0.6})`);
        innerBorder.style.setProperty('--border-opacity', 0.8 + (distance * 0.2));
    }
});

// Initialize
checkMotionPermission();

// Start animation loop even without motion (for mouse interaction)
if (!isMotionEnabled) {
    requestAnimationFrame(updateIcon);
}
