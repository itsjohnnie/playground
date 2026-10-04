"""Center console: an Atlantic-blue fishing boat with a T-top and twin outboards.

LUNA and INDI are on the backs of the two outboard cowlings (LUNA on the
left one seen from behind, INDI on the right).
"""

from artkit import (Hull, box, mirrored, cylinder, bar, decal, material, paint, steering_wheel,
                    mix, rgb, glint, scale, noise)

INFO = {
    "id": "center_console", "name": "Center Console", "kind": "Fishing boat",
    "group": "Water", "mode": "water", "length": 4,
    "specs": [("Length", "4 blocks"), ("Beam", "1½ blocks"), ("Seats", "4"),
              ("Motors", "Twin outboards")],
    "seats": [(0, 11.8, 5.2), (0, 9.4, -10.2), (4.6, 9.6, -19.5), (-4.6, 9.6, -19.5)],
    "collision": (1.8, 1.2), "health": 12,
    "speed": 0.36, "water_drag": 0.25,
    "recipe": {"shapeless": ["minecraft:spruce_boat", "minecraft:fishing_rod",
                             "minecraft:iron_ingot", "minecraft:blue_dye"]},
    "recipe_text": "Spruce Boat + Fishing Rod + Iron + Blue Dye",
    "spawn_egg": ("#2F7FC4", "#F2F2EE"),
    "anim": [
        {"bone": "root", "type": "lift", "k": 0.8, "max": 6},
        {"bone": "prop_l", "type": "spin", "axis": "z", "idle": 0, "ridden": 0, "per_speed": 1500},
        {"bone": "prop_r", "type": "spin", "axis": "z", "idle": 0, "ridden": 0, "per_speed": -1500},
    ],
    "eggs": "LUNA on the backs of both outboards",
    "egg_cam": {"eye": [-10, 22, 84], "at": [0, 11, 30]},
}

STERN = 27
NS = "center_console_nonskid"
FLOOR = 6
HULL = Hull(bow_tip=-33, bow_start=-9, stern=STERN, beam=11.5, deck=11, sheer=3.5, rise=7,
            cockpit=(-27, 23), floor=FLOOR, waterline=4, topsides="center_console_blue",
            bottom="center_console_bottom", boot="navy", accent="white",
            foredeck="deck", cockpit_floor="center_console_nonskid", deck_top="deck",
            rail="center_console_rubrail", bow_step=0.5, run_step=2)


def _blue(u, v):
    c = mix(rgb("#4FA3E3"), rgb("#174A80"), v ** 1.25)
    return scale(mix(c, (255, 255, 255), glint(v, 0.14, 0.05, 0.6)), noise(0.02))


def _bottom(u, v):
    return scale(mix(rgb("#F2F2EE"), rgb("#B5BAC0"), v), noise(0.02))


def _rubrail(u, v):
    if 0.4 < v < 0.62:
        return mix(rgb("#F4F7FA"), rgb("#8E979F"), (v - 0.4) / 0.22)
    return scale(rgb("#ECECE8"), noise(0.02))


def _cowl(u, v):
    """White outboard cowling with a blue wrap and a silver band."""
    c = mix(rgb("#FBFBF8"), rgb("#C9CDD0"), v ** 1.4)
    c = mix(c, (255, 255, 255), glint(v, 0.14, 0.05, 0.5))
    if v > 0.74:
        c = mix(rgb("#2F7FC4"), rgb("#163E6B"), (v - 0.74) / 0.26)
    elif 0.68 < v < 0.72:
        c = rgb("#9AA3AC")
    return scale(c, noise(0.02))


def _canvas(u, v):
    """Navy acrylic canvas under the T-top, a tile."""
    return scale(rgb("#25365C") if (v * 64) % 6 > 0.5 else rgb("#1B2846"), noise(0.06))


material("center_console_blue", _blue)
material("center_console_bottom", _bottom)
material("center_console_rubrail", _rubrail)
material("center_console_cowl", _cowl)
material("center_console_canvas", _canvas, "tile")
material("center_console_nonskid",
         lambda u, v: scale(rgb("#E2E4E1") if (u * 64 + v * 64) % 4 > 0.6 else rgb("#D2D5D2"),
                            noise(0.05)), "tile")
