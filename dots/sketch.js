let gridSize = 40;
let cellSize;
let pills = [];
let pillCount = 200;
let lerpAmount = 0.1;
let animationSpeed = 1.0;
let gridOpacity = 60;
let gridThickness = 3;
let stretchAmount = 2.5; // How much pills stretch during movement
let movementFrequency = 50; // 0-100: 0=only one at a time, 100=all moving
let overshoot = 0; // How much to overshoot the target (0 = no overshoot, 1 = lots of bounce)
let easingType = 'inOutCubic'; // 'inOutCubic', 'inOutQuad', 'inOutSine', 'linear'

const colors = [
  [255, 105, 180], // hot pink
  [65, 155, 255], // vibrant blue
  [255, 195, 0], // bright yellow
  [255, 255, 255], // white
  [255, 87, 51], // bright coral/orange
  [0, 229, 255], // cyan
];

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Calculate composition size (with 4rem padding)
  let compositionSize = min(windowWidth, windowHeight - 128);
  cellSize = compositionSize / gridSize;

  // Generate pills
  for (let i = 0; i < pillCount; i++) {
    let pill = createRandomPill();
    pills.push(pill);
  }

  frameRate(60);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  let compositionSize = min(windowWidth, windowHeight - 128);
  cellSize = compositionSize / gridSize;
}

function regeneratePills() {
  pills = [];
  for (let i = 0; i < pillCount; i++) {
    let pill = createRandomPill();
    pills.push(pill);
  }
}

function draw() {
  background(0);

  // Center the composition
  push();
  translate(width/2, height/2);
  translate(-gridSize * cellSize / 2, -gridSize * cellSize / 2);

  // Update and draw pills FIRST (below grid)
  noStroke();

  // Count currently moving pills
  let movingCount = 0;
  for (let pill of pills) {
    if (pill.isMoving) movingCount++;
  }

  // Calculate max concurrent movements based on frequency
  let maxConcurrent = max(1, floor(pills.length * (movementFrequency / 100)));

  for (let pill of pills) {
    // Update target position periodically
    if (frameCount % pill.moveInterval === 0 && !pill.isMoving) {
      // Only start moving if we haven't reached the concurrent limit
      if (movingCount < maxConcurrent) {
        // Start moving to a new location
        pill.isMoving = true;
        pill.moveProgress = 0;
        pill.startX = pill.targetX;
        pill.startY = pill.targetY;
        movingCount++;
      }

      // Choose random new target
      let direction = floor(random(4));
      let distance = floor(random(1, 6));

      switch(direction) {
        case 0: pill.newTargetX = pill.targetX + distance; pill.newTargetY = pill.targetY; break; // right
        case 1: pill.newTargetX = pill.targetX - distance; pill.newTargetY = pill.targetY; break; // left
        case 2: pill.newTargetX = pill.targetX; pill.newTargetY = pill.targetY + distance; break; // down
        case 3: pill.newTargetX = pill.targetX; pill.newTargetY = pill.targetY - distance; break; // up
      }

      // Allow pills to move to any edge
      pill.newTargetX = constrain(pill.newTargetX, 0, gridSize - 1);
      pill.newTargetY = constrain(pill.newTargetY, 0, gridSize - 1);
    }

    // Handle movement animation
    if (pill.isMoving) {
      pill.moveProgress += 0.02 * animationSpeed;

      if (pill.moveProgress >= 1) {
        pill.moveProgress = 1;
        pill.isMoving = false;
        pill.targetX = pill.newTargetX;
        pill.targetY = pill.newTargetY;
        pill.currentX = pill.targetX;
        pill.currentY = pill.targetY;
      } else {
        // Smooth easing
        let eased = applyEasing(pill.moveProgress, easingType);
        pill.currentX = lerp(pill.startX, pill.newTargetX, eased);
        pill.currentY = lerp(pill.startY, pill.newTargetY, eased);
      }
    }

    let px = pill.currentX * cellSize + cellSize/2;
    let py = pill.currentY * cellSize + cellSize/2;
    let pillSize = cellSize * 0.5;

    push();
    translate(px, py);

    if (pill.isMoving) {
      // Calculate stretch based on movement
      let stretch = 1 + sin(pill.moveProgress * PI) * stretchAmount;
      let isHorizontal = abs(pill.startX - pill.newTargetX) > abs(pill.startY - pill.newTargetY);

      // Calculate direction of movement for highlight positioning
      let dx = pill.newTargetX - pill.startX;
      let dy = pill.newTargetY - pill.startY;
      let angle = atan2(dy, dx);

      // Smoothly transition highlight from leading edge to center as stretch decreases
      let transitionProgress = 1;
      if (stretch < 1.5) {
        // When stretch is between 1.3 and 1.0, transition from edge to center
        transitionProgress = map(stretch, 1, 1.5, 0, 1);
      }

      let highlightDist = pillSize * 0.2 * transitionProgress;
      let highlightX = cos(angle) * highlightDist;
      let highlightY = sin(angle) * highlightDist;

      if (stretch > 1.3) {
        // Draw as stretched pill during movement (no inner highlight)
        fill(pill.color);
        if (isHorizontal) {
          drawPill(pillSize * stretch, pillSize, null, pill.color, highlightX, 0);
        } else {
          rotate(HALF_PI);
          drawPill(pillSize * stretch, pillSize, null, pill.color, highlightY, 0);
        }
      } else {
        // Draw as circle when barely moving
        fill(pill.color);
        ellipse(0, 0, pillSize);

        // Add highlight smoothly transitioning to center
        fill(255, 255, 255, 120);
        ellipse(highlightX, highlightY, pillSize * 0.25);
      }
    } else {
      // Draw as circle when stationary - centered highlight
      fill(pill.color);
      ellipse(0, 0, pillSize);

      // Add centered highlight
      fill(255, 255, 255, 120);
      ellipse(0, 0, pillSize * 0.25);
    }

    pop();
  }

  // Draw grid dots LAST (on top of pills)
  stroke(255, 255, 255, gridOpacity);
  strokeWeight(gridThickness);
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      point(i * cellSize + cellSize/2, j * cellSize + cellSize/2);
    }
  }

  pop(); // End centering
}

