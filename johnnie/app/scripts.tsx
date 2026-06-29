"use client";

import { useEffect } from "react";
import { asset } from "@/lib/asset";

// Exact list of Webflow runtime chunks (IX2 interactions + Lottie), in the
// order Webflow ships them, followed by the entry loader. They self-assemble
// via self.webpackChunk with no network calls.
const WEBFLOW_CHUNKS = [
  "/js/webflow.schunk.36b8fb49256177c8.js",
  "/js/webflow.schunk.8208d3e53b97e3c7.js",
  "/js/webflow.schunk.c7aa0cc1620bfec5.js",
  "/js/webflow.schunk.a2895b93f03a774a.js",
  "/js/webflow.schunk.b4435221be879eb3.js",
  "/js/webflow.schunk.b1adc1fa4495e600.js",
];
const WEBFLOW_MAIN = "/js/webflow.86be44b3.17ea3bd94fa9c2fe.js";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = false; // preserve execution order
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("failed to load " + src));
    document.body.appendChild(s);
  });
}

function runInline(code: string) {
  const s = document.createElement("script");
  s.text = code;
  document.body.appendChild(s);
}

// The page background-color is animated frame-by-frame by Webflow's JS (the
// cycling hue), written straight onto <body>. The fixed nav has its own color
// that can lag/freeze, causing a duotone clash on mobile. Rather than push the
// color onto each nav element, we mirror the body's current color into a single
// CSS custom property (--bg) on the root each frame; CSS then drives the nav
// (and anything else) off var(--bg), so everything stays in sync by design.
function syncBgVar(): () => void {
  let raf = 0;
  let last = "";
  const tick = () => {
    const c =
      document.body.style.backgroundColor ||
      getComputedStyle(document.body).backgroundColor;
    if (c && c !== last) {
      last = c;
      document.documentElement.style.setProperty("--bg", c);
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

// Three.js smoke field (verbatim from the original, texture localized).
const SMOKE_INIT = `
var camera, scene, renderer,
    geometry, material, mesh;

init();
animate();

function init() {
   clock = new THREE.Clock();

    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.z = 1000;
    scene.add( camera );

    geometry = new THREE.CubeGeometry( 200, 200, 200 );
    material = new THREE.MeshLambertMaterial( { color: 0xffffff, wireframe: false } );
    mesh = new THREE.Mesh( geometry, material );
    cubeSineDriver = 0;

    THREE.ImageUtils.crossOrigin = '';

    light = new THREE.DirectionalLight(0xffffff,0.5);
    light.position.set(-1,0,1);
    scene.add(light);

    smokeTexture = THREE.ImageUtils.loadTexture('${asset("/vendor/Smoke-Element.png")}');
    smokeMaterial = new THREE.MeshLambertMaterial({color: 0xffffff, map: smokeTexture, transparent: true});
    smokeGeo = new THREE.PlaneGeometry(300,300);
    smokeParticles = [];

    for (p = 0; p < 150; p++) {
        var particle = new THREE.Mesh(smokeGeo,smokeMaterial);
        particle.position.set(Math.random()*500-250,Math.random()*500-250,Math.random()*1000-100);
        particle.rotation.z = Math.random() * 360;
        scene.add(particle);
        smokeParticles.push(particle);
    }
    // Contain the smoke to the hero so it fills (and scrolls with) the hero
    // instead of a fixed viewport-height band glued to the top of the page.
    var __hero = document.querySelector('#hero') || document.body;
    renderer.domElement.style.cssText = 'position:absolute !important;top:0 !important;left:0 !important;right:0 !important;bottom:0 !important;width:100% !important;height:100% !important;mix-blend-mode:plus-lighter;pointer-events:none;opacity:0.75;';
    __hero.appendChild( renderer.domElement );
}

function animate() {
    delta = clock.getDelta();
    requestAnimationFrame( animate );
    evolveSmoke();
    render();
}

function evolveSmoke() {
    var sp = smokeParticles.length - 1;
    while(sp >= 0) {
      smokeParticles[sp].rotation.z += (delta * 0.2);
      sp = sp - 1;
    }
}

function render() {
    mesh.rotation.x += 0.005;
    mesh.rotation.y += 0.01;
    cubeSineDriver += .01;
    mesh.position.z = 100 + (Math.sin(cubeSineDriver) * 500);
    renderer.render( scene, camera );
}
`;

export default function Scripts() {
  useEffect(() => {
    let cancelled = false;
    const stopNavSync = syncBgVar();
    (async () => {
      try {
        await loadScript(asset("/vendor/jquery-3.5.1.min.js"));
        for (const c of WEBFLOW_CHUNKS) {
          if (cancelled) return;
          await loadScript(asset(c));
        }
        if (cancelled) return;
        await loadScript(asset(WEBFLOW_MAIN));

        // Three.js smoke background
        if (cancelled) return;
        await loadScript(asset("/vendor/three.min.js"));
        await loadScript(asset("/vendor/Stats.js"));
        if (cancelled) return;
        runInline(SMOKE_INIT);
      } catch (e) {
        // Non-fatal: visuals degrade gracefully if a runtime asset fails.
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
      stopNavSync();
    };
  }, []);

  // Fonts are now loaded via render-blocking <link> stylesheets in the <head>
  // (see app/layout.tsx) to avoid the flash-of-unstyled-text / layout shift.
  return null;
}
