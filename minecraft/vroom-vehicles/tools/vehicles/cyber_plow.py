"""Cyber Plow: an angular brushed-stainless electric pickup pushing a big
yellow snow plow.

The body is sliced front to back: a stainless lower body with trapezoid
wheel arches, then a greenhouse whose sides lean inward under one flat
triangular roofline (nose, apex, tail). The plow hangs off a push frame on
the nose with hydraulic lift and angle rams.

LUNA and INDI are on two black plates bolted to the front of the blade.
"""
import math

from artkit import box, mirrored, bar, cylinder, decal, material, paint, wheel_bone, \
    steering_wheel, bucket_seat, mix, rgb, scale, noise, glint

INFO = {
    "id": "cyber_plow", "name": "Cyber Plow", "kind": "Electric Plow Truck",
    "group": "Land", "mode": "land", "length": 4.5,
    "specs": [("Length", "4½ blocks"), ("Blade", "2 blocks wide"), ("Seats", "3"),
              ("Power", "Electric")],
    "seats": [(4.7, 8.3, -2.0), (-4.7, 8.3, -2.0), (0, 8.4, 5.6)],
    "collision": (2.5, 1.5), "health": 24,
    "speed": 0.26, "step": 1.0625,
    "recipe": {"pattern": ["III", "PRP", "I I"],
               "key": {"I": "minecraft:iron_block", "P": "minecraft:piston",
                       "R": "minecraft:redstone_block"}},
    "recipe_text": "5 Iron Blocks + 2 Pistons + Redstone Block",
    "spawn_egg": ("#C9CED3", "#FFC21A"),
    "anim": [
        {"bone": "body", "type": "turn", "axis": "z", "k": 0.06, "max": 5},
        {"bone": "steer_fl", "type": "turn", "axis": "y", "k": 0.25, "max": 25},
        {"bone": "steer_fr", "type": "turn", "axis": "y", "k": 0.25, "max": 25},
        {"bone": "wheel_fl", "type": "roll", "radius": 6.2},
        {"bone": "wheel_fr", "type": "roll", "radius": 6.2},
        {"bone": "wheel_rl", "type": "roll", "radius": 6.2},
        {"bone": "wheel_rr", "type": "roll", "radius": 6.2},
    ],
    "script": "plow",
    "eggs": "INDI on both name plates on the plow blade and on the rear number plate",
    "egg_cam": {"eye": [-22, 21, -100], "at": [0, 7, -40]},
}

# --- shape -----------------------------------------------------------------------
NOSE, TAIL, APEX = -31.0, 31.0, -4.0
Y_NOSE, Y_APEX, Y_TAIL = 14.3, 22.5, 15.8
W = 11.0                 # half width of the lower body
SILL, BELT = 5.0, 14.0
TILT = math.radians(14)  # the greenhouse leans in by this much
CAB = (-16.0, 10.0)      # hollow cab (z range)
WIN = (-17.0, 12.0)      # side windows (z range)
WIN_Y = 15.6             # bottom of the side windows
WHEEL_Z, WHEEL_R, WHEEL_X, WHEEL_W = 20.0, 6.2, 9.0, 3.6
ARCH_TOP, ARCH_IN, ARCH_OUT = 13.6, 4.6, 9.2   # trapezoid arch: top half width, bottom


def ytop(z):
    if z <= APEX:
        return Y_NOSE + (Y_APEX - Y_NOSE) * (z - NOSE) / (APEX - NOSE)
    return Y_APEX + (Y_TAIL - Y_APEX) * (z - APEX) / (TAIL - APEX)


def half_width(y):
    return W - max(0.0, y - BELT) * math.tan(TILT)


def arch_y(z):
    d = min(abs(z + WHEEL_Z), abs(z - WHEEL_Z))
    if d >= ARCH_OUT:
        return SILL
    if d <= ARCH_IN:
        return ARCH_TOP
    return SILL + (ARCH_OUT - d) / (ARCH_OUT - ARCH_IN) * (ARCH_TOP - SILL)


# --- materials ---------------------------------------------------------------------

def _hazard(u, v):
    """Diagonal yellow and black safety stripes."""
    s = ((u + v) * 4) % 1
    c = rgb("#FFC21A") if s < 0.5 else rgb("#17181B")
    return scale(c, noise(0.04))


