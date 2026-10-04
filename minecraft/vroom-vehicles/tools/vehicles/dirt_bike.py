"""Dirt bike: an orange motocross bike with long-travel suspension.

LUNA is on the front number plate, INDI on both side number boards.
"""
import math

from artkit import (box, mirrored, cylinder, bar, decal, material, paint, mix, rgb, scale,
                    glint, noise)

INFO = {
    "id": "dirt_bike", "name": "Dirt Bike", "kind": "Motocross",
    "group": "Small", "mode": "land", "length": 2,
    "specs": [("Length", "2 blocks"), ("Seats", "2"), ("Suspension", "Extra bouncy"),
              ("Top speed feel", "Zoomy")],
    "seats": [(0, 18.6, 2.5), (0, 18.9, 9.0)],
    "collision": (1.0, 1.4), "health": 8,
    "speed": 0.34, "step": 1.0625,
    "recipe": {"pattern": ["  L", "IRI", "S S"],
               "key": {"L": "minecraft:lever", "I": "minecraft:iron_ingot",
                       "R": "minecraft:redstone", "S": "minecraft:slime_ball"}},
    "recipe_text": "Iron + Redstone + Lever, with Slime Ball springs",
    "spawn_egg": ("#FF8A1E", "#1C1C1E"),
    "anim": [
        {"bone": "body", "type": "turn", "axis": "z", "k": 0.3, "max": 25},
        {"bone": "steer", "type": "turn", "axis": "y", "k": 0.15, "max": 14},
        {"bone": "wheel_f", "type": "roll", "radius": 6.4},
        {"bone": "wheel_r", "type": "roll", "radius": 6.3},
    ],
    "eggs": "LUNA on the front number plate, INDI on the side number boards",
    "egg_cam": {"eye": [-30, 22, -34], "at": [0, 14, -4]},
}

# --- geometry -------------------------------------------------------------------
FA = (6.4, -14.0)            # front axle (y, z)
RA = (6.3, 13.0)             # rear axle
RAKE = math.radians(27)
UP = (math.cos(RAKE), math.sin(RAKE))   # along the forks, up and back (dy, dz)


def fork(s):
    """Point on the steering axis, s pixels up from the front axle: (y, z)."""
    return (FA[0] + UP[0] * s, FA[1] + UP[1] * s)


# --- materials ------------------------------------------------------------------
paint("dirt_bike_orange", "#FF8E26", "#C94A00", gloss=0.45)
paint("dirt_bike_gold", "#FFE07A", "#B07A12", gloss=0.6)
paint("dirt_bike_spring", "#FF6A1A", "#A83200", gloss=0.5)
paint("dirt_bike_anod", "#FF9A3A", "#B44E08", gloss=0.7)


def _shroud(u, v):
    """Orange plastic with a black slash and a white pinstripe."""
    c = mix(rgb("#FF8E26"), rgb("#C94A00"), v ** 1.3)
    c = mix(c, (255, 255, 255), glint(v, strength=0.4))
    d = v - (1 - u) * 0.9
    if 0.05 < d < 0.32:
        return scale(rgb("#1D1E21"), noise(0.03))
    if 0.36 < d < 0.42:
        return rgb("#F4F4F4")
    return scale(c, noise(0.02))


def _seat(u, v):
    rib = (v * 64 / 3) % 1
    c = mix(rgb("#3A3C40"), rgb("#17181B"), rib)
    if 0.42 < u < 0.58:
        c = scale(c, 0.8)
    return scale(c, noise(0.05))


def _white_board(u, v):
    c = scale(mix(rgb("#FFFFFF"), rgb("#DADBD6"), v), noise(0.02))
    if u < 0.05 or u > 0.95 or v < 0.07 or v > 0.93:
        c = rgb("#FF8E26")
    return c


def _yellow_board(u, v):
    c = scale(mix(rgb("#FFE45A"), rgb("#E8B814"), v), noise(0.02))
    if u < 0.05 or u > 0.95 or v < 0.05 or v > 0.95:
        c = rgb("#1D1E21")
    return c


