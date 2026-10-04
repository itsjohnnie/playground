"""Hot air balloon: a rainbow teardrop envelope over a wicker basket.

The envelope is sliced into horizontal rings of sixteen gores. A white band
runs round its middle: LUNA is spelled across the front gores, INDI across
the back ones. The burner flame flickers.
"""
import math

from artkit import (box, mirrored, cylinder, bar, decal, material, TILE,
                    mix, rgb, scale, noise, glint)

INFO = {
    "id": "hot_air_balloon", "name": "Hot Air Balloon", "kind": "Rainbow Balloon",
    "group": "Air", "mode": "air", "length": 3,
    "specs": [("Height", "6 blocks"), ("Envelope", "3 blocks wide"), ("Seats", "4"),
              ("Top speed", "Gentle breeze")],
    "seats": [(-4.5, 3.5, -4.5), (4.5, 3.5, -4.5), (-4.5, 3.5, 4.5), (4.5, 3.5, 4.5)],
    "collision": (1.4, 1.0), "health": 10,
    "fly_speed": 0.04,
    "recipe": {"shapeless": ["minecraft:white_wool", "minecraft:red_wool",
                             "minecraft:yellow_wool", "minecraft:blue_wool",
                             "minecraft:string", "minecraft:campfire"]},
    "recipe_text": "4 Wool (white, red, yellow, blue) + String + Campfire",
    "spawn_egg": ("#E8483C", "#F6C431"),
    "anim": [
        {"bone": "flame", "type": "bob", "axis": "y", "amp": 30, "freq": 2.3},
        {"bone": "flame", "type": "bob", "axis": "z", "amp": 7, "freq": 4.1},
        {"bone": "flame", "type": "bob", "axis": "x", "amp": 5, "freq": 3.3},
    ],
    "eggs": "INDI in big letters on the front and the back of the envelope",
    "egg_cam": {"eye": [0, 62, -175], "at": [0, 52, 0]},
}

N = 16                       # gores round the envelope
MOUTH_Y, MOUTH_R = 34, 11    # bottom opening
EQ_Y, EQ_R = 70, 24          # widest ring
TOP_Y = EQ_Y + EQ_R          # crown
BAND = (61, 73)              # white name band
ENV = (MOUTH_Y, TOP_Y)

RAINBOW = [("red", "#F0453A", "#A8191A"), ("orange", "#FF9A2E", "#C2560A"),
           ("yellow", "#FFE04A", "#D19E0E"), ("green", "#5FCF56", "#227A2C"),
           ("teal", "#38C9C2", "#127A80"), ("blue", "#3E7FE8", "#1A3F96"),
           ("purple", "#9B5BDB", "#552488"), ("pink", "#FF7EB8", "#C23A78")]


def _gore(light, dark):
    lo, hi = rgb(light), rgb(dark)
    tape = rgb("#E9E2CF")

    def painter(u, v):
        if u < 0.035 or u > 0.965:                       # load tapes along the seams
            return scale(tape, noise(0.03))
        c = mix(lo, hi, v ** 1.25)
        c = mix(c, (255, 255, 255), glint(v, at=0.18, width=0.12, strength=0.35))
        return scale(c, noise(0.025) * (1 - 0.06 * math.sin(u * math.pi * 6) ** 2))
    return painter


for _n, _l, _d in RAINBOW:
    material(f"hot_air_balloon_{_n}", _gore(_l, _d))
    material(f"hot_air_balloon_{_n}_edge",
             (lambda c: lambda u, v: scale(c, noise(0.03)))(mix(rgb(_l), rgb(_d), 0.6)))


def _band(u, v):
    if u < 0.035 or u > 0.965:
        return scale(rgb("#E1D9C4"), noise(0.03))
    if v < 0.06 or v > 0.94:                             # navy piping top and bottom
        return rgb("#22356A")
    return scale(mix(rgb("#FFFFFF"), rgb("#E4E4DE"), v), noise(0.02))


material("hot_air_balloon_band", _band)
for _side in ("luna", "indi"):              # both sides of the envelope say INDI
    for _i, _ch in enumerate("INDI"):
        decal(f"hot_air_balloon_{_side}{_i}", _ch, "#22356A", _band,
              box=(0.16, 0.16, 0.68, 0.68))


