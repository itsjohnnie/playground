/* data-008.js — Argentina 3–2 Cabo Verde (a.e.t.)
   FIFA World Cup 2026, Round of 32 · Hard Rock Stadium, Miami · 3 July 2026.
   Sources: FotMob, Sofascore, Opta, xGscore (retrieved 2026-07-06).
   Shared by all ten studies of piece 008. Counts are exact; where sources
   disagree on a minute, the consensus value is used (see art-lab log). */
window.M8 = {
  home: { id: "arg", name: "argentina", score: 3 },
  away: { id: "cpv", name: "cabo verde", score: 2 },
  aet: true, htScore: [1, 0], ftScore: [1, 1],
  date: "03·07·2026", venue: "hard rock stadium, miami",
  attendance: 64478, competition: "mundial 2026 · dieciseisavos",

  goals: [
    { min: 29,  team: "arg", player: "messi",         assist: "l. martínez" },
    { min: 59,  team: "cpv", player: "d. duarte",     assist: "r. mendes" },
    { min: 92,  team: "arg", player: "l. martínez",   assist: "mac allister", exact: 91.95 },
    { min: 103, team: "cpv", player: "lopes cabral",  assist: "y. semedo" },
    { min: 111, team: "arg", player: "og · borges",   og: true },
  ],
  cards: [{ min: 69, team: "cpv", player: "lenini" }, { min: 115, team: "arg", player: "montiel" }],
  subs: { arg: [63, 63, 84, 85, 104], cpv: [67, 67, 68, 80, 100, 100] },
  breaks: [26, 73],           // hydration
  periods: [45, 90, 105],     // ht, ft, et half
  totalMin: 120,

  possession: { arg: 64, cpv: 36 },
  xg: { arg: 2.16, cpv: 0.45 },
  // per phase [1H, 2H, ET]
  xgPhase: { arg: [0.46, 1.31, 0.58], cpv: [0.08, 0.23, 0.45] },
  shots: { arg: 22, cpv: 16 },
  shotsPhase: { arg: [4, 12, 6], cpv: [2, 5, 9] },
  onTarget: { arg: 10, cpv: 5 },
  passes: { arg: 849, cpv: 476 },
  corners: { arg: 8, cpv: 8 },
  fouls: { arg: 13, cpv: 12 },
  saves: { arg: 3, cpv: 8 },  // emi martínez 3 · vozinha 8
  boxTouches: { arg: 51, cpv: 16 },
  finalThirdEntries: { arg: 82, cpv: 57 },

  messi: { touches: 83, carries: 33, keyPasses: 4, xg: 1.26, xa: 0.72, foulsDrawn: 5 },

  xi: {
    arg: ["e. martínez", "molina", "romero", "l. martínez", "medina", "de paul",
          "mac allister", "e. fernández", "almada", "messi", "lautaro"],
    cpv: ["vozinha", "moreira", "pico lopes", "diney", "lopes cabral", "lenini",
          "r. mendes", "l. duarte", "d. duarte", "j. cabral", "nuno da costa"],
  },

  // shared palette — hand-tuned inks, not screen colors
  ink: {
    arg: "#6cabd6", argDeep: "#2b6a99",
    cpv: "#d5493c", cpvDeep: "#a82c22",
    gold: "#e9b32a", paper: "#e9e3d5", night: "#0a0a0c",
  },

  // the frame line every study uses
  frameData: "argentina 3–2 cabo verde · prórroga<br>mundial 2026 · miami · 03·07",
};
