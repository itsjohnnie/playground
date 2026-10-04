"""Sport bike: a blue and white superbike with a full fairing.

LUNA is the race name on both side fairings, INDI is on the rear number plate.
"""
import math

from artkit import box, mirrored, cylinder, bar, decal, material, paint, mix, rgb, scale, noise

INFO = {
    "id": "sport_bike", "name": "Sport Bike", "kind": "Superbike",
    "group": "Small", "mode": "land", "length": 2.25,
    "specs": [("Length", "2¼ blocks"), ("Seats", "2"), ("Top speed feel", "Super zoomy"),
              ("Trick", "Wheelies at full speed")],
    "seats": [(0, 16.0, 5.2), (0, 17.4, 10.8)],
    "collision": (1.0, 1.3), "health": 8,
    "speed": 0.44, "step": 1.0625,
    "recipe": {"pattern": ["GBG", "IRI", "K K"],
               "key": {"G": "minecraft:glass_pane", "B": "minecraft:lapis_block",
                       "I": "minecraft:iron_ingot", "R": "minecraft:redstone_block",
                       "K": "minecraft:black_dye"}},
    "recipe_text": "Glass, Lapis Block, Iron, Redstone Block and Black Dye tyres",
    "spawn_egg": ("#2B5BE0", "#F4F4F4"),
    "anim": [
        {"bone": "body", "type": "turn", "axis": "z", "k": 0.3, "max": 25},
        {"bone": "chassis", "type": "lift", "k": 3, "max": 18, "offset": 14},
        {"bone": "steer", "type": "turn", "axis": "y", "k": 0.12, "max": 10},
        {"bone": "wheel_f", "type": "roll", "radius": 5.5},
        {"bone": "wheel_r", "type": "roll", "radius": 5.7},
    ],
    "eggs": "INDI on both side fairings and the rear number plate",
    "egg_cam": {"eye": [-30, 20, 40], "at": [0, 11, 4]},
}

FA = (5.5, -13.5)
RA = (5.7, 12.5)
RAKE = math.radians(24)
UP = (math.cos(RAKE), math.sin(RAKE))


def fork(s):
    return (FA[0] + UP[0] * s, FA[1] + UP[1] * s)


# --- materials ------------------------------------------------------------------
paint("sport_bike_blue", "#3A6CF0", "#10287A", gloss=0.6)
paint("sport_bike_gold", "#FFD866", "#A8740E", gloss=0.6)
paint("sport_bike_white", "#FFFFFF", "#C9CDD6", gloss=0.5)
material("sport_bike_top", lambda u, v: scale(mix(rgb("#3D6EF2"), rgb("#2F5CD8"), v), noise(0.02)))
LIVERY_BAND = (3.5, 19.0)


def _livery(u, v):
    """Blue over white, with a cyan pinstripe, laid out by height on the bike."""
    y = LIVERY_BAND[1] - v * (LIVERY_BAND[1] - LIVERY_BAND[0])
    if y > 10.4:
        t = (LIVERY_BAND[1] - y) / (LIVERY_BAND[1] - 10.4)
        c = mix(rgb("#4676F4"), rgb("#16338E"), t ** 1.2)
        c = mix(c, (255, 255, 255), 0.55 * math.exp(-((t - 0.12) / 0.06) ** 2))
    elif y > 9.7:
        c = rgb("#38D6FF")
    else:
        c = mix(rgb("#FAFAFA"), rgb("#BFC4CE"), (9.7 - y) / 6.2)
    return scale(c, noise(0.02))


def _seat(u, v):
    c = mix(rgb("#34363B"), rgb("#141518"), v)
    if (u * 64 / 6) % 1 < 0.08:
        c = rgb("#4A7DF6")                        # blue stitching
    return scale(c, noise(0.05))


def _wbox(word, w, h, fill=0.8):
    cols = len(word) * 7 - 1
    bh = w * fill * 7 / (cols * h)
    bw = fill
    if bh > 0.7:
        bh, bw = 0.7, 0.7 * cols * h / (7 * w)
    return ((1 - bw) / 2, 0.5 - bh / 2, bw, bh)