function drawPill(w, h, gradient, baseColor, highlightX = 0, highlightY = 0) {
  if (gradient) {
    // Draw gradient pill
    let col1 = gradient[0];
    let col2 = gradient[1];

    // Left half
    fill(col1);
    arc(-w/4, 0, h, h, HALF_PI, PI + HALF_PI);
    rect(-w/4, -h/2, w/2, h);

    // Right half
    fill(col2);
    arc(w/4, 0, h, h, -HALF_PI, HALF_PI);
    rect(0, -h/2, w/2, h);

    // Highlights on gradient pills
    fill(255, 255, 255, 100);
    ellipse(-w/4, 0, h * 0.3);
    ellipse(w/4, 0, h * 0.3);
  } else {
    // Solid pill
    fill(baseColor);
    arc(-w/2 + h/2, 0, h, h, HALF_PI, PI + HALF_PI);
    arc(w/2 - h/2, 0, h, h, -HALF_PI, HALF_PI);
    rectMode(CENTER);
    rect(0, 0, w - h, h);
    rectMode(CORNER);
  }
}

function createRandomPill() {
  let startX = floor(random(gridSize));
  let startY = floor(random(gridSize));

  let pill = {
    targetX: startX,
    targetY: startY,
    currentX: startX,
    currentY: startY,
    startX: startX,
    startY: startY,
    newTargetX: startX,
    newTargetY: startY,
    color: random(colors),
    moveInterval: floor(random(60, 150)),
    isMoving: false,
    moveProgress: 0
  };

  return pill;
}

function applyEasing(t, type) {
  let eased;

  switch(type) {
    case 'linear':
      eased = t;
      break;
    case 'inOutQuad':
      eased = t < 0.5 ? 2 * t * t : 1 - pow(-2 * t + 2, 2) / 2;
      break;
    case 'inOutCubic':
      eased = t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2;
      break;
    case 'inOutSine':
      eased = -(cos(PI * t) - 1) / 2;
      break;
    default:
      eased = t;
  }

  // Apply overshoot/elastic effect if enabled
  if (overshoot > 0) {
    // Elastic overshoot effect
    let c4 = (2 * PI) / 3;
    if (t === 0 || t === 1) {
      return eased;
    }
    // Apply elastic effect at the end
    if (t > 0.5) {
      let elasticPart = pow(2, -10 * (t - 0.5) * 2) * sin(((t - 0.5) * 2 - 0.75) * c4) * overshoot * 0.5;
      return eased + elasticPart;
    }
  }

  return eased;
}

function mousePressed() {
  regeneratePills();
}
