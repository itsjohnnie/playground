"""Quad ATV: a lime green four-wheeler with knobbly tyres and luggage racks.

LUNA is on the front grille panel between the headlights, INDI on both side
covers under the seat.
"""
import math

from artkit import (box, mirrored, cylinder, bar, decal, material, paint, mix, rgb, scale,
                    noise, wheel_bone)

INFO = {
    "id": "quad_atv", "name": "Quad ATV", "kind": "All-terrain quad",
    "group": "Small", "mode": "land", "length": 2.25,
    "specs": [("Length", "2¼ blocks"), ("Seats", "2"), ("Wheels", "4 knobbly"),
              ("Top speed feel", "Brisk"), ("Racks", "Front and back")],
    "seats": [(0, 16.0, 2.6), (0, 16.4, 8.6)],
    "collision": (1.4, 1.2), "health": 10,
    "speed": 0.3, "step": 1.0625,
    "recipe": {"pattern": ["LSL", "IRI", "BMB"],
               "key": {"L": "minecraft:lime_dye", "S": "minecraft:saddle",
                       "I": "minecraft:iron_ingot", "R": "minecraft:redstone",
                       "B": "minecraft:iron_bars", "M": "minecraft:minecart"}},
    "recipe_text": "Minecart + Saddle + Iron + Redstone, Iron Bars racks, Lime Dye paint",
    "spawn_egg": ("#6BD43C", "#1C1D20"),
    "anim": [
        {"bone": "steer_fl", "type": "turn", "axis": "y", "k": 0.25, "max": 25},
        {"bone": "steer_fr", "type": "turn", "axis": "y", "k": 0.25, "max": 25},
        {"bone": "handlebar", "type": "turn", "axis": "y", "k": 0.25, "max": 25},
        {"bone": "wheel_fl", "type": "roll", "radius": 5.2},
        {"bone": "wheel_fr", "type": "roll", "radius": 5.2},
        {"bone": "wheel_rl", "type": "roll", "radius": 5.4},
        {"bone": "wheel_rr", "type": "roll", "radius": 5.4},
    ],
    "eggs": "LUNA on the front grille between the headlights, INDI on the side covers under the seat",
    "egg_cam": {"eye": [-26, 22, -38], "at": [0, 10, -4]},
}

FZ, RZ = -10.5, 10.5
RF, RR = 5.2, 5.4
WX = 8.2                       # wheel centre x

# --- materials ------------------------------------------------------------------
paint("quad_atv_green", "#86E84E", "#2F8A16", gloss=0.5)
paint("quad_atv_rim", "#7A828C", "#2E3339", gloss=0.5)
paint("quad_atv_spring", "#FF3B30", "#8E0C08", gloss=0.5)


def _grille(u, v):
    """Black front panel, slotted."""
    c = mix(rgb("#2C2F34"), rgb("#121316"), v)
    if (v * 64 / 6) % 1 < 0.18:
        c = rgb("#060708")
    return scale(c, noise(0.03))


def _cover(u, v):
    c = mix(rgb("#86E84E"), rgb("#2F8A16"), v ** 1.3)
    if v > 0.82:
        c = rgb("#1C1D20")
    elif v > 0.76:
        c = rgb("#F4F4F4")
    return scale(c, noise(0.02))


def _seat(u, v):
    c = mix(rgb("#3C3E43"), rgb("#1A1B1E"), v ** 1.5)
    return scale(c, noise(0.06))


def _grip(u, v):
    """Dark diamond-plate tread for the footwells, a tile."""
    d = ((u * 64) % 2 < 1) ^ ((v * 64) % 2 < 1)
    return scale(rgb("#3A3D42") if d else rgb("#202226"), noise(0.03))


def _wbox(word, w, h, fill=0.8, cy=0.5):
    cols = len(word) * 7 - 1
    bh = w * fill * 7 / (cols * h)
    bw = fill
    if bh > 0.6:
        bh, bw = 0.6, 0.6 * cols * h / (7 * w)
    return ((1 - bw) / 2, cy - bh / 2, bw, bh)


