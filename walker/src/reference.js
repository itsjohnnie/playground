// Reference sagittal joint angles for unimpaired adult walking at a natural
// cadence, over one gait cycle from heel strike (0%) to the next (100%).
// Approximated from the classic normative curves (Winter 1991; Perry 1992).
// Hip here is the thigh's angle from vertical (+ forward), which is what a
// viewer reads, rather than the anatomical angle to a tilted pelvis.
//
//   index i  ↔  i·5 %  of the cycle

export const REF = {
  hip:   [25, 24, 21, 17, 12, 7, 3, -1, -5, -9, -13, -15, -12, -5, 4, 12, 19, 24, 27, 27, 25],
  knee:  [4, 11, 17, 19, 17, 13, 9, 6, 5, 6, 10, 20, 34, 49, 59, 60, 53, 38, 21, 8, 4],
  ankle: [0, -4, -5, -2, 2, 5, 7, 9, 10, 10, 7, -3, -14, -18, -12, -7, -3, -1, 0, 0, 0],
};

export function refAt(joint, pct) {
  const a = REF[joint];
  const x = ((pct % 100) + 100) % 100 / 5;
  const i = Math.floor(x);
  const t = x - i;
  return a[i] + (a[Math.min(i + 1, a.length - 1)] - a[i]) * t;
}
