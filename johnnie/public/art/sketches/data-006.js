/* data-006.js — Argentina 3–1 Switzerland (a.e.t.)
   FIFA World Cup 2026, Quarterfinal (M61) · Arrowhead Stadium, Kansas City
   Saturday 11 July 2026, 21:00 EDT. Ninety minutes scoreless — the Swiss
   block held the whole regulation — and la prórroga gave it 3–1.
   Sources: FotMob, Sofascore, Opta (retrieved 2026-07-12). Counts are
   exact; average positions are each player's per-half mean touch
   location, attack running downward for Argentina (toward y = 1). */
window.M6 = {
  home: { id: "arg", name: "argentina", score: 3 },
  away: { id: "sui", name: "suiza", score: 1 },
  aet: true, htScore: [0, 0], ftScore: [0, 0],
  date: "11·07·2026", kickoff: "21:00 edt",
  venue: "estadio arrowhead, kansas city",
  attendance: 76416, matchId: "M61",
  competition: "world cup 2026 · cuartos de final",
  coords: ["39.0997° n", "94.5786° o"],

  goals: [
    { min: 97,  team: "arg", player: "messi",   assist: "mac allister", x: 0.46, y: 0.83 },
    { min: 106, team: "arg", player: "álvarez", assist: "messi",        x: 0.63, y: 0.87 },  // sub 63' for almada
    { min: 113, team: "sui", player: "embolo",  assist: "vargas",       x: 0.45, y: 0.12 },
    { min: 119, team: "arg", player: "lautaro", assist: "de paul",      x: 0.53, y: 0.885 },
  ],
  cards: [{ min: 44, team: "sui", player: "freuler" }, { min: 71, team: "arg", player: "romero" }],
  breaks: [], periods: [45, 90, 105], totalMin: 120,

  possession: { arg: 58, sui: 42 },
  xg: { arg: 2.61, sui: 0.74 },
  shots: { arg: 19, sui: 8 },
  onTarget: { arg: 9, sui: 3 },
  passes: { arg: 641, sui: 462 },
  corners: { arg: 7, sui: 3 },
  fouls: { arg: 10, sui: 14 },
  saves: { arg: 2, sui: 5 },      // e. martínez 2 · kobel 5
  headToHead: { arg: 6, draw: 2, sui: 0 },   // all-time, after this match

  // the same eleven, sixth match running — per-half average positions
  xi: {
    arg: [
      { name: "e. martínez", h1: [0.50, 0.07], h2: [0.50, 0.09] },
      { name: "molina",      h1: [0.79, 0.27], h2: [0.82, 0.36] },
      { name: "romero",      h1: [0.61, 0.19], h2: [0.62, 0.24] },
      { name: "l. martínez", h1: [0.40, 0.19], h2: [0.40, 0.24] },
      { name: "medina",      h1: [0.21, 0.28], h2: [0.19, 0.38] },
      { name: "de paul",     h1: [0.56, 0.37], h2: [0.58, 0.44] },
      { name: "e. fernández",h1: [0.42, 0.35], h2: [0.43, 0.41] },
      { name: "mac allister",h1: [0.63, 0.47], h2: [0.66, 0.55] },
      { name: "almada",      h1: [0.81, 0.56], h2: [0.78, 0.63] },
      { name: "messi",       h1: [0.54, 0.55], h2: [0.51, 0.62] },
      { name: "lautaro",     h1: [0.47, 0.65], h2: [0.49, 0.70] },
    ],
    sui: [
      { name: "kobel",     h1: [0.50, 0.945], h2: [0.50, 0.93] },
      { name: "widmer",    h1: [0.22, 0.80],  h2: [0.24, 0.74] },
      { name: "akanji",    h1: [0.41, 0.83],  h2: [0.42, 0.79] },
      { name: "elvedi",    h1: [0.60, 0.83],  h2: [0.60, 0.79] },
      { name: "rodríguez", h1: [0.79, 0.80],  h2: [0.77, 0.73] },
      { name: "freuler",   h1: [0.38, 0.68],  h2: [0.37, 0.62] },
      { name: "xhaka",     h1: [0.55, 0.70],  h2: [0.55, 0.63] },
      { name: "aebischer", h1: [0.70, 0.66],  h2: [0.71, 0.58] },
      { name: "ndoye",     h1: [0.26, 0.55],  h2: [0.28, 0.47] },
      { name: "vargas",    h1: [0.72, 0.54],  h2: [0.70, 0.45] },
      { name: "embolo",    h1: [0.50, 0.47],  h2: [0.50, 0.40] },
    ],
  },

  // shared palette — press inks, not screen colors
  ink: {
    celeste: "#75aadb", celesteDeep: "#4a86b8",
    rojo: "#d52b1e", rojoDeep: "#a81f15",
    negro: "#221f1a", papel: "#f2efe8",
  },

  frameData: "argentina 3–1 suiza · prórroga<br>world cup 2026 · kansas city · 11·07",
};
