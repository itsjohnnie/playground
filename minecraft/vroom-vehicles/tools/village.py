"""Generate Vroom Harbor, a village for Luna & Indi, as Minecraft structures.

    python3 tools/village.py

The village is 128 x 96 blocks (32 tall) on the water: town hall with a
clock tower, police station, grocery store, cafe, Vroom Motors showroom, Gem
Gallery, Luna & Indi Park with golden statues and a tribute wall, houses, a
harbor with piers, a marina, a boathouse and a lighthouse.

Writes four 64 x 32 x 48 .mcstructure tiles into the behavior pack (Bedrock's
structure files) plus a function that places all four, and village/village.json
+ village/atlas.png for the previewer and the teaser video.

In the game, with cheats on: stand where the village's north-west corner
should go, then run  /function vroom/village
"""
import base64
import json
import struct
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from village_blocks import BLOCKS, BLOCK_VERSION, write_atlas  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
BP = ROOT / "packs" / "VroomVehicles_BP"
OUT = ROOT / "village"

W, H, D = 128, 32, 96          # x (east), y (up), z (south)
G = 3                          # the ground's top layer
TILE_W, TILE_D = 64, 48


class Village:
    def __init__(self):
        self.b = {}
        self.vehicles = []       # props for the preview: (vehicle id, x, y, z, yaw degrees)

    def set(self, x, y, z, k):
        if 0 <= x < W and 0 <= y < H and 0 <= z < D:
            if k is None:
                self.b.pop((x, y, z), None)
            else:
                assert k in BLOCKS, k
                self.b[(x, y, z)] = k

    def get(self, x, y, z):
        return self.b.get((x, y, z))

    def fill(self, x0, y0, z0, x1, y1, z1, k):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            for y in range(min(y0, y1), max(y0, y1) + 1):
                for z in range(min(z0, z1), max(z0, z1) + 1):
                    self.set(x, y, z, k)

    def walls(self, x0, z0, x1, z1, y0, y1, k):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, z0, k)
                self.set(x, y, z1, k)
            for z in range(z0, z1 + 1):
                self.set(x0, y, z, k)
                self.set(x1, y, z, k)

    def clear(self, x0, y0, z0, x1, y1, z1):
        self.fill(x0, y0, z0, x1, y1, z1, None)


# --- signage fonts ----------------------------------------------------------------------

SMALL = {  # 3 wide (M and W 5 wide), 5 tall
    "A": ["010", "101", "111", "101", "101"], "B": ["110", "101", "110", "101", "110"],
    "C": ["011", "100", "100", "100", "011"], "D": ["110", "101", "101", "101", "110"],
    "E": ["111", "100", "110", "100", "111"], "F": ["111", "100", "110", "100", "100"],
    "G": ["011", "100", "101", "101", "011"], "H": ["101", "101", "111", "101", "101"],
    "I": ["111", "010", "010", "010", "111"], "L": ["100", "100", "100", "100", "111"],
    "N": ["101", "111", "111", "111", "101"], "O": ["010", "101", "101", "101", "010"],
    "P": ["110", "101", "110", "100", "100"], "R": ["110", "101", "110", "101", "101"],
    "S": ["011", "100", "010", "001", "110"], "T": ["111", "010", "010", "010", "010"],
    "U": ["101", "101", "101", "101", "111"], "V": ["101", "101", "101", "101", "010"],
    "Y": ["101", "101", "010", "010", "010"],
    "M": ["10001", "11011", "10101", "10001", "10001"],
    "W": ["10001", "10001", "10101", "11011", "10001"],
}
BIG = {  # 5 x 5, for the tribute wall
    "L": ["10000", "10000", "10000", "10000", "11111"],
    "U": ["10001", "10001", "10001", "10001", "01110"],
    "N": ["10001", "11001", "10101", "10011", "10001"],
    "A": ["01110", "10001", "11111", "10001", "10001"],
    "I": ["11111", "00100", "00100", "00100", "11111"],
    "D": ["11110", "10001", "10001", "10001", "11110"],
}


def word_width(word, font):
    return sum(len(font[c][0]) for c in word) + len(word) - 1


def letters(v, word, font, x_start, y_top, z, k, facing="south"):
    """Write `word` as blocks on the plane z, reading correctly from `facing`.

    facing south: readers stand south looking north, text runs +x.
    facing north: readers stand north looking south, text runs -x.
    """
    step = 1 if facing == "south" else -1
    x = x_start
    for c in word:
        rows = font[c]
        w = len(rows[0])
        for r, row in enumerate(rows):
            for i, bit in enumerate(row):
                if bit == "1":
                    v.set(x + step * i, y_top - r, z, k)
        x += step * (w + 1)


