// The roster: clay caricatures of tech figures, for parody.
// Head params sculpt the skull (see model.js sculpt()):
//   W/H/D skull proportions, jaw (lower-face width), chin (forward), chinLen,
//   cheek, brow, socket, muzzle, forehead, nose {len, w, tip, bridge, hook},
//   eye {size, gap, iris}, mouth {w, lip, smile}, ear.

export const ROSTER = [
  {
    id: 'dario', name: 'Dario Amodei', short: 'DARIO', title: 'The Safety Scaler',
    skin: '#e8b892', build: 'slim',
    head: { W: 0.9, H: 1.08, D: 0.98, jaw: 0.86, chin: 0.06, chinLen: 0.04, cheek: 0.03, brow: 0.05, socket: 0.07, muzzle: 0.04, forehead: 1.04,
      nose: { len: 1.0, w: 1.0, tip: 1.05, bridge: 1.0 }, eye: { size: 1.0, gap: 1.0, iris: '#4a3524' }, mouth: { w: 1.0, lip: 0.9, smile: 0.25 }, ear: 1.0 },
    brows: { color: '#2a1d16', thick: 0.95, arch: 0.35 },
    hair: { style: 'curly', color: '#22170f', color2: '#3b2a1e', density: 0.85 },
    facial: {},
    glasses: { type: 'roundrect', color: '#23324c' },
    top: { type: 'buttonup', color: '#7896d4' }, bottom: { color: '#48484c' }, shoes: { color: '#5c3b24', sole: '#2a1c14', boot: true },
    acc: [], stats: { power: 3, speed: 4, tough: 4 },
    taunt: 'point',
    special: { type: 'projectile', prop: 'papers', name: 'Responsible Scaling Barrage', color: '#e8a070' },
    finisher: { type: 'ball', name: 'Aligned & Contained' },
    entrance: 'Wrote a 15,000-word essay on why this fight will go well…',
    quips: ['Dario calls that hit "a well-scoped intervention"!', 'He red-teamed that punch before throwing it!'],
  },
  {
    id: 'sam', name: 'Sam Altman', short: 'SAM', title: 'The Hype Scaler',
    skin: '#efc3a2', build: 'slim',
    head: { W: 0.9, H: 1.06, D: 0.96, jaw: 0.82, chin: 0.03, chinLen: 0.02, cheek: 0.02, brow: 0.03, socket: 0.05, muzzle: 0.03, forehead: 1.02,
      nose: { len: 0.95, w: 0.95, tip: 1.0, bridge: 0.9 }, eye: { size: 1.45, gap: 1.0, iris: '#6a8aa0' }, mouth: { w: 0.85, lip: 0.85, smile: 0.1 }, ear: 1.05 },
    brows: { color: '#4a3424', thick: 0.9, arch: 0.35 },
    hair: { style: 'curly', color: '#2e2018', color2: '#4a3324' },
    facial: {},
    top: { type: 'henley', color: '#3e5d8c' }, bottom: { color: '#1f2b46' }, shoes: { color: '#ece8e0', sole: '#d8d2c8' },
    acc: [], stats: { power: 3, speed: 5, tough: 3 },
    taunt: 'raise',
    special: { type: 'pound', name: 'Compute Surge', color: '#7af0c8' },
    finisher: { type: 'launch', name: 'Board Coup' },
    entrance: 'Says this fight will feel like a gentle singularity…',
    quips: ['Sam says that hit felt like AGI internally!', 'Sam is raising seven trillion in fist capital!'],
  },
  {
    id: 'satya', name: 'Satya Nadella', short: 'SATYA', title: 'The Cloud Commander',
    skin: '#a87452', build: 'average',
    head: { W: 0.9, H: 1.1, D: 0.98, jaw: 0.8, chin: 0.05, chinLen: 0.06, cheek: 0.04, brow: 0.04, socket: 0.06, muzzle: 0.04, forehead: 1.06,
      nose: { len: 1.1, w: 1.05, tip: 1.1, bridge: 1.1 }, eye: { size: 0.9, gap: 1.0, iris: '#2a1a10' }, mouth: { w: 1.0, lip: 0.95, smile: 0.45 }, ear: 1.1 },
    brows: { color: '#2a2420', thick: 1.0, arch: 0.25 },
    hair: { style: 'receding', color: '#2e2a28', color2: '#6a6662' },
    facial: { beardShort: '#6e6862' },
    glasses: { type: 'rimless', color: '#8a8a90' },
    top: { type: 'quarterzip', color: '#1e2638', inner: '#e8e8ea' }, bottom: { color: '#2a2e38' }, shoes: { color: '#1a1a1c', sole: '#141416' },
    acc: [], stats: { power: 3, speed: 3, tough: 5 },
    taunt: 'bow',
    special: { type: 'spin', name: 'Azure Cyclone', color: '#3aa0ff' },
    finisher: { type: 'explode', name: 'Hit Refresh' },
    entrance: 'Has a growth mindset and a cloud full of punches…',
    quips: ['Satya just put that punch in the cloud!', 'A Copilot for your face!'],
  },
  {
    id: 'rauch', name: 'Guillermo Rauch', short: 'RAUCH', title: 'The Edge Runner',
    skin: '#e6bf9e', build: 'slim',
    head: { W: 0.88, H: 1.1, D: 0.98, jaw: 0.9, chin: 0.05, chinLen: 0.05, cheek: 0.04, brow: 0.06, socket: 0.07, muzzle: 0.03, forehead: 1.03,
      nose: { len: 1.3, w: 0.95, tip: 1.05, bridge: 1.2 }, eye: { size: 0.95, gap: 1.0, iris: '#3a2a1a' }, mouth: { w: 1.0, lip: 0.85, smile: 0.2 }, ear: 0.95 },
    brows: { color: '#1e1814', thick: 1.15, arch: 0.1 },
    hair: { style: 'swept', color: '#221a16', color2: '#3a2c24' },
    facial: { beard: '#251c18' },
    top: { type: 'tee', color: '#141416', logo: 'triangle' }, bottom: { color: '#1c1c20' }, shoes: { color: '#f2f2f2', sole: '#e0e0e0' },
    acc: [], stats: { power: 3, speed: 5, tough: 3 },
    taunt: 'point',
    special: { type: 'charge', name: 'Edge Deploy', color: '#ffffff' },
    finisher: { type: 'melt', name: 'Serverless' },
    entrance: 'Deployed to 70 regions before the bell…',
    quips: ['Rauch shipped that hit to the edge!', 'Instant preview deployment of PAIN!'],
  },
  {
    id: 'theo', name: 'Theo Browne', short: 'THEO', title: 'The Hot Take',
    skin: '#efc9aa', build: 'slim',
    head: { W: 0.9, H: 1.08, D: 0.96, jaw: 0.84, chin: 0.04, chinLen: 0.03, cheek: 0.02, brow: 0.04, socket: 0.06, muzzle: 0.04, forehead: 1.0,
      nose: { len: 1.0, w: 1.0, tip: 1.0, bridge: 1.0 }, eye: { size: 1.1, gap: 1.0, iris: '#5a7a4a' }, mouth: { w: 1.05, lip: 0.9, smile: 0.35 }, ear: 1.0 },
    brows: { color: '#6a4a2a', thick: 1.0, arch: 0.3 },
    hair: { style: 'long', color: '#c8a46a', color2: '#9a7a4a' },
    facial: { mustache: '#a07c4c' },
    top: { type: 'hoodie', color: '#7a4ad0', inner: '#5a34a0' }, bottom: { color: '#26262c' }, shoes: { color: '#1e1e22', sole: '#f0f0f0' },
    acc: [], stats: { power: 3, speed: 4, tough: 3 },
    taunt: 'raise',
    special: { type: 'scream', name: 'Hot Take', color: '#ff5ad0' },
    finisher: { type: 'stretch', name: "Ratio'd" },
    entrance: 'Already recorded a 40-minute reaction to this match…',
    quips: ['Theo is reacting to his own punch!', 'That take was SCORCHING!'],
  },
  {
    id: 'boris', name: 'Boris Cherny', short: 'BORIS', title: 'The Code Agent',
    skin: '#ebc6a6', build: 'slim',
    head: { W: 0.9, H: 1.08, D: 0.98, jaw: 0.88, chin: 0.04, chinLen: 0.03, cheek: 0.03, brow: 0.05, socket: 0.06, muzzle: 0.04, forehead: 1.02,
      nose: { len: 1.0, w: 1.0, tip: 1.0, bridge: 1.0 }, eye: { size: 1.0, gap: 1.0, iris: '#3a4a5a' }, mouth: { w: 1.0, lip: 0.85, smile: 0.3 }, ear: 1.0 },
    brows: { color: '#2a201a', thick: 1.0, arch: 0.2 },
    hair: { style: 'short', color: '#2a201a', color2: '#3a2c22', fringe: 0.4 },
    facial: { beardShort: '#2e241e' },
    top: { type: 'tee', color: '#d97757', logo: 'spark' }, bottom: { color: '#2e3644' }, shoes: { color: '#1c1c1e', sole: '#f2f2f2' },
    acc: [], stats: { power: 4, speed: 4, tough: 3 },
    taunt: 'phone',
    special: { type: 'projectile', prop: 'spark', name: 'Claude Code', color: '#d97757' },
    finisher: { type: 'headpop', name: 'Context Compaction' },
    entrance: 'His agent wrote the entrance music. And the walkout. And this line…',
    quips: ['Boris just /compact-ed his opponent!', 'That hit was written entirely by an agent!'],
  },
  {
    id: 'gates', name: 'Bill Gates', short: 'GATES', title: 'The Blue Screen',
    skin: '#f0cbb0', build: 'average',
    head: { W: 0.92, H: 1.04, D: 0.98, jaw: 0.86, chin: 0.03, chinLen: 0.0, cheek: 0.05, brow: 0.03, socket: 0.05, muzzle: 0.05, forehead: 1.0,
      nose: { len: 1.0, w: 1.1, tip: 1.35, bridge: 0.95 }, eye: { size: 0.95, gap: 1.0, iris: '#5a7a9a' }, mouth: { w: 1.25, lip: 0.85, smile: 0.95 }, ear: 1.1 },
    brows: { color: '#9a8070', thick: 0.9, arch: 0.4 },
    hair: { style: 'sidepart', color: '#b09a84', color2: '#d0c0b0' },
    facial: {},
    glasses: { type: 'rect', color: '#3a3430' },
    top: { type: 'sweater', color: '#7aa0c8', inner: '#f2f0ea' }, bottom: { color: '#7a6a58' }, shoes: { color: '#4a3424', sole: '#2a1c14' },
    acc: [], stats: { power: 3, speed: 3, tough: 4 },
    taunt: 'hips',
    special: { type: 'projectile', prop: 'floppy', name: 'Floppy Disk Barrage', color: '#3a6ae0' },
    finisher: { type: 'explode', name: 'Fatal Exception' },
    entrance: 'Came out of retirement for one more hostile takeover…',
    quips: ['Gates just installed a critical update on that jaw!', 'It is now safe to turn off his opponent!'],
  },
  {
    id: 'zuck', name: 'Mark Zuckerberg', short: 'ZUCK', title: 'The Jiu-Jitsu Founder',
    skin: '#f6dccb', build: 'muscle',
    head: { W: 0.9, H: 1.04, D: 0.96, jaw: 0.84, chin: 0.03, chinLen: 0.02, cheek: 0.02, brow: 0.02, socket: 0.05, muzzle: 0.03, forehead: 1.0,
      nose: { len: 0.9, w: 0.95, tip: 0.95, bridge: 0.9 }, eye: { size: 1.42, gap: 1.0, iris: '#5a7aa0' }, mouth: { w: 0.95, lip: 0.85, smile: 0.4 }, ear: 1.3 },
    brows: { color: '#6a4a30', thick: 0.85, arch: 0.25 },
    hair: { style: 'tightcurls', color: '#5a3c26', color2: '#6a4a30' },
    facial: {},
    top: { type: 'tee', color: '#1a1a1c' }, bottom: { color: '#2a3446' }, shoes: { color: '#1a1a1a', sole: '#f2f2f2' },
    acc: ['chain'], stats: { power: 5, speed: 4, tough: 4 },
    taunt: 'flex',
    special: { type: 'slaps', name: 'MMA Flurry', color: '#4a8aff' },
    finisher: { type: 'pretzel', name: 'Jiu-Jitsu Pretzel' },
    entrance: 'Trained for this in the metaverse. And also in real life…',
    quips: ['Zuck is moving fast and breaking faces!', 'That is a very human punch from Zuck!'],
  },
  {
    id: 'jensen', name: 'Jensen Huang', short: 'JENSEN', title: 'The Leather Jacket',
    skin: '#e4b48c', build: 'average',
    head: { W: 0.94, H: 1.02, D: 0.96, jaw: 0.9, chin: 0.03, chinLen: 0.02, cheek: 0.06, brow: 0.03, socket: 0.05, muzzle: 0.04, forehead: 1.0,
      nose: { len: 0.9, w: 1.1, tip: 1.05, bridge: 0.85 }, eye: { size: 0.78, gap: 1.05, iris: '#2a1a10' }, mouth: { w: 1.3, lip: 0.9, smile: 1.05 }, ear: 1.0 },
    brows: { color: '#2a2622', thick: 1.0, arch: 0.15 },
    hair: { style: 'swept', color: '#c8c6c2', color2: '#8a8884' },
    facial: {},
    top: { type: 'leather', color: '#121214', inner: '#1c1c1e' }, bottom: { color: '#141416' }, shoes: { color: '#141414', sole: '#0c0c0c', boot: true },
    glasses: { type: 'rimless', color: '#6a6a70' },
    acc: [], stats: { power: 4, speed: 3, tough: 4 },
    taunt: 'raise',
    special: { type: 'spin', name: 'Tensor Core Tornado', color: '#76b900' },
    finisher: { type: 'melt', name: 'Overclocked' },
    entrance: 'The more punches you buy, the more you save…',
    quips: ['Jensen is shipping punches by the rack!', 'That leather jacket is not even creased!'],
  },
  {
    id: 'elon', name: 'Elon Musk', short: 'ELON', title: 'The Rocket Man',
    skin: '#efcbb0', build: 'heavy',
    head: { W: 0.92, H: 1.17, D: 1.0, jaw: 1.0, chin: 0.13, chinLen: 0.12, cheek: 0.03, brow: 0.05, socket: 0.07, muzzle: 0.04, forehead: 1.03,
      nose: { len: 1.0, w: 1.05, tip: 1.0, bridge: 1.0 }, eye: { size: 0.9, gap: 1.0, iris: '#5a6a5a' }, mouth: { w: 1.0, lip: 0.8, smile: 0.2 }, ear: 1.0 },
    brows: { color: '#3a2c22', thick: 1.0, arch: 0.2 },
    hair: { style: 'short', color: '#3a2a20', color2: '#4a3628', fringe: 0.2 },
    facial: {},
    top: { type: 'blazer', color: '#16161a', inner: '#16161a' }, bottom: { color: '#16161a' }, shoes: { color: '#121212', sole: '#202020' },
    acc: [], stats: { power: 4, speed: 3, tough: 4 },
    taunt: 'flex',
    special: { type: 'projectile', prop: 'rocket', name: 'Starship Strike', color: '#ff8a3a' },
    finisher: { type: 'launch', name: 'One-Way Ticket to Mars' },
    entrance: 'Promised to win this fight by next year. Every year…',
    quips: ['Elon says that punch will be fully self-driving next quarter!', 'Rapid unscheduled disassembly!'],
  },
  {
    id: 'bezos', name: 'Jeff Bezos', short: 'BEZOS', title: 'The Prime Mover',
    skin: '#f0c8aa', build: 'muscle', shiny: true,
    head: { W: 0.98, H: 0.98, D: 0.98, jaw: 0.92, chin: 0.03, chinLen: 0.02, cheek: 0.05, brow: 0.05, socket: 0.06, muzzle: 0.05, forehead: 1.08,
      nose: { len: 0.95, w: 1.1, tip: 1.1, bridge: 0.9 }, eye: { size: 0.95, gap: 0.95, iris: '#4a5a6a' }, mouth: { w: 1.25, lip: 0.9, smile: 1.15 }, ear: 1.05 },
    brows: { color: '#4a3c34', thick: 0.9, arch: 0.45 },
    hair: { style: 'bald', color: '#f0c8aa' },
    facial: {},
    glasses: { type: 'aviator', color: '#c8a050' },
    top: { type: 'vest', color: '#2c3a52', inner: '#f2f2f4' }, bottom: { color: '#3a4458' }, shoes: { color: '#4a3020', sole: '#201410' },
    acc: [], stats: { power: 5, speed: 3, tough: 4 },
    taunt: 'flex',
    special: { type: 'pound', name: 'Prime Smash', color: '#ff9a1a' },
    finisher: { type: 'box', name: 'Same-Day Delivery' },
    entrance: 'Every punch arrives within one business day…',
    quips: ['That hit came with free returns!', 'Bezos just delivered that right to the face!'],
  },
  {
    id: 'cook', name: 'Tim Cook', short: 'COOK', title: 'The Thinnest Ever',
    skin: '#f0cdb4', build: 'slim',
    head: { W: 0.83, H: 1.13, D: 0.96, jaw: 0.84, chin: 0.05, chinLen: 0.05, cheek: 0.02, brow: 0.04, socket: 0.06, muzzle: 0.03, forehead: 1.04,
      nose: { len: 1.05, w: 0.95, tip: 1.0, bridge: 1.05 }, eye: { size: 0.9, gap: 1.0, iris: '#4a5a6a' }, mouth: { w: 0.95, lip: 0.8, smile: 0.45 }, ear: 1.05 },
    brows: { color: '#8a8682', thick: 0.85, arch: 0.25 },
    hair: { style: 'short', color: '#b8b6b2', color2: '#d0cecb', fringe: 0.1 },
    facial: {},
    glasses: { type: 'rimless', color: '#9a9aa0' },
    top: { type: 'quarterzip', color: '#141416', inner: '#141416' }, bottom: { color: '#3a4a6a' }, shoes: { color: '#e8e8e8', sole: '#f6f6f6' },
    acc: [], stats: { power: 2, speed: 5, tough: 4 },
    taunt: 'bow',
    special: { type: 'projectile', prop: 'phone', name: 'One More Thing', color: '#e8e8f0' },
    finisher: { type: 'pancake', name: 'Thinnest Ever' },
    entrance: "We think you're going to love getting hit by it…",
    quips: ['Cook just announced a thinner opponent!', 'Courage!'],
  },
];

