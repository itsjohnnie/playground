"""Generate the speedboat's model, paint job, item icon and pack icons.

Minecraft models are made of boxes, so realism comes from three things:
lots of small boxes (the curved bow is sliced 1 pixel at a time), a few
tilted ones (windshield, seat backs, steering wheel), and painted materials
instead of flat colours: gloss gradients, teak planks, tufted leather,
chrome reflections, tinted glass.

    python3 tools/gen_art.py

Writes the model to packs/VroomVehicles_RP/models/entity/ and the textures
to packs/VroomVehicles_RP/textures/. Open the .geo.json in Blockbench to
tweak it by hand.
"""
import json
import math
import random
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BP = ROOT / "packs" / "VroomVehicles_BP"
RP = ROOT / "packs" / "VroomVehicles_RP"


# --- tiny PNG writer (no Pillow needed) -------------------------------------

def write_png(path, pixels):
    """pixels: list of rows, each a list of (r, g, b, a)."""
    h, w = len(pixels), len(pixels[0])
    raw = b"".join(
        b"\x00" + bytes(max(0, min(255, int(c))) for px in row for c in px)
        for row in pixels
    )

    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def scale(c, k):
    return tuple(x * k for x in c)


# --- materials ----------------------------------------------------------------
# The texture is a 4x4 grid of 64x64 material tiles. Geometry UVs are in a
# 256x256 space; the PNG is drawn at 2x (512x512) for extra detail.
#
# "stretch" materials are squeezed onto each face whole, so every face gets
# the full gradient (gloss paint, chrome). "tile" materials are mapped 1:1,
# so planks and stitching stay the same size on every face.

UV = 256
SCALE = 2
TILE = 64
rand = random.Random(7)


def noise(amount):
    return 1 + (rand.random() - 0.5) * amount


def m_gloss_white(u, v):
    c = mix(rgb("#FCFCF9"), rgb("#D5D7D3"), v ** 1.4)
    c = mix(c, (255, 255, 255), 0.7 * math.exp(-((v - 0.16) / 0.05) ** 2))
    return scale(c, noise(0.02))


def m_bottom_red(u, v):
    c = mix(rgb("#C8202A"), rgb("#6A0A10"), v)
    return scale(c, noise(0.04))


def m_navy(u, v):
    c = mix(rgb("#2C4373"), rgb("#121D36"), v)
    return mix(c, (200, 215, 240), 0.35 * math.exp(-((v - 0.2) / 0.08) ** 2))


def m_teak(u, v):
    plank = int(u * TILE / 4)                     # a plank every 4 pixels
    seam = (u * TILE / 4) % 1 < 0.14
    shades = ["#A8662F", "#9B5A29", "#B2703A", "#94542A"]
    base = rgb(shades[(plank * 7) % len(shades)])
    butt = abs(((v * TILE + plank * 23) % 40) - 0) < 0.6   # plank ends
    if seam or butt:
        return rgb("#2A1A10")
    grain = 1 + 0.07 * math.sin(v * 90 + plank * 3.1 + math.sin(v * 13) * 2)
    return scale(base, grain * noise(0.05))


def m_leather(u, v):
    tuft = (v * TILE / 5) % 1                     # tufted rolls every 5 px
    c = mix(rgb("#F3EBDA"), rgb("#D6C9AE"), tuft ** 2)
    if tuft < 0.1:
        c = rgb("#B9A98A")                        # the stitched seam
    return scale(c, noise(0.03))


def m_tan(u, v):
    return scale(mix(rgb("#C2814A"), rgb("#8E5528"), v), noise(0.05))


def m_chrome(u, v):
    if v < 0.42:
        c = mix(rgb("#FFFFFF"), rgb("#B8C6D4"), v / 0.42)
    elif v < 0.5:
        c = rgb("#3E4852")                        # reflected horizon
    else:
        c = mix(rgb("#7E8A96"), rgb("#E1E6EB"), (v - 0.5) / 0.5)
    return c


