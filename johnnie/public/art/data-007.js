/* data-007.js — England 1–2 Argentina
   FIFA World Cup 2026, Semifinal (M102) · Mercedes-Benz Stadium, Atlanta
   Wednesday 15 July 2026, 15:00 EDT. Scoreless and snarling for an hour —
   no shots at all in the first half hour — then Gordon tapped England
   ahead off Rogers' cross, and the night turned in the last five minutes:
   Messi, no goal and both goals, found Enzo Fernández for a rocket from
   range at 85' and crossed for Lautaro's header at 90+2'. A second
   consecutive final; Spain wait at MetLife.
   Sources: FIFA match centre, ESPN, NBC, NPR, Al Jazeera (retrieved
   2026-07-16). Fields not reported by the press are null — never guessed. */
window.M7 = {
  home: { id: "eng", name: "inglaterra", score: 1 },
  away: { id: "arg", name: "argentina", score: 2 },
  aet: false, htScore: [0, 0], ftScore: [1, 2],
  date: "15·07·2026", kickoff: "15:00 edt",
  venue: "estadio mercedes-benz, atlanta",
  attendance: 68239, matchId: "M102",
  competition: "world cup 2026 · semifinal",
  coords: ["33.7554° n", "84.4010° o"],
  referee: "ismail elfath (usa)",   // first american man to referee a wc semifinal

  goals: [
    { min: 55, team: "eng", player: "gordon",       assist: "rogers", note: "tap-in, rogers came on as a sub" },
    { min: 85, team: "arg", player: "e. fernández", assist: "messi",  note: "from outside the box" },
    { min: 92, team: "arg", player: "l. martínez",  assist: "messi",  note: "90+2 header; lautaro was a sub", stoppage: true },
  ],
  cards: [
    // minutes not reported — all three yellows fell before halftime
    { min: null, team: "eng", player: "anderson" },
    { min: null, team: "arg", player: "l. martínez" },
    { min: null, team: "arg", player: "romero" },
  ],
  breaks: [], periods: [45, 90], totalMin: 90,

  possession: { arg: 64, eng: 36 },
  xg: { arg: 0.91, eng: 0.54 },
  // not reported at retrieval time — leave null rather than invent
  shots: null, onTarget: null, passes: null, corners: null, fouls: null, saves: null,
  headToHead: { arg: 2, draw: 1, eng: 3 },   // world cup meetings only, after this (the sixth)

  // starting elevens (per-half mean positions not published — names only)
  xi: {
    eng: ["pickford", "james", "konsa", "guéhi", "o'reilly", "rice",
          "anderson", "saka", "bellingham", "gordon", "kane"],
    arg: ["e. martínez", "molina", "romero", "l. martínez", "tagliafico",
          "de paul", "paredes", "mac allister", "e. fernández", "messi", "álvarez"],
  },
  subsNoted: ["rogers (assist on 55')", "lautaro martínez (goal, 90+2')"],

  // shared palette — press inks, not screen colors
  ink: {
    celeste: "#75aadb", celesteDeep: "#4a86b8",
    rojo: "#d52b1e", rojoDeep: "#a81f15",
    negro: "#221f1a", papel: "#f2efe8",
  },

  frameData: "inglaterra 1–2 argentina<br>world cup 2026 · atlanta · 15·07",
};