export const BOSS = {
  id: 'agi', name: 'The AGI', short: 'AGI', title: 'Arriving Any Day Now', boss: true, allClay: true,
  skin: '#b8bcc8', build: 'giant', shiny: true,
  head: { W: 0.92, H: 1.0, D: 0.95, jaw: 0.95, chin: 0.02, chinLen: 0, cheek: 0.02, brow: 0.08, socket: 0.1, muzzle: 0.0, forehead: 1.0,
    nose: { len: 0.6, w: 0.8, tip: 0.8, bridge: 0.6 }, eye: { size: 1.2, gap: 1.05, iris: '#3af0ff', glow: true }, mouth: { w: 1.1, lip: 0.6, smile: 0.0 }, ear: 0.6 },
  brows: { color: '#6a6e78', thick: 1.3, arch: -0.1 },
  hair: { style: 'antenna', color: '#6a6e78' },
  facial: {},
  top: { type: 'shirtless', color: '#b8bcc8' }, bottom: { color: '#7a7e88' }, shoes: { color: '#5a5e68', sole: '#3a3e48' },
  acc: ['core'], stats: { power: 5, speed: 2, tough: 5 },
  taunt: 'pound',
  special: { type: 'pound', name: 'Recursive Self-Improvement', color: '#3af0ff' },
  finisher: { type: 'ball', name: 'Paperclipped' },
  entrance: 'Has been "two years away" for ten years. Tonight it arrives…',
  quips: ['The AGI has achieved punch-superiority!'],
};