paint("center_console_white", "#FFFFFF", "#D2D5D6", gloss=0.6)
decal("center_console_luna", "LUNA", "#163E6B", "center_console_cowl",
      box=(0.1, 0.14, 0.8, 0.34), underline="#2F7FC4")
decal("center_console_indi", "LUNA", "#163E6B", "center_console_cowl",
      box=(0.1, 0.14, 0.8, 0.34), underline="#2F7FC4")


def bow():
    """Bow rail, cleats, anchor roller, nav lights and the U-shaped bow seating."""
    h = HULL
    cubes = []
    for z in range(-31, -9):
        zm = z + 0.5
        x, y = h.half_width(zm) - 1.0, h.deck_height(zm) + 2.6
        if x < 0.8:
            continue
        cubes += mirrored("steel", x - 0.35, x, y, z, y + 0.35, z + 1)
        if z % 5 == 0:
            cubes += mirrored("steel", x - 0.3, x - 0.05, h.deck_height(zm), zm - 0.15,
                              y, zm + 0.15)
    d = h.deck_height(-30)
    cubes += [box("steel", -0.6, d - 0.2, -34.5, 0.6, d + 0.5, -29),           # anchor roller
              box("gunmetal", -0.4, d - 1.0, -34.6, 0.4, d - 0.2, -33.6),
              box("nav_red", 1.0, d, -28.5, 2.0, d + 0.8, -27.5),
              box("nav_green", -2.0, d, -28.5, -1.0, d + 0.8, -27.5),
              box(NS, -2.5, d - 0.3, -32, 2.5, d + 0.05, -28.5)]            # anchor hatch
    for z in (-24, -6, 14):                                                     # cleats
        x, dd = h.half_width(z) - 0.8, h.deck_height(z)
        cubes += mirrored("steel", x - 0.3, x + 0.3, dd, z - 1.0, dd + 0.6, z + 1.0)
    # U-shaped bow seating against the inside of the hull
    f = FLOOR + 0.3
    for z in range(-26, -13):
        zm = z + 0.5
        wi = h.half_width(zm) - 1.5
        if wi < 3:
            continue
        cubes += mirrored("center_console_white", wi - 3.2, wi, f, z, f + 2.2, z + 1)
        cubes += mirrored("vinyl", wi - 3.0, wi, f + 2.2, z, f + 3.4, z + 1)
        cubes += mirrored("vinyl", wi - 0.9, wi, f + 3.4, z, h.deck_height(zm) - 0.4, z + 1)
    wi = h.half_width(-26) - 1.5
    cubes.append(box("center_console_white", -wi, f, -27, wi, f + 2.2, -25.5))
    cubes.append(box("vinyl", -wi, f + 2.2, -27, wi, f + 3.4, -25.5))
    cubes.append(box("vinyl", -wi + 0.5, f + 3.4, -27.2, wi - 0.5, h.deck_height(-27) - 0.4, -26.2))
    cubes.append(box("gunmetal", -2.4, f, -24, 2.4, f + 0.15, -16))  # fish box lid
    cubes.append(box("steel", -0.8, f + 0.15, -16.6, 0.8, f + 0.4, -16.2))
    return cubes