material("sport_bike_livery", _livery)
material("sport_bike_seat", _seat)
decal("sport_bike_luna", "INDI", "#FFFFFF", "sport_bike_blue", box=_wbox("INDI", 7.0, 2.8),
      underline="#38D6FF")
decal("sport_bike_indi", "INDI", "#1F2F5A", "plate", box=_wbox("INDI", 4.8, 2.8, 0.76))


# --- helpers ----------------------------------------------------------------------

def slab(mat, x0, x1, p0, p1, t, **kw):
    (ya, za), (yb, zb) = p0, p1
    if zb < za:
        (ya, za), (yb, zb) = (yb, zb), (ya, za)
    ym, zm = (ya + yb) / 2, (za + zb) / 2
    length = math.hypot(yb - ya, zb - za)
    pitch = math.degrees(math.atan2(yb - ya, zb - za))
    return box(mat, x0, ym - t / 2, zm - length / 2, x1, ym + t / 2, zm + length / 2,
               rotation=(pitch, 0, 0), pivot=(0, ym, zm), **kw)


def ring(mat, x0, x1, c, r_out, t, n=20, a0=0, a1=360):
    cy, cz = c
    step = (a1 - a0) / n
    half = (r_out - t / 2) * math.tan(math.radians(abs(step)) / 2) + 0.06
    return [box(mat, x0, cy + r_out - t, cz - half, x1, cy + r_out, cz + half,
                rotation=(a0 + step * (k + 0.5), 0, 0), pivot=(0, cy, cz)) for k in range(n)]


def tube(mat, pts, t=0.8):
    return [bar(mat, a, b, t) for a, b in zip(pts, pts[1:])]


def lerp_station(stations, z):
    for (za, *a), (zb, *b) in zip(stations, stations[1:]):
        if za <= z <= zb:
            t = (z - za) / (zb - za)
            return [p + (q - p) * t for p, q in zip(a, b)]
    return None


def loft(mat, stations, step=0.75, band=None, top=None, bottom=None, bevel=0.22, x=0.0):
    """Slices through stations (z, y_bottom, y_top, half_width), with bevelled corners."""
    out = []
    z = stations[0][0]
    end = stations[-1][0]
    while z < end - 1e-6:
        z1 = min(z + step, end)
        yb, yt, w = lerp_station(stations, (z + z1) / 2)
        h = yt - yb
        out.append(box(mat, x - w * (1 - bevel), yb, z, x + w * (1 - bevel), yt, z1, band=band,
                       top=top, bottom=bottom))
        out.append(box(mat, x - w, yb + h * 0.14, z, x + w, yt - h * 0.24, z1, band=band,
                       top=top, bottom=bottom))
        z = z1
    return out


def skin(mat, p0, p1, h, t=0.25, off=0.0, **kw):
    """A thin side panel of height h whose centre line runs from p0 to p1 (x, y, z)."""
    (x0, y0, z0), (x1, y1, z1) = p0, p1
    mid = ((x0 + x1) / 2 + off, (y0 + y1) / 2, (z0 + z1) / 2)
    length = math.dist(p0, p1)
    yaw = math.degrees(math.atan2(x1 - x0, z1 - z0))
    pitch = math.degrees(math.atan2(y1 - y0, math.hypot(x1 - x0, z1 - z0)))
    return box(mat, mid[0] - t / 2, mid[1] - h / 2, mid[2] - length / 2, mid[0] + t / 2,
               mid[1] + h / 2, mid[2] + length / 2, rotation=(pitch, yaw, 0), pivot=mid, **kw)


# --- parts -------------------------------------------------------------------------