// Referee and commentators share the puppet builder.
const HEAD = (o = {}) => ({ W: 0.9, H: 1.06, D: 0.97, jaw: 0.88, chin: 0.04, chinLen: 0.03, cheek: 0.03, brow: 0.05, socket: 0.06, muzzle: 0.04, forehead: 1.02,
  nose: { len: 1.0, w: 1.0, tip: 1.0, bridge: 1.0 }, eye: { size: 1.0, gap: 1.0, iris: '#4a3a2a' }, mouth: { w: 1.0, lip: 0.85, smile: 0.2 }, ear: 1.0, ...o });

export const REF_DEF = {
  id: 'ref', name: 'Referee', skin: '#f2cdb4', build: 'slim',
  head: HEAD({ jaw: 0.94, chin: 0.06, brow: 0.08, nose: { len: 1.15, w: 1.1, tip: 1.2, bridge: 1.1 }, mouth: { w: 0.9, lip: 0.7, smile: -0.4 }, ear: 1.2, eye: { size: 0.9, iris: '#4a4a52' } }),
  brows: { color: '#e0e0e4', thick: 1.4, arch: 0.0 },
  hair: { style: 'balding', color: '#d8d8dc' }, facial: {},
  top: { type: 'shirt', color: '#f6f6f2' }, bottom: { color: '#16161a' }, shoes: { color: '#0e0e10', sole: '#1a1a1a' },
  acc: ['bowtie'], stats: { power: 1, speed: 3, tough: 1 },
};
export const ANNOUNCER_DEFS = [
  {
    id: 'vinnie', skin: '#f0c8a6', build: 'slim', head: HEAD({ chin: 0.08, chinLen: 0.06, mouth: { w: 1.1, lip: 0.85, smile: 0.6 } }),
    brows: { color: '#1a1410', thick: 1.1, arch: 0.3 }, hair: { style: 'swept', color: '#1c1612', color2: '#2a2018' }, facial: {},
    top: { type: 'blazer', color: '#2a2c36', inner: '#f0f0f0' }, bottom: { color: '#2a2c36' }, shoes: { color: '#111', sole: '#111' }, acc: ['tie'], tie: '#c23838', stats: { power: 1, speed: 1, tough: 1 },
  },
  {
    id: 'marty', skin: '#e8b898', build: 'heavy', head: HEAD({ W: 0.95, cheek: 0.07, mouth: { w: 1.0, lip: 0.9, smile: 0.3 } }),
    brows: { color: '#3a2a20', thick: 1.2, arch: 0.2 }, hair: { style: 'balding', color: '#3a2a20' }, facial: { mustache: '#3a2a20' },
    glasses: { type: 'rect', color: '#2a2622' },
    top: { type: 'blazer', color: '#4a3a2e', inner: '#f0ece4' }, bottom: { color: '#4a3a2e' }, shoes: { color: '#111', sole: '#111' }, acc: ['tie'], tie: '#d8b040', stats: { power: 1, speed: 1, tough: 1 },
  },
];

