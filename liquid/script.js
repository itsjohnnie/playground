// Canvas setup
const canvas = document.getElementById('waterCanvas');
const ctx = canvas.getContext('2d');
const glCanvas = document.getElementById('glCanvas');
const gl = glCanvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
const permissionBtn = document.getElementById('requestPermission');
const tiltDebug = document.getElementById('tiltDebug');
const controlMessage = document.getElementById('controlMessage');

// Detect if device is mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                 (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

// Set appropriate message
if (isMobile) {
    controlMessage.textContent = 'Tilt your device to move the liquid';
} else {
    controlMessage.textContent = 'Use arrow keys or WASD to tilt';
}

// Set canvas resolution
const setCanvasSize = () => {
    const container = canvas.parentElement;
    const size = container.offsetWidth;
    const dpr = 1; // Use 1:1 pixel ratio for simplicity

    canvas.width = size;
    canvas.height = size;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';

    glCanvas.width = size;
    glCanvas.height = size;
    glCanvas.style.width = size + 'px';
    glCanvas.style.height = size + 'px';

    if (gl) {
        gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    }
};

setCanvasSize();

// Physics mode - SPH only
let physicsMode = 'sph';

// SPH Physics constants - matching reference implementation
const SPH_GRAVITY = 0.05;
const SPH_PARTICLE_COUNT = 600;
const SPH_PARTICLE_RADIUS = 2.5;
const INTERACTION_RADIUS = 16;
const INTERACTION_RADIUS_SQ = INTERACTION_RADIUS * INTERACTION_RADIUS;
const REST_DENSITY = 2.5;
const FORCE_CONSTANT = 1;
const NEAR_FORCE_CONSTANT = 1;
const PLASTICITY = 0.1; // Viscosity coefficient

// Grid Physics constants - tuned for liquid behavior
const GRID_GRAVITY = 0.4;
const GRID_DAMPING = 0.99; // Less damping
const GRID_PARTICLE_COUNT = 400;
const GRID_PARTICLE_RADIUS = 2.5;
const GRID_BOUNCE = 0.4; // Less bouncy
const GRID_FRICTION = 0.95; // More friction for cohesion
const GRID_SIZE = 25; // Smaller cells for better collision detection

// Device orientation - amplified for dramatic effect
let tiltX = 0;
let tiltY = 0;
let smoothTiltX = 0;
let smoothTiltY = 0;

// SPH Particle class - matching reference implementation
class SPHParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.fx = 0;
        this.fy = 0;
        this.radius = SPH_PARTICLE_RADIUS;
        this.density = 0;
        this.nearDensity = 0;
        this.gridX = 0;
        this.gridY = 0;
    }

    update(dt) {
        // Apply gravity - downward force is constant, tilt just rotates the direction
        const baseGravity = 0.15; // Stronger base gravity
        const gravityX = smoothTiltX * baseGravity;
        const gravityY = baseGravity + smoothTiltY * baseGravity;

        this.vy += gravityY;
        this.vx += gravityX;

        // Apply forces from density pressure
        if (this.density > 0) {
            this.vx += this.fx / (this.density * 0.9 + 0.1);
            this.vy += this.fy / (this.density * 0.9 + 0.1);
        }

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Circle boundary collision - constrain to circular boundary
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = canvas.width / 2 - 10; // 2px more padding from border

        const dx = this.x - centerX;
        const dy = this.y - centerY;
        const distSq = dx * dx + dy * dy;
        const maxRadiusSq = maxRadius * maxRadius;

        if (distSq > maxRadiusSq) {
            const distance = Math.sqrt(distSq);
            const excess = distance - maxRadius;

            // Push particle back inside
            const nx = dx / distance;
            const ny = dy / distance;

            this.x = centerX + nx * maxRadius;
            this.y = centerY + ny * maxRadius;

            // Apply damping to velocity in the direction of the normal
            const dot = this.vx * nx + this.vy * ny;
            this.vx -= dot * nx * 1.5;
            this.vy -= dot * ny * 1.5;
        }
    }
}