def cast_wheel(name, axle, r, width, parent, front):
    cy, cz = axle
    c = ring("rubber", -width / 2, width / 2, axle, r - 0.5, 1.9, n=22)
    c += ring("tire", -width / 2 + 0.4, width / 2 - 0.4, axle, r, 0.7, n=22, a0=8)
    rim_r = r - 2.35
    c += ring("sport_bike_gold", -width / 2 + 0.3, width / 2 - 0.3, axle, rim_r + 0.05, 0.5, n=20)
    c += ring("matte_black", -width / 2 + 0.2, width / 2 - 0.2, axle, rim_r - 0.4, 0.15, n=20)
    for k in range(5):                                       # split five-spoke
        for d in (-7, 7):
            c.append(box("sport_bike_gold", -0.35, cy + 0.8, cz - 0.3, 0.35, cy + rim_r - 0.3,
                         cz + 0.3, rotation=(72 * k + d, 0, 0), pivot=(0, cy, cz)))
    c += cylinder("sport_bike_gold", (0, cy, cz), 1.1, width * 0.6, "x", 4)
    c += cylinder("aluminium", (0, cy, cz), 0.45, width + 0.8, "x", 3)
    if front:
        for sx in (1, -1):
            x = sx * (width / 2 + 0.3)
            c += cylinder("steel", (x, cy, cz), 3.3, 0.15, "x", 8)
            c += cylinder("gunmetal", (x, cy, cz), 1.9, 0.2, "x", 5)
    else:
        c += cylinder("steel", (-width / 2 - 0.25, cy, cz), 2.0, 0.15, "x", 6)
        c += cylinder("gunmetal", (width / 2 + 0.3, cy, cz), 2.9, 0.25, "x", 8)
        c += cylinder("aluminium", (width / 2 + 0.35, cy, cz), 1.5, 0.3, "x", 4)
    return {"name": name, "parent": parent, "pivot": [0, cy, cz], "cubes": c}


def front_end():
    c = []
    for sx in (1, -1):
        x = 1.95 * sx
        lo, hi = fork(0.3), fork(6.8)
        c.append(bar("matte_black", (x, lo[0], lo[1]), (x, hi[0], hi[1]), 1.0))
        lo, hi = fork(6.0), fork(14.3)
        c.append(bar("sport_bike_gold", (x, lo[0], lo[1]), (x, hi[0], hi[1]), 1.45))
        c.append(box("aluminium", x - 0.65, FA[0] - 0.9, FA[1] - 0.9, x + 0.65, FA[0] + 1.1, FA[1] + 1.0))
        # radial brake calipers behind each disc
        c.append(box("sport_bike_gold", x - 0.5 + 0.1 * sx, FA[0] + 1.2, FA[1] + 1.3,
                     x + 0.5 + 0.1 * sx, FA[0] + 3.5, FA[1] + 2.6, rotation=(-35, 0, 0),
                     pivot=(x, FA[0] + 2.3, FA[1] + 2.0)))
    for s, t in ((12.4, 0.8), (14.4, 0.9)):
        y, z = fork(s)
        c.append(slab("aluminium", -2.8, 2.8, (y, z - 1.0), (y, z + 1.4), t))
    y, z = fork(14.8)
    c.append(box("gunmetal", -0.5, y - 0.3, z - 0.5, 0.5, y + 0.3, z + 0.5))
    # clip-ons below the top clamp, angled down and back
    cy, cz = fork(13.4)
    for sx in (1, -1):
        c.append(box("gunmetal", 1.5 * sx - 0.6, cy - 0.6, cz - 0.6, 1.5 * sx + 0.6, cy + 0.6, cz + 0.6))
        c += tube("black", [(1.9 * sx, cy, cz), (4.0 * sx, cy - 0.5, cz + 1.0)], 0.55)
        c.append(bar("rubber", (3.6 * sx, cy - 0.4, cz + 0.8), (5.6 * sx, cy - 0.9, cz + 1.7), 0.85))
        c.append(bar("aluminium", (2.6 * sx, cy, cz + 0.3), (5.2 * sx, cy - 0.3, cz - 0.4), 0.3))
    # front fender hugging the tyre
    c += ring("sport_bike_blue", -1.55, 1.55, FA, 6.2, 0.4, n=9, a0=-40, a1=60)
    c += ring("sport_bike_white", -1.6, 1.6, FA, 6.25, 0.3, n=2, a0=20, a1=40)
    return c


