"""Generate the speedboat's model, paint job, item icon and pack icons.

Every vehicle is a stack of boxes. Each box gets one paint colour; its top
face is painted a shade lighter and its bottom a shade darker, so the shape
reads in-game without hand-painting a texture. Later the kids can open the
generated .geo.json in Blockbench and remodel it by hand.

    python3 tools/gen_art.py
"""
import json
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
    raw = b"".join(b"\x00" + bytes(c for px in row for c in px) for row in pixels)

    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def hex_rgba(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def shade(rgba, k):
    return tuple(max(0, min(255, round(c * k))) for c in rgba[:3]) + (255,)


# --- paint palette ----------------------------------------------------------

PAINT = {
    "white": "#F2F2EE",
    "red": "#D3262E",
    "glass": "#8FD3F0",
    "seat": "#2B2B30",
    "engine": "#3C4048",
    "chrome": "#C9CED6",
}

CELL = 4                 # each colour is a 4x4 swatch; faces sample its middle
TEX = 32                 # palette texture is 32x32 (8x8 swatches)
SHADES = {"top": 1.12, "side": 1.0, "bottom": 0.7}


def build_palette():
    """Lay out one swatch per (paint, shade); return texture + uv lookup."""
    pixels = [[(0, 0, 0, 0)] * TEX for _ in range(TEX)]
    uv = {}
    i = 0
    for name, hexcol in PAINT.items():
        for shade_name, k in SHADES.items():
            x, y = (i % (TEX // CELL)) * CELL, (i // (TEX // CELL)) * CELL
            col = shade(hex_rgba(hexcol), k)
            for yy in range(y, y + CELL):
                for xx in range(x, x + CELL):
                    pixels[yy][xx] = col
            uv[(name, shade_name)] = [x + 1, y + 1]
            i += 1
    return pixels, uv


# --- the speedboat ----------------------------------------------------------
# Units are pixels (16 = one block). The bow points to -z.
# (paint, origin [x, y, z], size [w, h, d])

SPEEDBOAT = [
    # hull: red below the waterline, white above, deck flush at y=7
    ("red",    [-9, 0, -14], [18, 3, 30]),
    ("white",  [-9, 3, -14], [18, 4, 30]),
    # pointed bow, narrowing in three steps
    ("red",    [-7, 0, -18], [14, 3, 4]),
    ("white",  [-7, 3, -18], [14, 4, 4]),
    ("red",    [-5, 1, -21], [10, 2, 3]),
    ("white",  [-5, 3, -21], [10, 4, 3]),
    ("red",    [-2, 2, -23], [4, 1, 2]),
    ("white",  [-2, 3, -23], [4, 4, 2]),
    # chrome rails along both sides
    ("chrome", [-9, 7, -12], [1, 1, 26]),
    ("chrome", [8, 7, -12], [1, 1, 26]),
    # dashboard + windshield
    ("engine", [-6, 7, -9], [12, 2, 2]),
    ("glass",  [-7, 9, -9], [14, 4, 1]),
    # driver bench + backrest, passenger bench + backrest
    ("seat",   [-6, 7, -3], [12, 2, 6]),
    ("seat",   [-6, 9, 2], [12, 4, 1]),
    ("seat",   [-6, 7, 6], [12, 2, 5]),
    ("seat",   [-6, 9, 10], [12, 4, 1]),
    # outboard motor hanging off the stern, with a red cap and a propeller
    ("engine", [-3, 4, 16], [6, 8, 4]),
    ("red",    [-3, 12, 16], [6, 1, 4]),
    ("chrome", [-1, -2, 17], [2, 6, 2]),
    ("chrome", [-3, -3, 17.5], [6, 1, 1]),
]


def face_uvs(paint, uv):
    face = lambda s: {"uv": uv[(paint, s)], "uv_size": [2, 2]}
    return {
        "north": face("side"), "south": face("side"),
        "east": face("side"), "west": face("side"),
        "up": face("top"), "down": face("bottom"),
    }


def build_geometry(identifier, cubes, uv):
    return {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": identifier,
                "texture_width": TEX,
                "texture_height": TEX,
                "visible_bounds_width": 4,
                "visible_bounds_height": 2,
                "visible_bounds_offset": [0, 0.5, 0],
            },
            "bones": [{
                "name": "body",
                "pivot": [0, 0, 0],
                "cubes": [
                    {"origin": o, "size": s, "uv": face_uvs(p, uv)}
                    for p, o, s in cubes
                ],
            }],
        }],
    }


# --- icons --------------------------------------------------------------------

ICON = [  # 16x16 side view of the speedboat, bow to the right
    "................",
    "................",
    "................",
    "................",
    "................",
    ".........g......",
    "........gg......",
    "...ss..ggg......",
    "...ss..ggg......",
    ".e.ssssssss.....",
    "eeWWWWWWWWWWWW..",
    "eeWWWWWWWWWWWWW.",
    ".eRRRRRRRRRRRRR.",
    "..RRRRRRRRRRRR..",
    "...k............",
    "................",
]
ICON_COLOURS = {
    ".": (0, 0, 0, 0),
    "W": hex_rgba(PAINT["white"]),
    "R": hex_rgba(PAINT["red"]),
    "g": hex_rgba(PAINT["glass"]),
    "s": hex_rgba(PAINT["seat"]),
    "e": hex_rgba(PAINT["engine"]),
    "k": hex_rgba(PAINT["chrome"]),
}


def icon_pixels(scale=1, background=None):
    rows = []
    for line in ICON:
        row = []
        for ch in line:
            col = ICON_COLOURS[ch]
            if col[3] == 0 and background:
                col = background
            row.extend([col] * scale)
        rows.extend([row] * scale)
    return rows


def pack_icon(background):
    # 16x16 icon scaled 8x = 128x128, water stripe under the hull
    px = icon_pixels(scale=8, background=background)
    water = hex_rgba("#2F7FD1")
    for y in range(13 * 8, 128):
        px[y] = [water if c == background else c for c in px[y]]
    return px


def main():
    palette, uv = build_palette()
    write_png(RP / "textures/entity/speedboat.png", palette)
    geo = build_geometry("geometry.vroom.speedboat", SPEEDBOAT, uv)
    (RP / "models/entity/speedboat.geo.json").write_text(json.dumps(geo, indent=2) + "\n")
    write_png(RP / "textures/items/speedboat.png", icon_pixels())
    write_png(RP / "pack_icon.png", pack_icon(hex_rgba("#9EDBFF")))
    write_png(BP / "pack_icon.png", pack_icon(hex_rgba("#FFD54A")))
    print("art generated")


if __name__ == "__main__":
    main()
