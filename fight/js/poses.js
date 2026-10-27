// Pose library + move timelines. Angles are degrees, [x, y, z] per joint.
// Fighters face +z. L joints sit on +x. Shoulder x = -90 points the arm
// forward, hip x = -90 kicks forward, knee x > 0 bends back.

export const JOINTS = ['spine', 'neck', 'shL', 'elL', 'shR', 'elR', 'hipL', 'knL', 'hipR', 'knR', 'ftL', 'ftR'];

const REST = {
  rootY: 0, rootFwd: 0, rootSide: 0, root: [0, 0, 0],
  spine: [0, 0, 0], neck: [0, 0, 0],
  shL: [0, 0, 10], elL: [-10, 0, 0], shR: [0, 0, -10], elR: [-10, 0, 0],
  hipL: [0, 0, 3], knL: [0, 0, 0], hipR: [0, 0, -3], knR: [0, 0, 0], ftL: [0, 0, 0], ftR: [0, 0, 0],
};
const P = (o) => ({ ...REST, ...o });

const GUARD_ARMS = { shL: [-48, 0, 22], elL: [-105, 0, -10], shR: [-34, 0, -26], elR: [-112, 0, 10] };
const GUARD_LEGS = { hipL: [-22, 0, 8], knL: [32, 0, 0], ftL: [-10, 0, 0], hipR: [12, 0, -8], knR: [22, 0, 0], ftR: [-12, 0, 0] };

