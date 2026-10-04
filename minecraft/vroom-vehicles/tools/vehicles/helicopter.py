"""Helicopter: a modern light helicopter with a big glass bubble.

The fuselage is sliced front to back; each slice is a rounded section made
of stacked boxes (a hollow shell round the cabin, solid elsewhere). The
tail number on the boom reads LUNA on the left side and INDI on the right.
"""
import math

from artkit import (box, mirrored, cylinder, bar, decal, material, paint, bucket_seat,
                    mix, rgb, scale, noise)

INFO = {
    "id": "helicopter", "name": "Helicopter", "kind": "Light Helicopter",
    "group": "Air", "mode": "air", "length": 6,
    "specs": [("Length", "6 blocks"), ("Rotor", "4 blades, 6 blocks"), ("Seats", "4"),
              ("Top speed", "Zippy")],
    "seats": [(-5, 13.6, -9.5), (5, 13.6, -9.5), (-5, 13.6, 2.5), (5, 13.6, 2.5)],
    "collision": (1.8, 2.0), "health": 14,
    "fly_speed": 0.12,
    "recipe": {"shapeless": ["minecraft:iron_block", "minecraft:iron_block",
                             "minecraft:redstone_block", "minecraft:glass_pane"]},
    "recipe_text": "2 Iron Blocks + Redstone Block + Glass Pane",
    "spawn_egg": ("#D7262E", "#F4F4F0"),
    "anim": [
        {"bone": "rotor", "type": "spin", "axis": "y", "idle": 0, "ridden": 1400, "per_speed": 0},
        {"bone": "tail_rotor", "type": "spin", "axis": "x", "idle": 0, "ridden": 2400,
         "per_speed": 0},
    ],
    "eggs": "Tail number LUNA on the left of the tail boom, INDI on the right",
    "egg_cam": {"eye": [-78, 30, -40], "at": [0, 17, -2]},
}

paint("helicopter_red", "#E2343A", "#8C1218", gloss=0.55)
paint("helicopter_white", "#FAFAF6", "#C9CCCC", gloss=0.5)
paint("helicopter_grey", "#6C737C", "#2F343A", gloss=0.3)
material("helicopter_glass", lambda u, v: mix(rgb("#BFE4F5"), rgb("#4F7E9E"), v)
         + (int(110 + 40 * v),))


def _blade(u, v):
    return scale(mix(rgb("#3B3F45"), rgb("#1E2024"), v), noise(0.03))


def _grille(u, v):
    if (v * 8) % 1 < 0.45:
        return rgb("#111214")
    return scale(rgb("#4A5058"), noise(0.05))


material("helicopter_blade", _blade)
material("helicopter_tip", lambda u, v: mix(rgb("#FFD23A"), rgb("#D79A00"), v))
material("helicopter_grille", _grille)


def _tail_panel(u, v):
    c = mix(rgb("#FAFAF6"), rgb("#D9DBDA"), v)
    return scale(c, noise(0.02))


material("helicopter_panel", _tail_panel)
TAIL_BOX = (0.06, 0.16, 0.88, 0.68)
decal("helicopter_luna", "LUNA", "#1C2A4F", "helicopter_panel", box=TAIL_BOX)
decal("helicopter_indi", "INDI", "#1C2A4F", "helicopter_panel", box=TAIL_BOX)

BAND = (6, 40)


# --- shapes ---------------------------------------------------------------------

def lerp_table(table, z):
    if z <= table[0][0]:
        return table[0][1]
    for (za, a), (zb, b) in zip(table, table[1:]):
        if z <= zb:
            t = (z - za) / (zb - za)
            t = t * t * (3 - 2 * t)                       # smooth the corners
            return a + (b - a) * t
    return table[-1][1]