def _wicker(u, v):
    """Basket weave: horizontal weavers over upright stakes (a tile)."""
    x, y = u * TILE, v * TILE
    row, fy = int(y / 2.5), (y / 2.5) % 1
    stake = int((x + (row % 2) * 2) / 4)
    fx = ((x + (row % 2) * 2) / 4) % 1
    if fy < 0.12:
        return scale(rgb("#4A3218"), noise(0.1))
    shade = 0.72 + 0.38 * math.sin(math.pi * fy) * (0.85 + 0.15 * math.sin(math.pi * fx))
    base = rgb("#C99E5C") if (stake + row) % 3 else rgb("#B58A4C")
    return scale(base, shade * noise(0.1))


def _suede(u, v):
    c = mix(rgb("#8A5531"), rgb("#4E2C17"), v)
    if abs(v - 0.12) < 0.03 or abs(v - 0.88) < 0.03:     # stitching
        return rgb("#E8D3A8")
    return scale(c, noise(0.06))


def _flame(core, edge):
    a, b = rgb(core), rgb(edge)
    return lambda u, v: mix(a, b, abs(u - 0.5) * 1.6 + v * 0.3)


material("hot_air_balloon_wicker", _wicker, "tile")
material("hot_air_balloon_suede", _suede)
material("hot_air_balloon_nomex", lambda u, v: scale(mix(rgb("#3A3B40"), rgb("#1D1E22"), v), noise(0.05)))
material("hot_air_balloon_flame_core", _flame("#FFFDE8", "#FFE36A"))
material("hot_air_balloon_flame", _flame("#FFC233", "#FF6A12"))
material("hot_air_balloon_flame_blue", _flame("#BFE6FF", "#3C7DFF"))


# --- envelope -------------------------------------------------------------------

def radius(y):
    if y >= EQ_Y:
        return math.sqrt(max(0.0, EQ_R ** 2 - (y - EQ_Y) ** 2))
    s = (y - MOUTH_Y) / (EQ_Y - MOUTH_Y)
    return MOUTH_R + (EQ_R - MOUTH_R) * math.sin(s * math.pi / 2) ** 0.85


def slice_edges():
    ys, y = [], MOUTH_Y
    while y < TOP_Y - 1:
        ys.append(y)
        y += 2 if y < EQ_Y + 12 else 1
    ys.append(TOP_Y - 1)
    for b in BAND:                     # the name band starts and ends on an edge
        if b not in ys:
            ys.append(b)
    return sorted(ys)


def letter_for(k):
    """Which name letter sits on gore k (front gores LUNA, back gores INDI)."""
    front = {9: 0, 8: 1, 7: 2, 6: 3}      # gores round theta=180 (the -z side)
    back = {1: 0, 0: 1, 15: 2, 14: 3}     # gores round theta=0 (the +z side)
    if k in front:
        return f"hot_air_balloon_luna{front[k]}"
    if k in back:
        return f"hot_air_balloon_indi{back[k]}"
    return None


def envelope():
    cubes = []
    ys = slice_edges()
    for y0, y1 in zip(ys, ys[1:]):
        ra, rb = radius(y0), radius(y1)
        r = radius((y0 + y1) / 2)
        th = max(1.2, r - min(ra, rb) + 0.7)
        w = r * math.tan(math.pi / N) + 0.12
        in_band = BAND[0] <= y0 and y1 <= BAND[1]
        for k in range(N):
            theta = 360 * (k + 0.5) / N
            colour = RAINBOW[k % len(RAINBOW)][0]
            mat, band = f"hot_air_balloon_{colour}", ENV
            edge = f"hot_air_balloon_{colour}_edge"
            if in_band:
                mat, band, edge = letter_for(k) or "hot_air_balloon_band", BAND, "deck"
            cubes.append(box(mat, -w, y0, r - th, w, y1, r, rotation=(0, theta, 0),
                             pivot=(0, y0, 0), band=band, top=edge, bottom=edge))
    # the crown: a parachute vent capped in white with a red ring
    yc = TOP_Y - 1
    rc = radius(yc) + 0.2
    cubes += cylinder("hot_air_balloon_red_edge", (0, yc - 0.4, 0), rc, 1.6, "y", 8)
    cubes += cylinder("deck", (0, yc + 0.2, 0), rc - 1.6, 1.0, "y", 8)
    cubes += cylinder("hot_air_balloon_nomex", (0, yc + 0.6, 0), 1.0, 0.6, "y", 4)
    # skirt (scoop) round the mouth
    for k in range(N):
        theta = 360 * (k + 0.5) / N
        w = MOUTH_R * math.tan(math.pi / N) + 0.15
        cubes.append(box("hot_air_balloon_nomex", -w, MOUTH_Y - 3.5, MOUTH_R - 1.0, w,
                         MOUTH_Y + 0.6, MOUTH_R, rotation=(0, theta, 0),
                         pivot=(0, MOUTH_Y, 0)))
    return cubes


