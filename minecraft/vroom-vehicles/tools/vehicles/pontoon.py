"""Pontoon: a party tritoon with three aluminium tubes, lounges all round and a bimini.

LUNA is on the back of the outboard's cowling, INDI is the badge on the stern gate.
"""
import math

from artkit import (box, mirrored, cylinder, bar, decal, material, steering_wheel,
                    bucket_seat, MATERIALS, mix, rgb, glint, scale, noise)

INFO = {
    "id": "pontoon", "name": "Party Pontoon", "kind": "Tritoon party boat",
    "group": "Water", "mode": "water", "length": 5,
    "specs": [("Length", "5 blocks"), ("Beam", "1¾ blocks"), ("Seats", "8"),
              ("Tubes", "3 aluminium"), ("Top", "Bimini shade")],
    "seats": [(9.5, 15.4, 5.0),                                  # helm chair
              (-9.5, 15.2, -25.5), (9.5, 15.2, -25.5),           # bow lounges
              (-9.5, 15.2, -17.5), (9.5, 15.2, -17.5),
              (-9.5, 15.2, 15.0), (-9.5, 15.2, 23.0),            # stern L-lounge
              (-2.0, 15.2, 30.5)],
    "collision": (1.8, 1.2), "health": 12,
    "speed": 0.22, "water_drag": 0.3,
    "recipe": {"pattern": ["I I", "BBB", "III"],
               "key": {"I": "minecraft:iron_ingot", "B": "minecraft:white_wool"}},
    "recipe_text": "5 Iron (tubes and rails) + 3 White Wool (lounges)",
    "spawn_egg": ("#C9CED4", "#1F5E8C"),
    "anim": [
        {"bone": "root", "type": "lift", "k": 0.5, "max": 3},
        {"bone": "prop", "type": "spin", "axis": "z", "idle": 0, "ridden": 0, "per_speed": 1500},
    ],
    "eggs": "INDI on the back of the outboard and on the stern gate badge",
    "egg_cam": {"eye": [-26, 30, 100], "at": [-2, 12, 36]},
}

DECK = 10.0           # top of the deck
STERN = 37.0
FENCE_X = 13.6        # outer face of the side fences
RAIL = 20.5           # top of the fence rail


# --- materials -------------------------------------------------------------------

def _word_box(word, fw, fh, height=0.5, max_w=0.86, lift=0.0):
    """A decal box that keeps the font's shape on a fw x fh face."""
    cols = len(word) * 7 - 1
    h = height
    w = h * fh * cols / (7 * fw)
    if w > max_w:
        w = max_w
        h = w * 7 * fw / (cols * fh)
    return ((1 - w) / 2, (1 - h) / 2 - lift, w, h)


def _panel(u, v):
    """Fence infill: brushed silver with a teal and navy swoosh rising to the bow."""
    c = mix(rgb("#D9DDE1"), rgb("#9DA5AE"), v ** 1.2)
    c = scale(c, 1 + 0.03 * math.sin(v * 260))
    edge = 0.78 - 0.32 * (1 - u) ** 1.6           # swoosh climbs toward the bow (u=0)
    if edge < v < edge + 0.09:
        return rgb("#1E9CB0")
    if edge + 0.12 < v < edge + 0.3:
        return mix(rgb("#22406E"), rgb("#14284A"), (v - edge) * 2)
    if v > edge + 0.3:
        return mix(rgb("#2D3238"), rgb("#1A1D21"), v)
    return mix(c, (255, 255, 255), glint(v, 0.12, 0.05, 0.4))


def _canvas(u, v):
    """Bimini canvas: navy acrylic with seams, a tile."""
    seam = (u * 64 / 12) % 1 < 0.06
    c = rgb("#22324F") if not seam else rgb("#3A4C6E")
    weave = 1 + 0.05 * ((int(u * 128) + int(v * 128)) % 2)
    return scale(c, weave * noise(0.04))


def _floor(u, v):
    """Teak-look marine vinyl in warm grey with dark seams, a tile."""
    plank = int(v * 64 / 3)
    seam = (v * 64 / 3) % 1 < 0.14
    if seam or ((u * 64 + plank * 19) % 37) < 0.35:
        return rgb("#5E5950")
    shades = ["#A39C90", "#978F83", "#ABA497", "#8F887C"]
    base = rgb(shades[(plank * 5) % 4])
    return scale(base, (1 + 0.05 * math.sin(u * 70 + plank)) * noise(0.04))


