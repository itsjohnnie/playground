// ============================================
// TERMINAL ANIMATION - JavaScript
// Expert-level ASCII animations
// ============================================

// === UTILITY FUNCTIONS ===
function createBuffer(width, height, fillChar = ' ') {
    return Array(height).fill(0).map(() => Array(width).fill(fillChar));
}

function bufferToString(buffer) {
    return buffer.map(row => row.join('')).join('\n');
}

// === HERO ANIMATION ===
const heroEl = document.getElementById('hero-ascii');
const heroFrames = [
    `
 ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄▄▄▄▄▄▄▄▄▄  ▄▄       ▄▄
▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░░▌     ▐░░▌
▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀▀▀▀▀▀ ▐░▌░▌   ▐░▐░▌
▐░▌       ▐░▌▐░▌       ▐░▌▐░▌          ▐░▌▐░▌ ▐░▌▐░▌
▐░█▄▄▄▄▄▄▄█░▌▐░█▄▄▄▄▄▄▄█░▌▐░▌          ▐░▌ ▐░▐░▌ ▐░▌
▐░░░░░░░░░░░▌▐░░░░░░░░░░░▌▐░▌          ▐░▌  ▐░▌  ▐░▌
▐░█▀▀▀▀▀▀▀█░▌▐░█▀▀▀▀█░█▀▀ ▐░▌          ▐░▌   ▀   ▐░▌
▐░▌       ▐░▌▐░▌     ▐░▌  ▐░▌          ▐░▌       ▐░▌
▐░▌       ▐░▌▐░▌      ▐░▌ ▐░█▄▄▄▄▄▄▄▄▄ ▐░▌       ▐░▌
▐░▌       ▐░▌▐░▌       ▐░▌▐░░░░░░░░░░░▌▐░▌       ▐░▌
 ▀         ▀  ▀         ▀  ▀▀▀▀▀▀▀▀▀▀▀  ▀         ▀
`,
    `
 ▀█████████▄   ▄████████    ▄████████  ▄█    █▄
   ███    ███ ███    ███   ███    ███ ███    ███
   ███    ███ ███    █▀    ███    █▀  ███    ███
  ▄███▄▄▄██▀  ███         ▄███▄▄▄     ███    ███
 ▀▀███▀▀▀██▄  ███        ▀▀███▀▀▀     ███    ███
   ███    ██▄ ███    █▄    ███    █▄  ███    ███
   ███    ███ ███    ███   ███    ███ ███    ███
 ▄█████████▀  ████████▀    ██████████  ▀██████▀
`
];

let heroIdx = 0;
function animateHero() {
    if (heroEl) {
        heroEl.textContent = heroFrames[heroIdx];
        heroIdx = (heroIdx + 1) % heroFrames.length;
    }
}
setInterval(animateHero, 3000);
animateHero();

// === FRAME BUFFER ANIMATION ===
const frameBufferEl = document.getElementById('frame-buffer');
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerIdx = 0;

function animateFrameBuffer() {
    if (!frameBufferEl) return;
    const spinner = spinnerFrames[spinnerIdx];
    const progress = Math.floor((spinnerIdx / spinnerFrames.length) * 40);
    const bar = '█'.repeat(progress) + '░'.repeat(40 - progress);

    frameBufferEl.textContent = `
 ${spinner} Rendering frames...

 [${bar}] ${Math.floor((progress/40)*100)}%

 Frame: ${spinnerIdx + 1}/${spinnerFrames.length}
 FPS: 60
 Buffer: ${spinnerIdx * 128}KB
`;

    spinnerIdx = (spinnerIdx + 1) % spinnerFrames.length;
}
setInterval(animateFrameBuffer, 100);

// === PROCEDURAL GENERATION ===
const proceduralEl = document.getElementById('procedural-gen');
let proceduralTime = 0;

function animateProcedural() {
    if (!proceduralEl) return;
    const width = 48;
    const height = 8;
    let output = '';

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const value = Math.sin(x * 0.2 + proceduralTime) * Math.cos(y * 0.3 + proceduralTime * 0.5);
            const char = value > 0.5 ? '█' : value > 0 ? '▓' : value > -0.5 ? '▒' : '░';
            output += char;
        }
        output += '\n';
    }

    proceduralEl.textContent = output;
    proceduralTime += 0.1;
}
setInterval(animateProcedural, 80);

// === SPRITE ANIMATION ===
const spriteEl = document.getElementById('sprite-animation');
let spriteX = 0;
const spriteChar = '►';

function animateSprite() {
    if (!spriteEl) return;
    const width = 50;
    const height = 5;
    const y = 2;

    let output = '';
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            if (row === y && col === spriteX) {
                output += spriteChar;
            } else if (row === y) {
                output += '·';
            } else {
                output += ' ';
            }
        }
        output += '\n';
    }

    spriteEl.textContent = output;
    spriteX = (spriteX + 1) % width;
}
setInterval(animateSprite, 60);