def letters_centered(v, word, font, cx, y_top, z, k, facing="south"):
    w = word_width(word, font)
    start = cx - w // 2 if facing == "south" else cx + w // 2
    letters(v, word, font, start, y_top, z, k, facing)


# --- building parts ----------------------------------------------------------------------

def windows(v, x0, z0, x1, z1, y0, y1, every=3, skip=()):
    """Glass panes along all four walls, leaving corners and `skip` columns."""
    for x in range(x0 + 2, x1 - 1, every):
        for z in (z0, z1):
            if (x, z) not in skip:
                v.fill(x, y0, z, x, y1, z, "glass_pane")
    for z in range(z0 + 2, z1 - 1, every):
        for x in (x0, x1):
            if (x, z) not in skip:
                v.fill(x, y0, z, x, y1, z, "glass_pane")


def doorway(v, x, z, width=1, height=2, axis="x"):
    for i in range(width):
        xx, zz = (x + i, z) if axis == "x" else (x, z + i)
        v.fill(xx, G + 1, zz, xx, G + height, zz, None)


def corners(v, x0, z0, x1, z1, y0, y1, k):
    for x, z in ((x0, z0), (x1, z0), (x0, z1), (x1, z1)):
        v.fill(x, y0, z, x, y1, z, k)


def gable_roof(v, x0, z0, x1, z1, y, wood, gable="planks", overhang=1, max_layers=5):
    """A pitched roof with its ridge running east-west, slopes to north and south.

    Wide buildings stop climbing after `max_layers` and finish with a flat top.
    """
    zs, ze = z0 - overhang, z1 + overhang
    layer = 0
    while zs + layer <= ze - layer:
        if layer == max_layers:
            v.fill(x0 - overhang, y + layer - 1, zs + layer, x1 + overhang, y + layer - 1,
                   ze - layer, f"{wood}_planks")
            v.fill(x0 - overhang, y + layer, zs + layer, x1 + overhang, y + layer, ze - layer,
                   f"{wood}_slab")
            break
        yy = y + layer
        zn, zsouth = zs + layer, ze - layer
        for x in range(x0 - overhang, x1 + overhang + 1):
            if zn == zsouth:
                v.set(x, yy, zn, f"{wood}_slab")
            else:
                v.set(x, yy, zn, f"{wood}_stairs_s")      # rises toward the ridge (south)
                v.set(x, yy, zsouth, f"{wood}_stairs_n")
        # fill the gable ends under this layer
        for z in range(zn + 1, zsouth):
            for x in (x0, x1):
                v.set(x, yy, z, f"{wood}_{gable}" if gable == "planks" else gable)
        layer += 1


def flat_roof(v, x0, z0, x1, z1, y, k, parapet=None):
    v.fill(x0, y, z0, x1, y, z1, k)
    if parapet:
        v.walls(x0, z0, x1, z1, y + 1, y + 1, parapet)


def lamp_post(v, x, z, base=G):
    v.fill(x, base + 1, z, x, base + 3, z, "spruce_fence")
    v.set(x, base + 4, z, "lantern")


def tree(v, x, z, height=5, base=G, small=False):
    v.fill(x, base + 1, z, x, base + height, z, "oak_log")
    top = base + height
    layers = ((-1, 1), (0, 1), (1, 1), (2, 0)) if small else ((-1, 2), (0, 2), (1, 1), (2, 1))
    for dy, r in layers:
        for dx in range(-r, r + 1):
            for dz in range(-r, r + 1):
                if abs(dx) == r and abs(dz) == r and r > 1:
                    continue
                if (dx, dz) == (0, 0) and dy < 1:
                    continue
                v.set(x + dx, top + dy, z + dz, "oak_leaves")


def bench(v, x, z, facing="s", length=3, axis="x"):
    for i in range(length):
        xx, zz = (x + i, z) if axis == "x" else (x, z + i)
        v.set(xx, G + 1, zz, f"spruce_stairs_{facing}")


def table(v, x, z):
    v.set(x, G + 1, z, "oak_fence")
    v.set(x, G + 2, z, "oak_slab")


# --- the village --------------------------------------------------------------------------

def terrain(v):
    for x in range(W):
        for z in range(D):
            if z >= 78:                                    # the bay
                v.set(x, 0, z, "sand")
                for y in range(1, G + 1):
                    v.set(x, y, z, "water")
            elif z >= 74:                                  # the beach
                for y in range(0, G + 1):
                    v.set(x, y, z, "sand")
            else:
                for y in range(0, G):
                    v.set(x, y, z, "dirt")
                v.set(x, G, z, "grass")
    # the promenade along the shore
    v.fill(0, G, 71, W - 1, G, 73, "spruce_planks")
    for x in range(4, W, 10):
        lamp_post(v, x, 71)
    for x in range(9, W, 20):
        bench(v, x, 73, "n")


