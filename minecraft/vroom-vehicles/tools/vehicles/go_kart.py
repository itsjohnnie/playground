"""Go-kart: a red racing kart with a tube chassis and a two-stroke engine.

LUNA is on both side pods, INDI on the yellow number plate on the front panel.
"""
import math

from artkit import (box, mirrored, cylinder, bar, decal, material, paint, mix, rgb, scale,
                    noise, wheel_bone)

INFO = {
    "id": "go_kart", "name": "Go-Kart", "kind": "Racing kart",
    "group": "Small", "mode": "land", "length": 2.25,
    "specs": [("Length", "2¼ blocks"), ("Seats", "1"), ("Height", "Super low"),
              ("Top speed feel", "Zippy")],
    "seats": [(0, 2.9, 4.6)],
    "collision": (1.4, 0.7), "health": 6,
    "speed": 0.3, "step": 1.0625,
    "recipe": {"pattern": ["R W", "IMI", "K K"],
               "key": {"R": "minecraft:redstone", "W": "minecraft:red_wool",
                       "I": "minecraft:iron_ingot", "M": "minecraft:minecart",
                       "K": "minecraft:black_dye"}},
    "recipe_text": "Minecart + Iron + Redstone + Red Wool seat, Black Dye tyres",
    "spawn_egg": ("#D8202A", "#FFD21E"),
    "anim": [
        {"bone": "steer_fl", "type": "turn", "axis": "y", "k": 0.25, "max": 25},
        {"bone": "steer_fr", "type": "turn", "axis": "y", "k": 0.25, "max": 25},
        {"bone": "wheel_fl", "type": "roll", "radius": 2.8},
        {"bone": "wheel_fr", "type": "roll", "radius": 2.8},
        {"bone": "wheel_rl", "type": "roll", "radius": 3.1},
        {"bone": "wheel_rr", "type": "roll", "radius": 3.1},
    ],
    "eggs": "LUNA on both side pods and the front number plate",
    "egg_cam": {"eye": [-26, 13, -30], "at": [-1, 3, -4]},
}

FRONT_Z, REAR_Z = -11.5, 10.0
RF, RR = 2.8, 3.1
FX, RX = 10.4, 11.0          # wheel centre x (front, rear)

# --- materials -------------------------------------------------------------------
paint("go_kart_red", "#F2343C", "#8E0C14", gloss=0.55)
paint("go_kart_yellow", "#FFE04A", "#D9A50E", gloss=0.5)
paint("go_kart_frame", "#E8ECEF", "#9AA3AB", gloss=0.6)
paint("go_kart_seat", "#3B3E46", "#0E0F12", gloss=0.6)


def _pod(u, v):
    """Red side pod with a yellow and white speed stripe along the bottom."""
    c = mix(rgb("#F2343C"), rgb("#9A0E16"), v ** 1.2)
    if 0.74 < v < 0.84:
        c = rgb("#FFD21E")
    elif 0.86 < v < 0.9:
        c = rgb("#FAFAFA")
    return scale(c, noise(0.02))


def _plate(u, v):
    c = scale(mix(rgb("#FFE45A"), rgb("#EDBB18"), v), noise(0.02))
    if u < 0.05 or u > 0.95 or v < 0.06 or v > 0.94:
        c = rgb("#1B1C20")
    return c


def _wbox(word, w, h, fill=0.8, cy=0.5):
    cols = len(word) * 7 - 1
    bh = w * fill * 7 / (cols * h)
    bw = fill
    if bh > 0.6:
        bh, bw = 0.6, 0.6 * cols * h / (7 * w)
    return ((1 - bw) / 2, cy - bh / 2, bw, bh)


material("go_kart_pod", _pod)
material("go_kart_plate", _plate)
decal("go_kart_luna", "LUNA", "#FFFFFF", "go_kart_pod", box=_wbox("LUNA", 10.0, 3.2, 0.62, 0.4))
decal("go_kart_indi", "LUNA", "#1B1C20", "go_kart_plate", box=_wbox("LUNA", 5.4, 3.4, 0.8))


# --- helpers ------------------------------------------------------------------------

def tube(mat, pts, t=0.8):
    return [bar(mat, a, b, t) for a, b in zip(pts, pts[1:])]


def mx(pts):
    return [(-x, y, z) for x, y, z in pts]


