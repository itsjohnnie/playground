"""Power catamaran: two slim graphite hulls, a glass saloon and a flybridge on top.

LUNA and INDI are the names on the two hull transoms (one each).
"""
import math

from artkit import (Hull, box, mirrored, cylinder, bar, decal, material, steering_wheel,
                    bucket_seat, MATERIALS, paint, mix, rgb, glint, scale, noise)

INFO = {
    "id": "power_catamaran", "name": "Power Catamaran", "kind": "Flybridge power cat",
    "group": "Water", "mode": "water", "length": 8,
    "specs": [("Length", "8 blocks"), ("Beam", "3 blocks"), ("Seats", "6"),
              ("Hulls", "2"), ("Engines", "Twin inboard")],
    "seats": [(6.0, 44.6, -1.0), (-6.0, 44.6, -1.0),           # flybridge helm
              (-16.0, 44.2, 22.0), (16.0, 44.2, 22.0),         # flybridge lounge
              (-7.0, 23.6, 49.5), (7.0, 23.6, 49.5)],          # cockpit sofa
    "collision": (2.5, 2.4), "health": 20,
    "speed": 0.3, "water_drag": 0.3,
    "recipe": {"pattern": ["GGG", "IDI", "I I"],
               "key": {"G": "minecraft:glass_pane", "I": "minecraft:iron_block",
                       "D": "minecraft:diamond"}},
    "recipe_text": "3 Glass Panes + 4 Iron Blocks + 1 Diamond",
    "spawn_egg": ("#5A626C", "#F2F2EE"),
    "anim": [
        {"bone": "root", "type": "lift", "k": 0.5, "max": 3},
        {"bone": "prop_l", "type": "spin", "axis": "z", "idle": 0, "ridden": 0, "per_speed": 1500},
        {"bone": "prop_r", "type": "spin", "axis": "z", "idle": 0, "ridden": 0, "per_speed": 1500},
    ],
    "eggs": "LUNA and INDI are the names on the two hull transoms, one on each hull",
    "egg_cam": {"eye": [0, 24, 112], "at": [0, 14, 58]},
}

HX = 17.0               # hull centre lines at x = ±HX
BEAM = 6.5              # each hull's half-width
STERN = 58.0
MAIN = 18.0             # main deck
ROOF = 38.0             # saloon roof / flybridge floor
HULL = Hull(bow_tip=-64, bow_start=-26, stern=STERN, beam=BEAM, deck=MAIN, sheer=2.5, rise=5,
            cockpit=(-1e9, -1e9), waterline=4, topsides="power_catamaran_grey", bottom="matte_black",
            boot="white", accent=None, foredeck="deck", deck_top="deck", rail="steel",
            bow_step=1.25, run_step=3)


def _word_box(word, fw, fh, height=0.5, max_w=0.86, lift=0.0):
    cols = len(word) * 7 - 1
    h = height
    w = h * fh * cols / (7 * fw)
    if w > max_w:
        w = max_w
        h = w * 7 * fw / (cols * fh)
    return ((1 - w) / 2, (1 - h) / 2 - lift, w, h)


def _hull_window(u, v):
    """Opaque black glazing with a sky reflection, for hull ports."""
    c = mix(rgb("#3B4652"), rgb("#0E1217"), v ** 0.8)
    if 0.12 < v < 0.2:
        c = mix(c, rgb("#9AB2C8"), 0.5)
    return c


paint("power_catamaran_grey", "#8A939C", "#454C55", gloss=0.55)
material("power_catamaran_port", _hull_window)
decal("power_catamaran_luna", "LUNA", "#F4F5F7", "black",
      box=_word_box("LUNA", 9.0, 5.0, 0.42, lift=0.06), underline="#C8A15A")
decal("power_catamaran_indi", "INDI", "#F4F5F7", "black",
      box=_word_box("INDI", 9.0, 5.0, 0.42, lift=0.06), underline="#C8A15A")


def shift(cubes, dx):
    out = []
    for c in cubes:
        c = dict(c)
        c["origin"] = [round(c["origin"][0] + dx, 3)] + c["origin"][1:]
        if "pivot" in c:
            c["pivot"] = [round(c["pivot"][0] + dx, 3)] + c["pivot"][1:]
        out.append(c)
    return out


# --- hulls and bridge deck -------------------------------------------------------