export const POSES = {
  rest: P({}),
  stand: P({ shL: [5, 0, 12], shR: [5, 0, -12], elL: [-15, 0, 0], elR: [-15, 0, 0] }),
  guard: P({ rootY: -0.06, spine: [8, -8, 0], neck: [-6, 8, 0], ...GUARD_ARMS, ...GUARD_LEGS }),
  guard2: P({ rootY: -0.08, spine: [11, -8, 0], neck: [-8, 8, 0], ...GUARD_ARMS, shL: [-44, 0, 24], shR: [-30, 0, -28], ...GUARD_LEGS, knL: [36, 0, 0], knR: [26, 0, 0] }),
  walk1: P({ rootY: -0.05, spine: [10, -6, 0], ...GUARD_ARMS, hipL: [-32, 0, 4], knL: [12, 0, 0], hipR: [24, 0, -4], knR: [34, 0, 0] }),
  walk2: P({ rootY: -0.02, spine: [10, 0, 0], ...GUARD_ARMS, hipL: [-4, 0, 4], knL: [44, 0, 0], hipR: [0, 0, -4], knR: [8, 0, 0] }),
  walk3: P({ rootY: -0.05, spine: [10, 6, 0], ...GUARD_ARMS, hipR: [-32, 0, -4], knR: [12, 0, 0], hipL: [24, 0, 4], knL: [34, 0, 0] }),
  walk4: P({ rootY: -0.02, spine: [10, 0, 0], ...GUARD_ARMS, hipR: [-4, 0, -4], knR: [44, 0, 0], hipL: [0, 0, 4], knL: [8, 0, 0] }),
  run1: P({ rootY: -0.04, spine: [24, 0, 0], neck: [-14, 0, 0], shL: [40, 0, 14], elL: [-90, 0, 0], shR: [-65, 0, -14], elR: [-95, 0, 0], hipL: [-55, 0, 4], knL: [30, 0, 0], hipR: [35, 0, -4], knR: [70, 0, 0] }),
  run2: P({ rootY: 0.04, spine: [24, 0, 0], neck: [-14, 0, 0], shL: [-10, 0, 14], elL: [-90, 0, 0], shR: [-10, 0, -14], elR: [-95, 0, 0], hipL: [-10, 0, 4], knL: [80, 0, 0], hipR: [10, 0, -4], knR: [20, 0, 0] }),
  run3: P({ rootY: -0.04, spine: [24, 0, 0], neck: [-14, 0, 0], shR: [40, 0, -14], elR: [-90, 0, 0], shL: [-65, 0, 14], elL: [-95, 0, 0], hipR: [-55, 0, -4], knR: [30, 0, 0], hipL: [35, 0, 4], knL: [70, 0, 0] }),
  run4: P({ rootY: 0.04, spine: [24, 0, 0], neck: [-14, 0, 0], shL: [-10, 0, 14], elL: [-90, 0, 0], shR: [-10, 0, -14], elR: [-95, 0, 0], hipR: [-10, 0, -4], knR: [80, 0, 0], hipL: [10, 0, 4], knL: [20, 0, 0] }),

  jabWind: P({ rootY: -0.07, spine: [10, 8, 0], ...GUARD_ARMS, shL: [-40, 0, 30], elL: [-120, 0, 0], ...GUARD_LEGS }),
  jab: P({ rootY: -0.07, rootFwd: 0.06, spine: [14, -26, 0], neck: [-8, 20, 0], ...GUARD_ARMS, shL: [-96, 0, 4], elL: [-4, 0, 0], ...GUARD_LEGS, hipL: [-30, 0, 8], knL: [26, 0, 0] }),
  crossWind: P({ rootY: -0.07, spine: [8, -18, 0], ...GUARD_ARMS, shR: [-20, 0, -30], elR: [-120, 0, 0], ...GUARD_LEGS }),
  cross: P({ rootY: -0.07, rootFwd: 0.1, spine: [16, 30, 0], neck: [-8, -24, 0], ...GUARD_ARMS, shR: [-98, 0, -4], elR: [-4, 0, 0], shL: [-30, 0, 30], ...GUARD_LEGS, hipR: [-10, 0, -8] }),
  upperWind: P({ rootY: -0.2, spine: [26, 10, 0], ...GUARD_ARMS, shL: [-10, 0, 14], elL: [-120, 0, 0], hipL: [-50, 0, 8], knL: [70, 0, 0], hipR: [-10, 0, -8], knR: [60, 0, 0] }),
  upper: P({ rootY: 0.04, rootFwd: 0.08, spine: [-14, -24, 0], neck: [-14, 10, 0], shL: [-168, 0, 4], elL: [-40, 0, 0], shR: [-30, 0, -26], elR: [-110, 0, 0], hipL: [-10, 0, 8], knL: [10, 0, 0], hipR: [10, 0, -8], knR: [10, 0, 0], ftR: [30, 0, 0] }),
  kickChamber: P({ rootY: -0.02, spine: [-4, 0, 0], shL: [-20, 0, 42], elL: [-60, 0, 0], shR: [-20, 0, -42], elR: [-60, 0, 0], hipL: [0, 0, 6], knL: [14, 0, 0], hipR: [-78, 0, 0], knR: [92, 0, 0] }),
  kick: P({ rootY: -0.03, rootFwd: 0.1, spine: [-22, 0, 0], neck: [12, 0, 0], shL: [-10, 0, 52], elL: [-40, 0, 0], shR: [-10, 0, -52], elR: [-40, 0, 0], hipL: [8, 0, 6], knL: [16, 0, 0], hipR: [-102, 0, 0], knR: [4, 0, 0], ftR: [30, 0, 0] }),
  stompUp: P({ rootY: -0.04, spine: [24, 0, 0], neck: [20, 0, 0], shL: [-20, 0, 40], shR: [-20, 0, -40], hipR: [-62, 0, 0], knR: [80, 0, 0], knL: [14, 0, 0] }),
  stomp: P({ rootY: -0.1, spine: [30, 0, 0], neck: [24, 0, 0], shL: [10, 0, 50], shR: [10, 0, -50], hipR: [-30, 0, 0], knR: [26, 0, 0], knL: [26, 0, 0], hipL: [10, 0, 0] }),

  hit1: P({ rootY: -0.06, rootFwd: -0.06, spine: [-22, 12, 4], neck: [-28, 0, 12], shL: [-30, 0, 48], elL: [-40, 0, 0], shR: [-26, 0, -44], elR: [-40, 0, 0], hipL: [-12, 0, 6], knL: [24, 0, 0], hipR: [8, 0, -6], knR: [22, 0, 0] }),
  hit2: P({ rootY: -0.07, rootFwd: -0.08, spine: [-28, -14, -6], neck: [-30, 0, -14], shL: [-40, 0, 60], elL: [-60, 0, 0], shR: [-50, 0, -60], elR: [-20, 0, 0], hipL: [-4, 0, 6], knL: [30, 0, 0], hipR: [0, 0, -6], knR: [30, 0, 0] }),
  gut: P({ rootY: -0.12, spine: [42, 0, 0], neck: [-20, 0, 0], shL: [-60, 0, 10], elL: [-80, 0, 0], shR: [-60, 0, -10], elR: [-80, 0, 0], hipL: [-24, 0, 6], knL: [40, 0, 0], hipR: [-24, 0, -6], knR: [40, 0, 0] }),
  fly: P({ root: [-50, 0, 0], rootY: -0.1, spine: [-20, 0, 0], neck: [-30, 0, 0], shL: [-150, 0, 40], elL: [-30, 0, 0], shR: [-150, 0, -40], elR: [-30, 0, 0], hipL: [-50, 0, 10], knL: [40, 0, 0], hipR: [-30, 0, -10], knR: [60, 0, 0] }),
  down: P({ root: [-90, 0, 0], rootY: -0.74, spine: [4, 0, 0], neck: [12, 0, 0], shL: [-20, 0, 70], elL: [-30, 0, 0], shR: [-10, 0, -80], elR: [-20, 0, 0], hipL: [6, 0, 14], knL: [10, 0, 0], hipR: [0, 0, -16], knR: [30, 0, 0] }),
  down2: P({ root: [-90, 0, 0], rootY: -0.74, spine: [8, 0, 4], neck: [20, -20, 0], shL: [-40, 0, 50], elL: [-60, 0, 0], shR: [-10, 0, -90], elR: [-20, 0, 0], hipL: [-20, 0, 14], knL: [40, 0, 0], hipR: [0, 0, -16], knR: [10, 0, 0] }),
  sit: P({ root: [-15, 0, 0], rootY: -0.62, spine: [20, 0, 0], neck: [10, 0, 0], shL: [30, 0, 30], elL: [-10, 0, 0], shR: [30, 0, -30], elR: [-10, 0, 0], hipL: [-80, 0, 10], knL: [30, 0, 0], hipR: [-80, 0, -10], knR: [60, 0, 0] }),
  crouch: P({ rootY: -0.36, spine: [34, 0, 0], neck: [-24, 0, 0], shL: [-40, 0, 20], elL: [-40, 0, 0], shR: [-40, 0, -20], elR: [-40, 0, 0], hipL: [-80, 0, 10], knL: [110, 0, 0], hipR: [-40, 0, -10], knR: [80, 0, 0] }),
  block: P({ rootY: -0.1, spine: [18, 0, 0], neck: [18, 0, 0], shL: [-72, 0, -18], elL: [-122, 0, -20], shR: [-72, 0, 18], elR: [-122, 0, 20], ...GUARD_LEGS, knL: [40, 0, 0], knR: [30, 0, 0] }),

  reach: P({ rootY: -0.06, rootFwd: 0.12, spine: [18, 0, 0], neck: [-14, 0, 0], shL: [-88, 0, -6], elL: [-12, 0, 0], shR: [-88, 0, 6], elR: [-12, 0, 0], ...GUARD_LEGS }),
  hold: P({ rootY: -0.06, spine: [10, 0, 0], neck: [-6, 0, 0], shL: [-74, 0, -16], elL: [-58, 0, -20], shR: [-74, 0, 16], elR: [-58, 0, 20], ...GUARD_LEGS }),
  held: P({ rootY: -0.04, spine: [-8, 0, 0], neck: [-14, 0, 0], shL: [-26, 0, 22], elL: [-40, 0, 0], shR: [-20, 0, -26], elR: [-50, 0, 0], hipL: [-6, 0, 4], knL: [14, 0, 0], hipR: [6, 0, -4], knR: [10, 0, 0] }),
  headbuttWind: P({ rootY: -0.06, rootFwd: -0.06, spine: [-18, 0, 0], neck: [-30, 0, 0], shL: [-74, 0, -16], elL: [-58, 0, -20], shR: [-74, 0, 16], elR: [-58, 0, 20], ...GUARD_LEGS }),
  headbutt: P({ rootY: -0.08, rootFwd: 0.1, spine: [30, 0, 0], neck: [28, 0, 0], shL: [-74, 0, -16], elL: [-58, 0, -20], shR: [-74, 0, 16], elR: [-58, 0, 20], ...GUARD_LEGS }),
  lift: P({ rootY: -0.08, spine: [-12, 0, 0], neck: [-24, 0, 0], shL: [-176, 0, -6], elL: [-24, 0, 0], shR: [-176, 0, 6], elR: [-24, 0, 0], hipL: [-20, 0, 12], knL: [30, 0, 0], hipR: [-20, 0, -12], knR: [30, 0, 0] }),
  slam: P({ rootY: -0.28, rootFwd: 0.1, spine: [44, 0, 0], neck: [10, 0, 0], shL: [-104, 0, -6], elL: [-14, 0, 0], shR: [-104, 0, 6], elR: [-14, 0, 0], hipL: [-60, 0, 12], knL: [80, 0, 0], hipR: [-30, 0, -12], knR: [70, 0, 0] }),
  carried: P({ spine: [0, 0, 0], neck: [0, 0, 0], shL: [-160, 0, 40], elL: [-30, 0, 0], shR: [-150, 0, -40], elR: [-40, 0, 0], hipL: [-10, 0, 20], knL: [30, 0, 0], hipR: [0, 0, -20], knR: [50, 0, 0] }),
  whip: P({ rootY: -0.06, spine: [16, -40, 0], neck: [0, 30, 0], shL: [-60, 0, 30], elL: [-40, 0, 0], shR: [-90, 0, -60], elR: [-6, 0, 0], ...GUARD_LEGS }),
  clothes: P({ rootY: -0.06, spine: [14, -10, 0], neck: [-14, 0, 0], shL: [-50, 0, 20], elL: [-90, 0, 0], shR: [-6, 0, -92], elR: [-6, 0, 0], hipL: [-40, 0, 6], knL: [30, 0, 0], hipR: [20, 0, -6], knR: [50, 0, 0] }),
  dropkick: P({ root: [-62, 0, 0], rootY: 0.1, spine: [10, 0, 0], neck: [20, 0, 0], shL: [-40, 0, 70], elL: [-20, 0, 0], shR: [-40, 0, -70], elR: [-20, 0, 0], hipL: [-96, 0, 6], knL: [6, 0, 0], hipR: [-96, 0, -6], knR: [6, 0, 0], ftL: [30, 0, 0], ftR: [30, 0, 0] }),

  flex: P({ rootY: -0.03, spine: [-6, 0, 0], neck: [-14, 0, 0], shL: [0, 0, 86], elL: [0, 0, 98], shR: [0, 0, -86], elR: [0, 0, -98], hipL: [0, 0, 12], hipR: [0, 0, -12] }),
  flex2: P({ rootY: -0.1, spine: [14, 0, 0], neck: [-24, 0, 0], shL: [-30, 0, 50], elL: [-90, 0, -40], shR: [-30, 0, -50], elR: [-90, 0, 40], hipL: [-10, 0, 14], knL: [20, 0, 0], hipR: [-10, 0, -14], knR: [20, 0, 0] }),
  point: P({ spine: [0, 16, 0], neck: [-6, -10, 0], shR: [-92, 0, 0], elR: [-4, 0, 0], shL: [8, 0, 38], elL: [0, 0, -108], hipL: [0, 0, 8], hipR: [0, 0, -4], knL: [10, 0, 0] }),
  raise: P({ spine: [-10, 0, 0], neck: [-26, 0, 0], shL: [-172, 0, 24], elL: [-20, 0, 0], shR: [-172, 0, -24], elR: [-20, 0, 0], hipL: [0, 0, 10], hipR: [0, 0, -10] }),
  raise2: P({ rootY: 0.03, spine: [-14, 0, 0], neck: [-30, 0, 0], shL: [-150, 0, 40], elL: [-60, 0, 0], shR: [-150, 0, -40], elR: [-60, 0, 0], hipL: [0, 0, 10], hipR: [0, 0, -10] }),
  hips1: P({ rootSide: 0.07, root: [0, 0, 8], spine: [0, 0, -14], neck: [0, 0, 10], shL: [8, 0, 38], elL: [0, 0, -108], shR: [-150, 0, -30], elR: [-80, 0, 0], hipL: [0, 0, 2], hipR: [0, 0, -14] }),
  hips2: P({ rootSide: -0.07, root: [0, 0, -8], spine: [0, 0, 14], neck: [0, 0, -10], shL: [8, 0, 38], elL: [0, 0, -108], shR: [-150, 0, -30], elR: [-60, 0, 0], hipL: [0, 0, 14], hipR: [0, 0, -2] }),
  horns: P({ rootY: -0.12, spine: [20, 0, 0], neck: [30, 0, 0], shR: [-160, 0, -10], elR: [-20, 0, 0], shL: [-40, 0, 20], elL: [-90, 0, 0], hipL: [-20, 0, 14], knL: [30, 0, 0], hipR: [-10, 0, -14], knR: [30, 0, 0] }),
  horns2: P({ rootY: -0.06, spine: [-24, 0, 0], neck: [-40, 0, 0], shR: [-170, 0, -10], elR: [-10, 0, 0], shL: [-40, 0, 20], elL: [-90, 0, 0], hipL: [-20, 0, 14], knL: [30, 0, 0], hipR: [-10, 0, -14], knR: [30, 0, 0] }),
  bow: P({ spine: [56, 0, 0], neck: [-10, 0, 0], shL: [-20, 0, 10], elL: [-80, 0, 0], shR: [30, 0, -10], elR: [-30, 0, 0] }),
  hair: P({ spine: [-4, 0, -6], neck: [-14, 0, -14], shR: [-150, 0, -40], elR: [-140, 0, 0], shL: [8, 0, 38], elL: [0, 0, -108], hipR: [0, 0, -12], knL: [16, 0, 0] }),
  phone: P({ spine: [10, 0, 0], neck: [30, 0, 0], shR: [-50, 0, -10], elR: [-110, 0, 20], shL: [-50, 0, 10], elL: [-110, 0, -20] }),
  pound1: P({ rootY: -0.06, spine: [-12, 0, 0], neck: [-30, 0, 0], shL: [-90, 0, -20], elL: [-130, 0, -20], shR: [-90, 0, 20], elR: [-130, 0, 20], hipL: [-10, 0, 14], knL: [20, 0, 0], hipR: [-10, 0, -14], knR: [20, 0, 0] }),
  pound2: P({ rootY: -0.06, spine: [-12, 0, 0], neck: [-30, 0, 0], shL: [-60, 0, 0], elL: [-120, 0, -30], shR: [-60, 0, 0], elR: [-120, 0, 30], hipL: [-10, 0, 14], knL: [20, 0, 0], hipR: [-10, 0, -14], knR: [20, 0, 0] }),

  dizzy1: P({ rootY: -0.06, root: [0, 0, 6], spine: [10, 0, 10], neck: [10, 0, 18], shL: [-6, 0, 18], elL: [-20, 0, 0], shR: [-4, 0, -16], elR: [-20, 0, 0], hipL: [-6, 0, 8], knL: [24, 0, 0], hipR: [0, 0, -4], knR: [18, 0, 0] }),
  dizzy2: P({ rootY: -0.07, root: [0, 0, -6], spine: [12, 0, -10], neck: [12, 0, -18], shL: [-6, 0, 14], elL: [-20, 0, 0], shR: [-4, 0, -20], elR: [-20, 0, 0], hipL: [0, 0, 4], knL: [18, 0, 0], hipR: [-6, 0, -8], knR: [24, 0, 0] }),
  duck: P({ rootY: -0.4, spine: [56, 0, 0], neck: [-40, 0, 0], shL: [-60, 0, 20], elL: [-60, 0, 0], shR: [-60, 0, -20], elR: [-60, 0, 0], hipL: [-80, 0, 10], knL: [110, 0, 0], hipR: [-30, 0, -10], knR: [90, 0, 0] }),
  perch: P({ rootY: -0.02, spine: [-8, 0, 0], neck: [-20, 0, 0], shL: [-160, 0, 34], elL: [-20, 0, 0], shR: [-160, 0, -34], elR: [-20, 0, 0], hipL: [-20, 0, 18], knL: [30, 0, 0], hipR: [-20, 0, -18], knR: [30, 0, 0] }),
  perch2: P({ rootY: -0.06, spine: [-14, 0, 0], neck: [-30, 0, 0], shL: [-140, 0, 50], elL: [-60, 0, 0], shR: [-140, 0, -50], elR: [-60, 0, 0], hipL: [-26, 0, 18], knL: [40, 0, 0], hipR: [-26, 0, -18], knR: [40, 0, 0] }),
  dive: P({ root: [76, 0, 0], spine: [-20, 0, 0], neck: [-40, 0, 0], shL: [-178, 0, 18], elL: [-6, 0, 0], shR: [-178, 0, -18], elR: [-6, 0, 0], hipL: [10, 0, 8], knL: [20, 0, 0], hipR: [10, 0, -8], knR: [20, 0, 0] }),
  pin: P({ root: [86, 0, 0], rootY: -0.62, spine: [10, 0, 0], neck: [-30, 0, 0], shL: [-60, 0, 40], elL: [-30, 0, 0], shR: [-60, 0, -40], elR: [-30, 0, 0], hipL: [-20, 0, 20], knL: [40, 0, 0], hipR: [-20, 0, -20], knR: [40, 0, 0] }),

  scream: P({ rootY: -0.1, spine: [-14, 0, 0], neck: [-26, 0, 0], shL: [30, 0, 60], elL: [-20, 0, 0], shR: [30, 0, -60], elR: [-20, 0, 0], hipL: [-30, 0, 16], knL: [40, 0, 0], hipR: [10, 0, -16], knR: [30, 0, 0] }),
  screamWind: P({ rootY: -0.1, spine: [30, 0, 0], neck: [20, 0, 0], shL: [-40, 0, 10], elL: [-120, 0, 0], shR: [-40, 0, -10], elR: [-120, 0, 0], hipL: [-30, 0, 16], knL: [40, 0, 0], hipR: [10, 0, -16], knR: [30, 0, 0] }),
  spin: P({ rootY: -0.04, spine: [0, 0, 0], neck: [-10, 0, 0], shL: [-10, 0, 92], elL: [-4, 0, 0], shR: [-10, 0, -92], elR: [-4, 0, 0], hipL: [-10, 0, 10], knL: [20, 0, 0], hipR: [0, 0, -10], knR: [10, 0, 0] }),
  charge: P({ rootY: -0.14, rootFwd: 0.1, spine: [48, -16, 0], neck: [-40, 0, 0], shL: [-50, 0, -10], elL: [-110, 0, 0], shR: [10, 0, -30], elR: [-60, 0, 0], hipL: [-60, 0, 6], knL: [40, 0, 0], hipR: [30, 0, -6], knR: [40, 0, 0] }),
  throwWind: P({ rootY: -0.04, spine: [-16, 20, 0], neck: [-6, -20, 0], shR: [-170, 0, -14], elR: [-90, 0, 0], shL: [-60, 0, 30], elL: [-30, 0, 0], hipL: [-20, 0, 8], knL: [20, 0, 0], hipR: [14, 0, -8], knR: [10, 0, 0] }),
  throwRel: P({ rootY: -0.08, rootFwd: 0.08, spine: [26, -24, 0], neck: [-24, 20, 0], shR: [-84, 0, -4], elR: [-4, 0, 0], shL: [-10, 0, 40], elL: [-30, 0, 0], hipL: [-36, 0, 8], knL: [30, 0, 0], hipR: [20, 0, -8], knR: [20, 0, 0] }),
  slapR: P({ rootY: -0.06, rootFwd: 0.06, spine: [10, 30, 0], neck: [-6, -20, 0], shR: [-86, -10, -40], elR: [-6, 0, 0], shL: [-40, 0, 30], elL: [-90, 0, 0], ...GUARD_LEGS }),
  slapL: P({ rootY: -0.06, rootFwd: 0.06, spine: [10, -30, 0], neck: [-6, 20, 0], shL: [-86, 10, 40], elL: [-6, 0, 0], shR: [-40, 0, -30], elR: [-90, 0, 0], ...GUARD_LEGS }),
  swingUp: P({ rootY: -0.04, spine: [-14, 10, 0], neck: [-10, 0, 0], shR: [-176, 0, -16], elR: [-50, 0, 0], shL: [-170, 0, 16], elL: [-50, 0, 0], hipL: [-24, 0, 8], knL: [24, 0, 0], hipR: [14, 0, -8], knR: [14, 0, 0] }),
  swingDown: P({ rootY: -0.14, rootFwd: 0.1, spine: [36, -6, 0], neck: [10, 0, 0], shR: [-70, 0, -6], elR: [-6, 0, 0], shL: [-66, 0, 6], elL: [-6, 0, 0], hipL: [-50, 0, 8], knL: [60, 0, 0], hipR: [10, 0, -8], knR: [30, 0, 0] }),
  pickup: P({ rootY: -0.38, spine: [50, 0, 0], neck: [-20, 0, 0], shR: [-80, 0, -10], elR: [-10, 0, 0], shL: [-50, 0, 20], elL: [-40, 0, 0], hipL: [-80, 0, 10], knL: [110, 0, 0], hipR: [-40, 0, -10], knR: [80, 0, 0] }),
  holdWeapon: P({ rootY: -0.06, spine: [8, -8, 0], neck: [-6, 8, 0], shR: [-60, 0, -20], elR: [-70, 0, 0], shL: [-48, 0, 22], elL: [-105, 0, -10], ...GUARD_LEGS }),
  tpose: P({ shL: [0, 0, 90], shR: [0, 0, -90], elL: [0, 0, 0], elR: [0, 0, 0] }),
  pretzel: P({ root: [-90, 0, 0], rootY: -0.74, spine: [70, 80, 60], neck: [90, 120, 0], shL: [-180, 90, 160], elL: [-160, 0, 90], shR: [-200, -90, -160], elR: [-170, 0, -90], hipL: [-170, 40, 90], knL: [170, 0, 0], hipR: [-160, -40, -90], knR: [170, 0, 0] }),
  count1: P({ rootY: -0.5, spine: [40, 0, 0], neck: [-30, 0, 0], shR: [-100, 0, -10], elR: [-20, 0, 0], shL: [-20, 0, 30], elL: [-60, 0, 0], hipL: [-100, 0, 10], knL: [100, 0, 0], hipR: [0, 0, -10], knR: [110, 0, 0], ftR: [60, 0, 0] }),
  count2: P({ rootY: -0.52, spine: [50, 0, 0], neck: [-20, 0, 0], shR: [-30, 0, -10], elR: [-10, 0, 0], shL: [-20, 0, 30], elL: [-60, 0, 0], hipL: [-100, 0, 10], knL: [100, 0, 0], hipR: [0, 0, -10], knR: [110, 0, 0], ftR: [60, 0, 0] }),
  sitChair: P({ rootY: -0.42, spine: [4, 0, 0], shL: [-50, 0, 10], elL: [-60, 0, 0], shR: [-50, 0, -10], elR: [-60, 0, 0], hipL: [-90, 0, 6], knL: [90, 0, 0], hipR: [-90, 0, -6], knR: [90, 0, 0] }),
  talk1: P({ rootY: -0.42, spine: [4, 6, 0], neck: [-6, -8, 0], shL: [-60, 0, 10], elL: [-70, 0, 0], shR: [-80, 0, -20], elR: [-90, 0, 0], hipL: [-90, 0, 6], knL: [90, 0, 0], hipR: [-90, 0, -6], knR: [90, 0, 0] }),
  talk2: P({ rootY: -0.42, spine: [8, -6, 0], neck: [-2, 8, 0], shL: [-60, 0, 10], elL: [-70, 0, 0], shR: [-60, 0, -40], elR: [-120, 0, 0], hipL: [-90, 0, 6], knL: [90, 0, 0], hipR: [-90, 0, -6], knR: [90, 0, 0] }),
  cheer: P({ rootY: -0.3, spine: [-10, 0, 0], neck: [-20, 0, 0], shL: [-170, 0, 30], elL: [-20, 0, 0], shR: [-170, 0, -30], elR: [-20, 0, 0], hipL: [-90, 0, 6], knL: [90, 0, 0], hipR: [-90, 0, -6], knR: [90, 0, 0] }),
  refWave: P({ spine: [0, 0, 0], neck: [-10, 0, 0], shL: [0, 0, 100], elL: [0, 0, 0], shR: [0, 0, -100], elR: [0, 0, 0] }),
  refWave2: P({ spine: [0, 0, 0], neck: [-10, 0, 0], shL: [0, 0, 20], elL: [0, 0, 0], shR: [0, 0, -20], elR: [0, 0, 0] }),
  refPoint: P({ neck: [-6, 0, 0], shR: [-96, 0, -2], elR: [0, 0, 0], shL: [8, 0, 38], elL: [0, 0, -108] }),
};

