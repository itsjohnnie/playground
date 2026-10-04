"""Offshore racer: a long, narrow "cigarette" go-fast boat in yellow and black.

LUNA and INDI are painted on top of the two racing outboards (LUNA on the
left seen from behind, INDI on the right).
"""
import math

from artkit import (Hull, box, mirrored, bar, decal, material, paint, steering_wheel,
                    mix, rgb, glint, scale, noise, _face)

INFO = {
    "id": "offshore_racer", "name": "Offshore Racer", "kind": "Go-fast boat",
    "group": "Water", "mode": "water", "length": 6,
    "specs": [("Length", "6 blocks"), ("Beam", "1¼ blocks"), ("Seats", "4"),
              ("Motors", "Twin racing outboards")],
    "seats": [(3.4, 8.9, 15.4), (-3.4, 8.9, 15.4), (3.4, 8.5, 23.6), (-3.4, 8.5, 23.6)],
    "collision": (1.4, 0.8), "health": 12,
    "speed": 0.5, "water_drag": 0.2,
    "recipe": {"shapeless": ["minecraft:dark_oak_boat", "minecraft:gold_ingot",
                             "minecraft:blaze_powder", "minecraft:yellow_dye"]},
    "recipe_text": "Dark Oak Boat + Gold + Blaze Powder + Yellow Dye",
    "spawn_egg": ("#FFD21F", "#14151A"),
    "anim": [
        {"bone": "root", "type": "lift", "k": 1.1, "max": 11},
        {"bone": "prop_l", "type": "spin", "axis": "z", "idle": 0, "ridden": 0, "per_speed": 1900},
        {"bone": "prop_r", "type": "spin", "axis": "z", "idle": 0, "ridden": 0,
         "per_speed": -1900},
    ],
    "eggs": "LUNA and INDI on top of the two outboard cowlings (LUNA left, INDI right from behind)",
    "egg_cam": {"eye": [-6, 46, 78], "at": [0, 14, 42]},
}

STERN = 38
FLOOR = 5.5
COCKPIT = (10, 28)


def _side(u, v):
    """Gloss black topsides with a yellow and orange speed stripe (band-mapped)."""
    c = mix(rgb("#3A3E46"), rgb("#0A0B0D"), v ** 1.1)
    c = mix(c, (200, 206, 214), glint(v, 0.12, 0.05, 0.45))
    if 0.46 < v < 0.55:
        return mix(rgb("#FFE04A"), rgb("#F2B800"), (v - 0.46) / 0.09)
    if 0.58 < v < 0.64:
        return mix(rgb("#FF8A1E"), rgb("#D9480F"), (v - 0.58) / 0.06)
    if 0.66 < v < 0.68:
        return rgb("#F4F4F0")
    return scale(c, noise(0.02))


def _yellow(u, v):
    c = mix(rgb("#FFE24E"), rgb("#D99A00"), v ** 1.2)
    return scale(mix(c, (255, 255, 255), glint(v, 0.15, 0.05, 0.5)), noise(0.02))


def _cowl(u, v):
    """Racing outboard cowl: black with the yellow and orange stripe."""
    c = mix(rgb("#363A42"), rgb("#0B0C0E"), v)
    c = mix(c, (200, 206, 214), glint(v, 0.14, 0.05, 0.45))
    if 0.62 < v < 0.7:
        return rgb("#FFD21F")
    if 0.72 < v < 0.77:
        return rgb("#FF7A1A")
    return c


material("offshore_racer_side", _side)
material("offshore_racer_yellow", _yellow)
material("offshore_racer_cowl", _cowl)
material("offshore_racer_flat", lambda u, v: scale(rgb("#FFD21F"), noise(0.03)))
material("offshore_racer_stripe", lambda u, v: scale(rgb("#17181C"), noise(0.05)))
paint("offshore_racer_orange", "#FF9A2E", "#C2410C", gloss=0.5)
paint("offshore_racer_bottom", "#3B3F46", "#121316", gloss=0.2)
decal("offshore_racer_luna", "LUNA", "#14151A", "offshore_racer_flat",
      box=(0.1, 0.3, 0.8, 0.26), underline="#FF7A1A")