# --- basket, burner, cables ---------------------------------------------------------

B = 10            # half the basket width
RIM = 13          # top of the wicker


def basket():
    W = "hot_air_balloon_wicker"
    S = "hot_air_balloon_suede"
    cubes = [
        box("hot_air_balloon_suede", -B + 0.5, 0, -B + 0.5, B - 0.5, 1.2, B - 0.5),   # base
        box("teak", -B + 1.5, 1.2, -B + 1.5, B - 1.5, 1.5, B - 1.5),                 # floor
    ]
    cubes += mirrored(W, B - 1.5, B, 1.0, -B, RIM, B)                                # walls
    cubes.append(box(W, -B + 1.5, 1.0, -B, B - 1.5, RIM, -B + 1.5))
    cubes.append(box(W, -B + 1.5, 1.0, B - 1.5, B - 1.5, RIM, B))
    # padded suede rim
    cubes += mirrored(S, B - 1.9, B + 0.4, RIM, -B - 0.4, RIM + 1.8, B + 0.4)
    cubes.append(box(S, -B + 1.9, RIM, -B - 0.4, B - 1.9, RIM + 1.8, -B + 1.9))
    cubes.append(box(S, -B + 1.9, RIM, B - 1.9, B - 1.9, RIM + 1.8, B + 0.4))
    # leather corner guards and bottom skids
    for sx in (-1, 1):
        for sz in (-1, 1):
            x, z = sx * B, sz * B
            cubes.append(box(S, x - 1.4 * sx, 0, z - 0.25 * sz, x + 0.25 * sx, RIM, z - 1.4 * sz,
                             rotation=None))
            cubes.append(box(S, x - 2.2 * sx, 0, z + 0.25 * sz, x + 0.25 * sx, 2.2, z - 2.2 * sz))
    cubes += mirrored("hot_air_balloon_suede", 5, 7, 0, -B - 0.3, 0.8, B + 0.3)
    # rope handles on each side
    for sx in (-1, 1):
        for zc in (-4.5, 4.5):
            cubes.append(box("tan", sx * (B + 0.1), 8.6, zc - 1.6, sx * (B + 0.7), 9.2, zc + 1.6))
            cubes.append(box("tan", sx * (B + 0.1), 7.6, zc - 1.6, sx * (B + 0.7), 9.2, zc - 1.0))
            cubes.append(box("tan", sx * (B + 0.1), 7.6, zc + 1.0, sx * (B + 0.7), 9.2, zc + 1.6))
    # two fuel tanks inside, strapped to the walls, with valves
    for sz in (-1, 1):
        c = (0, 6.5, sz * 6.8)
        cubes += cylinder("steel", c, 2.3, 10, "y", 4)
        cubes += cylinder("steel", (0, 11.9, sz * 6.8), 1.6, 1.0, "y", 4)
        cubes.append(box("chrome", -0.5, 12.3, sz * 6.8 - 0.5, 0.5, 13.4, sz * 6.8 + 0.5))
        cubes.append(box("hot_air_balloon_suede", -2.5, 8, sz * 6.8 - 2.5, 2.5, 9, sz * 6.8 + 2.5))
    # instrument pouch with an altimeter
    cubes.append(box("black", -3, 10.5, -B + 1.4, 3, 12.8, -B + 2.2))
    cubes.append(box("screen", -1.5, 11.0, -B + 2.2, 1.5, 12.3, -B + 2.35))
    return cubes


FRAME_Y = 24
F = 8             # half the burner frame