def hulls():
    cubes = []
    base = HULL.cubes()
    for sx in (1, -1):
        cubes += shift(base, sx * HX)
        xo = sx * (HX + BEAM)
        # long hull windows on the outboard sides
        for z0, z1 in ((-20, -2), (2, 28)):
            cubes.append(box("power_catamaran_port", xo - sx * 0.1, 10.2, z0, xo + sx * 0.12, 12.6, z1))
        cubes.append(box("white", xo - sx * 0.1, 9.4, -22, xo + sx * 0.08, 9.8, 30))   # sheer stripe
        # spray rail
        cubes.append(box("power_catamaran_grey", xo - sx * 0.1, 5.6, -40, xo + sx * 0.5, 6.2, STERN))
        # swim platform steps at the stern of each hull
        x0, x1 = sx * (HX - BEAM + 0.5), sx * (HX + BEAM - 0.3)
        cubes.append(box("teak", x0, 6.0, STERN, x1, 7.0, STERN + 5.0, sides="white", aft="white"))
        cubes.append(box("teak", x0, 10.0, STERN, x1, 11.0, STERN + 2.5, sides="white", aft="white"))
        cubes.append(box("power_catamaran_grey", x0, 4.0, STERN, x1, 6.0, STERN + 4.6))
        # the transom name board
        cubes.append(box("black", sx * (HX - 4.5), 11.8, STERN - 0.2, sx * (HX + 4.5),
                         16.8, STERN + 0.06,
                         aft="power_catamaran_luna" if sx > 0 else "power_catamaran_indi"))
        # bow rail
        for z in range(-56, -24, 2):
            zm = z + 1
            w, y = HULL.half_width(zm) - 1.0, HULL.deck_height(zm) + 3.2
            if w < 0.8:
                continue
            for sgn in (1, -1):
                x = sx * HX + sgn * w
                cubes.append(box("chrome", x - 0.25, y, z, x + 0.25, y + 0.35, z + 2))
                if z % 6 == 0:
                    cubes.append(box("chrome", x - 0.2, y - 3.2, zm - 0.2, x + 0.2, y, zm + 0.2))
        d = HULL.deck_height(-60)
        cubes.append(box("chrome", sx * HX - 0.4, d, -61, sx * HX + 0.4, d + 0.6, -58))
    # nav lights on the bows
    d = HULL.deck_height(-52)
    cubes.append(box("nav_green", HX - 0.5, d, -53, HX + 0.5, d + 0.9, -52))
    cubes.append(box("nav_red", -HX - 0.5, d, -53, -HX + 0.5, d + 0.9, -52))
    # bridge deck between the hulls, sliced so it follows the sheer
    inner = HX - BEAM + 0.2
    for z0 in range(-40, int(STERN), 4):
        z1 = min(z0 + 4, STERN)
        d = HULL.deck_height((z0 + z1) / 2)
        cubes.append(box("power_catamaran_grey", -inner, 11.0, z0, inner, d, z1, top="deck",
                         bottom="white", aft="white", band=(4, MAIN + 3)))
    cubes.append(box("white", -inner, 11.0, -44, inner, 11.6, -40))         # tunnel nose
    cubes.append(box("power_catamaran_grey", -inner, 11.0, -44, inner, 17.0, -42,
                     rotation=(40, 0, 0), pivot=(0, 11.0, -42)))
    cubes.append(box("deck", -inner, HULL.deck_height(-42) - 1.4, -44, inner,
                     HULL.deck_height(-42), -40))
    # foredeck sunpad and anchor
    d = HULL.deck_height(-34)
    cubes.append(box("white", -9, d, -38, 9, d + 1.4, -27))
    cubes.append(box("vinyl", -8.6, d + 1.4, -37.6, 8.6, d + 2.8, -27.4))
    cubes.append(box("vinyl", -8.6, d + 2.8, -29.0, 8.6, d + 5.0, -27.4, rotation=(-20, 0, 0),
                     pivot=(0, d + 2.8, -27.4)))
    cubes.append(box("steel", -1.5, 9.0, -45.6, 1.5, 12.0, -44.4))
    cubes.append(box("steel", -0.6, d, -42.0, 0.6, d + 1.4, -39.0))
    return cubes


# --- the saloon ------------------------------------------------------------------

SAL_X = 19.5            # saloon side walls
SAL_F, SAL_A = -24.0, 26.0
WIN0 = MAIN + 4.0


def front_top(z):
    """Height of the raked front window/roof line at z (walls rise 14 px over 10 px)."""
    return min(ROOF, WIN0 + (z - SAL_F) * 1.6)