// Grid-based Particle class
class GridParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.radius = GRID_PARTICLE_RADIUS;
        this.gridX = 0;
        this.gridY = 0;
        this.density = 1.0; // Add density for rendering compatibility
    }

    update(dt) {
        const gravityMultiplier = 2.5;
        const gravityX = smoothTiltX * GRID_GRAVITY * gravityMultiplier;
        const gravityY = smoothTiltY * GRID_GRAVITY * gravityMultiplier + GRID_GRAVITY;

        this.vx += gravityX * dt;
        this.vy += gravityY * dt;

        // Apply damping
        this.vx *= GRID_DAMPING;
        this.vy *= GRID_DAMPING;

        // Update position
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Circle boundary collision
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = canvas.width / 2 - this.radius * 3;

        const dx = this.x - centerX;
        const dy = this.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > maxRadius) {
            const angle = Math.atan2(dy, dx);
            this.x = centerX + Math.cos(angle) * maxRadius;
            this.y = centerY + Math.sin(angle) * maxRadius;

            const normalX = dx / distance;
            const normalY = dy / distance;
            const dot = this.vx * normalX + this.vy * normalY;

            this.vx = (this.vx - 2 * dot * normalX) * GRID_BOUNCE;
            this.vy = (this.vy - 2 * dot * normalY) * GRID_BOUNCE;
        }

        // Update grid position
        this.gridX = Math.floor(this.x / GRID_SIZE);
        this.gridY = Math.floor(this.y / GRID_SIZE);
    }
}

// Initialize particles after canvas is sized
let particles = [];
let spatialGrid = {};
let neighbors = [];
let neighborCount = 0;

// Spatial grid setup
const GRID_CELLS = 18;
const gridScale = GRID_CELLS / canvas.width;

const initParticles = () => {
    particles = [];
    spatialGrid = {};
    neighbors = [];

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const initialRadius = canvas.width * 0.3;

    const particleCount = SPH_PARTICLE_COUNT;
    const ParticleClass = SPHParticle;

    // Create particles with uniform random distribution
    for (let i = 0; i < particleCount; i++) {
        // Uniform random distribution within circle
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.sqrt(Math.random()) * initialRadius;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius + canvas.height * 0.08;
        particles.push(new ParticleClass(x, y));
    }

    // Pre-allocate neighbor pairs
    for (let i = 0; i < 10000; i++) {
        neighbors[i] = { p1: null, p2: null, dist: 0, nx: 0, ny: 0, weight: 0 };
    }
};

// Initialize particles after first canvas setup
initParticles();

// SPH kernel functions (optimized)
const smoothingKernel = (distance, radius) => {
    if (distance >= radius) return 0;
    const volume = (Math.PI * Math.pow(radius, 4)) / 6;
    return Math.max(0, Math.pow(radius - distance, 2)) / volume;
};

const smoothingKernelDerivative = (distance, radius) => {
    if (distance >= radius) return 0;
    const scale = 12 / (Math.PI * Math.pow(radius, 4));
    return (distance - radius) * scale;
};

// Spatial grid functions
const getGridKey = (x, y) => `${x},${y}`;

const updateSpatialGrid = () => {
    spatialGrid = {};

    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        const key = getGridKey(particle.gridX, particle.gridY);

        if (!spatialGrid[key]) {
            spatialGrid[key] = [];
        }
        spatialGrid[key].push(i);
    }
};

const getNeighbors = (particle) => {
    const neighbors = [];
    const checkRadius = 1;

    for (let dx = -checkRadius; dx <= checkRadius; dx++) {
        for (let dy = -checkRadius; dy <= checkRadius; dy++) {
            const key = getGridKey(particle.gridX + dx, particle.gridY + dy);
            const cell = spatialGrid[key];

            if (cell) {
                neighbors.push(...cell);
            }
        }
    }

    return neighbors;
};

const resolveGridCollisions = () => {
    const minDist = GRID_PARTICLE_RADIUS * 2;
    const minDistSq = minDist * minDist;

    for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        const neighbors = getNeighbors(p1);

        for (const j of neighbors) {
            if (i >= j) continue;

            const p2 = particles[j];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < minDistSq && distSq > 0) {
                const dist = Math.sqrt(distSq);
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;

                // Separate particles
                p1.x -= nx * overlap * 0.5;
                p1.y -= ny * overlap * 0.5;
                p2.x += nx * overlap * 0.5;
                p2.y += ny * overlap * 0.5;

                // Apply friction
                const relVx = p2.vx - p1.vx;
                const relVy = p2.vy - p1.vy;
                const impulse = (relVx * nx + relVy * ny) * GRID_FRICTION;

                p1.vx += impulse * nx;
                p1.vy += impulse * ny;
                p2.vx -= impulse * nx;
                p2.vy -= impulse * ny;
            }
        }
    }
};