def m_glass(u, v):
    streak = ((u * 0.8 + v) * 3) % 1
    if streak < 0.06 or 0.12 < streak < 0.15:
        return rgb("#F2FBFF") + (170,)
    return mix(rgb("#9FD4EE"), rgb("#5B8FB0"), v) + (95,)


def m_black(u, v):
    c = mix(rgb("#30343B"), rgb("#0B0C0E"), v)
    return mix(c, (170, 178, 190), 0.45 * math.exp(-((v - 0.18) / 0.06) ** 2))


def m_decal(u, v):
    """Black cowling with red and white pinstripes and a chevron badge.

    Kept left-right symmetric because Minecraft mirrors it on one side.
    """
    c = m_black(u, v)
    if 0.66 < v < 0.72:
        return rgb("#D3262E")
    if 0.74 < v < 0.77:
        return rgb("#F2F2F2")
    dx = abs(u - 0.5)
    if 0.22 < v < 0.56 and abs((v - 0.22) - (0.34 - dx * 1.4)) < 0.07 and dx < 0.24:
        return rgb("#F5F5F5")
    return c


def m_rubber(u, v):
    return mix(rgb("#34363A"), rgb("#16171A"), v)


def m_gunmetal(u, v):
    c = mix(rgb("#59616C"), rgb("#2A2F36"), v)
    return scale(c, noise(0.03))


def m_deck_white(u, v):
    return scale(rgb("#F3F3EE"), noise(0.025))


def m_nav_red(u, v):
    return mix(rgb("#FF6A5E"), rgb("#B0100E"), v)


def m_nav_green(u, v):
    return mix(rgb("#7DFF9A"), rgb("#0E8E2C"), v)


def m_screen(u, v):
    c = mix(rgb("#1A2733"), rgb("#0A0F14"), v)
    if 0.3 < u < 0.7 and 0.35 < v < 0.45:
        return rgb("#3FD0FF")
    return c