def streets(v):
    # main street, east-west
    v.fill(0, G, 38, W - 1, G, 44, "gray_concrete")
    v.fill(0, G, 38, W - 1, G, 38, "stone_bricks")
    v.fill(0, G, 44, W - 1, G, 44, "stone_bricks")
    # the avenue, from the town hall steps down to the promenade
    v.fill(60, G, 30, 66, G, 70, "gray_concrete")
    v.fill(60, G, 30, 60, G, 70, "stone_bricks")
    v.fill(66, G, 30, 66, G, 70, "stone_bricks")
    for x in range(3, W, 12):                                 # lamps on the sidewalks
        if not 56 < x < 70:
            lamp_post(v, x, 38)
        if not 56 < x + 6 < 70 and x + 6 != 93:              # not in front of the police door
            lamp_post(v, x + 6, 44)


def town_hall(v):
    x0, z0, x1, z1 = 50, 4, 76, 26
    top = G + 9
    v.fill(x0, G, z0, x1, G, z1, "smooth_stone")
    v.walls(x0, z0, x1, z1, G + 1, top, "stone_bricks")
    corners(v, x0, z0, x1, z1, G + 1, top, "calcite")
    windows(v, x0, z0, x1, z1, G + 2, G + 6, skip={(63, z1), (62, z1), (64, z1)})
    flat_roof(v, x0, z0, x1, z1, top + 1, "smooth_stone", parapet="stone_brick_slab")
    # portico: steps, platform and calcite columns
    v.fill(x0 + 4, G, z1 + 1, x1 - 4, G, z1 + 3, "smooth_stone")
    for x in range(x0 + 5, x1 - 3, 3):
        v.fill(x, G + 1, z1 + 3, x, top, z1 + 3, "calcite")
    v.fill(x0 + 4, top + 1, z1 + 1, x1 - 4, top + 1, z1 + 3, "smooth_stone")
    doorway(v, 62, z1, width=3, height=4)
    # inside: red carpet aisle, bookshelves, a gold podium, lanterns
    v.fill(62, G + 1, z0 + 3, 64, G + 1, z1 - 1, "red_carpet")
    for z in range(z0 + 2, z1 - 1, 2):
        v.fill(x0 + 1, G + 1, z, x0 + 1, G + 3, z, "bookshelf")
        v.fill(x1 - 1, G + 1, z, x1 - 1, G + 3, z, "bookshelf")
    v.fill(61, G + 1, z0 + 2, 65, G + 1, z0 + 2, "gold_block")
    for x in range(x0 + 4, x1 - 3, 6):
        for z in (z0 + 6, z1 - 5):
            v.set(x, G + 1, z, "lantern")
    for x in range(x0 + 3, x1 - 2, 4):                       # rows of seats
        for z in range(z0 + 8, z1 - 3, 3):
            if not 61 <= x <= 65:
                v.fill(x, G + 1, z, x + 1, G + 1, z, "spruce_stairs_s")
    # clock tower in the middle of the roof
    tx0, tz0, tx1, tz1 = 60, 10, 66, 16
    ttop = top + 12
    v.walls(tx0, tz0, tx1, tz1, top + 1, ttop, "stone_bricks")
    corners(v, tx0, tz0, tx1, tz1, top + 1, ttop, "calcite")
    for (cx, cz, axis) in ((63, tz1, "x"), (63, tz0, "x"), (tx0, 13, "z"), (tx1, 13, "z")):
        cy = ttop - 4
        for d in (-1, 0, 1):
            for e in (-1, 0, 1):
                if axis == "x":
                    v.set(cx + d, cy + e, cz, "gold_block")
                else:
                    v.set(cx, cy + e, cz + d, "gold_block")
        if axis == "x":
            v.set(cx, cy, cz, "black_concrete")
            v.set(cx, cy + 1, cz, "black_concrete")
        else:
            v.set(cx, cy, cz, "black_concrete")
            v.set(cx, cy + 1, cz, "black_concrete")
    for i in range(4):                                        # pyramid cap
        v.fill(tx0 + i, ttop + 1 + i, tz0 + i, tx1 - i, ttop + 1 + i, tz1 - i, "dark_oak_planks")
    v.set(63, ttop + 5, 13, "gold_block")
    # a helipad on the east roof
    v.fill(68, top + 1, 8, 74, top + 1, 14, "gray_concrete")
    for z in range(9, 14):
        v.set(69, top + 1, z, "white_concrete")
        v.set(73, top + 1, z, "white_concrete")
    v.fill(70, top + 1, 11, 72, top + 1, 11, "white_concrete")
    v.vehicles.append(("helicopter", 71.5, top + 2, 11.5, 90))