def _cowling(u, v):
    """Pearl-white outboard cowling with a navy band and a teal pinstripe."""
    c = mix(rgb("#FBFBF8"), rgb("#C9CCCF"), v ** 1.3)
    c = mix(c, (255, 255, 255), glint(v, 0.15, 0.05, 0.6))
    if 0.68 < v < 0.84:
        return mix(rgb("#26416F"), rgb("#15274A"), (v - 0.68) / 0.16)
    if 0.86 < v < 0.89:
        return rgb("#1E9CB0")
    return c


def _accent(u, v):
    return scale(mix(rgb("#1E9CB0"), rgb("#13707F"), v), noise(0.03))


def _water_cooler(u, v):
    return mix(rgb("#3A6EA5"), rgb("#1F3F66"), v)


material("pontoon_panel", _panel)
material("pontoon_canvas", _canvas, "tile")
material("pontoon_floor", _floor, "tile")
material("pontoon_cowling", _cowling)
material("pontoon_accent", _accent)
decal("pontoon_luna", "INDI", "#1B2F57", "pontoon_cowling",
      box=_word_box("INDI", 7.6, 8.2, 0.34, lift=0.12), underline="#1E9CB0")
decal("pontoon_indi", "INDI", "#F4F6F8", "pontoon_accent",
      box=_word_box("INDI", 7.0, 4.0, 0.5, max_w=0.8))


# --- the tubes -------------------------------------------------------------------

TUBES = (-9.5, 0.0, 9.5)
R, CY = 3.8, 4.1
TUBE_FRONT, TUBE_BACK = -28.0, 34.0


def tube(x):
    cubes = cylinder("aluminium", (x, CY, (TUBE_FRONT + TUBE_BACK) / 2), R,
                     TUBE_BACK - TUBE_FRONT, "z", 6)
    segs, length = 6, 10.0
    for k in range(segs):                            # the nose cone, sweeping up
        t = (k + 0.5) / segs
        r = R * max(0.18, (1 - t ** 2.2)) ** 0.55
        cy = CY + (R - r) * 0.75
        z1 = TUBE_FRONT - k * length / segs
        cubes += cylinder("aluminium", (x, cy, z1 - length / segs / 2 + 0.05), r,
                          length / segs + 0.1, "z", 6)
    cubes += cylinder("aluminium", (x, CY + 0.3, TUBE_BACK + 0.5), R * 0.8, 1.0, "z", 6)
    cubes.append(box("gunmetal", x - 0.3, CY - R - 0.6, -24, x + 0.3, CY - R + 0.4, 30))   # keel
    for sign in (1, -1):                                                    # lifting strakes
        cubes.append(box("aluminium", x + sign * (R - 0.2), CY - 1.6, -26, x + sign * (R + 0.5),
                         CY - 1.0, 32))
    for z in range(-24, 34, 8):                                             # deck brackets
        cubes.append(box("gunmetal", x - 1.6, CY + R - 0.4, z, x + 1.6, DECK - 1.4, z + 1.2))
    return cubes


def hull():
    cubes = []
    for x in TUBES:
        cubes += tube(x)
    cubes.append(box("pontoon_floor", -14, DECK - 1.4, -37, 14, DECK, STERN,
                     sides="white", fore="white", aft="white"))               # the deck
    for z in range(-34, 36, 5):                                             # cross members
        cubes.append(box("gunmetal", -13.2, DECK - 2.3, z, 13.2, DECK - 1.4, z + 0.8))
    cubes += mirrored("black", 14, 14.45, DECK - 1.6, -37, DECK - 0.2, STERN)  # rub rail
    cubes.append(box("black", -14.45, DECK - 1.6, -37.45, 14.45, DECK - 0.2, -37))
    cubes.append(box("black", -14.45, DECK - 1.6, STERN, 14.45, DECK - 0.2, STERN + 0.45))
    cubes.append(box("aluminium", -13.4, DECK - 3.4, -32.5, 13.4, DECK - 1.4, -31.9))  # skirt
    return cubes


# --- fences, gates and rails -------------------------------------------------------

