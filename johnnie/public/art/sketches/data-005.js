/* data-005.js — Argentina 3–2 Egypt · the remontada
   FIFA World Cup 2026, Round of 16 · Atlanta Stadium (Mercedes-Benz),
   Atlanta · 7 July 2026, kickoff 12:00 ET · attendance 68,239 · referee
   François Letexier (FRA). Egypt led 0–2: Yasser Ibrahim 15' (header,
   Marwan Attia cross after a corner) and Mostafa Zico 67' (on the break,
   assist Haissem Hassan; Salah in the buildup). Messi's 21' penalty was
   saved by Shobeir (won off Hassan's foul on Tagliafico) — his second
   miss of this World Cup, the first player ever with two in normal time
   in one edition — and his 31' free kick hit the left post. Zico had a
   58' goal disallowed by VAR for Attia's foul on Lisandro Martínez
   (confirmed 59'). Then the final quarter-hour: Cristian Romero 79'
   (header, Messi cross), Messi 83' (left-foot first-time, in off the
   underside of the crossbar, assist Montiel), Enzo Fernández 90+2'
   (header, Lautaro Martínez cross — reported as the 3,000th goal in
   World Cup history). Half ended 45+7; full time at 90+12 (7 announced,
   12 played). Argentina face Switzerland or Colombia.
   Sources, retrieved 2026-07-07: FIFA match centre 400021528, ESPN/Opta
   match page + commentary (gameId 760509), Sofascore/SI, NBC, Fox, beIN,
   VAVEL and Yahoo live blogs. Counts are exact per ESPN/FIFA.
   APPROXIMATIONS + USAGE (deliberate, documented): xG 2.80–0.98 is
   single-source (Sofascore via SI) and held approximate; the Egypt bench
   staffer's 21'/90+4' cards are single-source and omitted. The piece
   (005 · embate) is a two-front fluid collision driven by this file:
   goal minutes shove the interface (Egypt's ochre presses down early and
   long, Argentina's celeste answers late), the 21' saved penalty is a
   thrust that dies against the line, the 58' VAR goal a surge pulled
   back, the 90+2' winner the breakthrough, and the 90+12 whistle the
   release before the fronts regather — one match per ~40 s cycle,
   continuous, no seam. Cards, attendance and the remaining counts are
   archived here for the record and are not all drawn. */
window.M5 = {
  home: { id: "arg", name: "argentina", score: 3 },
  away: { id: "egy", name: "egipto", score: 2 },
  aet: false, htScore: [0, 1],
  date: "07·07·2026", venue: "atlanta stadium, atlanta",
  kickoff: "12:00 et", attendance: 68239, referee: "françois letexier",
  competition: "mundial 2026 · octavos de final",

  goals: [
    { min: 15, team: "egy", player: "y. ibrahim",   assist: "m. attia",    how: "header, off a corner" },
    { min: 67, team: "egy", player: "m. zico",      assist: "h. hassan",   how: "on the break", note: "salah in the buildup" },
    { min: 79, team: "arg", player: "c. romero",    assist: "messi",       how: "header" },
    { min: 83, team: "arg", player: "messi",        assist: "montiel",     how: "left-foot first-time, in off the crossbar" },
    { min: 92, team: "arg", player: "e. fernández", assist: "l. martínez", how: "header", label: "90+2", note: "3,000th world cup goal" },
  ],
  // the thrust that dies against the line
  penaltyMissed: { min: 21, team: "arg", player: "messi", gk: "shobeir", how: "saved bottom-right" },
  // the surge pulled back
  disallowed: [{ min: 58, team: "egy", player: "m. zico", reason: "var — foul by m. attia on li. martínez", confirmed: 59 }],
  woodwork: [{ min: 31, team: "arg", player: "messi", how: "free kick, left post", marked: false }],

  cards: [
    { min: 93,  team: "egy", player: "shobeir",   label: "90+3" },
    { min: 94,  team: "egy", player: "h. fathy",  label: "90+4" },
    { min: 98,  team: "egy", player: "m. attia",  label: "90+8" },
    { min: 102, team: "egy", player: "h. hassan", label: "90+12" },
  ],
  breaks: [23, 71],            // drinks
  periods: [45, 90],
  stoppage: { announced: 7, played: 12, firstHalf: 7 },
  totalMin: 102,               // 90' + 12 of stoppage

  possession: { arg: 63.6, egy: 36.4 },
  shots: { arg: 19, egy: 5 },
  onTarget: { arg: 7, egy: 2 },
  corners: { arg: 6, egy: 1 },
  fouls: { arg: 13, egy: 11 },
  offsides: { arg: 3, egy: 0 },
  xg: { arg: 2.80, egy: 0.98, approx: true },   // single-source (sofascore/si)

  messi: { tournamentGoals: 8, topScorer: true, penaltiesMissedThisWC: 2 },

  // hand-tuned inks — the egypt family is a pharaonic red ochre, no cartoon red
  ink: {
    arg: "#6cabd6", argDeep: "#3274a4",
    egy: "#a2492a", egyDeep: "#933c1d",
    gold: "#e9b32a", text: "#433d34",
    paper: "#e9e3d5", night: "#0a0a0c",
  },
};