MATERIALS = {  # name: (painter, mapping)
    "white":     (m_gloss_white, "stretch"),
    "red":       (m_bottom_red, "stretch"),
    "navy":      (m_navy, "stretch"),
    "teak":      (m_teak, "tile"),
    "leather":   (m_leather, "tile"),
    "tan":       (m_tan, "stretch"),
    "chrome":    (m_chrome, "stretch"),
    "glass":     (m_glass, "stretch"),
    "black":     (m_black, "stretch"),
    "decal":     (m_decal, "stretch"),
    "rubber":    (m_rubber, "stretch"),
    "gunmetal":  (m_gunmetal, "stretch"),
    "deck":      (m_deck_white, "stretch"),
    "nav_red":   (m_nav_red, "stretch"),
    "nav_green": (m_nav_green, "stretch"),
    "screen":    (m_screen, "stretch"),
}
TILE_ORIGIN = {name: ((i % 4) * TILE, (i // 4) * TILE) for i, name in enumerate(MATERIALS)}


def paint_texture():
    size = UV * SCALE
    px = [[(0, 0, 0, 0)] * size for _ in range(size)]
    tp = TILE * SCALE
    for name, (painter, _) in MATERIALS.items():
        ox, oy = (TILE_ORIGIN[name][0] * SCALE, TILE_ORIGIN[name][1] * SCALE)
        for y in range(tp):
            for x in range(tp):
                c = painter((x + 0.5) / tp, (y + 0.5) / tp)
                px[oy + y][ox + x] = c if len(c) == 4 else c + (255,)
    return px


# --- geometry helpers ---------------------------------------------------------

def face_uv(material, a, b, at=(0, 0), band=None):
    """UV for one face that is a x b pixels in size.

    `at` is where the face sits (in pixels) so tiled materials line up across
    neighbouring boxes. `band` is a (bottom, top) height range: the face then
    shows only its own slice of the material's top-to-bottom gradient, so a
    row of hull slices reads as one smooth surface.
    """
    tx, ty = TILE_ORIGIN[material]
    span = TILE - 2
    if MATERIALS[material][1] == "stretch":
        if band:
            lo, hi = band
            v0 = (hi - at[1] - b) / (hi - lo) * span
            return {"uv": [tx + 1, round(ty + 1 + max(0, v0), 3)],
                    "uv_size": [span, round(min(b / (hi - lo) * span, span), 3)]}
        return {"uv": [tx + 1, ty + 1], "uv_size": [span, span]}
    a, b = min(a, span), min(b, span)
    u0 = (at[0] + 31) % (span - a) if span > a else 0
    v0 = (at[1] + 31) % (span - b) if span > b else 0
    return {"uv": [round(tx + 1 + u0, 3), round(ty + 1 + v0, 3)],
            "uv_size": [round(a, 3), round(b, 3)]}


def box(material, x0, y0, z0, x1, y1, z1, rotation=None, pivot=None, top=None,
        aft=None, band=None):
    """A box from corner (x0,y0,z0) to (x1,y1,z1).

    `top` paints the up face and `aft` the back (+z) face a different
    material; `band` is passed to face_uv for the side faces.
    """
    x0, x1 = sorted((x0, x1))
    y0, y1 = sorted((y0, y1))
    z0, z1 = sorted((z0, z1))
    w, h, d = x1 - x0, y1 - y0, z1 - z0
    r = lambda n: round(n, 3)
    side = lambda m, a, b, at: face_uv(m, a, b, at, band if m == material else None)
    cube = {
        "origin": [r(x0), r(y0), r(z0)],
        "size": [r(w), r(h), r(d)],
        "uv": {
            "north": side(material, w, h, (x0, y1 - h)),
            "south": side(aft or material, w, h, (x0, y1 - h)),
            "east": side(material, d, h, (z0, y1 - h)),
            "west": side(material, d, h, (z0, y1 - h)),
            "up": face_uv(top or material, w, d, (x0, z0)),
            "down": face_uv(material, w, d, (x0, z0)),
        },
    }
    if rotation:
        cube["rotation"] = [r(v) for v in rotation]
        cube["pivot"] = [r(v) for v in (pivot or ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))]
    return cube


def mirrored(material, x0, x1, *rest, **kw):
    """The same box on both sides of the boat (x and -x)."""
    return [box(material, x0, rest[0], rest[1], x1, rest[2], rest[3], **kw),
            box(material, -x0, rest[0], rest[1], -x1, rest[2], rest[3], **kw)]


# --- the speedboat ------------------------------------------------------------
# Units are pixels (16 = one block). The bow points to -z, the stern to +z.
# The hull is cut into thin slices front to back; each slice is shaped by
# three curves: its half-width, its deck height (the sheer), and how far its
# bottom lifts (the bow rises out of the water).

BOW_TIP, BOW_START, STERN = -26, -4, 22
COCKPIT = (-6, 14)          # open seating area (z range)
FLOOR = 5                   # cockpit floor height


def half_width(z):
    if z >= BOW_START:
        return 10 - max(0, z - 14) * 0.06
    t = (BOW_START - z) / (BOW_START - BOW_TIP)
    return 10 * max(0.0, 1 - t ** 2.2) ** 0.75


def deck_height(z):
    s = max(0.0, min(1.0, (14 - z) / 40))
    return 9 + 2.5 * s ** 1.8


def bottom_lift(z):
    if z >= BOW_START:
        return 0
    t = (BOW_START - z) / (BOW_START - BOW_TIP)
    return 6 * t ** 2


def hull_slices():
    bow = [BOW_TIP + i * 0.5 for i in range(2 * (BOW_START - BOW_TIP))]
    edges = bow + list(range(BOW_START, STERN + 1, 2))
    return list(zip(edges, edges[1:]))


def build_hull():
    cubes = []
    for z0, z1 in hull_slices():
        zm = (z0 + z1) / 2
        w, b, d = half_width(zm), bottom_lift(zm), deck_height(zm)
        if w < 0.6:
            continue
        in_cockpit = COCKPIT[0] <= z0 and z1 <= COCKPIT[1]
        # V-shaped bottom: narrow keel, wider chine, then full beam
        red, white = (0, 6), (4, 12)               # shared gradient bands
        cubes.append(box("red", -w * 0.45, b, z0, w * 0.45, b + 1.5, z1, band=red))
        cubes.append(box("red", -w * 0.8, b + 1.5, z0, w * 0.8, b + 3, z1, band=red))
        y = b + 3
        if y < 4:                                   # antifouling up to waterline
            cubes.append(box("red", -w, y, z0, w, 4, z1, band=red))
            y = 4
        if y + 0.8 < d - 2:                         # navy boot stripe
            cubes.append(box("navy", -w, y, z0, w, y + 0.8, z1))
            y += 0.8
        top = FLOOR if in_cockpit else d
        foredeck = z1 <= COCKPIT[0]
        cubes.append(box("white", -w, y, z0, w, top, z1, band=white,
                         top="teak" if foredeck else "deck",
                         aft="teak" if foredeck else None))   # deck steps
        if in_cockpit:
            cubes += mirrored("white", w - 1.5, w, FLOOR, z0, d, z1, top="deck", band=white)
            cubes.append(box("teak", -(w - 1.5), FLOOR, z0, w - 1.5, FLOOR + 0.3, z1))
        if zm >= BOW_START:   # the bow gets its stripes from the skin panels
            cubes += hull_trim(w, d, z0, z1)
    return cubes


def hull_trim(w, d, z0, z1, inset=1.0):
    """Navy accent stripe under the deck edge and a rubber rub rail."""
    x = max(0.0, w - inset)
    return (mirrored("navy", x, w + 0.05, d - 2.4, z0, d - 1.8, z1)
            + mirrored("rubber", x, w + 0.35, d - 1.1, z0, d - 0.4, z1))


BOW_PANELS = [-4, -9, -13, -16.5, -19.5, -22, -24, -25.4]


def build_bow_skin():
    """Smooth the stepped bow with angled panels, like a fiberglass hull.

    Each panel spans two points on the bow curve and is turned (about y) to
    follow it, pushed out just enough to cover the slice steps underneath.
    """
    cubes = []
    for za, zb in zip(BOW_PANELS, BOW_PANELS[1:]):          # za aft, zb fore
        xa, xb = half_width(za), half_width(zb)
        length = math.hypot(xa - xb, za - zb)
        angle = math.degrees(math.atan2(xa - xb, za - zb))
        # how far the true curve bulges past the straight chord
        bulge = max(half_width(za + (zb - za) * t / 8) - (xa + (xb - xa) * t / 8)
                    for t in range(9))
        zm = (za + zb) / 2
        cx, b, d = (xa + xb) / 2 + bulge, bottom_lift(zm) + 3, deck_height(zm)
        layers = [("red", b, 4), ("navy", max(b, 4), 4.8), ("white", max(b, 4.8), d - 2.4),
                  ("navy", d - 2.4, d - 1.8), ("white", d - 1.8, d - 0.3)]
        half = length / 2 + 0.2
        for sign in (1, -1):
            for mat, y0, y1 in layers:
                if y1 - y0 < 0.05:
                    continue
                band = {"red": (0, 6), "white": (4, 12)}.get(mat)
                cubes.append(box(mat, sign * cx - 0.2, y0, zm - half, sign * cx + 0.2, y1,
                                 zm + half, rotation=(0, sign * angle, 0),
                                 pivot=(sign * cx, y0, zm), band=band))
            cubes.append(box("rubber", sign * cx - 0.35, d - 1.1, zm - half,
                             sign * cx + 0.45, d - 0.4, zm + half,
                             rotation=(0, sign * angle, 0), pivot=(sign * cx, d, zm)))
    return cubes


def build_bow_rail():
    cubes = []
    for z in range(-24, -7):
        zm = z + 0.5
        x, y = half_width(zm) - 1.2, deck_height(zm) + 1.6
        if x < 0.6:
            continue
        cubes += mirrored("chrome", x - 0.35, x, y, z, y + 0.35, z + 1)
        if z % 4 == 0:                              # stanchions down to the deck
            cubes += mirrored("chrome", x - 0.3, x - 0.05, deck_height(zm), zm - 0.15,
                              y, zm + 0.15)
    # cleats and navigation lights on the foredeck
    d = deck_height(-22)
    cubes.append(box("chrome", -0.4, d, -23, 0.4, d + 0.6, -21))
    cubes.append(box("nav_red", -2.6, d, -20, -1.6, d + 0.8, -19))
    cubes.append(box("nav_green", 1.6, d, -20, 2.6, d + 0.8, -19))
    return cubes


def build_cockpit():
    cubes = []
    f = FLOOR + 0.3
    # driver (+x) and passenger (-x) bucket seats on pedestals
    for x0, x1 in ((2, 8), (-8, -2)):
        cx = (x0 + x1) / 2
        cubes.append(box("gunmetal", cx - 1.2, f, -1, cx + 1.2, f + 1.2, 2))
        cubes.append(box("leather", x0, f + 1.2, -2, x1, f + 2.8, 3))
        cubes.append(box("tan", x0 - 0.25, f + 1.2, -2.2, x0 + 0.5, f + 3.0, 3))
        cubes.append(box("tan", x1 - 0.5, f + 1.2, -2.2, x1 + 0.25, f + 3.0, 3))
        back = (-12, 0, 0)
        pivot = (cx, f + 2.8, 3.4)
        cubes.append(box("leather", x0 + 0.3, f + 2.8, 2.3, x1 - 0.3, f + 7.2, 3.4,
                         rotation=back, pivot=pivot))
        cubes.append(box("tan", x0, f + 2.8, 2.2, x0 + 0.6, f + 7.0, 3.5,
                         rotation=back, pivot=pivot))
        cubes.append(box("tan", x1 - 0.6, f + 2.8, 2.2, x1, f + 7.0, 3.5,
                         rotation=back, pivot=pivot))
        cubes.append(box("leather", cx - 1.6, f + 7.2, 2.4, cx + 1.6, f + 8.6, 3.3,
                         rotation=back, pivot=pivot))
    # rear bench across the full width
    cubes.append(box("leather", -8.5, f, 8.5, 8.5, f + 2.4, 12.2))
    cubes.append(box("tan", -8.5, f, 8.2, 8.5, f + 2.5, 8.6))
    cubes.append(box("leather", -8.5, f + 2.4, 12.0, 8.5, f + 6.4, 13.2,
                     rotation=(-10, 0, 0), pivot=(0, f + 2.4, 13.2)))
    # driver console with screen, passenger glovebox
    cubes.append(box("gunmetal", 2, f, -6, 8, 9.8, -3.5, top="black"))
    cubes.append(box("screen", 3, 8.2, -3.6, 7, 9.5, -3.45))
    cubes.append(box("gunmetal", -8, f, -6, -2, 8.8, -3.5, top="black"))
    return cubes


def build_wheel():
    """Steering wheel: a ring of short chrome bars, tilted toward the driver."""
    hub = (5, 11.0, -3.0)
    cubes = [box("gunmetal", 4.6, 9.8, -3.5, 5.4, 10.8, -2.9)]   # column
    ring = []
    r, n = 2.0, 12
    chord = 2 * r * math.sin(math.pi / n) + 0.15
    for k in range(n):
        a = 2 * math.pi * k / n
        cx, cy = hub[0] + r * math.cos(a), hub[1] + r * math.sin(a)
        ring.append(box("black", cx - chord / 2, cy - 0.25, hub[2] - 0.25,
                        cx + chord / 2, cy + 0.25, hub[2] + 0.25,
                        rotation=(0, 0, math.degrees(a) + 90), pivot=(cx, cy, hub[2])))
    for k in range(3):                                            # spokes
        a = math.pi / 2 + 2 * math.pi * k / 3
        cx, cy = hub[0] + r / 2 * math.cos(a), hub[1] + r / 2 * math.sin(a)
        ring.append(box("chrome", cx - r / 2, cy - 0.15, hub[2] - 0.1,
                        cx + r / 2, cy + 0.15, hub[2] + 0.1,
                        rotation=(0, 0, math.degrees(a)), pivot=(cx, cy, hub[2])))
    ring.append(box("chrome", hub[0] - 0.45, hub[1] - 0.45, hub[2] - 0.3,
                    hub[0] + 0.45, hub[1] + 0.45, hub[2] + 0.3))
    return cubes, ring, hub


def build_windshield():
    """Wrap-around windshield: raked centre pane plus two swept side panes."""
    z, base, height = -6.5, deck_height(-6.5) - 0.3, 4.6
    centre = {"frame": [
        box("chrome", -6.2, base + height, z, 6.2, base + height + 0.45, z + 0.45),
        box("chrome", -6.2, base, z, -5.8, base + height, z + 0.4),
        box("chrome", 5.8, base, z, 6.2, base + height, z + 0.4),
    ], "glass": [box("glass", -5.8, base, z + 0.05, 5.8, base + height, z + 0.3)]}
    sides = []
    for sign in (1, -1):
        x = 6.0 * sign
        sides.append({
            "sign": sign, "pivot": (x, base, z + 0.2),
            "frame": [box("chrome", x, base + height - 0.5, z, x + 0.45 * sign,
                          base + height - 0.05, z + 4.2)],
            "glass": [box("glass", x + 0.1 * sign, base, z + 0.3, x + 0.35 * sign,
                          base + height - 0.5, z + 4.2)],
        })
    return centre, sides, (0, base, z + 0.2)


def build_motor():
    """Big outboard on the transom, with a swim platform either side."""
    cubes = [
        box("teak", -9, 3.2, STERN, -3, 4.2, STERN + 3.5),
        box("teak", 3, 3.2, STERN, 9, 4.2, STERN + 3.5),
        box("gunmetal", -2, 3, STERN, 2, 9.5, STERN + 1.5),           # bracket
        box("black", -1.6, -0.5, STERN + 2.2, 1.6, 9.2, STERN + 4.8),  # midsection
        box("chrome", -3, 0.6, STERN + 1.6, 3, 1.0, STERN + 6.2),       # cavitation plate
        box("gunmetal", -1.2, -2.6, STERN + 1.6, 1.2, 0.6, STERN + 6.4),  # gearcase
        box("gunmetal", -0.3, -4.4, STERN + 4.2, 0.3, -2.6, STERN + 6.2),  # skeg
    ]
    # cowling: rounded by stacking three boxes of shrinking size
    cubes += [
        box("decal", -3.6, 9.2, STERN + 1.2, 3.6, 15, STERN + 8.4, top="black"),
        box("black", -3.2, 15, STERN + 1.6, 3.2, 16, STERN + 8.0),
        box("black", -2.4, 16, STERN + 2.4, 2.4, 16.5, STERN + 7.2),
        box("chrome", -3.65, 11.6, STERN + 8.1, 3.65, 12.0, STERN + 8.45),
    ]
    hub = (0, -1.0, STERN + 6.6)
    prop = [box("chrome", -0.5, hub[1] - 0.5, STERN + 6.2, 0.5, hub[1] + 0.5, STERN + 7.6)]
    for k in range(3):
        a = 120 * k
        prop.append(box("chrome", -0.55, hub[1] + 0.3, STERN + 6.7, 0.55, hub[1] + 2.9,
                        STERN + 7.0, rotation=(0, 0, a), pivot=(0, hub[1], STERN + 6.85)))
    return cubes, prop, hub


def build_speedboat():
    wheel_cubes, ring, hub = build_wheel()
    centre, sides, ws_pivot = build_windshield()
    motor, prop, prop_hub = build_motor()
    bones = [
        {"name": "root", "pivot": [0, 0, STERN]},
        {"name": "hull", "parent": "root", "pivot": [0, 0, 0],
         "cubes": build_hull() + build_bow_skin() + build_bow_rail() + build_cockpit() + wheel_cubes},
        {"name": "wheel", "parent": "root", "pivot": list(hub),
         "rotation": [-25, 0, 0], "cubes": ring},
        {"name": "windshield", "parent": "root", "pivot": list(ws_pivot),
         "rotation": [-28, 0, 0], "cubes": centre["frame"]},
        {"name": "glass", "parent": "windshield", "pivot": list(ws_pivot),
         "cubes": centre["glass"]},
    ]
    for s in sides:
        side = "r" if s["sign"] > 0 else "l"
        bones.append({"name": f"windshield_{side}", "parent": "root", "pivot": list(s["pivot"]),
                      "rotation": [0, 39 * s["sign"], 0], "cubes": s["frame"]})
        bones.append({"name": f"glass_{side}", "parent": f"windshield_{side}",
                      "pivot": list(s["pivot"]), "cubes": s["glass"]})
    bones += [
        {"name": "motor", "parent": "root", "pivot": [0, 9, STERN], "cubes": motor},
        {"name": "prop", "parent": "motor", "pivot": list(prop_hub), "cubes": prop},
    ]
    return bones


def geometry(identifier, bones):
    return {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": identifier,
                "texture_width": UV,
                "texture_height": UV,
                "visible_bounds_width": 5,
                "visible_bounds_height": 3,
                "visible_bounds_offset": [0, 0.75, 0],
            },
            "bones": bones,
        }],
    }