def saloon():
    solid, glass = [], []
    # lower walls
    solid.append(box("white", -SAL_X, MAIN, SAL_F, SAL_X, WIN0, SAL_A - 0.6, top="deck"))
    # sides: posts and the window wall
    for sx in (1, -1):
        x = sx * SAL_X
        for z in (-6.0, 10.0, SAL_A - 1.4):
            solid.append(box("white", x - 0.6, WIN0, z, x + 0.6, ROOF, z + 1.4))
        # stepped glass at the raked front, then full-height panes
        z = SAL_F
        while z < -14:
            top = front_top(z + 0.5)
            glass.append(box("tinted_glass", x - 0.3, WIN0, z, x + 0.3, top, z + 1.0))
            z += 1.0
        glass.append(box("tinted_glass", x - 0.3, WIN0, -14, x + 0.3, ROOF, SAL_A - 1.4))
        solid.append(bar("white", (x, WIN0, SAL_F + 0.3), (x, ROOF, -14 + 0.3), 1.8))
        solid.append(box("black", x - 0.4, WIN0 - 0.4, SAL_F, x + 0.4, WIN0, SAL_A - 0.6))
    # raked windscreen
    ln = math.hypot(ROOF - WIN0, -14 - SAL_F)
    ang = math.degrees(math.atan2(-14 - SAL_F, ROOF - WIN0))
    glass.append(box("tinted_glass", -SAL_X, WIN0, SAL_F - 0.3, SAL_X, WIN0 + ln, SAL_F + 0.3,
                     rotation=(-ang, 0, 0), pivot=(0, WIN0, SAL_F)))
    solid.append(box("white", -0.7, WIN0, SAL_F - 0.6, 0.7, WIN0 + ln, SAL_F,
                     rotation=(-ang, 0, 0), pivot=(0, WIN0, SAL_F)))       # mullion
    # aft glass doors
    glass.append(box("tinted_glass", -SAL_X + 1, WIN0 - 4, SAL_A - 0.6, SAL_X - 1, ROOF, SAL_A))
    for x in (-SAL_X, -6.5, 6.5, SAL_X - 1.2):
        solid.append(box("white", x, MAIN, SAL_A - 0.8, x + 1.2, ROOF, SAL_A + 0.2))
    # roof (flybridge floor) overhangs the cockpit to z=40, black visor at the front
    solid.append(box("white", -SAL_X - 1.5, ROOF, -15.5, SAL_X + 1.5, ROOF + 1.6, 40, top="grip"))
    solid.append(box("black", -SAL_X - 1.5, ROOF - 0.6, -16.5, SAL_X + 1.5, ROOF + 1.6, -15.5))
    solid += mirrored("black", SAL_X + 1.5, SAL_X + 1.7, ROOF + 0.2, -16.5, ROOF + 1.0, 40)
    for sx in (1, -1):                                                     # cockpit pillars
        solid.append(box("white", sx * (SAL_X - 0.5), MAIN, 38.0, sx * (SAL_X + 0.9), ROOF, 39.4))
    # interior: dark floor, a sofa and the galley, seen through the glass
    solid.append(box("carpet", -SAL_X + 0.4, MAIN, SAL_F + 1, SAL_X - 0.4, MAIN + 0.4, SAL_A - 1))
    solid.append(box("dark_leather", -SAL_X + 1, MAIN, -4, -SAL_X + 6, MAIN + 4, 16))
    solid.append(box("dark_leather", -SAL_X + 1, MAIN, -4, -SAL_X + 3, MAIN + 9, 16))
    solid.append(box("teak", -SAL_X + 7, MAIN, 2, -SAL_X + 11, MAIN + 6, 10))
    solid.append(box("white", SAL_X - 6, MAIN, 0, SAL_X - 1, MAIN + 7, 20, top="black"))
    solid.append(box("gunmetal", 4, MAIN, -21, 16, MAIN + 6, -16, top="black"))   # lower helm
    return solid, glass


# --- cockpit ------------------------------------------------------------------------