def kart_wheel(name, hub, radius=2.4, tilt=-35, parent="root"):
    """A suede-rimmed kart steering wheel facing the driver.

    Like artkit.steering_wheel, but with the z rotations negated: the model
    is x-mirrored when shown, so z turns must run the other way for the rim
    pieces to sit tangent to the ring.
    """
    n = 14
    ring = []
    chord = 2 * radius * math.sin(math.pi / n) + 0.2
    for k in range(n):
        a = 2 * math.pi * k / n
        cx, cy = hub[0] + radius * math.cos(a), hub[1] + radius * math.sin(a)
        ring.append(box("matte_black", cx - chord / 2, cy - 0.3, hub[2] - 0.3, cx + chord / 2,
                        cy + 0.3, hub[2] + 0.3, rotation=(0, 0, -(math.degrees(a) + 90)),
                        pivot=(cx, cy, hub[2])))
    for deg in (0, 180, 270):                                     # three spokes
        a = math.radians(deg)
        cx, cy = hub[0] + radius / 2 * math.cos(a), hub[1] + radius / 2 * math.sin(a)
        ring.append(box("aluminium", cx - radius / 2, cy - 0.25, hub[2] - 0.1, cx + radius / 2,
                        cy + 0.25, hub[2] + 0.1, rotation=(0, 0, -deg), pivot=(cx, cy, hub[2])))
    ring.append(box("gunmetal", hub[0] - 0.7, hub[1] - 0.7, hub[2] - 0.4, hub[0] + 0.7, hub[1] + 0.7,
                    hub[2] + 0.3))
    ring.append(box("screen", hub[0] - 0.9, hub[1] + 0.3, hub[2] + 0.12, hub[0] + 0.9, hub[1] + 1.1,
                    hub[2] + 0.3))
    return {"name": name, "parent": parent, "pivot": list(hub), "rotation": [tilt, 0, 0],
            "cubes": ring}


# --- parts ---------------------------------------------------------------------------

def chassis():
    c = []
    fr = "go_kart_frame"
    for sgn in (1, -1):
        rail = [(4.4, 1.5, -16.0), (5.0, 1.5, -11.5), (6.4, 1.5, -2.0), (6.6, 1.5, 7.0),
                (5.6, 1.5, 12.6)]
        c += tube(fr, rail if sgn > 0 else mx(rail), 0.9)
        # front stub axle beams up to the kingpins
        c += tube(fr, [(5.0 * sgn, 1.5, -12.6), (8.6 * sgn, 2.2, -12.0), (8.9 * sgn, 2.8, FRONT_Z)], 0.8)
        c += tube(fr, [(5.4 * sgn, 1.5, -9.4), (8.6 * sgn, 2.2, -10.8)], 0.7)
        # rear axle bearing hangers
        c.append(box("gunmetal", 5.6 * sgn - 0.6, 1.4, REAR_Z - 1.0, 5.6 * sgn + 0.6, 3.6, REAR_Z + 1.0))
        # seat stays
        c += tube(fr, [(6.4 * sgn, 1.5, 4.0), (3.0 * sgn, 6.0, 9.6)], 0.5)
    c += tube(fr, [(-4.4, 1.5, -16.0), (4.4, 1.5, -16.0)], 0.9)
    for z in (-5.0, 3.0, 12.4):
        c.append(bar(fr, (-6.4, 1.5, z), (6.4, 1.5, z), 0.8))
    # floor tray
    c.append(box("aluminium", -4.6, 0.9, -15.6, 4.6, 1.15, -1.0))
    # front bumper hoops
    c += tube(fr, [(-4.0, 1.4, -16.0), (-3.4, 2.6, -18.6), (3.4, 2.6, -18.6), (4.0, 1.4, -16.0)], 0.7)
    # rear axle, brake disc and caliper, sprocket
    c += cylinder("chrome", (0, RR, REAR_Z), 0.55, 2 * RX, "x", 3)
    c += cylinder("steel", (2.6, RR, REAR_Z), 2.4, 0.25, "x", 6)
    c += cylinder("gunmetal", (2.6, RR, REAR_Z), 1.0, 0.4, "x", 4)
    c.append(box("go_kart_yellow", 2.1, RR + 1.5, REAR_Z - 1.4, 3.1, RR + 2.8, REAR_Z + 0.4))
    c += cylinder("aluminium", (-6.4, RR, REAR_Z), 1.9, 0.3, "x", 8)
    c.append(bar("rubber", (-6.4, RR + 1.8, REAR_Z), (-6.4, 4.8, 6.6), 0.35))
    c.append(bar("rubber", (-6.4, RR - 1.8, REAR_Z), (-6.4, 3.0, 6.6), 0.35))
    return c