def section(yb, yt, hw, n=7, p=3.0):
    """A rounded section as stacked layers: [(y0, y1, half_width)], bottom up."""
    yc, h = (yb + yt) / 2, (yt - yb) / 2
    phis = [-math.pi / 2 + math.pi * i / n for i in range(n + 1)]
    ys = [yc + h * math.copysign(abs(math.sin(f)) ** (2 / p), math.sin(f)) for f in phis]
    out = []
    for i in range(n):
        fm = (phis[i] + phis[i + 1]) / 2
        out.append((ys[i], ys[i + 1], hw * abs(math.cos(fm)) ** (2 / p)))
    return out


# the fuselage, nose (-z) to the start of the boom
HW = [(-37, 2.5), (-34, 6.5), (-30, 9.2), (-25, 10.6), (7, 10.6), (14, 8.2), (20, 5.4), (25, 4.6)]
YB = [(-37, 15.5), (-34, 11.5), (-30, 9.2), (-25, 8), (9, 8), (15, 10.5), (21, 17), (25, 19)]
YT = [(-37, 18.5), (-34, 23.5), (-30, 28), (-25, 31.2), (-18, 32.6), (9, 32.6), (15, 31.5),
      (21, 29.2), (25, 28.4)]
BELT = [(-37, 15.5), (-31, 14.2), (-24, 16.5), (-14, 18.5), (9, 18.5)]
SHELL = (-31, 9)           # hollow cabin
POSTS = [(-13.5, -12.5), (-1.5, -0.5), (8.5, 9)]     # door pillars
ROOF_Y = 31.0              # above this, roof (opaque) behind the bubble


def fuselage_slices():
    edges = [-37 + i for i in range(12)] + [-25 + 1.5 * i for i in range(23)]
    edges += [z for p in POSTS for z in p] + [9, 11, 13, 15, 17, 19, 21, 23, 25]
    return sorted(set(round(e, 2) for e in edges if -37 <= e <= 25))


def split(layers, cuts):
    """Split layers at the given heights (same width either side)."""
    out = []
    for y0, y1, w in layers:
        ys = [y0] + [c for c in sorted(cuts) if y0 + 0.3 < c < y1 - 0.3] + [y1]
        out += [(a, b, w) for a, b in zip(ys, ys[1:])]
    return out


def merge(raw):
    """Join boxes of the same material and x/y extent that touch end to end in z."""
    raw = sorted(raw, key=lambda r: (r[0], r[1], r[2], r[4], r[5], r[3]))
    out = []
    for r in raw:
        if out:
            q = out[-1]
            if q[:3] == r[:3] and q[4:6] == r[4:6] and abs(q[6] - r[3]) < 1e-6:
                out[-1] = q[:6] + (r[6],)
                continue
        out.append(r)
    return out


def fuselage():
    raw = []                      # (material, x0, y0, z0, x1, y1, z1) before merging
    edges = fuselage_slices()
    for z0, z1 in zip(edges, edges[1:]):
        zm = (z0 + z1) / 2
        hw, yb, yt = lerp_table(HW, zm), lerp_table(YB, zm), lerp_table(YT, zm)
        belt = lerp_table(BELT, zm)
        # neighbours, so walls are thick enough to close the steps between slices
        nb = [(lerp_table(HW, z), lerp_table(YB, z), lerp_table(YT, z))
              for z in (z0 - 0.75, z1 + 0.75)]
        layers = split(section(yb, yt, hw, n=9), [belt, 13.5])
        shell = SHELL[0] <= z0 and z1 <= SHELL[1]
        post = any(a <= z0 and z1 <= b for a, b in POSTS)

        def mat_for(y0, y1, part):
            ym = (y0 + y1) / 2
            if ym < belt:
                return "helicopter_white" if ym < 13.5 else "helicopter_red"
            if zm < -15:
                return "glass"                                     # the bubble
            if part == "side" and y1 <= ROOF_Y + 0.5 and not post and zm < 9:
                return "glass"                                     # door windows
            return "helicopter_red"

        r = lambda v: round(v, 3)
        for i, (y0, y1, w) in enumerate(layers):
            if not shell or i in (0, len(layers) - 1):
                if shell and i == len(layers) - 1:
                    # roof: thick enough to meet the next slice
                    y0 = min(y0, yt - max(1.2, abs(nb[0][2] - yt) + 0.5, abs(nb[1][2] - yt) + 0.5))
                raw.append((mat_for(y0, y1, "top" if i else "bottom"),
                            r(-w), r(y0), z0, r(w), r(y1), z1))
                continue
            wn = [w * (n[0] / hw) for n in nb]
            others = [layers[j][2] for j in (i - 1, i + 1) if layers[j][2] != w] or [w]
            t = max(1.0, w - min(others) + 0.5, *(abs(w - x) + 0.4 for x in wn))
            t = round(min(t, w), 2)
            mat = mat_for(y0, y1, "side")
            raw.append((mat, r(w - t), r(y0), z0, r(w), r(y1), z1))
            raw.append((mat, r(-w), r(y0), z0, r(-w + t), r(y1), z1))
    body, glass = [], []
    for mat, x0, y0, z0, x1, y1, z1 in merge(raw):
        if mat == "glass":
            glass.append(box("helicopter_glass", x0, y0, z0, x1, y1, z1, band=(14, 33)))
        else:
            body.append(box(mat, x0, y0, z0, x1, y1, z1, band=BAND))
    return body, glass


