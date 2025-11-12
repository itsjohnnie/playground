# Water Circle - Liquid Physics

An interactive web app featuring a circle filled with liquid that responds realistically to your phone's movements.

## Features

- **Realistic Liquid Physics**: 250 particles with SPH (Smoothed Particle Hydrodynamics) algorithm
  - Pressure-based fluid dynamics
  - Viscosity simulation for realistic flow
  - Surface tension for cohesive liquid behavior
  - Density-aware particle interactions
- **WebGL Shader Rendering**: Hardware-accelerated realistic water appearance
  - Dynamic lighting with diffuse and specular highlights
  - Normal-mapped surface for 3D depth effect
  - Caustics animation for underwater light patterns
  - Transparency and depth-based color gradients
- **Device Motion Integration**: Real-time response to phone tilting
- **Advanced Metaball Rendering**: Smooth, organic liquid surface
- **Responsive Design**: Works on various screen sizes with DPI awareness
- **iOS & Android Support**: Permission handling for all modern devices

## How to Use

1. Open `index.html` in a mobile browser
2. On iOS 13+, tap "Enable Motion" to grant permission
3. Tilt your device to watch the liquid move and slosh around
4. The liquid responds to gravity and the orientation of your phone

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
- `PARTICLE_COUNT`: Number of liquid particles (default: 250)
- `GRAVITY`: Strength of gravity effect (default: 0.8)
- `DAMPING`: Energy loss on movement (default: 0.985)
- `SURFACE_TENSION`: How particles stick together (default: 0.05)
- `REST_DENSITY`: Target density for fluid (default: 1.0)
- `GAS_CONSTANT`: Pressure calculation constant (default: 2000)
- `VISCOSITY`: Fluid thickness/resistance (default: 0.5)
- `INTERACTION_RADIUS`: Particle influence radius (default: 15)

## Shader Customization

Modify visual appearance in the fragment shader:
- Water color (deep/shallow gradients)
- Lighting intensity (ambient, diffuse, specular)
- Caustics animation speed and intensity
- Surface smoothness and transparency