// Hand shapes per pose: [left, right]. Anything unlisted makes fists.
const O = ['open', 'open'], RX = ['relax', 'relax'];
const GRIPS = {
  rest: RX, stand: RX, reach: O, hold: O, held: O, lift: O, slam: O, carried: O, down: O, down2: O, sit: O, fly: O,
  dizzy1: RX, dizzy2: RX, hips1: RX, hips2: ['relax', 'open'], hair: ['relax', 'open'], bow: RX, cheer: O, refWave: O, refWave2: O,
  tpose: O, pickup: ['relax', 'open'], pin: O, count1: ['relax', 'open'], count2: ['relax', 'open'], clothes: ['fist', 'open'], dive: O,
  spin: O, scream: O, screamWind: RX, slapR: ['fist', 'open'], slapL: ['open', 'fist'], whip: ['relax', 'open'], crouch: RX, duck: RX,
  perch: O, perch2: O, talk1: ['relax', 'grip'], talk2: ['open', 'grip'], sitChair: RX, pretzel: O, raise2: O, headbuttWind: O, headbutt: O,
  throwRel: ['relax', 'open'], throwWind: ['relax', 'grip'], kickChamber: RX, kick: RX, hit1: O, hit2: O, gut: RX, point: ['relax', 'point'],
  horns: ['fist', 'horns'], horns2: ['fist', 'horns'], refPoint: ['relax', 'point'], phone: ['grip', 'grip'], holdWeapon: ['fist', 'grip'],
  swingUp: ['grip', 'grip'], swingDown: ['grip', 'grip'], run1: RX, run2: RX, run3: RX, run4: RX, flex: ['fist', 'fist'],
};
for (const [k, v] of Object.entries(POSES)) v.grip = GRIPS[k] || ['fist', 'fist'];

