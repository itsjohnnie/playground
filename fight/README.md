# Silicon Valley Claymatch

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
  sdf.js         SDF sculpting: smooth unions, coarse-to-fine sampling, surface nets, paint + skin weights
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

### The puppets

Characters aren't assembled from primitives. Each one is **sculpted as a
signed distance field**: ellipsoids, tapered capsules, tori and rolls of clay
blended with smooth unions (`smin`) so they melt into each other, plus smooth
subtractions for eye sockets, nostrils, ears and an open grimace (`js/sdf.js`).
The field is sampled on a grid, coarse-to-fine so only blocks near the
surface are evaluated exactly, and meshed with naive surface nets. Each
vertex is then painted (skin, sleeves, V-necks, belts, shoes, hair, lips) and
weighted to bones by whichever parts it belongs to.

- **Body:** one continuous skinned mesh covering torso, neck, arms, legs and
  shoes. It is sculpted and bound in an A-pose so arms and legs never fuse to
  the torso, with bones for the pelvis, spine, chest, neck, collarbones,
  shoulders, elbows, wrists, hips, knees and ankles.
- **Hands:** one skinned clay mitt each, with two-joint finger bones and a
  thumb that pose into fists, open palms, points, horns and grips.
- **Head:** one mesh. The skull is a star-shaped field tabulated from a
  per-character sculpt (jaw width, chin, cheekbones, brow ridge, eye sockets).
  Nose, ears, lips, hair, curls, strands, beards and moustaches are blended
  into it, and hair and beards are shells that thin to nothing at the
  hairline. Eyeballs, lids, brows and teeth stay separate pieces, as on a real
  stop-motion puppet, so expressions can move them.

Sculpted geometry is cached per character. Select-screen portraits are built
in the background after the title screen appears.

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
