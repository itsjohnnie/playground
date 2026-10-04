"""Farm tractor: a classic green-and-yellow tractor with a glass cab and a tiller.

Huge chevron-lugged rear tyres, small front tyres, a long bonnet with the
exhaust stack and air-cleaner bowl, a rear 3-point hitch carrying a rotary
tiller whose rotor spins as it drives (it tills grass into farmland).
LUNA is painted in yellow on both sides of the bonnet.
"""
import math

from artkit import (box, mirrored, cylinder, bar, decal, material, paint,
                    steering_wheel, mix, rgb, glint, scale, noise)

INFO = {
    "id": "farm_tractor", "name": "Farm Tractor", "kind": "Tractor with tiller",
    "group": "Land", "mode": "land", "length": 3,
    "specs": [("Length", "3¼ blocks"), ("Height", "2 blocks"), ("Seats", "2"),
              ("Job", "Tills grass into farmland")],
    "seats": [(0.0, 15.2, 10.0), (-4.0, 14.4, 5.0)],
    "collision": (1.6, 2.0), "health": 16,
    "speed": 0.16, "step": 1.0625,
    "script": "till",
    "recipe": {"shapeless": ["minecraft:minecart", "minecraft:iron_hoe",
                             "minecraft:green_dye", "minecraft:yellow_dye"]},
    "recipe_text": "Minecart + Iron Hoe + Green Dye + Yellow Dye",
    "spawn_egg": ("#2F8A2E", "#FFD21F"),
    "anim": [
        {"bone": "wheel_fl", "type": "roll", "radius": 5.0},
        {"bone": "wheel_fr", "type": "roll", "radius": 5.0},
        {"bone": "wheel_rl", "type": "roll", "radius": 10.0},
        {"bone": "wheel_rr", "type": "roll", "radius": 10.0},
        {"bone": "steer_fl", "type": "turn", "axis": "y", "k": 0.25, "max": 25},
        {"bone": "steer_fr", "type": "turn", "axis": "y", "k": 0.25, "max": 25},
        {"bone": "rotor", "type": "roll", "radius": 1.2},
        {"bone": "body", "type": "turn", "axis": "z", "k": 0.03, "max": 2},
    ],
    "eggs": "LUNA in yellow on both sides of the green bonnet",
    "egg_cam": {"eye": [-46, 17, -28], "at": [0, 11.5, -11]},
}

# --- materials ----------------------------------------------------------------------

G, Y = "farm_tractor_green", "farm_tractor_yellow"
paint(G, "#45A341", "#2E7A2B", gloss=0.25)
paint(Y, "#FFD62A", "#E2A90A", gloss=0.3)


def _tread(u, v):
    """Tyre tread between the lugs: a faint chevron moulded into the rubber."""
    c = rgb("#1E1F22")
    if ((v + abs(u - 0.5) * 1.1) * 2) % 1 < 0.35:
        c = rgb("#2A2B2F")
    return scale(c, noise(0.06))


def _sidewall(u, v):
    p = abs(u - 0.5) * 2                     # radial: identical where strips overlap
    if p > 0.94:
        return rgb("#2E2F33")
    if 0.76 < p < 0.8:
        return rgb("#3B3D42")
    return rgb("#1C1D20")


def _rim_face(u, v):
    """Yellow wheel centre: dished, with a darker ring and a bright lip."""
    p = abs(u - 0.5) * 2
    if p > 0.9:
        return rgb("#FFE36A")
    if 0.55 < p < 0.62:
        return rgb("#C99606")
    if p < 0.3:
        return rgb("#F0B812")
    return mix(rgb("#FFD62A"), rgb("#E8AE0C"), p)


def _grille(u, v):
    if u < 0.06 or u > 0.94 or v < 0.04 or v > 0.96:
        return rgb("#FFD62A")
    if (v * 14) % 1 < 0.35:
        return rgb("#3A3D42")
    return rgb("#0D0E10")


