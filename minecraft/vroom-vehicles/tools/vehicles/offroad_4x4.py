"""Off-roader: a boxy go-anywhere 4x4 in olive green with a white roof.

Big all-terrain tyres under black flares, bull bar with a winch, snorkel,
roof rack with jerry cans and a light bar, spare wheel on the back door.
INDI is on both number plates.
"""
import math

from artkit import (box, mirrored, cylinder, bar, decal, material, paint,
                    steering_wheel, bucket_seat, mix, rgb, glint, scale, noise)

INFO = {
    "id": "offroad_4x4", "name": "Off-Roader", "kind": "4x4",
    "group": "Land", "mode": "land", "length": 3,
    "specs": [("Length", "3 blocks"), ("Climbs", "1½ blocks"), ("Seats", "4"),
              ("Drive", "All four wheels")],
    "seats": [(5.0, 10.6, -1.0), (-5.0, 10.6, -1.0), (5.0, 10.6, 8.6), (-5.0, 10.6, 8.6)],
    "collision": (1.6, 1.4), "health": 14,
    "speed": 0.3, "step": 1.5,
    "recipe": {"shapeless": ["minecraft:minecart", "minecraft:green_dye",
                             "minecraft:iron_block", "minecraft:chest"]},
    "recipe_text": "Minecart + Green Dye + Block of Iron + Chest",
    "spawn_egg": ("#5E7A44", "#F2F2EC"),
    "anim": [
        {"bone": "wheel_fl", "type": "roll", "radius": 6.0},
        {"bone": "wheel_fr", "type": "roll", "radius": 6.0},
        {"bone": "wheel_rl", "type": "roll", "radius": 6.0},
        {"bone": "wheel_rr", "type": "roll", "radius": 6.0},
        {"bone": "steer_fl", "type": "turn", "axis": "y", "k": 0.25, "max": 25},
        {"bone": "steer_fr", "type": "turn", "axis": "y", "k": 0.25, "max": 25},
        {"bone": "body", "type": "turn", "axis": "z", "k": 0.06, "max": 5},
    ],
    "eggs": "INDI on both number plates, front and rear",
    "egg_cam": {"eye": [-16, 14, -66], "at": [0, 9, -20]},
}

# --- materials ------------------------------------------------------------------------

paint("offroad_4x4_green", "#6E8B4F", "#55703D", gloss=0.15)
paint("offroad_4x4_roof", "#F6F6F0", "#D9DAD3", gloss=0.25)


def _tire(u, v):
    """Chunky all-terrain tread: staggered blocks with deep grooves."""
    row = int(v * 8)
    shift = 0.5 if row % 2 else 0.0
    lug = ((u * 5 + shift) % 1) < 0.62 and (v * 8) % 1 < 0.72
    c = rgb("#323336") if lug else rgb("#121315")
    return scale(c, noise(0.08))


def _sidewall(u, v):
    """Tyre sidewall, the same all the way round (u runs across the wheel's diameter)."""
    p = abs(u - 0.5) * 2
    if p > 0.93:
        return rgb("#2E2F33")                    # tread shoulder
    if 0.8 < p < 0.84:
        return rgb("#3E4045")                    # raised lettering band
    return rgb("#1D1E21")


def _rim(u, v):
    """Gunmetal steel wheel face with a bright beadlock ring (radial, so it never flickers)."""
    p = abs(u - 0.5) * 2
    if p > 0.86:
        return rgb("#A9B0B8")
    if p > 0.8:
        return rgb("#1A1C1F")
    if p < 0.34:
        return rgb("#3A3E44")
    return mix(rgb("#5A616A"), rgb("#383D43"), (p - 0.34) / 0.46)


def _grille(u, v):
    """Black mesh grille behind horizontal bars."""
    if (v * 6) % 1 < 0.22:
        return rgb("#3B3F45")
    x, y = (u * 20) % 1, (v * 12) % 1
    return rgb("#24272B") if (x < 0.2 or y < 0.2) else rgb("#08090A")


def _jerry(u, v):
    c = mix(rgb("#D83A2C"), rgb("#8E1A12"), v)
    if abs(u - v) < 0.08 or abs(u - (1 - v)) < 0.08:
        c = scale(c, 0.8)                        # the X pressed into the can
    return c