def boom():
    """A tapered round boom: short octagon segments, each a hair thinner."""
    cubes = []
    n = 12
    for i in range(n):
        z0, z1 = 22 + 3 * i, 25.2 + 3 * i
        r, yc = 4.4 - 1.7 * i / (n - 1), 23.9 + 0.8 * i / (n - 1)
        cubes += cylinder("helicopter_red", (0, yc, (z0 + z1) / 2), r, z1 - z0, "z", 4)
    cubes += cylinder("helicopter_grey", (0, 24.0, 37.0), 4.0, 0.8, "z", 4)      # joint collar
    return cubes


def names():
    """Tail number stickers on the rear doors, under the windows."""
    cubes = []
    for s, word in ((1, "helicopter_luna"), (-1, "helicopter_indi")):
        x = s * 10.62
        cubes.append(box("helicopter_panel", x, 12.6, -11.2, x + 0.14 * s, 17.6, 7.6,
                         sides=word))
    return cubes


FIN_SWEEP = -25
TR_HUB = (2.8, 33.5, 58.4)


def tail():
    cubes = []
    # vertical fin, swept back, with a ventral fin and tail skid
    sweep = (FIN_SWEEP, 0, 0)
    piv = (0, 24, 54)
    cubes.append(box("helicopter_red", -0.7, 23, 50.5, 0.7, 42, 56.5, rotation=sweep, pivot=piv,
                     band=BAND))
    cubes.append(box("helicopter_red", -0.5, 23, 49, 0.5, 33, 50.6, rotation=sweep, pivot=piv,
                     band=BAND))
    cubes.append(box("white", -0.75, 41, 50.4, 0.75, 42.6, 56.6, rotation=sweep, pivot=piv))
    cubes.append(box("nav_red", -0.5, 42.6, 54.6, 0.5, 43.3, 55.6, rotation=sweep, pivot=piv))
    cubes.append(box("helicopter_red", -0.6, 18.5, 52.5, 0.6, 24, 56.5, rotation=(-FIN_SWEEP, 0, 0),
                     pivot=(0, 24, 54), band=BAND))
    cubes.append(bar("steel", (0, 19.5, 55), (0, 16.6, 59), 0.6))
    # horizontal stabiliser with end plates
    cubes.append(box("helicopter_red", -12, 24.2, 43, 12, 25.2, 48, band=BAND))
    for s, light in ((1, "nav_red"), (-1, "nav_green")):
        cubes.append(box("helicopter_red", s * 12, 22.4, 42.6, s * 12.8, 28.4, 48.4, band=BAND))
        cubes.append(box(light, s * 12.8, 24.2, 44, s * 13.2, 25.2, 45.4))
    # tail rotor gearbox
    cubes += cylinder("gunmetal", (1.2, TR_HUB[1], TR_HUB[2]), 1.4, 2.2, "x", 4)
    return cubes


