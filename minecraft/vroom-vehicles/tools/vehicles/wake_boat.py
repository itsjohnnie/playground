"""Wake boat: a tall, purple-and-white towboat with a wakeboard tower.

LUNA is printed on the wakeboard in the tower rack on the boat's left side,
INDI is the boat's name on the transom above the swim platform.
"""

from artkit import (Hull, box, mirrored, cylinder, bar, decal, material, paint, steering_wheel,
                    bucket_seat, mix, rgb, glint, scale, noise)

INFO = {
    "id": "wake_boat", "name": "Wake Boat", "kind": "Towboat",
    "group": "Water", "mode": "water", "length": 4,
    "specs": [("Length", "4 blocks"), ("Beam", "1½ blocks"), ("Seats", "6"),
              ("Motor", "Inboard"), ("Tower", "Wakeboard")],
    "seats": [(-7, 9.8, 0.2), (7, 9.6, 0.4), (5.6, 9.8, -19), (-5.6, 9.8, -19),
              (6.2, 9.6, 12), (-6.2, 9.6, 12)],
    "collision": (1.8, 1.2), "health": 12,
    "speed": 0.34, "water_drag": 0.28,
    "recipe": {"shapeless": ["minecraft:acacia_boat", "minecraft:iron_ingot",
                             "minecraft:purple_dye", "minecraft:lead"]},
    "recipe_text": "Acacia Boat + Iron + Purple Dye + Lead",
    "spawn_egg": ("#6B2FC0", "#F6F6F2"),
    "anim": [
        {"bone": "root", "type": "lift", "k": 0.7, "max": 5},
        {"bone": "prop", "type": "spin", "axis": "z", "idle": 0, "ridden": 0, "per_speed": 1400},
    ],
    "eggs": "LUNA on the wakeboard in the tower rack and across the transom",
    "egg_cam": {"eye": [-46, 34, 78], "at": [0, 15, 12]},
}

STERN = 26
FLOOR = 6.5
F = FLOOR + 0.3


def _sides(u, v):
    """White upper topsides, an orange pinstripe, deep purple metallic below."""
    if v < 0.42:
        c = mix(rgb("#FFFFFF"), rgb("#DADCD8"), v / 0.42)
        return scale(mix(c, (255, 255, 255), glint(v, 0.1, 0.05, 0.5)), noise(0.02))
    if v < 0.45:
        return rgb("#14151A")
    if v < 0.49:
        return mix(rgb("#FF9A2E"), rgb("#E0600C"), (v - 0.45) / 0.04)
    if v < 0.51:
        return rgb("#14151A")
    c = mix(rgb("#8A4BE0"), rgb("#2E0E63"), (v - 0.51) / 0.49)
    c = mix(c, (230, 220, 255), glint(v, 0.58, 0.04, 0.4))
    return scale(c, noise(0.05))


def _bottom(u, v):
    return scale(mix(rgb("#EDEDEA"), rgb("#A9AEB4"), v), noise(0.02))


def _mat(u, v):
    """Two-tone grey foam flooring with grooves, a tile."""
    if (u * 64) % 4 < 0.5:
        return rgb("#6E737A")
    return scale(rgb("#A7ACB2") if int(v * 64 / 16) % 2 else rgb("#B4B9BF"), noise(0.03))


def _rubrail(u, v):
    if 0.4 < v < 0.6:
        return mix(rgb("#F4F7FA"), rgb("#8E979F"), (v - 0.4) / 0.2)
    return mix(rgb("#2E3035"), rgb("#111214"), v)


def _board(u, v):
    """Wakeboard deck: orange to purple fade with a white edge."""
    if v < 0.08 or v > 0.92 or u < 0.03 or u > 0.97:
        return rgb("#F4F4F0")
    return mix(rgb("#FF9A2E"), rgb("#7A3AD0"), u)


def _seat(u, v):
    """White marine vinyl with purple piping, a tile."""
    if (v * 64) % 6 < 0.6:
        return rgb("#7A3AD0")
    pleat = (u * 64 / 4) % 1
    return scale(mix(rgb("#FAFAF7"), rgb("#D9DBD7"), abs(pleat - 0.5) * 2), noise(0.02))


material("wake_boat_sides", _sides)
material("wake_boat_bottom", _bottom)
material("wake_boat_mat", _mat, "tile")
material("wake_boat_rubrail", _rubrail)
material("wake_boat_board", _board)
material("wake_boat_seat", _seat, "tile")
paint("wake_boat_purple", "#9A5CF0", "#3B137A", gloss=0.5)
paint("wake_boat_orange", "#FFAA3E", "#D6520A", gloss=0.5)
decal("wake_boat_luna", "LUNA", "#FFFFFF", "wake_boat_board", box=(0.12, 0.2, 0.76, 0.5))
decal("wake_boat_indi", "LUNA", "#3B137A", "white", box=(0.1, 0.18, 0.8, 0.48),
      underline="#FF8A1E")

