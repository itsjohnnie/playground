/* data-003.js — Jordan 1–3 Argentina
   FIFA World Cup 2026, Group J · match 70 · AT&T Stadium, Arlington (Dallas)
   27 June 2026, 21:00 CT · attendance 70,649 · referee istván kovács (rou).
   Sources: ESPN match page + report (gameId 760483), Sky Sports report
   (jordan-vs-argentina/549833), FIFA match report (retrieved 2026-07-07).
   Counts are exact. Nothing approximated: corner counts and full XIs were
   not captured by the retrieved sources and are omitted rather than invented
   (the piece encodes goals only). Card minutes as provided in the match log
   (abu taha 17', abu zrayq 90+4'). */
window.M3 = {
  home: { id: "jor", name: "jordan", score: 1 },
  away: { id: "arg", name: "argentina", score: 3 },
  htScore: [0, 2],
  date: "27·06·2026", venue: "at&t stadium, arlington (dallas)",
  kickoff: "21:00 ct", attendance: 70649, referee: "istván kovács",
  competition: "mundial 2026 · grupo j · partido 70",

  goals: [
    { min: 19, team: "arg", player: "lo celso",    how: "free kick" },
    { min: 31, team: "arg", player: "l. martínez", how: "penalty", pen: true },
    { min: 55, team: "jor", player: "al-tamari",   assist: "haddad", how: "open play" },
    { min: 80, team: "arg", player: "messi",       how: "free kick" },
  ],
  cards: [
    { min: 17, team: "jor", player: "abu taha" },
    { min: 94, team: "jor", player: "abu zrayq", label: "90+4" },
  ],
  subs: { arg: [60] },          // messi on 60' — the only sub minute captured
  periods: [45, 90], totalMin: 90,

  possession: { jor: 27, arg: 73 },
  xg: { jor: 0.76, arg: 2.13 },
  shots: { jor: 10, arg: 22 },
  onTarget: { jor: 1, arg: 4 },
  passesAccurate: { jor: 228, arg: 737 },
  passAccuracy: { jor: 80, arg: 92 },
  fouls: { jor: 13, arg: 7 },
  saves: { jor: 1, arg: 0 },
  bigChances: { jor: 1, arg: 2 },
  duelsWon: { jor: 34, arg: 32 },

  // shared palette — hand-tuned inks, not screen colors
  ink: {
    arg: "#6cabd6", argDeep: "#2b6a99",
    jor: "#a8564a", jorDeep: "#7c3a31", // jordan kit red, desaturated to an ink
    gold: "#e9b32a", paper: "#e9e3d5", night: "#0a0a0c",
  },

  frameData: "jordan 1–3 argentina<br>mundial 2026 · grupo j · dallas · 27·06",
};
