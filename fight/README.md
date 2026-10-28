# Singularity Deathmatch

A browser claymation wrestling brawler in the spirit of the 2003
*Celebrity Deathmatch* game, starring clay caricatures of tech figures (for
parody): Dario Amodei, Sam Altman, Satya Nadella, Guillermo Rauch, Theo Browne,
Boris Cherny, Bill Gates, Mark Zuckerberg, Jensen Huang, Elon Musk, Jeff Bezos
and Tim Cook, with "The AGI" as the tournament boss. It has an isometric
broadcast camera, stop-motion skinned puppets, a referee, two commentators,
weapons, pyro, finishers and instant replays. Every model, texture and sound is
generated in code.

**Run it:** serve the repo root with any static server and open `/fight/`.

```sh
python3 -m http.server 8000   # then http://localhost:8000/fight/
```

There's no build step and no install. Three.js r185 (plus its bloom
post-processing and geometry utils) is vendored in `lib/`.

## Controls

| | P1 keys | P2 keys | Gamepad |
|---|---|---|---|
| Move | W A S D | Arrows | Stick / D-pad |
| Punch | J | Num1 / `,` | X / □ |
| Kick | K | Num2 / `.` | A / ✕ |
| Grab | L | Num3 / `/` | B / ○ |
| Block / pick up weapon | I | Num5 / `;` | RB / RT |
| Special / taunt | U | Num4 / `'` | Y / △ |
| Run | Shift or double-tap | Num0 or double-tap | LB / LT |
| Pause | Esc / P | | Start |

In 1P mode the player can use either key set.

- **Punch ×3**: jab, cross, uppercut.
- **Grab**, then **Punch** to headbutt, **Kick** to body slam, **Grab + direction** to Irish-whip the opponent into the ropes, or **Special** (half a meter) for the Airplane Spin.
- **Run + Punch** is a clothesline. **Run + Kick** is a dropkick. Hitting a fighter on the rope rebound does 1.6× damage.
- **Hold toward the ropes** to climb out of the ring and fight on the floor. **Hold into a corner** to climb the turnbuckle, then press any attack to dive.
- **Block next to a weapon** to pick it up (chair, bat, bell, trash can or mic). With a weapon, Punch swings it, Kick throws it and Grab drops it. Each weapon breaks after three hits.
- **Special** costs half the meter and fires your signature move. With less than half, Special taunts instead, which fills the meter and pumps up the crowd.
- **Grab a downed opponent** to pin them for a 3-count. Mash buttons to escape grabs and pins and to get up faster.
- **Clay Time:** if you win the deciding round with at least half a meter, the loser is left dazed. Press Special next to them to start your character's finisher.

## How it's built

```
js/
  clay.js        plasticine material, procedural normal map, lumpy geometry, boil jitter
  assets.js      loads the MakeHuman-built characters (.mhc) and their expression morphs
  sdf.js         fallback SDF sculptor: smooth unions, coarse-to-fine sampling, surface nets
  model.js       puppet builder: skeleton, sculpted skinned body and hands, sculpted heads, posing, faces
  characters.js  roster, boss, commentators
  poses.js       pose library and move timelines (degrees per joint)
  fighter.js     combat state machine, grapples, throws, specials, damage, replay snapshots
  arena.js       ring, dynamic ropes, ringside, instanced crowd, lighting rig, video wall
  crew.js        referee AI (shadowing, counts, getting flattened) + commentators
  weapons.js     pick-up weapons and special-move projectiles
  particles.js   clay chunks, teeth, sweat, shockwaves, dizzy stars, confetti
  finishers.js   nine scripted Clay Time finishers (incl. the Same-Day Delivery box)
  camera.js      isometric tracking camera, shake, cinematic shots
  ai.js          CPU state machine (Easy / Normal / Hard)
  input.js       keyboard + Gamepad API
  audio.js       Web Audio synthesis: hits, squish, boing, clang, bell, crowd, rock loop
  commentary.js  lower-third commentary + optional speech synthesis
  ui.js / game.js  screens, HUD, match flow, replays, tournament
```

### The puppets (built on MakeHuman)