def bodywork():
    c = []
    band = LIVERY_BAND
    nose = [(-15.8, 12.8, 14.8, 0.9), (-15.0, 12.2, 15.9, 2.0), (-14.0, 11.9, 16.7, 2.9),
            (-12.0, 11.7, 17.6, 3.7), (-10.0, 11.1, 17.9, 4.3), (-8.5, 9.2, 17.4, 4.6),
            (-7.0, 4.8, 16.3, 4.8), (-5.0, 4.2, 14.2, 4.8), (-1.0, 4.0, 12.6, 4.6),
            (2.0, 4.6, 11.8, 4.1), (3.6, 6.8, 11.2, 3.6)]
    c += loft("sport_bike_livery", nose, band=band, top="sport_bike_top", bottom="sport_bike_white",
              step=0.5)
    # flat side skins, so the livery reads cleanly along the fairing
    rot, piv = (0, 4.0, 0), (4.85, 8, -6.6)
    c += mirrored("sport_bike_livery", 4.78, 4.92, 4.8, -6.6, 11.6, 2.2, rotation=rot, pivot=piv,
                  band=band)
    # smooth skins over the sides of the nose
    for sx in (1, -1):
        c.append(skin("sport_bike_livery", (3.05 * sx, 14.4, -14.0), (4.72 * sx, 14.4, -8.4), 4.2,
                      band=band))
    # belly pan
    c += loft("matte_black", [(-6.5, 3.4, 4.6, 3.4), (2.0, 3.4, 4.8, 3.6), (3.4, 4.6, 5.6, 2.4)], step=1.0)
    # big LUNA panel on each side fairing
    c += mirrored("sport_bike_blue", 4.9, 5.02, 5.6, -5.6, 8.4, 1.4, sides="sport_bike_luna",
                  rotation=rot, pivot=piv)
    # air vents ahead of the race name
    for k in range(3):
        c += mirrored("matte_black", 4.86, 5.0, 6.0 + k * 1.2, -6.2, 6.6 + k * 1.2, -5.2 - k * 0.5,
                      rotation=rot, pivot=piv)
    # aluminium frame beams showing between fairing and tank
    for sx in (1, -1):
        c.append(slab("aluminium", 3.5 * sx, 4.15 * sx, (15.2, -7.6), (11.8, 3.2), 2.2))
    # tank
    tank = [(-7.0, 12.6, 17.0, 4.0), (-5.0, 12.6, 18.4, 4.3), (-2.0, 12.6, 18.7, 4.1),
            (1.0, 12.6, 18.1, 3.6), (2.6, 12.6, 16.6, 3.2)]
    c += loft("sport_bike_blue", tank, step=0.5, band=(12.6, 18.8), top="sport_bike_top")
    c.append(box("sport_bike_white", -0.6, 17.9, -5.0, 0.6, 18.76, 0.4))
    c.append(box("aluminium", -0.8, 18.65, -3.6, 0.8, 18.9, -2.2))           # filler cap
    # tail and seats
    tail = [(1.6, 11.4, 14.6, 3.4), (6.0, 12.2, 15.0, 3.3), (10.0, 13.2, 16.4, 2.8),
            (14.0, 14.4, 17.8, 2.2), (17.4, 15.4, 18.4, 1.5), (18.4, 15.9, 18.1, 0.9)]
    c += loft("sport_bike_livery", tail, band=(9.0, 19.0), top="sport_bike_top",
              bottom="matte_black")
    # smooth tail side panels over the slices, with a white flash
    for sx in (1, -1):
        c.append(skin("sport_bike_livery", (3.25 * sx, 13.75, 5.0), (1.5 * sx, 16.9, 17.6), 2.9,
                      band=(9.0, 19.0)))
        c.append(skin("sport_bike_white", (2.75 * sx, 14.9, 10.0), (1.65 * sx, 17.0, 17.0), 0.5,
                      off=0.2 * sx))
    c.append(box("sport_bike_seat", -3.1, 14.6, 1.8, 3.1, 16.0, 8.6, top="sport_bike_seat"))
    c.append(box("sport_bike_seat", -2.6, 15.6, 1.0, 2.6, 15.9, 2.0))
    c.append(box("sport_bike_seat", -2.3, 16.2, 9.0, 2.3, 17.4, 12.6))
    c.append(box("taillight", -1.2, 15.9, 18.2, 1.2, 17.6, 18.55))
    c.append(box("taillight", -0.7, 16.1, 18.4, 0.7, 17.4, 18.75))
    # windscreen, gauges and mirrors
    c.append(slab("tinted_glass", -3.0, 3.0, (17.5, -12.4), (20.2, -7.4), 0.25))
    c.append(slab("sport_bike_blue", -3.3, -2.9, (17.3, -12.2), (19.9, -7.6), 0.6))
    c.append(slab("sport_bike_blue", 2.9, 3.3, (17.3, -12.2), (19.9, -7.6), 0.6))
    c.append(box("screen", -1.5, 17.0, -7.4, 1.5, 18.4, -6.9, rotation=(-30, 0, 0),
                 pivot=(0, 17.7, -7.1)))
    for sx in (1, -1):
        c.append(bar("matte_black", (3.6 * sx, 17.0, -10.2), (5.4 * sx, 18.0, -9.8), 0.35))
        c.append(box("matte_black", 4.6 * sx, 17.6, -10.4, 6.4 * sx, 18.8, -9.4))
        c.append(box("amber", 4.7 * sx, 17.7, -10.5, 6.3 * sx, 18.0, -10.35))
        c.append(box("chrome", 4.8 * sx, 17.8, -9.45, 6.2 * sx, 18.6, -9.3))
    # headlights: two narrow LED eyes, an air intake between
    for sx in (1, -1):
        c.append(box("headlight", 0.6 * sx, 13.1, -15.5, 2.4 * sx, 13.9, -15.0,
                     rotation=(0, 18 * sx, 8 * sx), pivot=(1.5 * sx, 13.5, -15.2)))
        c.append(box("matte_black", 0.5 * sx, 12.8, -15.3, 2.6 * sx, 13.15, -14.9,
                     rotation=(0, 18 * sx, 8 * sx), pivot=(1.5 * sx, 13.5, -15.2)))
    c.append(box("matte_black", -0.8, 12.3, -16.0, 0.8, 13.5, -15.2))
    return c


