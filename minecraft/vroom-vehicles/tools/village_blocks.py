"""The blocks the village is built from, and lookalike textures for previews.

Each block has its Bedrock name and states (what goes into the .mcstructure
file, so the game places the real block) plus a shape and textures for the
village previewer and teaser video. The textures are drawn here, procedurally,
to look like Minecraft's without copying them.
"""
import random

from artkit import write_png

# Bedrock block-state version stamped on every palette entry (1.21.80).
BLOCK_VERSION = (1 << 24) | (21 << 16) | (80 << 8) | 3

# key: (bedrock name, states, shape, (top, side, bottom) textures, render)
#   shape:  cube, slab, stair_n/e/s/w (rises toward that side), post (fences),
#           pane, cross (plants), lantern, carpet, water
#   render: solid, cutout (has holes), glass (see-through), water
BLOCKS = {}


def block(key, name, tex, shape="cube", states=None, render="solid"):
    top, side, bottom = (tex, tex, tex) if isinstance(tex, str) else tex
    BLOCKS[key] = ("minecraft:" + name, states or {}, shape, (top, side, bottom), render)


for k in ["stone", "cobblestone", "stone_bricks", "sand", "gravel", "calcite", "bookshelf",
          "sea_lantern", "glowstone", "redstone_lamp", "crafting_table",
          "coal_ore", "iron_ore", "copper_ore", "gold_ore", "redstone_ore", "lapis_ore",
          "diamond_ore", "emerald_ore",
          "coal_block", "iron_block", "copper_block", "gold_block", "redstone_block",
          "lapis_block", "diamond_block", "emerald_block", "amethyst_block", "netherite_block"]:
    block(k, k, k)
block("grass", "grass_block", ("grass_top", "grass_side", "dirt"))
block("dirt", "dirt", "dirt")
block("smooth_stone", "smooth_stone", ("smooth_stone", "smooth_stone_side", "smooth_stone"))
block("bricks", "brick_block", "bricks")
block("bookshelf", "bookshelf", ("oak_planks", "bookshelf", "oak_planks"))
block("crafting_table", "crafting_table", ("crafting_table_top", "crafting_table_side", "oak_planks"))
block("melon", "melon_block", ("melon_top", "melon_side", "melon_top"))
block("hay", "hay_block", ("hay_top", "hay_side", "hay_top"), states={"deprecated": 0, "pillar_axis": "y"})
block("barrel", "barrel", ("barrel_top", "barrel_side", "barrel_top"),
      states={"facing_direction": 1, "open_bit": False})
for wood in ["oak", "spruce", "birch", "dark_oak"]:
    block(f"{wood}_planks", f"{wood}_planks", f"{wood}_planks")
    block(f"{wood}_slab", f"{wood}_slab", f"{wood}_planks", "slab",
          {"minecraft:vertical_half": "bottom"})
    for d, n in zip("ewsn", range(4)):          # weirdo_direction: 0 east, 1 west, 2 south, 3 north
        block(f"{wood}_stairs_{d}", f"{wood}_stairs", f"{wood}_planks", f"stair_{d}",
              {"upside_down_bit": False, "weirdo_direction": n})
for wood in ["oak", "spruce", "birch"]:
    block(f"{wood}_log", f"{wood}_log", (f"{wood}_log_top", f"{wood}_log", f"{wood}_log_top"),
          states={"pillar_axis": "y"})
block("oak_leaves", "oak_leaves", "oak_leaves", states={"persistent_bit": True, "update_bit": False},
      render="cutout")
block("oak_fence", "oak_fence", "oak_planks", "post")
block("spruce_fence", "spruce_fence", "spruce_planks", "post")
block("glass", "glass", "glass", render="glass")
block("glass_pane", "glass_pane", "glass", "pane", render="glass")
block("blue_glass", "blue_stained_glass", "blue_glass", render="glass")
block("red_glass", "red_stained_glass", "red_glass", render="glass")
block("iron_bars", "iron_bars", "iron_bars", "pane", render="cutout")
block("water", "water", "water", "water", {"liquid_depth": 0}, render="water")
block("lantern", "lantern", "lantern", "lantern", {"hanging": False}, render="cutout")
block("stone_brick_slab", "stone_brick_slab", "stone_bricks", "slab",
      {"minecraft:vertical_half": "bottom"})