// Timelines: keys = [time, pose]. Hits: window [t0, t1] where contact counts.
// combo: punch pressed during window chains into `next`.
export const MOVES = {
  jab: { dur: 0.32, keys: [[0, 'jabWind'], [0.08, 'jab'], [0.18, 'jab'], [0.32, 'guard']], hit: { t: [0.08, 0.16], dmg: 5, reach: 0.82, r: 0.45, stun: 0.34, push: 0.6, sfx: 'punch', part: 'head' }, combo: { next: 'cross', from: 0.1 }, cancel: 0.22 },
  cross: { dur: 0.36, keys: [[0, 'crossWind'], [0.08, 'cross'], [0.2, 'cross'], [0.36, 'guard']], hit: { t: [0.08, 0.18], dmg: 6, reach: 0.86, r: 0.45, stun: 0.38, push: 0.8, sfx: 'punch', part: 'head' }, combo: { next: 'upper', from: 0.12 }, cancel: 0.24 },
  upper: { dur: 0.6, keys: [[0, 'upperWind'], [0.14, 'upperWind'], [0.22, 'upper'], [0.42, 'upper'], [0.6, 'guard']], hit: { t: [0.2, 0.32], dmg: 10, reach: 0.78, r: 0.5, kd: true, launch: 5.5, push: 2.6, sfx: 'heavy', part: 'head', big: true } },
  kick: { dur: 0.56, keys: [[0, 'kickChamber'], [0.14, 'kickChamber'], [0.22, 'kick'], [0.38, 'kick'], [0.56, 'guard']], hit: { t: [0.2, 0.34], dmg: 9, reach: 1.02, r: 0.5, stun: 0.5, push: 1.6, sfx: 'kick', part: 'body' } },
  stomp: { dur: 0.5, keys: [[0, 'stompUp'], [0.18, 'stompUp'], [0.26, 'stomp'], [0.5, 'guard']], hit: { t: [0.24, 0.34], dmg: 4, reach: 0.65, r: 0.6, low: true, sfx: 'squish', part: 'body' } },
  clothesline: { dur: 0.6, keys: [[0, 'clothes'], [0.45, 'clothes'], [0.6, 'guard']], hit: { t: [0.02, 0.4], dmg: 12, reach: 0.4, r: 0.75, kd: true, launch: 3, push: 2.2, sfx: 'heavy', part: 'head', big: true }, drive: 5.2 },
  dropkick: { dur: 1.1, keys: [[0, 'crouch'], [0.12, 'dropkick'], [0.55, 'dropkick'], [0.68, 'down'], [0.9, 'sit'], [1.1, 'guard']], hit: { t: [0.15, 0.5], dmg: 14, reach: 0.9, r: 0.6, kd: true, launch: 3, push: 3.5, sfx: 'heavy', part: 'body', big: true }, drive: 5, hop: 3.6 },
  whiff: { dur: 0.5, keys: [[0, 'reach'], [0.3, 'reach'], [0.5, 'guard']] },
  pickup: { dur: 0.4, keys: [[0, 'pickup'], [0.25, 'pickup'], [0.4, 'holdWeapon']] },
  wswing: { dur: 0.7, keys: [[0, 'swingUp'], [0.24, 'swingUp'], [0.32, 'swingDown'], [0.5, 'swingDown'], [0.7, 'holdWeapon']], hit: { t: [0.28, 0.42], dmg: 12, reach: 1.1, r: 0.6, kd: true, launch: 3, push: 2.4, sfx: 'weapon', part: 'head', big: true, weapon: true } },
  wthrow: { dur: 0.55, keys: [[0, 'throwWind'], [0.22, 'throwWind'], [0.32, 'throwRel'], [0.55, 'guard']] },
  taunt: { dur: 1.3, keys: null },
  getup: { dur: 0.7, keys: [[0, 'down'], [0.22, 'sit'], [0.45, 'crouch'], [0.7, 'guard']] },
  climbOut: { dur: 0.75, keys: [[0, 'guard'], [0.2, 'duck'], [0.55, 'duck'], [0.75, 'guard']] },
  climbTB: { dur: 0.5, keys: [[0, 'crouch'], [0.25, 'kickChamber'], [0.5, 'perch']] },
  // Specials.
  scream: { dur: 1.0, keys: [[0, 'screamWind'], [0.22, 'screamWind'], [0.3, 'scream'], [0.8, 'scream'], [1.0, 'guard']], expr: 'shock' },
  charge: { dur: 0.95, keys: [[0, 'crouch'], [0.15, 'charge'], [0.75, 'charge'], [0.95, 'guard']], hit: { t: [0.15, 0.72], dmg: 18, reach: 0.6, r: 0.7, kd: true, launch: 4, push: 4.5, sfx: 'heavy', part: 'body', big: true }, drive: 7.5, driveT: [0.15, 0.75] },
  spin: { dur: 1.4, keys: [[0, 'spin'], [1.2, 'spin'], [1.4, 'guard']], multi: { every: 0.24, from: 0.1, to: 1.2, dmg: 5, r: 1.2, last: { kd: true, launch: 3, push: 3 } }, spin: 4 },
  projectile: { dur: 0.6, keys: [[0, 'throwWind'], [0.26, 'throwWind'], [0.34, 'throwRel'], [0.6, 'guard']] },
  slaps: { dur: 1.25, keys: [[0, 'slapR'], [0.15, 'slapL'], [0.3, 'slapR'], [0.45, 'slapL'], [0.6, 'slapR'], [0.75, 'slapL'], [0.95, 'slapR'], [1.25, 'guard']], multi: { every: 0.15, from: 0.08, to: 1.0, dmg: 3.2, r: 1.05, last: { kd: true, launch: 2.5, push: 2.6 } }, drive: 1.6, driveT: [0, 1] },
  pound: { dur: 1.05, keys: [[0, 'crouch'], [0.12, 'swingUp'], [0.45, 'swingUp'], [0.55, 'slam'], [0.85, 'slam'], [1.05, 'guard']], hop: 5 },
};

// Taunt timelines per character style.
export const TAUNTS = {
  flex: ['flex', 'flex2'],
  point: ['point', 'guard'],
  raise: ['raise', 'raise2'],
  hips: ['hips1', 'hips2'],
  horns: ['horns', 'horns2'],
  bow: ['stand', 'bow'],
  hair: ['hair', 'stand'],
  phone: ['phone', 'phone'],
  pound: ['pound1', 'pound2'],
};

export function tauntMove(style) {
  const [a, b] = TAUNTS[style] || TAUNTS.raise;
  return { dur: 1.3, keys: [[0, a], [0.3, b], [0.6, a], [0.9, b], [1.15, a], [1.3, 'guard']] };
}

export function loopKeys(names, step) {
  return names.map((n, i) => [i * step, n]);
}
