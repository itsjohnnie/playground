import { useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────
// PulseGlow — WebGL fragment-shader-driven success glow.
//
// Mounts a transparent <canvas> over the team panel and runs a noise-
// displaced edge-glow shader for ~1s. The displacement breaks up the
// otherwise-elliptical falloff so the glow reads as organic light
// rather than a CSS primitive. CSS mix-blend-mode: screen makes the
// hit feel additive rather than tinted.
//
// Designed to be cheap: ~150×500px canvas, one fragment shader with
// 4 octaves of value noise, ~60fps for one second. GPU-bound, no JS
// per-frame work beyond the rAF loop and a few uniform writes.
// ─────────────────────────────────────────────────────────────

const VERT = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAG = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_intensity;
uniform vec3 u_color;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  // Aspect-correct centered coords, -1..1 on long axis.
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 c  = (uv - 0.5) * 2.0;
  float ar = u_resolution.x / u_resolution.y;
  c.x *= ar;

  // Subtle noise displacement on the radial coordinate so the falloff
  // boundary is irregular instead of a clean ellipse. Two independent
  // FBM samples slowly drifting in opposite directions over time.
  vec2 d = vec2(
    fbm(c * 1.4 + vec2(0.0,  u_time * 0.35)),
    fbm(c * 1.4 + vec2(7.3, -u_time * 0.30))
  );
  vec2 cd = c + (d - 0.5) * 0.42;

  float r = length(cd);

  // Edge-leaning falloff — the rim picks up most of the glow, with a
  // gentle bleed inward so the panel feels lit rather than ringed.
  float edge = smoothstep(0.55, 1.3, r);

  // Modulate by another noise octave so the rim itself shimmers
  // softly rather than reading as a uniform band.
  float shimmer = fbm(c * 3.5 + u_time * 0.6);
  edge *= mix(0.8, 1.15, shimmer);

  // Faint inner wash so the centre isn't a hole — the panel glows as
  // a whole, just brighter at the edges.
  float wash = (1.0 - smoothstep(0.0, 0.95, r)) * 0.08;

  float a = clamp((edge + wash) * u_intensity, 0.0, 0.65);
  gl_FragColor = vec4(u_color, a);
}
`

interface PulseGlowProps {
  kind: 'up' | 'down'
  /** Total animation duration in ms. */
  duration?: number
}

export function PulseGlow({ kind, duration = 1050 }: PulseGlowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
    }) as WebGLRenderingContext | null
    if (!gl) return

    // Cap DPR at 2 — going higher costs fillrate without visible win.
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.max(1, Math.floor(canvas.clientWidth * dpr))
    const h = Math.max(1, Math.floor(canvas.clientHeight * dpr))
    canvas.width = w
    canvas.height = h
    gl.viewport(0, 0, w, h)

    function compile(type: number, src: string): WebGLShader | null {
      const sh = gl!.createShader(type)
      if (!sh) return null
      gl!.shaderSource(sh, src)
      gl!.compileShader(sh)
      if (!gl!.getShaderParameter(sh, gl!.COMPILE_STATUS)) {
        console.error('PulseGlow shader:', gl!.getShaderInfoLog(sh))
        gl!.deleteShader(sh)
        return null
      }
      return sh
    }

    const vs = compile(gl.VERTEX_SHADER, VERT)
    const fs = compile(gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('PulseGlow link:', gl.getProgramInfoLog(program))
      return
    }
    gl.useProgram(program)

    // Fullscreen quad as two triangles.
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]),
      gl.STATIC_DRAW,
    )

    const posLoc = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(program, 'u_resolution')
    const uTime = gl.getUniformLocation(program, 'u_time')
    const uIntensity = gl.getUniformLocation(program, 'u_intensity')
    const uColor = gl.getUniformLocation(program, 'u_color')

    const cssVar = kind === 'up' ? '--suit-green' : '--suit-red'
    const rgb = readCssHsl(cssVar)
    gl.uniform3fv(uColor, rgb)
    gl.uniform2f(uRes, w, h)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const start = performance.now()
    let rafId = 0

    const loop = (now: number) => {
      const t = (now - start) / 1000
      const p = Math.min(1, (now - start) / duration)

      // Smooth opacity curve: bloom in 0..0.30, dwell to 0.58, fade to 1.
      // Slight scalar so the cue feels confident without overpowering the
      // panel content.
      let intensity: number
      if (p < 0.30) {
        const k = p / 0.30
        intensity = k * k * (3 - 2 * k)
      } else if (p < 0.58) {
        intensity = 1
      } else {
        const k = 1 - (p - 0.58) / 0.42
        intensity = k * k * (3 - 2 * k)
      }
      intensity *= 0.9

      gl.uniform1f(uTime, t)
      gl.uniform1f(uIntensity, intensity)

      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 6)

      if (p < 1) rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafId)
      gl.deleteProgram(program)
      gl.deleteBuffer(buffer)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [kind, duration])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full"
      style={{ mixBlendMode: 'screen' }}
    />
  )
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

// Read a CSS custom property whose value is "H S% L%" (no parens) and
// convert to a normalized 0..1 RGB triple.
function readCssHsl(varName: string): [number, number, number] {
  if (typeof document === 'undefined') return [0.5, 0.5, 0.5]
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  const m = raw.match(/(-?[\d.]+)\s+(-?[\d.]+)%\s+(-?[\d.]+)%/)
  if (!m) return [0.5, 0.5, 0.5]
  const h = parseFloat(m[1]) / 360
  const s = parseFloat(m[2]) / 100
  const l = parseFloat(m[3]) / 100
  return hslToRgb(h, s, l)
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hue2rgb = (a: number, b: number, t: number): number => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return a + (b - a) * 6 * t
    if (t < 1 / 2) return b
    if (t < 2 / 3) return a + (b - a) * (2 / 3 - t) * 6
    return a
  }
  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)]
}