// Calculate SPH properties - reference implementation
const calculateSPH = () => {
    // Step 1: Update spatial grid
    spatialGrid = {};
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.fx = 0;
        p.fy = 0;
        p.density = 0;
        p.nearDensity = 0;

        p.gridX = Math.floor(p.x * gridScale);
        p.gridY = Math.floor(p.y * gridScale);

        // Clamp to grid bounds
        p.gridX = Math.max(0, Math.min(GRID_CELLS - 1, p.gridX));
        p.gridY = Math.max(0, Math.min(GRID_CELLS - 1, p.gridY));
    }

    // Step 2: Find neighbors and calculate density
    neighborCount = 0;

    for (let i = 0; i < particles.length; i++) {
        const pi = particles[i];
        const minX = pi.gridX > 0;
        const maxX = pi.gridX < GRID_CELLS - 1;
        const minY = pi.gridY > 0;
        const maxY = pi.gridY < GRID_CELLS - 1;

        // Check neighboring grid cells
        const cellsToCheck = [[pi.gridX, pi.gridY]];
        if (minX) cellsToCheck.push([pi.gridX - 1, pi.gridY]);
        if (maxX) cellsToCheck.push([pi.gridX + 1, pi.gridY]);
        if (minY) cellsToCheck.push([pi.gridX, pi.gridY - 1]);
        if (maxY) cellsToCheck.push([pi.gridX, pi.gridY + 1]);
        if (minX && minY) cellsToCheck.push([pi.gridX - 1, pi.gridY - 1]);
        if (minX && maxY) cellsToCheck.push([pi.gridX - 1, pi.gridY + 1]);
        if (maxX && minY) cellsToCheck.push([pi.gridX + 1, pi.gridY - 1]);
        if (maxX && maxY) cellsToCheck.push([pi.gridX + 1, pi.gridY + 1]);

        for (let j = i + 1; j < particles.length; j++) {
            const pj = particles[j];

            const dx = pi.x - pj.x;
            const dy = pi.y - pj.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < INTERACTION_RADIUS_SQ) {
                const dist = Math.sqrt(distSq);
                const weight = 1 - dist / INTERACTION_RADIUS;
                const densityContrib = weight * weight;

                pi.density += densityContrib;
                pj.density += densityContrib;

                const nearDensityContrib = densityContrib * weight * NEAR_FORCE_CONSTANT;
                pi.nearDensity += nearDensityContrib;
                pj.nearDensity += nearDensityContrib;

                // Store neighbor pair
                if (neighborCount < neighbors.length) {
                    const n = neighbors[neighborCount++];
                    n.p1 = pi;
                    n.p2 = pj;
                    n.dist = dist;
                    n.weight = weight;
                    const invDist = 1 / dist;
                    n.nx = dx * invDist;
                    n.ny = dy * invDist;
                }
            }
        }
    }

    // Step 3: Calculate pressure forces
    for (let i = 0; i < neighborCount; i++) {
        const n = neighbors[i];
        const p1 = n.p1;
        const p2 = n.p2;

        // Pressure from density
        const pressure = (p1.density + p2.density - REST_DENSITY * 2) * FORCE_CONSTANT;
        const nearPressure = (p1.nearDensity + p2.nearDensity) * NEAR_FORCE_CONSTANT;
        const pressureWeight = n.weight * (pressure + n.weight * nearPressure);

        // Viscosity/plasticity
        const plasticityWeight = n.weight * PLASTICITY;

        let fx = n.nx * pressureWeight;
        let fy = n.ny * pressureWeight;

        fx += (p2.vx - p1.vx) * plasticityWeight;
        fy += (p2.vy - p1.vy) * plasticityWeight;

        p1.fx += fx;
        p1.fy += fy;
        p2.fx -= fx;
        p2.fy -= fy;
    }
};

// WebGL Shader setup for black/white dithered water
const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;

    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
    }