material("quad_atv_grille", _grille)
material("quad_atv_cover", _cover)
material("quad_atv_seat", _seat)
material("quad_atv_grip", _grip, "tile")
material("quad_atv_flat", lambda u, v: scale(mix(rgb("#7EDC48"), rgb("#6CC83A"), v), noise(0.02)))
decal("quad_atv_luna", "LUNA", "#9BFF5C", "quad_atv_grille", box=_wbox("LUNA", 6.8, 2.6, 0.84))
decal("quad_atv_indi", "INDI", "#1C1D20", "quad_atv_cover", box=_wbox("INDI", 6.0, 3.6, 0.7, 0.4))


# --- helpers ----------------------------------------------------------------------

def ring(mat, x0, x1, c, r_out, t, n=20, a0=0, a1=360, **kw):
    """Ring segments in the y-z plane around c = (y, z). Angle 0 is straight up,
    positive angles run forwards (-z)."""
    cy, cz = c
    step = (a1 - a0) / n
    half = (r_out - t / 2) * math.tan(math.radians(abs(step)) / 2) + 0.06
    return [box(mat, x0, cy + r_out - t, cz - half, x1, cy + r_out, cz + half,
                rotation=(a0 + step * (k + 0.5), 0, 0), pivot=(0, cy, cz), **kw) for k in range(n)]


def tube(mat, pts, t=0.7):
    return [bar(mat, a, b, t) for a, b in zip(pts, pts[1:])]


def mx(pts):
    return [(-x, y, z) for x, y, z in pts]


# --- parts ------------------------------------------------------------------------

def knobbly(name, center, r, width, parent):
    cx, cy, cz = center
    w = wheel_bone(name, center, r - 0.55, width, parent=parent, tire="rubber", rim="quad_atv_rim",
                   rim_ratio=0.66, n=8)
    n = 22
    for k in range(n):
        a = 360 * k / n
        off = 0.55 if k % 2 else -0.55               # chevron: rows offset in turn
        for x0, x1 in ((cx - width / 2, cx + off - 0.2), (cx + off + 0.2, cx + width / 2)):
            w["cubes"].append(box("tire", x0, cy + r - 0.75, cz - 0.55, x1, cy + r, cz + 0.55,
                                  rotation=(a, 0, 0), pivot=(cx, cy, cz)))
    # deep dished rim: bead ring and lug nuts
    side = 1 if cx > 0 else -1
    face = cx + side * (width / 2 + 0.15)
    w["cubes"] += cylinder("gunmetal", (face, cy, cz), r * 0.4, 0.3, "x", 6)
    for k in range(4):
        a = math.pi / 2 * k + math.pi / 4
        y, z = cy + 1.0 * math.sin(a), cz + 1.0 * math.cos(a)
        w["cubes"].append(box("chrome", face - 0.25, y - 0.25, z - 0.25, face + 0.25, y + 0.25, z + 0.25))
    return w


def front_corner(side, sgn):
    kx = 5.6 * sgn
    steer = {"name": f"steer_{side}", "parent": "root", "pivot": [kx, RF, FZ], "cubes": [
        box("gunmetal", kx - 0.6, RF - 1.6, FZ - 0.8, kx + 0.6, RF + 1.8, FZ + 0.8),
        bar("steel", (kx, RF, FZ), (WX * sgn, RF, FZ), 0.7),
        bar("gunmetal", (kx, RF + 1.2, FZ), (kx - 0.2 * sgn, RF + 1.4, FZ + 2.0), 0.5),
    ]}
    return [steer, knobbly(f"wheel_{side}", (WX * sgn, RF, FZ), RF, 3.8, f"steer_{side}")]


