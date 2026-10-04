"""Jet ski: a sit-down personal watercraft in lime and black.

LUNA is across the back of the seat pedestal, INDI on the stern under the
reboarding deck, both read from behind the ski.
"""
import math

from artkit import (Hull, box, mirrored, cylinder, bar, decal, material, paint,
                    mix, rgb, glint, scale, noise, _face)

INFO = {
    "id": "jet_ski", "name": "Jet Ski", "kind": "Personal watercraft",
    "group": "Small", "mode": "water", "length": 2,
    "specs": [("Length", "2 blocks"), ("Seats", "2"), ("Drive", "Water jet")],
    "seats": [(0, 11.4, 0.5), (0, 11.9, 6.8)],
    "collision": (1.0, 0.8), "health": 6,
    "speed": 0.42, "water_drag": 0.22,
    "recipe": {"shapeless": ["minecraft:birch_boat", "minecraft:lime_dye",
                             "minecraft:copper_ingot"]},
    "recipe_text": "Birch Boat + Lime Dye + Copper",
    "spawn_egg": ("#8BE02C", "#1A1C20"),
    "anim": [
        {"bone": "root", "type": "lift", "k": 1.0, "max": 6},
        {"bone": "root", "type": "turn", "axis": "z", "k": 0.08, "max": 12},
        {"bone": "bars", "type": "turn", "axis": "y", "k": 0.15, "max": 20},
        {"bone": "impeller", "type": "spin", "axis": "z", "idle": 90, "ridden": 360,
         "per_speed": 2200},
    ],
    "eggs": "LUNA across the back of the seat, INDI on the stern above the jet nozzle",
    "egg_cam": {"eye": [-9, 15, 46], "at": [0, 7.5, 12]},
}

STERN = 12
HULL = Hull(bow_tip=-18, bow_start=-5, stern=STERN, beam=6.2, deck=6.6, sheer=1.6, rise=4.2,
            cockpit=(-6, 11), floor=5.6, waterline=3.6, topsides="white",
            bottom="jet_ski_graphite", boot="jet_ski_lime", accent="jet_ski_lime",
            foredeck="jet_ski_flat", deck_top="jet_ski_flat", cockpit_floor="jet_ski_mat",
            rail="rubber", bow_step=0.5, run_step=1)


def _lime(u, v):
    c = mix(rgb("#B6F23F"), rgb("#4C8E12"), v ** 1.2)
    return scale(mix(c, (255, 255, 255), glint(v, 0.15, 0.05, 0.55)), noise(0.02))


def _graphite(u, v):
    c = mix(rgb("#4A4F57"), rgb("#16181C"), v ** 1.2)
    return scale(mix(c, (200, 205, 215), glint(v, 0.2, 0.06, 0.3)), noise(0.02))


def _mat(u, v):
    """Black foam deck mat with lime grooves, a tile."""
    if (v * 64) % 3 < 0.5:
        return rgb("#5E9E1E")
    return scale(rgb("#1E2024"), noise(0.08))


def _seat(u, v):
    """Black marine vinyl with a lime welt, tile."""
    if (v * 64) % 8 < 0.7:
        return rgb("#7BC72A")
    c = mix(rgb("#34373C"), rgb("#18191C"), ((v * 64) % 8) / 8)
    return scale(c, noise(0.04))


def _graphic(u, v):
    """Side graphic for the pedestal: lime with black and white slashes."""
    c = _lime(u, v)
    s = u * 1.4 - v
    if 0.15 < s < 0.32:
        return mix(rgb("#1B1D21"), rgb("#2E3238"), v)
    if 0.36 < s < 0.42:
        return rgb("#F6F6F2")
    return c


material("jet_ski_lime", _lime)
material("jet_ski_graphite", _graphite)
material("jet_ski_mat", _mat, "tile")
material("jet_ski_seat", _seat, "tile")
material("jet_ski_graphic", _graphic)
material("jet_ski_flat", lambda u, v: scale(rgb("#94DA34"), noise(0.03)))
paint("jet_ski_black", "#383C44", "#0E0F12", gloss=0.5)
decal("jet_ski_luna", "LUNA", "#F7F7F2", "jet_ski_black", box=(0.1, 0.18, 0.8, 0.48),
      underline="#8BE02C")
decal("jet_ski_indi", "INDI", "#16181C", "white", box=(0.12, 0.16, 0.76, 0.46),
      underline="#6DB81E")


def only(cube, face, mat):
    """Paint just one face of a cube with another material."""
    cube["uv"][face] = _face(mat, 0, 0)
    return cube


def _hood_top(z):
    t = min(1.0, max(0.0, (z + 16.5) / 11.0))         # 0 at the nose, 1 at the pod
    return HULL.deck_height(z) + 0.6 + 5.4 * (1 - (1 - t) ** 1.8), t


def _hood_w(z):
    _, t = _hood_top(z)
    return max(0.6, min(HULL.half_width(z) - 0.8, 4.4 - 0.6 * t))