def chassis_parts():
    c = []
    y, z = fork(12.0)
    # engine bits visible below the fairing, swingarm, chain, shock
    c.append(box("gunmetal", -3.0, 4.6, 2.0, 3.0, 9.6, 4.6))
    c += cylinder("gunmetal", (3.2, 6.4, 3.0), 1.4, 0.5, "x", 4)
    py, pz = 9.6, 3.8
    c.append(box("aluminium", -3.0, py - 1.0, pz - 1.0, 3.0, py + 1.0, pz + 1.0))
    for sx in (1, -1):
        x = 2.5 * sx
        c.append(slab("aluminium", x - 0.55, x + 0.55, (py, pz), (RA[0] + 0.2, RA[1]), 2.2))
        c.append(slab("gunmetal", x - 0.6, x + 0.6, (py - 0.6, pz + 1.6), (RA[0] - 0.4, RA[1] - 2.0), 0.4))
        c.append(box("aluminium", x - 0.6, RA[0] - 1.0, RA[1] - 1.0, x + 0.6, RA[0] + 1.0, RA[1] + 1.4))
    c.append(slab("aluminium", -2.0, 2.0, (py + 0.6, pz + 1.2), (py - 1.0, pz + 4.6), 0.8))
    c.append(bar("matte_black", (3.3, 8.2, 3.0), (3.3, RA[0] + 2.8, RA[1]), 0.4))
    c.append(bar("matte_black", (3.3, 4.8, 3.0), (3.3, RA[0] - 2.8, RA[1]), 0.4))
    c.append(box("sport_bike_gold", -2.6, RA[0] + 0.8, RA[1] - 2.6, -1.8, RA[0] + 2.2, RA[1] - 1.0))
    c.append(bar("sport_bike_gold", (0, 10.4, 5.2), (0, 13.4, 3.6), 1.2))       # shock spring
    c.append(bar("chrome", (0, 9.6, 5.6), (0, 14.0, 3.4), 0.6))
    # pegs, rearsets and the hugger fender over the back tyre
    c += mirrored("aluminium", 3.0, 4.8, 9.2, 4.4, 9.9, 5.4)
    c += mirrored("gunmetal", 2.6, 4.2, 10.4, 2.6, 12.0, 6.0)
    c += mirrored("aluminium", 2.4, 4.0, 11.8, 9.6, 12.4, 10.6)
    c += ring("matte_black", -1.9, 1.9, RA, 6.3, 0.35, n=6, a0=-15, a1=55)
    # number plate hanger under the tail with INDI
    c.append(slab("matte_black", -0.6, 0.6, (15.5, 15.6), (13.6, 17.8), 0.4))
    c.append(box("plate", -2.4, 10.8, 17.7, 2.4, 13.6, 17.95, rotation=(-10, 0, 0),
                 pivot=(0, 13.6, 17.8), aft="sport_bike_indi"))
    c.append(box("matte_black", -2.5, 13.5, 17.4, 2.5, 13.9, 18.0))
    for sx in (1, -1):
        c.append(bar("matte_black", (2.4 * sx, 13.8, 17.6), (3.4 * sx, 13.8, 17.6), 0.3))
        c.append(box("amber", 3.2 * sx, 13.4, 17.2, 4.2 * sx, 14.2, 18.0))
    return c