`;

const fragmentShaderSource = `
    precision highp float;

    varying vec2 v_texCoord;
    uniform sampler2D u_texture;
    uniform vec2 u_resolution;
    uniform float u_time;

    // Bayer matrix for dithering
    float bayerMatrix4x4(vec2 pos) {
        int x = int(mod(pos.x, 4.0));
        int y = int(mod(pos.y, 4.0));

        if (x == 0 && y == 0) return 0.0 / 16.0;
        if (x == 1 && y == 0) return 8.0 / 16.0;
        if (x == 2 && y == 0) return 2.0 / 16.0;
        if (x == 3 && y == 0) return 10.0 / 16.0;

        if (x == 0 && y == 1) return 12.0 / 16.0;
        if (x == 1 && y == 1) return 4.0 / 16.0;
        if (x == 2 && y == 1) return 14.0 / 16.0;
        if (x == 3 && y == 1) return 6.0 / 16.0;

        if (x == 0 && y == 2) return 3.0 / 16.0;
        if (x == 1 && y == 2) return 11.0 / 16.0;
        if (x == 2 && y == 2) return 1.0 / 16.0;
        if (x == 3 && y == 2) return 9.0 / 16.0;

        if (x == 0 && y == 3) return 15.0 / 16.0;
        if (x == 1 && y == 3) return 7.0 / 16.0;
        if (x == 2 && y == 3) return 13.0 / 16.0;
        if (x == 3 && y == 3) return 5.0 / 16.0;

        return 0.0;
    }

    // Calculate normal from metaball field for shading
    vec3 calculateNormal(vec2 pos) {
        float epsilon = 3.0;
        float dx = texture2D(u_texture, (pos + vec2(epsilon, 0.0)) / u_resolution).r -
                   texture2D(u_texture, (pos - vec2(epsilon, 0.0)) / u_resolution).r;
        float dy = texture2D(u_texture, (pos + vec2(0.0, epsilon)) / u_resolution).r -
                   texture2D(u_texture, (pos - vec2(0.0, epsilon)) / u_resolution).r;
        return normalize(vec3(dx, dy, 0.5));
    }

    void main() {
        vec2 uv = v_texCoord;
        vec2 pixelPos = uv * u_resolution;
        float density = texture2D(u_texture, uv).r;

        // Discard pixels with low density (threshold in 0-1 range)
        if (density < 0.10) {
            discard;
        }

        // Calculate lighting for depth perception
        vec3 normal = calculateNormal(pixelPos);
        vec3 lightDir = normalize(vec3(0.6, -0.4, 1.0));
        float diffuse = max(dot(normal, lightDir), 0.0);

        // Enhanced edge detection for dramatic effect
        float edge = length(normal.xy);

        // Combine lighting with density
        float brightness = density * 0.3 + diffuse * 0.4 + edge * 0.3;

        // Add dynamic wave patterns near edges
        float wavePattern = sin(pixelPos.x * 0.05 + u_time * 3.0) *
                           cos(pixelPos.y * 0.05 + u_time * 2.0);
        brightness += wavePattern * 0.1 * edge;

        // Normalize brightness
        brightness = clamp(brightness, 0.0, 1.0);

        // Apply Bayer dithering
        float threshold = bayerMatrix4x4(pixelPos);
        float dithered = step(threshold, brightness);
        vec3 color = vec3(dithered);

        // Smooth alpha at edges
        float alpha = smoothstep(0.2, 0.4, density);

        gl_FragColor = vec4(color, alpha);
    }
`;

// Initialize WebGL
let shaderProgram = null;
let programInfo = null;

if (gl) {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    programInfo = {
        program: shaderProgram,
        attribLocations: {
            position: gl.getAttribLocation(shaderProgram, 'a_position'),
            texCoord: gl.getAttribLocation(shaderProgram, 'a_texCoord'),
        },
        uniformLocations: {
            texture: gl.getUniformLocation(shaderProgram, 'u_texture'),
            resolution: gl.getUniformLocation(shaderProgram, 'u_resolution'),
            time: gl.getUniformLocation(shaderProgram, 'u_time'),
        },
    };

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const texCoords = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]);
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    programInfo.buffers = {
        position: positionBuffer,
        texCoord: texCoordBuffer,
    };
    programInfo.texture = texture;
}

// Simple particle rendering (colorful dots)
const renderParticles = () => {
    // Clear both canvases
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gl) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    // Draw each particle as a colored circle
    // Color scheme: Blue to Purple to Pink gradient
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        // Hue range: 200 (cyan/blue) to 320 (magenta/pink)
        const hue = 200 + (i * 120 / particles.length + debugFrameCount * 0.5) % 120;

        ctx.fillStyle = `hsla(${hue}, 85%, 60%, 1)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    }
};