// === CELLULAR AUTOMATA ===
const cellularEl = document.getElementById('cellular-automata');
const cellWidth = 60;
const cellHeight = 10;
let cells = createBuffer(cellWidth, cellHeight, 0).map(row =>
    row.map(() => Math.random() > 0.7 ? 1 : 0)
);

function animateCellular() {
    if (!cellularEl) return;

    const newCells = createBuffer(cellWidth, cellHeight, 0);

    for (let y = 0; y < cellHeight; y++) {
        for (let x = 0; x < cellWidth; x++) {
            let neighbors = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const ny = (y + dy + cellHeight) % cellHeight;
                    const nx = (x + dx + cellWidth) % cellWidth;
                    neighbors += cells[ny][nx];
                }
            }

            if (cells[y][x] === 1) {
                newCells[y][x] = (neighbors === 2 || neighbors === 3) ? 1 : 0;
            } else {
                newCells[y][x] = (neighbors === 3) ? 1 : 0;
            }
        }
    }

    cells = newCells;

    const output = cells.map(row =>
        row.map(cell => cell ? '█' : ' ').join('')
    ).join('\n');

    cellularEl.textContent = output;
}
setInterval(animateCellular, 200);

// === PLAYGROUND ANIMATIONS ===
const playgroundEl = document.getElementById('playground-output');
const controlBtns = document.querySelectorAll('.control-btn');
let currentAnimation = null;
let animationInterval = null;

const animations = {
    starfield: {
        init: function() {
            this.stars = Array(100).fill(0).map(() => ({
                x: Math.random() * 60,
                y: Math.random() * 12,
                speed: Math.random() * 0.5 + 0.1
            }));
        },
        animate: function() {
            this.stars.forEach(star => {
                star.y += star.speed;
                if (star.y > 12) {
                    star.y = 0;
                    star.x = Math.random() * 60;
                }
            });

            const buffer = createBuffer(60, 12);
            this.stars.forEach(star => {
                const x = Math.floor(star.x);
                const y = Math.floor(star.y);
                if (y >= 0 && y < 12 && x >= 0 && x < 60) {
                    buffer[y][x] = star.speed > 0.4 ? '*' : star.speed > 0.25 ? '·' : '.';
                }
            });

            return bufferToString(buffer);
        }
    },

    plasma: {
        time: 0,
        animate: function() {
            const width = 60;
            const height = 12;
            let output = '';

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const value = Math.sin(x / 8 + this.time) +
                                Math.sin(y / 6 + this.time * 0.8) +
                                Math.sin((x + y) / 10 + this.time * 0.5);

                    const chars = ' ░▒▓█';
                    const idx = Math.floor((value + 3) / 6 * (chars.length - 1));
                    output += chars[Math.max(0, Math.min(chars.length - 1, idx))];
                }
                output += '\n';
            }

            this.time += 0.1;
            return output;
        }
    },

    tunnel: {
        time: 0,
        animate: function() {
            const width = 60;
            const height = 12;
            const centerX = width / 2;
            const centerY = height / 2;
            let output = '';

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const dx = x - centerX;
                    const dy = (y - centerY) * 2;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    const value = (dist + this.time * 10) % 4;
                    const chars = '·:░▓';
                    output += chars[Math.floor(value)];
                }
                output += '\n';
            }

            this.time += 0.05;
            return output;
        }
    },

    rain: {
        drops: [],
        init: function() {
            this.drops = Array(30).fill(0).map(() => ({
                x: Math.floor(Math.random() * 60),
                y: Math.random() * 12,
                speed: Math.random() * 0.5 + 0.3,
                char: Math.random() > 0.5 ? '|' : '│'
            }));
        },
        animate: function() {
            const buffer = createBuffer(60, 12);

            this.drops.forEach(drop => {
                drop.y += drop.speed;
                if (drop.y > 12) {
                    drop.y = 0;
                    drop.x = Math.floor(Math.random() * 60);
                }

                const y = Math.floor(drop.y);
                if (y >= 0 && y < 12) {
                    buffer[y][drop.x] = drop.char;
                }
            });

            return bufferToString(buffer);
        }
    },

    fire: {
        buffer: null,
        init: function() {
            this.buffer = createBuffer(60, 12, 0).map(row => row.map(() => 0));
        },
        animate: function() {
            const width = 60;
            const height = 12;

            // Add heat at bottom
            for (let x = 0; x < width; x++) {
                this.buffer[height - 1][x] = Math.random() > 0.3 ? 9 : 0;
            }

            // Propagate heat upward
            for (let y = 0; y < height - 1; y++) {
                for (let x = 0; x < width; x++) {
                    const below = this.buffer[y + 1][x];
                    const left = this.buffer[y + 1][(x - 1 + width) % width];
                    const right = this.buffer[y + 1][(x + 1) % width];

                    this.buffer[y][x] = Math.max(0, ((below + left + right) / 3) - Math.random() * 0.5);
                }
            }

            // Render
            const chars = ' .:-=+*#%@';
            return this.buffer.map(row =>
                row.map(heat => chars[Math.min(9, Math.floor(heat))]).join('')
            ).join('\n');
        }
    },

    dna: {
        time: 0,
        animate: function() {
            const width = 60;
            const height = 12;
            let output = '';

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const wave1 = Math.sin(x / 4 + this.time) * 3 + height / 2;
                    const wave2 = Math.sin(x / 4 + this.time + Math.PI) * 3 + height / 2;

                    if (Math.abs(y - wave1) < 0.5) {
                        output += '●';
                    } else if (Math.abs(y - wave2) < 0.5) {
                        output += '○';
                    } else if (x % 4 === 0 && y > Math.min(wave1, wave2) && y < Math.max(wave1, wave2)) {
                        output += '|';
                    } else {
                        output += ' ';
                    }
                }
                output += '\n';
            }

            this.time += 0.1;
            return output;
        }
    }
};

