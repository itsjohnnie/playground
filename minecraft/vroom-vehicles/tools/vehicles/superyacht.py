"""Superyacht: a sleek white tri-deck motor yacht with a bow helipad and a tender garage.

LUNA is the yacht's name across the transom, INDI is her home port lettered beneath it.
"""
import math

from artkit import (Hull, box, mirrored, cylinder, bar, decal, material, steering_wheel,
                    bucket_seat, MATERIALS, paint, mix, rgb, glint, scale, noise)

INFO = {
    "id": "superyacht", "name": "Superyacht", "kind": "Tri-deck motor yacht",
    "group": "Water", "mode": "water", "length": 14,
    "specs": [("Length", "14 blocks"), ("Beam", "2¾ blocks"), ("Seats", "8"),
              ("Decks", "3 + sun deck"), ("Extras", "Helipad, tender garage")],
    "seats": [(6.0, 58.6, -33.0), (-6.0, 58.6, -33.0),         # sun deck helm
              (-8.0, 27.6, 90.0), (8.0, 27.6, 90.0),           # main aft deck sofa
              (-8.0, 44.0, 69.5), (8.0, 44.0, 69.5),           # bridge deck aft sofa
              (-7.0, 56.5, 56.0), (7.0, 56.5, 56.0)],          # sun pads
    "collision": (2.5, 3.0), "health": 40,
    "speed": 0.24, "water_drag": 0.3,
    "recipe": {"pattern": ["GDG", "QBQ", "GDG"],
               "key": {"G": "minecraft:gold_block", "D": "minecraft:diamond_block",
                       "Q": "minecraft:quartz_block", "B": "minecraft:oak_boat"}},
    "recipe_text": "4 Gold Blocks + 2 Diamond Blocks + 2 Quartz Blocks + Oak Boat",
    "spawn_egg": ("#F7F7F3", "#1B2430"),
    "anim": [
        {"bone": "root", "type": "lift", "k": 0.5, "max": 3},
        {"bone": "prop_l", "type": "spin", "axis": "z", "idle": 0, "ridden": 0, "per_speed": 1500},
        {"bone": "prop_r", "type": "spin", "axis": "z", "idle": 0, "ridden": 0, "per_speed": 1500},
    ],
    "eggs": "INDI is the yacht's name across the transom (her home port, Miami, is below it)",
    "egg_cam": {"eye": [-22, 25, 168], "at": [0, 14, 100]},
}

STERN = 100.0
MAIN = 22.0
# cockpit far ahead of the bow: no slice is "foredeck", so the transom and the slice
# ends stay white while the whole deck top is teak
HULL = Hull(bow_tip=-112, bow_start=-46, stern=STERN, beam=22, deck=MAIN, sheer=7, rise=9,
            cockpit=(-1e9, -1e9), waterline=4, topsides="white", bottom="superyacht_antifoul",
            boot="black", accent=None, foredeck="teak", deck_top="teak", rail="steel",
            bow_step=1.5, run_step=4)

L1, L1_TOP = MAIN, 37.0          # main deck saloon
L2, L2_TOP = 38.5, 52.0          # bridge deck
L3, L3_TOP = 53.5, 63.0          # sun deck sky lounge


# --- materials -----------------------------------------------------------------------

def _word_box(word, fw, fh, height=0.5, max_w=0.86, lift=0.0):
    cols = len(word) * 7 - 1
    h = height
    w = h * fh * cols / (7 * fw)
    if w > max_w:
        w = max_w
        h = w * 7 * fw / (cols * fh)
    return ((1 - w) / 2, (1 - h) / 2 - lift, w, h)


def _glazing(u, v):
    """Opaque dark-tinted window band with a soft sky reflection."""
    c = mix(rgb("#42505E"), rgb("#0B0F14"), v ** 0.7)
    c = mix(c, rgb("#A9C3D8"), glint(v, 0.22, 0.07, 0.35))
    return scale(c, noise(0.02))


def _antifoul(u, v):
    return scale(mix(rgb("#22304A"), rgb("#0E1626"), v), noise(0.03))


def _helipad(u, v):
    """Touch-and-go pad: grey disc, yellow ring, white H. Transparent outside the disc."""
    d = math.hypot(u - 0.5, v - 0.5)
    if d > 0.5:
        return (0, 0, 0, 0)
    if d > 0.475:
        return rgb("#F4F4F0")
    if 0.36 < d < 0.4:
        return rgb("#F2C230")
    hu, hv = abs(u - 0.5), abs(v - 0.5)
    if hv < 0.17 and (0.08 < hu < 0.13 or (hu < 0.13 and hv < 0.025)):
        return rgb("#F7F7F7")
    return scale(rgb("#4A5058"), noise(0.05))