def console():
    f = FLOOR + 0.3
    W = "center_console_white"
    cubes = [
        box(W, -4.4, f, -7.5, 4.4, 14.5, 1.5, top=W),                         # console body
        box("navy", -4.45, f, -7.55, 4.45, f + 0.6, 1.55),                    # toe kick
        # sloped dash
        box(W, -4.2, 13.8, -6.2, 4.2, 15.6, 0.6, rotation=(16, 0, 0), pivot=(0, 14.5, 0.6)),
        box("black", -3.6, 15.2, -5.5, 3.6, 15.9, -0.6, rotation=(16, 0, 0),
            pivot=(0, 14.5, 0.6)),
        box("screen", -3.4, 15.9, -4.4, -0.2, 16.05, -1.4, rotation=(16, 0, 0),
            pivot=(0, 14.5, 0.6)),
        box("screen", 0.2, 15.9, -4.4, 3.4, 16.05, -1.4, rotation=(16, 0, 0),
            pivot=(0, 14.5, 0.6)),
        box("black", -0.6, 15.3, -6.6, 0.6, 17.0, -5.4),                       # compass
        box("glass", -0.45, 16.8, -6.45, 0.45, 17.3, -5.55),
        # throttles on the port side
        box("chrome", 3.0, 14.4, 1.5, 4.0, 14.9, 2.6),
        bar("black", (3.2, 14.6, 2.0), (3.2, 16.6, 1.0), 0.3),
        bar("black", (3.8, 14.6, 2.0), (3.8, 16.6, 1.0), 0.3),
        box("black", 3.0, 16.4, 0.6, 4.0, 16.9, 1.2),
        # switch panel and cup holders
        box("black", -4.1, 10.8, 1.5, -2.5, 13.4, 1.6),
        box("amber", -3.7, 12.4, 1.6, -3.3, 12.8, 1.65),
        box("nav_green", -3.1, 12.4, 1.6, -2.7, 12.8, 1.65),
        box("gunmetal", -0.7, 12.4, 1.5, 0.7, 13.8, 2.3),                      # helm pod
        box("steel", 1.0, 13.0, 1.5, 2.2, 13.6, 1.7),
        # forward console seat with a backrest on the console front
        box(W, -3.8, f, -11.4, 3.8, f + 1.8, -7.5),
        box("vinyl", -3.6, f + 1.8, -11.2, 3.6, f + 3.1, -7.5),
        box("vinyl", -3.4, f + 3.1, -8.4, 3.4, 13.6, -7.5, rotation=(-6, 0, 0),
            pivot=(0, f + 3.1, -7.5)),
        box("steel", -4.2, 14.0, -8.0, 4.2, 14.4, -7.6),                       # grab rail
    ]
    cubes += mirrored("steel", 4.0, 4.4, 12.0, -7.8, 14.4, -7.4)
    cubes += mirrored("steel", 4.4, 4.8, 9.0, -6.4, 14.0, -2.0)  # side grab rails
    cubes += mirrored("steel", 4.4, 4.8, 9.0, -6.4, 9.4, -2.0)
    return cubes


def glass():
    """Wrap-around console windshield."""
    base, z = 14.6, -6.6
    cubes = [box("tinted_glass", -4.0, base, z - 0.25, 4.0, base + 4.0, z)]
    bones = [{"name": "glass_front", "parent": "root", "pivot": [0, base, z],
              "rotation": [-25, 0, 0], "cubes": cubes}]
    for s, side in ((1, "l"), (-1, "r")):
        bones.append({"name": f"glass_{side}", "parent": "root", "pivot": [s * 4.0, base, z],
                      "rotation": [0, 28 * s, 0],
                      "cubes": [box("tinted_glass", s * 4.0, base, z, s * 4.25, base + 3.0,
                                    z + 3.2)]})
    return bones