material("offroad_4x4_tire", _tire)
material("offroad_4x4_rim", _rim)
material("offroad_4x4_sidewall", _sidewall)
material("offroad_4x4_grille", _grille)
material("offroad_4x4_jerry", _jerry)
decal("offroad_4x4_indi", "INDI", "#1F2F5A", "plate", box=(0.12, 0.18, 0.76, 0.64))

G = "offroad_4x4_green"
BAND = (4.5, 14.5)

# --- shape -------------------------------------------------------------------------------

ZF, ZR = -21.0, 20.0              # front of the grille, back door
WF, WR = -13.5, 12.5              # axles
R, TW = 6.0, 4.6                  # tyre radius and width
AR, FL = 6.6, 1.1                 # arch radius, flare width
HW = 11.5                         # body half-width
XI = 7.8                          # inside of the wheel tubs
SILL, FLOOR, BELT, BONNET = 5.0, 8.5, 14.0, 13.4
SCREEN = -8.0                     # windscreen base
ROOF = 20.6
ARCH_TOP = R + AR + 0.01      # side panels above this run unbroken


def arch(z, extra=0.0):
    for wz in (WF, WR):
        r = AR + extra
        if abs(z - wz) < r:
            return R + math.sqrt(r * r - (z - wz) ** 2)
    return 0.0


def near_arch(z, pad=0.0):
    return any(abs(z - wz) < AR + FL + pad for wz in (WF, WR))


def _pair(mat, x0, x1, y0, y1, z0, z1, **kw):
    if y1 - y0 < 0.05 or x1 - x0 < 0.05:
        return []
    if x0 <= 0:
        return [box(mat, -x1, y0, z0, x1, y1, z1, **kw)]
    return mirrored(mat, x0, x1, y0, z0, y1, z1, **kw)


# --- body ---------------------------------------------------------------------------------

def body():
    rows, open_, z = [], {}, ZF
    while z < ZR:
        z1 = min(ZR, z + (0.5 if near_arch(z + 0.25, 0.5) else 1.0))
        zm = (z + z1) / 2
        a, fa = arch(zm), arch(zm, FL)
        spec = []
        if zm < SCREEN:                                    # bonnet and front wings
            spec.append((G, 0, XI, SILL, BONNET))
            spec += [(G, XI, HW, max(SILL, a), ARCH_TOP), (G, XI, HW, ARCH_TOP, BELT)]
        else:                                              # cabin tub
            spec.append(("matte_black", 0, XI, SILL, FLOOR))
            if a:
                spec += [(G, XI, HW, a, ARCH_TOP), (G, XI, HW, ARCH_TOP, BELT)]
            else:
                spec.append(("matte_black", XI, HW - 0.9, SILL, FLOOR))
                spec += [(G, HW - 0.9, HW, SILL, ARCH_TOP), (G, HW - 0.9, HW, ARCH_TOP, BELT)]
        if fa:                                             # black wheel-arch flares
            spec.append(("matte_black", HW - 0.3, HW + FL + 0.4, max(SILL - 0.4, a), fa))
        for item in spec:                                  # merge boxes that carry on
            key = (item[0],) + tuple(round(v, 3) for v in item[1:])
            if key in open_ and open_[key][1] == z:
                open_[key][1] = z1
            else:
                if key in open_:
                    rows.append((open_[key][0], open_[key][1], key))
                open_[key] = [z, z1]
        z = z1
    rows += [(a, b, key) for key, (a, b) in open_.items()]
    out = []
    for z0, z1, (m, x0, x1, y0, y1) in rows:
        kw = {"band": BAND} if m == G else {}
        if m == "matte_black" and y1 <= FLOOR + 0.01:
            kw = {"top": "rubber"}
        out += _pair(m, x0, x1, y0, y1, z0, z1, **kw)
    # chassis and underside
    out += mirrored("matte_black", 3.5, 6.0, 3.6, ZF + 1, SILL, ZR - 1)
    out.append(box("gunmetal", -1.0, 3.2, -6, 1.0, 4.4, 6))                 # transfer box
    for wz in (WF, WR):                                                     # axles + diffs
        out.append(box("gunmetal", -8.4, R - 0.7, wz - 0.7, 8.4, R + 0.7, wz + 0.7))
        out += cylinder("gunmetal", (0, R, wz), 1.6, 2.4, "x", 3)
    # bonnet: a raised centre panel with a little lip
    out.append(box(G, -6.6, BONNET, ZF + 0.6, 6.6, BONNET + 0.45, SCREEN - 0.6,
                   band=BAND, top="offroad_4x4_green"))
    out += mirrored("matte_black", 8.4, 10.8, BELT, -17.5, BELT + 0.12, -12.0)  # wing vents
    # wing tops and belt trim
    out += mirrored("matte_black", HW - 0.15, HW + 0.12, BELT - 0.5, SCREEN, BELT - 0.2, ZR)
    return out


