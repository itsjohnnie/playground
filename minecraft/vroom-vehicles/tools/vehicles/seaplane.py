"""Seaplane: a high-wing four-seat floatplane on two aluminium floats.

The fuselage is sliced front to back into rounded sections (hollow round
the cabin). The registration on the tail cone reads LUNA on the left side
and INDI on the right, like an aircraft's tail number.
"""
import math

from artkit import (box, mirrored, cylinder, decal, material, paint, bucket_seat,
                    mix, rgb, scale, noise, glint)

INFO = {
    "id": "seaplane", "name": "Seaplane", "kind": "Floatplane",
    "group": "Air", "mode": "seaplane", "length": 7,
    "specs": [("Length", "7 blocks"), ("Wingspan", "9 blocks"), ("Seats", "4"),
              ("Lands on", "Water")],
    "seats": [(4.5, 31.4, -16), (-4.5, 31.4, -16), (4.5, 31.4, -3), (-4.5, 31.4, -3)],
    "collision": (2.5, 2.5), "health": 14,
    "speed": 0.3, "water_drag": 0.25, "fly_speed": 0.18,
    "recipe": {"shapeless": ["minecraft:oak_boat", "minecraft:oak_boat", "minecraft:iron_block",
                             "minecraft:redstone", "minecraft:feather"]},
    "recipe_text": "2 Oak Boats + Iron Block + Redstone + Feather",
    "spawn_egg": ("#F4F4EF", "#2457A8"),
    "anim": [
        {"bone": "prop", "type": "spin", "axis": "z", "idle": 0, "ridden": 1800, "per_speed": 0},
    ],
    "eggs": "Registration INDI on both sides of the tail cone",
    "egg_cam": {"eye": [-62, 44, 56], "at": [0, 38, 17]},
}

paint("seaplane_white", "#FBFBF7", "#C6C9C8", gloss=0.5)
paint("seaplane_blue", "#2F6FD0", "#173B7A", gloss=0.4)
paint("seaplane_yellow", "#FFD34A", "#D6A10A", gloss=0.3)
paint("seaplane_grey", "#9AA2AA", "#59616A", gloss=0.2)
material("seaplane_glass", lambda u, v: mix(rgb("#C4E6F5"), rgb("#4D7C9C"), v) + (int(115 + 40 * v),))


def _prop(u, v):
    if v < 0.1:
        return rgb("#F2C230")                     # painted tips
    return scale(mix(rgb("#3A3E44"), rgb("#1B1D21"), v), noise(0.03))


def _float(u, v):
    c = mix(rgb("#E9EDF0"), rgb("#9AA3AC"), v)
    c = mix(c, (255, 255, 255), glint(v, 0.22, 0.07, 0.45))
    if (u * 9) % 1 < 0.03:                         # rivet seams between panels
        c = scale(c, 0.82)
    return c


def _skin(u, v):
    """Wing and float skin seen from above: white with faint rib lines (a tile)."""
    if (u * 64) % 8 < 0.5:
        return rgb("#D8DCDD")
    return scale(rgb("#F1F2EF"), noise(0.015))


material("seaplane_skin", _skin, "tile")
material("seaplane_top", lambda u, v: scale(rgb("#EEEFEC"), noise(0.015)), "tile")
material("seaplane_float_top", lambda u, v: scale(rgb("#D9DEE2"), noise(0.03)), "tile")
material("seaplane_prop", _prop)
material("seaplane_float", _float)


def _reg(u, v):
    return scale(mix(rgb("#FBFBF7"), rgb("#DADCDA"), v), noise(0.02))


material("seaplane_reg", _reg)
REG_BOX = (0.04, 0.14, 0.92, 0.72)
decal("seaplane_luna", "INDI", "#173B7A", "seaplane_reg", box=REG_BOX)
decal("seaplane_indi", "INDI", "#173B7A", "seaplane_reg", box=REG_BOX)

BAND = (24, 54)


# --- shape helpers ------------------------------------------------------------------