// Optimized metaball rendering with lower resolution (currently disabled)
const renderMetaballs = () => {
    // Render at half resolution for performance
    const scale = 0.5;
    const renderWidth = Math.floor(canvas.width * scale);
    const renderHeight = Math.floor(canvas.height * scale);

    const imageData = ctx.createImageData(renderWidth, renderHeight);
    const data = imageData.data;

    // Pre-calculate particle influence radius squared
    const maxDistSq = 10000;
    const radiusSqMultiplier = 400;

    for (let y = 0; y < renderHeight; y++) {
        for (let x = 0; x < renderWidth; x++) {
            let sum = 0;
            const worldX = x / scale;
            const worldY = y / scale;

            for (let i = 0; i < particles.length; i++) {
                const particle = particles[i];
                const dx = worldX - particle.x;
                const dy = worldY - particle.y;
                const distSq = dx * dx + dy * dy;

                if (distSq > 0 && distSq < maxDistSq) {
                    sum += (particle.radius * particle.radius * radiusSqMultiplier) / distSq;
                }
            }

            const index = (y * renderWidth + x) * 4;
            // Normalize sum to 0-1 range for better gradient
            const normalized = Math.min(sum / 4, 1.0);
            const value = Math.floor(normalized * 255);
            data[index] = value;
            data[index + 1] = value;
            data[index + 2] = value;
            data[index + 3] = 255;
        }
    }

    // Scale up to full resolution
    ctx.putImageData(imageData, 0, 0);
    ctx.drawImage(canvas, 0, 0, renderWidth, renderHeight, 0, 0, canvas.width, canvas.height);

    if (gl && programInfo) {
        gl.bindTexture(gl.TEXTURE_2D, programInfo.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    }
};

// Render with WebGL
const renderWebGL = (time) => {
    if (!gl || !programInfo) return;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(programInfo.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.buffers.position);
    gl.enableVertexAttribArray(programInfo.attribLocations.position);
    gl.vertexAttribPointer(programInfo.attribLocations.position, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.buffers.texCoord);
    gl.enableVertexAttribArray(programInfo.attribLocations.texCoord);
    gl.vertexAttribPointer(programInfo.attribLocations.texCoord, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, programInfo.texture);
    gl.uniform1i(programInfo.uniformLocations.texture, 0);
    gl.uniform2f(programInfo.uniformLocations.resolution, canvas.width, canvas.height);
    gl.uniform1f(programInfo.uniformLocations.time, time * 0.001);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};

// Device motion handlers - tuned for mobile
const handleOrientation = (event) => {
    if (event.beta !== null && event.gamma !== null) {
        useDeviceMotion = true;
        // beta: front-to-back tilt (-180 to 180), gamma: left-to-right tilt (-90 to 90)
        // More sensitive for better response
        tiltX = Math.max(-1, Math.min(1, event.gamma / 45));
        tiltY = Math.max(-1, Math.min(1, (event.beta - 90) / 45)); // Normalize around portrait (90°)
    }
};

const handleMotion = (event) => {
    if (event.accelerationIncludingGravity) {
        const ax = event.accelerationIncludingGravity.x;
        const ay = event.accelerationIncludingGravity.y;

        if (ax !== null && ay !== null) {
            useDeviceMotion = true;
            // Use acceleration for tilt
            tiltX = Math.max(-1, Math.min(1, ax / 5));
            tiltY = Math.max(-1, Math.min(1, -ay / 5));
        }
    }
};

// Request permission for iOS 13+
const requestPermission = async () => {
    let orientationGranted = false;
    let motionGranted = false;

    // Try to request DeviceOrientation permission
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission === 'granted') {
                window.addEventListener('deviceorientation', handleOrientation);
                orientationGranted = true;
                useDeviceMotion = true;
            }
        } catch (error) {
            console.error('DeviceOrientation permission denied:', error);
        }
    }

    // Try to request DeviceMotion permission
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceMotionEvent.requestPermission();
            if (permission === 'granted') {
                window.addEventListener('devicemotion', handleMotion);
                motionGranted = true;
                useDeviceMotion = true;
            }
        } catch (error) {
            console.error('DeviceMotion permission denied:', error);
        }
    }

    // Hide button if at least one permission was granted
    if (orientationGranted || motionGranted) {
        permissionBtn.style.display = 'none';
    }
};