def tail_rotor():
    p = TR_HUB
    cubes = cylinder("gunmetal", p, 0.9, 1.4, "x", 4)
    for k in range(2):
        cubes.append(box("helicopter_blade", p[0] - 0.25, p[1] + 0.6, p[2] - 0.8, p[0] + 0.25,
                         p[1] + 7.2, p[2] + 0.8, rotation=(180 * k + 4, 0, 0), pivot=p))
        cubes.append(box("helicopter_tip", p[0] - 0.3, p[1] + 6.0, p[2] - 0.85, p[0] + 0.3,
                         p[1] + 7.25, p[2] + 0.85, rotation=(180 * k + 4, 0, 0), pivot=p))
    return {"name": "tail_rotor", "parent": "root", "pivot": list(p), "cubes": cubes}


COWL_HW = [(-17, 2.5), (-14, 5.5), (-9, 7), (10, 7), (16, 5.2), (21, 2.8)]
COWL_YT = [(-17, 33.0), (-14, 36.4), (-9, 38.2), (10, 38.2), (16, 36.4), (21, 33.2)]


def engine():
    cubes = []
    edges = [-17 + i for i in range(5)] + [-12 + 2 * i for i in range(12)] + [13, 15, 17, 19, 21]
    edges = sorted(set(edges))
    for z0, z1 in zip(edges, edges[1:]):
        zm = (z0 + z1) / 2
        hw, yt = lerp_table(COWL_HW, zm), lerp_table(COWL_YT, zm)
        for y0, y1, w in section(30.8, yt, hw, n=5, p=3)[2:]:
            cubes.append(box("helicopter_red", -w, y0, z0, w, y1, z1, band=BAND))
        cubes.append(box("helicopter_red", -min(hw, 7), 30.8, z0, min(hw, 7), 33.5, z1, band=BAND))
    # intakes, exhaust, mast
    cubes += mirrored("helicopter_grille", 6.4, 7.15, 33.4, -6, 36.6, 1)
    cubes += mirrored("helicopter_grey", 6.0, 7.2, 33.0, -6.4, 33.4, 1.4)
    cubes += cylinder("gunmetal", (0, 34.2, 20.6), 1.5, 2.4, "z", 4)
    cubes += cylinder("matte_black", (0, 34.2, 21.7), 1.0, 0.4, "z", 4)
    cubes += cylinder("gunmetal", (0, 39.6, -2), 1.6, 3.4, "y", 4)
    cubes += cylinder("helicopter_grey", (0, 38.6, -2), 3.0, 1.0, "y", 6)
    return cubes


ROTOR_P = (0, 42.4, -2)


def rotor():
    x, y, z = ROTOR_P
    cubes = cylinder("gunmetal", (x, y, z), 2.2, 1.6, "y", 4)
    cubes += cylinder("chrome", (x, y + 1.3, z), 1.0, 1.2, "y", 4)
    R = 50
    for k in range(4):
        rot = (0, 90 * k, 0)
        cubes.append(box("gunmetal", 1.6, y - 0.6, z - 1.2, 6, y + 0.6, z + 1.2,
                         rotation=rot, pivot=(x, y, z)))
        cubes.append(box("helicopter_blade", 5, y - 0.3, z - 1.9, R - 2.5, y + 0.3, z + 1.9,
                         rotation=rot, pivot=(x, y, z)))
        cubes.append(box("helicopter_tip", R - 2.5, y - 0.3, z - 1.9, R, y + 0.3, z + 1.9,
                         rotation=rot, pivot=(x, y, z)))
    return {"name": "rotor", "parent": "root", "pivot": list(ROTOR_P), "cubes": cubes}


