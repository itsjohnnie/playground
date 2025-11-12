// Canvas setup
const canvas = document.getElementById('waterCanvas');
const ctx = canvas.getContext('2d');
const glCanvas = document.getElementById('glCanvas');
const gl = glCanvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
const permissionBtn = document.getElementById('requestPermission');

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

// Physics constants - DRAMATICALLY enhanced for visible mobile movement
const GRAVITY = 1.5;
const DAMPING = 0.97;
const PARTICLE_COUNT = 400;
const PARTICLE_RADIUS = 2.8;
const REST_DENSITY = 1.2;
const GAS_CONSTANT = 5000;
const VISCOSITY = 0.3;
const SURFACE_TENSION = 0.08;
const INTERACTION_RADIUS = 18;
const BOUNCE_FORCE = 0.4; // Energy retention on bounce

// Device orientation - amplified for dramatic effect
let tiltX = 0;
let tiltY = 0;
let smoothTiltX = 0;
let smoothTiltY = 0;

// Enhanced SPH Particle class
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.radius = PARTICLE_RADIUS;
        this.density = 0;
        this.pressure = 0;
        this.neighbors = [];
        this.nearWall = false;
    }

    update(dt) {
        // Smooth tilt for more fluid response
        const gravityMultiplier = 2.5; // Make gravity effect much stronger
        const gravityX = smoothTiltX * GRAVITY * gravityMultiplier;
        const gravityY = smoothTiltY * GRAVITY * gravityMultiplier + GRAVITY;

        this.vx += gravityX * dt;
        this.vy += gravityY * dt;

        // Apply damping
        this.vx *= DAMPING;
        this.vy *= DAMPING;

        // Update position
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Circle boundary collision with dramatic bounce
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = canvas.width / 2 - this.radius * 3;

        const dx = this.x - centerX;
        const dy = this.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.nearWall = distance > maxRadius * 0.85;

        if (distance > maxRadius) {
            const angle = Math.atan2(dy, dx);
            this.x = centerX + Math.cos(angle) * maxRadius;
            this.y = centerY + Math.sin(angle) * maxRadius;

            // Enhanced bounce with energy retention
            const normalX = dx / distance;
            const normalY = dy / distance;
            const dot = this.vx * normalX + this.vy * normalY;

            // Add extra force to bounce for dramatic effect
            this.vx -= 2 * dot * normalX * (1 + BOUNCE_FORCE);
            this.vy -= 2 * dot * normalY * (1 + BOUNCE_FORCE);
        }
    }
}

// Initialize particles after canvas is sized
let particles = [];