def doors():
    out = []
    x = HW + 0.04
    for z in (SCREEN + 0.4, 2.0, 11.2):                      # shut lines
        out += mirrored("black", HW, x, SILL + 0.3, z - 0.08, BELT, z + 0.08)
    for z in (0.6, 9.8):                                     # handles
        out += mirrored("chrome", HW, HW + 0.3, 12.4, z - 1.0, 12.9, z)
    # rock sliders between the wheels
    za, zb = WF + AR + FL + 0.2, WR - AR - FL - 0.2
    out += mirrored("matte_black", HW - 0.4, HW + 0.9, 4.2, za, 5.0, zb)
    for z in (za + 1, (za + zb) / 2, zb - 1):
        out += mirrored("matte_black", HW - 0.4, HW + 0.6, 4.2, z - 0.3, SILL, z + 0.3)
    return out


def cabin():
    """Pillars, roof and the back of the cab; glass is in its own bones."""
    out = []
    for z0, z1 in ((1.6, 2.4), (10.8, 11.6), (ZR - 1.0, ZR)):
        out += mirrored(G, HW - 0.9, HW, BELT, z0, ROOF, z1, band=(BELT, ROOF))
    out.append(box(G, -HW, BELT, ZR - 0.6, HW, 14.8, ZR, band=(BELT, ROOF)))  # under the back glass
    out.append(box(G, -HW, ROOF - 0.6, ZR - 0.6, HW, ROOF, ZR))
    # white roof with a lip, and a drip rail
    out.append(box("offroad_4x4_roof", -HW - 0.2, ROOF, SCREEN - 0.4, HW + 0.2, ROOF + 1.0,
                   ZR + 0.2, top="offroad_4x4_roof"))
    out += mirrored("offroad_4x4_roof", HW - 0.4, HW + 0.1, ROOF - 0.3, SCREEN, ROOF, ZR)
    out += mirrored("tinted_glass", HW - 0.5, HW + 0.21, ROOF + 0.2, 5.0, ROOF + 0.7, 10.0)
    # dashboard, seats, bench and the steering wheel column
    out.append(box("matte_black", -HW + 0.9, FLOOR, SCREEN, HW - 0.9, BELT + 0.3, SCREEN + 2.0,
                   top="black"))
    out.append(box("screen", -1.6, 12.6, SCREEN + 1.95, 1.6, 13.8, SCREEN + 2.05))
    for x0, x1 in ((2.8, 7.4), (-7.4, -2.8)):
        out += bucket_seat(x0, x1, -3.0, 1.2, FLOOR + 0.5, back=5.0, cushion="dark_leather",
                           trim="tan", recline=-10)
        out.append(box("gunmetal", (x0 + x1) / 2 - 1.4, FLOOR, -2.6, (x0 + x1) / 2 + 1.4,
                       FLOOR + 0.5, 0.8))
    out.append(box("dark_leather", -7.6, FLOOR, 6.6, 7.6, 10.6, 10.6))
    out.append(box("dark_leather", -7.6, 10.6, 10.0, 7.6, 15.8, 11.0, rotation=(-8, 0, 0),
                   pivot=(0, 10.6, 11.0)))
    out.append(box("matte_black", -1.0, FLOOR, -3.0, 1.0, 11.0, 2.0, top="black"))  # console
    out.append(box("black", 4.6, 13.0, SCREEN + 2.0, 5.4, 13.8, SCREEN + 3.4))
    return out