def _weights(u, v):
    if (u * 8) % 1 < 0.1:
        return rgb("#0E0F11")
    return mix(rgb("#3B3E44"), rgb("#1D1F23"), v)


def _seat(u, v):
    c = mix(rgb("#FFD62A"), rgb("#D9A20A"), v)
    if (v * 5) % 1 < 0.08:
        c = rgb("#9C7400")
    return c


material("farm_tractor_tread", _tread)
material("farm_tractor_sidewall", _sidewall)
material("farm_tractor_rim", _rim_face)
material("farm_tractor_grille", _grille)
material("farm_tractor_weights", _weights)
material("farm_tractor_seat", _seat)
decal("farm_tractor_luna", "LUNA", "#FFE04A", G, box=(0.1, 0.24, 0.8, 0.42), underline="#FFE04A")

# --- layout ------------------------------------------------------------------------------

RR, RW, RZ, RX = 10.0, 6.0, 9.0, 9.7          # rear tyre radius, width, axle z, centre x
FR, FW, FZ, FX = 5.0, 3.2, -14.0, 6.3         # front tyre
HOOD_F, HOOD_R = -21.5, 0.0
HOOD_W, HOOD_TOP, HOOD_BOT = 4.6, 16.2, 8.0
CAB_F, CAB_R, CAB_W = 0.0, 16.0, 6.2
FLOOR, ROOF = 11.5, 29.6
BAND = (4.0, 17.0)


def hood():
    out = []
    zf, zr = HOOD_F, HOOD_R
    layers = [(HOOD_W, HOOD_BOT, 14.8), (HOOD_W - 0.4, 14.8, 15.6), (HOOD_W - 1.2, 15.6, HOOD_TOP)]
    for w, y0, y1 in layers:
        out.append(box(G, -w, y0, zf, w, y1, zr, band=BAND))
    out.append(box(G, -HOOD_W + 1.2, HOOD_TOP - 0.6, zf - 0.4, HOOD_W - 1.2, HOOD_TOP - 0.1,
                   zf, band=BAND))
    # grille, headlights and the yellow pinstripes
    out.append(box("farm_tractor_grille", -HOOD_W + 0.5, HOOD_BOT + 0.4, zf - 0.3,
                   HOOD_W - 0.5, 15.2, zf + 0.1))
    out += mirrored("headlight", 2.0, 3.8, 13.0, zf - 0.5, 14.5, zf - 0.2)
    out += mirrored("chrome", 1.8, 4.0, 12.8, zf - 0.35, 14.7, zf - 0.25)
    out += mirrored(Y, HOOD_W, HOOD_W + 0.06, 14.2, zf, 14.55, zr)
    out += mirrored(Y, HOOD_W, HOOD_W + 0.06, HOOD_BOT + 0.3, zf, HOOD_BOT + 0.6, zr)
    # LUNA in yellow on both sides of the bonnet, and a row of cooling louvres behind it
    xs = HOOD_W
    out += mirrored(G, xs - 0.05, xs + 0.06, 9.4, -19.6, 13.8, -9.4, sides="farm_tractor_luna")
    for z in range(-8, -1, 1):
        out += mirrored("matte_black", xs - 0.05, xs + 0.08, 10.0, z, 13.2, z + 0.45)
    # engine, frame and front axle beneath
    out.append(box("gunmetal", -3.4, 4.6, -19.5, 3.4, HOOD_BOT, -1.0))
    out += mirrored("matte_black", 2.4, 3.6, 3.6, -24.0, 7.0, 4.0)
    out.append(box("matte_black", -FX + FW / 2, FR - 0.7, FZ - 0.7, FX - FW / 2, FR + 0.7, FZ + 0.7))
    out += cylinder("gunmetal", (0, FR + 0.3, FZ), 1.2, 2.0, "z", 3)
    # front weights
    out.append(box("farm_tractor_weights", -5.0, 5.4, -24.6, 5.0, 10.6, zf - 0.1, top="black"))
    out.append(box("matte_black", -1.0, 10.6, -24.0, 1.0, 11.8, -22.2))
    out.append(box(Y, -5.2, 4.6, -24.8, 5.2, 5.4, -21.0))
    return out