Characters start from the [MakeHuman](http://www.makehumancommunity.org)
base mesh, whose mesh, morph targets, skeleton and weights are released as
CC0. `tools/build_mh.py` (Python + numpy, about a second per character)
turns it into a clay caricature and writes `assets/chars/<id>.mhc`:

```sh
tools/fetch_makehuman.sh            # one-off: sparse clone into tools/.mh
node --input-type=module -e "import * as m from './js/characters.js'; import {writeFileSync} from 'fs'; writeFileSync('tools/characters.json', JSON.stringify([...m.ROSTER, m.BOSS, m.REF_DEF, ...m.ANNOUNCER_DEFS]))"
python3 -I tools/build_mh.py        # or: build_mh.py sam dario
```

- **Likeness:** MakeHuman's age, muscle, weight, height and ethnicity macros,
  plus face and body targets per character (`LOOKS` in the builder: head
  shape, nose, eyes, mouth, chin, ears, neck). `CARICATURE` scales how hard
  each look is pushed. On top of that come puppet proportions: a much bigger
  head, chunkier hands and feet, and bigger eyes.
- **Clothes, hair, brows and beards** are shells grown off the skin. Each
  garment is clipped from the body along a smooth field (sleeve length,
  neckline, belt, trouser hem), so its edges come out clean. It's draped so it
  hangs straight from the chest, hips and shoulders instead of hugging every
  muscle, smoothed, and finished with rolled tube hems. Hair is a scalp shell
  with sculpted locks or curls laid along a flow direction. Skin hidden under
  clothes is cut away.
- **Rig:** MakeHuman's 163 bones fold into the game's 41 bones, and their skin
  weights fold with them. The bind pose is solved so the game's rest pose
  (arms hanging, palms in, fingers curling toward the palm) holds.
- **Faces:** ten facial expression units (blink, wide, squint, brows up, sad
  and down, jaw, smile, frown, teeth) ship as morph targets. Every shell
  inherits them, so beards drop with the jaw and brows ride the forehead.
  `setExpression` in `js/model.js` blends them per expression.
- **File format:** a gzipped `MHC2` blob with a JSON header, 16-bit positions,
  8-bit skin weights and sparse 16-bit morph deltas, about 0.5 MB per
  character. The browser inflates it with `DecompressionStream`. If a file is
  missing, the game falls back to its built-in SDF sculptor (`js/sdf.js`).

### The clay shader

Every clay part uses `MeshStandardMaterial` with three additions:

1. **A procedural normal map.** It's built once on a canvas from a height field:
   layered value noise for soft lumps, rings of concentric ridges for fingerprints,
   and short dented strokes for sculpting-tool marks. A Sobel pass turns the heights
   into a normal map.
2. **Lumpy geometry.** Each sphere, capsule and cone is displaced along its normals by
   seeded 3D noise, so no shape is perfectly round.
3. **A warm rim term.** It's injected with `onBeforeCompile` and adds
   `color × (1 − N·V)^2.4` in an orange tint as emissive light. That fakes the light
   that scatters through the edges of real plasticine.

The lighting copies a miniature studio set: one warm key spotlight that casts
shadows, cyan and magenta rim lights from behind, and a blue wash on the crowd.
An HDR bloom pass picks up the LED ribbon boards, apron light strips, post
lamps, pyro and glowing specials. A CSS vignette and animated film grain sit on
top.

### The stop-motion system

The game logic, camera and particles run at 60 fps. The **puppets only update at
12 fps**. On each tick a fighter samples its pose timeline, applies it to the
bones and snaps its visible position to the logic position, so it holds each pose
like a hand-animated frame. Each tick also "boils" the puppet: every joint gets
a sub-degree random nudge, and every rigid clay part gets a tiny offset and
scale wobble from its stored base transform. That gives the
hand-touched shimmer of real stop-motion. Hits add squash-and-stretch, persistent
dents and bruises (dark clay blobs pressed onto the head). Heavy hits can also
knock a head clean off until the fighter gets up.

Instant replays fall out of this system for free. Each 12 fps tick stores a
snapshot of every joint, and the replay plays those snapshots back from a new
camera angle.
