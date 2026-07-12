/* data-001.js — Argentina 3–0 Algeria
   FIFA World Cup 2026, Group J · Arrowhead Stadium, Kansas City · 16 June 2026,
   kickoff 8pm CT · attendance 69,045 · referee Szymon Marciniak (POL).
   Lionel Messi 17' 60' 76' — his first World Cup hat-trick, on his 200th cap;
   equalled Klose's 16 World Cup goals. Subbed off 80' for Nico Paz.
   Sources: FIFA match centre, ESPN (gameId 760433), FotMob, Sofascore,
   Opta/The Analyst, Wikipedia Group J (retrieved 2026-07-07).
   Counts are exact where published. Where sources disagree the consensus is
   used: Algeria shots on target 0 (Opta, Sofascore; FIFA's report said 1);
   xG 1.26/0.32 (ESPN, FotMob; Sofascore 1.23/0.31); completed passes from
   Sofascore (ESPN lists 504/563 accurate). APPROXIMATIONS (not published,
   held plausible + deterministic): per-half xG and shot splits; added time
   (~1'+4', so the plate runs to 94'); individual non-goal shot minutes and
   across-pitch placement are seeded (no location data). No bookings were
   reported in any source consulted → cards left empty. */
window.M1 = {
  home: { id: "arg", name: "argentina", score: 3 },
  away: { id: "alg", name: "argelia", score: 0 },
  aet: false, htScore: [1, 0], ftScore: [3, 0],
  date: "16·06·2026", venue: "arrowhead stadium, kansas city",
  attendance: 69045, competition: "world cup 2026 · grupo j",
  kickoff: "8pm ct", referee: "szymon marciniak",

  goals: [
    { min: 17, team: "arg", player: "messi", assist: "de paul" },       // long-range, top corner
    { min: 60, team: "arg", player: "messi", rebound: "mac allister" }, // tap-in off zidane's parry
    { min: 76, team: "arg", player: "messi", assist: "n. gonzález" },   // curled, bottom corner
  ],
  // 8' — chaïbi's goal disallowed for offside: algeria's one high moment
  disallowed: [{ min: 8, team: "alg", player: "chaïbi" }],
  cards: [],                    // no bookings reported (messi unpunished 32')
  breaks: [],
  periods: [45, 90],            // ht, ft — no extra time
  totalMin: 94,                 // 90' + stoppage (added time approximated)

  possession: { arg: 48, alg: 52 },   // algeria held the ball; argentina held the game
  xg: { arg: 1.26, alg: 0.32 },
  // per phase [1H, 2H] — split approximated (totals exact)
  xgPhase: { arg: [0.42, 0.84], alg: [0.15, 0.17] },
  shots: { arg: 10, alg: 7 },
  shotsPhase: { arg: [4, 6], alg: [3, 4] },   // split approximated (totals exact)
  onTarget: { arg: 6, alg: 0 },       // algeria's first-ever WC match without one
  passes: { arg: 561, alg: 607 },     // completed (sofascore)
  fouls: { arg: 13, alg: 8 },
  saves: { arg: 0, alg: 3 },          // e. martínez untroubled · zidane 3
  tackles: { arg: 24, alg: 16 },
  interceptions: { arg: 12, alg: 8 },
  boxTouches: { arg: 12, alg: 14 },
  bigChances: { arg: 2, alg: 0 },

  messi: { shots: 6, onTarget: 4, goals: 3, chancesCreated: 2, caps: 200, off: 80 },

  xi: {
    arg: ["e. martínez", "montiel", "romero", "li. martínez", "medina", "de paul",
          "mac allister", "e. fernández", "almada", "messi", "lautaro"],
    alg: ["zidane", "mandi", "bensebaini", "aït-nouri", "belghali", "boudaoui",
          "maza", "bentaleb", "hadj moussa", "chaïbi", "gouiri"],
  },

  // shared palette — hand-tuned inks, not screen colors
  ink: {
    arg: "#6cabd6", argDeep: "#2b6a99",
    alg: "#4c9a63", algDeep: "#2f6b44",
    gold: "#e9b32a", paper: "#e9e3d5", night: "#0a0a0c",
  },

  // the frame line
  frameData: "argentina 3–0 argelia<br>world cup 2026 · kansas city · 16·06",
};