def bodywork():
    c = []
    # nose cone: a wide, low front fairing with a sloping top
    c.append(box("go_kart_red", -7.0, 0.9, -19.8, 7.0, 2.6, -15.2, band=(0.9, 4.2)))
    c.append(box("go_kart_red", -6.2, 0.9, -20.5, 6.2, 2.4, -19.8, band=(0.9, 4.2)))
    c.append(box("go_kart_red", -6.8, 1.6, -19.9, 6.8, 2.8, -15.3, rotation=(-14, 0, 0),
                 pivot=(0, 2.6, -15.3), top="go_kart_red"))
    c.append(box("go_kart_red", -5.4, 2.4, -18.4, 5.4, 3.6, -15.3, rotation=(-14, 0, 0),
                 pivot=(0, 2.6, -15.3)))
    c += mirrored("go_kart_red", 6.6, 7.4, 0.9, -19.4, 2.4, -15.6, rotation=(0, -8, 0))
    c.append(box("go_kart_yellow", -7.06, 1.6, -19.0, 7.06, 2.0, -15.4))
    c.append(box("go_kart_yellow", -6.26, 1.6, -20.56, 6.26, 2.0, -19.8))
    c.append(box("matte_black", -4.0, 0.6, -20.0, 4.0, 1.2, -15.4))
    # front panel (nassa) in front of the driver's legs, number plate on it
    rot, piv = (-28, 0, 0), (0, 2.0, -12.4)
    c.append(box("go_kart_red", -3.6, 1.6, -12.8, 3.6, 7.2, -12.2, rotation=rot, pivot=piv))
    c.append(box("go_kart_plate", -2.7, 3.0, -12.95, 2.7, 6.4, -12.75, rotation=rot, pivot=piv,
                 fore="go_kart_indi"))
    # side pods between the wheels
    for sgn in (1, -1):
        x0, x1 = 6.8 * sgn, 10.6 * sgn
        c.append(box("go_kart_pod", x0, 1.0, -5.2, x1, 4.2, 6.0, sides="go_kart_luna",
                     top="go_kart_red", band=(1.0, 4.2)))
        c.append(box("go_kart_red", 6.6 * sgn, 1.0, -7.0, 10.0 * sgn, 3.4, -5.2,
                     rotation=(0, 0, 0)))
        c.append(box("go_kart_red", 6.6 * sgn, 1.0, 6.0, 9.6 * sgn, 3.6, 7.0))
        c.append(box("matte_black", 7.4 * sgn, 4.2, -4.0, 10.2 * sgn, 4.5, 5.0))
        c += tube("go_kart_frame", [(6.4 * sgn, 1.5, -4.0), (7.6 * sgn, 2.0, -4.0)], 0.5)
        c += tube("go_kart_frame", [(6.6 * sgn, 1.5, 5.0), (7.6 * sgn, 2.0, 5.0)], 0.5)
    # full-width rear bumper
    c.append(box("go_kart_red", -12.6, 1.0, 14.4, 12.6, 3.4, 17.0, band=(1.0, 3.6)))
    c.append(box("matte_black", -12.8, 0.8, 16.6, 12.8, 2.0, 17.4))
    for x in (-10.5, -4.0, 4.0, 10.5):
        c.append(bar("go_kart_frame", (x * 0.55, 1.5, 12.4), (x, 2.2, 14.6), 0.6))
    c.append(box("taillight", -1.2, 2.4, 17.0, 1.2, 3.2, 17.25))
    return c


def cockpit():
    c = []
    # fibreglass seat tub
    c.append(box("go_kart_seat", -3.4, 1.4, 1.2, 3.4, 2.6, 8.0))
    c += mirrored("go_kart_seat", 3.0, 3.6, 2.6, 1.2, 4.6, 8.0)
    c.append(box("go_kart_seat", -3.4, 2.6, 7.6, 3.4, 11.0, 8.4, rotation=(-24, 0, 0),
                 pivot=(0, 2.6, 8.0)))
    c += mirrored("go_kart_seat", 3.0, 3.6, 2.6, 7.4, 9.6, 8.4, rotation=(-24, 0, 0),
                  pivot=(0, 2.6, 8.0))
    c.append(box("dark_leather", -2.6, 2.6, 2.0, 2.6, 2.9, 7.4))
    # steering column, tie rods, pedals, fuel tank
    c.append(bar("chrome", (0, 1.6, -12.4), (0, 8.0, -6.8), 0.6))
    c.append(box("gunmetal", -0.6, 1.4, -12.9, 0.6, 2.4, -11.9))
    c += tube("steel", [(0.3, 2.2, -11.2), (8.4, 2.6, -10.0)], 0.35)
    c += tube("steel", [(-0.3, 2.2, -11.2), (-8.4, 2.6, -10.0)], 0.35)
    for x in (-1.6, 1.6):
        c.append(box("aluminium", x - 0.6, 1.4, -14.6, x + 0.6, 4.0, -14.2, rotation=(-25, 0, 0),
                     pivot=(x, 1.4, -14.4)))
    c.append(box("white", -2.0, 1.2, -9.2, 2.0, 4.2, -6.8))
    c.append(box("matte_black", -0.6, 4.2, -8.6, 0.6, 4.7, -7.8))
    return c


