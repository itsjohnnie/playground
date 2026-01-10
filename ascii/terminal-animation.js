// ============================================
// Terminal Animation - The Definitive Guide
// ============================================

// === NAVIGATION SCROLL SPY ===
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.section, .hero');

// Intersection Observer for scroll spy
const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -70% 0px',
    threshold: 0
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            if (id) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        }
    });
}, observerOptions);

// Observe all sections
sections.forEach(section => {
    if (section.getAttribute('id')) {
        observer.observe(section);
    }
});

// Smooth scroll for navigation links
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        if (targetSection) {
            targetSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// === HERO ANIMATION ===
const heroOutput = document.getElementById('hero-output');
let heroFrame = 0;

// Create balanced ASCII art frames for TERMINAL
const heroFrames = [
`
  ████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗
  ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║
     ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║
     ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║
     ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗
     ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝
`,
`
  ▀█▀ █▀▀ █▀█ █▀▄▀█ █ █▄ █ ▄▀█ █
   █  ██▄ █▀▄ █ ▀ █ █ █ ▀█ █▀█ █▄▄
`
];

function animateHero() {
    if (!heroOutput) return;
    heroOutput.textContent = heroFrames[heroFrame];
    heroFrame = (heroFrame + 1) % heroFrames.length;
}
setInterval(animateHero, 3000);
animateHero();

// === CORE TECHNIQUES ===

// 1. Frame-based animation
const frameDemo = document.getElementById('frame-demo');
const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let frameIdx = 0;

function animateFrameDemo() {
    if (!frameDemo) return;
    frameDemo.textContent = `
 ${frames[frameIdx]} Loading...

 Frame: ${frameIdx + 1}/${frames.length}
 Method: Pre-rendered frames
`;
    frameIdx = (frameIdx + 1) % frames.length;
}
setInterval(animateFrameDemo, 100);

// 2. Procedural generation
const proceduralDemo = document.getElementById('procedural-demo');
let procTime = 0;

function animateProceduralDemo() {
    if (!proceduralDemo) return;
    const width = 40;
    const height = 6;
    let output = '';

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const value = Math.sin(x * 0.3 + procTime) * Math.cos(y * 0.5);
            const char = value > 0.3 ? '█' : value > 0 ? '▓' : value > -0.3 ? '▒' : '░';
            output += char;
        }
        output += '\n';
    }

    proceduralDemo.textContent = output;
    procTime += 0.15;
}
setInterval(animateProceduralDemo, 80);

// 3. Buffer manipulation
const bufferDemo = document.getElementById('buffer-demo');
let bufferX = 0;
const bufferWidth = 40;
const bufferHeight = 6;

function animateBufferDemo() {
    if (!bufferDemo) return;
    const buffer = Array(bufferHeight).fill(null).map(() => Array(bufferWidth).fill(' '));

    // Add bouncing ball
    const y = Math.floor(Math.abs(Math.sin(bufferX * 0.1)) * (bufferHeight - 1));
    buffer[y][bufferX % bufferWidth] = '●';

    // Add trail
    for (let i = 1; i <= 3; i++) {
        const trailX = (bufferX - i + bufferWidth) % bufferWidth;
        const trailY = Math.floor(Math.abs(Math.sin((bufferX - i) * 0.1)) * (bufferHeight - 1));
        if (buffer[trailY][trailX] === ' ') {
            buffer[trailY][trailX] = '·';
        }
    }

    bufferDemo.textContent = buffer.map(row => row.join('')).join('\n');
    bufferX++;
}
setInterval(animateBufferDemo, 60);

// 4. Character replacement (cursor demo)
const cursorDemo = document.getElementById('cursor-demo');
let cursorPos = 0;
const cursorWidth = 40;

function animateCursorDemo() {
    if (!cursorDemo) return;
    const line1 = ' '.repeat(cursorPos) + '█' + ' '.repeat(cursorWidth - cursorPos - 1);
    const line2 = '-'.repeat(cursorWidth);
    const line3 = `Position: ${cursorPos}, ${Math.floor(cursorPos / cursorWidth * 100)}%`;

    cursorDemo.textContent = `${line1}\n${line2}\n\n${line3}`;
    cursorPos = (cursorPos + 1) % cursorWidth;
}
setInterval(animateCursorDemo, 50);

// === COMMON PATTERNS ===

// Progress indicator
const progressPattern = document.getElementById('progress-pattern');
let progress = 0;

function animateProgress() {
    if (!progressPattern) return;
    const filled = Math.floor(progress * 20);
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
    progressPattern.textContent = `\n [${bar}] ${Math.floor(progress * 100)}%\n`;
    progress = (progress + 0.02) % 1.01;
}
setInterval(animateProgress, 100);

// Loading spinner
const spinnerPattern = document.getElementById('spinner-pattern');
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerIdx = 0;

function animateSpinner() {
    if (!spinnerPattern) return;
    spinnerPattern.textContent = `\n  ${spinnerFrames[spinnerIdx]} Processing...\n`;
    spinnerIdx = (spinnerIdx + 1) % spinnerFrames.length;
}
setInterval(animateSpinner, 80);

// Live counter
const counterPattern = document.getElementById('counter-pattern');
let counter = 0;

function animateCounter() {
    if (!counterPattern) return;
    counterPattern.textContent = `\n  Count: ${counter}\n  Items processed\n`;
    counter++;
}
setInterval(animateCounter, 150);

// Text reveal
const revealPattern = document.getElementById('reveal-pattern');
const revealText = 'Loading terminal...';
let revealIdx = 0;

function animateReveal() {
    if (!revealPattern) return;
    const visible = revealText.substring(0, revealIdx);
    const cursor = revealIdx < revealText.length ? '_' : '';
    revealPattern.textContent = `\n  ${visible}${cursor}\n`;
    revealIdx = (revealIdx + 1) % (revealText.length + 10);
}
setInterval(animateReveal, 100);

// Marquee scroll
const marqueePattern = document.getElementById('marquee-pattern');
const marqueeText = '    Welcome to terminal animation    ';
let marqueeOffset = 0;

function animateMarquee() {
    if (!marqueePattern) return;
    const shifted = marqueeText.substring(marqueeOffset) + marqueeText.substring(0, marqueeOffset);
    marqueePattern.textContent = `\n  ${shifted.substring(0, 25)}\n`;
    marqueeOffset = (marqueeOffset + 1) % marqueeText.length;
}
setInterval(animateMarquee, 100);

// Blink effect
const blinkPattern = document.getElementById('blink-pattern');
let blinkVisible = true;

function animateBlink() {
    if (!blinkPattern) return;
    const text = blinkVisible ? '█ ALERT █' : '         ';
    blinkPattern.textContent = `\n    ${text}\n`;
    blinkVisible = !blinkVisible;
}
setInterval(animateBlink, 500);

// === CONSOLE MESSAGE ===
console.log(`
╔═══════════════════════════════════════════╗
║  Terminal Animation - The Definitive Guide ║
║                                           ║
║  All animations render in real-time       ║
║  using pure JavaScript                    ║
║                                           ║
║  Open DevTools to see this message        ║
║  View source to explore techniques        ║
╚═══════════════════════════════════════════╝
`);