def stack_and_intake():
    out = []
    x, z = 2.3, -6.5                                          # exhaust stack
    out += cylinder("matte_black", (x, HOOD_TOP + 0.3, z), 1.0, 0.6, "y", 4)
    out += cylinder("black", (x, 21.5, z), 0.6, 10.5, "y", 4)
    out += cylinder("chrome", (x, 20.0, z), 0.85, 4.5, "y", 4)
    out.append(box("black", x - 0.7, 26.6, z - 0.7, x + 0.7, 26.9, z + 0.8,
                   rotation=(-20, 0, 0), pivot=(x, 26.7, z + 0.7)))     # rain flap
    out += cylinder("matte_black", (-2.3, HOOD_TOP + 0.3, -6.5), 1.2, 0.6, "y", 4)
    out += cylinder("black", (-2.3, 20.4, -6.5), 1.3, 0.6, "y", 4)    # lid of the bowl
    return out


def intake_glass():
    cubes = cylinder("glass", (-2.3, 18.3, -6.5), 1.1, 3.6, "y", 4)
    return {"name": "glass_bowl", "parent": "body", "pivot": [-2.3, 18, -6.5], "cubes": cubes}


def chassis():
    out = []
    out.append(box(G, -4.4, 4.6, CAB_F - 0.5, 4.4, FLOOR, 19.2, band=BAND))   # transmission
    out += cylinder("gunmetal", (0, RR, RZ), 2.4, 2 * (RX - RW / 2), "x", 4)  # rear axle
    out += cylinder(G, (0, RR, RZ), 3.2, 8.8, "x", 4)
    out.append(box("matte_black", -CAB_W, FLOOR - 0.6, CAB_F, CAB_W, FLOOR, CAB_R,
                   top="rubber"))                                              # cab floor
    out.append(box("matte_black", -2.2, 3.6, 18.6, 2.2, 5.0, 22.0))            # drawbar
    for y in (4.0, 7.2, 10.4):                                                 # steps
        out.append(box("steel", CAB_W - 0.2, y, CAB_F - 2.6, CAB_W + 2.2, y + 0.5, CAB_F - 0.4))
    out.append(box("matte_black", CAB_W + 1.8, 3.6, CAB_F - 2.6, CAB_W + 2.3, FLOOR, CAB_F - 2.1))
    out.append(box("matte_black", CAB_W + 1.8, 3.6, CAB_F - 0.9, CAB_W + 2.3, FLOOR, CAB_F - 0.4))
    out.append(box(G, -4.6, FLOOR, CAB_F - 0.6, 4.6, HOOD_TOP, CAB_F + 0.6, band=BAND))  # firewall
    return out


def fenders():
    """Curved mudguards over the rear wheels, made of short turned panels."""
    out = []
    r = RR + 1.0
    n = 13
    a0, a1 = -72, 62                         # degrees: + is toward the front
    step = (a1 - a0) / n
    seg = 2 * r * math.tan(math.radians(step / 2)) + 0.12
    for k in range(n):
        a = a0 + step * (k + 0.5)
        for s in (1, -1):
            x0, x1 = s * (RX - RW / 2 - 0.5), s * (RX + RW / 2 + 0.6)
            out.append(box(G, x0, RR + r, RZ - seg / 2, x1, RR + r + 0.6, RZ + seg / 2,
                           rotation=(a, 0, 0), pivot=(0, RR, RZ), top=G))
            out.append(box(Y, s * (RX + RW / 2 + 0.6), RR + r - 0.2, RZ - seg / 2,
                           s * (RX + RW / 2 + 0.9), RR + r + 0.8, RZ + seg / 2,
                           rotation=(a, 0, 0), pivot=(0, RR, RZ)))
    # fender inner walls between the wheels and the cab, and the rear lights
    out += mirrored(G, CAB_W, RX - RW / 2 - 0.4, FLOOR, CAB_F + 0.4, RR + r - 0.6, CAB_R - 0.4,
                    band=(FLOOR, RR + r))
    for s in (1, -1):
        a = math.radians(-58)
        zl, yl = RZ - r * math.sin(a) + 0.2, RR + r * math.cos(a)
        out.append(box("taillight", s * (RX + 1.0), yl, zl, s * (RX + 2.6), yl + 1.2, zl + 0.5))
        out.append(box("amber", s * (RX - 1.0), yl, zl, s * (RX + 0.6), yl + 1.2, zl + 0.5))
    return out