def _water(u, v):
    w = 0.5 + 0.5 * math.sin(u * 25 + math.sin(v * 17) * 2)
    return mix(rgb("#55D6E6"), rgb("#1E9FC0"), w * 0.6 + v * 0.3)


def _garage(u, v):
    """Tender garage door: white with a thin dark seam all round."""
    if u < 0.025 or u > 0.975 or v < 0.05 or v > 0.95:
        return rgb("#4A5058")
    c = mix(rgb("#FAFAF7"), rgb("#D9DBD7"), v ** 1.3)
    if abs(v - 0.5) < 0.012:
        return rgb("#8C9196")
    return scale(c, noise(0.02))


material("superyacht_glazing", _glazing)
material("superyacht_antifoul", _antifoul)
material("superyacht_helipad", _helipad)
material("superyacht_water", _water)
material("superyacht_garage", _garage)
decal("superyacht_luna", "INDI", "#1B2430", "white",
      box=_word_box("INDI", 22.0, 5.0, 0.62, lift=0.08), underline="#B8913F")
decal("superyacht_indi", "MIAMI", "#B8913F", "white",
      box=_word_box("MIAMI", 12.0, 3.4, 0.62))


# --- hull ----------------------------------------------------------------------------

def hull():
    c = HULL.cubes()
    # bulwarks with a teak cap along the main deck
    for z0 in range(-62, int(STERN) - 4, 4):
        z1 = z0 + 4
        zm = z0 + 2
        w, d = HULL.half_width(zm), HULL.deck_height(zm)
        c += mirrored("white", w - 0.9, w, d - 0.2, z0, d + 3.4, z1, band=(4, 30))
        c += mirrored("teak", w - 1.1, w + 0.1, d + 3.4, z0, d + 3.9, z1)
    # stanchions and rails round the bow
    for z in range(-104, -62, 2):
        zm = z + 1
        w, d = HULL.half_width(zm) - 0.8, HULL.deck_height(zm)
        if w < 1:
            continue
        c += mirrored("chrome", w - 0.3, w + 0.05, d + 4.4, z, d + 4.8, z + 2)
        if z % 6 == 0:
            c += mirrored("chrome", w - 0.25, w, d, zm - 0.2, d + 4.4, zm + 0.2)
    # dark hull windows: the guest cabins below decks
    for z0, z1 in ((-36, -14), (-10, 14), (18, 42), (46, 62)):
        c += mirrored("superyacht_glazing", 22.0, 22.14, 11.0, z0, 14.4, z1)
    c += mirrored("superyacht_glazing", 21.2, 21.34, 16.8, -50, 18.2, 84)       # thin accent line
    # anchors in their pockets
    for sx in (1, -1):
        z = -96.0
        w = HULL.half_width(z)
        c.append(box("steel", sx * (w - 0.4), 18.0, z - 2.0, sx * (w + 0.35), 21.0, z + 2.0))
    # windlass and bow fittings
    d = HULL.deck_height(-100)
    c += [box("steel", -2.0, d, -102, 2.0, d + 1.6, -98),
          box("steel", -0.5, d, -108, 0.5, d + 0.8, -102),
          box("nav_green", 6.0, HULL.deck_height(-60) + 3.9, -61, 7.0, HULL.deck_height(-60) + 4.8, -60),
          box("nav_red", -7.0, HULL.deck_height(-60) + 3.9, -61, -6.0, HULL.deck_height(-60) + 4.8, -60)]
    return c


def helipad():
    zc, r = -78.0, 14.0
    top = 31.0
    d = HULL.deck_height(zc)
    c = cylinder("white", (0, (d + top - 0.6) / 2, zc), r, top - 0.6 - d + 0.6, "y", 8)
    c += cylinder("gunmetal", (0, top - 0.3, zc), r - 0.1, 0.6, "y", 8)
    c.append(box("superyacht_helipad", -r, top, zc - r, r, top + 0.08, zc + r))
    for k in range(16):                                  # landing lights round the rim
        a = 2 * math.pi * (k + 0.5) / 16
        x, z = (r - 0.2) * math.sin(a), zc + (r - 0.2) * math.cos(a)
        c.append(box("headlight" if k % 2 else "amber", x - 0.3, top - 0.2, z - 0.3, x + 0.3, top + 0.3,
                     z + 0.3))
    return c


