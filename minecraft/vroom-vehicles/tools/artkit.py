"""The shared kit every vehicle is built from.

Minecraft models are made of boxes, so realism comes from three things:
lots of small boxes (curves are sliced thin), some tilted ones, and painted
materials instead of flat colours: gloss gradients, teak planks, tufted
leather, chrome reflections, tinted glass, tyre tread.

All vehicles share one texture, the atlas: a grid of 64x64 material tiles,
four across and as many rows as needed, drawn at 2x for detail. A vehicle
can add its own paints with `paint()`, `material()` or `decal()` when its
module is imported; UVs are worked out only when `geometry()` exports a
model, once every material is known.

Units are pixels: 16 make one block. Every model faces -z (the front), the
back is +z, up is +y. Blockbench shows +x on the vehicle's left.
"""
import math
import random
import struct
import zlib

COLS = 4
SCALE = 2
TILE = 64
_rand = random.Random(7)


# --- PNG writer (no Pillow needed) ---------------------------------------------

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


# --- colour helpers ---------------------------------------------------------------

def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(x + (y - x) * t for x, y in zip(a, b))


def scale(c, k):
    return tuple(x * k for x in c)


def noise(amount):
    return 1 + (_rand.random() - 0.5) * amount


def glint(v, at=0.16, width=0.05, strength=0.7):
    """How much of a horizontal highlight band sits at height v (0 top, 1 bottom)."""
    return strength * math.exp(-((v - at) / width) ** 2)


# --- the material registry --------------------------------------------------------
# A painter takes (u, v) in 0..1 across its tile (v=0 is the top) and returns
# (r, g, b) or (r, g, b, a). "stretch" squeezes the whole tile onto each face,
# so every face gets the full gradient; "tile" maps it 1:1 in pixels, so
# planks and stitching stay the same size on every face.

MATERIALS = {}


def material(name, painter, mapping="stretch"):
    if name in MATERIALS:
        raise ValueError(f"material {name!r} is already registered")
    MATERIALS[name] = (painter, mapping)
    return name


def paint(name, light, dark, gloss=0.7, flake=0.0):
    """A glossy paint: light at the top of each face, dark at the bottom."""
    lo, hi = rgb(light), rgb(dark)

    def painter(u, v):
        c = mix(lo, hi, v ** 1.3)
        c = mix(c, (255, 255, 255), glint(v, strength=gloss))
        return scale(c, noise(0.02 + flake))
    return material(name, painter)


def flat(name, colour, amount=0.03):
    c0 = rgb(colour)
    return material(name, lambda u, v: scale(c0, noise(amount)))