def lerp(table, z):
    if z <= table[0][0]:
        return table[0][1]
    for (za, a), (zb, b) in zip(table, table[1:]):
        if z <= zb:
            return a + (b - a) * (z - za) / (zb - za)
    return table[-1][1]


def section(yb, yt, hw, n=9, p=3.0):
    yc, h = (yb + yt) / 2, (yt - yb) / 2
    phis = [-math.pi / 2 + math.pi * i / n for i in range(n + 1)]
    ys = [yc + h * math.copysign(abs(math.sin(f)) ** (2 / p), math.sin(f)) for f in phis]
    return [(ys[i], ys[i + 1], hw * abs(math.cos((phis[i] + phis[i + 1]) / 2)) ** (2 / p))
            for i in range(n)]


def split(layers, cuts):
    out = []
    for y0, y1, w in layers:
        ys = [y0] + [c for c in sorted(cuts) if y0 + 0.3 < c < y1 - 0.3] + [y1]
        out += [(a, b, w) for a, b in zip(ys, ys[1:])]
    return out


def merge(raw):
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


def strut(mat, p0, p1, t=1.2, chord=None):
    """A bar in the x-y plane (turned about z only), mirrored to both sides."""
    (x0, y0, z), (x1, y1, _) = p0, p1
    length = math.hypot(x1 - x0, y1 - y0)
    ang = math.degrees(math.atan2(y1 - y0, x1 - x0))
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    c = (chord or t) / 2
    return mirrored(mat, mx - length / 2, mx + length / 2, my - t / 2, z - c, my + t / 2, z + c,
                    rotation=(0, 0, ang), pivot=(mx, my, z))


# --- fuselage -----------------------------------------------------------------------

HW = [(-47, 5.0), (-44, 7.4), (-38, 8.6), (-31, 9.2), (-4, 9.2), (4, 7.8), (36, 2.6), (50, 1.6)]
YB = [(-47, 30.5), (-44, 28), (-38, 26.6), (-31, 26), (-4, 26), (4, 27.6), (36, 35), (50, 37)]
YT = [(-47, 38.5), (-44, 40.6), (-38, 41.6), (-32, 42.2), (-23, 50.4), (-20, 51), (-3, 51),
      (6, 47), (18, 44.2), (36, 42.0), (50, 41.2)]
BELT = [(-47, 60), (-32, 60), (-31.9, 42.4), (-22, 42.4), (-21, 42.0), (-3, 42.0), (6, 42.6)]
SHELL = (-30, 6)
POSTS = [(-22, -21), (-9, -8)]


def fuselage():
    raw = []
    edges = [-47 + i for i in range(17)] + [-30 + 1.5 * i for i in range(10)]
    edges += [-15 + 2 * i for i in range(10)] + [6 + 2 * i for i in range(23)]
    edges += [z for p in POSTS for z in p] + [6, 50]
    edges = sorted(set(round(e, 2) for e in edges if -47 <= e <= 50))
    for z0, z1 in zip(edges, edges[1:]):
        zm = (z0 + z1) / 2
        hw, yb, yt, belt = lerp(HW, zm), lerp(YB, zm), lerp(YT, zm), lerp(BELT, zm)
        nb = [(lerp(HW, z), lerp(YB, z), lerp(YT, z)) for z in (z0 - 0.75, z1 + 0.75)]
        layers = split(section(yb, yt, hw), [belt, 33, 35, 36])
        shell = SHELL[0] <= z0 and z1 <= SHELL[1]
        post = any(a <= z0 and z1 <= b for a, b in POSTS)

        def mat_for(y0, y1, part):
            ym = (y0 + y1) / 2
            if ym < 28.5:
                return "seaplane_grey" if zm < -31 else "seaplane_white"
            if 33 < ym < 35:
                return "seaplane_blue"                              # cheat line
            if 35 < ym < 36:
                return "seaplane_yellow"
            if ym > belt and -32 < zm < 6:
                if zm < -22 or (part == "side" and not post and ym < 49.5):
                    return "glass"
            return "seaplane_white"

        r = lambda v: round(v, 3)
        for i, (y0, y1, w) in enumerate(layers):
            if not shell or i in (0, len(layers) - 1):
                if shell and i == len(layers) - 1:
                    y0 = min(y0, yt - max(1.2, abs(nb[0][2] - yt) + 0.5, abs(nb[1][2] - yt) + 0.5))
                raw.append((mat_for(y0, y1, "top" if i else "bottom"), r(-w), r(y0), z0, r(w),
                            r(y1), z1))
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
            glass.append(box("seaplane_glass", x0, y0, z0, x1, y1, z1, band=(41, 52)))
        else:
            flat = "seaplane_top" if mat == "seaplane_white" else None
            body.append(box(mat, x0, y0, z0, x1, y1, z1, band=BAND, top=flat, bottom=flat))
    return body, glass