def cab():
    out = []
    w, f, r = CAB_W, CAB_F, CAB_R
    for x0, x1 in ((w - 0.8, w),):                            # corner posts
        for z0, z1 in ((f, f + 0.8), (r - 0.8, r)):
            out += mirrored("matte_black", x0, x1, FLOOR, z0, ROOF, z1)
    out += mirrored("matte_black", w - 0.6, w, FLOOR, 7.6, ROOF, 8.2)   # door hinge post
    out += mirrored("matte_black", w - 0.7, w, 20.8, f, 21.3, r)        # rails
    out.append(box("matte_black", -w, 20.8, r - 0.7, w, 21.3, r))
    out.append(box("matte_black", -w, ROOF - 0.6, f, w, ROOF, r))
    out += mirrored("chrome", w, w + 0.3, 17.5, 6.6, 18.0, 7.4)         # door handle
    # roof: green with a white top, work lights and a beacon
    out.append(box(G, -8.2, ROOF, f - 1.8, 8.2, ROOF + 1.2, r + 1.2, band=(ROOF - 3, ROOF + 1.2),
                   top="white"))
    out.append(box("white", -7.6, ROOF + 1.2, f - 1.2, 7.6, ROOF + 1.6, r + 0.6))
    out += mirrored("headlight", 4.4, 6.8, ROOF + 0.1, f - 1.95, ROOF + 1.0, f - 1.75)
    out += mirrored("headlight", 4.4, 6.8, ROOF + 0.1, r + 1.15, ROOF + 1.0, r + 1.35)
    out += cylinder("matte_black", (-5.2, ROOF + 1.9, r - 2.0), 0.9, 0.6, "y", 4)
    out += cylinder("amber", (-5.2, ROOF + 2.7, r - 2.0), 0.75, 1.2, "y", 4)
    out.append(box("amber", -5.5, ROOF + 3.2, r - 2.3, -4.9, ROOF + 3.6, r - 1.7))
    # mirrors on arms
    for s in (1, -1):
        out.append(bar("matte_black", (s * w, 26.0, f + 0.6), (s * (w + 3.0), 25.0, f - 0.4), 0.35))
    out += mirrored("matte_black", w + 2.7, w + 3.4, 22.6, f - 0.9, 25.6, f + 0.1, aft="chrome")
    return out


def cab_glass():
    w, f, r = CAB_W, CAB_F, CAB_R
    cubes = [
        box("glass", -w + 0.8, HOOD_TOP, f + 0.2, w - 0.8, ROOF - 0.6, f + 0.4),
        box("glass", -w + 0.8, FLOOR + 1.0, r - 0.5, w - 0.8, ROOF - 0.6, r - 0.3),
        *mirrored("glass", w - 0.5, w - 0.3, FLOOR + 1.0, f + 0.8, ROOF - 0.6, r - 0.8),
    ]
    return {"name": "glass", "parent": "body", "pivot": [0, FLOOR, f], "cubes": cubes}