# --- superstructure --------------------------------------------------------------------

def house(z_front, z_aft, hw, y0, y1, band, nose, rake, aft_glass=True):
    """A deck house: straight sides with a dark window band, and a rounded,
    raked nose built from slices whose fronts wrap the windows round."""
    ya, yb = band
    c = [box("white", -hw, y0, z_front, hw, y1, z_aft)]
    c += mirrored("superyacht_glazing", hw, hw + 0.12, ya, z_front, yb, z_aft - 2)
    c += mirrored("black", hw, hw + 0.08, ya - 0.5, z_front, ya - 0.3, z_aft - 2)
    if aft_glass:
        c.append(box("superyacht_glazing", -hw + 2, y0, z_aft, hw - 2, yb, z_aft + 0.12))
        for x in (-hw / 3, hw / 3):
            c.append(box("white", x - 0.4, y0, z_aft, x + 0.4, yb, z_aft + 0.2))
    n = int(nose / 1.5)
    for i in range(n):
        za, zb = z_front - (i + 1) * nose / n, z_front - i * nose / n
        t = (i + 0.5) / n
        w = hw * max(0.15, 1 - t ** 2) ** 0.5
        top = y1 - rake * (y1 - ya) * t
        c.append(box("white", -w, y0, za, w, min(ya, top), zb))
        if top > ya:
            c.append(box("white", -w, ya, za, w, min(top, yb), zb, fore="superyacht_glazing",
                         sides="superyacht_glazing"))
        if top > yb:
            c.append(box("white", -w, yb, za, w, top, zb))
    return c


def slab(z_front, z_aft, hw, y, nose, top="teak", thick=1.5):
    """A deck slab with a rounded front edge and a dark fascia line."""
    c = [box("white", -hw, y, z_front, hw, y + thick, z_aft, top=top)]
    c += mirrored("steel", hw, hw + 0.1, y + 0.4, z_front, y + 0.9, z_aft)
    n = int(nose / 2)
    for i in range(n):
        za, zb = z_front - (i + 1) * nose / n, z_front - i * nose / n
        t = (i + 0.5) / n
        w = hw * max(0.1, 1 - t ** 2) ** 0.5
        c.append(box("white", -w, y, za, w, y + thick, zb, top=top))
    return c


def main_deck():
    c = house(-50, 66, 18, L1, L1_TOP, (27, 34), 14, 0.45)
    c += slab(-52, 86, 20, L1_TOP, 8)                      # bridge deck floor, overhangs aft
    for sx in (1, -1):                                     # aft overhang pillars
        c.append(box("white", sx * 17.4, MAIN, 83.0, sx * 18.8, L1_TOP, 84.4))
    # aft deck: sofa across the stern, a table, steps down to the swim platform
    f = MAIN
    c.append(box("white", -15, f, 86, 15, f + 3.4, 93))
    c.append(box("leather", -14.6, f + 3.4, 86.3, 14.6, f + 5.6, 91.0))
    c.append(box("leather", -14.6, f + 5.6, 90.6, 14.6, f + 10.5, 92.8, rotation=(-10, 0, 0),
                 pivot=(0, f + 5.6, 92.8)))
    c.append(box("tan", -15.1, f + 3.2, 85.9, 15.1, f + 3.5, 93.1))
    c += cylinder("steel", (0, f + 3, 78), 0.7, 6, "y", 3)
    c.append(box("teak", -8, f + 6, 74, 8, f + 6.6, 82))
    c += mirrored("white", 21.0, 21.6, f, 92, f + 3.9, STERN)     # transom bulwark corners
    c.append(box("white", -21.0, f, 98.6, -12.0, f + 3.9, STERN))
    c.append(box("white", 12.0, f, 98.6, 21.0, f + 3.9, STERN))
    c.append(box("steel", -21.6, f + 3.9, 98.4, 21.6, f + 4.3, STERN))
    return c