def _wbox(word, w, h, fill=0.8):
    """A decal box that keeps the pixel font square on a w x h face."""
    cols = len(word) * 7 - 1
    bh = w * fill * 7 / (cols * h)
    bw = fill
    if bh > 0.7:
        bh, bw = 0.7, 0.7 * cols * h / (7 * w)
    return ((1 - bw) / 2, 0.5 - bh / 2, bw, bh)


material("dirt_bike_shroud", _shroud)
material("dirt_bike_seat", _seat)
material("dirt_bike_board", _white_board)
material("dirt_bike_yellow", _yellow_board)
decal("dirt_bike_luna", "LUNA", "#1D1E21", "dirt_bike_yellow", box=_wbox("LUNA", 6.0, 4.4))
decal("dirt_bike_indi", "INDI", "#1D1E21", "dirt_bike_board", box=_wbox("INDI", 6.6, 4.2),
      underline="#FF8E26")


# --- little helpers --------------------------------------------------------------

def slab(mat, x0, x1, p0, p1, t, **kw):
    """A flat strip across x0..x1 running from p0 to p1 (both (y, z)), t thick."""
    (ya, za), (yb, zb) = p0, p1
    if zb < za:
        (ya, za), (yb, zb) = (yb, zb), (ya, za)
    ym, zm = (ya + yb) / 2, (za + zb) / 2
    length = math.hypot(yb - ya, zb - za)
    pitch = math.degrees(math.atan2(yb - ya, zb - za))
    return box(mat, x0, ym - t / 2, zm - length / 2, x1, ym + t / 2, zm + length / 2,
               rotation=(pitch, 0, 0), pivot=(0, ym, zm), **kw)


def ring(mat, x0, x1, c, r_out, t, n=20, a0=0, a1=360):
    """Segments of a ring in the y-z plane around c = (y, z)."""
    cy, cz = c
    step = (a1 - a0) / n
    half = (r_out - t / 2) * math.tan(math.radians(abs(step)) / 2) + 0.06
    return [box(mat, x0, cy + r_out - t, cz - half, x1, cy + r_out, cz + half,
                rotation=(a0 + step * (k + 0.5), 0, 0), pivot=(0, cy, cz)) for k in range(n)]


def tube(mat, pts, t=0.8):
    return [bar(mat, a, b, t) for a, b in zip(pts, pts[1:])]


def mirror_pts(pts):
    return [(-x, y, z) for x, y, z in pts]


# --- parts -----------------------------------------------------------------------

def spoked_wheel(name, axle, r, width, parent, disc_side=1):
    cy, cz = axle
    cubes = []
    carcass = r - 0.55
    cubes += ring("tire", -width / 2, width / 2, axle, carcass, 1.9, n=20)
    cubes += ring("tire", -width / 2 + 0.25, width / 2 - 0.25, axle, carcass + 0.2, 0.4, n=20, a0=9)
    n = 26
    for k in range(n):                                  # knobs, staggered
        a = 360 * k / n
        if k % 2:
            xs = [(-0.45, 0.45)]
        else:
            xs = [(-width / 2, -width / 2 + 0.75), (width / 2 - 0.75, width / 2)]
        for x0, x1 in xs:
            cubes.append(box("rubber", x0, cy + carcass - 0.1, cz - 0.42, x1, cy + r, cz + 0.42,
                             rotation=(a, 0, 0), pivot=(0, cy, cz)))
    rim_r = carcass - 1.9
    cubes += ring("black", -0.75, 0.75, axle, rim_r + 0.05, 0.55, n=20)
    for k in range(18):                                 # spokes
        a = 360 * k / 18
        x = 0.35 if k % 2 else -0.35
        cubes.append(box("chrome", x - 0.1, cy + 0.9, cz - 0.1, x + 0.1, cy + rim_r - 0.4, cz + 0.1,
                         rotation=(a + (8 if k % 2 else -8), 0, 0), pivot=(0, cy, cz)))
    cubes += cylinder("dirt_bike_anod", (0, cy, cz), 1.0, width * 0.55, "x", 4)
    cubes += cylinder("aluminium", (0, cy, cz), 0.45, width + 1.6, "x", 3)
    # brake disc and its bolts
    dx = disc_side * (width / 2 - 0.2)
    cubes += cylinder("steel", (dx, cy, cz), 2.6 if r > 6.35 else 2.2, 0.15, "x", 6)
    cubes += cylinder("gunmetal", (dx, cy, cz), 1.25, 0.2, "x", 4)
    if r < 6.35:                                        # rear sprocket on the chain side
        cubes += cylinder("dirt_bike_anod", (2.2, cy, cz), 2.95, 0.25, "x", 8)
        cubes += cylinder("gunmetal", (2.2, cy, cz), 1.6, 0.3, "x", 4)
    return {"name": name, "parent": parent, "pivot": [0, cy, cz], "cubes": cubes}


