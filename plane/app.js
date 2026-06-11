/* ============================================================
   plane — porthole
   1. A WebGL "demo flight" sky (full day/night cycle) so the
      window works with zero assets.
   2. Drag-and-drop / file-picker to play your own flight videos.
   3. An ambient sampler: every ~180ms the pixels inside the
      window are averaged and turned into a lighting palette
      (CSS custom properties), so the cabin always matches the
      footage — day, golden hour, or night.
   ============================================================ */

(() => {
    'use strict';

    const root = document.documentElement;
    const porthole = document.querySelector('.porthole');
    const skyCanvas = document.getElementById('sky');
    const video = document.getElementById('feed');
    const video2 = document.getElementById('feed2');
    const shade = document.getElementById('shade');
    const glass = shade.parentElement;
    const deck = document.getElementById('deck');
    const chips = document.getElementById('chips');
    const fileInput = document.getElementById('file');
    const daySlider = document.getElementById('day');
    const autoBtn = document.getElementById('auto');
    const lightsBtn = document.getElementById('lights');

    /* ============================== demo sky (WebGL) */

    const VERT = `
        attribute vec2 aPos;
        void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
    `;

    const FRAG = `
        precision highp float;
        uniform vec2 uRes;
        uniform float uTime;
        uniform float uDay;  // 0 midnight .. 0.5 noon .. 1 midnight
        uniform float uBank; // aircraft roll, radians

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        float noise(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
                       mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
        }
        float fbm(vec2 p) {
            float v = 0.0, a = 0.5;
            for (int i = 0; i < 5; i++) {
                v += a * noise(p);
                p = p * 2.03 + 11.3;
                a *= 0.5;
            }
            return v;
        }

        // point-source stars: gaussian falloff, magnitude distribution,
        // color temperature, and subtle irregular scintillation
        vec3 stars(vec2 uv, float aspect, float t) {
            vec3 acc = vec3(0.0);
            vec2 p = uv * vec2(aspect, 1.0) * 110.0;
            vec2 cell = floor(p);
            for (int j = -1; j <= 1; j++) {
                for (int i = -1; i <= 1; i++) {
                    vec2 c = cell + vec2(float(i), float(j));
                    float h = hash(c);
                    // sparse: through cabin glass only brighter stars read
                    if (h > 0.9955 - 0.006 * noise(c * 0.13)) {
                        vec2 pos = c + vec2(hash(c + 1.3), hash(c + 2.7));
                        float d = length(p - pos);
                        float mag = pow(hash(c + 4.1), 3.0);   // few bright, many dim
                        // scintillation: slow, two incommensurate frequencies,
                        // stronger on dim stars, never a hard blink
                        float ph = h * 43.0;
                        float tw = 1.0 - (0.30 - 0.22 * mag)
                            * (0.5 + 0.5 * sin(t * (1.3 + 2.1 * hash(c + 7.0)) + ph)
                                          * sin(t * 0.7 + ph * 1.7));
                        float b = exp(-d * d * (34.0 - 26.0 * mag))
                                * (0.10 + 1.15 * mag) * tw;
                        b += exp(-d * d * 3.0) * mag * mag * 0.18;   // halo on bright ones
                        vec3 tint = mix(vec3(1.0, 0.84, 0.62),       // K-type warm
                                        vec3(0.72, 0.84, 1.0),       // B-type blue
                                        hash(c + 9.2));
                        acc += mix(vec3(1.0), tint, 0.55) * b;
                    }
                }
            }
            return acc;
        }

        void main() {
            vec2 uv = gl_FragCoord.xy / uRes;
            float aspect = uRes.x / uRes.y;

            // banking: roll the whole view around its center
            vec2 pc = (uv - 0.5) * vec2(aspect, 1.0);
            float cb = cos(uBank), sb = sin(uBank);
            pc = mat2(cb, -sb, sb, cb) * pc;
            uv = pc / vec2(aspect, 1.0) + 0.5;

            float se = sin((uDay - 0.25) * 6.28318530718);   // sun elevation -1..1
            float daylight = smoothstep(-0.12, 0.3, se);
            float dusk = exp(-abs(se) * 7.0) * (1.0 - daylight * 0.4);

            float horizon = 0.24;

            // sun travels across the window through the day
            float sx = mix(1.25, -0.25, clamp((uDay - 0.22) / 0.56, 0.0, 1.0));
            vec2 sun = vec2(sx, horizon + se * 0.85);

            vec3 zen = mix(vec3(0.012, 0.02, 0.05), vec3(0.16, 0.38, 0.78), daylight);
            vec3 hor = mix(vec3(0.04, 0.06, 0.11), vec3(0.62, 0.78, 0.95), daylight);
            vec3 duskCol = vec3(0.98, 0.45, 0.18);

            float h = clamp((uv.y - horizon) / (1.0 - horizon), 0.0, 1.0);
            vec3 sky = mix(hor, zen, pow(h, 0.75));
            sky += duskCol * dusk * exp(-h * 3.5) * 0.9;

            // sun glow + disc
            vec2 d2 = (uv - sun) * vec2(aspect, 1.0);
            float d = length(d2);
            vec3 sunCol = mix(vec3(1.0, 0.55, 0.25), vec3(1.0, 0.95, 0.85),
                              clamp(se * 1.6, 0.0, 1.0));
            sky += sunCol * exp(-d * d * 22.0) * 0.85 * smoothstep(-0.25, 0.0, se);
            sky += sunCol * smoothstep(0.035, 0.028, d) * smoothstep(-0.1, 0.05, se);

            // stars: fade in with night, sink into the horizon haze,
            // and wash out near any residual dusk glow. They drift left
            // far slower than the clouds — distant parallax in flight
            float night = 1.0 - daylight;
            sky += stars(vec2(uv.x + uTime * 0.005, uv.y), aspect, uTime)
                 * night * (1.0 - dusk * 0.8)
                 * smoothstep(horizon, horizon + 0.22, uv.y);

            // thin streaky cirrus bands, sliding past as the plane flies
            float cir = fbm(vec2(uv.x * 2.6 + uTime * 0.045, uv.y * 16.0)) * 0.7
                      + fbm(vec2(uv.x * 5.5 - uTime * 0.02, uv.y * 30.0 + 4.7)) * 0.4;
            float wisp = smoothstep(0.52, 0.82, cir) * 0.30;
            sky += wisp * mix(vec3(0.08, 0.10, 0.18), vec3(0.96, 0.98, 1.0), daylight)
                 * smoothstep(horizon + 0.04, horizon + 0.4, uv.y);

            vec3 col = sky;

            // scattered cumulus far below, seen from cruise altitude
            if (uv.y < horizon + 0.02) {
                float depth = (horizon - uv.y) + 0.02;
                float persp = 1.0 / (depth * 2.2 + 0.06);
                // world-space drift: near clouds sweep left faster than
                // far ones (the perspective divide gives the parallax)
                vec2 cp = vec2((uv.x - 0.5) * persp + uTime * 0.085,
                               persp * 1.4 + uTime * 0.025);

                // the layer below is a bright, milky cloud bank: gaps are
                // pale hazy blue-grey, never dark water
                vec3 sea = mix(vec3(0.015, 0.025, 0.05),
                               vec3(0.52, 0.62, 0.72), daylight);
                sea = mix(sea, duskCol * 0.5 + vec3(0.05), dusk * 0.55);
                float haze = clamp(1.0 - depth * 3.4, 0.0, 1.0);
                vec3 ground = mix(sea, hor, haze * haze * 0.85);

                // domain-warped fbm thresholded into discrete puffs,
                // with bright sunlit cores over shaded cauliflower bases
                float q = fbm(cp * 2.6);
                vec2 wp = cp * 2.6 + vec2(q * 1.8, q * 1.2) + 7.3;
                float c = fbm(wp);
                float det = fbm(cp * 7.0 + c * 2.0);
                float field = c * 0.72 + det * 0.38;

                // large-scale patchiness: some stretches are clear sky
                float patch = fbm(cp * 0.5 + 3.1);
                float th = mix(0.36, 0.54, patch);
                float puff = smoothstep(th - 0.05, th + 0.18, field);

                // vertical relief: tops sampled at a depth offset so they
                // ride toward the horizon off their bases — real height,
                // not embossing on a flat plane
                float fieldTop = fbm(wp - vec2(0.0, 0.20)) * 0.72
                               + fbm(cp * 7.0 + c * 2.0 - vec2(0.0, 0.42)) * 0.38;
                float core = smoothstep(0.55, 0.92, fieldTop) * puff;

                // puffs cast soft shadows on the haze, offset off-sun
                float shf = fbm(wp - vec2(0.14, -0.10)) * 0.72
                          + fbm(cp * 7.0 + c * 2.0 - 0.16) * 0.38;
                ground *= 1.0 - smoothstep(0.46, 0.74, shf) * 0.10 * daylight;

                // volume: treat the field as a heightmap and shade each
                // puff by its slope toward the sun
                vec2 sdir = normalize(vec2(sx - 0.5, 0.55));
                float fs = fbm(wp + sdir * 0.16) * 0.72
                         + fbm(cp * 7.0 + c * 2.0 + sdir * 0.35) * 0.38;
                float relief = clamp((field - fs) * 5.0, -1.0, 1.0);

                vec3 lit = mix(vec3(0.05, 0.07, 0.13),
                               vec3(1.0, 0.995, 0.975), daylight);
                lit = mix(lit, duskCol * 1.05 + vec3(0.12), dusk * 0.7);
                // shadow side stays bright and takes the sky's own hue
                vec3 base = mix(lit * mix(0.62, 0.84, daylight), hor, 0.22);
                vec3 cloud = mix(base, lit, core);
                float rl = relief > 0.0 ? relief * 0.30 : relief * 0.12;
                cloud *= 1.0 + rl * (0.4 + 0.6 * daylight);
                cloud = mix(cloud, sunCol * 0.9 + vec3(0.1),
                            max(0.0, relief) * dusk * 0.5);

                float hz = smoothstep(0.0, 0.085, horizon - uv.y);
                col = mix(sky, mix(ground, cloud, puff), hz);
            }

            gl_FragColor = vec4(col, 1.0);
        }
    `;

    const gl = skyCanvas.getContext('webgl', { preserveDrawingBuffer: true });
    let uTime, uDayU, uRes, uBankU;

    function initSky() {
        const compile = (type, src) => {
            const sh = gl.createShader(type);
            gl.shaderSource(sh, src);
            gl.compileShader(sh);
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
                throw new Error(gl.getShaderInfoLog(sh));
            }
            return sh;
        };
        const prog = gl.createProgram();
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
        gl.linkProgram(prog);
        gl.useProgram(prog);

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, 'aPos');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        uTime = gl.getUniformLocation(prog, 'uTime');
        uDayU = gl.getUniformLocation(prog, 'uDay');
        uRes = gl.getUniformLocation(prog, 'uRes');
        uBankU = gl.getUniformLocation(prog, 'uBank');
        gl.uniform2f(uRes, skyCanvas.width, skyCanvas.height);
    }

    /* ============================== state */

    const DAY_CYCLE_S = 240;                 // full day in demo mode
    const params = new URLSearchParams(location.search);
    let mode = 'demo';                       // 'demo' | 'video'
    if (params.get('ui') === '0') deck.style.display = 'none';
    let day = parseFloat(params.get('day') ?? daySlider.value) || 0;
    let autoCycle = params.get('auto') !== '0';
    daySlider.value = day;

    // cabin lights: warm interior glow, eased on/off
    let lights = params.get('lights') === '1';
    let cabOn = lights ? 1 : 0;
    let scrubbing = false;
    let lastT = performance.now();

    /* ============================== ambient sampler */

    const SW = 24, SH = 32;
    const sampler = document.createElement('canvas');
    sampler.width = SW;
    sampler.height = SH;
    const sctx = sampler.getContext('2d', { willReadFrequently: true });

    // palette state, eased toward each sample for smooth transitions
    const cur = { r: 60, g: 80, b: 110, sr: 70, sg: 100, sb: 140, luma: 0.4, cx: 0.5, cy: 0.4, peak: 0.5 };
    const tgt = { ...cur };
    let lastSample = 0;
    let samplingBlocked = false;             // CORS-tainted source

    function sample(source) {
        try {
            sctx.drawImage(source, 0, 0, SW, SH);
            const d = sctx.getImageData(0, 0, SW, SH).data;
            let r = 0, g = 0, b = 0, sr = 0, sg = 0, sb = 0, tn = 0;
            let wx = 0, wy = 0, wsum = 0, lsum = 0, maxL = 0;
            for (let y = 0; y < SH; y++) {
                for (let x = 0; x < SW; x++) {
                    const i = (y * SW + x) * 4;
                    const R = d[i], G = d[i + 1], B = d[i + 2];
                    r += R; g += G; b += B;
                    if (y < SH * 0.45) { sr += R; sg += G; sb += B; tn++; }
                    const l = (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255;
                    lsum += l;
                    if (l > maxL) maxL = l;
                    const w = l * l * l * l;   // lock onto the sun, not the haze
                    wx += x * w; wy += y * w; wsum += w;
                }
            }
            const n = SW * SH;
            tgt.r = r / n; tgt.g = g / n; tgt.b = b / n;
            tgt.sr = sr / tn; tgt.sg = sg / tn; tgt.sb = sb / tn;
            tgt.luma = lsum / n;
            tgt.peak = maxL;
            // only steer the light direction when there is a real bright
            // signal — at night the centroid is noise and would wander
            if (wsum > n * 0.005) {
                tgt.cx = wx / wsum / SW;
                tgt.cy = wy / wsum / SH;
            }
            samplingBlocked = false;
        } catch (e) {
            // cross-origin video without CORS headers: keep last palette
            samplingBlocked = true;
        }
    }

    const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)));
    const rgb = (r, g, b) => `rgb(${clamp255(r)}, ${clamp255(g)}, ${clamp255(b)})`;
    const rgba = (r, g, b, a) =>
        `rgba(${clamp255(r)}, ${clamp255(g)}, ${clamp255(b)}, ${a.toFixed(3)})`;

    function applyPalette() {
        // a closed shade darkens the whole cabin, like the real thing —
        // it also hides the loading state until someone opens it
        const open = 1 - shadePos * 0.92;
        const L = Math.min(1, cur.luma * 1.15) * open;
        const { sr, sg, sb } = cur;
        // saturation boost so golden-hour footage warms the cabin
        const m = (cur.r + cur.g + cur.b) / 3;
        const amb = [cur.r, cur.g, cur.b].map((c) =>
            Math.max(0, Math.min(255, m + (c - m) * 1.7)));
        const [r, g, b] = amb;
        const skyLuma = (0.2126 * sr + 0.7152 * sg + 0.0722 * sb) / 255 * open;

        // interior light: a steady contribution — daylight through the
        // window ADDS to it, it never subtracts
        const cab = (0.88 - 0.06 * L) * cabOn;

        // base plastic color, scaled by f, tinted toward ambient by t,
        // plus the cabin lights' warm lift
        const BEZ = [230, 226, 218];
        const tone = (f, t) => rgb(
            BEZ[0] * f * (1 - t) + amb[0] * t * f * 2.2 + 205 * cab,
            BEZ[1] * f * (1 - t) + amb[1] * t * f * 2.2 + 199 * cab,
            BEZ[2] * f * (1 - t) + amb[2] * t * f * 2.2 + 186 * cab);

        // cabin wall: near-black, lifted only slightly — and desaturated,
        // so a blue sky doesn't turn the whole cabin teal
        const m2 = (r + g + b) / 3;
        const k = 0.012 + 0.10 * L;
        root.style.setProperty('--wall', rgb(
            10 + (r * 0.6 + m2 * 0.4) * k + 212 * cab,
            11 + (g * 0.6 + m2 * 0.4) * k + 206 * cab,
            14 + (b * 0.6 + m2 * 0.4) * k + 194 * cab));
        // the heavy cabin vignette relaxes when the lights are on
        root.style.setProperty('--vig',
            `rgba(0, 0, 0, ${(0.7 - 0.62 * cab).toFixed(3)})`);
        // structural shadows soften too — bounce light fills them in
        root.style.setProperty('--soft', (1 - cab * 0.58).toFixed(3));

        // surround split by the sun: bright where the beam lands, deep
        // grey in the cast shadow. The split fades through a smooth gate
        // so at night there is no visible wedge at all
        const ss = (a, b, x) => {
            const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
            return t * t * (3 - 2 * t);
        };
        const gate = ss(0.04, 0.22, L);

        // sun geometry: the wedge axis runs from the sun through the
        // window center. When the bright centroid sits near the center,
        // the sun is effectively overhead/out of view — light falls
        // straight down, wide and diffuse, instead of picking a side
        const sxPct = 18.5 + cur.cx * 63;
        const syPct = 13.3 + cur.cy * 73.4;
        const dxRaw = 50 - sxPct;
        const dyRaw = (50 - syPct) * 1.389;
        const aim = Math.min(1, Math.hypot(dxRaw, dyRaw) / 22);
        const dx = dxRaw * aim;
        const dy = dyRaw * aim + (1 - aim) * 30 + 6;
        const ang = Math.atan2(dx, -dy) * 180 / Math.PI;
        root.style.setProperty('--beam', ang.toFixed(1) + 'deg');
        diffuse = 1 - aim;

        // the wedge apex sits OUT beyond the opening on the sun's side
        // (just past the glass edge), so its shadow boundaries run
        // steeply past the window's corners instead of cutting shallow
        // lines from mid-window
        const bl = Math.hypot(dx, dy) || 1;
        const apexX = 50 - (dx / bl) * 95;
        const apexY = 50 - (dy / bl) * 95 / 1.389;
        root.style.setProperty('--sun-x', apexX.toFixed(1) + '%');
        root.style.setProperty('--sun-y', apexY.toFixed(1) + '%');

        const mid = 0.08 + 0.8 * L;
        // diffuse overhead light also means a gentler lit/shadow split
        const spread = 0.9 * L * gate * (0.55 + 0.45 * aim);
        root.style.setProperty('--bezel-lit', tone(Math.min(1.05, mid + spread), 0.14));
        root.style.setProperty('--bezel-sh', tone(Math.max(0.05, mid - spread * 0.55), 0.30));
        root.style.setProperty('--deep-lit', tone(Math.min(0.7, mid * 0.5 + spread * 0.45), 0.18));
        root.style.setProperty('--deep-sh', tone(Math.max(0.03, mid * 0.22), 0.22));
        // the cover is lit by the cabin: bright with the lights on,
        // properly dark with them off — and it always carries the
        // ambient hue of the scene, never a flat neutral grey
        const sf = Math.max(0.05 + cab * 0.95, 0.06 + 0.5 * L);
        // with the lights on and the shade closed, the sky can't tint
        // the cover — it's lit by the cabin, same family as the bezel
        // (cab-gated so dark mode keeps its ambient hue untouched)
        const shAmb = (0.08 + sf * 0.22) * (1 - cab * shadePos * 0.85);
        root.style.setProperty('--shade-fill', rgb(
            BEZ[0] * sf * 0.86 + amb[0] * shAmb + 28 * cab,
            BEZ[1] * sf * 0.86 + amb[1] * shAmb + 27 * cab,
            BEZ[2] * sf * 0.86 + amb[2] * shAmb + 24 * cab));
        root.style.setProperty('--shade-pool', (0.02 + 0.12 * cab).toFixed(3));

        // light pooling on the wall, hard beam band, glass halo
        root.style.setProperty('--spill', rgba(r * 1.3 + 35, g * 1.3 + 35, b * 1.3 + 35, 0.08 + 0.38 * L));
        root.style.setProperty('--band', rgba(r * 1.15 + 22, g * 1.15 + 22, b * 1.15 + 22, 0.02 + 0.20 * L));
        root.style.setProperty('--glow', rgba(sr * 1.15 + 20, sg * 1.15 + 20, sb * 1.15 + 20, 0.06 + 0.20 * skyLuma));

        // detail visibility
        root.style.setProperty('--etch-a', (0.04 + 0.20 * skyLuma).toFixed(3));
        root.style.setProperty('--tex-a', (0.35 + 0.6 * L).toFixed(3));
        root.style.setProperty('--micro-a', (0.25 + 0.75 * skyLuma).toFixed(3));

        // sun glare only for a COMPACT bright source (a real sun in
        // view) — diffuse bright haze must not paint fog over the sky
        const glare = Math.max(0, Math.min(1, (cur.peak - 0.88) / 0.12))
                    * (0.25 + 0.75 * L) * gate * aim;
        root.style.setProperty('--glare-a', (glare * 0.85).toFixed(3));
        // glare lives inside the glass — its own coordinate space
        root.style.setProperty('--sun-gx', (cur.cx * 100).toFixed(1) + '%');
        root.style.setProperty('--sun-gy', (cur.cy * 100).toFixed(1) + '%');

        // the projected window patch slides along the same sun→window
        // line, drifting further when the sun is far off-axis
        const pw = porthole.offsetWidth || 600;
        const castX = Math.max(-pw * 0.85, Math.min(pw * 0.85, dx / 100 * pw * 1.8));
        const castY = Math.max(-pw * 0.55, Math.min(pw * 0.75, dy / 100 * pw * 1.8));
        root.style.setProperty('--cast-x', castX.toFixed(0) + 'px');
        root.style.setProperty('--cast-y', castY.toFixed(0) + 'px');
        root.style.setProperty('--cast', rgba(r * 1.4 + 45, g * 1.4 + 45, b * 1.4 + 45, (0.06 + 0.40 * L) * gate));
    }

    /* ============================== motion: vibration, turbulence,
       banking turns, head parallax */

    const airframe = document.querySelector('.airframe');
    let parX = 0, parY = 0, parTX = 0, parTY = 0;
    let bank = 0, bankTarget = 0, bankEnd = 0;
    let nextBank = 25000 + Math.random() * 40000;

    window.addEventListener('pointermove', (e) => {
        parTX = (e.clientX / window.innerWidth - 0.5) * 2;
        parTY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
    window.addEventListener('deviceorientation', (e) => {
        if (e.gamma == null || e.beta == null) return;
        parTX = Math.max(-1, Math.min(1, e.gamma / 25));
        parTY = Math.max(-1, Math.min(1, (e.beta - 40) / 25));
    });

    /* ============================== main loop */

    function frame(now) {
        const dt = Math.min(0.1, (now - lastT) / 1000);
        lastT = now;

        // banking turns: the horizon gently rolls now and then
        if (now > nextBank) {
            bankTarget = (Math.random() < 0.5 ? -1 : 1)
                * (1.5 + Math.random() * 2.5) * Math.PI / 180;
            bankEnd = now + 14000 + Math.random() * 12000;
            nextBank = now + 60000 + Math.random() * 90000;
        }
        if (bankEnd && now > bankEnd) { bankTarget = 0; bankEnd = 0; }
        bank += (bankTarget - bank) * (1 - Math.exp(-dt / 3));

        if (mode === 'demo') {
            if (autoCycle && !scrubbing) {
                day = (day + dt / DAY_CYCLE_S) % 1;
                daySlider.value = day.toFixed(4);
            }
            gl.uniform1f(uTime, now / 1000);
            gl.uniform1f(uDayU, day);
            gl.uniform1f(uBankU, bank);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }

        if (mode === 'video') crossfadeLoop(dt);

        if (now - lastSample > 180) {
            lastSample = now;
            if (mode === 'demo') {
                sample(skyCanvas);
            } else if (videos[act].readyState >= 2) {
                sample(videos[act]);
            }
        }

        // ease toward the sampled palette
        const e = 1 - Math.pow(0.0001, dt);   // framerate-independent ~smooth
        for (const key of Object.keys(tgt)) {
            cur[key] += (tgt[key] - cur[key]) * e;
        }
        applyPalette();

        // shade edge faces: when parked up you look at it from below,
        // so a sliver of underside stays visible; motion exaggerates it
        if (!dragging) tiltTarget = -(1 - shadePos) * 2.0;
        tilt += (tiltTarget - tilt) * (1 - Math.pow(0.001, dt));
        shade.style.setProperty('--face-t', (Math.max(0, tilt) * 1.1).toFixed(2) + 'px');
        shade.style.setProperty('--face-b', (Math.max(0, -tilt) * 1.1).toFixed(2) + 'px');

        // the light wedge widens as the aperture opens; a distinctly
        // directional sun gets a TIGHT cone (strong opposite-side
        // bias), diffuse overhead light a wide soft one
        cone += ((7 + 12 * (1 - shadePos) + diffuse * 13) - cone)
              * (1 - Math.exp(-dt / 0.35));
        root.style.setProperty('--cone', cone.toFixed(1) + 'deg');

        // cabin lights fade up and down like real dimmers
        cabOn += ((lights ? 1 : 0) - cabOn) * (1 - Math.exp(-dt / 0.6));

        // the aperture line: window light exists only below the
        // cover's bottom edge
        root.style.setProperty('--ap', (12 + shadePos * 75).toFixed(1) + '%');

        // steady engine vibration (turbulence disabled)
        const vAmp = 0.35;
        const wx = (Math.sin(now * 0.037) + 0.6 * Math.sin(now * 0.071 + 2.1)) * vAmp * 0.5;
        const wy = (Math.sin(now * 0.043 + 1.0) + 0.6 * Math.sin(now * 0.067)) * vAmp;
        airframe.style.transform = `translate3d(${wx.toFixed(2)}px, ${wy.toFixed(2)}px, 0)`;

        // head parallax eases toward the pointer / device tilt
        parX += (parTX - parX) * e;
        parY += (parTY - parY) * e;
        root.style.setProperty('--par-x', (parX * -12).toFixed(1) + 'px');
        root.style.setProperty('--par-y', (parY * -8).toFixed(1) + 'px');

        requestAnimationFrame(frame);
    }

    /* ============================== sources */

    function setActiveChip(el) {
        chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
        el.classList.add('active');
    }

    /* seamless looping: a second buffer starts from 0 just before the
       end and dissolves in, so footage never shows a hard loop cut */
    const videos = [video, video2];
    const FADE = 1.2;
    let act = 0;
    let fading = false;
    let fadeT = 0;

    function crossfadeLoop(dt) {
        const A = videos[act], B = videos[1 - act];
        if (!fading && A.duration && A.duration > FADE * 3
            && A.currentTime > A.duration - FADE) {
            B.currentTime = 0;
            B.style.opacity = '0';
            B.style.zIndex = '3';
            B.play().catch(() => {});
            fading = true;
            fadeT = 0;
        }
        if (fading) {
            fadeT += dt;
            const k = Math.min(1, fadeT / FADE);
            B.style.opacity = k.toFixed(3);
            if (k >= 1) {
                fading = false;
                A.pause();
                A.style.zIndex = '1';
                B.style.zIndex = '2';
                act = 1 - act;
            }
        }
    }

    // abandon an in-flight crossfade cleanly: without this, leaving
    // video mode mid-fade strands a half-transparent paused frame on
    // top of the stack when you come back
    function cancelFade() {
        if (!fading) return;
        fading = false;
        const A = videos[act], B = videos[1 - act];
        B.pause();
        B.style.opacity = '1';
        B.style.zIndex = '1';
        A.style.opacity = '1';
        A.style.zIndex = '2';
    }

    function showDemo(chip) {
        cancelFade();
        mode = 'demo';
        deck.dataset.mode = 'demo';
        videos.forEach((v) => { v.pause(); v.hidden = true; });
        skyCanvas.hidden = false;
        setActiveChip(chip);
    }

    function showVideo(url, chip) {
        cancelFade();
        mode = 'video';
        deck.dataset.mode = 'video';
        skyCanvas.hidden = true;
        videos.forEach((v) => { v.hidden = false; });
        if (videos[act].dataset.url !== url) {
            videos.forEach((v) => {
                v.src = url;
                v.dataset.url = url;
                v.style.opacity = '';
            });
            videos[1 - act].pause();
            videos[act].style.zIndex = '2';
            videos[1 - act].style.zIndex = '1';
        }
        videos[act].play().catch(() => {});
        setActiveChip(chip);
    }

    function addChip(label, onClick) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip';
        btn.textContent = label;
        btn.title = label;
        btn.addEventListener('click', () => onClick(btn));
        chips.appendChild(btn);
        return btn;
    }

    function addVideoFiles(files) {
        let lastChip = null;
        for (const file of files) {
            if (!file.type.startsWith('video/')) continue;
            const url = URL.createObjectURL(file);
            const name = file.name.replace(/\.[^.]+$/, '').slice(0, 28) || 'flight';
            lastChip = addChip(name, (btn) => showVideo(url, btn));
        }
        if (lastChip) lastChip.click();
    }

    const demoChip = addChip('demo', (btn) => showDemo(btn));
    demoChip.classList.add('active');
    deck.dataset.mode = 'demo';

    // bundled footage — plays only when chosen; demo is the placeholder
    const BUILTIN = [
        { label: 'video', url: 'video-1.mp4' },
    ];
    BUILTIN.forEach((v, i) => {
        const chip = addChip(v.label, (btn) => showVideo(v.url, btn));
        if (i === 0 && params.get('src') === 'video') chip.click();
    });

    // if bundled footage fails to load, fall back to the shader sky
    video.addEventListener('error', () => {
        if (mode === 'video') showDemo(demoChip);
    });

    fileInput.addEventListener('change', () => {
        addVideoFiles(fileInput.files);
        fileInput.value = '';
    });

    /* drag & drop */
    let dragDepth = 0;
    window.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragDepth++;
        document.body.classList.add('dropping');
    });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('dragleave', () => {
        if (--dragDepth <= 0) {
            dragDepth = 0;
            document.body.classList.remove('dropping');
        }
    });
    window.addEventListener('drop', (e) => {
        e.preventDefault();
        dragDepth = 0;
        document.body.classList.remove('dropping');
        if (e.dataTransfer?.files?.length) addVideoFiles(e.dataTransfer.files);
    });

    /* ============================== time-of-day controls */

    daySlider.addEventListener('pointerdown', () => { scrubbing = true; });
    window.addEventListener('pointerup', () => { scrubbing = false; });
    daySlider.addEventListener('input', () => {
        day = parseFloat(daySlider.value);
    });
    autoBtn.classList.toggle('active', autoCycle);
    autoBtn.addEventListener('click', () => {
        autoCycle = !autoCycle;
        autoBtn.classList.toggle('active', autoCycle);
    });

    /* cabin lights toggle */
    function renderLightsBtn() {
        lightsBtn.textContent = lights ? '☀' : '☾';
        lightsBtn.classList.toggle('active', lights);
        lightsBtn.setAttribute('aria-pressed', lights);
    }
    lightsBtn.addEventListener('click', () => {
        lights = !lights;
        renderLightsBtn();
    });
    renderLightsBtn();

    /* ============================== window shade */

    let shadePos = 0;     // 0 open .. 1 closed
    let dragStartY = 0;
    let dragStartPos = 0;
    let dragging = false;
    let moved = false;
    // perspective bow: resting tilt when open + flex while dragging
    let tilt = 0;
    let tiltTarget = 0;
    let cone = 50;        // light wedge half-angle, follows the aperture
    let diffuse = 0;      // 1 = sun overhead/out of view → wider, softer
    let lastDragY = 0;
    let lastDragT = 0;

    function setShade(p, glide = false) {
        shadePos = Math.max(0, Math.min(1, p));
        shade.classList.toggle('glide', glide);
        shade.style.setProperty('--shade', shadePos.toFixed(4));
        shade.setAttribute('aria-valuenow', Math.round(shadePos * 100));
    }
    // start closed: footage loads and plays behind the shade,
    // so opening it never reveals a loading state (?shade=0 to override)
    const shadeParam = parseFloat(params.get('shade'));
    setShade(Number.isFinite(shadeParam) ? shadeParam : 1);

    function toggleShade() { setShade(shadePos > 0.5 ? 0 : 1, true); }

    function attachDrag(el) {
        el.addEventListener('pointerdown', (e) => {
            dragging = true;
            moved = false;
            dragStartY = e.clientY;
            dragStartPos = shadePos;
            lastDragY = e.clientY;
            lastDragT = performance.now();
            el.setPointerCapture(e.pointerId);
            shade.classList.remove('glide');
        });
        el.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            const dy = e.clientY - dragStartY;
            if (Math.abs(dy) > 4) moved = true;
            setShade(dragStartPos + dy / (glass.clientHeight || 1));
            // panel bows with drag speed
            const t = performance.now();
            const v = (e.clientY - lastDragY) / Math.max(1, t - lastDragT);
            lastDragY = e.clientY;
            lastDragT = t;
            tiltTarget = Math.max(-7, Math.min(7, v * 9));
        });
        el.addEventListener('pointerup', () => {
            dragging = false;
            if (!moved) toggleShade();                 // tap toggles
            else if (shadePos < 0.12) setShade(0, true);
            else if (shadePos > 0.88) setShade(1, true);
        });
    }
    attachDrag(shade);                                  // the shade itself
    attachDrag(document.querySelector('.shade-grab'));  // pull strip when hidden
    shade.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') setShade(shadePos + 0.1, true);
        else if (e.key === 'ArrowUp') setShade(shadePos - 0.1, true);
        else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShade(shadePos > 0.5 ? 0 : 1, true);
        }
    });

    /* ============================== idle fade */

    let idleTimer;
    function wake() {
        document.body.classList.remove('idle');
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => document.body.classList.add('idle'), 3500);
    }
    ['pointermove', 'pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
        window.addEventListener(ev, wake, { passive: true }));
    wake();

    /* ============================== go */

    initSky();
    requestAnimationFrame(frame);
})();