decal("offshore_racer_indi", "INDI", "#14151A", "offshore_racer_flat",
      box=(0.1, 0.3, 0.8, 0.26), underline="#FF7A1A")
decal("offshore_racer_num", "07", "#14151A", "white", box=(0.22, 0.18, 0.56, 0.64))

HULL = Hull(bow_tip=-55, bow_start=-12, stern=STERN, beam=9.5, deck=8.5, sheer=2.2, rise=8,
            cockpit=COCKPIT, floor=FLOOR, waterline=3.8, topsides="offshore_racer_side",
            bottom="offshore_racer_bottom", boot="offshore_racer_orange",
            accent="offshore_racer_yellow", foredeck="offshore_racer_flat",
            cockpit_floor="dark_leather", deck_top="offshore_racer_flat", rail="rubber",
            bow_step=1.0, run_step=2)


def only(cube, face, mat):
    cube["uv"][face] = _face(mat, 0, 0)
    return cube


def foredeck():
    h = HULL
    cubes = []
    # flush hatch, bow light, cleats and a low chrome grab rail
    d = h.deck_height(-20)
    cubes += [box("chrome", -0.4, h.deck_height(-50), -51, 0.4, h.deck_height(-50) + 0.5, -48),
              box("nav_red", 0.6, h.deck_height(-46) - 0.1, -46.5, 1.4,
                  h.deck_height(-46) + 0.5, -45.5),
              box("nav_green", -1.4, h.deck_height(-46) - 0.1, -46.5, -0.6,
                  h.deck_height(-46) + 0.5, -45.5)]
    for z in (-30, 0):
        x, dd = h.half_width(z) - 1.2, h.deck_height(z)
        cubes += mirrored("chrome", x - 0.3, x + 0.3, dd - 0.05, z - 0.9, dd + 0.45, z + 0.9)
    # side step vents: dark notches near the bottom of the hull
    for z in (-8, 6, 20):
        cubes += mirrored("matte_black", h.half_width(z) - 0.3, h.half_width(z) + 0.05, 2.6,
                          z, 3.6, z + 3)
    # race number panels on both sides
    for z0 in (-9,):
        w = h.half_width(z0 + 3)
        y0 = h.deck_height(z0 + 3) - 5.4
        cubes += mirrored("white", w - 0.2, w + 0.12, y0, z0, y0 + 2.6, z0 + 6,
                          sides="offshore_racer_num")
    return cubes


def _strip(mat, x0, x1, z0, z1, lift, n):
    """A thin strip laid along the deck's sheer, in n pitched segments."""
    h = HULL
    out = []
    zs = [z0 + (z1 - z0) * i / n for i in range(n + 1)]
    for za, zb in zip(zs, zs[1:]):
        ya, yb = h.deck_height(za) + lift, h.deck_height(zb) + lift
        zm, ym = (za + zb) / 2, (ya + yb) / 2
        length = math.hypot(zb - za, yb - ya) + 0.05
        pitch = math.degrees(math.atan2(yb - ya, zb - za))
        out.append(box(mat, x0, ym, zm - length / 2, x1, ym + 0.1, zm + length / 2,
                       rotation=(pitch, 0, 0), pivot=(0, ym, zm)))
    return out


def stripes():
    """Twin black racing stripes with white pinstripes, bow to windscreen."""
    cubes = []
    for s in (1, -1):
        cubes += _strip("offshore_racer_stripe", s * 0.5, s * 2.6, -46, 9.4, 0.06, 8)
        cubes += _strip("white", s * 2.9, s * 3.2, -44, 9.4, 0.06, 8)
    return cubes


