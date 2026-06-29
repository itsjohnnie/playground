"use client";

import Script from "next/script";
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
    document.body.appendChild( renderer.domElement );
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
    };
  }, []);

  return (
    <>
      {/* Inconsolata via Google WebFont loader (matches original) */}
      <Script
        src="https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"
        strategy="afterInteractive"
        onLoad={() => {
          // @ts-expect-error injected global
          window.WebFont?.load({ google: { families: ["Inconsolata:400,700"] } });
        }}
      />
      {/* Adobe Fonts / Typekit kit (eckmannpsych, program-narrow, franklin-gothic, Henrietta) */}
      <Script
        src="https://use.typekit.net/uqs5mpm.js"
        strategy="afterInteractive"
        onLoad={() => {
          try {
            // @ts-expect-error injected global
            window.Typekit?.load();
          } catch {
            /* noop */
          }
        }}
      />
    </>
  );
}