def cockpit():
    c = [box("teak", -SAL_X + 0.5, MAIN, SAL_A, SAL_X - 0.5, MAIN + 0.3, STERN - 1)]
    # aft sofa across the transom, facing forward
    f = MAIN + 0.3
    c.append(box("white", -14, f, 47.5, 14, f + 3.4, 53.5))
    c.append(box("vinyl", -13.6, f + 3.4, 47.7, 13.6, f + 5.2, 51.5))
    c.append(box("vinyl", -13.6, f + 5.2, 51.0, 13.6, f + 9.6, 53.3, rotation=(-10, 0, 0),
                 pivot=(0, f + 5.2, 53.3)))
    c.append(box("gunmetal", -14.1, f + 3.2, 47.4, 14.1, f + 3.5, 53.6))
    # cockpit table
    c += cylinder("steel", (0, f + 3, 42), 0.6, 6, "y", 3)
    c.append(box("teak", -6, f + 6, 39.5, 6, f + 6.6, 44.5))
    # side coamings with a steel cap
    for sx in (1, -1):
        c.append(box("white", sx * (SAL_X - 0.5), MAIN, SAL_A, sx * (HX + BEAM - 0.4), MAIN + 6, STERN - 1))
        c.append(box("steel", sx * (SAL_X - 0.6), MAIN + 6, SAL_A, sx * (HX + BEAM - 0.3), MAIN + 6.4,
                     STERN - 1))
    # transom gate rail
    c.append(box("white", -14.5, MAIN, 53.5, 14.5, MAIN + 6, STERN - 1))
    # stairs to the flybridge (port side, under the overhang)
    for k in range(7):
        y = MAIN + 2.9 * (k + 1)
        z = 44 - 1.6 * k
        c.append(box("teak", -SAL_X + 0.6, y - 0.6, z - 1.6, -SAL_X + 6.4, y, z, sides="steel"))
    c.append(bar("steel", (-SAL_X + 6.6, MAIN + 6, 46), (-SAL_X + 6.6, ROOF + 6, 33), 0.4))
    # side deck rails from cockpit to bow
    for sx in (1, -1):
        x = sx * (HX + BEAM - 1.0)
        for z in range(-24, 26, 3):
            y = HULL.deck_height(z + 1.5) + 7.0
            c.append(box("chrome", x - 0.25, y, z, x + 0.25, y + 0.35, z + 3))
            if z % 9 == 0:
                c.append(box("chrome", x - 0.2, HULL.deck_height(z), z + 1.3, x + 0.2, y, z + 1.7))
    return c


# --- flybridge ------------------------------------------------------------------------

FLY = ROOF + 1.6
TOP = FLY + 17.0