def front_end():
    """Forks, clamps, bars, plate, fender: everything that steers."""
    c = []
    for sx in (1, -1):
        x = 1.75 * sx
        lo, hi = fork(0.3), fork(8.0)
        c.append(bar("dirt_bike_gold", (x, lo[0], lo[1]), (x, hi[0], hi[1]), 1.0))   # stanchion
        lo, hi = fork(7.0), fork(16.2)
        c.append(bar("matte_black", (x, lo[0], lo[1]), (x, hi[0], hi[1]), 1.45))     # outer tube
        lo, hi = fork(1.5), fork(7.8)
        c.append(bar("black", (x - 0.2 * sx, lo[0], lo[1] - 0.6), (x - 0.2 * sx, hi[0], hi[1] - 0.6), 0.5))
        c.append(box("aluminium", x - 0.7, FA[0] - 0.9, FA[1] - 0.9, x + 0.7, FA[0] + 1.0, FA[1] + 0.9))
    # brake caliper on the left leg
    c.append(box("dirt_bike_anod", 1.0, FA[0] + 1.2, FA[1] + 1.2, 2.3, FA[0] + 2.8, FA[1] + 2.9))
    # triple clamps
    for s, t in ((12.6, 0.9), (16.0, 1.0)):
        y, z = fork(s)
        c.append(slab("dirt_bike_anod", -2.7, 2.7, (y, z - 0.9), (y, z + 1.6), t))
    # handlebar: risers, tapered bar, pad, grips, levers
    ty, tz = fork(16.4)
    by, bz = ty + 1.6, tz + 0.6
    c += mirrored("gunmetal", 0.6, 1.4, ty - 0.3, tz - 0.4, by, tz + 0.8)
    c.append(bar("aluminium", (-4.0, by, bz), (4.0, by, bz), 0.6))
    c += tube("aluminium", [(4.0, by, bz), (6.8, by + 0.7, bz + 0.9)], 0.55)
    c += tube("aluminium", [(-4.0, by, bz), (-6.8, by + 0.7, bz + 0.9)], 0.55)
    c.append(box("dirt_bike_orange", -1.8, by - 0.5, bz - 0.6, 1.8, by + 0.7, bz + 0.6))     # bar pad
    c.append(bar("rubber", (5.6, by + 0.45, bz + 0.6), (8.3, by + 0.8, bz + 1.0), 0.8))
    c.append(bar("rubber", (-5.6, by + 0.45, bz + 0.6), (-8.3, by + 0.8, bz + 1.0), 0.8))
    for sx in (1, -1):
        c.append(bar("aluminium", (4.6 * sx, by + 0.4, bz - 0.4), (7.8 * sx, by + 0.5, bz - 1.6), 0.3))
        c.append(box("matte_black", 4.0 * sx - 0.5, by - 0.4, bz - 0.5, 4.0 * sx + 0.5, by + 0.6, bz + 0.6))
    # front number plate with LUNA, tipped back along the forks, little LED headlight below
    py, pz = fork(15.0)
    plate_rot = (-math.degrees(RAKE) + 6, 0, 0)
    c.append(box("dirt_bike_yellow", -3.0, py - 3.4, pz - 2.1, 3.0, py + 1.6, pz - 1.8,
                 rotation=plate_rot, pivot=(0, py, pz), fore="dirt_bike_luna"))
    c.append(box("dirt_bike_orange", -2.4, py - 5.2, pz - 2.0, 2.4, py - 3.4, pz - 1.7,
                 rotation=plate_rot, pivot=(0, py, pz)))
    c.append(box("headlight", -1.1, py - 4.9, pz - 2.15, 1.1, py - 3.7, pz - 1.9,
                 rotation=plate_rot, pivot=(0, py, pz)))
    # high front fender: a long curved blade from under the bottom clamp
    fy, fz = fork(11.2)
    pts = [(fy - 0.4, fz + 3.6), (fy - 0.1, fz + 1.5), (fy + 0.05, fz - 1.0), (fy - 0.2, fz - 4.0),
           (fy - 0.8, fz - 7.0), (fy - 1.8, fz - 9.6)]
    for a, b in zip(pts, pts[1:]):
        c.append(slab("dirt_bike_orange", -2.4, 2.4, a, b, 0.45))
    c.append(slab("white", -2.45, 2.45, (fy - 0.42, fz + 1.0), (fy - 0.15, fz - 2.6), 0.42))
    return c