for plant in ["poppy", "dandelion", "cornflower", "short_grass"]:
    block(plant, plant, plant, "cross", render="cutout")

COLOURS = {
    "white": "#E9ECEC", "light_gray": "#8E8E86", "gray": "#3E4447", "black": "#141519",
    "red": "#A02722", "orange": "#E06101", "yellow": "#F0AF15", "lime": "#5EA818",
    "green": "#495B24", "cyan": "#157788", "light_blue": "#2389C6", "blue": "#2C2E8F",
    "purple": "#64209C", "pink": "#D5658E", "brown": "#603B1F",
}
for c in COLOURS:
    block(f"{c}_concrete", f"{c}_concrete", f"{c}_concrete")
    block(f"{c}_wool", f"{c}_wool", f"{c}_wool")
    block(f"{c}_carpet", f"{c}_carpet", f"{c}_wool", "carpet")


# --- textures (16x16, lookalikes) -----------------------------------------------------

def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def tint(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c)


def tex_noise(base, amount, rand, alpha=255):
    c = rgb(base)
    return [[tint(c, 1 + (rand.random() - 0.5) * amount) + (alpha,) for _ in range(16)] for _ in range(16)]


def speckle(px, colour, count, rand, size=1):
    c = rgb(colour)
    for _ in range(count):
        x, y = rand.randrange(16), rand.randrange(16)
        for dx in range(size):
            for dy in range(size):
                if x + dx < 16 and y + dy < 16:
                    px[y + dy][x + dx] = tint(c, 0.9 + rand.random() * 0.2) + (255,)
    return px


