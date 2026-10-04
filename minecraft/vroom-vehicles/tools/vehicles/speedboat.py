"""Speedboat: a white runabout with a teak deck and a big outboard.

LUNA is on the back of the motor, INDI is the boat's name on the transom.
"""
from artkit import (Hull, box, mirrored, decal, material, steering_wheel, bucket_seat,
                    MATERIALS, mix, rgb, glint)

INFO = {
    "id": "speedboat", "name": "Speedboat", "kind": "Runabout",
    "group": "Water", "mode": "water", "length": 3,
    "specs": [("Length", "3 blocks"), ("Beam", "1¼ blocks"), ("Seats", "3")],
    "seats": [(5, 8.1, 0.5), (-5, 8.1, 0.5), (0, 7.7, 10.4)],
    "collision": (1.5, 0.8), "health": 8,
    "speed": 0.35, "water_drag": 0.25,
    "recipe": {"shapeless": ["minecraft:oak_boat", "minecraft:iron_ingot", "minecraft:redstone"]},
    "recipe_text": "Oak Boat + Iron + Redstone",
    "spawn_egg": ("#F2F2EE", "#24365E"),
    "anim": [
        {"bone": "root", "type": "lift", "k": 0.9, "max": 7},
        {"bone": "prop", "type": "spin", "axis": "z", "idle": 0, "ridden": 0, "per_speed": 1500},
    ],
    "eggs": "LUNA on the back of the motor and across the transom",
    "egg_cam": {"eye": [12, 17, 74], "at": [0, 10, 24]},
}

STERN = 22
HULL = Hull(bow_tip=-26, bow_start=-4, stern=STERN, beam=10, deck=9, sheer=2.5, rise=6,
            cockpit=(-6, 14), floor=5)


def _cowling(u, v):
    """Black cowling with red and white pinstripes and a chevron badge."""
    c = mix(rgb("#30343B"), rgb("#0B0C0E"), v)
    c = mix(c, (170, 178, 190), glint(v, 0.18, 0.06, 0.45))
    if 0.66 < v < 0.72:
        return rgb("#D3262E")
    if 0.74 < v < 0.77:
        return rgb("#F2F2F2")
    dx = abs(u - 0.5)
    if 0.22 < v < 0.56 and abs((v - 0.22) - (0.34 - dx * 1.4)) < 0.07 and dx < 0.24:
        return rgb("#F5F5F5")
    return c


material("speedboat_cowling", _cowling)
decal("speedboat_luna", "LUNA", "#F7F7F7", "black", underline="#D3262E")
decal("speedboat_indi", "LUNA", "#1E2F55", "deck", box=(0.08, 0.2, 0.84, 0.5),
      underline="#D3262E")


def bow_rail():
    h = HULL
    cubes = []
    for z in range(-24, -7):
        zm = z + 0.5
        x, y = h.half_width(zm) - 1.2, h.deck_height(zm) + 1.6
        if x < 0.6:
            continue
        cubes += mirrored("chrome", x - 0.35, x, y, z, y + 0.35, z + 1)
        if z % 4 == 0:
            cubes += mirrored("chrome", x - 0.3, x - 0.05, h.deck_height(zm), zm - 0.15,
                              y, zm + 0.15)
    d = h.deck_height(-22)
    cubes.append(box("chrome", -0.4, d, -23, 0.4, d + 0.6, -21))
    cubes.append(box("nav_red", -2.6, d, -20, -1.6, d + 0.8, -19))
    cubes.append(box("nav_green", 1.6, d, -20, 2.6, d + 0.8, -19))
    return cubes


def cockpit():
    f = HULL.floor + 0.3
    cubes = []
    for x0, x1 in ((2, 8), (-8, -2)):                 # driver (+x) and passenger
        cx = (x0 + x1) / 2
        cubes.append(box("gunmetal", cx - 1.2, f, -1, cx + 1.2, f + 1.2, 2))
        cubes += bucket_seat(x0, x1, -2, 3, f + 1.2)
    cubes.append(box("leather", -8.5, f, 8.5, 8.5, f + 2.4, 12.2))     # rear bench
    cubes.append(box("tan", -8.5, f, 8.2, 8.5, f + 2.5, 8.6))
    cubes.append(box("leather", -8.5, f + 2.4, 12.0, 8.5, f + 6.4, 13.2,
                     rotation=(-10, 0, 0), pivot=(0, f + 2.4, 13.2)))
    cubes.append(box("gunmetal", 2, f, -6, 8, 9.8, -3.5, top="black"))  # console
    cubes.append(box("screen", 3, 8.2, -3.6, 7, 9.5, -3.45))
    cubes.append(box("gunmetal", -8, f, -6, -2, 8.8, -3.5, top="black"))
    cubes.append(box("gunmetal", 4.6, 9.8, -3.5, 5.4, 10.8, -2.9))     # steering column
    return cubes


