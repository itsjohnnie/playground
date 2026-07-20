/* data-008.js — Spain 1–0 Argentina (a.e.t.)
   FIFA World Cup 2026, Final (M104) · MetLife Stadium, East Rutherford
   Sunday 19 July 2026, 15:00 EDT. Scoreless through ninety; Enzo
   Fernández off at 90+3' (second yellow); Ferran Torres under the
   crossbar at 106'. Emiliano Martínez: eleven saves — the most ever
   recorded in a men's World Cup final. Spain's second title.
   REAL — web-verified (FIFA, ESPN, PBS, NPR, CBS; retrieved
   2026-07-20). Counts are exact; individual shot minutes other than
   the goal are not in the public record and are rendered, not
   reported. */
window.M8 = {
  home: { id: "esp", name: "españa", score: 1 },
  away: { id: "arg", name: "argentina", score: 0 },
  aet: true, htScore: [0, 0], ftScore: [0, 0],
  date: "19·07·2026", kickoff: "15:00 edt",
  venue: "estadio metlife, east rutherford",
  attendance: 80663, matchId: "M104",
  competition: "world cup 2026 · final",
  coords: ["40.8135° n", "74.0745° o"],
  referee: "s. vinčić (esl)",

  goals: [
    { min: 106, team: "esp", player: "f. torres", assist: "n. williams" },
  ],
  reds: [{ min: "90+3", minAbs: 93, team: "arg", player: "e. fernández" }], // second yellow
  periods: [45, 90, 105], totalMin: 120,

  possession: { esp: 65, arg: 35 },
  xg: { esp: 1.94, arg: 0.22 },
  shots: { esp: 20, arg: 2 },
  onTarget: { esp: 12, arg: 0 },
  saves: { arg: 11, esp: 0 },     // e. martínez 11 — record for any men's final
  corners: { esp: 9, arg: 4 },

  ink: { celeste: "#75aadb", rojo: "#d52b1e", bone: "#f2f1ee", negro: "#0d0a07" },
};