HULL = Hull(bow_tip=-32, bow_start=-12, stern=STERN, beam=12, deck=13, sheer=1.4, rise=6,
            cockpit=(-27, 21), floor=FLOOR, waterline=4.2, topsides="wake_boat_sides",
            bottom="wake_boat_bottom", boot="black", accent="wake_boat_orange",
            foredeck="deck", cockpit_floor="wake_boat_mat", deck_top="deck",
            rail="wake_boat_rubrail", bow_step=0.5, run_step=2)


def bow():
    h = HULL
    cubes = []
    for z in range(-26, -12):                     # U-shaped bow lounge
        zm = z + 0.5
        wi = h.half_width(zm) - 1.5
        if wi < 3:
            continue
        cubes += mirrored("white", wi - 3.2, wi, F, z, F + 1.8, z + 1)
        cubes += mirrored("wake_boat_seat", wi - 3.0, wi, F + 1.8, z, F + 3.0, z + 1)
        cubes += mirrored("wake_boat_seat", wi - 0.9, wi, F + 3.0, z, h.deck_height(zm) - 0.5,
                          z + 1)
    wi = h.half_width(-26) - 1.5
    cubes += [box("white", -wi, F, -27, wi, F + 1.8, -25.5),
              box("wake_boat_seat", -wi, F + 1.8, -27, wi, F + 3.0, -25.5),
              box("wake_boat_seat", -wi + 0.5, F + 3.0, -27.3, wi - 0.5,
                  h.deck_height(-27) - 0.5, -26.3)]
    # bow grab handles, cleats, nav light and the bow filler cushion
    for z in (-22, -15):
        x, d = h.half_width(z) - 0.9, h.deck_height(z)
        cubes += mirrored("steel", x - 0.25, x + 0.25, d, z - 1.2, d + 0.9, z - 0.9)
        cubes += mirrored("steel", x - 0.25, x + 0.25, d, z + 0.9, d + 0.9, z + 1.2)
        cubes += mirrored("steel", x - 0.25, x + 0.25, d + 0.6, z - 1.2, d + 0.9, z + 1.2)
    d = h.deck_height(-30)
    cubes += [box("steel", -0.5, d, -31.2, 0.5, d + 0.5, -29.6),
              box("nav_red", 0.8, d, -29.4, 1.8, d + 0.7, -28.6),
              box("nav_green", -1.8, d, -29.4, -0.8, d + 0.7, -28.6)]
    for z in (-10, 18):
        x, dd = h.half_width(z) - 0.8, h.deck_height(z)
        cubes += mirrored("steel", x - 0.3, x + 0.3, dd, z - 1.0, dd + 0.6, z + 1.0)
    return cubes


def consoles():
    """Helm (starboard, -x) and observer (port) consoles with a walk-through windshield."""
    cubes = []
    for s in (-1, 1):
        x0, x1 = s * 3.6, s * 10.6
        cubes += [box("white", x0, F, -11.5, x1, 13.2, -5.0, top="black"),
                  box("wake_boat_purple", x0, F, -11.55, x1, F + 0.8, -4.95),
                  box("black", x0, 12.4, -5.2, x1, 13.2, -4.6)]
    # helm: big touchscreen, gauges, wheel column, throttle
    cubes += [box("black", -9.8, 13.2, -10.0, -4.4, 14.6, -6.2, rotation=(18, 0, 0),
                  pivot=(-7, 13.2, -6.2)),
              box("screen", -9.4, 14.6, -9.4, -4.8, 14.75, -6.6, rotation=(18, 0, 0),
                  pivot=(-7, 13.2, -6.2)),
              box("gunmetal", -7.6, 10.4, -5.0, -6.4, 12.0, -3.8),
              box("chrome", -4.3, 12.2, -4.8, -3.6, 12.8, -3.6),
              bar("black", (-4.0, 12.6, -4.2), (-4.0, 14.4, -3.2), 0.35),
              box("black", -4.4, 14.2, -3.6, -3.6, 14.7, -2.8)]
    # observer side: glovebox lid and grab handle
    cubes += [box("black", 4.6, 10.0, -5.0, 9.6, 12.0, -4.85),
              box("steel", 5.8, 12.6, -4.9, 8.4, 12.9, -4.3)]
    # helm bucket seat on a pedestal, observer lounger
    cubes.append(box("gunmetal", -8.0, F, -1.0, -6.0, F + 1.4, 1.5))
    cubes += bucket_seat(-9.6, -4.4, -2.4, 2.6, F + 1.4, cushion="wake_boat_seat",
                         trim="wake_boat_purple", recline=-10)
    cubes += [box("white", 4.0, F, -3.2, 10.4, F + 1.4, 3.0),
              box("wake_boat_seat", 4.0, F + 1.4, -3.0, 10.4, F + 2.8, 2.8),
              box("wake_boat_seat", 4.2, F + 2.8, 2.0, 10.2, 14.0, 3.2, rotation=(-12, 0, 0),
                  pivot=(7.2, F + 2.8, 3.2)),
              box("wake_boat_purple", 3.9, F + 1.2, -3.2, 10.5, F + 1.5, 3.0)]
    return cubes