const initParticles = () => {
    particles = [];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const initialRadius = canvas.width * 0.3;

    // Create particles in a dense, realistic distribution
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = (Math.PI * 2 * i) / PARTICLE_COUNT;
        const radius = Math.sqrt(Math.random()) * initialRadius;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius + canvas.height * 0.08;
        particles.push(new Particle(x, y));
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

// Calculate SPH properties
const calculateSPH = () => {
    // Calculate density and pressure
    for (let i = 0; i < particles.length; i++) {
        particles[i].density = 0;
        particles[i].neighbors = [];

        for (let j = 0; j < particles.length; j++) {
            const dx = particles[j].x - particles[i].x;
            const dy = particles[j].y - particles[i].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < INTERACTION_RADIUS) {
                particles[i].neighbors.push(j);
                const influence = smoothingKernel(distance, INTERACTION_RADIUS);
                particles[i].density += influence;
            }
        }

        particles[i].pressure = GAS_CONSTANT * (particles[i].density - REST_DENSITY);
    }

    // Calculate pressure and viscosity forces
    for (let i = 0; i < particles.length; i++) {
        let pressureForceX = 0;
        let pressureForceY = 0;
        let viscosityForceX = 0;
        let viscosityForceY = 0;

        for (const j of particles[i].neighbors) {
            if (i === j) continue;

            const dx = particles[j].x - particles[i].x;
            const dy = particles[j].y - particles[i].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 0.001) continue;

            const dirX = dx / distance;
            const dirY = dy / distance;

            // Pressure force (enhanced)
            const pressureGradient = smoothingKernelDerivative(distance, INTERACTION_RADIUS);
            const sharedPressure = (particles[i].pressure + particles[j].pressure) / 2;
            pressureForceX -= sharedPressure * dirX * pressureGradient / Math.max(particles[i].density, 0.1);
            pressureForceY -= sharedPressure * dirY * pressureGradient / Math.max(particles[i].density, 0.1);

            // Viscosity force
            const velocityDiffX = particles[j].vx - particles[i].vx;
            const velocityDiffY = particles[j].vy - particles[i].vy;
            const viscosityInfluence = smoothingKernel(distance, INTERACTION_RADIUS);
            viscosityForceX += velocityDiffX * viscosityInfluence;
            viscosityForceY += velocityDiffY * viscosityInfluence;
        }

        // Apply forces with enhanced scaling
        particles[i].vx += pressureForceX * 0.8 + viscosityForceX * VISCOSITY;
        particles[i].vy += pressureForceY * 0.8 + viscosityForceY * VISCOSITY;
    }

    // Surface tension
    for (let i = 0; i < particles.length; i++) {
        let surfaceNormalX = 0;
        let surfaceNormalY = 0;

        for (const j of particles[i].neighbors) {
            if (i === j) continue;

            const dx = particles[j].x - particles[i].x;
            const dy = particles[j].y - particles[i].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 0.001) continue;

            const gradient = smoothingKernelDerivative(distance, INTERACTION_RADIUS);
            surfaceNormalX += dx / distance * gradient;
            surfaceNormalY += dy / distance * gradient;
        }

        const normalLength = Math.sqrt(surfaceNormalX * surfaceNormalX + surfaceNormalY * surfaceNormalY);
        if (normalLength > 0.01) {
            particles[i].vx -= surfaceNormalX * SURFACE_TENSION;
            particles[i].vy -= surfaceNormalY * SURFACE_TENSION;
        }
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

        if (density < 0.4) {
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

        // Output black or white
        vec3 color = vec3(dithered);

        // Smooth alpha at edges
        float alpha = smoothstep(0.4, 0.6, density);

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

// Enhanced metaball rendering with higher quality
const renderMetaballs = () => {
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let sum = 0;

            for (const particle of particles) {
                const dx = x - particle.x;
                const dy = y - particle.y;
                const distSq = dx * dx + dy * dy;
                if (distSq > 0 && distSq < 10000) {
                    const influence = Math.max(particle.density, 1.0);
                    sum += (particle.radius * particle.radius * 400 * influence) / distSq;
                }
            }

            const index = (y * width + x) * 4;
            const value = Math.min(255, sum * 60);
            data[index] = value;
            data[index + 1] = value;
            data[index + 2] = value;
            data[index + 3] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);

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

// Device motion handlers - enhanced sensitivity
const handleOrientation = (event) => {
    if (event.beta !== null && event.gamma !== null) {
        tiltX = Math.max(-1, Math.min(1, event.gamma / 30)); // More sensitive
        tiltY = Math.max(-1, Math.min(1, event.beta / 30));
    }
};

const handleMotion = (event) => {
    if (event.accelerationIncludingGravity) {
        const ax = event.accelerationIncludingGravity.x;
        const ay = event.accelerationIncludingGravity.y;

        if (ax !== null && ay !== null) {
            tiltX = Math.max(-1, Math.min(1, ax / 7)); // More sensitive
            tiltY = Math.max(-1, Math.min(1, -ay / 7));
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
        permissionBtn.style.display = 'block';
        permissionBtn.addEventListener('click', requestPermission);
    } else {
        window.addEventListener('deviceorientation', handleOrientation);
        window.addEventListener('devicemotion', handleMotion);
    }
}

// Add mouse simulation for desktop testing
let mouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;

glCanvas.addEventListener('mousedown', (e) => {
    mouseDown = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

glCanvas.addEventListener('mousemove', (e) => {
    if (mouseDown) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        tiltX = Math.max(-1, Math.min(1, dx / 50));
        tiltY = Math.max(-1, Math.min(1, dy / 50));
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    }
});

glCanvas.addEventListener('mouseup', () => {
    mouseDown = false;
});

glCanvas.addEventListener('mouseleave', () => {
    mouseDown = false;
});

// Animation loop with fixed timestep
let lastTime = 0;
const targetFPS = 60;
const fixedDt = 1000 / targetFPS / 1000; // Convert to seconds

const animate = (currentTime) => {
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1); // Cap at 100ms
    lastTime = currentTime;

    // Smooth tilt transitions
    const smoothing = 0.1;
    smoothTiltX += (tiltX - smoothTiltX) * smoothing;
    smoothTiltY += (tiltY - smoothTiltY) * smoothing;

    // Update physics
    calculateSPH();
    particles.forEach(particle => particle.update(fixedDt));

    // Render
    renderMetaballs();
    renderWebGL(currentTime);

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