// Initialize device motion
const needsPermission = (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') ||
                        (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function');

if (needsPermission) {
    // Show button for iOS 13+ devices that require permission
    permissionBtn.style.display = 'block';
    permissionBtn.addEventListener('click', requestPermission);
} else {
    // Automatically add listeners for devices that don't require permission
    if (typeof DeviceOrientationEvent !== 'undefined') {
        window.addEventListener('deviceorientation', handleOrientation);
    }
    if (typeof DeviceMotionEvent !== 'undefined') {
        window.addEventListener('devicemotion', handleMotion);
    }
}


// Add click interaction for pulse effect only
let pulseStrength = 0;

glCanvas.addEventListener('click', (e) => {
    // Create pulse effect on click
    pulseStrength = 1.0;
});

// Track if device motion is available
let useDeviceMotion = false;

// Keyboard controls for tilt (fallback when device motion isn't available)
const keyState = {};

window.addEventListener('keydown', (e) => {
    keyState[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keyState[e.key] = false;
});

// Update tilt based on keyboard input (only if device motion not available)
const updateKeyboardTilt = () => {
    if (useDeviceMotion) return; // Don't interfere with device motion

    const tiltSpeed = 0.02;
    const decay = 0.95;

    // Arrow keys or WASD
    if (keyState['ArrowLeft'] || keyState['a'] || keyState['A']) {
        tiltX = Math.max(-1, tiltX - tiltSpeed);
    } else if (keyState['ArrowRight'] || keyState['d'] || keyState['D']) {
        tiltX = Math.min(1, tiltX + tiltSpeed);
    } else {
        // Decay back to center when no key pressed
        tiltX *= decay;
        if (Math.abs(tiltX) < 0.01) tiltX = 0;
    }

    if (keyState['ArrowUp'] || keyState['w'] || keyState['W']) {
        tiltY = Math.max(-1, tiltY - tiltSpeed);
    } else if (keyState['ArrowDown'] || keyState['s'] || keyState['S']) {
        tiltY = Math.min(1, tiltY + tiltSpeed);
    } else {
        // Decay back to center when no key pressed
        tiltY *= decay;
        if (Math.abs(tiltY) < 0.01) tiltY = 0;
    }
};


// Animation loop with fixed timestep
let lastTime = 0;
let debugFrameCount = 0;
const targetFPS = 60;
const fixedDt = 1000 / targetFPS / 1000; // Convert to seconds

const animate = (currentTime) => {
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1); // Cap at 100ms
    lastTime = currentTime;

    // Update keyboard tilt controls
    updateKeyboardTilt();

    // Smooth tilt transitions
    const smoothing = 0.1;
    smoothTiltX += (tiltX - smoothTiltX) * smoothing;
    smoothTiltY += (tiltY - smoothTiltY) * smoothing;

    // Update tilt debug display
    if (tiltDebug && debugFrameCount % 10 === 0) {
        tiltDebug.textContent = `Tilt: ${tiltX.toFixed(2)}, ${tiltY.toFixed(2)}`;
    }
    debugFrameCount++;

    // Update SPH physics
    calculateSPH();
    particles.forEach(particle => particle.update(1));

    // Apply pulse effect to particles
    if (pulseStrength > 0) {
        const canvasCenterX = canvas.width / 2;
        const canvasCenterY = canvas.height / 2;

        particles.forEach(particle => {
            const dx = particle.x - canvasCenterX;
            const dy = particle.y - canvasCenterY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                // Push particles outward from center
                const force = pulseStrength * 3;
                particle.vx += (dx / dist) * force;
                particle.vy += (dy / dist) * force;
            }
        });

        // Decay pulse
        pulseStrength *= 0.85;
        if (pulseStrength < 0.01) pulseStrength = 0;
    }

    // Render particles directly instead of metaballs
    renderParticles();
    // renderMetaballs();
    // renderWebGL(currentTime);

    requestAnimationFrame(animate);
};

// Start animation
animate(0);

// Handle visibility and resize
const handleResize = () => {
    setCanvasSize();
    initParticles();
};

window.addEventListener('resize', handleResize);

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        handleResize();
    }
});