def windshield():
    bones = []
    base, z = 13.0, -11.3
    for s, side in ((-1, "r"), (1, "l")):
        x0, x1 = s * 3.6, s * 10.8
        bones.append({"name": f"frame_{side}", "parent": "root", "pivot": [0, base, z],
                      "rotation": [-30, 0, 0],
                      "cubes": [box("black", x0, base + 4.0, z - 0.35, x1, base + 4.4, z + 0.05),
                                box("black", x0 - s * 0.3, base, z - 0.35, x0, base + 4.4,
                                    z + 0.05)]})
        bones.append({"name": f"glass_{side}", "parent": "root", "pivot": [0, base, z],
                      "rotation": [-30, 0, 0],
                      "cubes": [box("tinted_glass", x0, base, z - 0.25, x1, base + 4.0, z)]})
    return bones


def rear_seating():
    h = HULL
    cubes = []
    for z in range(5, 21):                         # side benches along the walls
        zm = z + 0.5
        wi = h.half_width(zm) - 1.5
        cubes += mirrored("white", wi - 3.4, wi, F, z, F + 1.6, z + 1)
        cubes += mirrored("wake_boat_seat", wi - 3.2, wi, F + 1.6, z, F + 2.8, z + 1)
        cubes += mirrored("wake_boat_seat", wi - 0.9, wi, F + 2.8, z, h.deck_height(zm) - 0.5,
                          z + 1)
    cubes += [box("white", -7.0, F, 17.6, 7.0, F + 1.6, 21.0),     # rear bench
              box("wake_boat_seat", -7.0, F + 1.6, 17.8, 7.0, F + 2.8, 21.0),
              box("wake_boat_seat", -7.2, F + 2.8, 20.2, 7.2, 12.6, 21.0),
              box("wake_boat_mat", -10.5, F, -5.0, 10.5, F + 0.05, 5.0)]
    # side wall padding forward of the benches, cupholders on the coaming
    for z in range(-12, 5):
        zm = z + 0.5
        wi = h.half_width(zm) - 1.5
        cubes += mirrored("wake_boat_seat", wi - 0.4, wi, 10.2, z, h.deck_height(zm) - 0.6, z + 1)
    for z in (9, 15):
        x, d = h.half_width(z) - 0.75, h.deck_height(z)
        cubes += mirrored("steel", x - 0.45, x + 0.45, d - 0.05, z - 0.45, d + 0.2, z + 0.45)
        cubes += mirrored("black", x - 0.3, x + 0.3, d + 0.05, z - 0.3, d + 0.25, z + 0.3)
    return cubes


T = 30.0                                          # tower top
LEGS = {"front": (-4.0, -1.0), "rear": (8.5, 5.0)}  # z at the gunwale, z at the top


def _leg(y, which):
    """(x, z) of a tower leg at height y: they lean in and lean together."""
    k = (y - 13) / (T - 13)
    z0, z1 = LEGS[which]
    return 11.0 - 3.8 * k, z0 + (z1 - z0) * k