def t_top():
    W = "center_console_white"
    cubes = []
    top = 29
    for s in (1, -1):
        cubes.append(bar("aluminium", (s * 4.6, FLOOR + 0.3, -6.5), (s * 5.8, top, -7.5), 0.7))
        cubes.append(bar("aluminium", (s * 4.6, FLOOR + 0.3, 1.0), (s * 5.8, top, 3.0), 0.7))
        cubes.append(bar("aluminium", (s * 5.8, top - 0.3, -7.5), (s * 5.8, top - 0.3, 3.0), 0.6))
        cubes.append(bar("aluminium", (s * 4.7, 14.8, -5.6), (s * 4.7, 14.8, 0.6), 0.5))
    cubes.append(box("aluminium", -6.2, top - 0.6, -7.8, 6.2, top, -7.2))
    cubes.append(box("aluminium", -6.2, top - 0.6, 2.8, 6.2, top, 3.4))
    # the hardtop: white glassfibre, navy canvas underneath, rounded edges
    cubes += [
        box(W, -8.0, top, -11.0, 8.0, top + 1.2, 6.0, bottom="center_console_canvas"),
        box(W, -7.4, top + 1.2, -10.4, 7.4, top + 1.7, 5.4),
        box("center_console_blue", -8.05, top + 0.2, -11.05, 8.05, top + 0.55, 6.05),
        box("headlight", -1.5, top - 0.15, -9.5, 1.5, top, -8.5),             # spreader light
    ]
    # radar dome and VHF antennas
    cubes += cylinder(W, (0, top + 2.6, -3.0), 2.4, 1.8, "y", 4)
    cubes += cylinder("center_console_white", (0, top + 3.6, -3.0), 1.6, 0.6, "y", 4)
    for s in (1, -1):
        cubes.append(box("steel", s * 6.6, top + 1.2, 3.8, s * 7.4, top + 2.0, 4.6))
        cubes.append(box(W, s * 6.85, top + 2.0, 4.05, s * 7.15, top + 11.0, 4.35))
    # rocket launcher rod holders across the back of the T-top, with rods
    for k in range(5):
        x = -5 + k * 2.5
        cubes.append(bar("steel", (x, top - 0.6, 3.1), (x, top + 3.0, 5.4), 0.45))
        cubes.append(bar("black", (x, top + 2.8, 5.3), (x, top + 12.0, 10.0), 0.22))
        cubes.append(box("gunmetal", x - 0.35, top + 3.3, 5.2, x + 0.35, top + 4.2, 6.0,
                         rotation=(60, 0, 0)))
    return cubes


def leaning_post():
    f = FLOOR + 0.3
    W = "center_console_white"
    cubes = [
        box(W, -4.2, f, 3.0, 4.2, f + 3.6, 8.6, top=NS),                  # cooler
        box("steel", -1.4, f + 2.6, 2.9, 1.4, f + 3.0, 3.0),                   # cooler latch
        box("vinyl", -4.0, 10.2, 3.6, 4.0, 11.8, 6.8),                         # bolster seat
        box("center_console_blue", -4.1, 9.9, 3.5, 4.1, 10.2, 6.9),
        box("vinyl", -3.8, 11.0, 7.2, 3.8, 16.2, 8.4, rotation=(-8, 0, 0),
            pivot=(0, 11.0, 8.4)),
        box("center_console_blue", -3.9, 10.6, 7.6, 3.9, 11.2, 8.6),
    ]
    for s in (1, -1):
        cubes.append(bar("aluminium", (s * 4.2, f + 3.6, 4.0), (s * 4.2, 11.2, 4.0), 0.6))
        cubes.append(bar("aluminium", (s * 4.2, f + 3.6, 8.0), (s * 4.2, 17.0, 8.6), 0.6))
        cubes.append(bar("aluminium", (s * 4.2, 13.0, 3.6), (s * 4.2, 13.0, 8.4), 0.5))
    cubes.append(bar("aluminium", (-4.2, 17.0, 8.6), (4.2, 17.0, 8.6), 0.6))
    for k in range(4):                                                        # rod holders
        x = -3.3 + k * 2.2
        cubes.append(bar("steel", (x, 16.8, 8.6), (x, 18.6, 9.6), 0.45))
    return cubes


def gunwales():
    """Flush rod holders, rear bench and transom details."""
    h = HULL
    cubes = []
    for z in (6, 10, 14):
        x, d = h.half_width(z) - 0.75, h.deck_height(z)
        cubes += mirrored("steel", x - 0.4, x + 0.4, d - 0.05, z - 0.4, d + 0.25, z + 0.4)
        cubes += mirrored("black", x - 0.2, x + 0.2, d + 0.1, z - 0.2, d + 0.3, z + 0.2)
    f = FLOOR + 0.3
    cubes += [
        box("center_console_white", -9.4, f, 20.4, 9.4, f + 2.6, 23.0),         # fold-down bench
        box("vinyl", -9.2, f + 2.6, 20.4, 9.2, f + 3.6, 22.8),
        box("vinyl", -9.2, f + 3.6, 22.4, 9.2, 10.6, 23.0),
        box(NS, -4.0, 11.0, 24.0, 4.0, 11.15, 26.4),                        # livewell lid
        box("steel", -0.6, 11.15, 24.2, 0.6, 11.35, 24.6),
    ]
    return cubes


