# Walker

A procedural human rig and walk cycle, built to be the foundation for other
characters. No keyframes and no imported animation: the body is generated from
a handful of proportions, and the walk is solved each frame from biomechanics.

Open `index.html` through any static server; three.js loads from a CDN.

## Why it doesn't look amateur

The usual tells of a hand-made walk, and what this does about each:

| Tell | Fix here |
|---|---|
| Feet slide on the floor | Each stance foot is pinned to a world-space plant; legs reach it with two-bone IK. Measured slip is under 1 mm/s. |
| Feet land and lift as flat slabs | Three rockers: heel strike (toe up) → foot flat → heel rise about the ball → toe-tip pivot with the toes bending. |
| Hips glide on rails | Pelvis bobs (lowest after heel strike, highest at midstance), sways over the stance foot, rotates the swing hip forward, drops on the swing side, and surges. |
| Bob depth guessed | The bob depth comes from the geometry of the coming landing, so the knee is nearly straight at heel strike for any leg length. |
| Upper body locked to the hips | Thorax counter-rotates against the pelvis; arms swing opposite the legs with the elbow lagging the shoulder; head stays level. |
| Wrong rhythm | Step length follows the human walk ratio (∝ √speed); stance shortens as speed rises; small per-step variation. |
| Limbs pass through the body | Arms carry the anatomical elbow angle and open just enough at the shoulder to clear the torso and thighs; the passing leg steps wide enough to clear the standing one. Clearance is solved each frame against the same cross-sections the mesh is built from. |
| Low-poly, plastic look | ~43k-vertex skinned body with jointed fingers and a built-up sneaker; per-surface shading (skin, knit cloth with sheen, stranded hair, shoe, sole) and ambient occlusion. |

The joint angles are checked against reference adult gait curves (Winter 1991,
Perry 1992): over a cycle the RMS error is about 4–6° at hip, knee and ankle.
Turn on **Gait graph** to see the comparison live. A mesh-level check over a
full cycle finds no arm or leg passing through the body, across slender to
heavy builds.

## Man, woman, and everything between

`sex` is a continuous blend, not a switch. Toward 1 it narrows the shoulders
(~9% of stature), broadens the hips (~7%), slims the waist, arms, neck and
calves, adds a bust and softens the jaw and brow. It also changes the walk the
way measured gait does: more pelvic rotation and drop, a narrower base and a
slightly higher cadence. `hairLength` adds a hair fall that frames the face.
**Man** and **Woman** are starting presets; every value stays on its slider.

## Files

- `src/proportions.js`: creator sliders → a spec of lengths (anthropometric
  ratios of stature) and the bone layout. Bone names follow the common humanoid
  convention (`hips`, `spine`, `leftUpLeg`, `leftForeArm`, …).
- `src/body.js`: `buildRig(spec)` makes the `THREE.Bone` tree;
  `buildBody(spec, rig)` lofts one skinned mesh from anatomical cross-sections,
  with weights blended across joints.
- `src/gait.js`: `Walker` is the gait solver. `walker.update(dt)` returns a pose
  (world rotations per bone, hip position, foot contacts, diagnostics);
  `applyPose(pose, rig.bones)` writes it to the skeleton.
- `src/reference.js`: reference sagittal joint angles for validation.
- `src/main.js`: scene, isometric camera, endless floor, overlays and UI.

## Reusing it

```js
import { makeSpec } from './src/proportions.js';
import { buildRig, buildBody } from './src/body.js';
import { Walker, applyPose } from './src/gait.js';

const spec = makeSpec({ ...DEFAULT_CHARACTER, height: 1.62, build: 1.15 });
const rig = buildRig(spec);
const mesh = buildBody(spec, rig);       // or bind your own mesh to rig.list
const walker = new Walker(spec, { speed: 1.1, posture: -0.4 });

function tick(dt) { applyPose(walker.update(dt), rig.bones); }
```

Every bone's rest rotation is identity, and the pose holds world rotations, so
retargeting onto another humanoid skeleton is a per-bone rest-offset
multiply: `local = parentWorld⁻¹ · world · restOffset`.

In the browser console, `walkerApp.walker.pose` exposes the live solve.
