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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    glCanvas.width = size * dpr;
    glCanvas.height = size * dpr;
    glCanvas.style.width = size + 'px';
    glCanvas.style.height = size + 'px';

    if (gl) {
        gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    }
};

setCanvasSize();
window.addEventListener('resize', setCanvasSize);

// Physics constants - Enhanced for realism
const GRAVITY = 0.8;
const DAMPING = 0.985;
const PARTICLE_COUNT = 250;
const PARTICLE_RADIUS = 2.5;
const REST_DENSITY = 1.0;
const GAS_CONSTANT = 2000;
const VISCOSITY = 0.5;
const SURFACE_TENSION = 0.05;
const INTERACTION_RADIUS = 15;

// Device orientation
let tiltX = 0;
let tiltY = 0;

// SPH Particle class with enhanced physics
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 1;
        this.vy = (Math.random() - 0.5) * 1;
        this.radius = PARTICLE_RADIUS;
        this.density = 0;
        this.pressure = 0;
        this.neighbors = [];
    }

    update() {
        // Apply gravity with device tilt
        const gravityX = tiltX * GRAVITY;
        const gravityY = tiltY * GRAVITY + GRAVITY * 0.5;

        this.vx += gravityX;
        this.vy += gravityY;

        // Apply damping
        this.vx *= DAMPING;
        this.vy *= DAMPING;

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Circle boundary collision with realistic bounce
        const centerX = canvas.width / (window.devicePixelRatio || 1) / 2;
        const centerY = canvas.height / (window.devicePixelRatio || 1) / 2;
        const maxRadius = (canvas.width / (window.devicePixelRatio || 1)) / 2 - this.radius * 2;

        const dx = this.x - centerX;
        const dy = this.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > maxRadius) {
            const angle = Math.atan2(dy, dx);
            this.x = centerX + Math.cos(angle) * maxRadius;
            this.y = centerY + Math.sin(angle) * maxRadius;

            // Realistic bounce with energy loss
            const normalX = dx / distance;
            const normalY = dy / distance;
            const dot = this.vx * normalX + this.vy * normalY;
            this.vx -= 2 * dot * normalX * 0.6;
            this.vy -= 2 * dot * normalY * 0.6;
        }
    }
}

// Create particles in a more realistic liquid formation
const particles = [];
const centerX = canvas.width / (window.devicePixelRatio || 1) / 2;
const centerY = canvas.height / (window.devicePixelRatio || 1) / 2;
const initialRadius = (canvas.width / (window.devicePixelRatio || 1)) * 0.2;

for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.1;
    const radius = Math.sqrt(Math.random()) * initialRadius;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius + (canvas.height / (window.devicePixelRatio || 1)) * 0.1;
    particles.push(new Particle(x, y));
}

// SPH kernel functions
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

            // Pressure force
            const pressureGradient = smoothingKernelDerivative(distance, INTERACTION_RADIUS);
            const sharedPressure = (particles[i].pressure + particles[j].pressure) / 2;
            pressureForceX -= sharedPressure * dirX * pressureGradient / particles[i].density;
            pressureForceY -= sharedPressure * dirY * pressureGradient / particles[i].density;

            // Viscosity force
            const velocityDiffX = particles[j].vx - particles[i].vx;
            const velocityDiffY = particles[j].vy - particles[i].vy;
            const viscosityInfluence = smoothingKernel(distance, INTERACTION_RADIUS);
            viscosityForceX += velocityDiffX * viscosityInfluence;
            viscosityForceY += velocityDiffY * viscosityInfluence;
        }

        // Apply forces
        particles[i].vx += pressureForceX * 0.5 + viscosityForceX * VISCOSITY;
        particles[i].vy += pressureForceY * 0.5 + viscosityForceY * VISCOSITY;
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