def windscreen():
    pivot = [0, BELT, SCREEN]
    frame = [
        box(G, -HW, BELT, SCREEN - 0.6, HW, BELT + 0.6, SCREEN + 0.4, band=(BELT, ROOF)),
        box(G, -HW, ROOF - 0.7, SCREEN - 0.6, HW, ROOF, SCREEN + 0.4),
        *mirrored(G, HW - 1.2, HW, BELT, SCREEN - 0.6, ROOF, SCREEN + 0.4, band=(BELT, ROOF)),
        *mirrored("black", 1.4, 1.7, ROOF - 1.2, SCREEN - 0.2, ROOF - 0.7, SCREEN + 0.2),
    ]
    glass = [box("glass", -HW + 1.2, BELT + 0.6, SCREEN - 0.2, HW - 1.2, ROOF - 0.7, SCREEN)]
    wiper = [bar("black", (x, BELT + 0.7, SCREEN - 0.35), (x + 3.5, BELT + 2.8, SCREEN - 0.35), 0.25)
             for x in (-6.5, 1.5)]
    return [
        {"name": "windscreen", "parent": "body", "pivot": pivot, "rotation": [-6, 0, 0],
         "cubes": frame + wiper},
        {"name": "glass_windscreen", "parent": "windscreen", "pivot": pivot, "cubes": glass},
    ]


def windows():
    cubes = []
    cubes += mirrored("glass", HW - 0.55, HW - 0.35, BELT, SCREEN + 0.3, ROOF, ZR - 1.0)
    cubes.append(box("glass", -HW + 0.9, 14.8, ZR - 0.4, HW - 0.9, ROOF - 0.6, ZR - 0.2))
    return {"name": "glass", "parent": "body", "pivot": [0, BELT, 0], "cubes": cubes}


def front():
    out = []
    zf = ZF
    out.append(box("offroad_4x4_grille", -6.4, 9.2, zf - 0.15, 6.4, 13.0, zf + 0.2))
    out.append(box(G, -6.8, 13.0, zf - 0.2, 6.8, 13.4, zf + 0.2, band=BAND))
    for s in (1, -1):                                        # round headlights + indicators
        c = (s * 8.9, 11.4, zf - 0.1)
        out += cylinder("chrome", c, 1.65, 0.5, "z", 4)
        out += cylinder("headlight", (c[0], c[1], zf - 0.3), 1.25, 0.4, "z", 4)
        out.append(box("amber", s * 8.0, 8.9, zf - 0.3, s * 9.8, 9.7, zf + 0.1))
    # steel bumper, winch and number plate
    out.append(box("matte_black", -12.2, 5.4, zf - 2.0, 12.2, 8.4, zf + 0.5, top="black"))
    out.append(box("plate", -3.4, 5.9, zf - 2.2, 3.4, 7.9, zf - 1.9, fore="offroad_4x4_indi"))
    out += cylinder("gunmetal", (0, 9.0, zf - 1.0), 0.75, 6.0, "x", 4)
    out.append(box("steel", -1.6, 8.2, zf - 2.0, 1.6, 9.0, zf - 1.2))
    out.append(box("red", -0.35, 8.3, zf - 2.4, 0.35, 9.5, zf - 1.9))      # the hook
    # bull bar: uprights, top hoop and light guards
    zb = zf - 2.6
    for s in (1, -1):
        out.append(bar("matte_black", (s * 4.6, 8.4, zb), (s * 4.6, 13.8, zb), 0.7))
        out.append(bar("matte_black", (s * 4.6, 13.6, zb), (s * 11.4, 12.2, zb + 0.4), 0.6))
        out.append(bar("matte_black", (s * 11.4, 12.4, zb + 0.4), (s * 11.4, 8.4, zb + 0.4), 0.6))
    out.append(bar("matte_black", (-4.9, 13.8, zb), (4.9, 13.8, zb), 0.7))
    out.append(bar("matte_black", (-4.6, 10.8, zb), (4.6, 10.8, zb), 0.5))
    for x in (-2.6, 2.6):                                    # spotlights on the bar
        out += cylinder("black", (x, 14.9, zb), 0.95, 0.9, "z", 4)
        out += cylinder("headlight", (x, 14.9, zb - 0.35), 0.7, 0.4, "z", 4)
    return out


