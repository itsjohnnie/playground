/* data-002.js — Argentina 2–0 Austria
   FIFA World Cup 2026, Group J · Dallas Stadium (AT&T Stadium), Arlington,
   Texas · 22 June 2026, kickoff noon CT · attendance 70,649 · referee
   Amin Omar (EGY).
   Messi 38' (Medina, Almada dummy) and 90+5' (rebound off Álvarez's saved
   shot) — his 17th and 18th World Cup goals, past Klose's 16: the all-time
   World Cup scoring record. He had missed a 9' penalty wide. Bookings:
   Medina 76' and Laimer 76' (the altercation), Paredes 90+2'.
   Sources, retrieved 2026-07-07: ESPN match page + commentary (gameId
   760456 — possession, shots, on target, xG, passes, fouls, event minutes,
   subs), FIFA match centre 400021494, Al Jazeera match report (attendance,
   penalty, assists, record context). Counts are exact per ESPN; where FIFA
   disagrees (attempts 12–6, xG 2.65–0.50) the ESPN value is used.
   APPROXIMATIONS (seeded, minimal): per-half xG/shot splits are estimated
   from the commentary timeline (totals exact); shot minutes not pinned in
   `shotMinutes` are seeded in-piece. Announced stoppage was +5 and play ran
   to about 90+8; the record is drawn to 90+6 — the minute the second goal
   landed is its final line. */
window.M2 = {
  home: { id: "arg", name: "argentina", score: 2 },
  away: { id: "aut", name: "austria", score: 0 },
  htScore: [1, 0],
  date: "22·06·2026", venue: "estadio de dallas, arlington",
  attendance: 70649, referee: "amin omar",
  competition: "mundial 2026 · grupo j",

  goals: [
    { min: 38, team: "arg", player: "messi", assist: "medina", nth: 17 },
    { min: 95, team: "arg", player: "messi", assist: "álvarez (rebote)",
      nth: 18, exact: 95.4, record: true }, // 90+5 — the all-time record
  ],
  penalty: { min: 9, team: "arg", player: "messi", result: "desviado" },
  cards: [
    { min: 76, team: "arg", player: "medina" },   // altercation with laimer
    { min: 76, team: "aut", player: "laimer" },
    { min: 92, team: "arg", player: "paredes" },  // 90+2
  ],
  subs: { arg: [82, 82], aut: [67, 68, 68, 78, 85] },
  periods: [45, 96],  // 1H · 2H incl. stoppage as drawn
  totalMin: 96,       // 90' + six of stoppage — the goal at 90+5

  possession: { arg: 54, aut: 46 },
  xg: { arg: 2.36, aut: 0.53 },
  // per phase [1H, 2H+stoppage] — estimated split, totals exact
  xgPhase: { arg: [1.35, 1.01], aut: [0.12, 0.41] },
  shots: { arg: 9, aut: 6 },
  shotsPhase: { arg: [4, 5], aut: [2, 4] }, // estimated split, totals exact
  onTarget: { arg: 5, aut: 1 },
  // shot minutes pinned from the ESPN commentary; the rest seeded in-piece
  shotMinutes: {
    arg: [
      { min: 9, on: false },     // messi, penalty wide
      { min: 38, on: true },     // messi, goal
      { min: 74, on: false },    // gonzález header off a corner
      { min: 87, on: false },    // gonzález, blocked by danso
      { min: 95, on: true },     // álvarez, saved by schlager
      { min: 95.2, on: true },   // messi, the rebound — goal
    ],
    aut: [
      { min: 94, on: false },    // wimmer header wide (90+4)
    ],
  },
  passes: { arg: 494, aut: 401 }, // accurate (89% · 86%)
  fouls: { arg: 13, aut: 13 },

  messi: { shots: 4, xg: 1.51, goals: 2, wcGoals: 18 },

  // shared palette — hand-tuned inks, not screen colors
  ink: {
    arg: "#6cabd6", argDeep: "#2b6a99",
    aut: "#d5493c", autDeep: "#a82c22",
    gold: "#e9b32a", goldDeep: "#a97b12",
    paper: "#e9e3d5", night: "#0a0a0c",
  },

  frameData: "argentina 2–0 austria · grupo j<br>mundial 2026 · arlington · 22·06",
};