def frame_and_engine():
    c = []
    hy, hz = fork(12.6)          # bottom of the steering head
    ty, tz = fork(15.6)
    c.append(bar("dirt_bike_orange", (0, hy - 0.3, hz - 0.1), (0, ty + 0.2, tz + 0.1), 1.6))
    # twin aluminium spars from the head to the swingarm pivot, cradle under the motor
    for sx in (1, -1):
        x = 1.9 * sx
        c += tube("aluminium", [(0.6 * sx, ty - 0.4, tz + 0.6), (x, 17.4, -3.0), (x, 15.6, 1.4),
                                (x, 12.4, 3.4), (x, 4.6, 2.6)], 1.15)
        c += tube("aluminium", [(0.7 * sx, hy - 0.2, hz + 0.3), (1.2 * sx, 9.5, -5.6),
                                (1.4 * sx, 4.0, -3.6), (1.4 * sx, 3.6, 1.6), (x, 4.6, 2.6)], 0.9)
        # subframe under the seat
        c += tube("gunmetal", [(1.7 * sx, 16.0, 1.2), (1.6 * sx, 16.6, 12.5)], 0.6)
        c += tube("gunmetal", [(1.8 * sx, 12.0, 3.6), (1.6 * sx, 16.4, 11.0)], 0.55)
    # engine: cases, cylinder with fins, head, covers
    c.append(box("gunmetal", -2.0, 4.4, -4.6, 2.0, 10.4, 2.6))
    c.append(box("gunmetal", -1.6, 3.4, -3.8, 1.6, 4.5, 1.8))
    cyl_rot, cyl_piv = (-14, 0, 0), (0, 10, -2.8)
    for k in range(5):
        y = 10.2 + k * 0.9
        c.append(box("aluminium" if k % 2 == 0 else "gunmetal", -1.9 + 0.1 * (k % 2), y,
                     -5.0 + 0.1 * (k % 2), 1.9 - 0.1 * (k % 2), y + 0.9, -0.6 - 0.1 * (k % 2),
                     rotation=cyl_rot, pivot=cyl_piv))
    c.append(box("dirt_bike_anod", -1.7, 14.6, -4.8, 1.7, 15.6, -0.9, rotation=cyl_rot, pivot=cyl_piv))
    c += cylinder("dirt_bike_anod", (-2.15, 7.4, -0.6), 2.4, 0.5, "x", 6)       # clutch cover
    c += cylinder("gunmetal", (-2.45, 7.4, -0.6), 1.2, 0.3, "x", 4)
    c += cylinder("black", (2.15, 7.6, -1.4), 2.0, 0.5, "x", 6)                  # ignition cover
    # carburettor + airbox, a radiator each side behind the shrouds
    c.append(box("gunmetal", -0.8, 11.0, 1.6, 0.8, 12.4, 3.6))
    c.append(box("black", -1.8, 10.8, 3.4, 1.8, 15.6, 8.6))
    for sx in (1, -1):
        c.append(box("gunmetal", 2.0 * sx, 9.6, -7.4, 3.0 * sx, 15.4, -3.8))
        for k in range(5):
            c.append(box("steel", 2.95 * sx, 9.9 + k * 1.1, -7.2, 3.05 * sx, 10.4 + k * 1.1, -4.0))
    # footpegs, brake pedal and gear lever
    c += mirrored("gunmetal", 2.0, 4.6, 6.4, 2.2, 7.1, 3.6)
    c += mirrored("steel", 2.4, 4.6, 7.1, 2.4, 7.25, 3.4)
    c.append(bar("aluminium", (-2.3, 7.0, 2.4), (-2.6, 6.6, -2.6), 0.5))
    c.append(bar("aluminium", (2.4, 8.2, -0.2), (2.6, 7.6, -3.0), 0.45))
    # passenger pegs
    c += mirrored("gunmetal", 1.8, 3.8, 9.5, 8.8, 10.1, 9.8)
    return c