def bridge_deck():
    c = house(-40, 56, 16.5, L2, L2_TOP, (41.5, 48.5), 12, 0.6)
    c += slab(-44, 72, 17.5, L2_TOP, 6, top="grip")        # sun deck floor
    for sx in (1, -1):
        c.append(box("white", sx * 15.6, L2, 70.0, sx * 16.8, L2_TOP, 71.2))
    # aft deck sofa, facing forward
    f = L2
    c.append(box("white", -14, f, 66.5, 14, f + 3.2, 72))
    c.append(box("leather", -13.6, f + 3.2, 66.7, 13.6, f + 5.4, 70.6))
    c.append(box("leather", -13.6, f + 5.4, 70.3, 13.6, f + 10.0, 72.0, rotation=(-10, 0, 0),
                 pivot=(0, f + 5.4, 72.0)))
    c.append(box("teak", -6, f + 5.5, 59.5, 6, f + 6.1, 64.5))
    c += cylinder("steel", (0, f + 2.8, 62), 0.6, 5.5, "y", 3)
    # steel cap rails on the glass balustrades
    c += mirrored("steel", 19.2, 19.9, f + 7.0, 56, f + 7.5, 86)
    c.append(box("steel", -19.9, f + 7.0, 85.6, 19.9, f + 7.5, 86.3))
    return c


def sun_deck():
    c = house(-22, 18, 13, L3, L3_TOP, (55.5, 61.5), 8, 0.5, aft_glass=True)
    c += slab(-26, 24, 14, L3_TOP, 4, top="deck", thick=1.2)
    f = L3
    # helm station forward of the sky lounge
    c.append(box("white", -10, f, -44, 10, f + 6.8, -40, top="black"))
    c.append(box("black", -9.5, f + 6.8, -44, 9.5, f + 7.6, -40.3, rotation=(-16, 0, 0),
                 pivot=(0, f + 6.8, -40.3)))
    c.append(box("screen", 1, f + 6.4, -40.1, 9, f + 9.0, -39.8, rotation=(-16, 0, 0),
                 pivot=(5, f + 6.8, -40)))
    c.append(box("screen", -9, f + 6.4, -40.1, -1, f + 9.0, -39.8, rotation=(-16, 0, 0),
                 pivot=(-5, f + 6.8, -40)))
    c.append(box("gunmetal", -0.9, f + 6.8, -40.2, 0.9, f + 8.2, -39.0))
    for x0, x1 in ((3.2, 8.8), (-8.8, -3.2)):
        cx = (x0 + x1) / 2
        c.append(box("white", cx - 2.0, f, -36.4, cx + 2.0, f + 3.4, -31.6))
        c += bucket_seat(x0, x1, -36.0, -31.0, f + 3.4, cushion="leather", trim="tan", back=5)
    # spa pool
    c.append(box("white", -9, f, 24, 9, f + 3.2, 38, top="deck"))
    c.append(box("superyacht_water", -7.8, f + 3.2, 25.2, 7.8, f + 3.3, 36.8))
    c += [box("teak", -9.2, f + 3.2, 24, 9.2, f + 3.5, 25.2), box("teak", -9.2, f + 3.2, 36.8, 9.2, f + 3.5, 38)]
    c += mirrored("teak", 7.8, 9.2, f + 3.2, 25.2, f + 3.5, 36.8)
    # sun pads
    for sx in (1, -1):
        x0, x1 = sx * 1.0, sx * 13.0
        c.append(box("white", x0, f, 46, x1, f + 2.0, 66))
        c.append(box("vinyl", x0 + sx * 0.3, f + 2.0, 46.3, x1 - sx * 0.3, f + 3.0, 65.7))
        c.append(box("vinyl", x0 + sx * 0.3, f + 3.0, 46.4, x1 - sx * 0.3, f + 6.4, 49.0,
                     rotation=(30, 0, 0), pivot=(sx * 7.0, f + 3.0, 49.0)))
    # cap rails on the glass balustrades
    c += mirrored("steel", 16.8, 17.5, f + 6.0, -44, f + 6.5, 72)
    c.append(box("steel", -17.5, f + 6.0, 71.6, 17.5, f + 6.5, 72.3))
    return c


def glass_rails():
    g = []
    g += mirrored("glass", 19.3, 19.8, L2, 56, L2 + 7.0, 86)
    g.append(box("glass", -19.8, L2, 85.7, 19.8, L2 + 7.0, 86.2))
    g += mirrored("glass", 16.9, 17.4, L3, -44, L3 + 6.0, 72)
    g.append(box("glass", -17.4, L3, 71.7, 17.4, L3 + 6.0, 72.2))
    # helm windscreen
    g.append(box("glass", -10, L3 + 6.8, -44.3, 10, L3 + 10.0, -43.9, rotation=(-25, 0, 0),
                 pivot=(0, L3 + 6.8, -44.1)))
    return g