def windshield():
    z, base, height = -6.5, HULL.deck_height(-6.5) - 0.3, 4.6
    pivot = [0, base, z + 0.2]
    bones = [
        {"name": "windshield", "parent": "root", "pivot": pivot, "rotation": [-28, 0, 0],
         "cubes": [box("chrome", -6.2, base + height, z, 6.2, base + height + 0.45, z + 0.45),
                   box("chrome", -6.2, base, z, -5.8, base + height, z + 0.4),
                   box("chrome", 5.8, base, z, 6.2, base + height, z + 0.4)]},
        {"name": "glass", "parent": "windshield", "pivot": pivot,
         "cubes": [box("glass", -5.8, base, z + 0.05, 5.8, base + height, z + 0.3)]},
    ]
    for sign, side in ((1, "r"), (-1, "l")):
        x = 6.0 * sign
        p = [x, base, z + 0.2]
        bones.append({"name": f"windshield_{side}", "parent": "root", "pivot": p,
                      "rotation": [0, 39 * sign, 0],
                      "cubes": [box("chrome", x, base + height - 0.5, z, x + 0.45 * sign,
                                    base + height - 0.05, z + 4.2)]})
        bones.append({"name": f"glass_{side}", "parent": f"windshield_{side}", "pivot": p,
                      "cubes": [box("glass", x + 0.1 * sign, base, z + 0.3, x + 0.35 * sign,
                                    base + height - 0.5, z + 4.2)]})
    return bones


def motor():
    S = STERN
    cubes = [
        box("teak", -9, 3.2, S, -3, 4.2, S + 3.5),                      # swim platforms
        box("teak", 3, 3.2, S, 9, 4.2, S + 3.5),
        box("gunmetal", -2, 3, S, 2, 9.5, S + 1.5),                     # bracket
        box("white", -8.8, 5.4, S, -2.6, 8.2, S + 0.06, aft="speedboat_indi"),
        box("black", -1.6, -0.5, S + 2.2, 1.6, 9.2, S + 4.8),           # midsection
        box("chrome", -3, 0.6, S + 1.6, 3, 1.0, S + 6.2),               # cavitation plate
        box("gunmetal", -1.2, -2.6, S + 1.6, 1.2, 0.6, S + 6.4),        # gearcase
        box("gunmetal", -0.3, -4.4, S + 4.2, 0.3, -2.6, S + 6.2),       # skeg
        box("speedboat_cowling", -3.6, 9.2, S + 1.2, 3.6, 15, S + 8.4, top="black",
            aft="speedboat_luna"),
        box("black", -3.2, 15, S + 1.6, 3.2, 16, S + 8.0),
        box("black", -2.4, 16, S + 2.4, 2.4, 16.5, S + 7.2),
        box("chrome", -3.65, 9.3, S + 8.1, 3.65, 9.7, S + 8.45),
    ]
    hub = (0, -1.0, S + 6.6)
    prop = [box("chrome", -0.5, hub[1] - 0.5, S + 6.2, 0.5, hub[1] + 0.5, S + 7.6)]
    for k in range(3):
        prop.append(box("chrome", -0.55, hub[1] + 0.3, S + 6.7, 0.55, hub[1] + 2.9, S + 7.0,
                        rotation=(0, 0, 120 * k), pivot=(0, hub[1], S + 6.85)))
    return [{"name": "motor", "parent": "root", "pivot": [0, 9, S], "cubes": cubes},
            {"name": "prop", "parent": "motor", "pivot": list(hub), "cubes": prop}]


def build():
    return [
        {"name": "root", "pivot": [0, 0, STERN]},
        {"name": "hull", "parent": "root", "pivot": [0, 0, 0],
         "cubes": HULL.cubes() + bow_rail() + cockpit()},
        steering_wheel("wheel", (5, 11.0, -3.0)),
        *windshield(),
        *motor(),
    ]