def police_station(v):
    x0, z0, x1, z1 = 82, 16, 104, 36
    top = G + 9
    v.fill(x0, G, z0, x1, G, z1, "light_gray_concrete")
    v.walls(x0, z0, x1, z1, G + 1, top, "white_concrete")
    corners(v, x0, z0, x1, z1, G + 1, top, "blue_concrete")
    for x in range(x0, x1 + 1):                              # blue stripe band
        for z in (z0, z1):
            v.set(x, G + 4, z, "blue_concrete")
    for z in range(z0, z1 + 1):
        v.set(x0, G + 4, z, "blue_concrete")
        v.set(x1, G + 4, z, "blue_concrete")
    windows(v, x0, z0, x1, z1, G + 2, G + 3, skip={(93, z1)})
    doorway(v, 93, z1, width=1, height=2)
    v.fill(92, G + 1, z1, 92, G + 3, z1, "blue_concrete")
    v.fill(94, G + 1, z1, 94, G + 3, z1, "blue_concrete")
    letters_centered(v, "POLICE", SMALL, 93, top, z1, "blue_concrete")
    flat_roof(v, x0, z0, x1, z1, top + 1, "light_gray_concrete", parapet="white_concrete")
    # light bar on the roof
    for x in range(89, 98):
        v.set(x, top + 2, 30, "blue_glass" if x < 93 else ("sea_lantern" if x == 93 else "red_glass"))
    # inside: desks, a jail cell with bars
    for x in (85, 90, 96):
        for z in (21, 26):
            table(v, x, z)
            v.set(x, G + 1, z + 1, "spruce_stairs_n")
    v.fill(x1 - 6, G + 1, z0 + 1, x1 - 6, G + 3, z0 + 6, "iron_bars")
    v.fill(x1 - 5, G + 1, z0 + 6, x1 - 1, G + 3, z0 + 6, "iron_bars")
    v.set(x1 - 3, G + 1, z0 + 2, "red_wool")


def grocery(v):
    x0, z0, x1, z1 = 4, 16, 24, 36
    top = G + 8
    v.fill(x0, G, z0, x1, G, z1, "spruce_planks")
    v.walls(x0, z0, x1, z1, G + 1, top, "birch_planks")
    corners(v, x0, z0, x1, z1, G + 1, top, "oak_log")
    windows(v, x0, z0, x1, z1, G + 2, G + 3, every=2, skip={(14, z1)})
    doorway(v, 13, z1, width=3, height=3)
    gable_roof(v, x0, z0, x1, z1, top + 1, "dark_oak")
    letters_centered(v, "FOOD", SMALL, 14, top, z1, "green_concrete")
    # striped awning and produce stands out front
    for x in range(x0, x1 + 1):
        v.set(x, G + 4, z1 + 1, "green_wool" if x % 2 else "white_wool")
    for x in range(x0 + 1, x1, 2):
        if not 12 <= x <= 16:
            v.set(x, G + 1, z1 + 1, ["melon", "hay", "barrel"][x % 3])
    # aisles inside
    for z in range(z0 + 3, z1 - 3, 4):
        for x in range(x0 + 3, x1 - 2):
            if x != 14:
                v.set(x, G + 1, z, "barrel")
                v.set(x, G + 2, z, ["melon", "hay", "melon"][x % 3])
    v.fill(x0 + 2, G + 1, z1 - 2, x0 + 5, G + 1, z1 - 2, "crafting_table")


def cafe(v):
    x0, z0, x1, z1 = 28, 20, 44, 36
    top = G + 8
    v.fill(x0, G, z0, x1, G, z1, "oak_planks")
    v.walls(x0, z0, x1, z1, G + 1, top, "bricks")
    windows(v, x0, z0, x1, z1, G + 2, G + 3, every=2, skip={(36, z1)})
    doorway(v, 36, z1, width=1, height=2)
    gable_roof(v, x0, z0, x1, z1, top + 1, "spruce")
    letters_centered(v, "CAFE", SMALL, 36, top, z1, "white_concrete")
    v.fill(x1 - 3, top + 1, z0 + 3, x1 - 3, top + 6, z0 + 3, "bricks")     # chimney
    for x in range(x0, x1 + 1):
        v.set(x, G + 4, z1 + 1, "red_wool" if x % 2 else "white_wool")
    for x in (30, 41):                                        # tables outside
        table(v, x, z1 + 1)
    for x in range(x0 + 3, x1 - 2, 4):                        # tables inside
        table(v, x, 26)
        v.set(x, G + 1, 27, "oak_stairs_n")
    v.fill(x0 + 1, G + 1, z0 + 1, x1 - 1, G + 1, z0 + 1, "bricks")         # counter and oven
    v.fill(x0 + 1, G + 2, z0 + 1, x0 + 3, G + 3, z0 + 1, "bricks")