def cockpit():
    f = FLOOR + 0.3
    z0, z1 = COCKPIT
    cubes = [
        # dash with gauges and a carbon fascia
        box("carbon", -7.6, f, z0, 7.6, 9.6, z0 + 2.4, top="black"),
        box("black", -7.0, 9.0, z0 + 2.3, 7.0, 9.4, z0 + 2.5),
    ]
    for k in range(5):
        x = -6 + k * 3
        cubes += [box("chrome", x - 0.8, 7.2, z0 + 2.4, x + 0.8, 8.8, z0 + 2.55),
                  box("screen", x - 0.6, 7.4, z0 + 2.5, x + 0.6, 8.6, z0 + 2.6)]
    cubes.append(box("gunmetal", 2.8, 6.0, z0 + 2.4, 4.0, 7.0, z0 + 3.2))      # column
    # throttles in the middle
    cubes += [box("chrome", -1.0, 9.6, z0 + 1.0, 1.0, 10.0, z0 + 2.4),
              bar("chrome", (-0.4, 9.8, z0 + 1.6), (-0.4, 11.8, z0 + 2.6), 0.3),
              bar("chrome", (0.4, 9.8, z0 + 1.6), (0.4, 11.8, z0 + 2.6), 0.3),
              box("black", -0.9, 11.5, z0 + 2.2, 0.9, 12.0, z0 + 3.0)]
    # two bolster seats side by side
    for cx in (3.4, -3.4):
        cubes += [box("carbon", cx - 2.4, f, 13.2, cx + 2.4, 7.4, 18.0),
                  box("dark_leather", cx - 2.2, 7.4, 13.4, cx + 2.2, 8.9, 17.6),
                  box("offshore_racer_yellow", cx - 2.5, 7.2, 13.2, cx - 1.9, 9.3, 17.8),
                  box("offshore_racer_yellow", cx + 1.9, 7.2, 13.2, cx + 2.5, 9.3, 17.8),
                  box("dark_leather", cx - 2.2, 7.4, 17.6, cx + 2.2, 13.0, 18.6,
                      rotation=(-10, 0, 0), pivot=(cx, 7.4, 18.6)),
                  box("offshore_racer_yellow", cx - 2.4, 8.0, 17.8, cx + 2.4, 13.2, 18.8,
                      rotation=(-10, 0, 0), pivot=(cx, 7.4, 18.8))]
    # rear bench
    cubes += [box("carbon", -7.6, f, 21.6, 7.6, 7.0, 26.0),
              box("dark_leather", -7.4, 7.0, 21.8, 7.4, 8.5, 25.6),
              box("dark_leather", -7.4, 8.5, 25.4, 7.4, 11.4, 26.4, rotation=(-8, 0, 0),
                  pivot=(0, 8.5, 26.4))]
    # chrome grab rails along the cockpit coaming
    for s in (1, -1):
        x = s * 8.3
        cubes.append(box("chrome", x - 0.25, 9.6, 12, x + 0.25, 9.95, 26))
        for z in (12.5, 19, 25.5):
            cubes.append(box("chrome", x - 0.2, HULL.deck_height(z), z - 0.2, x + 0.2, 9.7, z + 0.2))
    return cubes


def fairings():
    """Streamlined headrest fairings on the rear deck, where the names live."""
    cubes = []
    for cx in (3.6, -3.6):
        cubes += [
            box("offshore_racer_yellow", cx - 2.6, 8.5, 28, cx + 2.6, 12.4, 32,
                top="offshore_racer_flat"),
            box("offshore_racer_yellow", cx - 2.2, 8.5, 32, cx + 2.2, 11.0, 34.5,
                rotation=(-22, 0, 0), pivot=(cx, 8.5, 32)),
            box("black", cx - 2.0, 10.6, 27.6, cx + 2.0, 12.0, 28.1),          # headrest pad
        ]
    # rear deck: engine air scoops and a flush sun pad edge
    cubes += [box("black", -1.0, 8.5, 29, 1.0, 10.2, 35),
              box("matte_black", -0.8, 9.2, 28.9, 0.8, 10.0, 29.1)]
    return cubes