def registration():
    """LUNA / INDI stickers along the straight-tapered tail cone."""
    za, zb = 10, 27
    xa, xb = lerp(HW, za), lerp(HW, zb)
    ang = math.degrees(math.atan2(xa - xb, zb - za))
    ym = (lerp(YB, (za + zb) / 2) + lerp(YT, (za + zb) / 2)) / 2
    cubes = []
    for s, word in ((1, "seaplane_luna"), (-1, "seaplane_indi")):
        x = s * (xa + 0.05)
        cubes.append(box("seaplane_reg", x, ym - 2.4, za, x + 0.12 * s, ym + 2.6, zb,
                         sides=word, rotation=(0, -s * ang, 0), pivot=(x, ym, za)))
    return cubes


def cowling():
    cubes = []
    # air intakes either side of the spinner, exhaust stacks, oil cooler
    cubes += mirrored("matte_black", 2.6, 6.0, 31.6, -47.3, 34.6, -46.6)
    cubes += mirrored("gunmetal", 7.6, 9.4, 27.4, -38, 28.2, -35)
    cubes.append(box("matte_black", -2.5, 28.0, -46.0, 2.5, 29.4, -44.0))
    # windscreen frame and wing-root fairing
    cubes.append(box("seaplane_white", -0.5, 42, -32.5, 0.5, 50.6, -31.5,
                     rotation=(-46, 0, 0), pivot=(0, 42, -32)))
    return cubes


def cabin():
    f = 27.5
    cubes = [box("carpet", -6.8, 28.0, -30, 6.8, 28.4, 6)]
    for x0, x1 in ((1.2, 6.8), (-6.8, -1.2)):
        cubes += bucket_seat(x0, x1, -18.5, -13.5, f + 2.3, cushion="leather", trim="tan")
        cubes.append(box("gunmetal", (x0 + x1) / 2 - 2, 28.4, -18, (x0 + x1) / 2 + 2, f + 2.3, -14))
    cubes.append(box("leather", -7, f + 1, -6, 7, f + 3.9, 0))
    cubes.append(box("gunmetal", -6, 28.4, -5.5, 6, f + 1, -0.5))
    cubes.append(box("leather", -7, f + 3.9, -0.6, 7, f + 14, 1.6,
                     rotation=(-8, 0, 0), pivot=(0, f + 3.9, 1.6)))
    cubes.append(box("matte_black", -8.4, 33, -29, 8.4, 38.4, -26))          # panel
    cubes.append(box("matte_black", -8.6, 38.4, -29.5, 8.6, 39.4, -25.2))
    for xc in (-4.2, 4.2):
        cubes.append(box("screen", xc - 2.2, 34.4, -26.1, xc + 2.2, 37.4, -25.95))
        cubes.append(box("black", xc - 2, 34.6, -25.4, xc + 2, 35.2, -24.8))       # yokes
        cubes.append(box("black", xc - 0.4, 34.6, -26, xc + 0.4, 35.2, -25))
    return cubes


# --- wing, tail ---------------------------------------------------------------------

