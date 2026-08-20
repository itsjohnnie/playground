/* WebGL loupe optics. One fullscreen pass; everything happens per-pixel:
   radial refraction (magnified center, compressed rim), lateral chromatic
   aberration sampled per channel, radial defocus, edge burn, light falloff,
   glass tint, film grain. Outside the lens disc the canvas is transparent. */

window.Lens = (() => {
  const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

  const FRAG = `
precision highp float;

uniform sampler2D uTex;
uniform vec2  uRes;       // canvas size, device px
uniform vec2  uCenter;    // lens center, device px (y down)
uniform float uRadius;    // lens radius, device px
uniform float uMag;       // center magnification
uniform float uK1;        // rim compression (r^2 term)
uniform float uK2;        // rim compression (r^4 term)
uniform float uCA;        // lateral chromatic aberration
uniform float uBlur;      // max defocus radius at rim, device px
uniform float uEdge;      // edge burn amount
uniform float uFall;      // light falloff toward rim
uniform float uGrain;
uniform float uTime;
uniform vec2  uTexSize;   // texture size, CSS px
uniform float uDpr;       // device px per CSS px
uniform vec2  uOffset;    // pan into the page, CSS px
uniform float uFlat;      // 0 = lens optics, 1 = flat 1:1 page
uniform float uFade;      // master fade for lens content (load-in)

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec3 samplePage(vec2 cssPos) {
  vec2 uv = cssPos / uTexSize;
  // paper ends -> dark desk, with a soft shadowed edge
  vec2 d = min(uv, 1.0 - uv) * uTexSize;      // css px to nearest edge
  float inPaper = smoothstep(0.0, 2.5, min(d.x, d.y));
  float edgeShade = smoothstep(0.0, 26.0, min(d.x, d.y)) * 0.35 + 0.65;
  vec3 paper = texture2D(uTex, clamp(uv, 0.0, 1.0)).rgb * edgeShade;
  vec3 desk = vec3(0.043, 0.038, 0.033);
  return mix(desk, paper, inPaper);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 v = p - uCenter;
  float len = length(v);
  float r = len / uRadius;

  float outMix = smoothstep(uRadius - 1.5, uRadius + 0.5, len);
  vec2 off = uOffset * (1.0 - uFlat);
  float live = 1.0 - uFlat;
  float spin = hash(p) * 6.2831853;

  vec3 inside = vec3(0.0);
  if (outMix < 1.0) {
    float r2 = r * r;

    // refraction: magnified center, content squeezed toward the rim
    float base = (1.0 / uMag) * (1.0 + uK1 * r2 + uK2 * r2 * r2);
    float dG = mix(base, 1.0, uFlat);
    float caAmt = uCA * r2 * (1.0 - uFlat);
    float dR = dG * (1.0 - caAmt);
    float dB = dG * (1.0 + caAmt);

    // defocus grows toward the rim; slight base softness sells real glass
    float focus = smoothstep(0.42, 1.0, r) * live;
    float blurPx = uBlur * focus + 0.4 * live;

    vec3 acc = vec3(0.0);
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      float ang = fi * 2.399963 + spin;
      float rad = blurPx * sqrt((fi + 0.5) / 6.0);
      vec2 tap = vec2(cos(ang), sin(ang)) * rad;
      vec2 cssR = (uCenter + v * dR + tap) / uDpr + off;
      vec2 cssG = (uCenter + v * dG + tap) / uDpr + off;
      vec2 cssB = (uCenter + v * dB + tap) / uDpr + off;
      acc += vec3(samplePage(cssR).r, samplePage(cssG).g, samplePage(cssB).b);
    }
    vec3 col = acc / 6.0;

    // light: the glass gathers a bright pool in the middle
    float gain = 1.10 + 0.10 * (1.0 - smoothstep(0.0, 0.85, r)) * live;
    gain -= uFall * smoothstep(0.62, 1.0, r) * 0.20 * live;
    col *= mix(1.0, gain, live);

    // glass tint (very slightly cool)
    col *= mix(vec3(1.0), vec3(0.985, 1.0, 0.996), live);

    // edge burn: narrow darkening ring with an amber cast at the rim
    float burn = smoothstep(0.90, 1.005, r) * uEdge * live;
    col = mix(col, col * vec3(0.42, 0.32, 0.22), burn * 0.9);
    float amber = smoothstep(0.93, 0.985, r) * (1.0 - smoothstep(0.985, 1.005, r));
    col += amber * vec3(0.085, 0.038, 0.006) * uEdge * live;

    inside = col;
  }

  // outside the glass: the same sheet of paper, unlit and out of focus
  vec3 outside = vec3(0.0);
  if (outMix > 0.0 && live > 0.001) {
    float oBlur = 7.5 * uDpr;
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float ang = fi * 2.399963 + spin;
      float rad = oBlur * sqrt((fi + 0.5) / 5.0);
      vec2 tap = vec2(cos(ang), sin(ang)) * rad;
      acc += samplePage((p + tap) / uDpr + off);
    }
    vec3 paper = acc / 5.0;

    // ambient level + a pool of light bleeding out around the barrel
    float glow = exp(-max(len - uRadius, 0.0) / (uRadius * 0.85));
    vec2 nq = p / uRes - 0.5;
    float vig = 1.0 - smoothstep(0.18, 0.68, dot(nq, nq) * 2.0) * 0.8;
    float lit = (0.062 + 0.055 * glow) * vig;
    outside = paper * lit * vec3(1.0, 0.97, 0.90);
  }

  vec3 col = mix(inside, outside, outMix);

  // film grain
  float g = hash(p * 0.7 + fract(uTime) * 61.7) - 0.5;
  col += g * uGrain;

  float alpha = max(1.0 - outMix, live);
  col = clamp(col, 0.0, 1.0) * uFade;
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

  let gl = null;
  let prog = null;
  let tex = null;
  let uni = {};
  let canvas = null;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(s));
    }
    return s;
  }

  function init(el) {
    canvas = el;
    gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true });
    if (!gl) return false;

    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    ["uTex", "uRes", "uCenter", "uRadius", "uMag", "uK1", "uK2", "uCA", "uBlur",
     "uEdge", "uFall", "uGrain", "uTime", "uTexSize", "uDpr", "uOffset", "uFlat", "uFade"]
      .forEach((n) => { uni[n] = gl.getUniformLocation(prog, n); });

    gl.clearColor(0, 0, 0, 0);
    return true;
  }

  function setTexture(srcCanvas, cssWidth, cssHeight) {
    if (!tex) tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform2f(uni.uTexSize, cssWidth, cssHeight);
  }

  function resize(dpr) {
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uni.uRes, w, h);
  }

  function render(s) {
    gl.uniform2f(uni.uCenter, s.cx, s.cy);
    gl.uniform1f(uni.uRadius, s.radius);
    gl.uniform1f(uni.uMag, s.mag);
    gl.uniform1f(uni.uK1, s.k1);
    gl.uniform1f(uni.uK2, s.k2);
    gl.uniform1f(uni.uCA, s.ca);
    gl.uniform1f(uni.uBlur, s.blur);
    gl.uniform1f(uni.uEdge, s.edge);
    gl.uniform1f(uni.uFall, s.fall);
    gl.uniform1f(uni.uGrain, s.grain);
    gl.uniform1f(uni.uTime, s.time);
    gl.uniform1f(uni.uDpr, s.dpr);
    gl.uniform2f(uni.uOffset, s.offsetX, s.offsetY);
    gl.uniform1f(uni.uFlat, s.flat);
    gl.uniform1f(uni.uFade, s.fade);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  return { init, setTexture, resize, render };
})();
