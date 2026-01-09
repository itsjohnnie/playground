// Terminal Animation JavaScript

// Hero ASCII Art Animation
const heroAscii = document.getElementById('hero-ascii');
const heroFrames = [
    `
    ╔═══════════════════════════════════════╗
    ║                                       ║
    ║     ████████╗███████╗██████╗ ███╗   ╗║
    ║     ╚══██╔══╝██╔════╝██╔══██╗████╗ ██║
    ║        ██║   █████╗  ██████╔╝██╔████╔╝║
    ║        ██║   ██╔══╝  ██╔══██╗██║╚██╔╝█║
    ║        ██║   ███████╗██║  ██║██║ ╚═╝ █║
    ║        ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚║
    ║                                       ║
    ╚═══════════════════════════════════════╝
    `,
    `
    ╔═══════════════════════════════════════╗
    ║                                       ║
    ║     ▀█████████▄  ▄██████▄  ███    ███║
    ║       ███    ███ ███    ███ ████  ████║
    ║       ███    ███ ███    ███ ██ ████ █║
    ║      ▄███▄▄▄██▀  ███    ███ ██  ██  █║
    ║     ▀▀███▀▀▀██▄  ███    ███ ██      █║
    ║       ███    ██▄ ███    ███ ██      █║
    ║       ███    ███  ▀██████▀  ██      █║
    ║                                       ║
    ╚═══════════════════════════════════════╝
    `
];

let heroFrame = 0;
function animateHero() {
    if (heroAscii) {
        heroAscii.textContent = heroFrames[heroFrame];
        heroFrame = (heroFrame + 1) % heroFrames.length;
    }
}
setInterval(animateHero, 2000);
animateHero();

// Loading Animation
const loadingDemo = document.getElementById('loading-demo');
const loadingFrames = [
    '⠋ Loading...',
    '⠙ Loading...',
    '⠹ Loading...',
    '⠸ Loading...',
    '⠼ Loading...',
    '⠴ Loading...',
    '⠦ Loading...',
    '⠧ Loading...',
    '⠇ Loading...',
    '⠏ Loading...'
];

let loadingFrame = 0;
function animateLoading() {
    if (loadingDemo) {
        loadingDemo.textContent = `
${loadingFrames[loadingFrame]}

Progress: ${'█'.repeat(Math.floor(loadingFrame * 3))}${'░'.repeat(30 - Math.floor(loadingFrame * 3))}

Status: Processing...
        `;
        loadingFrame = (loadingFrame + 1) % loadingFrames.length;
    }
}
setInterval(animateLoading, 100);

// Matrix Rain Effect
const matrixDemo = document.getElementById('matrix-demo');
const matrixChars = '01アイウエオカキクケコサシスセソ';
const matrixColumns = 20;
const matrixRows = 10;
let matrixState = Array(matrixRows).fill(0).map(() =>
    Array(matrixColumns).fill(0).map(() => ({
        char: ' ',
        brightness: 0
    }))
);

function animateMatrix() {
    if (matrixDemo) {
        // Add new characters at random columns
        for (let i = 0; i < 3; i++) {
            const col = Math.floor(Math.random() * matrixColumns);
            matrixState[0][col] = {
                char: matrixChars[Math.floor(Math.random() * matrixChars.length)],
                brightness: 1
            };
        }

        // Move characters down
        for (let row = matrixRows - 1; row > 0; row--) {
            for (let col = 0; col < matrixColumns; col++) {
                matrixState[row][col] = {
                    char: matrixState[row - 1][col].char,
                    brightness: matrixState[row - 1][col].brightness * 0.85
                };
            }
        }

        // Clear top row
        for (let col = 0; col < matrixColumns; col++) {
            if (matrixState[0][col].brightness < 1) {
                matrixState[0][col] = { char: ' ', brightness: 0 };
            }
        }

        // Render
        let output = '';
        for (let row = 0; row < matrixRows; row++) {
            for (let col = 0; col < matrixColumns; col++) {
                const cell = matrixState[row][col];
                output += cell.brightness > 0 ? cell.char : ' ';
            }
            output += '\n';
        }
        matrixDemo.textContent = output;
    }
}
setInterval(animateMatrix, 150);

// Wave Animation
const waveDemo = document.getElementById('wave-demo');
let waveOffset = 0;

function animateWave() {
    if (waveDemo) {
        const width = 40;
        const height = 8;
        let output = '';

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const wave = Math.sin((x + waveOffset) * 0.3) * 3 + 4;
                if (Math.abs(y - wave) < 0.5) {
                    output += '~';
                } else if (y > wave) {
                    output += ' ';
                } else {
                    output += ' ';
                }
            }
            output += '\n';
        }

        waveDemo.textContent = output;
        waveOffset += 0.5;
    }
}
setInterval(animateWave, 100);

// Spinner Animation
const spinnerDemo = document.getElementById('spinner-demo');
const spinners = [
    ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    ['◐', '◓', '◑', '◒'],
    ['▹▹▹▹▹', '▸▹▹▹▹', '▹▸▹▹▹', '▹▹▸▹▹', '▹▹▹▸▹', '▹▹▹▹▸'],
    ['[    ]', '[=   ]', '[==  ]', '[=== ]', '[ ===]', '[  ==]', '[   =]']
];