def house(v, x0, z0, x1, z1, wall, roof, door_x):
    top = G + 5
    v.fill(x0, G, z0, x1, G, z1, "oak_planks")
    v.walls(x0, z0, x1, z1, G + 1, top, wall)
    corners(v, x0, z0, x1, z1, G + 1, top, "spruce_log")
    windows(v, x0, z0, x1, z1, G + 2, G + 3, every=3, skip={(door_x, z1)})
    doorway(v, door_x, z1)
    gable_roof(v, x0, z0, x1, z1, top + 1, roof)
    # garden with a fence and flowers
    for x in range(x0 - 1, x1 + 2):
        v.set(x, G + 1, z1 + 4, "oak_fence")
    for z in range(z1 + 1, z1 + 5):
        v.set(x0 - 1, G + 1, z, "oak_fence")
        v.set(x1 + 1, G + 1, z, "oak_fence")
    v.set(door_x, G + 1, z1 + 4, None)
    for x in range(x0, x1 + 1):
        if x != door_x:
            v.set(x, G + 1, z1 + 2, ["poppy", "dandelion", "cornflower"][x % 3])
    v.fill(door_x, G, z1 + 1, door_x, G, z1 + 6, "gravel")
    v.set(x0 + 2, G + 1, z0 + 2, "red_wool")                 # a bed-ish corner
    v.set(x1 - 2, G + 1, z0 + 2, "crafting_table")


def vroom_motors(v):
    x0, z0, x1, z1 = 4, 48, 30, 68
    top = G + 10
    v.fill(x0, G, z0, x1, G, z1, "white_concrete")
    for x in range(x0 + 1, x1):                               # checker floor
        for z in range(z0 + 1, z1):
            if (x + z) % 2:
                v.set(x, G, z, "light_gray_concrete")
    v.walls(x0, z0, x1, z1, G + 1, top, "white_concrete")
    v.fill(x0 + 1, G + 1, z0, x1 - 1, G + 5, z0, "glass")    # glass showroom front
    v.fill(x0, G + 6, z0, x1, top, z0, "orange_concrete")
    letters_centered(v, "VROOM", SMALL, 17, top, z0, "white_concrete", facing="north")
    doorway(v, 15, z0, width=5, height=5)
    windows(v, x0, z0, x1, z1, G + 2, G + 5, every=3, skip={(x, z0) for x in range(x0, x1 + 1)})
    flat_roof(v, x0, z0, x1, z1, top + 1, "white_concrete", parapet="orange_concrete")
    # display platforms
    for cx, cz, r in ((11, 57, 4), (24, 60, 3)):
        for x in range(cx - r, cx + r + 1):
            for z in range(cz - r, cz + r + 1):
                if (x - cx) ** 2 + (z - cz) ** 2 <= r * r + 1:
                    v.set(x, G + 1, z, "smooth_stone")
    v.vehicles.append(("supercar", 11.5, G + 2, 57.5, 35))
    v.vehicles.append(("go_kart", 24.5, G + 2, 60.5, -30))
    v.vehicles.append(("sport_bike", 22.5, G + 1, 51.5, 80))
    # tyre rack and counter at the back
    for x in range(x0 + 2, x0 + 8):
        v.set(x, G + 1, z1 - 1, "black_wool")
        v.set(x, G + 2, z1 - 1, "black_wool")
    v.fill(x1 - 6, G + 1, z1 - 2, x1 - 2, G + 1, z1 - 2, "orange_concrete")