def mast():
    y = L3_TOP + 1.2
    c = []
    # a swept-back arch: two raked legs and a cross beam
    for sx in (1, -1):
        c.append(bar("white", (sx * 7.5, y, -6), (sx * 6.0, y + 11, 6), 2.2))
    c.append(box("white", -8.0, y + 10, 2, 8.0, y + 12.5, 12))
    c.append(box("black", -8.05, y + 10.8, 1.9, 8.05, y + 11.4, 12.1))
    # radar domes, open-array radar and whip antennas
    for x in (-4.5, 4.5):
        c += cylinder("white", (x, y + 14.0, 7), 2.4, 3.0, "y", 6)
        c += cylinder("white", (x, y + 15.8, 7), 1.6, 0.6, "y", 4)
    c.append(box("gunmetal", -0.4, y + 12.5, 9, 0.4, y + 15, 10))
    c.append(box("black", -7.0, y + 15.0, 9.0, 7.0, y + 15.9, 10.2))
    for x in (-7.2, 7.2):
        c.append(box("white", x - 0.25, y + 12.5, 11, x + 0.25, y + 21, 11.5))
    c.append(box("headlight", -0.6, y + 12.5, 3, 0.6, y + 13.6, 4.2))
    return c


def stern():
    S = STERN
    c = [box("teak", -21.0, 5.2, S, 21.0, 6.6, S + 11.0, sides="white", aft="white"),     # swim platform
         box("white", -21.0, 4.0, S, 21.0, 5.2, S + 10.6),
         box("superyacht_garage", -11.5, 6.6, S, 11.5, 13.6, S + 0.1),              # tender garage door
         box("white", -6.0, 14.2, S, 6.0, 17.6, S + 0.08, aft="superyacht_indi"),
         box("white", -11.0, 17.4, S, 11.0, 22.4, S + 0.08, aft="superyacht_luna")]
    # stairs up both sides of the transom to the aft deck
    for sx in (1, -1):
        for k in range(5):
            y = 6.6 + 3.0 * (k + 1)
            z = S + 10.0 - 2.0 * (k + 1)
            c.append(box("teak", sx * 13.5, y - 0.5, z, sx * 20.6, y, z + 2.0, sides="white"))
            c.append(box("white", sx * 13.5, 6.6, z, sx * 20.6, y - 0.5, z + 2.0))
        c.append(bar("chrome", (sx * 20.4, 11.6, S + 9.6), (sx * 20.4, 26.0, S + 0.4), 0.4))
        c.append(bar("chrome", (sx * 13.6, 11.6, S + 9.6), (sx * 13.6, 26.0, S + 0.4), 0.4))
    # ensign staff
    c.append(box("teak", -0.3, MAIN + 4.3, S - 1.2, 0.3, MAIN + 13, S - 0.6))
    c.append(box("red", -0.1, MAIN + 9.5, S - 0.6, 0.1, MAIN + 12.8, S + 4.5))
    return c


def drives():
    bones = []
    for sx, name in ((1, "prop_l"), (-1, "prop_r")):
        x = sx * 9.0
        hub = (x, -2.0, 86.0)
        bones.append({"name": f"shaft_{name[-1]}", "parent": "root", "pivot": [x, 0, 80],
                      "cubes": [bar("steel", (x, 0.2, 64.0), hub, 1.0),
                                box("gunmetal", x - 0.4, -2.4, 78.0, x + 0.4, 0.2, 80.0),
                                box("gunmetal", x - 0.45, -6.6, 89.0, x + 0.45, 0.2, 93.0)]})
        prop = [box("chrome", x - 0.7, hub[1] - 0.7, 85.0, x + 0.7, hub[1] + 0.7, 87.2)]
        for k in range(5):
            prop.append(box("chrome", x - 0.8, hub[1] + 0.4, 85.8, x + 0.8, hub[1] + 3.6, 86.3,
                            rotation=(0, 0, 72 * k + 10), pivot=(x, hub[1], 86.0)))
        bones.append({"name": name, "parent": "root", "pivot": list(hub), "cubes": prop})
    return bones


def build():
    return [
        {"name": "root", "pivot": [0, 0, STERN]},
        {"name": "hull", "parent": "root", "pivot": [0, 0, 0],
         "cubes": hull() + helipad() + stern()},
        {"name": "decks", "parent": "root", "pivot": [0, 0, 0],
         "cubes": main_deck() + bridge_deck() + sun_deck() + mast()},
        {"name": "glass_rails", "parent": "root", "pivot": [0, 0, 0], "cubes": glass_rails()},
        steering_wheel("wheel", (6.0, L3 + 9.6, -38.8), radius=2.0, tilt=-35),
        *drives(),
    ]
