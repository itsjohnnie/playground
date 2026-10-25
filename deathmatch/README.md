# Celebrity Claymatch

A browser claymation celebrity wrestling brawler in the spirit of the 2003
*Celebrity Deathmatch* game. It has an isometric broadcast camera, stop-motion
clay puppets, eight original parody celebrities, a referee, two commentators,
weapons, finishers and instant replays. Every model, texture and sound is
generated in code.

**Run it:** serve the repo root with any static server and open `/deathmatch/`.

```sh
python3 -m http.server 8000   # then http://localhost:8000/deathmatch/
```

There's no build step and no install. Three.js r185 is vendored in `lib/`.

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
  model.js       puppet builder: joint hierarchy + caricature head, hair, faces
  characters.js  roster, boss, commentators
  poses.js       pose library and move timelines (degrees per joint)
  fighter.js     combat state machine, grapples, throws, specials, damage, replay snapshots
  arena.js       ring, dynamic ropes, ringside, instanced crowd, lighting rig, video wall
  crew.js        referee AI (shadowing, counts, getting flattened) + commentators
  weapons.js     pick-up weapons and special-move projectiles
  particles.js   clay chunks, teeth, sweat, shockwaves, dizzy stars, confetti
  finishers.js   eight scripted Clay Time finishers
  camera.js      isometric tracking camera, shake, cinematic shots
  ai.js          CPU state machine (Easy / Normal / Hard)
  input.js       keyboard + Gamepad API
  audio.js       Web Audio synthesis: hits, squish, boing, clang, bell, crowd, rock loop
  commentary.js  lower-third commentary + optional speech synthesis
  ui.js / game.js  screens, HUD, match flow, replays, tournament
```

### The clay shader

Every puppet part uses `MeshStandardMaterial` with three additions:

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
soft shadows, a cool rim light from behind, a blue wash on the crowd, ACES tone
mapping, a CSS vignette and animated film grain.

### The stop-motion system

The game logic, camera and particles run at 60 fps. The **puppets only update at
12 fps**. On each tick a fighter samples its pose timeline, applies it to the
joints and snaps its visible position to the logic position, so it holds each pose
like a hand-animated frame. Each tick also "boils" every clay part: a tiny random
offset and a scale wobble from a stored base transform. That gives the
hand-touched shimmer of real stop-motion. Hits add squash-and-stretch, persistent
dents and bruises (dark clay blobs pressed onto the head). Heavy hits can also
knock a head clean off until the fighter gets up.

Instant replays fall out of this system for free. Each 12 fps tick stores a
snapshot of every joint, and the replay plays those snapshots back from a new
camera angle.