W_Y = 51.0
SPAN = 74
ROOT_LE, ROOT_TE = -23, -2


def wing():
    cubes = []
    zs = [ROOT_LE + i * 1.5 for i in range(15)] + [ROOT_TE]
    zs = sorted(set(round(z, 2) for z in zs))
    for z0, z1 in zip(zs, zs[1:]):
        c = ((z0 + z1) / 2 - ROOT_LE) / (ROOT_TE - ROOT_LE)      # 0 leading .. 1 trailing
        h = 3.4 * math.sqrt(max(0.0, c * 1.2)) * (1 - c) ** 0.7 * 1.6 + 0.6
        h = min(h, 3.4)
        # trailing edge tapers outboard of x=40
        x_end = SPAN if z1 <= -8 else 40 + (SPAN - 40) * (ROOT_TE - z1) / 6
        x_end = min(SPAN, max(40, x_end))
        cubes.append(box("seaplane_white", -x_end, W_Y, z0, x_end, W_Y + h, z1,
                         band=(W_Y - 2, W_Y + 4), top="seaplane_skin", bottom="seaplane_skin"))
    # leading-edge stripe, tips, nav lights
    cubes += mirrored("seaplane_blue", SPAN - 2.5, SPAN, W_Y - 0.1, ROOT_LE - 0.1, W_Y + 2.6,
                      ROOT_TE - 5.5)
    cubes.append(box("nav_red", SPAN, W_Y + 0.4, -18, SPAN + 0.6, W_Y + 1.6, -15))
    cubes.append(box("nav_green", -SPAN - 0.6, W_Y + 0.4, -18, -SPAN, W_Y + 1.6, -15))
    # aileron and flap gaps on top
    for x0, x1 in ((6, 38), (40, 70)):
        cubes += mirrored("gunmetal", x0, x0 + 0.4, W_Y + 0.5, -6.5, W_Y + 1.25, -2)
        cubes += mirrored("gunmetal", x0, x1, W_Y + 0.5, -6.6, W_Y + 1.25, -6.2)
    # wing struts and jury struts
    cubes += strut("seaplane_white", (8.6, 29.5, -13), (42, W_Y, -13), t=1.0, chord=2.6)
    return cubes


def tail():
    cubes = []
    # vertical fin as y slices, swept leading edge, with a dorsal fillet
    for i in range(12):
        y0, y1 = 41.5 + 2 * i, 43.5 + 2 * i
        le = 32 + (y0 - 41.5) * 0.62
        te = 51.5 - (y0 - 41.5) * 0.05
        cubes.append(box("seaplane_white", -0.8, y0, le, 0.8, y1, te - 4.5, band=(40, 66)))
        cubes.append(box("seaplane_blue", -0.8, y0, te - 4.5, 0.8, y1, te, band=(40, 66)))
    cubes.append(box("seaplane_white", -0.9, 65.5, 46.5, 0.9, 66.6, 51))
    cubes.append(box("nav_red", -0.5, 66.6, 48, 0.5, 67.4, 49.2))
    for k in range(4):                                                     # dorsal fillet
        cubes.append(box("seaplane_white", -0.7, 40.5 + k * 0.9, 22 + k * 2.6, 0.7,
                         41.4 + k * 0.9, 34))
    # horizontal stabiliser and elevator
    for x0, x1, za in ((0, 12, 40), (12, 20, 41.5), (20, 26, 43.5)):
        cubes += mirrored("seaplane_white", x0, x1, 37.6, za, 38.8, 47.5)
        cubes += mirrored("seaplane_blue", x0, x1, 37.6, 47.5, 38.8, 52)
    cubes.append(box("white", -0.4, 40.5, 50.5, 0.4, 41.2, 52))                 # tail light
    return cubes


# --- floats --------------------------------------------------------------------------

