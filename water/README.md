# Water Circle - Liquid Physics

An interactive web app featuring a circle filled with liquid that responds realistically to your phone's movements.

## Features

- **Realistic Liquid Physics**: 150 particles simulate liquid behavior with gravity, surface tension, and momentum
- **Device Motion Integration**: Tilting your phone moves the liquid naturally
- **Smooth Rendering**: Metaball algorithm creates smooth, blob-like liquid effects
- **Responsive Design**: Works on various screen sizes
- **iOS & Android Support**: Handles permission requests for device motion on both platforms

## How to Use

1. Open `index.html` in a mobile browser
2. On iOS 13+, tap "Enable Motion" to grant permission
3. Tilt your device to watch the liquid move and slosh around
4. The liquid responds to gravity and the orientation of your phone

## Technical Details

- **Physics Engine**: Custom particle-based simulation
- **Rendering**: Canvas 2D with metaball algorithm for smooth liquid appearance
- **Motion Detection**: DeviceOrientation and DeviceMotion APIs
- **Performance**: Optimized for 60fps on mobile devices

## Files

- `index.html` - Main HTML structure
- `style.css` - Styling and responsive design
- `script.js` - Liquid physics simulation and device motion handling

## Browser Compatibility

- iOS Safari (13+)
- Chrome for Android
- Any modern mobile browser with device motion support

## Physics Parameters

You can adjust these in `script.js`:
- `PARTICLE_COUNT`: Number of liquid particles (default: 150)
- `GRAVITY`: Strength of gravity effect (default: 0.5)
- `DAMPING`: Energy loss on movement (default: 0.98)
- `SURFACE_TENSION`: How particles stick together (default: 0.02)