function startAnimation(name) {
    if (animationInterval) {
        clearInterval(animationInterval);
    }

    const anim = animations[name];
    if (anim.init) anim.init();

    animationInterval = setInterval(() => {
        if (playgroundEl) {
            playgroundEl.textContent = anim.animate();
        }
    }, 80);

    if (playgroundEl) {
        playgroundEl.textContent = anim.animate();
    }
}

controlBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        controlBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        startAnimation(btn.dataset.animation);
    });
});

// Start default animation
startAnimation('starfield');

// === GALLERY ANIMATIONS ===
const starwarsEl = document.getElementById('starwars-art');
if (starwarsEl) {
    starwarsEl.textContent = `
    .   *        .       .             *
 .        .   .     __     .     *
      *       .    /  \\  .    .
   .     *        |    |     .       *
         .    .   |    |   .     .
    *       .     |    |      *
      .   ____    |    |    ____    .
   *     /    \\   |    |   /    \\     .
    .   |  __  |  |    |  |  __  | .
  .     | |  | |  |    |  | |  | |   *
        |_|  |_|  |____|  |_|  |_|
           *    .      .       .
            May the Source be with you
`;
}

const badAppleEl = document.getElementById('bad-apple-art');
if (badAppleEl) {
    badAppleEl.textContent = `
    ▄▄▄▄▄▄▄▄▄▄▄
   █░░░░░░░░░█
   █░██░░██░░█    ◄ Frame 1247/6572
   █░░░░░░░░░█
   █░░█████░░█    FPS: 30
   █░░░░░░░░░█    Codec: ASCII
    █████████     Buffer: 2.1MB
`;
}

const doomEl = document.getElementById('doom-art');
if (doomEl) {
    doomEl.textContent = `
 ╔════════════════════════════════╗
 ║ ▓▓▓▓▓▓▓▓▓▓▓▓▓  ░░░░▓▓▓▓░░░░░░ ║
 ║ ▓▓▓▓▓▒▒▒▒▒▒▒▒  ░░░░░░░░░░░░░░ ║
 ║ ▓▓▓▒▒▒░░░░░░░  ▓▓▓▓▓▓░░░░▒▒▒▓ ║
 ║ ▓▓▒▒░░   ░░░   ░░░░░░░▒▒▒▒▓▓▓ ║
 ║ ▓▒░░     ░░░    ░░░░░▒▒▒▒▓▓▓▓ ║
 ║  ░░      ░░░     ░░░▒▒▒▓▓▓▓▓▓ ║
 ╚════════════════════════════════╝
 Health: 100%  Ammo: 50  Armor: 200
`;
}

// === FOOTER ===
const footerEl = document.getElementById('footer-ascii');
if (footerEl) {
    footerEl.textContent = `
╔═══════════════════════════════════════════════════════════════╗
║  ▀█▀ █▀▀ █▀█ █▀▄▀█ █ █▄ █ ▄▀█ █     ▄▀█ █▄ █ █ █▀▄▀█ ▄▀█ ▀█▀ █ █▀█ █▄ █  ║
║   █  ██▄ █▀▄ █ ▀ █ █ █ ▀█ █▀█ █▄▄   █▀█ █ ▀█ █ █ ▀ █ █▀█  █  █ █▄█ █ ▀█  ║
╚═══════════════════════════════════════════════════════════════╝
`;
}

// Console Easter Egg
console.log(`
╔═══════════════════════════════════════╗
║   You found the console! Nice work.   ║
║                                       ║
║   All animations render in pure JS    ║
║   No images • No canvas • Just text   ║
║                                       ║
║   View source to see the techniques   ║
╚═══════════════════════════════════════╝
`);