def atlas_layout():
    origin = {name: ((i % COLS) * TILE, (i // COLS) * TILE)
              for i, name in enumerate(MATERIALS)}
    return origin, COLS * TILE, -(-len(MATERIALS) // COLS) * TILE


def paint_atlas(names=None):
    """Paint every material (or only `names`, leaving the rest blank)."""
    origin, uw, uh = atlas_layout()
    px = [[(0, 0, 0, 0)] * (uw * SCALE) for _ in range(uh * SCALE)]
    tp = TILE * SCALE
    for name, (painter, _) in MATERIALS.items():
        if names is not None and name not in names:
            continue
        ox, oy = origin[name][0] * SCALE, origin[name][1] * SCALE
        for y in range(tp):
            for x in range(tp):
                c = painter((x + 0.5) / tp, (y + 0.5) / tp)
                px[oy + y][ox + x] = c if len(c) == 4 else tuple(c) + (255,)
    return px


# --- pixel font for names and number plates ----------------------------------------

FONT = {  # bold 6x7
    "A": "011110 111111 110011 110011 111111 110011 110011",
    "B": "111110 110011 110011 111110 110011 110011 111110",
    "C": "011111 111111 110000 110000 110000 111111 011111",
    "D": "111100 111110 110011 110011 110011 111110 111100",
    "E": "111111 111111 110000 111110 110000 111111 111111",
    "F": "111111 111111 110000 111110 110000 110000 110000",
    "G": "011111 111111 110000 110111 110011 111111 011110",
    "H": "110011 110011 110011 111111 110011 110011 110011",
    "I": "111111 111111 001100 001100 001100 111111 111111",
    "J": "000011 000011 000011 000011 110011 111111 011110",
    "K": "110011 110110 111100 111000 111100 110110 110011",
    "L": "110000 110000 110000 110000 110000 111111 111111",
    "M": "110011 111111 111111 110011 110011 110011 110011",
    "N": "110011 111011 111011 110111 110111 110011 110011",
    "O": "011110 111111 110011 110011 110011 111111 011110",
    "P": "111110 110011 110011 111110 110000 110000 110000",
    "Q": "011110 110011 110011 110011 110111 111110 011011",
    "R": "111110 110011 110011 111110 111100 110110 110011",
    "S": "011111 110000 111110 011111 000011 000011 111110",
    "T": "111111 111111 001100 001100 001100 001100 001100",
    "U": "110011 110011 110011 110011 110011 111111 011110",
    "V": "110011 110011 110011 110011 110011 011110 001100",
    "W": "110011 110011 110011 110011 111111 111111 110011",
    "X": "110011 110011 011110 001100 011110 110011 110011",
    "Y": "110011 110011 011110 001100 001100 001100 001100",
    "Z": "111111 000011 000110 001100 011000 110000 111111",
    "0": "011110 110011 110111 111011 110011 110011 011110",
    "1": "001100 011100 111100 001100 001100 001100 111111",
    "2": "011110 110011 000011 000110 001100 011000 111111",
    "3": "111110 000011 000011 011110 000011 000011 111110",
    "4": "110011 110011 110011 111111 000011 000011 000011",
    "5": "111111 110000 111110 000011 000011 110011 011110",
    "6": "011110 110000 110000 111110 110011 110011 011110",
    "7": "111111 000011 000110 001100 001100 001100 001100",
    "8": "011110 110011 110011 011110 110011 110011 011110",
    "9": "011110 110011 110011 011111 000011 000011 011110",
    " ": "000000 000000 000000 000000 000000 000000 000000",
    "-": "000000 000000 000000 111111 000000 000000 000000",
}
FONT = {k: v.split() for k, v in FONT.items()}


def lettering(word, u, v, box=(0.08, 0.22, 0.84, 0.36)):
    """True where the pixel font draws `word` inside the (x, y, w, h) box."""
    x, y, w, h = box
    cols = len(word) * 7 - 1                       # 6 px letters + 1 px gaps
    cx, cy = (u - x) / w * cols, (v - y) / h * 7
    if 0 <= cx < cols and 0 <= cy < 7 and int(cx) % 7 < 6:
        return FONT[word[int(cx) // 7]][int(cy)][int(cx) % 7] == "1"
    return False


def decal(name, word, ink, background, box=(0.08, 0.22, 0.84, 0.36), underline=None):
    """A material that spells `word` in `ink` over another painter.

    `background` is a painter function or a material name. `underline` is an
    optional colour for a stripe under the word.
    """
    bg = MATERIALS[background][0] if isinstance(background, str) else background
    ink = rgb(ink)
    line = rgb(underline) if underline else None
    x, y, w, h = box

    def painter(u, v):
        if lettering(word, u, v, box):
            return ink
        if line and y + h + 0.1 < v < y + h + 0.16 and x < u < x + w:
            return line
        return bg(u, v)
    return material(name, painter)


# --- shared materials ----------------------------------------------------------------

def _gloss_white(u, v):
    c = mix(rgb("#FCFCF9"), rgb("#D5D7D3"), v ** 1.4)
    return scale(mix(c, (255, 255, 255), glint(v)), noise(0.02))


def _teak(u, v):
    plank = int(u * TILE / 4)                     # a plank every 4 pixels
    seam = (u * TILE / 4) % 1 < 0.14
    shades = ["#A8662F", "#9B5A29", "#B2703A", "#94542A"]
    base = rgb(shades[(plank * 7) % len(shades)])
    butt = ((v * TILE + plank * 23) % 40) < 0.6   # plank ends
    if seam or butt:
        return rgb("#2A1A10")
    grain = 1 + 0.07 * math.sin(v * 90 + plank * 3.1 + math.sin(v * 13) * 2)
    return scale(base, grain * noise(0.05))


def _leather(u, v):
    tuft = (v * TILE / 5) % 1                     # tufted rolls every 5 px
    c = mix(rgb("#F3EBDA"), rgb("#D6C9AE"), tuft ** 2)
    if tuft < 0.1:
        c = rgb("#B9A98A")                        # the stitched seam
    return scale(c, noise(0.03))


def _dark_leather(u, v):
    tuft = (v * TILE / 5) % 1
    c = mix(rgb("#3A3633"), rgb("#1C1A19"), tuft ** 2)
    if tuft < 0.1:
        c = rgb("#8A7B6A")
    return scale(c, noise(0.04))


def _chrome(u, v):
    if v < 0.42:
        return mix(rgb("#FFFFFF"), rgb("#B8C6D4"), v / 0.42)
    if v < 0.5:
        return rgb("#3E4852")                     # reflected horizon
    return mix(rgb("#7E8A96"), rgb("#E1E6EB"), (v - 0.5) / 0.5)


def _glass(u, v):
    streak = ((u * 0.8 + v) * 3) % 1
    if streak < 0.06 or 0.12 < streak < 0.15:
        return rgb("#F2FBFF") + (170,)
    return mix(rgb("#9FD4EE"), rgb("#5B8FB0"), v) + (95,)


def _tinted_glass(u, v):
    streak = ((u * 0.8 + v) * 3) % 1
    if streak < 0.05:
        return rgb("#C9D6E2") + (150,)
    return mix(rgb("#3A4A5A"), rgb("#141C24"), v) + (175,)


def _black(u, v):
    c = mix(rgb("#30343B"), rgb("#0B0C0E"), v)
    return mix(c, (170, 178, 190), glint(v, 0.18, 0.06, 0.45))


def _matte_black(u, v):
    return scale(mix(rgb("#2A2C30"), rgb("#141517"), v), noise(0.04))


def _rubber(u, v):
    return mix(rgb("#34363A"), rgb("#16171A"), v)


def _tire(u, v):
    """Tyre tread: chunky blocks across the face."""
    lug = (u * 10) % 1 < 0.55 and (v * 6) % 1 < 0.7
    c = rgb("#2C2D30") if lug else rgb("#141518")
    return scale(c, noise(0.06))


def _rim(u, v):
    c = mix(rgb("#E4E8EC"), rgb("#8E979F"), v)
    if abs(u - 0.5) < 0.06 or abs(v - 0.5) < 0.06:
        c = rgb("#5C646C")                        # spokes read on the side face
    return mix(c, (255, 255, 255), glint(v, 0.2, 0.06, 0.4))


def _gunmetal(u, v):
    return scale(mix(rgb("#59616C"), rgb("#2A2F36"), v), noise(0.03))


def _steel(u, v):
    """Brushed stainless: fine horizontal streaks (a tile, so streaks stay fine)."""
    streak = 1 + 0.06 * math.sin(v * 380 + math.sin(u * 7) * 3) + (_rand.random() - 0.5) * 0.05
    return scale(mix(rgb("#D4D8DC"), rgb("#A9AFB5"), (v * TILE / 16) % 1), streak)


def _aluminium(u, v):
    c = mix(rgb("#EEF1F4"), rgb("#9EA6AE"), v)
    return mix(c, (255, 255, 255), glint(v, 0.25, 0.08, 0.5))


def _carbon(u, v):
    """Carbon-fibre weave, a tile so the weave stays small."""
    cx, cy = int(u * TILE / 2), int(v * TILE / 2)
    lit = (cx + cy) % 2 == 0
    fu, fv = (u * TILE / 2) % 1, (v * TILE / 2) % 1
    shade = (0.5 + 0.5 * math.sin(math.pi * (fu if lit else fv)))
    return scale(rgb("#2E3136") if lit else rgb("#1A1C20"), 0.8 + 0.4 * shade)


def _headlight(u, v):
    d = math.hypot(u - 0.5, v - 0.5)
    return mix(rgb("#FFFFFF"), rgb("#BFD8F2"), d * 1.6)


def _taillight(u, v):
    d = abs(v - 0.5)
    return mix(rgb("#FF5A4E"), rgb("#8A0A0A"), d * 2)


def _amber(u, v):
    return mix(rgb("#FFC24A"), rgb("#C46A00"), v)


def _deck_white(u, v):
    return scale(rgb("#F3F3EE"), noise(0.025))


def _screen(u, v):
    if 0.3 < u < 0.7 and 0.35 < v < 0.45:
        return rgb("#3FD0FF")
    return mix(rgb("#1A2733"), rgb("#0A0F14"), v)


def _vinyl(u, v):
    """Marine vinyl seat: white with grey pleats, a tile."""
    pleat = (u * TILE / 4) % 1
    c = mix(rgb("#F7F7F4"), rgb("#D8DAD6"), abs(pleat - 0.5) * 2)
    return scale(c, noise(0.02))


def _carpet(u, v):
    return scale(rgb("#7B8189"), noise(0.18))


def _grip(u, v):
    """Non-slip deck tread: a diamond pattern, a tile."""
    d = ((u * TILE) % 2 < 1) ^ ((v * TILE) % 2 < 1)
    return scale(rgb("#E8E8E2") if d else rgb("#CFCFC8"), noise(0.02))


def _plate(u, v):
    c = scale(rgb("#F6F6F0"), noise(0.02))
    if u < 0.04 or u > 0.96 or v < 0.06 or v > 0.94:
        c = rgb("#1F2F5A")                        # plate border
    return c


for _name, _fn, _map in [
    ("white", _gloss_white, "stretch"),
    ("teak", _teak, "tile"),
    ("leather", _leather, "tile"),
    ("dark_leather", _dark_leather, "tile"),
    ("chrome", _chrome, "stretch"),
    ("glass", _glass, "stretch"),
    ("tinted_glass", _tinted_glass, "stretch"),
    ("black", _black, "stretch"),
    ("matte_black", _matte_black, "stretch"),
    ("rubber", _rubber, "stretch"),
    ("tire", _tire, "stretch"),
    ("rim", _rim, "stretch"),
    ("gunmetal", _gunmetal, "stretch"),
    ("steel", _steel, "tile"),
    ("aluminium", _aluminium, "stretch"),
    ("carbon", _carbon, "tile"),
    ("headlight", _headlight, "stretch"),
    ("taillight", _taillight, "stretch"),
    ("amber", _amber, "stretch"),
    ("deck", _deck_white, "stretch"),
    ("screen", _screen, "stretch"),
    ("vinyl", _vinyl, "tile"),
    ("carpet", _carpet, "tile"),
    ("grip", _grip, "tile"),
    ("plate", _plate, "stretch"),
]:
    material(_name, _fn, _map)

paint("red", "#C8202A", "#6A0A10", gloss=0.2)
paint("navy", "#2C4373", "#121D36", gloss=0.35)
material("tan", lambda u, v: scale(mix(rgb("#C2814A"), rgb("#8E5528"), v), noise(0.05)))
material("nav_red", lambda u, v: mix(rgb("#FF6A5E"), rgb("#B0100E"), v))
material("nav_green", lambda u, v: mix(rgb("#7DFF9A"), rgb("#0E8E2C"), v))


# --- boxes ------------------------------------------------------------------------

def _face(material, a, b, at=(0, 0), band=None):
    return {"_m": material, "_a": a, "_b": b, "_at": at, "_band": band}


def box(material, x0, y0, z0, x1, y1, z1, rotation=None, pivot=None, top=None,
        aft=None, fore=None, bottom=None, sides=None, band=None):
    """A box from corner (x0,y0,z0) to (x1,y1,z1), painted with `material`.

    Paint single faces differently with `top`, `bottom`, `fore` (the front,
    -z), `aft` (the back, +z) and `sides` (left and right). `band` is a
    (bottom, top) height range: a stretch material then shows only this
    face's slice of its top-to-bottom gradient, so a row of slices reads as
    one smooth surface. `rotation` is in degrees about `pivot` (default: the
    box's centre).
    """
    x0, x1 = sorted((x0, x1))
    y0, y1 = sorted((y0, y1))
    z0, z1 = sorted((z0, z1))
    w, h, d = x1 - x0, y1 - y0, z1 - z0
    r = lambda n: round(n, 3)
    side = lambda m, a, b, at: _face(m, a, b, at, band if m == material else None)
    cube = {
        "origin": [r(x0), r(y0), r(z0)],
        "size": [r(w), r(h), r(d)],
        "uv": {
            "north": side(fore or material, w, h, (x0, y0)),
            "south": side(aft or material, w, h, (x0, y0)),
            "east": side(sides or material, d, h, (z0, y0)),
            "west": side(sides or material, d, h, (z0, y0)),
            "up": _face(top or material, w, d, (x0, z0)),
            "down": _face(bottom or material, w, d, (x0, z0)),
        },
    }
    if rotation:
        cube["rotation"] = [r(v) for v in rotation]
        cube["pivot"] = [r(v) for v in (pivot or ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))]
    return cube


def mirrored(material, x0, x1, y0, z0, y1, z1, **kw):
    """The same box on both sides (x and -x). Rotations about y and z flip too."""
    kw2 = dict(kw)
    if kw.get("rotation"):
        rx, ry, rz = kw["rotation"]
        kw2["rotation"] = (rx, -ry, -rz)
    if kw.get("pivot"):
        px, py, pz = kw["pivot"]
        kw2["pivot"] = (-px, py, pz)
    return [box(material, x0, y0, z0, x1, y1, z1, **kw),
            box(material, -x0, y0, z0, -x1, y1, z1, **kw2)]


def cylinder(material, center, radius, length, axis="x", n=4, **kw):
    """A round bar or disc: n boxes turned about `axis`, making a 2n-sided shape."""
    cx, cy, cz = center
    t = radius * math.tan(math.pi / (2 * n))
    out = []
    for k in range(n):
        a = 180 * k / n
        if axis == "x":
            b = box(material, cx - length / 2, cy - t, cz - radius, cx + length / 2, cy + t, cz + radius,
                    rotation=(a, 0, 0), pivot=center, **kw)
        elif axis == "y":
            b = box(material, cx - radius, cy - length / 2, cz - t, cx + radius, cy + length / 2, cz + t,
                    rotation=(0, a, 0), pivot=center, **kw)
        else:
            b = box(material, cx - radius, cy - t, cz - length / 2, cx + radius, cy + t, cz + length / 2,
                    rotation=(0, 0, a), pivot=center, **kw)
        out.append(b)
    return out


def bar(material, p0, p1, thickness=0.5):
    """A straight bar from p0 to p1 (any direction in the y-z or x-z plane).

    Handy for tubes, struts and rails. Bars that change x, y and z at once are
    approximated by turning about y, then x.
    """
    (x0, y0, z0), (x1, y1, z1) = p0, p1
    mid = ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    length = math.dist(p0, p1)
    dx, dy, dz = x1 - x0, y1 - y0, z1 - z0
    yaw = math.degrees(math.atan2(dx, dz))                  # turn about y
    pitch = math.degrees(math.atan2(dy, math.hypot(dx, dz)))
    t = thickness / 2
    return box(material, mid[0] - t, mid[1] - t, mid[2] - length / 2,
               mid[0] + t, mid[1] + t, mid[2] + length / 2,
               rotation=(pitch, yaw, 0), pivot=mid)


# --- parts --------------------------------------------------------------------------

def wheel_bone(name, center, radius, width, parent="root", tire="tire", rim="rim",
               rim_ratio=0.62, n=6):
    """A wheel in its own bone (so it can spin): tyre, rim, hub cap."""
    cx, cy, cz = center
    cubes = cylinder(tire, center, radius, width, "x", n)
    cubes += cylinder(rim, center, radius * rim_ratio, width + 0.2, "x", n)
    cubes += cylinder("chrome", center, radius * 0.18, width + 0.4, "x", 2)
    return {"name": name, "parent": parent, "pivot": list(center), "cubes": cubes}


def steering_wheel(name, hub, radius=2.0, tilt=-25, parent="root", rim="black", n=12):
    """A round steering wheel facing the driver (+z), tilted back by `tilt`."""
    ring = []
    chord = 2 * radius * math.sin(math.pi / n) + 0.15
    for k in range(n):
        a = 2 * math.pi * k / n
        cx, cy = hub[0] + radius * math.cos(a), hub[1] + radius * math.sin(a)
        ring.append(box(rim, cx - chord / 2, cy - 0.25, hub[2] - 0.25,
                        cx + chord / 2, cy + 0.25, hub[2] + 0.25,
                        rotation=(0, 0, math.degrees(a) + 90), pivot=(cx, cy, hub[2])))
    for k in range(3):                                            # spokes
        a = math.pi / 2 + 2 * math.pi * k / 3
        cx, cy = hub[0] + radius / 2 * math.cos(a), hub[1] + radius / 2 * math.sin(a)
        ring.append(box("chrome", cx - radius / 2, cy - 0.15, hub[2] - 0.1,
                        cx + radius / 2, cy + 0.15, hub[2] + 0.1,
                        rotation=(0, 0, math.degrees(a)), pivot=(cx, cy, hub[2])))
    ring.append(box("chrome", hub[0] - 0.45, hub[1] - 0.45, hub[2] - 0.3,
                    hub[0] + 0.45, hub[1] + 0.45, hub[2] + 0.3))
    return {"name": name, "parent": parent, "pivot": list(hub), "rotation": [tilt, 0, 0],
            "cubes": ring}


def bucket_seat(x0, x1, z0, z1, y, back=4.4, cushion="leather", trim="tan", recline=-12):
    """A bucket seat: cushion with bolsters, reclined backrest, headrest."""
    cx = (x0 + x1) / 2
    cubes = [
        box(cushion, x0, y, z0, x1, y + 1.6, z1),
        box(trim, x0 - 0.25, y, z0 - 0.2, x0 + 0.5, y + 1.8, z1),
        box(trim, x1 - 0.5, y, z0 - 0.2, x1 + 0.25, y + 1.8, z1),
    ]
    rot, pivot = (recline, 0, 0), (cx, y + 1.6, z1 + 0.4)
    cubes += [
        box(cushion, x0 + 0.3, y + 1.6, z1 - 0.7, x1 - 0.3, y + 1.6 + back, z1 + 0.4,
            rotation=rot, pivot=pivot),
        box(trim, x0, y + 1.6, z1 - 0.8, x0 + 0.6, y + 1.4 + back, z1 + 0.5, rotation=rot, pivot=pivot),
        box(trim, x1 - 0.6, y + 1.6, z1 - 0.8, x1, y + 1.4 + back, z1 + 0.5, rotation=rot, pivot=pivot),
        box(cushion, cx - 1.6, y + 1.6 + back, z1 - 0.6, cx + 1.6, y + 3.0 + back, z1 + 0.3,
            rotation=rot, pivot=pivot),
    ]
    return cubes


# --- boat hulls ------------------------------------------------------------------------

class Hull:
    """A planing hull shaped by three curves, sliced thin front to back.

    bow_tip..bow_start is the curved bow (sliced every half pixel), then the
    straight run back to `stern`. `beam` is the half-width, `deck` the deck
    height at the stern and `sheer` how much it rises at the bow, `rise` how
    far the bottom lifts at the bow. An open `cockpit` (z range) is hollowed
    down to `floor`.
    """

    def __init__(self, bow_tip=-26, bow_start=-4, stern=22, beam=10, deck=9, sheer=2.5,
                 rise=6, cockpit=(-6, 14), floor=5, waterline=4, topsides="white",
                 bottom="red", boot="navy", accent="navy", foredeck="teak",
                 cockpit_floor="teak", deck_top="deck", rail="rubber", bow_step=0.5, run_step=2):
        self.__dict__.update(locals())
        del self.__dict__["self"]

    def half_width(self, z):
        if z >= self.bow_start:
            return self.beam - max(0, z - (self.stern - 8)) * 0.06
        t = (self.bow_start - z) / (self.bow_start - self.bow_tip)
        return self.beam * max(0.0, 1 - t ** 2.2) ** 0.75

    def deck_height(self, z):
        span = self.stern - 8 - self.bow_tip
        s = max(0.0, min(1.0, (self.stern - 8 - z) / span))
        return self.deck + self.sheer * s ** 1.8

    def bottom_lift(self, z):
        if z >= self.bow_start:
            return 0
        t = (self.bow_start - z) / (self.bow_start - self.bow_tip)
        return self.rise * t ** 2

    def slices(self):
        n = int(round((self.bow_start - self.bow_tip) / self.bow_step))
        bow = [self.bow_tip + i * self.bow_step for i in range(n)]
        run = [self.bow_start + i * self.run_step
               for i in range(int((self.stern - self.bow_start) / self.run_step) + 1)]
        if run[-1] < self.stern:
            run.append(self.stern)
        edges = bow + run
        return list(zip(edges, edges[1:]))

    def trim(self, w, d, z0, z1, inset=1.0):
        x = max(0.0, w - inset)
        out = []
        if self.accent:
            out += mirrored(self.accent, x, w + 0.05, d - 2.4, z0, d - 1.8, z1)
        if self.rail:
            out += mirrored(self.rail, x, w + 0.35, d - 1.1, z0, d - 0.4, z1)
        return out

    def cubes(self):
        out = []
        top_band = (self.waterline, self.deck + self.sheer + 1)
        low_band = (0, self.waterline + 2)
        cockpit = self.cockpit or (1e9, -1e9)
        for z0, z1 in self.slices():
            zm = (z0 + z1) / 2
            w, b, d = self.half_width(zm), self.bottom_lift(zm), self.deck_height(zm)
            if w < 0.6:
                continue
            inside = cockpit[0] <= z0 and z1 <= cockpit[1]
            out.append(box(self.bottom, -w * 0.45, b, z0, w * 0.45, b + 1.5, z1, band=low_band))
            out.append(box(self.bottom, -w * 0.8, b + 1.5, z0, w * 0.8, b + 3, z1, band=low_band))
            y = b + 3
            if y < self.waterline:
                out.append(box(self.bottom, -w, y, z0, w, self.waterline, z1, band=low_band))
                y = self.waterline
            if self.boot and y + 0.8 < d - 2:
                out.append(box(self.boot, -w, y, z0, w, y + 0.8, z1))
                y += 0.8
            top = self.floor if inside else d
            fore = z1 <= cockpit[0]
            deck_mat = self.foredeck if fore else self.deck_top
            out.append(box(self.topsides, -w, y, z0, w, top, z1, band=top_band,
                           top=deck_mat, aft=deck_mat if fore else None))
            if inside:
                out += mirrored(self.topsides, w - 1.5, w, self.floor, z0, d, z1,
                                top=self.deck_top, band=top_band)
                out.append(box(self.cockpit_floor, -(w - 1.5), self.floor, z0, w - 1.5,
                               self.floor + 0.3, z1))
            if zm >= self.bow_start:
                out += self.trim(w, d, z0, z1)
        return out + self.bow_skin()

    def bow_skin(self, panels=7):
        """Angled panels over the stepped bow, like a fibreglass hull."""
        zs = [self.bow_start + (self.bow_tip + 0.6 - self.bow_start) * (i / panels) ** 0.8
              for i in range(panels + 1)]
        out = []
        for za, zb in zip(zs, zs[1:]):                         # za aft, zb fore
            xa, xb = self.half_width(za), self.half_width(zb)
            length = math.hypot(xa - xb, za - zb)
            angle = math.degrees(math.atan2(xa - xb, za - zb))
            bulge = max(self.half_width(za + (zb - za) * t / 8) - (xa + (xb - xa) * t / 8)
                        for t in range(9))
            zm = (za + zb) / 2
            cx, b, d = (xa + xb) / 2 + bulge, self.bottom_lift(zm) + 3, self.deck_height(zm)
            wl = self.waterline
            layers = [(self.bottom, b, wl, (0, wl + 2))]
            y = max(b, wl)
            if self.boot:
                layers.append((self.boot, y, y + 0.8, None))
                y += 0.8
            top_band = (wl, self.deck + self.sheer + 1)
            if self.accent:
                layers += [(self.topsides, max(b, y), d - 2.4, top_band),
                           (self.accent, d - 2.4, d - 1.8, None),
                           (self.topsides, d - 1.8, d - 0.3, top_band)]
            else:
                layers.append((self.topsides, max(b, y), d - 0.3, top_band))
            half = length / 2 + 0.2
            for sign in (1, -1):
                for mat, y0, y1, band in layers:
                    if y1 - y0 < 0.05:
                        continue
                    out.append(box(mat, sign * cx - 0.2, y0, zm - half, sign * cx + 0.2, y1,
                                   zm + half, rotation=(0, sign * angle, 0),
                                   pivot=(sign * cx, y0, zm), band=band))
                if self.rail:
                    out.append(box(self.rail, sign * cx - 0.35, d - 1.1, zm - half,
                                   sign * cx + 0.45, d - 0.4, zm + half,
                                   rotation=(0, sign * angle, 0), pivot=(sign * cx, d, zm)))
        return out


# --- export ------------------------------------------------------------------------

def _resolve_face(f, origin):
    m, a, b, at, band = f["_m"], f["_a"], f["_b"], f["_at"], f["_band"]
    if m not in MATERIALS:
        raise KeyError(f"unknown material {m!r}")
    tx, ty = origin[m]
    span = TILE - 2
    r = lambda n: round(n, 3)
    if MATERIALS[m][1] == "stretch":
        if band:
            lo, hi = band
            v0 = (hi - at[1] - b) / (hi - lo) * span
            return {"uv": [tx + 1, r(ty + 1 + min(max(0, v0), span - 0.5))],
                    "uv_size": [span, r(max(0.25, min(b / (hi - lo) * span, span)))]}
        return {"uv": [tx + 1, ty + 1], "uv_size": [span, span]}
    a, b = min(a, span), min(b, span)
    u0 = (at[0] + 31) % (span - a) if span > a else 0
    v0 = (at[1] + 31) % (span - b) if span > b else 0
    return {"uv": [r(tx + 1 + u0), r(ty + 1 + v0)], "uv_size": [r(a), r(b)]}


def geometry(identifier, bones):
    """Export bones as a Bedrock .geo.json dict, resolving every face's UV."""
    origin, uw, uh = atlas_layout()
    out = []
    lo, hi = [1e9] * 3, [-1e9] * 3
    for b in bones:
        b = dict(b)
        cubes = []
        for c in b.get("cubes", []):
            c = dict(c)
            c["uv"] = {k: _resolve_face(f, origin) for k, f in c["uv"].items()}
            for i in range(3):
                lo[i] = min(lo[i], c["origin"][i])
                hi[i] = max(hi[i], c["origin"][i] + c["size"][i])
            cubes.append(c)
        if cubes:
            b["cubes"] = cubes
        else:
            b.pop("cubes", None)
        out.append(b)
    size_x, size_y, size_z = (hi[i] - lo[i] for i in range(3))
    return {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": identifier,
                "texture_width": uw,
                "texture_height": uh,
                "visible_bounds_width": round(max(size_x, size_z) / 16 + 1, 1),
                "visible_bounds_height": round(size_y / 16 + 1, 1),
                "visible_bounds_offset": [0, round((lo[1] + hi[1]) / 32, 2), 0],
            },
            "bones": out,
        }],
    }


def materials_used(bones):
    names = set()
    for b in bones:
        for c in b.get("cubes", []):
            for f in c["uv"].values():
                names.add(f["_m"])
    return names


def count_boxes(bones):
    return sum(len(b.get("cubes", [])) for b in bones)