def frame_and_suspension():
    c = []
    fr = "matte_black"
    for sgn in (1, -1):
        x = 2.6 * sgn
        # main frame loop
        c += tube(fr, [(x, 5.0, -15.0), (x, 4.2, -6.0), (x, 4.2, 8.0), (x, 6.0, 15.0)], 0.9)
        c += tube(fr, [(x, 13.0, -15.0), (x, 12.6, -6.0), (x * 0.9, 12.6, 6.0), (x, 12.0, 15.6)], 0.8)
        c += tube(fr, [(x, 5.0, -15.0), (x, 13.0, -15.0)], 0.8)
        c += tube(fr, [(x, 4.2, -6.0), (x, 12.6, -6.0)], 0.7)
        # front double wishbones up to the knuckle
        kx = 5.6 * sgn
        for y0, y1 in ((4.6, RF - 1.4), (8.4, RF + 1.6)):
            c.append(bar("matte_black", (x, y0, FZ - 1.4), (kx, y1, FZ), 0.55))
            c.append(bar("matte_black", (x, y0, FZ + 1.4), (kx, y1, FZ), 0.55))
        # coil-over shock: body, red spring, top mount
        lo, hi = (4.6 * sgn, RF - 0.8, FZ + 0.6), (2.8 * sgn, 13.2, FZ + 1.2)
        c.append(bar("chrome", lo, hi, 0.5))
        for k in range(6):
            t = 0.25 + k * 0.1
            p = tuple(a + (b - a) * t for a, b in zip(lo, hi))
            q = tuple(a + (b - a) * (t + 0.055) for a, b in zip(lo, hi))
            c.append(bar("quad_atv_spring", p, q, 1.4))
        # footrest frame and nerf bar
        c += tube("steel", [(x, 6.4, -4.4), (9.2 * sgn, 6.6, -4.0), (9.4 * sgn, 6.8, 4.0), (x, 6.4, 4.6)], 0.6)
    # rear swingarm, solid axle, carrier and the rear shock
    c.append(box("aluminium", -2.2, 5.4, -0.6, 2.2, 7.2, 1.2))
    for sgn in (1, -1):
        c.append(bar("aluminium", (2.0 * sgn, 6.3, 0.4), (2.2 * sgn, RR + 0.4, RZ - 1.0), 1.3))
    c.append(box("gunmetal", -2.8, RR - 1.4, RZ - 1.6, 2.8, RR + 1.4, RZ + 1.4))
    c += cylinder("steel", (0, RR, RZ), 0.65, 2 * WX - 1.0, "x", 3)
    c += cylinder("steel", (-2.0, RR, RZ), 2.4, 0.2, "x", 6)
    c += cylinder("gunmetal", (2.0, RR, RZ), 2.2, 0.3, "x", 6)
    lo, hi = (0, RR + 1.4, RZ - 2.4), (0, 12.6, 3.4)
    c.append(bar("chrome", lo, hi, 0.6))
    for k in range(6):
        t = 0.25 + k * 0.1
        p = tuple(a + (b - a) * t for a, b in zip(lo, hi))
        q = tuple(a + (b - a) * (t + 0.055) for a, b in zip(lo, hi))
        c.append(bar("quad_atv_spring", p, q, 1.5))
    # engine and its exhaust
    c.append(box("gunmetal", -2.3, 4.4, -5.0, 2.3, 10.4, 3.6))
    c += cylinder("aluminium", (2.45, 7.2, -1.0), 2.0, 0.4, "x", 6)
    c += cylinder("gunmetal", (-2.45, 7.2, -1.4), 2.3, 0.4, "x", 6)
    for k in range(4):
        c.append(box("aluminium" if k % 2 == 0 else "gunmetal", -1.9 + 0.15 * (k % 2), 10.4 + k * 0.6,
                     -4.6, 1.9 - 0.15 * (k % 2), 11.0 + k * 0.6, -1.6))
    c.append(box("matte_black", -1.6, 4.0, -4.4, 1.6, 4.6, 2.6))
    c += tube("steel", [(-1.2, 11.2, -4.8), (-2.8, 10.0, -6.0), (-3.4, 8.4, -3.0), (-3.6, 9.6, 3.0),
                        (-3.8, 10.6, 9.0)], 1.0)
    c += cylinder("aluminium", (-3.8, 10.8, 13.4), 1.25, 9.0, "z", 4)
    c += cylinder("carbon", (-3.8, 10.8, 18.0), 1.0, 0.6, "z", 4)
    c += cylinder("matte_black", (-3.8, 10.8, 18.3), 0.45, 0.3, "z", 3)
    return c