def exhaust():
    c = tube("steel", [(-0.7, 12.6, -5.2), (-1.4, 10.6, -6.8), (-2.4, 8.2, -6.6), (-3.0, 7.4, -4.4),
                       (-3.0, 8.4, -1.0), (-3.2, 11.0, 2.6), (-3.45, 12.7, 6.2)], 1.1)
    return c


def silencer():
    """A round can along the right side, tipped up towards the back (its own bone)."""
    a, b = (12.6, 5.6), (14.6, 15.0)
    pitch = math.degrees(math.atan2(b[0] - a[0], b[1] - a[1]))
    zc = (a[1] + b[1]) / 2
    yc = (a[0] + b[0]) / 2
    half = math.hypot(b[0] - a[0], b[1] - a[1]) / 2
    x = -3.5
    c = cylinder("aluminium", (x, yc, zc), 1.1, 2 * half, "z", 4)
    c += cylinder("carbon", (x, yc, zc + half + 0.2), 1.0, 0.8, "z", 4)
    c += cylinder("matte_black", (x, yc, zc + half + 0.5), 0.45, 0.4, "z", 3)
    for dz in (-half + 0.5, half - 0.6):
        c += cylinder("carbon", (x, yc, zc + dz), 1.32, 0.6, "z", 4)
    c.append(box("gunmetal", x + 0.6, yc - 0.3, zc - 1, x + 1.4, yc + 0.3, zc + 1))
    return {"name": "silencer", "parent": "body", "pivot": [x, yc, zc], "rotation": [pitch, 0, 0],
            "cubes": c}


def bodywork():
    c = []
    # fuel tank: narrow, between the spars
    for k, (z0, z1, top, w) in enumerate([(-7.4, -5.2, 17.6, 2.0), (-5.2, -2.6, 18.2, 2.5),
                                          (-2.6, 0.0, 18.4, 2.6), (0.0, 1.8, 18.3, 2.4)]):
        c.append(box("dirt_bike_orange", -w, 14.8, z0, w, top, z1, band=(14.8, 18.6)))
    c.append(box("matte_black", -0.7, 18.3, -4.4, 0.7, 18.8, -3.0))        # filler cap
    # radiator shrouds: big angled side plastics with the slash graphic
    for sx in (1, -1):
        x0, x1 = 3.05 * sx, 3.55 * sx
        c.append(box("dirt_bike_shroud", x0, 11.0, -8.2, x1, 18.0, -1.8,
                     rotation=(-12, 0, 0), pivot=(0, 14, -5)))
        c.append(box("dirt_bike_orange", x0, 16.4, -2.6, x1, 18.1, 1.4))
        c.append(box("white", 3.0 * sx, 10.2, -7.6, 3.5 * sx, 11.1, -3.2, rotation=(-12, 0, 0),
                     pivot=(0, 14, -5)))
        # side number board with INDI
        c.append(box("dirt_bike_board", 2.65 * sx, 12.4, 4.0, 3.0 * sx, 16.6, 10.6,
                     sides="dirt_bike_indi"))
        c.append(slab("white", 2.7 * sx, 2.95 * sx, (12.6, 4.0), (10.6, 1.6), 0.8))
    # seat: long and flat, ribbed cover, white sides of the base
    c.append(box("dirt_bike_seat", -2.2, 17.2, -1.6, 2.2, 18.6, 12.8))
    c.append(box("dirt_bike_seat", -1.9, 17.6, -3.0, 1.9, 18.4, -1.6))
    c.append(box("white", -2.35, 16.6, -1.2, 2.35, 17.3, 12.4))
    # rear fender: sweeps up and back, taillight underneath
    pts = [(17.3, 11.4), (17.6, 14.0), (18.2, 17.0), (19.0, 19.8), (19.6, 21.6)]
    for a, b in zip(pts, pts[1:]):
        c.append(slab("dirt_bike_orange", -2.6, 2.6, a, b, 0.45))
    c.append(slab("white", -2.65, 2.65, (17.55, 13.0), (18.55, 17.6), 0.42))
    c.append(box("taillight", -0.9, 17.2, 16.6, 0.9, 17.9, 17.4, rotation=(-18, 0, 0),
                 pivot=(0, 17.6, 17)))
    c.append(box("black", -0.5, 15.2, 15.4, 0.5, 17.4, 16.0))
    return c