let spinnerIndex = 0;
let spinnerFrame = 0;

function animateSpinner() {
    if (spinnerDemo) {
        const currentSpinner = spinners[spinnerIndex % spinners.length];
        const frame = currentSpinner[spinnerFrame % currentSpinner.length];

        spinnerDemo.textContent = `
Spinner Style ${(spinnerIndex % spinners.length) + 1}:

    ${frame}

Type: ${['Dots', 'Circle', 'Arrow', 'Bar'][spinnerIndex % spinners.length]}
Frame: ${spinnerFrame % currentSpinner.length + 1}/${currentSpinner.length}
        `;

        spinnerFrame++;

        if (spinnerFrame % (currentSpinner.length * 3) === 0) {
            spinnerIndex++;
            spinnerFrame = 0;
        }
    }
}
setInterval(animateSpinner, 150);

// Playground Animations
const playgroundOutput = document.getElementById('playground-output');
const controlButtons = document.querySelectorAll('.control-btn');

let playgroundAnimation = null;
let playgroundFrame = 0;

const animations = {
    train: {
        frames: [
            `
      ____
  ___/    \\___
 /   TRAIN   \\
|  O       O  |
 \\___________/
  O         O
            `,
            `
        ____
    ___/    \\___
   /   TRAIN   \\
  |  O       O  |
   \\___________/
    O         O
            `,
            `
          ____
      ___/    \\___
     /   TRAIN   \\
    |  O       O  |
     \\___________/
      O         O
            `,
            `
            ____
        ___/    \\___
       /   TRAIN   \\
      |  O       O  |
       \\___________/
        O         O
            `
        ],
        speed: 200
    },
    rocket: {
        frames: [
            `



        /\\
       /  \\
      |    |
      | () |
      |____|
     /|    |\\
    / |    | \\
   ==============================
            `,
            `


        /\\
       /  \\
      |    |
      | () |
      |____|
     /|    |\\
    / |    | \\
      ======
   ==============================
            `,
            `

        /\\
       /  \\
      |    |
      | () |
      |____|
     /|    |\\
    / |    | \\
        ====
      ======
   ==============================
            `,
            `
        /\\
       /  \\
      |    |
      | () |
      |____|
     /|    |\\
    / |    | \\
          ==
        ====
      ======
   ==============================
            `
        ],
        speed: 300
    },
    clock: {
        frames: [],
        speed: 1000,
        generate: function() {
            const time = new Date();
            const hours = String(time.getHours()).padStart(2, '0');
            const minutes = String(time.getMinutes()).padStart(2, '0');
            const seconds = String(time.getSeconds()).padStart(2, '0');

            return `
   ╔═══════════════════╗
   ║                   ║
   ║    ⏰  CLOCK  ⏰   ║
   ║                   ║
   ║     ${hours}:${minutes}:${seconds}    ║
   ║                   ║
   ╚═══════════════════╝

   ${time.toLocaleDateString()}
            `;
        }
    },
    bounce: {
        frames: [
            `







              o
   ================================
            `,
            `





              o


   ================================
            `,
            `



              o



   ================================
            `,
            `

              o




   ================================
            `,
            `
              o





   ================================
            `,
            `



              o



   ================================
            `,
            `





              o


   ================================
            `
        ],
        speed: 150
    }
};

function playAnimation(animationType) {
    if (playgroundAnimation) {
        clearInterval(playgroundAnimation);
    }

    playgroundFrame = 0;
    const anim = animations[animationType];

    playgroundAnimation = setInterval(() => {
        if (playgroundOutput) {
            if (anim.generate) {
                playgroundOutput.textContent = anim.generate();
            } else {
                playgroundOutput.textContent = anim.frames[playgroundFrame % anim.frames.length];
                playgroundFrame++;
            }
        }
    }, anim.speed);

    // Initial render
    if (playgroundOutput) {
        if (anim.generate) {
            playgroundOutput.textContent = anim.generate();
        } else {
            playgroundOutput.textContent = anim.frames[0];
        }
    }
}

// Set up control buttons
controlButtons.forEach(button => {
    button.addEventListener('click', () => {
        const animationType = button.getAttribute('data-animation');
        playAnimation(animationType);

        // Update active state
        controlButtons.forEach(btn => btn.style.background = '');
        button.style.background = 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)';
        button.style.color = 'var(--bg-dark)';
    });
});

// Start with train animation
playAnimation('train');

// Smooth scroll for better mobile experience
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add scroll reveal animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all sections
document.querySelectorAll('section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(30px)';
    section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(section);
});

// Performance optimization: Pause animations when not visible
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause animations
    } else {
        // Resume animations
    }
});

console.log(`
╔═══════════════════════════════════════╗
║                                       ║
║   Welcome to Terminal Animation!      ║
║                                       ║
║   Explore the art of ASCII            ║
║                                       ║
╚═══════════════════════════════════════╝
`);