def bodywork():
    c = []
    g = "quad_atv_green"
    # front fenders arch over the wheels, joined by the nose and the hood
    for sgn in (1, -1):
        x0, x1 = 4.6 * sgn, 10.8 * sgn
        c += ring("quad_atv_flat", x0, x1, (RF, FZ), RF + 1.7, 0.6, n=11, a0=-50, a1=82)
        c += ring("matte_black", 10.7 * sgn, 11.1 * sgn, (RF, FZ), RF + 1.75, 0.5, n=11, a0=-50, a1=82)
        c += ring("quad_atv_flat", x0, x1, (RR, RZ), RR + 1.7, 0.6, n=11, a0=-82, a1=45)
        c += ring("matte_black", 10.7 * sgn, 11.1 * sgn, (RR, RZ), RR + 1.75, 0.5, n=11, a0=-82, a1=45)
        # footwell floor between the fenders
        c.append(box("matte_black", 3.6 * sgn, 6.6, -4.6, 9.0 * sgn, 7.2, 4.8, top="quad_atv_grip"))
        c.append(box("matte_black", 8.6 * sgn, 6.6, -4.6, 9.2 * sgn, 9.0, 4.8))
        # side cover under the seat with INDI
        c.append(box("quad_atv_cover", 3.4 * sgn, 9.2, -1.0, 4.0 * sgn, 13.4, 6.0,
                     sides="quad_atv_indi"))
    # nose, hood and front deck
    c.append(box(g, -5.0, 9.0, -17.4, 5.0, 13.6, -12.0, band=(9.0, 14.4), top="quad_atv_flat"))
    c.append(box(g, -6.0, 12.4, -16.4, 6.0, 14.2, -4.0, band=(9.0, 14.4), top="quad_atv_flat"))
    c.append(box("quad_atv_grille", -3.4, 8.8, -17.65, 3.4, 11.4, -17.3, fore="quad_atv_luna"))
    c.append(box(g, -5.0, 9.0, -17.8, 5.0, 9.4, -17.3))
    for sgn in (1, -1):
        c.append(box("headlight", 3.6 * sgn, 11.4, -17.7, 5.4 * sgn, 13.0, -17.2,
                     rotation=(0, 12 * sgn, 0), pivot=(4.5 * sgn, 12.2, -17.4)))
        c.append(box("matte_black", 3.4 * sgn, 11.2, -17.5, 5.6 * sgn, 13.2, -17.1,
                     rotation=(0, 12 * sgn, 0), pivot=(4.5 * sgn, 12.2, -17.4)))
        c.append(box("amber", 4.6 * sgn, 10.2, -17.3, 5.2 * sgn, 10.8, -16.9))
    # tank cover and seat
    c.append(box(g, -3.8, 12.6, -5.0, 3.8, 15.4, 0.2, band=(12.6, 15.6), top="quad_atv_flat"))
    c.append(box("matte_black", -0.8, 15.4, -3.4, 0.8, 15.8, -1.8))
    c.append(box("quad_atv_seat", -3.6, 13.4, -0.4, 3.6, 16.0, 6.4))
    c.append(box("quad_atv_seat", -3.4, 13.6, 6.4, 3.4, 16.4, 11.6))
    c.append(box("matte_black", -3.9, 12.6, -0.6, 3.9, 13.6, 11.8))
    c += mirrored("quad_atv_green", 3.6, 3.75, 13.6, -0.2, 14.0, 6.2)            # seat piping
    # rear deck
    c.append(box(g, -6.0, 12.0, 6.0, 6.0, 13.6, 17.6, band=(9.0, 14.4), top="quad_atv_flat"))
    c.append(box("matte_black", -4.6, 8.4, 16.4, 4.6, 12.0, 17.4))
    c.append(box("taillight", -2.0, 10.4, 17.4, 2.0, 11.6, 17.7))
    return c


