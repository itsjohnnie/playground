// Canvas setup
const canvas = document.getElementById('waterCanvas');
const ctx = canvas.getContext('2d');
const permissionBtn = document.getElementById('requestPermission');

// Set canvas resolution
const setCanvasSize = () => {
    const container = canvas.parentElement;
    const size = container.offsetWidth;
    canvas.width = size;
    canvas.height = size;
};

setCanvasSize();
window.addEventListener('resize', setCanvasSize);

// Physics constants
const GRAVITY = 0.5;
const DAMPING = 0.98;
const PARTICLE_COUNT = 150;
const PARTICLE_RADIUS = 3;
const LIQUID_COLOR = 'rgba(64, 156, 255, 0.8)';
const SURFACE_TENSION = 0.02;

// Device orientation
let tiltX = 0;
let tiltY = 0;

// Particle class
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.radius = PARTICLE_RADIUS;
    }

    update() {
        // Apply gravity with device tilt
        this.vx += tiltX * GRAVITY;
        this.vy += tiltY * GRAVITY + GRAVITY * 0.3;

        // Apply damping
        this.vx *= DAMPING;
        this.vy *= DAMPING;

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Circle boundary collision
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = canvas.width / 2 - this.radius;

        const dx = this.x - centerX;
        const dy = this.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > maxRadius) {
            // Normalize and place on boundary
            const angle = Math.atan2(dy, dx);
            this.x = centerX + Math.cos(angle) * maxRadius;
            this.y = centerY + Math.sin(angle) * maxRadius;

            // Reflect velocity
            const normalX = dx / distance;
            const normalY = dy / distance;
            const dot = this.vx * normalX + this.vy * normalY;
            this.vx -= 2 * dot * normalX * 0.7;
            this.vy -= 2 * dot * normalY * 0.7;
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = LIQUID_COLOR;
        ctx.fill();
    }
}

// Create particles
const particles = [];
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const initialRadius = canvas.width * 0.25;

for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / PARTICLE_COUNT;
    const radius = Math.random() * initialRadius;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius + canvas.height * 0.15;
    particles.push(new Particle(x, y));
}

// Apply particle interactions (surface tension)
const applyInteractions = () => {
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[j].x - particles[i].x;
            const dy = particles[j].y - particles[i].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDist = PARTICLE_RADIUS * 4;

            if (distance < minDist && distance > 0) {
                const force = (minDist - distance) * SURFACE_TENSION;
                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;

                particles[i].vx -= fx;
                particles[i].vy -= fy;
                particles[j].vx += fx;
                particles[j].vy += fy;
            }
        }
    }
};

// Device motion handler
const handleOrientation = (event) => {
    if (event.beta !== null && event.gamma !== null) {
        // beta: front-to-back tilt (-180 to 180)
        // gamma: left-to-right tilt (-90 to 90)
        tiltX = Math.max(-1, Math.min(1, event.gamma / 45));
        tiltY = Math.max(-1, Math.min(1, event.beta / 45));
    }
};

const handleMotion = (event) => {
    if (event.accelerationIncludingGravity) {
        const ax = event.accelerationIncludingGravity.x;
        const ay = event.accelerationIncludingGravity.y;

        if (ax !== null && ay !== null) {
            tiltX = Math.max(-1, Math.min(1, ax / 10));
            tiltY = Math.max(-1, Math.min(1, -ay / 10));
        }
    }
};

// Request permission for iOS 13+
const requestPermission = async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission === 'granted') {
                window.addEventListener('deviceorientation', handleOrientation);
                permissionBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('Permission denied:', error);
        }
    } else if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceMotionEvent.requestPermission();
            if (permission === 'granted') {
                window.addEventListener('devicemotion', handleMotion);
                permissionBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('Permission denied:', error);
        }
    }
};

// Initialize device motion
if (typeof DeviceOrientationEvent !== 'undefined') {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+ requires user interaction
        permissionBtn.style.display = 'block';
        permissionBtn.addEventListener('click', requestPermission);
    } else {
        // Android and older iOS
        window.addEventListener('deviceorientation', handleOrientation);
        window.addEventListener('devicemotion', handleMotion);
    }
}

// Metaball rendering for smooth liquid effect
const drawMetaballs = () => {
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;

    for (let x = 0; x < canvas.width; x += 2) {
        for (let y = 0; y < canvas.height; y += 2) {
            let sum = 0;

            for (const particle of particles) {
                const dx = x - particle.x;
                const dy = y - particle.y;
                const distSq = dx * dx + dy * dy;
                if (distSq > 0) {
                    sum += (particle.radius * particle.radius * 100) / distSq;
                }
            }

            if (sum > 1) {
                const index = (y * canvas.width + x) * 4;
                const nextIndex = ((y + 1) * canvas.width + x) * 4;
                const rightIndex = (y * canvas.width + x + 1) * 4;
                const diagIndex = ((y + 1) * canvas.width + x + 1) * 4;

                // Set 2x2 block
                for (const i of [index, nextIndex, rightIndex, diagIndex]) {
                    if (i < data.length) {
                        data[i] = 64;      // R
                        data[i + 1] = 156; // G
                        data[i + 2] = 255; // B
                        data[i + 3] = 200; // A
                    }
                }
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
};

// Animation loop
const animate = () => {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw particles
    applyInteractions();
    particles.forEach(particle => particle.update());

    // Draw metaballs for smooth liquid effect
    drawMetaballs();

    // Simple particle rendering (fallback/overlay)
    particles.forEach(particle => particle.draw());

    requestAnimationFrame(animate);
};

// Start animation
animate();

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        setCanvasSize();
    }
});