def interior():
    out = []
    f = FLOOR
    out.append(box("matte_black", -3.0, f, CAB_F + 0.6, 3.0, 17.4, CAB_F + 2.6, top="black"))  # dash
    out.append(box("screen", -1.6, 16.2, CAB_F + 2.55, 1.6, 17.2, CAB_F + 2.65))
    out.append(box("black", -0.4, 16.5, CAB_F + 2.4, 0.4, 19.6, CAB_F + 3.4,
                   rotation=(-30, 0, 0)))                                                  # column
    # the driver's seat on its suspension post, armrest console with levers
    out.append(box("gunmetal", -1.0, f, 8.8, 1.0, 13.6, 11.0))
    out.append(box("farm_tractor_seat", -2.6, 13.6, 8.0, 2.6, 15.2, 12.0, top="farm_tractor_seat"))
    out.append(box("farm_tractor_seat", -2.6, 15.0, 11.4, 2.6, 21.6, 12.6,
                   rotation=(-10, 0, 0), pivot=(0, 15, 12.6)))
    out.append(box("matte_black", -2.9, 13.6, 8.0, -2.6, 16.2, 12.0))
    out.append(box("matte_black", 2.6, 13.6, 8.0, 3.6, 16.6, 12.4, top="black"))
    for k, z in enumerate((8.6, 9.8, 11.0)):
        out.append(box("black", 3.0, 16.6, z, 3.2, 18.4, z + 0.2))
        out.append(box("red" if k != 1 else Y, 2.8, 18.4, z - 0.2, 3.4, 18.9, z + 0.4))
    # fold-down buddy seat
    out.append(box("matte_black", -5.4, 13.0, 3.6, -2.8, 14.4, 6.6, top="dark_leather"))
    out.append(box("dark_leather", -5.4, 14.4, 6.2, -2.8, 18.2, 6.8))
    return out


def hitch_and_tiller():
    """The 3-point linkage and a rotary tiller; the rotor is its own bone."""
    out = []
    zt0, zt1 = 22.6, 28.6
    # linkage
    for s in (1, -1):
        out.append(bar("matte_black", (s * 3.2, 6.2, 18.6), (s * 5.2, 4.4, zt0 + 0.4), 0.6))
        out.append(bar("matte_black", (s * 4.2, 11.4, 17.2), (s * 4.6, 5.6, 20.6), 0.4))  # lift rods
        out.append(bar("matte_black", (s * 2.8, 12.2, 15.8), (s * 4.2, 11.4, 17.4), 0.6))
    out.append(bar("gunmetal", (0, 12.4, 18.8), (0, 10.4, zt0 + 0.6), 0.7))              # top link
    out.append(bar("steel", (0, 6.4, 19.0), (0, 8.0, zt0 + 0.6), 0.45))                   # PTO shaft
    out.append(box(Y, -0.7, 6.0, 18.6, 0.7, 7.2, 19.4))
    # tiller: A-frame, gearbox, hood, side plates and a rear shield
    out.append(bar("red", (-4.6, 6.4, zt0 + 0.5), (0, 10.8, zt0 + 0.6), 0.6))
    out.append(bar("red", (4.6, 6.4, zt0 + 0.5), (0, 10.8, zt0 + 0.6), 0.6))
    out.append(box("gunmetal", -1.6, 6.4, zt0 + 0.2, 1.6, 9.0, zt0 + 3.0))
    out.append(box("red", -10.6, 5.4, zt0, 10.6, 6.6, zt1, top="red"))
    out.append(box("red", -10.6, 2.4, zt0, 10.6, 5.6, zt0 + 0.5))
    out.append(box("red", -10.6, 2.0, zt1 - 0.6, 10.6, 5.6, zt1, rotation=(12, 0, 0),
                   pivot=(0, 5.6, zt1 - 0.3)))
    out += mirrored("red", 10.2, 10.8, 0.9, zt0, 6.6, zt1)
    out += mirrored("matte_black", 10.8, 11.1, 0.8, zt0 + 1.0, 1.4, zt1 - 1.0)            # skids
    out.append(box(Y, -10.7, 6.6, zt0 + 0.4, 10.7, 6.85, zt0 + 0.9))
    out.append(box("farm_tractor_weights", -3.0, 6.6, zt0 + 3.4, 3.0, 7.4, zt1 - 0.8))
    return out