# --- icons --------------------------------------------------------------------

ICON = [  # 16x16 side view of the speedboat, bow to the right
    "................",
    "................",
    "................",
    "................",
    "................",
    "..........k.....",
    "..bb.....kg.....",
    "..bb....kgg.....",
    "..bbLL..kgg.....",
    "..bbLLLL.LLL....",
    "..KKtttttttttt..",
    "..WWWWWWWWWWWWWW",
    "..NNNNNNNNNNNNN.",
    "..WWWWWWWWWWWW..",
    "...e.RRRRRRRR...",
    "...e............",
]
ICON_COLOURS = {
    ".": (0, 0, 0, 0),
    "W": rgb("#F6F6F2") + (255,),
    "N": rgb("#24365E") + (255,),
    "R": rgb("#B3161F") + (255,),
    "t": rgb("#A8662F") + (255,),
    "L": rgb("#EFE6D3") + (255,),
    "g": rgb("#8FD3F0") + (255,),
    "k": rgb("#D7DDE3") + (255,),
    "b": rgb("#1C1E22") + (255,),
    "K": rgb("#3A3F47") + (255,),
    "e": rgb("#5A616B") + (255,),
}


def icon_pixels(size=1, background=None):
    rows = []
    for line in ICON:
        row = []
        for ch in line:
            col = ICON_COLOURS[ch]
            if col[3] == 0 and background:
                col = background
            row.extend([col] * size)
        rows.extend([row] * size)
    return rows


def main():
    write_png(RP / "textures/entity/speedboat.png", paint_texture())
    geo = geometry("geometry.vroom.speedboat", build_speedboat())
    (RP / "models/entity/speedboat.geo.json").write_text(json.dumps(geo, indent=1) + "\n")
    write_png(RP / "textures/items/speedboat.png", icon_pixels())
    for pack in (BP, RP):                 # fallback icons; preview.js renders nicer ones
        icon = pack / "pack_icon.png"
        if not icon.exists():
            write_png(icon, icon_pixels(8, rgb("#9EDBFF") + (255,)))
    cubes = sum(len(b.get("cubes", [])) for b in geo["minecraft:geometry"][0]["bones"])
    print(f"speedboat: {cubes} boxes")


if __name__ == "__main__":
    main()