def rear():
    out = []
    zr = ZR
    out.append(box("matte_black", -12.0, 4.9, zr - 0.6, 12.0, 7.2, zr + 1.2, top="black"))
    out.append(box("plate", -3.4, 5.1, zr + 1.2, 3.4, 7.0, zr + 1.45, aft="offroad_4x4_indi"))
    for s in (1, -1):
        out.append(box("taillight", s * 9.6, 9.0, zr - 0.1, s * 11.0, 12.2, zr + 0.25))
        out.append(box("amber", s * 9.6, 12.2, zr - 0.1, s * 11.0, 13.2, zr + 0.25))
    out += mirrored("black", 9.0, 9.15, SILL + 0.5, zr, ROOF - 0.5, zr + 0.06)   # door gap
    out.append(box("chrome", -8.5, 11.6, zr, -7.0, 12.1, zr + 0.3))              # handle
    out += mirrored("steel", 8.5, 9.4, 15.4, zr, 17.0, zr + 0.35)               # hinges
    out += mirrored("steel", 8.5, 9.4, 9.0, zr, 10.6, zr + 0.35)
    # ladder up to the rack
    for s in (1, -1):
        out.append(box("matte_black", s * 5.6 - 0.2, 7.2, zr + 0.2, s * 5.6 + 0.2, ROOF + 1.8,
                       zr + 0.6))
    for y in range(10, 21, 2):
        out.append(box("steel", -5.6, y, zr + 0.25, 5.6, y + 0.3, zr + 0.55))
    return out


def spare_wheel():
    c = (-0.0, 15.0, ZR + 3.2)
    cubes = cylinder("offroad_4x4_tire", c, 5.0, 3.6, "z", 8, fore="offroad_4x4_sidewall",
                     aft="offroad_4x4_sidewall")
    cubes += cylinder("matte_black", c, 3.0, 3.72, "z", 8, fore="offroad_4x4_rim",
                      aft="offroad_4x4_rim")
    cubes += cylinder("gunmetal", (c[0], c[1], c[2] + 1.9), 0.7, 0.5, "z", 3)
    cubes.append(box("matte_black", -1.2, 13.8, ZR + 0.5, 1.2, 16.2, ZR + 1.4))
    return {"name": "spare", "parent": "body", "pivot": list(c), "cubes": cubes}


def snorkel():
    x = -(HW + 0.9)                                           # on the right-hand side
    out = [
        box("matte_black", x - 0.5, 10.0, SCREEN - 2.2, x + 0.5, 11.0, SCREEN - 0.9),
        box("matte_black", x - 0.5, 10.0, SCREEN - 1.6, x + 0.5, ROOF + 1.2, SCREEN - 0.6),
        box("matte_black", x - 0.6, ROOF + 0.6, SCREEN - 3.0, x + 0.6, ROOF + 2.2, SCREEN - 0.6,
            fore="offroad_4x4_grille"),
        box("matte_black", -HW, 10.2, SCREEN - 2.0, x + 0.4, 10.8, SCREEN - 1.0),
    ]
    return out


def mirrors():
    out = []
    for s in (1, -1):
        out.append(bar("matte_black", (s * (HW - 0.3), BELT + 0.3, SCREEN + 0.8),
                       (s * (HW + 1.6), BELT + 1.4, SCREEN + 0.6), 0.4))
    out += mirrored("matte_black", HW + 1.3, HW + 2.1, BELT + 1.0, SCREEN + 0.2, BELT + 3.4,
                    SCREEN + 1.4, aft="chrome")
    return out