def windscreen():
    base, z = 9.6, COCKPIT[0] - 0.4
    pivot = [0, base, z]
    bones = [{"name": "glass_screen", "parent": "root", "pivot": pivot, "rotation": [-45, 0, 0],
              "cubes": [box("tinted_glass", -7.4, base, z - 0.25, 7.4, base + 3.0, z)]},
             {"name": "screen_frame", "parent": "root", "pivot": pivot, "rotation": [-45, 0, 0],
              "cubes": [box("black", -7.6, base + 3.0, z - 0.35, 7.6, base + 3.4, z + 0.05)]}]
    return bones


def outboard(name, x, word):
    S = STERN
    cubes = [
        box("gunmetal", x - 1.8, 3.6, S - 0.2, x + 1.8, 9.0, S + 2.2),            # jack plate
        box("black", x - 1.4, -0.4, S + 2.2, x + 1.4, 9.0, S + 5.0),              # midsection
        box("chrome", x - 2.8, 1.4, S + 1.6, x + 2.8, 1.8, S + 7.4),              # cavitation plate
        box("gunmetal", x - 1.1, -2.2, S + 1.8, x + 1.1, 1.4, S + 7.6),           # torpedo gearcase
        box("gunmetal", x - 0.3, -4.2, S + 4.8, x + 0.3, -2.2, S + 7.4),          # skeg
        box("offshore_racer_cowl", x - 3.2, 9.0, S + 0.8, x + 3.2, 16.6, S + 9.6, top="black"),
        box("black", x - 2.9, 16.6, S + 1.2, x + 2.9, 17.6, S + 9.2),
        box("black", x - 2.4, 17.6, S + 2.0, x + 2.4, 18.1, S + 8.6,
            top=f"offshore_racer_{word}"),
        box("chrome", x - 3.25, 9.0, S + 9.2, x + 3.25, 9.4, S + 9.65),
        box("matte_black", x - 3.25, 13.8, S + 1.6, x + 3.25, 14.6, S + 4.0),     # cowl vents
    ]
    hub = (x, -0.4, S + 8.0)
    prop = [box("chrome", x - 0.5, hub[1] - 0.5, S + 7.6, x + 0.5, hub[1] + 0.5, S + 9.4)]
    for k in range(4):
        prop.append(box("chrome", x - 0.55, hub[1] + 0.3, S + 8.2, x + 0.55, hub[1] + 2.7,
                        S + 8.5, rotation=(0, 0, 90 * k + 15), pivot=(x, hub[1], S + 8.35)))
    return [{"name": f"motor_{name}", "parent": "root", "pivot": [x, 9, S], "cubes": cubes},
            {"name": f"prop_{name}", "parent": f"motor_{name}", "pivot": list(hub),
             "cubes": prop}]


def stern():
    S = STERN
    return [
        box("carbon", -9.0, 3.4, S, 9.0, 4.2, S + 2.0),                           # swim shelf
        box("chrome", -9.2, 4.2, S + 1.7, 9.2, 4.5, S + 2.0),
        only(box("offshore_racer_flat", -0.8, 5.0, S, 0.8, 8.0, S + 0.1), "south", "black"),
    ]


def build():
    return [
        {"name": "root", "pivot": [0, 0, STERN]},
        {"name": "hull", "parent": "root", "pivot": [0, 0, 0],
         "cubes": HULL.cubes() + foredeck() + stripes() + cockpit() + fairings() + stern()},
        steering_wheel("wheel", (3.4, 9.0, COCKPIT[0] + 3.4), radius=1.8, tilt=-25),
        *windscreen(),
        *outboard("l", 4.2, "luna"),
        *outboard("r", -4.2, "indi"),
    ]