def gem_gallery(v):
    x0, z0, x1, z1 = 34, 48, 56, 66
    top = G + 9
    v.fill(x0, G, z0, x1, G, z1, "smooth_stone")
    v.walls(x0, z0, x1, z1, G + 1, top, "calcite")
    corners(v, x0, z0, x1, z1, G + 1, top, "amethyst_block")
    windows(v, x0, z0, x1, z1, G + 2, G + 4, every=4, skip={(45, z0)})
    doorway(v, 44, z0, width=3, height=3)
    letters_centered(v, "GEMS", SMALL, 45, top, z0, "purple_concrete", facing="north")
    flat_roof(v, x0, z0, x1, z1, top + 1, "calcite", parapet="amethyst_block")
    v.fill(x0 + 4, top + 1, z0 + 4, x1 - 4, top + 1, z1 - 4, "glass")      # skylight
    # glass display cases, each with a precious block on a pedestal
    gems = ["diamond_block", "emerald_block", "gold_block", "amethyst_block", "lapis_block",
            "redstone_block", "iron_block", "copper_block", "netherite_block", "coal_block"]
    i = 0
    for z in (53, 58):
        for x in (37, 41, 49, 53, 45):
            if i >= len(gems):
                break
            v.set(x, G + 1, z, "smooth_stone")
            v.set(x, G + 2, z, gems[i])
            for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                v.set(x + dx, G + 2, z + dz, "glass")
            v.set(x, G + 3, z, "glass")
            i += 1
    # the centrepiece: a little emerald pyramid
    v.fill(44, G + 1, 61, 46, G + 1, 63, "emerald_block")
    v.set(45, G + 2, 62, "diamond_block")
    # a wall of ores at the back
    ores = ["coal_ore", "iron_ore", "copper_ore", "gold_ore", "redstone_ore", "lapis_ore",
            "diamond_ore", "emerald_ore"]
    for x in range(x0 + 1, x1):
        for y in range(G + 1, G + 6):
            v.set(x, y, z1 - 1, ores[(x * 3 + y * 5) % len(ores)])
    for x in (x0 + 2, x1 - 2):
        v.set(x, G + 1, z0 + 2, "lantern")


def park(v):
    x0, z0, x1, z1 = 70, 48, 100, 70
    # paths: around the edge and a cross through the middle
    for x in range(x0, x1 + 1):
        for z in range(z0, z1 + 1):
            edge = x in (x0, x1) or z in (z0, z1)
            if edge or x == 85 or z == 51:
                v.set(x, G, z, "gravel")
    for (tx, tz) in ((73, 51), (97, 51), (73, 67), (97, 67)):
        tree(v, tx, tz)
    for x in range(x0 + 2, x1 - 1):
        for z in (z0 + 1, z1 - 1):
            if x != 85 and x % 3 == 0:
                v.set(x, G + 1, z, ["poppy", "dandelion", "cornflower", "short_grass"][x % 4])
    for x in (76, 92):
        bench(v, x, 50, "s")
    lamp_post(v, 84, 52)
    lamp_post(v, 86, 52)
    # the fountain where the paths cross
    v.fill(82, G + 1, 47 + 1, 88, G + 1, 47 + 1, None)
    for x in range(83, 88):
        for z in range(48, 52):
            v.set(x, G + 1, z, "stone_bricks" if x in (83, 87) or z in (48, 51) else "water")
    v.fill(85, G + 1, 49, 85, G + 3, 50, "stone_bricks")
    v.set(85, G + 4, 49, "sea_lantern")
    # the tribute: a calcite platform, a black-and-gold monument with their
    # names on the front, and golden statues of Luna and Indi standing on top
    v.fill(71, G + 1, 55, 99, G + 1, 64, "calcite")
    v.fill(72, G + 1, 54, 98, G + 1, 54, "stone_brick_slab")              # the step up
    base, top = G + 2, G + 14
    v.fill(72, base, 60, 98, top, 63, "black_concrete")                   # the monument
    for y in (base, top):                                     # a gold frame on its face
        v.fill(72, y, 60, 98, y, 60, "gold_block")
    v.fill(72, base, 60, 72, top, 60, "gold_block")
    v.fill(98, base, 60, 98, top, 60, "gold_block")
    letters_centered(v, "LUNA", BIG, 85, top - 1, 60, "gold_block", facing="north")
    letters_centered(v, "INDI", BIG, 85, top - 7, 60, "gold_block", facing="north")
    for y in (base, top):                                     # the same on the side facing the beach
        v.fill(72, y, 63, 98, y, 63, "gold_block")
    v.fill(72, base, 63, 72, top, 63, "gold_block")
    v.fill(98, base, 63, 98, top, 63, "gold_block")
    letters_centered(v, "LUNA", BIG, 85, top - 1, 63, "gold_block", facing="south")
    letters_centered(v, "INDI", BIG, 85, top - 7, 63, "gold_block", facing="south")
    for sx in (79, 89):                                       # two golden statues on top
        statue(v, sx, 61, top + 1)
    v.fill(83, top + 4, 61, 88, top + 4, 61, "gold_block")    # holding hands
    v.vehicles.append(("hot_air_balloon", 112, G + 22, 60, 20))


def statue(v, x, z, y):
    """A blocky figure 9 blocks tall, in gold, facing north, standing at height y."""
    v.fill(x, y, z, x, y + 2, z, "gold_block")                # legs
    v.fill(x + 2, y, z, x + 2, y + 2, z, "gold_block")
    v.fill(x, y + 3, z, x + 2, y + 5, z, "gold_block")        # body
    v.fill(x - 1, y + 3, z, x - 1, y + 5, z, "gold_block")    # arms
    v.fill(x + 3, y + 3, z, x + 3, y + 5, z, "gold_block")
    v.fill(x, y + 6, z - 1, x + 2, y + 8, z + 1, "gold_block")  # head