FX = 17
F_BOT = [(-56, 7.0), (-52, 3.2), (-46, 0.8), (-40, 0), (2, 0), (2.01, 1.4), (46, 6.0)]
F_TOP = [(-56, 8.0), (-50, 9.6), (-40, 10.2), (30, 10.2), (46, 8.4)]
F_HW = [(-56, 1.0), (-52, 3.4), (-46, 4.8), (30, 4.8), (46, 2.4)]


def floats():
    cubes = []
    zs = [-56 + i for i in range(10)] + [-46 + 3 * i for i in range(16)] + [2, 2.01, 46]
    zs = sorted(set(z for z in zs if -56 <= z <= 46))
    for z0, z1 in zip(zs, zs[1:]):
        if z1 - z0 < 0.1:
            continue
        zm = (z0 + z1) / 2
        yb, yt, hw = lerp(F_BOT, zm), lerp(F_TOP, zm), lerp(F_HW, zm)
        if yt - yb < 0.8:
            continue
        # vee bottom: keel, chines, sides, rounded deck
        h = yt - yb
        layers = [(yb, yb + h * 0.12, hw * 0.35), (yb + h * 0.12, yb + h * 0.26, hw * 0.75),
                  (yb + h * 0.26, yt - 1.0, hw), (yt - 1.0, yt, hw * 0.82)]
        for y0, y1, w in layers:
            for sx in (1, -1):
                cx = sx * FX
                cubes.append(box("seaplane_float", cx - w, y0, z0, cx + w, y1, z1, band=(0, 11),
                                 top="seaplane_float_top", bottom="seaplane_float_top"))
        if -46 < zm < 30:
            cubes += mirrored("seaplane_blue", FX + hw - 0.5, FX + hw + 0.08, yt - 2.6, z0,
                              yt - 1.8, z1)
            cubes += mirrored("seaplane_blue", FX - hw - 0.08, FX - hw + 0.5, yt - 2.6, z0,
                              yt - 1.8, z1)
    for sx in (1, -1):
        cx = sx * FX
        cubes.append(box("gunmetal", cx - 0.3, 3.0, 44.5, cx + 0.3, 9.0, 48.5))     # water rudder
        for zc in (-40, 20):
            cubes.append(box("chrome", cx - 1.6, 10.2, zc - 0.4, cx + 1.6, 10.8, zc + 0.4))
        cubes.append(box("rubber", cx - 1.2, 10.2, -55, cx + 1.2, 10.4, -48))        # bow bumper
    # float struts: up and in to the fuselage, plus spreader bars
    for zc in (-31, -9):
        cubes += strut("seaplane_white", (FX - 1.5, 10.0, zc), (8.0, 27.0, zc), t=1.2, chord=2.2)
        cubes.append(box("gunmetal", -FX + 1, 9.6, zc - 0.5, FX - 1, 10.6, zc + 0.5))
    cubes += strut("gunmetal", (FX - 2, 10.0, -20), (2, 26.6, -20), t=0.5, chord=0.5)
    return cubes


def prop():
    p = (0, 34.6, -49.6)
    cubes = []
    for i, (r, l) in enumerate(((3.4, 1.6), (2.8, 1.4), (2.0, 1.4), (1.0, 1.2))):
        z = -47.6 - 1.4 * i - l / 2 + 0.6
        cubes += cylinder("seaplane_white" if i < 3 else "chrome", (0, p[1], z), r, l, "z", 4)
    for k in range(2):
        cubes.append(box("seaplane_prop", -1.4, p[1] + 2.0, p[2] - 0.35, 1.4, p[1] + 18.5,
                         p[2] + 0.35, rotation=(0, 12, 180 * k), pivot=p))
    return {"name": "prop", "parent": "root", "pivot": list(p), "cubes": cubes}


def build():
    body, glass = fuselage()
    return [
        {"name": "root", "pivot": [0, 0, 0]},
        {"name": "body", "parent": "root", "pivot": [0, 0, 0],
         "cubes": body + registration() + cowling() + cabin() + wing() + tail() + floats()},
        {"name": "glass", "parent": "root", "pivot": [0, 0, 0], "cubes": glass},
        prop(),
    ]