def _lightbar(u, v):
    if 0.3 < v < 0.7:
        return mix(rgb("#FFFFFF"), rgb("#E8F4FF"), abs(v - 0.5) * 4)
    return mix(rgb("#9AA6B2"), rgb("#2A2F36"), abs(v - 0.5) * 2)


def _aero_rim(u, v):
    """Flat dark aero wheel cover with faint spokes."""
    d = math.hypot(u - 0.5, v - 0.5)
    c = mix(rgb("#4A5058"), rgb("#23272C"), v)
    if abs(u - 0.5) < 0.03 or abs(v - 0.5) < 0.03:
        c = rgb("#6C737B")
    if d > 0.46:
        c = rgb("#8D959D")
    return mix(c, (255, 255, 255), glint(v, 0.2, 0.06, 0.25))


def _beacon(u, v):
    blink = int(u * 8) % 2 == 0
    return mix(rgb("#FFD27A"), rgb("#FF8A00"), v) if blink else mix(rgb("#FFF3D6"), rgb("#D9D9D9"), v)


paint("cyber_plow_yellow", "#FFCB2E", "#D88E00", gloss=0.35)
material("cyber_plow_hazard", _hazard)
material("cyber_plow_lightbar", _lightbar)
material("cyber_plow_rim", _aero_rim)
material("cyber_plow_beacon", _beacon)
decal("cyber_plow_luna", "INDI", "#FFC21A", "matte_black", box=(0.07, 0.2, 0.86, 0.6))
decal("cyber_plow_plate", "INDI", "#1F2F5A", "plate", box=(0.12, 0.28, 0.76, 0.44))
decal("cyber_plow_indi", "INDI", "#FFC21A", "matte_black", box=(0.07, 0.2, 0.86, 0.6))


# --- helpers -----------------------------------------------------------------------

def slab(mat, x0, x1, p0, p1, t=0.6, center=False, **kw):
    """A flat plate from (z0, y0) to (z1, y1) across x0..x1, its top face on the line."""
    (z0, y0), (z1, y1) = p0, p1
    length = math.hypot(z1 - z0, y1 - y0)
    zm, ym = (z0 + z1) / 2, (y0 + y1) / 2
    pitch = math.degrees(math.atan2(y1 - y0, z1 - z0))
    lo, hi = (ym - t / 2, ym + t / 2) if center else (ym - t, ym)
    return box(mat, x0, lo, zm - length / 2, x1, hi, zm + length / 2,
               rotation=(pitch, 0, 0), pivot=((x0 + x1) / 2, ym, zm), **kw)


def ram(p0, p1, body="cyber_plow_yellow", rod="chrome", r=0.75):
    """A hydraulic cylinder: fat body from p0 halfway, chrome rod to p1."""
    mid = tuple(a + (b - a) * 0.55 for a, b in zip(p0, p1))
    return [bar(body, p0, mid, 2 * r), bar(rod, mid, p1, r * 0.8),
            bar("gunmetal", tuple(a + (b - a) * 0.5 for a, b in zip(p0, p1)),
                mid, 2 * r + 0.3)]


def slices():
    edges, z = [], NOSE
    while z < TAIL - 1e-6:
        edges.append(z)
        d = min(abs(z + WHEEL_Z), abs(z - WHEEL_Z))
        z += 0.5 if ARCH_IN - 0.5 <= d < ARCH_OUT + 0.5 else 1.0
    edges.append(TAIL)
    return list(zip(edges, edges[1:]))


# --- body ----------------------------------------------------------------------------