def rotor():
    c = (0, 2.4, 25.6)
    cubes = cylinder("gunmetal", c, 0.6, 20.0, "x", 3)
    for i, x in enumerate(range(-9, 10, 2)):
        for k in range(4):
            a = 90 * k + (45 if i % 2 else 0)
            cubes.append(box("steel", x - 0.15, c[1], c[2] - 0.2, x + 0.15, c[1] + 2.25, c[2] + 0.2,
                             rotation=(a, 0, 0), pivot=c))
            cubes.append(box("steel", x - 0.15, c[1] + 1.8, c[2] - 0.2, x + 0.75, c[1] + 2.25, c[2] + 0.2,
                             rotation=(a, 0, 0), pivot=c))
    return {"name": "rotor", "parent": "body", "pivot": list(c), "cubes": cubes}


def wheel(name, center, r, width, parent, side, n, lugs=0, rim_ratio=0.6):
    """A tractor wheel in its own bone: tread, radial sidewall and rim faces, nuts and lugs.

    The side faces use radial materials, which look the same wherever the
    turned strips overlap, so nothing flickers.
    """
    cx, cy, cz = center
    out = cylinder("farm_tractor_tread", center, r, width, "x", n, sides="farm_tractor_sidewall")
    rr = r * rim_ratio
    out += cylinder(Y, center, rr, width + 0.12, "x", n, sides="farm_tractor_rim")
    xo = cx + side * (width / 2 + 0.06)
    for k in range(8 if r > 6 else 5):
        a = 2 * math.pi * k / (8 if r > 6 else 5)
        rad = rr * 0.42
        y, z = cy + rad * math.sin(a), cz + rad * math.cos(a)
        out.append(box("chrome", xo - 0.2, y - 0.22, z - 0.22, xo + 0.2, y + 0.22, z + 0.22))
    out += cylinder(Y, (xo, cy, cz), rr * 0.25, 0.5, "x", 3)
    out += cylinder("gunmetal", (xo + side * 0.25, cy, cz), rr * 0.12, 0.5, "x", 2)
    if lugs:                                       # staggered chevron lugs on the tread
        facets = 2 * n
        for k in range(facets):
            a = 360 * k / facets
            half = 1 if k % 2 else -1
            xa, xb = (cx - width / 2 - 0.05, cx + 0.9) if half < 0 else (cx - 0.9, cx + width / 2 + 0.05)
            out.append(box("farm_tractor_tread", xa, cy + r - 0.2, cz - 0.55, xb, cy + r + lugs,
                           cz + 0.55, rotation=(a, 0, 0), pivot=center,
                           sides="farm_tractor_tread"))
    return {"name": name, "parent": parent, "pivot": list(center), "cubes": out}


def build():
    bones = [
        {"name": "root", "pivot": [0, 0, 0]},
        {"name": "body", "parent": "root", "pivot": [0, RR, RZ],
         "cubes": hood() + stack_and_intake() + chassis() + fenders() + cab() + interior()
         + hitch_and_tiller()},
        intake_glass(),
        cab_glass(),
        steering_wheel("steering", (0, 19.8, CAB_F + 4.2), radius=2.0, tilt=-48, parent="body"),
        rotor(),
    ]
    for side, s in (("l", 1), ("r", -1)):
        fc = (s * FX, FR, FZ)
        bones.append({"name": f"steer_f{side}", "parent": "root", "pivot": list(fc)})
        bones.append(wheel(f"wheel_f{side}", fc, FR - 0.35, FW, f"steer_f{side}", s, 8, lugs=0.35,
                           rim_ratio=0.62))
        rc = (s * RX, RR, RZ)
        bones.append(wheel(f"wheel_r{side}", rc, RR - 0.7, RW, "root", s, 10, lugs=0.7,
                           rim_ratio=0.58))
    return bones