def hood():
    """The front cowl: sliced, then skinned with tilted panels so it reads smooth."""
    h = HULL
    cubes = []
    z = -16.5
    while z < -3.5:
        z1 = z + 0.5
        zm = z + 0.25
        top, t = _hood_top(zm)
        w = _hood_w(zm)
        cubes.append(box("jet_ski_lime", -w, h.deck_height(zm) - 0.3, z, w, top - 0.2, z1,
                         band=(5, 13), top="jet_ski_flat"))
        z = z1
    w = _hood_w(-9)                                   # side air intakes
    cubes += mirrored("jet_ski_black", w - 0.1, w + 0.15, 8.6, -11.5, 9.6, -6.5,
                      rotation=(14, 0, 0))
    cubes += mirrored("gunmetal", w - 0.1, w + 0.2, 8.9, -11.0, 9.1, -7.0, rotation=(14, 0, 0))
    # skin panels over the stepped top, with a black centre spine
    zs = [-16.6, -15.2, -13.6, -11.8, -9.8, -7.6, -5.4, -3.5]
    for za, zb in zip(zs, zs[1:]):
        ya, _ = _hood_top(za)
        yb, _ = _hood_top(zb)
        zm, ym = (za + zb) / 2, (ya + yb) / 2
        length = ((zb - za) ** 2 + (yb - ya) ** 2) ** 0.5 + 0.15
        pitch = math.degrees(math.atan2(yb - ya, zb - za))
        w = _hood_w(zm) + 0.05
        cubes.append(box("jet_ski_flat", -w, ym - 0.35, zm - length / 2, w, ym + 0.05,
                         zm + length / 2, rotation=(pitch, 0, 0), pivot=(0, ym, zm),
                         sides="jet_ski_lime"))
        if zm > -14:
            cubes.append(box("jet_ski_black", -1.1, ym + 0.05, zm - length / 2, 1.1, ym + 0.3,
                             zm + length / 2, rotation=(pitch, 0, 0), pivot=(0, ym, zm)))
    cubes.append(box("rubber", -1.2, h.deck_height(-17.5) - 1.0, -18.3, 1.2,
                     h.deck_height(-17.5) + 0.4, -16.8))                   # bow bumper
    cubes.append(box("chrome", -0.3, h.deck_height(-15) + 0.5, -15.6, 0.3,
                     h.deck_height(-15) + 1.2, -14.6))                     # bow eye
    return cubes


def pod():
    """Steering pod, gauge and mirrors on top of the hood."""
    cubes = [
        box("jet_ski_black", -2.6, 11.6, -6.6, 2.6, 13.0, -3.8, top="jet_ski_black"),
        box("screen", -1.6, 12.3, -3.85, 1.6, 12.9, -3.75),
        box("amber", -2.3, 12.4, -3.85, -1.9, 12.7, -3.75),
        box("nav_green", 1.9, 12.4, -3.85, 2.3, 12.7, -3.75),
    ]
    for s in (1, -1):                                 # mirrors on stalks
        cubes.append(bar("jet_ski_black", (s * 3.0, 11.6, -6.0), (s * 4.6, 12.8, -6.4), 0.4))
        cubes.append(box("jet_ski_black", s * 4.2, 12.6, -6.9, s * 5.8, 13.8, -6.3))
        cubes.append(box("chrome", s * 4.35, 12.75, -6.32, s * 5.65, 13.65, -6.2))
    return cubes


def bars():
    """Handlebars in their own bone so they can steer."""
    y, z = 13.6, -4.6
    cubes = [
        box("gunmetal", -0.6, 12.8, z - 0.6, 0.6, y, z + 0.6),            # post
        box("jet_ski_black", -1.4, y - 0.2, z - 0.8, 1.4, y + 0.8, z + 0.8),  # bar pad
        box("chrome", -4.6, y + 0.05, z - 0.25, 4.6, y + 0.55, z + 0.25),     # bar
    ]
    for s in (1, -1):
        cubes += cylinder("rubber", (s * 4.4, y + 0.3, z), 0.5, 2.0, "x", 2)    # grips
        cubes.append(box("jet_ski_lime", s * 3.1, y + 0.1, z - 0.5, s * 3.4, y + 0.5, z + 0.5))
        cubes.append(box("jet_ski_black", s * 3.2, y - 0.3, z - 1.4, s * 3.9, y + 0.2, z - 0.3))
    cubes.append(box("jet_ski_lime", 3.4, y - 0.5, z + 0.3, 4.0, y + 0.2, z + 0.8))  # throttle
    return {"name": "bars", "parent": "root", "pivot": [0, 12.8, z], "cubes": cubes}


def windscreen():
    base, z = 12.6, -6.4
    pivot = [0, base, z]
    return {"name": "glass_screen", "parent": "root", "pivot": pivot, "rotation": [-35, 0, 0],
            "cubes": [box("tinted_glass", -2.6, base, z - 0.2, 2.6, base + 2.4, z)]}