def tower():
    cubes = []
    for s in (1, -1):
        for which in LEGS:
            x0, z0 = _leg(13, which)
            x1, z1 = _leg(T, which)
            cubes.append(bar("black", (s * x0, 13.0, z0), (s * x1, T, z1), 1.0))
            cubes.append(box("steel", s * (x0 - 0.8), 12.9, z0 - 1.0, s * (x0 + 0.8), 13.6,
                             z0 + 1.0))
        cubes.append(bar("black", (s * 7.2, T, -1.0), (s * 7.2, T, 5.0), 1.0))
        # speakers aimed back at the rider
        x, z = _leg(25, "rear")
        cubes += cylinder("black", (s * x, 25.0, z + 1.2), 1.3, 2.2, "z", 4)
        cubes += cylinder("gunmetal", (s * x, 25.0, z + 2.25), 1.0, 0.2, "z", 4)
        # board rack arm, outside the front leg
        x, z = _leg(23, "front")
        cubes.append(bar("steel", (s * x, 23.0, z), (s * (x + 1.6), 23.0, z), 0.5))
        cubes.append(box("steel", s * (x + 1.4), 20.0, z - 0.4, s * (x + 1.8), 23.2, z + 0.4))
    for z in (-1.0, 5.0):
        cubes.append(bar("black", (-7.2, T, z), (7.2, T, z), 1.0))
    # hardtop roof, light bar and the tow pylon
    cubes += [box("black", -7.6, T + 0.5, -3.0, 7.6, T + 1.3, 7.0, top="wake_boat_purple"),
              box("wake_boat_purple", -7.0, T + 1.3, -2.4, 7.0, T + 1.7, 6.4),
              box("headlight", -3.0, T + 0.35, -2.6, 3.0, T + 0.5, -2.0),
              box("steel", -0.4, T - 2.6, 5.0, 0.4, T + 0.5, 5.8)]
    cubes += cylinder("steel", (0, T - 3.2, 6.4), 0.9, 0.4, "z", 4)
    # wakeboards in the side racks (rounded tips, rubber rails)
    x, z = _leg(23, "front")
    x += 1.9
    zc = z - 2.0
    for s, word in ((1, "wake_boat_luna"), (-1, None)):
        x0, x1 = sorted((s * x, s * (x + 0.35)))
        kw = {"sides": word} if word else {}
        cubes += [box("wake_boat_board", x0, 19.6, zc - 5.0, x1, 24.4, zc + 5.0,
                      top="black", bottom="black", **kw),
                  box("wake_boat_board", x0, 20.2, zc - 6.0, x1, 23.8, zc - 5.0,
                      top="black", bottom="black", fore="black"),
                  box("wake_boat_board", x0, 20.2, zc + 5.0, x1, 23.8, zc + 6.0,
                      top="black", bottom="black", aft="black"),
                  box("black", x0 - 0.1, 20.8, zc - 6.3, x1 + 0.1, 23.2, zc - 6.0),
                  box("black", x0 - 0.1, 20.8, zc + 6.0, x1 + 0.1, 23.2, zc + 6.3)]
        cubes += [box("black", s * (x - 0.6), 20.4, z - 0.5, s * x, 23.6, z + 0.5)]  # clamp
    return cubes


def stern():
    S = STERN
    cubes = [
        box("wake_boat_mat", -12.0, 4.6, S - 0.2, 12.0, 5.6, S + 5.4),          # swim platform
        box("black", -12.1, 4.4, S + 5.0, 12.1, 5.7, S + 5.6),
        box("white", -5.2, 6.4, S, 5.2, 10.6, S + 0.12, aft="wake_boat_indi"),
        box("steel", -10.4, 2.0, S + 4.0, -10.1, 4.6, S + 4.3),                  # ladder
        box("steel", -8.6, 2.0, S + 4.0, -8.3, 4.6, S + 4.3),
        box("steel", -10.4, 3.0, S + 4.0, -8.3, 3.3, S + 4.5),
        box("gunmetal", -11.2, 3.0, S - 0.2, -7.0, 3.4, S + 2.2),                # surf tabs
        box("gunmetal", 7.0, 3.0, S - 0.2, 11.2, 3.4, S + 2.2),
        box("chrome", -7.0, 5.8, S, -5.6, 6.3, S + 0.3),                         # exhausts
        box("chrome", 5.6, 5.8, S, 7.0, 6.3, S + 0.3),
        box("black", -9.0, 11.4, S, -6.0, 12.6, S + 0.12),                       # stern lights
        box("headlight", -8.6, 11.7, S + 0.05, -6.4, 12.3, S + 0.15),
    ]
    # inboard running gear under the hull: shaft, strut, rudder
    cubes += [bar("steel", (0, 0.2, 8.0), (0, -1.6, 19.4), 0.6),
              box("gunmetal", -0.3, -2.2, 16.0, 0.3, 0.2, 17.0),
              box("gunmetal", -0.3, -4.2, 21.4, 0.3, 0.2, 23.6),
              box("matte_black", -2.5, -0.1, 3.0, 2.5, 0.0, 7.0)]                 # wake plate
    return cubes


def prop():
    hub = (0, -1.7, 19.6)
    cubes = [box("chrome", -0.5, hub[1] - 0.5, 19.0, 0.5, hub[1] + 0.5, 20.4)]
    for k in range(4):
        cubes.append(box("chrome", -0.6, hub[1] + 0.3, 19.5, 0.6, hub[1] + 2.4, 19.8,
                         rotation=(0, 0, 90 * k + 20), pivot=hub))
    return {"name": "prop", "parent": "root", "pivot": list(hub), "cubes": cubes}


def build():
    return [
        {"name": "root", "pivot": [0, 0, STERN]},
        {"name": "hull", "parent": "root", "pivot": [0, 0, 0],
         "cubes": HULL.cubes() + bow() + consoles() + rear_seating() + stern()},
        {"name": "tower", "parent": "root", "pivot": [0, 13, 2], "cubes": tower()},
        steering_wheel("wheel", (-7.0, 13.0, -3.4), radius=2.0, tilt=-28),
        *windshield(),
        prop(),
    ]