def body_shell():
    """Returns (steel cubes, glass cubes)."""
    out, glass = [], []
    c, s = math.cos(TILT), math.sin(TILT)
    for z0, z1 in slices():
        zm = (z0 + z1) / 2
        ab = arch_y(zm)
        cab = CAB[0] <= z0 and z1 <= CAB[1]
        yt0, yt1 = ytop(z0), ytop(z1)
        ylow = min(yt0, yt1)
        # lower body
        if cab:
            out += mirrored("steel", W - 0.8, W, ab, z0, BELT, z1)
        else:
            out.append(box("steel", -W, ab, z0, W, BELT, z1))
            hw = half_width(ylow) - 0.4
            if ylow - 0.5 > BELT:
                out.append(box("steel", -hw, BELT - 0.1, z0, hw, ylow - 0.5, z1))
        # greenhouse side plates, leaning in about the beltline
        top = ylow - 0.25
        if top - BELT > 0.05:
            window = WIN[0] <= z0 and z1 <= WIN[1] and not (-5.5 <= zm <= -3.0)
            wy1 = ylow - 1.1
            segs = []
            if window and wy1 - WIN_Y > 0.5:
                segs = [("steel", BELT, WIN_Y), ("tinted_glass", WIN_Y, wy1), ("steel", wy1, top)]
            else:
                segs = [("steel", BELT, top)]
            for mat, a, b in segs:
                la, lb = (a - BELT) / c, (b - BELT) / c
                cubes = mirrored(mat, W - 0.6, W, BELT + la, z0, BELT + lb, z1,
                                 rotation=(0, 0, -math.degrees(TILT)),
                                 pivot=(W, BELT, zm))
                (glass if mat == "tinted_glass" else out).extend(cubes)
        # roof / hood / tonneau plates
        hw = half_width((yt0 + yt1) / 2) + 0.15
        p0, p1 = (z0, yt0), (z1, yt1)
        if -18 <= z0 and z1 <= -5.5:          # windshield
            region = ("tinted_glass", 1.3)
        elif -3.0 <= z0 and z1 <= 9.0:        # glass roof
            region = ("tinted_glass", 1.3)
        elif z0 >= 10.0:                      # tonneau between the sail pillars
            region = ("matte_black", 1.8)
        else:
            region = None
        if region:
            mat, edge = region
            (glass if mat == "tinted_glass" else out).append(
                slab(mat, -hw + edge, hw - edge, p0, p1, t=0.5))
            out += [slab("steel", hw - edge, hw, p0, p1), slab("steel", -hw, -hw + edge, p0, p1)]
        else:
            out.append(slab("steel", -hw, hw, p0, p1))
    return out, glass


def arches():
    out = []
    for zw in (-WHEEL_Z, WHEEL_Z):
        pts = [(zw - ARCH_OUT, SILL), (zw - ARCH_IN, ARCH_TOP), (zw + ARCH_IN, ARCH_TOP),
               (zw + ARCH_OUT, SILL)]
        for a, b in zip(pts, pts[1:]):
            for sgn in (1, -1):
                xs = sorted((sgn * (W - 1.4), sgn * (W + 0.35)))
                out.append(slab("matte_black", xs[0], xs[1], a, b, t=1.3, center=True))
        out.append(box("matte_black", -7.0, SILL, zw - ARCH_OUT, 7.0, 12.8, zw + ARCH_OUT))
    return out


def details():
    out = []
    # chassis, skid plates
    out.append(box("matte_black", -6.5, 3.0, -28, 6.5, SILL, 28))
    # front: light bar across the nose, lower bumper, intake slot
    out.append(box("cyber_plow_lightbar", -10.7, 13.2, NOSE - 0.3, 10.7, 13.9, NOSE))
    out.append(box("matte_black", -10.6, 4.2, NOSE - 0.4, 10.6, 6.6, NOSE + 1))
    out.append(box("gunmetal", -6, 8.0, NOSE - 0.15, 6, 8.6, NOSE))
    # rear: light bar, tailgate seam, bumper, plate
    out.append(box("taillight", -10.7, 14.3, TAIL, 10.7, 15.3, TAIL + 0.3))
    out.append(box("gunmetal", -10.4, 13.2, TAIL, 10.4, 13.4, TAIL + 0.12))
    out.append(box("matte_black", -10.6, 4.2, TAIL - 1, 10.6, 6.6, TAIL + 0.4))
    out.append(box("plate", -3, 6.8, TAIL, 3, 9.6, TAIL + 0.15, aft="cyber_plow_plate"))
    out.append(box("headlight", -0.8, 4.3, TAIL + 0.4, 0.8, 5.0, TAIL + 0.55))  # reverse lamp
    # door seams and flush handles
    for z in (-15.8, -4.2, 9.6):
        out += mirrored("gunmetal", W - 0.1, W + 0.06, SILL + 0.6, z - 0.08, BELT, z + 0.08)
    out += mirrored("gunmetal", W - 0.1, W + 0.06, BELT - 0.08, -15.8, BELT + 0.08, 9.6)
    for z in (-6.4, 7.4):
        out += mirrored("black", W - 0.1, W + 0.1, 12.2, z - 1.4, 12.6, z)
    # side mirrors (small cameras on the A pillars)
    out += mirrored("matte_black", W - 0.2, W + 1.4, 15.0, -16.6, 16.2, -15.4)
    out += mirrored("amber", W + 1.0, W + 1.42, 15.2, -16.5, 15.9, -15.6)
    # charge port flap
    out.append(box("gunmetal", W - 0.1, 11.6, 24.6, W + 0.06, 12.9, 26.4))
    # roof light bar on the apex
    out += mirrored("matte_black", 6.2, 6.8, Y_APEX - 0.3, -4.4, Y_APEX + 0.8, -3.6)
    out.append(box("matte_black", -8.2, Y_APEX + 0.8, -5.0, 8.2, Y_APEX + 2.0, -3.0))
    out.append(box("cyber_plow_lightbar", -7.6, Y_APEX + 1.0, -5.1, 7.6, Y_APEX + 1.8, -5.0))
    out += mirrored("cyber_plow_beacon", 8.2, 9.4, Y_APEX + 0.8, -4.8, Y_APEX + 2.4, -3.2)
    return out