def flybridge():
    c = []
    # bulwarks with a stainless rail
    for sx in (1, -1):
        x = sx * (SAL_X + 1.0)
        c.append(box("white", x - 0.5, FLY, -10, x + 0.5, FLY + 4.5, 39.5))
        c.append(box("steel", x - 0.7, FLY + 4.5, -10, x + 0.7, FLY + 5.0, 39.5))
        for z in range(-8, 40, 6):
            c.append(box("chrome", x - 0.2, FLY + 5.0, z, x + 0.2, FLY + 8.5, z + 0.4))
        c.append(box("chrome", x - 0.3, FLY + 8.5, -10, x + 0.3, FLY + 8.9, 39.5))
    c.append(box("white", -SAL_X - 1.5, FLY, -15.0, SAL_X + 1.5, FLY + 5.0, -9.5, top="black"))   # front
    c.append(box("chrome", -SAL_X - 0.5, FLY + 8.5, 39.2, SAL_X + 0.5, FLY + 8.9, 39.6))
    # helm console
    c.append(box("white", -10, FLY, -9.5, 10, FLY + 7.0, -5.5, top="black"))
    c.append(box("black", -9.5, FLY + 7.0, -9.5, 9.5, FLY + 7.8, -5.8, rotation=(-16, 0, 0),
                 pivot=(0, FLY + 7.0, -5.8)))
    c.append(box("screen", 1.0, FLY + 6.6, -5.6, 9.0, FLY + 9.2, -5.3, rotation=(-16, 0, 0),
                 pivot=(5, FLY + 7.0, -5.4)))
    c.append(box("screen", -9.0, FLY + 6.6, -5.6, -1.0, FLY + 9.2, -5.3, rotation=(-16, 0, 0),
                 pivot=(-5, FLY + 7.0, -5.4)))
    c.append(box("gunmetal", -1.0, FLY + 7.0, -5.6, 0.8, FLY + 8.4, -4.4))       # throttles
    c.append(box("chrome", -0.8, FLY + 8.4, -5.2, 0.6, FLY + 9.0, -4.6))
    # helm seats
    for x0, x1 in ((3.2, 8.8), (-8.8, -3.2)):
        cx = (x0 + x1) / 2
        c.append(box("white", cx - 2.2, FLY, -3.4, cx + 2.2, FLY + 3.4, 1.4))
        c += bucket_seat(x0, x1, -3.2, 1.6, FLY + 3.4, cushion="vinyl", trim="gunmetal", back=5)
    # U lounge and table aft
    c.append(box("white", -SAL_X + 0.4, FLY, 14, -SAL_X + 6.4, FLY + 3.0, 36))
    c.append(box("vinyl", -SAL_X + 0.6, FLY + 3.0, 14.2, -SAL_X + 6.2, FLY + 4.6, 35.8))
    c.append(box("white", SAL_X - 6.4, FLY, 14, SAL_X - 0.4, FLY + 3.0, 36))
    c.append(box("vinyl", SAL_X - 6.2, FLY + 3.0, 14.2, SAL_X - 0.6, FLY + 4.6, 35.8))
    c.append(box("white", -SAL_X + 0.4, FLY, 31, SAL_X - 0.4, FLY + 3.0, 38.5))
    c.append(box("vinyl", -SAL_X + 0.6, FLY + 3.0, 31.2, SAL_X - 0.6, FLY + 4.6, 36.5))
    c.append(box("vinyl", -SAL_X + 0.6, FLY + 4.6, 36.3, SAL_X - 0.6, FLY + 9.5, 38.5,
                 rotation=(-10, 0, 0), pivot=(0, FLY + 4.6, 38.5)))
    for sx in (1, -1):
        x = sx * (SAL_X - 0.6)
        c.append(box("vinyl", x, FLY + 4.6, 14.2, x - sx * 2.0, FLY + 9.0, 31.2,
                     rotation=(0, 0, sx * 8), pivot=(x, FLY + 4.6, 22)))
    c += cylinder("steel", (0, FLY + 3, 24), 0.6, 6, "y", 3)
    c.append(box("teak", -6.5, FLY + 6, 19, 6.5, FLY + 6.6, 29))
    # hardtop on four raked posts, with a radar dome and antennas
    for sx in (1, -1):
        x = sx * (SAL_X - 0.2)
        c.append(bar("white", (x, FLY + 4.5, -7.5), (x, TOP, -4.5), 1.0))
        c.append(bar("white", (x, FLY + 4.5, 12.5), (x, TOP, 15.5), 1.0))
    c.append(box("white", -SAL_X - 0.5, TOP, -9, SAL_X + 0.5, TOP + 1.4, 20, bottom="matte_black"))
    c.append(box("white", -SAL_X + 1, TOP + 1.4, -7, SAL_X - 1, TOP + 1.9, 18))
    c.append(box("black", -SAL_X - 0.55, TOP + 0.3, -9.05, SAL_X + 0.55, TOP + 0.9, -8.0))
    c += cylinder("white", (0, TOP + 3.0, 6), 3.0, 2.4, "y", 6)
    c += cylinder("white", (0, TOP + 4.4, 6), 2.2, 0.6, "y", 4)
    c.append(box("gunmetal", -0.4, TOP + 1.9, 6, 0.4, TOP + 1.9 + 0.1, 6.1))
    for x in (-12, 12):
        c.append(box("white", x - 0.3, TOP + 1.9, 14, x + 0.3, TOP + 9.0, 14.6))
    c.append(box("headlight", -0.6, TOP + 1.9, 16, 0.6, TOP + 3.0, 17.2))
    return c


def drives():
    bones = []
    for sx, name in ((1, "prop_l"), (-1, "prop_r")):
        x = sx * HX
        hub = (x, -1.6, 48.0)
        bones.append({"name": f"shaft_{name[-1]}", "parent": "root", "pivot": [x, 0, 40],
                      "cubes": [bar("steel", (x, 0.2, 30.0), hub, 0.8),
                                box("gunmetal", x - 0.3, -2.0, 42.5, x + 0.3, 0.2, 44.0),   # strut
                                box("gunmetal", x - 0.35, -5.4, 50.0, x + 0.35, 0.2, 53.0)]})  # rudder
        prop = [box("chrome", x - 0.55, hub[1] - 0.55, 47.2, x + 0.55, hub[1] + 0.55, 49.0)]
        for k in range(4):
            prop.append(box("chrome", x - 0.6, hub[1] + 0.3, 47.8, x + 0.6, hub[1] + 2.9, 48.2,
                            rotation=(0, 0, 90 * k + 15), pivot=(x, hub[1], 48.0)))
        bones.append({"name": name, "parent": "root", "pivot": list(hub), "cubes": prop})
    return bones


def build():
    solid, glass = saloon()
    return [
        {"name": "root", "pivot": [0, 0, STERN]},
        {"name": "hull", "parent": "root", "pivot": [0, 0, 0],
         "cubes": hulls() + solid + cockpit() + flybridge()},
        {"name": "glass_saloon", "parent": "root", "pivot": [0, 0, 0], "cubes": glass},
        steering_wheel("wheel", (6.0, FLY + 9.6, -4.2), radius=2.0, tilt=-35),
        *drives(),
    ]