def harbor(v):
    # pier by Vroom Motors, with a speedboat tied up
    pier(v, 18, 20, 74, 92)
    v.vehicles.append(("speedboat", 24.5, G + 0.66, 86, 0))
    # the lighthouse pier at the end of the avenue
    pier(v, 61, 65, 74, 86)
    lighthouse(v, 63, 90)
    # the marina, with finger piers and boats in the slips
    v.fill(100, G, 78, 126, G, 80, "spruce_planks")
    for x in range(104, 127, 7):
        pier(v, x, x + 1, 81, 90, deck_only=True)
    for x, boat in ((107.5, "center_console"), (114.5, "offshore_racer"), (121.5, "wake_boat")):
        v.vehicles.append((boat, x, G + 0.66, 88, 0))
    v.vehicles.append(("jet_ski", 30, G + 0.66, 83, 25))
    # boathouse on the shore
    x0, z0, x1, z1 = 104, 50, 124, 68
    top = G + 8
    v.fill(x0, G, z0, x1, G, z1, "spruce_planks")
    v.walls(x0, z0, x1, z1, G + 1, top, "spruce_planks")
    corners(v, x0, z0, x1, z1, G + 1, top, "spruce_log")
    windows(v, x0, z0, x1, z1, G + 2, G + 3, every=3, skip={(x, z1) for x in range(110, 119)})
    doorway(v, 110, z1, width=9, height=4)
    doorway(v, 114, z0, width=1, height=2)
    gable_roof(v, x0, z0, x1, z1, top + 1, "spruce")
    letters_centered(v, "BOATS", SMALL, 114, top, z0, "white_concrete", facing="north")
    for x in range(x0 + 2, x1 - 1, 3):
        v.set(x, G + 1, z0 + 2, "barrel")


def pier(v, x0, x1, z0, z1, deck_only=False):
    v.fill(x0, G, z0, x1, G, z1, "spruce_planks")
    for z in range(z0, z1 + 1, 4):
        for x in (x0 - 1, x1 + 1):
            v.fill(x, 1, z, x, G, z, "spruce_log")
            if not deck_only:
                v.set(x, G + 1, z, "spruce_fence")
    if not deck_only:
        lamp_post(v, x0 - 1, z1)


