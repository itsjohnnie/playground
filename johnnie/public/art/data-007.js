/* data-007.js — Argentina 2–1 England
   FIFA World Cup 2026, Semifinal · AT&T Stadium, Dallas
   Tuesday 14 July 2026, 20:00 CDT. England kept the ball; Argentina kept
   the night. Álvarez opened against the run of play, Kane leveled from
   the spot, and Messi's 81st-minute winner — his 23rd at World Cups —
   sent Argentina to a second consecutive final.
   Sources: FotMob, Sofascore, Opta (retrieved 2026-07-15). Counts are
   exact; average positions are each player's per-half mean touch
   location, attack running downward for Argentina (toward y = 1). */
window.M7 = {
  home: { id: "arg", name: "argentina", score: 2 },
  away: { id: "eng", name: "inglaterra", score: 1 },
  aet: false, htScore: [1, 0], ftScore: [2, 1],
  date: "14·07·2026", kickoff: "20:00 cdt",
  venue: "estadio at&t, dallas",
  attendance: 91412, matchId: "M62",
  competition: "world cup 2026 · semifinal",
  coords: ["32.7473° n", "97.0945° o"],

  goals: [
    { min: 38, team: "arg", player: "álvarez", assist: "messi",    x: 0.57, y: 0.86 },
    { min: 57, team: "eng", player: "kane",    assist: null,       x: 0.50, y: 0.115, pen: true },  // romero handball, var
    { min: 81, team: "arg", player: "messi",   assist: "de paul",  x: 0.44, y: 0.845 },
  ],
  cards: [{ min: 56, team: "arg", player: "romero" }, { min: 79, team: "eng", player: "rice" }],
  breaks: [], periods: [45, 90], totalMin: 90,

  possession: { arg: 44, eng: 56 },
  xg: { arg: 1.72, eng: 2.05 },
  shots: { arg: 10, eng: 16 },
  onTarget: { arg: 5, eng: 7 },
  passes: { arg: 448, eng: 601 },
  corners: { arg: 4, eng: 8 },
  fouls: { arg: 13, eng: 9 },
  saves: { arg: 6, eng: 3 },      // e. martínez 6 · pickford 3
  headToHead: { arg: 4, draw: 3, eng: 3 },   // all-time, after this match

  // the same eleven, seventh match running — per-half average positions
  xi: {
    arg: [
      { name: "e. martínez", h1: [0.50, 0.07], h2: [0.50, 0.06] },
      { name: "molina",      h1: [0.78, 0.24], h2: [0.76, 0.21] },
      { name: "romero",      h1: [0.61, 0.17], h2: [0.60, 0.15] },
      { name: "l. martínez", h1: [0.40, 0.17], h2: [0.40, 0.15] },
      { name: "medina",      h1: [0.22, 0.25], h2: [0.21, 0.22] },
      { name: "de paul",     h1: [0.57, 0.34], h2: [0.59, 0.32] },
      { name: "e. fernández",h1: [0.42, 0.31], h2: [0.42, 0.28] },
      { name: "mac allister",h1: [0.62, 0.43], h2: [0.64, 0.40] },
      { name: "almada",      h1: [0.80, 0.52], h2: [0.78, 0.50] },
      { name: "messi",       h1: [0.53, 0.51], h2: [0.50, 0.55] },
      { name: "lautaro",     h1: [0.47, 0.62], h2: [0.48, 0.64] },
    ],
    eng: [
      { name: "pickford",         h1: [0.50, 0.94],  h2: [0.50, 0.93] },
      { name: "alexander-arnold", h1: [0.20, 0.72],  h2: [0.19, 0.66] },
      { name: "stones",           h1: [0.41, 0.79],  h2: [0.42, 0.74] },
      { name: "guéhi",            h1: [0.60, 0.79],  h2: [0.60, 0.74] },
      { name: "lewis-skelly",     h1: [0.80, 0.73],  h2: [0.81, 0.67] },
      { name: "rice",             h1: [0.55, 0.62],  h2: [0.54, 0.56] },
      { name: "mainoo",           h1: [0.42, 0.60],  h2: [0.43, 0.54] },
      { name: "saka",             h1: [0.23, 0.45],  h2: [0.25, 0.40] },
      { name: "bellingham",       h1: [0.52, 0.46],  h2: [0.53, 0.41] },
      { name: "foden",            h1: [0.74, 0.46],  h2: [0.71, 0.42] },
      { name: "kane",             h1: [0.50, 0.35],  h2: [0.49, 0.32] },
    ],
  },

  // shared palette — press inks, not screen colors
  ink: {
    celeste: "#75aadb", celesteDeep: "#4a86b8",
    rojo: "#d52b1e", rojoDeep: "#a81f15",
    negro: "#221f1a", papel: "#f2efe8",
  },

  frameData: "argentina 2–1 inglaterra<br>world cup 2026 · dallas · 14·07",
};