def outboard(name, x, word):
    """One big outboard on the transom, with its own spinning prop bone."""
    S = STERN
    cubes = [
        box("gunmetal", x - 1.6, 4.0, S - 0.2, x + 1.6, 10.6, S + 1.6),           # bracket
        box("black", x - 1.4, -0.8, S + 2.0, x + 1.4, 9.6, S + 4.8),              # midsection
        box("center_console_white", x - 1.5, 6.2, S + 1.6, x + 1.5, 9.6, S + 5.4),
        box("steel", x - 2.6, 0.8, S + 1.4, x + 2.6, 1.2, S + 6.4),               # cavitation plate
        box("center_console_white", x - 1.2, -3.0, S + 1.6, x + 1.2, 0.8, S + 6.4),  # gearcase
        box("center_console_white", x - 0.3, -4.8, S + 4.0, x + 0.3, -3.0, S + 6.2),  # skeg
        box("center_console_cowl", x - 3.0, 9.6, S + 0.8, x + 3.0, 16.2, S + 8.0,
            top="center_console_white", aft=f"center_console_{word}"),
        box("center_console_white", x - 2.7, 16.2, S + 1.2, x + 2.7, 17.1, S + 7.6),
        box("center_console_white", x - 2.0, 17.1, S + 2.0, x + 2.0, 17.6, S + 6.6),
        box("black", x - 3.05, 13.4, S + 3.2, x + 3.05, 14.4, S + 6.0),           # cowl vents
        box("steel", x - 3.05, 9.6, S + 7.6, x + 3.05, 10.0, S + 8.05),
    ]
    hub = (x, -1.1, S + 6.8)
    prop = [box("steel", x - 0.5, hub[1] - 0.5, S + 6.4, x + 0.5, hub[1] + 0.5, S + 7.9)]
    for k in range(3):
        prop.append(box("steel", x - 0.6, hub[1] + 0.3, S + 6.9, x + 0.6, hub[1] + 2.9,
                        S + 7.2, rotation=(0, 0, 120 * k + 15), pivot=(x, hub[1], S + 7.05)))
    return [{"name": f"motor_{name}", "parent": "root", "pivot": [x, 10, S], "cubes": cubes},
            {"name": f"prop_{name}", "parent": f"motor_{name}", "pivot": list(hub),
             "cubes": prop}]


def transom():
    S = STERN
    return [
        box(NS, -11.0, 4.6, S, -7.4, 5.4, S + 3.0),                         # swim steps
        box(NS, 7.4, 4.6, S, 11.0, 5.4, S + 3.0),
        box("steel", -10.4, 2.0, S + 2.4, -10.1, 5.0, S + 2.7),                 # ladder
        box("steel", -8.6, 2.0, S + 2.4, -8.3, 5.0, S + 2.7),
        box("steel", -10.4, 3.0, S + 2.4, -8.3, 3.3, S + 2.9),
        box("center_console_white", -3.0, 11.0, S - 1.0, 3.0, 12.2, S),         # transom cap
    ]


def build():
    return [
        {"name": "root", "pivot": [0, 0, STERN]},
        {"name": "hull", "parent": "root", "pivot": [0, 0, 0],
         "cubes": HULL.cubes() + bow() + console() + leaning_post() + gunwales() + transom()},
        {"name": "t_top", "parent": "root", "pivot": [0, 29, 0], "cubes": t_top()},
        steering_wheel("wheel", (0, 13.4, 2.5), radius=2.0, tilt=-30),
        *glass(),
        *outboard("l", 5.0, "luna"),
        *outboard("r", -5.0, "indi"),
    ]