def lighthouse(v, cx, cz):
    v.fill(cx - 4, 1, cz - 4, cx + 4, G, cz + 4, "stone_bricks")          # rock base
    for y in range(G + 1, G + 20):
        k = "red_concrete" if ((y - G - 1) // 3) % 2 == 0 else "white_concrete"
        v.walls(cx - 2, cz - 2, cx + 2, cz + 2, y, y, k)
    doorway(v, cx, cz - 2)
    y = G + 20
    v.fill(cx - 3, y, cz - 3, cx + 3, y, cz + 3, "stone_brick_slab")      # gallery
    v.fill(cx - 2, y + 1, cz - 2, cx + 2, y + 3, cz + 2, "glass")         # lantern room
    v.fill(cx - 1, y + 1, cz - 1, cx + 1, y + 3, cz + 1, "glowstone")
    v.set(cx, y + 2, cz, "sea_lantern")
    for i in range(3):
        v.fill(cx - 2 + i, y + 4 + i, cz - 2 + i, cx + 2 - i, y + 4 + i, cz + 2 - i, "red_concrete")


def street_trees(v):
    for x in range(8, 34, 12):
        tree(v, x, 46, 4, small=True)
    for x in range(108, 126, 8):
        tree(v, x, 46, 4, small=True)


def build():
    v = Village()
    terrain(v)
    streets(v)
    town_hall(v)
    police_station(v)
    grocery(v)
    cafe(v)
    house(v, 108, 6, 122, 16, "white_concrete", "dark_oak", 115)
    house(v, 108, 24, 122, 32, "birch_planks", "spruce", 115)
    vroom_motors(v)
    gem_gallery(v)
    park(v)
    harbor(v)
    street_trees(v)
    # paths from doors to the street
    for x, z0, z1 in ((14, 37, 37), (36, 37, 37), (93, 37, 37)):
        v.fill(x, G, z0, x, G, z1, "stone_bricks")
    return v


# --- export --------------------------------------------------------------------------------

def nbt_tag(kind, value):
    if kind == "byte":
        return struct.pack("<b", value)
    if kind == "int":
        return struct.pack("<i", value)
    if kind == "string":
        b = value.encode()
        return struct.pack("<H", len(b)) + b
    raise ValueError(kind)


TAG = {"end": 0, "byte": 1, "int": 3, "string": 8, "list": 9, "compound": 10}


def nbt_value(v):
    """Return (tag id, payload) for a Python value."""
    if isinstance(v, bool):
        return TAG["byte"], nbt_tag("byte", int(v))
    if isinstance(v, int):
        return TAG["int"], nbt_tag("int", v)
    if isinstance(v, str):
        return TAG["string"], nbt_tag("string", v)
    if isinstance(v, dict):
        out = b""
        for k, item in v.items():
            t, p = nbt_value(item)
            out += bytes([t]) + nbt_tag("string", k) + p
        return TAG["compound"], out + b"\x00"
    if isinstance(v, tuple) and v and v[0] == "list":
        _, elem, items = v
        payloads = [nbt_value(i)[1] for i in items]
        return TAG["list"], bytes([TAG[elem]]) + struct.pack("<i", len(items)) + b"".join(payloads)
    raise TypeError(type(v))


def mcstructure(v, tx, tz):
    """One 64 x 32 x 48 tile as a Bedrock .mcstructure (little-endian NBT)."""
    ox, oz = tx * TILE_W, tz * TILE_D
    keys = ["air"]
    index = {"air": 0}
    blocks = []
    for x in range(TILE_W):                    # x outermost, then y, then z fastest
        for y in range(H):
            for z in range(TILE_D):
                k = v.get(ox + x, y, oz + z) or "air"
                if k not in index:
                    index[k] = len(keys)
                    keys.append(k)
                blocks.append(index[k])
    palette = []
    for k in keys:
        name, states = ("minecraft:air", {}) if k == "air" else BLOCKS[k][:2]
        palette.append({"name": name, "states": states, "version": BLOCK_VERSION})
    root = {
        "format_version": 1,
        "size": ("list", "int", [TILE_W, H, TILE_D]),
        "structure": {
            "block_indices": ("list", "list", [("list", "int", blocks),
                                               ("list", "int", [-1] * len(blocks))]),
            "entities": ("list", "compound", []),
            "palette": {"default": {
                "block_palette": ("list", "compound", palette),
                "block_position_data": {},
            }},
        },
        "structure_world_origin": ("list", "int", [0, 0, 0]),
    }
    _, payload = nbt_value(root)
    return bytes([TAG["compound"]]) + nbt_tag("string", "") + payload


def export(v):
    sdir = BP / "structures" / "vroom"
    sdir.mkdir(parents=True, exist_ok=True)
    lines = ["# Places Vroom Harbor with its north-west corner here, ground level with your feet.",
             "# Needs cheats on. Faces: the harbor is to the south (+Z)."]
    for tx in range(W // TILE_W):
        for tz in range(D // TILE_D):
            (sdir / f"village_{tx}_{tz}.mcstructure").write_bytes(mcstructure(v, tx, tz))
            lines.append(f"structure load vroom:village_{tx}_{tz} ~{tx * TILE_W} ~-{G + 1} ~{tz * TILE_D}")
    fdir = BP / "functions" / "vroom"
    fdir.mkdir(parents=True, exist_ok=True)
    (fdir / "village.mcfunction").write_text("\n".join(lines) + "\n")

    # for the previewer: block keys and a byte grid (index + 1, 0 = air), x fastest
    OUT.mkdir(exist_ok=True)
    keys = sorted({k for k in v.b.values()})
    idx = {k: i + 1 for i, k in enumerate(keys)}
    grid = bytearray(W * H * D)
    for (x, y, z), k in v.b.items():
        grid[(y * D + z) * W + x] = idx[k]
    tex_index, cols, rows = write_atlas(OUT / "atlas.png")
    blocks = {k: {"shape": BLOCKS[k][2], "render": BLOCKS[k][4],
                  "tex": [tex_index[t] for t in BLOCKS[k][3]]} for k in keys}
    data = {"size": [W, H, D], "ground": G, "keys": keys, "blocks": blocks,
            "atlas": {"cols": cols, "rows": rows},
            "grid": base64.b64encode(bytes(grid)).decode(),
            "vehicles": [{"id": i, "pos": [x, y, z], "yaw": yaw} for i, x, y, z, yaw in v.vehicles]}
    (OUT / "village.json").write_text(json.dumps(data, separators=(",", ":")))
    print(f"village: {len(v.b)} blocks, {len(keys)} kinds, "
          f"{W // TILE_W * (D // TILE_D)} structure tiles, {len(v.vehicles)} vehicles placed")


if __name__ == "__main__":
    export(build())