def planks(base, rand):
    px = tex_noise(base, 0.12, rand)
    for y in range(16):
        for x in range(16):
            if y % 4 == 3:
                px[y][x] = tint(px[y][x], 0.72)
            if (y // 4) % 2 == 0 and x == 4 or (y // 4) % 2 == 1 and x == 11:
                px[y][x] = tint(px[y][x], 0.78)
    return px


def bark(base, rand):
    px = tex_noise(base, 0.18, rand)
    for x in range(16):
        if rand.random() < 0.4:
            for y in range(16):
                px[y][x] = tint(px[y][x], 0.8)
    return px


def rings(bark_c, wood_c, rand):
    px = tex_noise(wood_c, 0.08, rand)
    for y in range(16):
        for x in range(16):
            d = max(abs(x - 7.5), abs(y - 7.5))
            if d > 6.5:
                px[y][x] = tint(rgb(bark_c), 0.9 + rand.random() * 0.2) + (255,)
            elif int(d) % 2 == 0:
                px[y][x] = tint(px[y][x], 0.88)
    return px


def framed(px, colour, k=0.75):
    for i in range(16):
        for (x, y) in ((i, 0), (i, 15), (0, i), (15, i)):
            px[y][x] = tint(rgb(colour), k) + (255,)
    return px


def gem_block(base, rand, shine="#FFFFFF"):
    px = tex_noise(base, 0.15, rand)
    framed(px, base, 0.7)
    for i in range(3, 13):
        px[i][i] = tint(rgb(shine), 0.95) + (255,)
    return px


def ore(colour, rand):
    return speckle(tex_noise("#7D7D7D", 0.2, rand), colour, 9, rand, 2)


def glassy(edge, fill_alpha, rand, base="#DCEFF5"):
    px = [[rgb(base) + (fill_alpha,) for _ in range(16)] for _ in range(16)]
    framed(px, edge, 1.0)
    for i in range(3, 7):
        px[i][i + 1] = (255, 255, 255, 200)
    return px


def plant(stem, flower, rand):
    px = [[(0, 0, 0, 0)] * 16 for _ in range(16)]
    for y in range(6, 16):
        px[y][8] = rgb(stem) + (255,)
        if y % 3 == 0:
            px[y][7] = rgb(stem) + (255,)
    if flower:
        for (x, y) in [(7, 3), (8, 3), (9, 3), (7, 4), (8, 4), (9, 4), (8, 2), (8, 5)]:
            px[y][x] = rgb(flower) + (255,)
        px[4][8] = (250, 230, 90, 255)
    return px


def tall_grass(rand):
    px = [[(0, 0, 0, 0)] * 16 for _ in range(16)]
    for x in range(1, 15, 2):
        top = rand.randrange(3, 10)
        for y in range(top, 16):
            px[y][x] = tint(rgb("#6FA845"), 0.85 + rand.random() * 0.3) + (255,)
    return px


def texture(name):
    rand = random.Random(name)
    if name == "grass_top":
        return tex_noise("#7DB84A", 0.25, rand)
    if name == "grass_side":
        px = tex_noise("#866043", 0.25, rand)
        for x in range(16):
            for y in range(rand.randrange(3, 6)):
                px[y][x] = tint(rgb("#7DB84A"), 0.85 + rand.random() * 0.3) + (255,)
        return px
    if name == "dirt":
        return tex_noise("#866043", 0.3, rand)
    if name == "stone":
        return tex_noise("#7D7D7D", 0.22, rand)
    if name == "cobblestone":
        px = tex_noise("#7A7A7A", 0.3, rand)
        for y in range(16):
            for x in range(16):
                if (x * 7 + y * 3) % 11 == 0 or (x + y * 5) % 13 == 0:
                    px[y][x] = tint(px[y][x], 0.6)
        return px
    if name == "stone_bricks":
        px = tex_noise("#7A7A7A", 0.15, rand)
        for y in range(16):
            for x in range(16):
                if y % 8 == 7 or (x == 7 if y < 8 else x == 15):
                    px[y][x] = tint(px[y][x], 0.65)
        return px
    if name == "smooth_stone":
        return framed(tex_noise("#A0A0A0", 0.08, rand), "#A0A0A0", 0.8)
    if name == "smooth_stone_side":
        px = tex_noise("#A0A0A0", 0.08, rand)
        for x in range(16):
            px[7][x] = tint(px[7][x], 0.8)
        return framed(px, "#A0A0A0", 0.85)
    if name == "sand":
        return tex_noise("#DBCFA3", 0.12, rand)
    if name == "gravel":
        return speckle(tex_noise("#83807E", 0.35, rand), "#5E5B59", 30, rand)
    if name == "calcite":
        return speckle(tex_noise("#DFE0DC", 0.06, rand), "#C5C7C2", 12, rand, 2)
    if name == "bricks":
        px = tex_noise("#966253", 0.15, rand)
        for y in range(16):
            for x in range(16):
                if y % 4 == 3 or x == (3 if (y // 4) % 2 else 11):
                    px[y][x] = rgb("#B8AFA8") + (255,)
        return px
    for wood, base in [("oak", "#A2834F"), ("spruce", "#725434"), ("birch", "#C5B57B"),
                       ("dark_oak", "#432B14")]:
        if name == f"{wood}_planks":
            return planks(base, rand)
    for wood, b, w in [("oak", "#6B5130", "#B29158"), ("spruce", "#3B2614", "#6F5434"),
                       ("birch", "#E3E3DC", "#C9B87F")]:
        if name == f"{wood}_log":
            px = bark(b, rand)
            if wood == "birch":
                speckle(px, "#2F2F2F", 10, rand, 2)
            return px
        if name == f"{wood}_log_top":
            return rings(b, w, rand)
    if name == "oak_leaves":
        px = tex_noise("#4A8F28", 0.4, rand)
        for _ in range(26):
            px[rand.randrange(16)][rand.randrange(16)] = (0, 0, 0, 0)
        return px
    if name == "bookshelf":
        px = planks("#A2834F", rand)
        for row in (1, 9):
            x = 1
            while x < 15:
                w = rand.choice([1, 2])
                c = rand.choice(["#7A2A2A", "#2A4A7A", "#3A6A2A", "#8A6A2A", "#5A2A6A"])
                for xx in range(x, min(15, x + w)):
                    for y in range(row, row + 6):
                        px[y][xx] = tint(rgb(c), 0.9 + rand.random() * 0.2) + (255,)
                x += w + 0 if rand.random() < 0.8 else w + 1
        return px
    if name == "crafting_table_top":
        return framed(planks("#A2834F", rand), "#6B5130")
    if name == "crafting_table_side":
        px = planks("#9A7A48", rand)
        for y in range(4, 10):
            px[y][3] = px[y][12] = (90, 90, 95, 255)
        return px
    if name == "melon_side":
        px = tex_noise("#6F9A21", 0.15, rand)
        for x in range(0, 16, 3):
            for y in range(16):
                px[y][x] = tint(rgb("#9DBE3A"), 1) + (255,)
        return px
    if name == "melon_top":
        return framed(tex_noise("#7A9A2A", 0.15, rand), "#5A7A1A")
    if name == "hay_side":
        px = tex_noise("#B89A22", 0.2, rand)
        for x in range(16):
            px[4][x] = px[11][x] = (150, 40, 30, 255)
        return px
    if name == "hay_top":
        return tex_noise("#C2A632", 0.25, rand)
    if name == "barrel_side":
        px = planks("#7A5A34", rand)
        for x in range(16):
            px[2][x] = px[13][x] = (70, 70, 75, 255)
        return px
    if name == "barrel_top":
        return framed(tex_noise("#8A6A3E", 0.15, rand), "#3E3E42", 1)
    if name == "glass":
        return glassy("#BFDDE6", 40, rand)
    if name == "blue_glass":
        return glassy("#3C4FB0", 140, rand, "#3C4FB0")
    if name == "red_glass":
        return glassy("#B03C3C", 140, rand, "#B03C3C")
    if name == "water":
        px = tex_noise("#3F76E4", 0.22, rand, alpha=190)
        return px
    if name == "iron_bars":
        px = [[(0, 0, 0, 0)] * 16 for _ in range(16)]
        for y in range(16):
            for x in (1, 5, 10, 14):
                px[y][x] = (170, 170, 175, 255)
        for x in range(16):
            px[0][x] = px[15][x] = (170, 170, 175, 255)
        return px
    if name == "lantern":
        px = tex_noise("#3A3A40", 0.1, rand)
        for y in range(4, 12):
            for x in range(4, 12):
                px[y][x] = (255, 200, 90, 255)
        return px
    if name == "sea_lantern":
        return framed(tex_noise("#BFE3DA", 0.12, rand), "#8FC3BA")
    if name == "glowstone":
        return speckle(tex_noise("#C9A45A", 0.3, rand), "#FFE9A0", 30, rand, 2)
    if name == "redstone_lamp":
        return framed(tex_noise("#F2C46A", 0.2, rand), "#7A4A2A", 1)
    if name.endswith("_ore"):
        return ore({"coal": "#2A2A2A", "iron": "#D8AF93", "copper": "#C96A44", "gold": "#F5D84A",
                    "redstone": "#D11A1A", "lapis": "#2B4FBF", "diamond": "#5DECF5",
                    "emerald": "#17DD62"}[name[:-4]], rand)
    gems = {"coal_block": "#1E1E1E", "iron_block": "#DCDCDC", "copper_block": "#C26A4A",
            "gold_block": "#F7D545", "redstone_block": "#B2170C", "lapis_block": "#1F43A8",
            "diamond_block": "#62E4DC", "emerald_block": "#2FC861", "amethyst_block": "#8B62C9",
            "netherite_block": "#433E40"}
    if name in gems:
        return gem_block(gems[name], rand)
    if name == "poppy":
        return plant("#3E7A22", "#D2231B", rand)
    if name == "dandelion":
        return plant("#3E7A22", "#F2D21E", rand)
    if name == "cornflower":
        return plant("#3E7A22", "#4A6BD6", rand)
    if name == "short_grass":
        return tall_grass(rand)
    for c, h in COLOURS.items():
        if name == f"{c}_concrete":
            return tex_noise(h, 0.04, rand)
        if name == f"{c}_wool":
            return tex_noise(h, 0.16, rand)
    raise KeyError(name)


def texture_names():
    names = []
    for _, _, _, tex, _ in BLOCKS.values():
        for t in tex:
            if t not in names:
                names.append(t)
    return names


def write_atlas(path):
    """All textures in a 16-wide grid of 16x16 tiles; returns {name: index}."""
    names = texture_names()
    cols = 16
    rows = -(-len(names) // cols)
    px = [[(0, 0, 0, 0)] * (cols * 16) for _ in range(rows * 16)]
    for i, n in enumerate(names):
        t = texture(n)
        ox, oy = (i % cols) * 16, (i // cols) * 16
        for y in range(16):
            for x in range(16):
                px[oy + y][ox + x] = t[y][x]
    write_png(path, px)
    return {n: i for i, n in enumerate(names)}, cols, rows