def cab():
    f = 5.6
    out = [box("matte_black", -W + 0.8, SILL, CAB[0], W - 0.8, f, CAB[1])]          # floor
    out.append(box("gunmetal", -W + 0.8, f, CAB[0], W - 0.8, 12.6, -11.5, top="matte_black"))
    out.append(box("screen", -2.6, 12.0, -11.9, 2.6, 15.0, -11.6,
                   rotation=(-15, 0, 0), pivot=(0, 12.6, -11.7)))
    out.append(box("gunmetal", 4.3, 11.0, -11.6, 5.1, 11.8, -9.8))                  # column
    ybulk = ytop(CAB[1]) - 0.6
    out.append(box("matte_black", -half_width(ybulk), f, CAB[1] - 0.6,
                   half_width(ybulk), ybulk, CAB[1]))                                # bulkhead
    for x0, x1 in ((2.2, 7.2), (-7.2, -2.2)):
        cx = (x0 + x1) / 2
        out.append(box("gunmetal", cx - 1.4, f, -3.8, cx + 1.4, f + 1.1, 0.4))
        out += bucket_seat(x0, x1, -4.4, 0.6, f + 1.1, cushion="dark_leather",
                           trim="matte_black")
    out.append(box("gunmetal", -1.4, f, -9, 1.4, 9.0, 1.5, top="matte_black"))      # console
    out.append(box("dark_leather", -8.6, f, 3.6, 8.6, 8.4, 7.8))                    # rear bench
    out.append(box("dark_leather", -8.6, 8.4, 7.4, 8.6, 13.4, 8.8,
                   rotation=(-10, 0, 0), pivot=(0, 8.4, 8.8)))
    return out


# --- plow ------------------------------------------------------------------------------
BLADE = [(-42.2, 0.7), (-41.3, 1.8), (-40.4, 4.0), (-40.0, 6.6), (-40.1, 9.0),
         (-40.7, 11.2), (-41.9, 12.8)]
BX = 16.5