def fence_run(p0, p1, posts=True, infill="pontoon_panel", **faces):
    """A straight fence panel from p0 to p1 (x, z on the deck) with its rails."""
    (x0, z0), (x1, z1) = p0, p1
    mid = ((x0 + x1) / 2, (z0 + z1) / 2)
    length = math.hypot(x1 - x0, z1 - z0)
    yaw = math.degrees(math.atan2(x1 - x0, z1 - z0))
    rot = None if abs(math.sin(math.radians(yaw))) < 1e-6 else (0, yaw, 0)
    piv = (mid[0], DECK, mid[1]) if rot else None
    mx, mz = mid
    L = length / 2
    cubes = [
        box(infill, mx - 0.25, DECK + 1.0, mz - L, mx + 0.25, RAIL - 1.0, mz + L,
            rotation=rot, pivot=piv, **faces),
        box("aluminium", mx - 0.45, DECK, mz - L, mx + 0.45, DECK + 1.0, mz + L,
            rotation=rot, pivot=piv),
        box("aluminium", mx - 0.6, RAIL - 1.0, mz - L - 0.3, mx + 0.6, RAIL, mz + L + 0.3,
            rotation=rot, pivot=piv),
        box("black", mx - 0.65, RAIL - 0.15, mz - L - 0.3, mx + 0.65, RAIL + 0.15, mz + L + 0.3,
            rotation=rot, pivot=piv),
    ]
    if posts:
        n = max(1, int(length // 9))
        for i in range(n + 1):
            t = i / n
            px, pz = x0 + (x1 - x0) * t, z0 + (z1 - z0) * t
            cubes.append(box("aluminium", px - 0.55, DECK, pz - 0.55, px + 0.55, RAIL - 0.9,
                             pz + 0.55))
    return cubes


def fences():
    F, c = FENCE_X - 0.25, []
    # sides: one long panel each, so the swoosh runs bow to stern
    c += fence_run((F, 31), (F, -31))
    c += fence_run((-F, 31), (-F, -31))
    # rounded bow and stern corners
    for sx in (1, -1):
        c += fence_run((sx * F, -31), (sx * 9.6, -35), posts=False)
        c += fence_run((sx * F, 31), (sx * 9.6, 35), posts=False)
    # bow: panels either side of the front gate
    for sx in (1, -1):
        c += fence_run((sx * 9.6, -35), (sx * 3.6, -35))
    # stern: panel on the port side, a gate opening to starboard
    c += fence_run((-9.6, 35), (3.6, 35))
    c += fence_run((10.4, 35), (9.6, 35), posts=False)
    # front gate (closed), a lighter frame
    c.append(box("aluminium", -3.4, DECK + 0.4, -35.3, 3.4, RAIL - 1.2, -34.7, fore="pontoon_panel",
                 aft="pontoon_panel"))
    c += [box("chrome", -0.3, DECK + 7, -35.6, 0.3, DECK + 8, -35.3)]           # latch
    # the stern gate with its INDI badge
    c.append(box("aluminium", 3.8, DECK + 0.4, 34.75, 9.4, RAIL - 1.2, 35.25))
    c.append(box("pontoon_accent", 3.0, DECK + 5, 35.25, 10.0, DECK + 9, 35.5, aft="pontoon_indi"))
    # bow nav lights and the stern all-round light
    c.append(box("nav_green", 11.8, RAIL, -33.6, 12.8, RAIL + 0.9, -32.6))
    c.append(box("nav_red", -12.8, RAIL, -33.6, -11.8, RAIL + 0.9, -32.6))
    c.append(box("aluminium", -12.6, RAIL, 33.4, -12.0, RAIL + 12, 34.0))
    c.append(box("headlight", -12.9, RAIL + 12, 33.1, -11.7, RAIL + 13.2, 34.3))
    # boarding ladder at the starboard stern
    for x in (5.0, 8.0):
        c.append(box("chrome", x - 0.3, 1.0, STERN + 0.6, x + 0.3, DECK + 3.5, STERN + 1.2))
    for y in (2.0, 4.6, 7.2):
        c.append(box("teak", 4.7, y, STERN + 0.2, 8.3, y + 0.5, STERN + 1.6))
    c.append(box("chrome", 4.7, DECK + 3.2, STERN, 8.3, DECK + 3.6, STERN + 1.2))
    return c


# --- lounges ------------------------------------------------------------------------

def sofa_side(sx, z0, z1, back=True):
    """A lounge along a side fence (sx = +1 starboard/+x, -1 port)."""
    xo, xi = sx * (FENCE_X - 0.6), sx * (FENCE_X - 7.0)
    c = [
        box("white", xi, DECK, z0, xo, DECK + 3.4, z1, top="white"),                # base
        box("pontoon_accent", xi - sx * 0.05, DECK + 0.3, z0 + 0.4, xi + sx * 0.0, DECK + 0.8, z1 - 0.4),
        box("vinyl", xi - sx * 0.2, DECK + 3.4, z0 + 0.2, xo - sx * 2.4, DECK + 5.2, z1 - 0.2),
        box("pontoon_accent", xi - sx * 0.25, DECK + 3.3, z0 + 0.1, xi + sx * 0.35, DECK + 5.3, z1 - 0.1),
    ]
    if back:
        bx = sx * (FENCE_X - 0.6)
        c.append(box("vinyl", bx - sx * 2.6, DECK + 5.2, z0 + 0.2, bx, RAIL - 0.4, z1 - 0.2,
                     rotation=(0, 0, -sx * 8), pivot=(bx, DECK + 5.2, (z0 + z1) / 2)))
        c.append(box("pontoon_accent", bx - sx * 2.7, RAIL - 1.2, z0 + 0.1, bx - sx * 0.1, RAIL - 0.3,
                     z1 - 0.1, rotation=(0, 0, -sx * 8), pivot=(bx, DECK + 5.2, (z0 + z1) / 2)))
    # vertical tufting lines
    for z in range(int(z0) + 4, int(z1) - 1, 4):
        c.append(box("pontoon_accent", xi - sx * 0.25, DECK + 3.6, z - 0.15, xo - sx * 2.4, DECK + 5.25,
                     z + 0.15))
    return c


def sofa_across(x0, x1, sz):
    """A lounge along the bow (sz=-1) or stern (sz=+1) fence, facing inboard."""
    zo, zi = sz * 34.4, sz * 28.0
    c = [
        box("white", x0, DECK, min(zo, zi), x1, DECK + 3.4, max(zo, zi)),
        box("vinyl", x0 + 0.2, DECK + 3.4, min(zi, zo - sz * 2.4), x1 - 0.2, DECK + 5.2,
            max(zi, zo - sz * 2.4)),
        box("pontoon_accent", x0 + 0.1, DECK + 3.3, min(zi - sz * 0.25, zi + sz * 0.35), x1 - 0.1,
            DECK + 5.3, max(zi - sz * 0.25, zi + sz * 0.35)),
    ]
    piv = ((x0 + x1) / 2, DECK + 5.2, zo)
    c.append(box("vinyl", x0 + 0.2, DECK + 5.2, min(zo, zo - sz * 2.6), x1 - 0.2, RAIL - 0.4,
                 max(zo, zo - sz * 2.6), rotation=(sz * 8, 0, 0), pivot=piv))
    c.append(box("pontoon_accent", x0 + 0.1, RAIL - 1.2, min(zo, zo - sz * 2.7), x1 - 0.1, RAIL - 0.3,
                 max(zo, zo - sz * 2.7), rotation=(sz * 8, 0, 0), pivot=piv))
    return c


def corner_seat(sx, sz):
    """A wedge cushion tucked into a rounded corner."""
    cx, cz = sx * 10.6, sz * 31.0
    rot = (0, sx * sz * 45, 0)
    return [box("white", cx - 2.6, DECK, cz - 2.6, cx + 2.6, DECK + 3.4, cz + 2.6, rotation=rot,
                pivot=(cx, DECK, cz)),
            box("vinyl", cx - 2.4, DECK + 3.4, cz - 2.4, cx + 2.4, DECK + 5.2, cz + 2.4, rotation=rot,
                pivot=(cx, DECK, cz))]


def lounges():
    c = []
    for sx in (1, -1):
        c += sofa_side(sx, -30.4, -12.0)                    # bow lounges
        c += corner_seat(sx, -1)
    c += sofa_across(-8.4, -3.8, -1)
    c += sofa_across(3.8, 8.4, -1)
    c += sofa_side(-1, 10.0, 28.0)                          # stern L-lounge
    c += sofa_across(-8.4, 3.0, 1)
    c += corner_seat(-1, 1)
    # bow table
    c += cylinder("aluminium", (0, DECK + 3, -22), 0.6, 6, "y", 3)
    c += cylinder("teak", (0, DECK + 6.3, -22), 3.6, 0.6, "y", 6)
    c += cylinder("aluminium", (0, DECK + 0.2, -22), 2.0, 0.4, "y", 4)
    # starboard aft: a cabinet with a sink and cooler
    c.append(box("white", 6.4, DECK, 12, 13.0, DECK + 8.5, 26, top="steel"))
    c.append(box("gunmetal", 6.3, DECK + 1, 13, 6.4, DECK + 7.5, 18.5))
    c.append(box("gunmetal", 6.3, DECK + 1, 19.5, 6.4, DECK + 7.5, 25))
    c.append(box("chrome", 6.1, DECK + 4, 17.6, 6.3, DECK + 4.6, 18.2))
    c.append(box("chrome", 6.1, DECK + 4, 19.8, 6.3, DECK + 4.6, 20.4))
    c.append(box("gunmetal", 8.2, DECK + 8.4, 14, 11.6, DECK + 8.6, 17.5))      # sink
    c.append(box("chrome", 11.4, DECK + 8.5, 15.4, 11.9, DECK + 10.5, 16.0))
    c.append(box("pontoon_cowling", 8.0, DECK + 8.5, 20, 12.0, DECK + 11.5, 25, top="white"))  # cooler
    # port mid: a forward-facing chaise opposite the helm
    c += [box("white", -13.0, DECK, -6, -6.2, DECK + 3.4, 2),
          box("vinyl", -12.8, DECK + 3.4, -5.8, -6.4, DECK + 5.2, 1.8)]
    c += [box("vinyl", -12.8, DECK + 5.2, 0.2, -6.4, DECK + 11, 2.2, rotation=(-10, 0, 0),
              pivot=(-9.6, DECK + 5.2, 2.2)),
          box("pontoon_accent", -12.9, DECK + 10.2, 0.1, -6.3, DECK + 11.1, 2.3, rotation=(-10, 0, 0),
              pivot=(-9.6, DECK + 5.2, 2.2))]
    return c


# --- helm, bimini, outboard ---------------------------------------------------------

def helm():
    c = [
        box("white", 6.2, DECK, -8.5, 13.0, DECK + 9.6, -1.5),                    # console
        box("pontoon_accent", 6.1, DECK + 6.8, -8.6, 13.1, DECK + 7.4, -1.4),
        box("black", 6.4, DECK + 9.6, -8.3, 12.8, DECK + 10.4, -2.0,
            rotation=(-14, 0, 0), pivot=(9.6, DECK + 9.6, -2.0)),                 # dash
        box("screen", 7.0, DECK + 9.0, -1.6, 11.6, DECK + 11.6, -1.3,
            rotation=(-14, 0, 0), pivot=(9.3, DECK + 9.6, -1.4)),
        box("gunmetal", 11.8, DECK + 9.6, -3.0, 12.6, DECK + 11.2, -1.8),           # throttle
        box("black", 11.7, DECK + 11.2, -2.8, 12.7, DECK + 11.9, -2.0),
        box("gunmetal", 9.0, DECK + 9.4, -1.6, 9.8, DECK + 10.6, -0.6),             # column
        box("chrome", 6.1, DECK + 3.0, -1.6, 6.4, DECK + 3.6, -1.4),
    ]
    c += [box("aluminium", 9.5 - 0.8, DECK, 3.2, 9.5 + 0.8, DECK + 4.6, 4.8)]       # pedestal
    c += [box("aluminium", 9.5 - 2.5, DECK, 2.5, 9.5 + 2.5, DECK + 0.4, 5.5)]
    c += bucket_seat(6.8, 12.2, 3.0, 7.2, DECK + 3.8, cushion="vinyl", trim="pontoon_accent", back=5)
    return c


def windscreen():
    z, base = -8.4, DECK + 9.4
    pivot = [9.6, base, z]
    return [{"name": "screen_frame", "parent": "root", "pivot": pivot, "rotation": [-25, 0, 0],
             "cubes": [box("black", 6.4, base, z - 0.2, 12.8, base + 0.5, z + 0.3),
                       box("black", 6.4, base + 4.2, z - 0.2, 12.8, base + 4.6, z + 0.3)]},
            {"name": "glass_screen", "parent": "screen_frame", "pivot": pivot,
             "cubes": [box("tinted_glass", 6.6, base + 0.5, z - 0.1, 12.6, base + 4.2, z + 0.2)]}]


def bimini():
    top, z0, z1 = 33.0, -10.0, 21.0
    c = []
    for sx in (1, -1):
        x = sx * (FENCE_X - 0.4)
        for z in (-6.0, 15.0):                            # the bows of the frame
            c.append(box("chrome", x - 0.35, RAIL, z - 0.35, x + 0.35, top - 0.6, z + 0.35))
            c.append(box("aluminium", x - 0.7, RAIL - 0.3, z - 0.7, x + 0.7, RAIL + 0.6, z + 0.7))
        c.append(bar("chrome", (x, top - 2.5, -6.0), (x, RAIL, -16.0), 0.5))     # front strap
        c.append(bar("chrome", (x, top - 2.5, 15.0), (x, RAIL, 26.0), 0.5))      # rear strap
        c.append(box("chrome", x - 0.4, top - 1.0, -6.4, x + 0.4, top - 0.4, 15.4))
    c.append(box("pontoon_canvas", -14.2, top - 0.6, z0, 14.2, top + 0.2, z1))  # the canvas
    c.append(box("pontoon_canvas", -13.0, top + 0.2, z0 + 2, 13.0, top + 0.8, z1 - 2))
    c += mirrored("pontoon_canvas", 14.2, 14.6, top - 2.0, z0, top + 0.2, z1)  # side valances
    c.append(box("pontoon_canvas", -14.6, top - 2.0, z0 - 0.4, 14.6, top + 0.2, z0))
    c.append(box("pontoon_canvas", -14.6, top - 2.0, z1, 14.6, top + 0.2, z1 + 0.4))
    c += mirrored("pontoon_accent", 14.6, 14.75, top - 1.6, z0, top - 1.2, z1)  # piping
    for z in (-3.0, 5.5, 13.5):                                                 # seam rods
        c.append(box("pontoon_canvas", -13.6, top + 0.2, z - 0.3, 13.6, top + 0.5, z + 0.3))
    return c


def outboard():
    S = STERN + 0.45
    c = [
        box("gunmetal", -2.6, 3.5, S, 2.6, DECK - 0.2, S + 2.0),                      # transom pod
        box("black", -1.7, -0.5, S + 2.6, 1.7, 10.2, S + 5.4),                     # midsection
        box("chrome", -3.2, 0.8, S + 2.2, 3.2, 1.3, S + 7.2),                       # cavitation plate
        box("gunmetal", -1.3, -2.8, S + 2.2, 1.3, 0.8, S + 7.4),                    # gearcase
        box("gunmetal", -0.3, -4.6, S + 4.8, 0.3, -2.8, S + 7.2),                   # skeg
        box("pontoon_cowling", -3.8, 10.2, S + 1.4, 3.8, 18.4, S + 9.6, top="white",
            aft="pontoon_luna"),
        box("white", -3.5, 18.4, S + 1.8, 3.5, 19.4, S + 9.2),
        box("white", -2.6, 19.4, S + 2.6, 2.6, 19.9, S + 8.4),
        box("black", -3.85, 10.0, S + 1.3, 3.85, 10.6, S + 9.7),
        box("gunmetal", -1.4, 16.4, S + 0.2, 1.4, 17.6, S + 1.4),                   # steering link
    ]
    hub = (0, -1.0, S + 7.8)
    prop = [box("chrome", -0.55, hub[1] - 0.55, S + 7.2, 0.55, hub[1] + 0.55, S + 8.9)]
    for k in range(3):
        prop.append(box("chrome", -0.65, hub[1] + 0.3, S + 7.8, 0.65, hub[1] + 3.1, S + 8.2,
                        rotation=(0, 0, 120 * k + 20), pivot=(0, hub[1], S + 8.0)))
    return [{"name": "motor", "parent": "root", "pivot": [0, 10, S], "cubes": c},
            {"name": "prop", "parent": "motor", "pivot": list(hub), "cubes": prop}]


def build():
    return [
        {"name": "root", "pivot": [0, 0, STERN]},
        {"name": "hull", "parent": "root", "pivot": [0, 0, 0],
         "cubes": hull() + fences() + lounges() + helm() + bimini()},
        steering_wheel("wheel", (9.5, DECK + 11.6, -0.4), radius=2.0, tilt=-30),
        *windscreen(),
        *outboard(),
    ]