def exhaust():
    c = []
    # four header pipes running down the front of the engine into a collector
    for k, x in enumerate((-1.8, -0.6, 0.6, 1.8)):
        c += tube("steel", [(x, 9.0, -7.3), (x * 0.8, 5.2, -7.6), (x * 0.4, 3.9, -5.4)], 0.65)
    c += tube("steel", [(0, 3.8, -5.4), (-1.6, 3.8, 2.0), (-3.2, 6.4, 5.0)], 1.2)
    return c


def silencer():
    """A short angular titanium can on the right, kicked up towards the tail."""
    x, yc, zc, half = -3.9, 8.4, 8.4, 3.4
    c = []
    for a in (0, 45, 90, 135):
        c.append(box("aluminium", x - 1.1, yc - 0.46, zc - half, x + 1.1, yc + 0.46, zc + half,
                     rotation=(0, 0, a), pivot=(x, yc, zc)))
    c += cylinder("carbon", (x, yc, zc + half + 0.25), 1.2, 0.6, "z", 4)
    c += cylinder("carbon", (x, yc, zc - half + 0.3), 1.22, 0.6, "z", 4)
    c += cylinder("matte_black", (x, yc, zc + half + 0.5), 0.6, 0.3, "z", 3)
    return {"name": "silencer", "parent": "chassis", "pivot": [x, yc, zc], "rotation": [16, 0, 0],
            "cubes": c}


def build():
    return [
        {"name": "root", "pivot": [0, 0, 0]},
        {"name": "body", "parent": "root", "pivot": [0, 0, 0]},
        {"name": "chassis", "parent": "body", "pivot": [0, RA[0], RA[1]],
         "cubes": bodywork() + chassis_parts() + exhaust()},
        silencer(),
        {"name": "steer", "parent": "chassis", "pivot": [0, 12.0, -10.0], "cubes": front_end()},
        cast_wheel("wheel_f", FA, 5.5, 2.2, "steer", True),
        cast_wheel("wheel_r", RA, 5.7, 3.4, "chassis", False),
    ]
