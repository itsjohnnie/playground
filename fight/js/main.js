// Boot: renderer, resize, main loop.
import * as THREE from 'three';
import { Game } from './game.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const game = new Game(renderer);
window.__game = game;

// Bloom makes the LEDs, pyro, spotlights and glowing specials pop.
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(game.scene, game.cam.cam));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.7, 0.4, 2.2);
composer.addPass(bloom);
composer.addPass(new OutputPass());
game.bloom = bloom;

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setSize(innerWidth, innerHeight);
  composer.setPixelRatio(Math.min(devicePixelRatio, 2));
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
    if (game.settings.bloom === false) renderer.render(game.scene, game.cam.cam);
    else composer.render(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}, 30));
