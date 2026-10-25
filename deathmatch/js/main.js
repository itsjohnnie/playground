// Boot: renderer, resize, main loop.
import * as THREE from 'three';
import { Game } from './game.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const game = new Game(renderer);
window.__game = game;

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  game.resize(innerWidth, innerHeight);
}
addEventListener('resize', resize);
resize();

// Let the loading screen paint before the heavy portrait pass.
requestAnimationFrame(() => setTimeout(() => {
  game.boot();
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.frame(dt);
    renderer.render(game.scene, game.cam.cam);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}, 30));