def engine():
    """Two-stroke on the right of the seat: cases, finned cylinder, airbox, exhaust."""
    c = []
    x = -6.4
    c.append(box("gunmetal", x - 2.4, 1.6, 3.0, x + 1.4, 5.4, 8.4))
    c.append(box("aluminium", x - 2.6, 2.0, 3.6, x - 2.4, 4.8, 6.6))
    for k in range(6):
        w = 1.9 if k % 2 == 0 else 1.6
        c.append(box("aluminium" if k % 2 == 0 else "gunmetal", x - w, 5.4 + k * 0.7, 4.6 - w + 1.5,
                     x + w - 0.6, 6.1 + k * 0.7, 7.4 + w - 1.5))
    c.append(box("matte_black", x - 1.0, 9.6, 5.4, x + 0.2, 10.4, 6.6))
    c.append(box("go_kart_red", x - 0.6, 10.4, 5.8, x - 0.2, 11.0, 6.2))
    # carburettor and the big black airbox ahead of the engine
    c.append(box("aluminium", x - 1.0, 4.4, 2.0, x + 0.4, 5.6, 3.0))
    c.append(box("matte_black", x - 2.2, 2.0, -1.4, x + 1.2, 6.8, 2.0))
    c.append(box("go_kart_yellow", x - 2.25, 5.6, -1.2, x + 1.25, 6.0, 1.8))
    c += cylinder("gunmetal", (x - 0.5, RR, 6.8), 0.9, 0.5, "x", 4)
    # exhaust: header into a big silencer behind the seat
    c += tube("steel", [(x - 1.6, 7.0, 8.0), (x - 2.6, 7.4, 10.6), (x - 2.0, 8.0, 12.8),
                        (x + 1.0, 8.4, 13.4)], 1.2)
    c += cylinder("aluminium", (x + 4.6, 8.4, 13.4), 1.5, 7.2, "x", 4)
    c += cylinder("carbon", (x + 8.4, 8.4, 13.4), 1.2, 0.6, "x", 4)
    c += cylinder("carbon", (x + 1.0, 8.4, 13.4), 1.55, 0.6, "x", 4)
    c.append(bar("go_kart_frame", (x + 4.6, 7.0, 13.4), (x + 4.6, 3.0, 12.4), 0.4))
    return c


def front_wheel(side, sgn):
    kx = 8.9 * sgn
    steer = {"name": f"steer_{side}", "parent": "root", "pivot": [kx, RF, FRONT_Z], "cubes": [
        box("gunmetal", kx - 0.5, RF - 1.4, FRONT_Z - 0.5, kx + 0.5, RF + 1.4, FRONT_Z + 0.5),
        bar("chrome", (kx, RF, FRONT_Z), (FX * sgn, RF, FRONT_Z), 0.5),
        bar("gunmetal", (kx, RF + 0.2, FRONT_Z), (kx - 0.4 * sgn, 2.6, FRONT_Z + 1.6), 0.4),
    ]}
    wheel = wheel_bone(f"wheel_{side}", (FX * sgn, RF, FRONT_Z), RF, 2.4, parent=f"steer_{side}",
                       tire="rubber", rim="go_kart_yellow", rim_ratio=0.6)
    wheel["cubes"] += cylinder("tire", (FX * sgn, RF, FRONT_Z), RF + 0.02, 1.6, "x", 6)
    return [steer, wheel]


def rear_wheel(side, sgn):
    w = wheel_bone(f"wheel_{side}", (RX * sgn, RR, REAR_Z), RR, 3.8, tire="rubber",
                   rim="go_kart_yellow", rim_ratio=0.6)
    w["cubes"] += cylinder("tire", (RX * sgn, RR, REAR_Z), RR + 0.02, 2.8, "x", 6)
    return w


def build():
    bones = [
        {"name": "root", "pivot": [0, 0, 0]},
        {"name": "chassis", "parent": "root", "pivot": [0, 0, 0],
         "cubes": chassis() + bodywork() + cockpit() + engine()},
        kart_wheel("steering", (0, 8.4, -6.4)),
    ]
    bones += front_wheel("fl", 1) + front_wheel("fr", -1)
    bones += [rear_wheel("rl", 1), rear_wheel("rr", -1)]
    return bones