def rear_end():
    c = []
    py, pz = 12.2, 3.4                                  # swingarm pivot
    for sx in (1, -1):
        x = 1.6 * sx
        c.append(bar("aluminium", (x, py, pz), (x * 1.05, RA[0] + 0.3, RA[1] - 1.0), 1.3))
        c.append(bar("aluminium", (x, py - 1.0, pz + 0.3), (x * 1.05, RA[0] - 0.5, RA[1] - 1.0), 0.7))
        c.append(box("aluminium", x - 0.55, RA[0] - 0.9, RA[1] - 1.4, x + 0.55, RA[0] + 0.9, RA[1] + 1.2))
    c.append(box("gunmetal", -2.2, py - 0.8, pz - 0.8, 2.2, py + 0.8, pz + 0.8))
    # chain guide and chain on the left, sprocket on the wheel side
    c.append(bar("rubber", (2.25, 8.0, -0.2), (2.25, RA[0] + 2.9, RA[1]), 0.4))
    c.append(bar("rubber", (2.25, 6.6, -0.2), (2.25, RA[0] - 2.9, RA[1]), 0.4))
    c += cylinder("gunmetal", (2.25, 7.3, -0.2), 0.8, 0.4, "x", 4)
    c.append(box("black", 2.0, 5.2, 3.0, 2.6, 6.6, 8.2))
    # rear brake caliper on the right
    c.append(box("dirt_bike_anod", -2.4, RA[0] + 1.0, RA[1] - 2.9, -1.4, RA[0] + 2.4, RA[1] - 1.2))
    # shock: reservoir, body and a bright spring, from linkage to the frame
    lo, hi = (0, 6.0, 5.4), (0, 16.0, 2.6)
    c.append(bar("chrome", lo, hi, 0.7))
    for k in range(8):
        t = 0.2 + k * 0.08
        p = tuple(a + (b - a) * t for a, b in zip(lo, hi))
        q = tuple(a + (b - a) * (t + 0.045) for a, b in zip(lo, hi))
        c.append(bar("dirt_bike_spring", p, q, 1.7))
    c.append(bar("dirt_bike_gold", (0.0, 15.2, 3.4), (0.0, 15.6, 7.0), 1.0))
    c.append(bar("gunmetal", (0, 6.0, 5.4), (0, 5.2, 9.0), 0.8))                 # linkage
    return c


def build():
    return [
        {"name": "root", "pivot": [0, 0, 0]},
        {"name": "body", "parent": "root", "pivot": [0, 0, 0],
         "cubes": frame_and_engine() + exhaust() + bodywork() + rear_end()},
        {"name": "steer", "parent": "body", "pivot": [0, 12.0, -10.0], "cubes": front_end()},
        spoked_wheel("wheel_f", FA, 6.4, 1.9, "steer", disc_side=1),
        silencer(),
        spoked_wheel("wheel_r", RA, 6.3, 2.5, "body", disc_side=-1),
    ]