def roof_rack():
    out = []
    y0 = ROOF + 1.0
    y = y0 + 1.0
    za, zb = SCREEN + 0.5, ZR - 0.6
    for s in (1, -1):
        out.append(box("matte_black", s * 10.4, y, za, s * 11.0, y + 0.6, zb))
        for z in (za + 0.5, (za + zb) / 2, zb - 0.5):
            out.append(box("matte_black", s * 10.3, y0, z - 0.4, s * 11.1, y + 0.3, z + 0.4))
    out.append(box("matte_black", -11.0, y, za, 11.0, y + 0.6, za + 0.6))
    out.append(box("matte_black", -11.0, y, zb - 0.6, 11.0, y + 0.6, zb))
    z = za + 2.0
    while z < zb - 1.0:                                       # aluminium slats
        out.append(box("aluminium", -10.4, y + 0.1, z, 10.4, y + 0.4, z + 0.8))
        z += 2.0
    # light bar across the front of the rack
    out.append(box("matte_black", -7.0, y + 0.3, za - 0.9, 7.0, y + 1.6, za + 0.1, top="black"))
    for k in range(6):
        x = -6.0 + k * 2.4
        out.append(box("headlight", x - 0.9, y + 0.5, za - 1.0, x + 0.9, y + 1.4, za - 0.85))
    # jerry cans and a box
    for x in (5.8, 8.2):
        out.append(box("offroad_4x4_jerry", x - 1.0, y + 0.4, 12.0, x + 1.0, y + 4.0, 15.6,
                       top="red"))
        out.append(box("red", x - 0.4, y + 4.0, 12.4, x + 0.4, y + 4.6, 13.2))
    out.append(box("tan", -9.0, y + 0.4, 2.0, -1.0, y + 3.2, 9.0, top="tan"))
    out.append(box("matte_black", -9.05, y + 3.2, 4.2, -0.95, y + 3.5, 4.8))
    out.append(box("matte_black", -9.05, y + 3.2, 6.2, -0.95, y + 3.5, 6.8))
    return out


def wheel(name, center, parent, side):
    """A big all-terrain wheel in its own bone.

    Like artkit.wheel_bone, but the sidewall and rim faces use radial
    materials (identical wherever the turned strips overlap), and the bolts
    and hub sit proud of the rim so nothing is coplanar.
    """
    cx, cy, cz = center
    out = cylinder("offroad_4x4_tire", center, R, TW, "x", 8, sides="offroad_4x4_sidewall")
    rr = R * 0.6
    out += cylinder("matte_black", center, rr, TW + 0.12, "x", 8, sides="offroad_4x4_rim")
    xo = cx + side * (TW / 2 + 0.06)
    for k in range(10):                                   # beadlock bolts
        a = 2 * math.pi * (k + 0.5) / 10
        y, z = cy + rr * 0.92 * math.sin(a), cz + rr * 0.92 * math.cos(a)
        out.append(box("chrome", xo - 0.15, y - 0.17, z - 0.17, xo + 0.15, y + 0.17, z + 0.17))
    for k in range(6):                                    # wheel nuts
        a = 2 * math.pi * k / 6
        y, z = cy + 0.95 * math.sin(a), cz + 0.95 * math.cos(a)
        out.append(box("chrome", xo - 0.2, y - 0.2, z - 0.2, xo + 0.2, y + 0.2, z + 0.2))
    out += cylinder("gunmetal", (xo, cy, cz), 0.6, 0.6, "x", 3)
    return {"name": name, "parent": parent, "pivot": list(center), "cubes": out}


def build():
    bones = [
        {"name": "root", "pivot": [0, 0, 0]},
        {"name": "body", "parent": "root", "pivot": [0, 4, 0],
         "cubes": body() + doors() + cabin() + front() + rear() + snorkel() + mirrors()
         + roof_rack()},
        steering_wheel("steering", (5.0, 14.4, SCREEN + 4.2), radius=1.8, tilt=-30,
                       parent="body"),
        *windscreen(),
        windows(),
        spare_wheel(),
    ]
    cx = HW + FL + 0.4 - TW / 2 - 0.15
    for side, s in (("l", 1), ("r", -1)):
        for axle, wz in (("f", WF), ("r", WR)):
            center = (s * cx, R, wz)
            parent = "root"
            if axle == "f":
                bones.append({"name": f"steer_f{side}", "parent": "root", "pivot": list(center)})
                parent = f"steer_f{side}"
            bones.append(wheel(f"wheel_{axle}{side}", center, parent, s))
    return bones