def burner():
    S = "hot_air_balloon_suede"
    cubes = []
    for sx in (-1, 1):
        for sz in (-1, 1):
            # nylon-sleeved uprights from the basket corners to the frame
            cubes.append(bar(S, (sx * (B - 0.9), RIM + 1.8, sz * (B - 0.9)),
                             (sx * (F - 0.2), FRAME_Y, sz * (F - 0.2)), 1.3))
    # square frame
    cubes += mirrored("steel", F - 0.6, F + 0.6, FRAME_Y - 0.6, -F - 0.6, FRAME_Y + 0.6, F + 0.6)
    cubes.append(box("steel", -F + 0.6, FRAME_Y - 0.6, -F - 0.6, F - 0.6, FRAME_Y + 0.6, -F + 0.6))
    cubes.append(box("steel", -F + 0.6, FRAME_Y - 0.6, F - 0.6, F - 0.6, FRAME_Y + 0.6, F + 0.6))
    # gimbal cross bars and the double burner
    cubes.append(box("gunmetal", -F, FRAME_Y - 0.4, -0.4, F, FRAME_Y + 0.4, 0.4))
    for sx in (-1, 1):
        c = (sx * 2.8, FRAME_Y + 2.3, 0)
        cubes += cylinder("steel", c, 2.6, 4.2, "y", 6)             # vaporising coil
        cubes += [box("gunmetal", sx * 2.8 - 2.75, FRAME_Y + 0.6 + i * 1.1, -2.75 * 0.4,
                      sx * 2.8 + 2.75, FRAME_Y + 0.9 + i * 1.1, 2.75 * 0.4) for i in range(4)]
        cubes += cylinder("chrome", (sx * 2.8, FRAME_Y + 4.7, 0), 1.6, 0.8, "y", 4)
        # blast valve handle and fuel hose
        cubes.append(box("black", sx * 2.8 - 0.4, FRAME_Y - 2.4, -2.6, sx * 2.8 + 0.4, FRAME_Y + 0.2, -1.8))
        cubes.append(bar("black", (sx * 2.8, FRAME_Y - 0.5, 1.5), (sx * 1.0, 13.5, 6.8), 0.6))
    # cables: frame corners and mid-sides up to the skirt
    pts = [(F, F), (-F, F), (F, -F), (-F, -F), (F, 0), (-F, 0), (0, F), (0, -F)]
    for x, z in pts:
        a = math.atan2(x, z)
        top = (math.sin(a) * (MOUTH_R - 0.6), MOUTH_Y - 3.4, math.cos(a) * (MOUTH_R - 0.6))
        cubes.append(bar("gunmetal", (x * 0.98, FRAME_Y + 0.5, z * 0.98), top, 0.4))
    return cubes


def flame():
    y = FRAME_Y + 5.1
    cubes = []
    for sx in (-1, 1):
        x = sx * 2.8
        cubes += cylinder("hot_air_balloon_flame_blue", (x, y + 0.6, 0), 1.1, 1.2, "y", 2)
        cubes += cylinder("hot_air_balloon_flame", (x, y + 3.2, 0), 1.6, 4.4, "y", 2)
        cubes += cylinder("hot_air_balloon_flame_core", (x, y + 2.6, 0), 0.9, 3.4, "y", 2)
    cubes += cylinder("hot_air_balloon_flame", (0.4, y + 6.4, 0.3), 1.9, 3.0, "y", 2)
    cubes += cylinder("hot_air_balloon_flame_core", (0.2, y + 5.6, 0.2), 1.1, 2.0, "y", 2)
    cubes.append(box("hot_air_balloon_flame", -0.6, y + 7.6, -0.9, 1.1, y + 10.4, 0.6,
                     rotation=(10, 30, 8)))
    cubes.append(box("hot_air_balloon_flame", 1.0, y + 5.4, 0.2, 2.2, y + 7.8, 1.4,
                     rotation=(-12, 15, -10)))
    return {"name": "flame", "parent": "root", "pivot": [0, y, 0], "cubes": cubes}


def build():
    return [
        {"name": "root", "pivot": [0, 0, 0]},
        {"name": "basket", "parent": "root", "pivot": [0, 0, 0], "cubes": basket() + burner()},
        {"name": "envelope", "parent": "root", "pivot": [0, MOUTH_Y, 0], "cubes": envelope()},
        flame(),
    ]