// WebGL Shader setup for realistic water rendering
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

    // Calculate normal from metaball field
    vec3 calculateNormal(vec2 pos) {
        float epsilon = 2.0;
        float dx = texture2D(u_texture, (pos + vec2(epsilon, 0.0)) / u_resolution).r -
                   texture2D(u_texture, (pos - vec2(epsilon, 0.0)) / u_resolution).r;
        float dy = texture2D(u_texture, (pos + vec2(0.0, epsilon)) / u_resolution).r -
                   texture2D(u_texture, (pos - vec2(0.0, epsilon)) / u_resolution).r;
        return normalize(vec3(dx, dy, 1.0));
    }

    void main() {
        vec2 uv = v_texCoord;
        vec2 pixelPos = uv * u_resolution;
        float density = texture2D(u_texture, uv).r;

        if (density < 0.5) {
            discard;
        }

        // Calculate normal for lighting
        vec3 normal = calculateNormal(pixelPos);

        // Light direction
        vec3 lightDir = normalize(vec3(0.5, -0.5, 1.0));
        float diffuse = max(dot(normal, lightDir), 0.0);

        // Specular highlight
        vec3 viewDir = vec3(0.0, 0.0, 1.0);
        vec3 reflectDir = reflect(-lightDir, normal);
        float specular = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

        // Water color with depth-based gradient
        vec3 waterColorDeep = vec3(0.05, 0.3, 0.6);
        vec3 waterColorShallow = vec3(0.3, 0.6, 0.9);
        vec3 waterColor = mix(waterColorShallow, waterColorDeep, density - 0.5);

        // Combine lighting
        vec3 ambient = waterColor * 0.4;
        vec3 diffuseColor = waterColor * diffuse * 0.6;
        vec3 specularColor = vec3(1.0, 1.0, 1.0) * specular * 0.5;

        vec3 finalColor = ambient + diffuseColor + specularColor;

        // Add caustics effect
        float caustic = sin(pixelPos.x * 0.1 + u_time * 2.0) * sin(pixelPos.y * 0.1 + u_time * 1.5);
        caustic = pow(max(caustic, 0.0), 3.0) * 0.3;
        finalColor += vec3(caustic);

        // Alpha based on density for smooth edges
        float alpha = smoothstep(0.5, 0.7, density);

        gl_FragColor = vec4(finalColor, alpha * 0.95);
    }
`;

// Initialize WebGL
let shaderProgram = null;
let programInfo = null;

if (gl) {
    // Create shaders
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    // Create program
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

    // Create buffers
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const texCoords = new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]);
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    // Create texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Enable blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Store buffers for later use
    programInfo.buffers = {
        position: positionBuffer,
        texCoord: texCoordBuffer,
    };
    programInfo.texture = texture;
}

// Enhanced metaball rendering
const renderMetaballs = () => {
    const dpr = window.devicePixelRatio || 1;
    const imageData = ctx.createImageData(canvas.width / dpr, canvas.height / dpr);
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
                if (distSq > 0) {
                    const influence = particle.density > 0 ? particle.density : 1;
                    sum += (particle.radius * particle.radius * 300 * influence) / distSq;
                }
            }

            const index = (y * width + x) * 4;
            const value = Math.min(255, sum * 50);
            data[index] = value;     // R - used for density in shader
            data[index + 1] = value; // G
            data[index + 2] = value; // B
            data[index + 3] = 255;   // A
        }
    }

    ctx.putImageData(imageData, 0, 0);

    // Update WebGL texture
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

    // Set up position attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.buffers.position);
    gl.enableVertexAttribArray(programInfo.attribLocations.position);
    gl.vertexAttribPointer(programInfo.attribLocations.position, 2, gl.FLOAT, false, 0, 0);

    // Set up texCoord attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.buffers.texCoord);
    gl.enableVertexAttribArray(programInfo.attribLocations.texCoord);
    gl.vertexAttribPointer(programInfo.attribLocations.texCoord, 2, gl.FLOAT, false, 0, 0);

    // Set uniforms
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, programInfo.texture);
    gl.uniform1i(programInfo.uniformLocations.texture, 0);
    gl.uniform2f(programInfo.uniformLocations.resolution, canvas.width, canvas.height);
    gl.uniform1f(programInfo.uniformLocations.time, time * 0.001);

    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};

// Device motion handlers
const handleOrientation = (event) => {
    if (event.beta !== null && event.gamma !== null) {
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
        permissionBtn.style.display = 'block';
        permissionBtn.addEventListener('click', requestPermission);
    } else {
        window.addEventListener('deviceorientation', handleOrientation);
        window.addEventListener('devicemotion', handleMotion);
    }
}

// Animation loop
let lastTime = 0;
const animate = (currentTime) => {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    // Update physics with SPH
    calculateSPH();
    particles.forEach(particle => particle.update());

    // Render metaballs to 2D canvas
    renderMetaballs();

    // Render with WebGL shader
    renderWebGL(currentTime);

    requestAnimationFrame(animate);
};

// Start animation
animate(0);

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        setCanvasSize();
    }
});