def seat():
    cubes = []
    # pedestal under the seat, with the side graphic
    cubes.append(box("jet_ski_lime", -3.0, 5.6, -3.6, 3.0, 9.2, 10.4, sides="jet_ski_graphic",
                     aft="jet_ski_black"))
    cubes.append(only(box("jet_ski_black", -2.6, 6.8, 10.4, 2.6, 9.0, 10.5), "south",
                      "jet_ski_luna"))
    cubes.append(box("jet_ski_black", -3.15, 8.9, -3.6, 3.15, 9.4, 10.6))   # seat base trim
    # two-step saddle: driver, then passenger a little higher
    cubes.append(box("jet_ski_seat", -2.8, 9.4, -3.4, 2.8, 11.4, 4.2))
    cubes.append(box("jet_ski_seat", -2.8, 9.4, 4.2, 2.8, 11.9, 10.0))
    cubes += mirrored("jet_ski_seat", 2.8, 3.1, 9.4, -3.0, 10.8, 9.6)     # rolled edges
    cubes.append(box("jet_ski_seat", -2.4, 9.4, 10.0, 2.4, 11.5, 10.5))
    cubes.append(box("jet_ski_seat", -2.0, 11.4, 3.4, 2.0, 11.9, 4.2))    # step
    # grab strap across the passenger seat and rear grab handle
    cubes.append(box("jet_ski_black", -3.2, 11.0, 6.4, 3.2, 12.15, 7.0))
    cubes += mirrored("chrome", 2.0, 2.4, 9.4, 10.5, 10.8, 10.9)
    cubes.append(box("chrome", -2.4, 10.8, 10.5, 2.4, 11.2, 10.9))
    return cubes


def stern():
    S = STERN
    h = HULL
    d = h.deck_height(S)
    cubes = [
        box("jet_ski_mat", -5.2, d - 0.5, S - 0.2, 5.2, d - 0.2, S + 2.4),   # reboarding deck
        box("white", -5.2, d - 2.4, S, 5.2, d - 0.5, S + 2.4, top="white"),
        only(box("white", -2.2, d - 2.3, S + 2.4, 2.2, d - 0.6, S + 2.5), "south",
             "jet_ski_indi"),
        box("rubber", -5.4, d - 0.6, S + 2.3, 5.4, d - 0.1, S + 2.7),
        box("chrome", -0.5, d - 0.2, S + 0.2, 0.5, d + 0.8, S + 1.0),       # tow hook
        box("chrome", -0.15, d - 0.2, S + 0.35, 0.15, d + 0.4, S + 0.85),
    ]
    # boarding step that folds down off the deck
    cubes += [box("chrome", 4.4, d - 3.6, S + 2.4, 4.7, d - 0.5, S + 2.7),
              box("chrome", 2.8, d - 3.6, S + 2.4, 3.1, d - 0.5, S + 2.7),
              box("jet_ski_black", 2.7, d - 3.8, S + 2.2, 4.8, d - 3.4, S + 3.4)]
    # sponsons along the back of each side
    for s in (1, -1):
        w = h.half_width(S - 3)
        cubes.append(box("jet_ski_graphite", s * (w - 0.2), 3.0, S - 9, s * (w + 0.6), 4.0, S - 1))
    # ride plate and the jet nozzle
    cubes.append(box("gunmetal", -2.6, -0.2, S - 4, 2.6, 0.3, S + 1.2))
    cubes.append(box("matte_black", -1.8, -0.15, S - 12, 1.8, 0.2, S - 7))   # intake grate
    cubes += cylinder("gunmetal", (0, 2.1, S + 1.6), 1.6, 3.2, "z", 4)      # pump housing
    cubes += cylinder("steel", (0, 2.1, S + 3.6), 1.15, 1.2, "z", 4)         # steering nozzle
    cubes += cylinder("matte_black", (0, 2.1, S + 3.9), 0.75, 0.9, "z", 4)    # bore
    cubes.append(box("steel", -1.4, 3.0, S + 3.0, 1.4, 3.3, S + 4.4))       # trim ring
    return cubes


def impeller():
    hub = (0, 2.1, STERN + 4.2)
    cubes = [box("chrome", -0.25, 1.85, hub[2] - 0.3, 0.25, 2.35, hub[2] + 0.3)]
    for k in range(4):
        cubes.append(box("steel", -0.12, 2.1, hub[2] - 0.15, 0.12, 2.75, hub[2] + 0.15,
                         rotation=(0, 0, 90 * k + 20), pivot=hub))
    return {"name": "impeller", "parent": "root", "pivot": list(hub), "cubes": cubes}


def build():
    return [
        {"name": "root", "pivot": [0, 0, STERN]},
        {"name": "hull", "parent": "root", "pivot": [0, 0, 0],
         "cubes": HULL.cubes() + hood() + pod() + seat() + stern()},
        bars(),
        windscreen(),
        impeller(),
    ]