def skids():
    cubes = []
    for s in (1, -1):
        x = s * 12
        cubes.append(box("steel", x - 0.7, 0, -22, x + 0.7, 1.4, 14))
        cubes.append(bar("steel", (x, 0.7, -21.6), (x, 3.4, -26.4), 1.4))
        cubes.append(box("black", x - 0.8, -0.05, -10, x + 0.8, 0.3, 4))         # wear shoe
        for zc in (-13, 5):
            cubes.append(bar("steel", (x, 1.0, zc), (s * 7.5, 8.4, zc), 1.3))
            cubes.append(box("black", x - s * 0.8, 3.8, zc - 1.6, x - s * 3.4, 4.2, zc + 1.6))
    for zc in (-13, 5):
        cubes.append(box("steel", -7.8, 7.6, zc - 0.65, 7.8, 8.6, zc + 0.65))
    return cubes


def cabin():
    f = 9.4
    cubes = [box("carpet", -9.4, 8.4, -30, 9.4, f, 9)]
    for x0, x1 in ((-8.4, -1.4), (1.4, 8.4)):
        cubes += bucket_seat(x0, x1, -12.5, -7.5, f + 2.6, cushion="dark_leather", trim="black")
        cubes.append(box("gunmetal", (x0 + x1) / 2 - 2, f, -12, (x0 + x1) / 2 + 2, f + 2.6, -8))
    cubes.append(box("dark_leather", -8, f + 1.4, -0.5, 8, f + 4.2, 6))            # rear bench
    cubes.append(box("gunmetal", -7, f, 0, 7, f + 1.4, 5.5))
    cubes.append(box("dark_leather", -8, f + 4.2, 5.2, 8, f + 15, 7.6,
                     rotation=(-8, 0, 0), pivot=(0, f + 4.2, 7.6)))
    # instrument panel with glare shield, screens, sticks
    cubes.append(box("matte_black", -8, 13, -24.5, 8, 18.6, -21.5))
    cubes.append(box("matte_black", -8.4, 18.6, -25, 8.4, 19.4, -20.6))
    for xc in (-4.5, 0, 4.5):
        cubes.append(box("screen", xc - 1.8, 14.6, -21.6, xc + 1.8, 17.6, -21.45))
    cubes.append(box("matte_black", -1.8, f, -21.5, 1.8, 14, -16))                 # console
    for xc in (-5, 5):
        cubes.append(bar("black", (xc, f, -14.5), (xc, f + 7, -15.5), 0.6))           # cyclic
        cubes.append(box("black", xc - 0.5, f + 6.6, -16, xc + 0.5, f + 8, -15))
        cubes += mirrored("black", abs(xc) + 0.8, abs(xc) + 2.4, f, -24, f + 1, -22) if xc > 0 else []
    return cubes


def details():
    cubes = []
    # door handles, steps of the door seams, landing light, antennae
    for s in (1, -1):
        for zc in (-3.0, 6.5):
            cubes.append(box("chrome", s * 10.55, 16.4, zc - 1.2, s * 10.8, 16.9, zc))
    cubes.append(box("headlight", -1.4, 9.6, -33.4, 1.4, 10.6, -31.8))
    cubes.append(box("black", -0.3, 32.6, 9.4, 0.3, 36, 10.2, rotation=(-20, 0, 0)))
    cubes.append(box("nav_red", 7.2, 33.2, -10, 7.7, 34.0, -9))
    cubes.append(box("nav_green", -7.7, 33.2, -10, -7.2, 34.0, -9))
    return cubes


def build():
    body, glass = fuselage()
    return [
        {"name": "root", "pivot": [0, 0, 0]},
        {"name": "body", "parent": "root", "pivot": [0, 0, 0],
         "cubes": body + boom() + names() + tail() + engine() + skids() + cabin() + details()},
        {"name": "glass", "parent": "root", "pivot": [0, 0, 0], "cubes": glass},
        rotor(),
        tail_rotor(),
    ]