def plow():
    out = []
    for i, (a, b) in enumerate(zip(BLADE, BLADE[1:])):
        mat = "cyber_plow_hazard" if i == 0 else "cyber_plow_yellow"
        out.append(slab(mat, -BX, BX, a, b, t=0.8, center=True, aft="gunmetal"))
    out.append(box("steel", -BX, 0.2, -42.9, BX, 1.2, -41.6))                       # cutting edge
    out.append(box("cyber_plow_hazard", -BX - 0.1, 12.5, -43.0, BX + 0.1, 13.5, -41.5))  # top lip
    for x in (-BX - 0.6, BX):                                                        # end plates
        out.append(box("cyber_plow_hazard", x, 0.5, -43.0, x + 0.6, 13.3, -39.4))
    # name plates, LUNA on the driver's-right half and INDI on the left, as seen from the front
    out.append(box("matte_black", -14.2, 4.8, -40.75, -2.4, 8.8, -40.4, fore="cyber_plow_luna"))
    out.append(box("matte_black", 2.4, 4.8, -40.75, 14.2, 8.8, -40.4, fore="cyber_plow_indi"))
    for x in (-14.2, -2.9, 2.4, 13.7):
        for y in (5.1, 8.0):
            out.append(box("chrome", x + 0.15, y, -40.9, x + 0.5, y + 0.35, -40.7))   # bolts
    # ribs and back beam
    for x in (-14, -7, 0, 7, 14):
        out.append(box("gunmetal", x - 0.5, 1.5, -40.0, x + 0.5, 12.2, -38.6))
    out.append(box("gunmetal", -BX + 0.5, 4.6, -39.8, BX - 0.5, 6.6, -38.2))
    out.append(box("gunmetal", -BX + 0.5, 10.4, -40.4, BX - 0.5, 11.4, -39.0))
    # pivot pin, A-frame push arms
    out += cylinder("gunmetal", (0, 5.6, -37.4), 1.0, 4.0, "x", n=4)
    out.append(box("gunmetal", -2.4, 4.6, -38.4, 2.4, 6.6, -36.4))
    for sgn in (1, -1):
        out.append(bar("matte_black", (sgn * 1.6, 5.4, -36.8), (sgn * 6.0, 5.0, -32.6), 1.3))
    out.append(bar("matte_black", (-5, 5.2, -34.0), (5, 5.2, -34.0), 1.1))
    # mount on the truck: frame, lift tower, plow lamps
    out.append(box("matte_black", -7.2, 3.6, -33.2, 7.2, 7.0, -31.2))
    out += mirrored("matte_black", 3.6, 4.6, 7.0, -33.0, 13.0, -32.0)
    out.append(box("matte_black", -4.6, 12.0, -33.0, 4.6, 13.0, -32.0))
    for sgn in (1, -1):
        x = sgn * 3.0
        out.append(box("matte_black", x - 1.0, 13.0, -33.6, x + 1.0, 14.6, -32.2))
        out.append(box("headlight", x - 0.8, 13.2, -33.75, x + 0.8, 14.4, -33.6))
        out.append(box("amber", x - 0.8, 12.6, -33.75, x + 0.8, 12.95, -33.2))
    # lift ram: tower top down to the push frame
    out += ram((0, 12.0, -33.0), (0, 6.8, -37.0))
    # angle rams, left and right
    for sgn in (1, -1):
        out += ram((sgn * 2.4, 4.4, -34.6), (sgn * 10.5, 5.4, -38.4), r=0.6)
        out.append(bar("black", (sgn * 1.0, 11.0, -32.6), (sgn * 2.0, 4.6, -34.4), 0.3))
    # blade marker posts
    for sgn in (1, -1):
        x = sgn * (BX - 0.5)
        out.append(box("black", x - 0.2, 13.5, -41.0, x + 0.2, 20.0, -40.6))
        out.append(box("cyber_plow_beacon", x - 0.35, 20.0, -41.15, x + 0.35, 21.0, -40.45))
    return out


# --- assembly --------------------------------------------------------------------------

def build():
    shell, glass = body_shell()
    bones = [
        {"name": "root", "pivot": [0, 0, 0]},
        {"name": "body", "parent": "root", "pivot": [0, 6, 0],
         "cubes": shell + arches() + details() + cab()},
        {"name": "glass", "parent": "body", "pivot": [0, 6, 0], "cubes": glass},
        steering_wheel("steering", (4.7, 12.2, -9.6), radius=1.9, parent="body"),
        {"name": "plow", "parent": "body", "pivot": [0, 5, -32], "cubes": plow()},
    ]
    for side, sgn in (("l", 1), ("r", -1)):
        x = sgn * WHEEL_X
        fc, rc = [x, WHEEL_R, -WHEEL_Z], [x, WHEEL_R, WHEEL_Z]
        bones.append({"name": f"steer_f{side}", "parent": "root", "pivot": fc})
        bones.append(wheel_bone(f"wheel_f{side}", fc, WHEEL_R, WHEEL_W, parent=f"steer_f{side}",
                                rim="cyber_plow_rim", rim_ratio=0.68, n=8))
        bones.append(wheel_bone(f"wheel_r{side}", rc, WHEEL_R, WHEEL_W, parent="root",
                                rim="cyber_plow_rim", rim_ratio=0.68, n=8))
    return bones