def racks_and_bars():
    c = []
    bl = "matte_black"
    # front rack: a frame of tubes on posts above the hood
    y = 15.4
    c += tube(bl, [(-6.6, y, -17.0), (6.6, y, -17.0), (6.6, y, -6.4), (-6.6, y, -6.4), (-6.6, y, -17.0)], 0.6)
    for x in (-3.3, 0, 3.3):
        c.append(bar(bl, (x, y, -17.0), (x, y, -6.4), 0.45))
    for z in (-13.4, -9.8):
        c.append(bar(bl, (-6.6, y, z), (6.6, y, z), 0.45))
    for x, z in ((-5.2, -16.4), (5.2, -16.4), (-5.2, -7.0), (5.2, -7.0)):
        c.append(bar(bl, (x, 13.8, z), (x, y, z), 0.5))
    # rear rack
    c += tube(bl, [(-7.4, y + 0.6, 10.0), (7.4, y + 0.6, 10.0), (7.4, y + 0.6, 18.0), (-7.4, y + 0.6, 18.0),
                   (-7.4, y + 0.6, 10.0)], 0.6)
    for x in (-3.7, 0, 3.7):
        c.append(bar(bl, (x, y + 0.6, 12.0), (x, y + 0.6, 18.0), 0.45))
    for z in (14.0, 16.0):
        c.append(bar(bl, (-7.4, y + 0.6, z), (7.4, y + 0.6, z), 0.45))
    for x, z in ((-5.6, 11.0), (5.6, 11.0), (-5.6, 17.4), (5.6, 17.4)):
        c.append(bar(bl, (x, 13.6, z), (x, y + 0.6, z), 0.5))
    # front bumper / brush guard and rear grab bar with tow hitch
    c += tube(bl, [(-4.2, 5.6, -15.6), (-4.8, 6.6, -19.0), (4.8, 6.6, -19.0), (4.2, 5.6, -15.6)], 0.8)
    c += tube(bl, [(-2.6, 6.6, -19.0), (-2.4, 8.8, -17.8)], 0.6)
    c += tube(bl, [(2.6, 6.6, -19.0), (2.4, 8.8, -17.8)], 0.6)
    c.append(box("aluminium", -3.6, 3.6, -17.0, 3.6, 4.2, -6.0))                # skid plate
    c += tube(bl, [(-4.0, 8.0, 15.0), (-4.2, 8.0, 18.8), (4.2, 8.0, 18.8), (4.0, 8.0, 15.0)], 0.7)
    c.append(box("steel", -0.6, 7.6, 18.6, 0.6, 8.4, 20.0))
    return c


def handlebar():
    hub = (0, 15.8, -5.6)
    c = [bar("steel", (0, 12.6, -4.6), (0, 17.6, -6.2), 0.8)]
    c.append(box("matte_black", -1.4, 17.2, -7.0, 1.4, 18.6, -5.2))          # bar clamp + pod
    c.append(box("screen", -1.0, 18.0, -5.25, 1.0, 18.5, -5.1))
    c.append(box("headlight", -0.9, 17.4, -7.1, 0.9, 18.2, -6.95))
    c += tube("steel", [(-7.6, 18.6, -5.2), (-4.0, 18.0, -6.2), (4.0, 18.0, -6.2), (7.6, 18.6, -5.2)], 0.6)
    for sgn in (1, -1):
        c.append(bar("rubber", (6.0 * sgn, 18.4, -5.6), (8.4 * sgn, 18.8, -4.9), 0.9))
        c.append(bar("aluminium", (4.2 * sgn, 18.4, -6.6), (7.6 * sgn, 18.6, -7.4), 0.3))
        c.append(box("matte_black", 4.0 * sgn - 0.6, 17.6, -6.8, 4.0 * sgn + 0.6, 18.6, -5.6))
        c.append(box("matte_black", 3.0 * sgn - 0.2, 17.6, -6.6, 6.6 * sgn, 19.4, -6.0,
                     rotation=(0, 0, 0)))                                     # hand guards
    return {"name": "handlebar", "parent": "root", "pivot": list(hub), "cubes": c}


def build():
    bones = [
        {"name": "root", "pivot": [0, 0, 0]},
        {"name": "chassis", "parent": "root", "pivot": [0, 0, 0],
         "cubes": frame_and_suspension() + bodywork() + racks_and_bars()},
        handlebar(),
    ]
    bones += front_corner("fl", 1) + front_corner("fr", -1)
    bones += [knobbly("wheel_rl", (WX, RR, RZ), RR, 4.6, "root"),
              knobbly("wheel_rr", (-WX, RR, RZ), RR, 4.6, "root")]
    return bones
