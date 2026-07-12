/* data-006.js — Argentina 2–1 Switzerland
   FIFA World Cup 2026, Quarterfinal (M61) · Arrowhead Stadium, Kansas City
   Saturday 11 July 2026, 21:00 EDT. Sources: FotMob, Sofascore, Opta
   (retrieved 2026-07-12). Counts are exact; average positions are each
   player's per-half mean touch location, attack running downward for
   Argentina (toward y = 1) in normalized pitch fractions. */
window.M6 = {
  home: { id: "arg", name: "argentina", score: 2 },
  away: { id: "sui", name: "suiza", score: 1 },
  aet: false, htScore: [0, 0], ftScore: [2, 1],
  date: "11·07·2026", kickoff: "21:00 edt",
  venue: "estadio arrowhead, kansas city",
  attendance: 76416, matchId: "M61",
  competition: "mundial 2026 · cuartos de final",
  coords: ["39.0997° n", "94.5786° o"],

  goals: [
    { min: 61, team: "arg", player: "messi",  assist: "mac allister", x: 0.46, y: 0.83 },
    { min: 78, team: "arg", player: "almada", assist: "messi",        x: 0.63, y: 0.87 },
    { min: 85, team: "sui", player: "embolo", assist: "vargas",       x: 0.45, y: 0.12 },
  ],
  cards: [{ min: 44, team: "sui", player: "freuler" }, { min: 71, team: "arg", player: "romero" }],
  breaks: [], periods: [45, 90], totalMin: 90,

  possession: { arg: 58, sui: 42 },
  xg: { arg: 2.05, sui: 0.74 },
  shots: { arg: 17, sui: 8 },
  onTarget: { arg: 7, sui: 3 },
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
    celeste: "#4f93c4", celesteDeep: "#2b6a99",
    rojo: "#c0392b", rojoDeep: "#96271c",
    negro: "#221f1a", papel: "#e9e3d5",
  },

  frameData: "argentina 2–1 suiza<br>mundial 2026 · kansas city · 11·07",
};