export const ANNOUNCERS = {
  a: { name: 'Vinnie Valdez', short: 'VINNIE' },
  b: { name: 'Marty Bronze', short: 'MARTY' },
};

export function charById(id) {
  return ROSTER.find((c) => c.id === id) || (id === BOSS.id ? BOSS : ROSTER[0]);
}

// Caricature pass: each person gets one or two exaggerated "hooks" (the
// way a caricaturist draws) plus their own head size, height and resting
// face. Merged over the base definitions above.
//   head.size   skull scale      head.dome  tall domed crown
//   head.faceLen lower-face length  head.jowl  fleshy jaw sides
//   face.lid    resting lid droop (+ sleepy/smiling, − wide-eyed)
//   face.open   resting jaw drop  height  whole-body scale
const CARICATURE = {
  dario: { height: 0.98, head: { size: 1.05, W: 0.9, H: 1.0, faceLen: 0.95, cheek: 0.05, eye: { size: 1.15 }, nose: { len: 1.1, tip: 1.15 }, mouth: { w: 0.95, smile: 0.25 } }, face: { lid: 0.12 }, hair: { style: 'curly' } },
  sam: { height: 0.93, head: { size: 0.98, W: 0.88, H: 1.0, faceLen: 0.82, chin: -0.02, chinLen: -0.04, jaw: 0.72, eye: { size: 1.75, gap: 1.05 }, nose: { len: 0.75, w: 0.85, tip: 0.85 }, mouth: { w: 0.7, lip: 0.75, smile: 0.0 } }, face: { lid: -0.3, lower: -0.1 } },
  satya: { height: 1.0, head: { size: 1.02, dome: 0.35, W: 0.92, H: 1.02, faceLen: 1.05, jaw: 0.86, cheek: 0.07, nose: { len: 1.2, w: 1.15, tip: 1.2 }, eye: { size: 0.85 }, mouth: { w: 1.15, smile: 0.95 } }, face: { lid: 0.35, lower: 0.25 } },
  rauch: { height: 1.02, head: { size: 1.0, W: 0.86, H: 1.12, faceLen: 1.12, jaw: 0.95, brow: 0.1, nose: { len: 1.6, w: 1.0, tip: 1.0, bridge: 1.5 }, eye: { size: 0.85, gap: 0.95 }, mouth: { w: 0.95, smile: 0.15 } }, face: { lid: 0.3 }, brows: { thick: 1.6, arch: 0.05 } },
  theo: { height: 1.0, head: { size: 1.0, W: 0.88, H: 1.08, faceLen: 1.05, eye: { size: 1.3 }, mouth: { w: 1.2, smile: 0.7 } }, face: { lid: -0.15, open: 0.25 } },
  boris: { height: 1.0, head: { size: 1.0, dome: 0.12, W: 0.93, H: 1.02, faceLen: 0.98, cheek: 0.06, eye: { size: 1.05 }, mouth: { w: 1.05, smile: 0.55 } }, face: { lid: 0.1 } },
  gates: { height: 0.98, head: { size: 1.06, W: 1.0, H: 1.0, faceLen: 1.0, jowl: 0.07, cheek: 0.08, nose: { len: 1.15, w: 1.25, tip: 1.45 }, eye: { size: 0.9 }, mouth: { w: 1.45, lip: 0.85, smile: 1.15 } }, face: { lid: 0.05, open: 0.2 }, hair: { fringe: 1, color: '#8a7460', color2: '#a68e76' } },
  zuck: { height: 0.92, head: { size: 0.9, W: 0.96, H: 0.94, faceLen: 0.88, forehead: 0.95, jaw: 0.82, eye: { size: 1.7, gap: 1.02 }, ear: 1.6, nose: { len: 0.8, w: 0.9, tip: 0.85 }, mouth: { w: 0.85, lip: 0.75, smile: 0.1 } }, face: { lid: -0.32, lower: -0.12 } },
  jensen: { height: 0.95, head: { size: 1.02, W: 1.06, H: 0.96, faceLen: 0.9, cheek: 0.14, jaw: 0.95, eye: { size: 0.75 }, nose: { len: 0.9, w: 1.25, tip: 1.15 }, mouth: { w: 1.5, lip: 0.9, smile: 1.4 } }, face: { lid: 0.3, lower: 0.3, open: 0.15 } },
  elon: { height: 1.12, head: { size: 1.0, W: 0.92, H: 1.14, faceLen: 1.22, jaw: 1.08, chin: 0.2, chinLen: 0.18, cheek: 0.02, nose: { len: 1.1, w: 1.0 }, eye: { size: 0.95, gap: 0.95 }, mouth: { w: 0.95, lip: 0.7, smile: -0.1 } }, face: { lid: 0.25 } },
  bezos: { height: 1.0, head: { size: 1.12, dome: 0.65, W: 1.0, H: 0.98, faceLen: 0.95, jowl: 0.04, cheek: 0.08, forehead: 1.1, nose: { len: 1.0, w: 1.2, tip: 1.25 }, eye: { size: 0.9, gap: 0.92 }, mouth: { w: 1.45, lip: 0.95, smile: 1.5 } }, face: { lid: 0.25, lower: 0.2, open: 0.55 } },
  cook: { height: 1.1, head: { size: 0.95, W: 0.8, H: 1.2, faceLen: 1.2, jaw: 0.8, chin: 0.08, nose: { len: 1.2, w: 0.9 }, eye: { size: 0.85 }, mouth: { w: 0.85, lip: 0.7, smile: 0.5 } }, face: { lid: 0.2 } },
};

function deepMerge(base, over) {
  for (const [k, v] of Object.entries(over)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') deepMerge(base[k], v);
    else base[k] = v;
  }
  return base;
}
for (const c of ROSTER) if (CARICATURE[c.id]) deepMerge(c, CARICATURE[c.id]);
