# Water Circle - Liquid Physics

An interactive web app featuring a circle filled with dramatic black and white dithered liquid that bashes against the edges as you tilt your phone.

## Features

- **Dramatic Liquid Physics**: 400 particles with enhanced SPH (Smoothed Particle Hydrodynamics)
  - Amplified forces for visually dramatic movement
  - Enhanced bounce and splash effects at circle edges
  - Pressure-based fluid dynamics
  - Viscosity simulation for realistic flow
  - Surface tension for cohesive liquid behavior
- **Black & White Dithered Rendering**: Retro aesthetic with modern physics
  - Bayer matrix 4x4 dithering for classic look
  - WebGL shader-based rendering
  - Dynamic lighting and edge detection
  - Animated wave patterns
  - Pure black and white output
- **Enhanced Device Motion**: Highly responsive to phone tilting
  - Amplified sensitivity for dramatic effect
  - Smooth tilt transitions
  - Desktop mouse drag support for testing
- **Advanced Metaball Rendering**: Smooth, organic liquid surface
- **Responsive Design**: Works on various screen sizes with DPI awareness
- **iOS & Android Support**: Permission handling for all modern devices

## How to Use

1. Open `index.html` in a mobile browser
2. On iOS 13+, tap "Enable Motion" to grant permission
3. Tilt your device and watch the dithered liquid bash dramatically against the walls
4. The liquid responds with amplified movement to your phone's orientation
5. On desktop: Click and drag to simulate tilting

## Technical Details

- **Physics Engine**: SPH (Smoothed Particle Hydrodynamics) simulation
  - Realistic pressure and density calculations
  - Viscosity forces for fluid-like behavior
  - Surface tension implementation
  - Neighbor-based particle interactions
- **Rendering Pipeline**:
  - Canvas 2D for metaball field generation
  - WebGL for hardware-accelerated shader rendering
  - Real-time normal calculation from density field
  - Dynamic lighting and caustics effects
- **Motion Detection**: DeviceOrientation and DeviceMotion APIs
- **Performance**: Hardware-accelerated, optimized for 60fps on mobile devices

## Files

- `index.html` - Main HTML structure
- `style.css` - Styling and responsive design
- `script.js` - Liquid physics simulation and device motion handling

## Browser Compatibility

- iOS Safari (13+) with WebGL support
- Chrome for Android with WebGL support
- Any modern mobile browser with WebGL and device motion support
- Desktop browsers for testing (use mouse/trackpad simulation)

## Physics Parameters

You can adjust these in `script.js`:
- `PARTICLE_COUNT`: Number of liquid particles (default: 400)
- `GRAVITY`: Strength of gravity effect (default: 1.5)
- `DAMPING`: Energy loss on movement (default: 0.97)
- `BOUNCE_FORCE`: Extra energy on wall collision (default: 0.4)
- `SURFACE_TENSION`: How particles stick together (default: 0.08)
- `REST_DENSITY`: Target density for fluid (default: 1.2)
- `GAS_CONSTANT`: Pressure calculation constant (default: 5000)
- `VISCOSITY`: Fluid thickness/resistance (default: 0.3)
- `INTERACTION_RADIUS`: Particle influence radius (default: 18)

## Shader Customization

Modify visual appearance in the fragment shader (script.js:239-325):
- Bayer matrix dithering pattern (currently 4x4)
- Edge detection intensity
- Wave pattern frequency and amplitude
- Brightness calculation weights
- Lighting direction and intensity
