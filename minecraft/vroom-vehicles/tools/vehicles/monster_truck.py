"""Monster Truck: a purple fibreglass pickup body with yellow-to-red flames,
riding high on a tube chassis over four giant beadlock tyres.

Everything below the body (frame, solid axles, four-links, eight coil-over
shocks on their hoops) stays put; the body shell sways and bobs on top.

LUNA is on both doors and INDI on both bed sides, in lime-edged name boards.
"""
import math

from artkit import box, mirrored, bar, cylinder, decal, material, paint, flat, \
    steering_wheel, bucket_seat, mix, rgb, scale, noise, glint

INFO = {
    "id": "monster_truck", "name": "Monster Truck", "kind": "Monster Truck",
    "group": "Land", "mode": "land", "length": 4.5,
    "specs": [("Length", "4½ blocks"), ("Tyres", "2¼ blocks tall"), ("Seats", "2"),
              ("Climbs", "2 blocks")],
    "seats": [(4.4, 38.2, 0.4), (-4.4, 38.2, 0.4)],
    "collision": (2.5, 3.0), "health": 30,
    "speed": 0.32, "step": 2.0625,
    "recipe": {"pattern": ["S S", "IRI", "S S"],
               "key": {"S": "minecraft:slime_block", "I": "minecraft:iron_block",
                       "R": "minecraft:redstone_block"}},
    "recipe_text": "4 Slime Blocks + 2 Iron Blocks + Redstone Block",
    "spawn_egg": ("#6A2BD9", "#FFB21E"),
    "anim": [
        {"bone": "body", "type": "turn", "axis": "z", "k": 0.08, "max": 6},
        {"bone": "body", "type": "bob", "axis": "x", "amp": 0.8, "freq": 1.2},
        {"bone": "steer_fl", "type": "turn", "axis": "y", "k": 0.25, "max": 25},
        {"bone": "steer_fr", "type": "turn", "axis": "y", "k": 0.25, "max": 25},
        {"bone": "wheel_fl", "type": "roll", "radius": 17},
        {"bone": "wheel_fr", "type": "roll", "radius": 17},
        {"bone": "wheel_rl", "type": "roll", "radius": 17},
        {"bone": "wheel_rr", "type": "roll", "radius": 17},
    ],
    "eggs": "LUNA on both doors, INDI on both sides of the pickup bed",
    "egg_cam": {"eye": [-118, 54, 2], "at": [0, 40, 6]},
}

R, WX, WZ, TW = 17.0, 17.0, 20.0, 11.0     # tyre radius, track, wheelbase/2, tread width
B0, BELT, ROOF = 35.0, 44.6, 54.6          # body bottom, beltline, roofline
BW = 14.6                                   # body half width (skins add 0.4)
NOSE, TAIL = -31.0, 31.0
CAB = (-9.0, 7.2)

# --- materials -----------------------------------------------------------------------
BASE_LO, BASE_HI = rgb("#8A45F0"), rgb("#2C0C6B")


def _base(v):
    c = mix(BASE_LO, BASE_HI, v ** 1.3)
    return mix(c, (255, 255, 255), glint(v, strength=0.45))


def _flame_colour(t):
    if t < 0.45:
        return mix(rgb("#FFF27A"), rgb("#FFB21E"), t / 0.45)
    return mix(rgb("#FFB21E"), rgb("#E3231B"), (t - 0.45) / 0.55)


def _reach(across, tongues, wobble=40):
    best = 0.0
    for k, (c, w, length) in enumerate(tongues):
        d = min(1.0, abs(across - c) / w)
        best = max(best, length * (1 - d ** 1.6) + 0.02 * math.sin(across * wobble + k * 1.7))
    return best


SIDE_TONGUES = [(0.14, 0.09, 0.36), (0.32, 0.13, 0.64), (0.54, 0.15, 0.9),
                (0.75, 0.13, 0.68), (0.91, 0.09, 0.42)]
HOOD_TONGUES = [(0.08, 0.08, 0.55), (0.24, 0.1, 0.85), (0.76, 0.1, 0.85), (0.92, 0.08, 0.55),
                (0.5, 0.07, 0.25)]


def _flames(along, across, v_for_paint, tongues):
    reach = _reach(across, tongues)
    if along < reach:
        if reach - along < 0.025:
            return rgb("#6E0A12")
        c = _flame_colour(along / max(reach, 1e-3))
        return mix(c, (255, 255, 255), glint(v_for_paint, strength=0.3))
    return scale(_base(v_for_paint), noise(0.02))


def _tread(u, v):
    """Chunky chevron lugs: u across the tread, v around it."""
    groove = abs(u - 0.5) < 0.04
    lug = ((v * 2 + abs(u - 0.5) * 1.3) % 1) < 0.5
    c = rgb("#303136") if lug and not groove else rgb("#111215")
    return scale(c, noise(0.06))


def _grille(u, v):
    if u < 0.05 or u > 0.95 or v < 0.1 or v > 0.9:
        return mix(rgb("#FFFFFF"), rgb("#8E9AA6"), v)
    return rgb("#4A4F57") if (int(u * 24) + int(v * 8)) % 2 == 0 else rgb("#101114")


def _panel(u, v):
    if u < 0.025 or u > 0.975 or v < 0.07 or v > 0.93:
        return rgb("#A6F04A")
    return mix(rgb("#1B1D22"), rgb("#07080A"), v)


def _net(u, v):
    if (u * 10) % 1 < 0.18 or (v * 8) % 1 < 0.18:
        return (20, 20, 22, 255)
    return (0, 0, 0, 0)


material("monster_truck_paint", lambda u, v: scale(_base(v), noise(0.02)))
material("monster_truck_flames_l", lambda u, v: _flames(u, v, v, SIDE_TONGUES))
material("monster_truck_flames_r", lambda u, v: _flames(1 - u, v, v, SIDE_TONGUES))
material("monster_truck_hood", lambda u, v: _flames(v, u, 0.25, HOOD_TONGUES))
paint("monster_truck_lime", "#B4F55A", "#4E9A12", gloss=0.4)
material("monster_truck_tread", _tread)
flat("monster_truck_sidewall", "#1D1E21", 0.05)
material("monster_truck_grille", _grille)
material("monster_truck_net", _net)
decal("monster_truck_luna", "LUNA", "#FFE23A", _panel, box=(0.08, 0.2, 0.84, 0.56),
      underline="#FF6A1E")
decal("monster_truck_indi", "INDI", "#FFE23A", _panel, box=(0.08, 0.2, 0.84, 0.56),
      underline="#FF6A1E")


# --- helpers ---------------------------------------------------------------------------

def slab(mat, x0, x1, p0, p1, t=0.6, **kw):
    """A flat plate from (z0, y0) to (z1, y1) across x0..x1, its top face on the line."""
    (z0, y0), (z1, y1) = p0, p1
    length = math.hypot(z1 - z0, y1 - y0)
    zm, ym = (z0 + z1) / 2, (y0 + y1) / 2
    pitch = math.degrees(math.atan2(y1 - y0, z1 - z0))
    return box(mat, x0, ym - t, zm - length / 2, x1, ym, zm + length / 2,
               rotation=(pitch, 0, 0), pivot=((x0 + x1) / 2, ym, zm), **kw)


def tube(mat, p0, p1, t=1.0):
    return bar(mat, p0, p1, t)


def coilover(p0, p1):
    """A coil-over shock: alloy body, chrome shaft, red spring coils."""
    lerp = lambda t: tuple(a + (b - a) * t for a, b in zip(p0, p1))
    out = [tube("aluminium", p0, lerp(0.5), 1.7), tube("chrome", lerp(0.45), p1, 0.8),
           tube("black", lerp(0.94), p1, 1.4), tube("black", p0, lerp(0.06), 1.4)]
    for k in range(7):
        t = 0.18 + k * 0.105
        out.append(tube("red", lerp(t), lerp(t + 0.045), 2.5))
    return out


def monster_wheel(name, center, parent, outward):
    """A giant beadlock wheel: chevron tread, shoulders, lime rim, chrome ring and hub."""
    cx, cy, cz = center
    cubes = cylinder("monster_truck_tread", center, R, TW, "x", 8, sides="monster_truck_sidewall")
    cubes += cylinder("monster_truck_tread", center, R - 1.0, TW + 1.8, "x", 8,
                      sides="monster_truck_sidewall")
    cubes += cylinder("chrome", center, 9.6, TW + 2.1, "x", 8)
    cubes += cylinder("monster_truck_lime", center, 8.3, TW + 2.4, "x", 8)
    cubes += cylinder("chrome", center, 2.8, TW + 3.4, "x", 4)
    face = cx + outward * (TW + 2.1) / 2
    for k in range(10):
        a = 2 * math.pi * k / 10
        y, z = cy + 8.95 * math.sin(a), cz + 8.95 * math.cos(a)
        x0, x1 = sorted((face, face + outward * 0.35))
        cubes.append(box("gunmetal", x0, y - 0.3, z - 0.3, x1, y + 0.3, z + 0.3))
    for k in range(5):                                  # lug nuts on the hub
        a = 2 * math.pi * k / 5 + 0.3
        y, z = cy + 1.7 * math.sin(a), cz + 1.7 * math.cos(a)
        f = cx + outward * (TW + 3.4) / 2
        x0, x1 = sorted((f, f + outward * 0.3))
        cubes.append(box("gunmetal", x0, y - 0.3, z - 0.3, x1, y + 0.3, z + 0.3))
    return {"name": name, "parent": parent, "pivot": list(center), "cubes": cubes}


# --- chassis (stays put) -----------------------------------------------------------

def chassis():
    out = []
    # frame rails and cross members
    out += mirrored("monster_truck_lime", 6.0, 8.0, 25.0, -33.0, 28.0, 33.0)
    for z in (-31, -12, 4, 31):
        out.append(box("monster_truck_lime", -6.0, 25.5, z - 1, 6.0, 27.5, z + 1))
    # engine, transmission, transfer case, driveshafts
    out.append(box("gunmetal", -4.5, 26.0, -18.0, 4.5, 34.8, -2.0, top="black"))
    out.append(box("aluminium", -3.5, 28.0, -2.0, 3.5, 33.0, 6.0))
    out.append(box("gunmetal", -2.5, 23.5, 3.0, 2.5, 28.0, 7.0))
    out += mirrored("chrome", 4.5, 5.6, 27.5, -16.0, 28.6, -4.0)               # headers
    out.append(tube("chrome", (0, 24.5, 3.0), (1.6, 18.0, -17.5), 1.2))
    out.append(tube("chrome", (0, 24.5, 7.0), (1.6, 18.0, 17.5), 1.2))
    for zw in (-WZ, WZ):
        sgn = 1 if zw > 0 else -1
        # solid axle and its pumpkin
        out += cylinder("gunmetal", (0, R, zw), 1.8, 2 * (WX - TW / 2 - 0.2), "x", 4)
        out += cylinder("gunmetal", (1.6, R, zw), 4.0, 4.2, "z", 4)
        out += cylinder("aluminium", (1.6, R, zw - sgn * 1.9), 2.6, 0.6, "z", 4)
        # four-link: lower and upper links run toward the middle of the truck
        for x in (5.5, -5.5):
            out.append(tube("chrome", (x, 15.6, zw), (x * 1.2, 25.6, zw - sgn * 12), 1.1))
        for x in (2.6, -2.6):
            out.append(tube("chrome", (x, 20.6, zw), (x * 1.6, 25.6, zw - sgn * 9), 0.9))
        # shock hoop over the axle
        out.append(box("monster_truck_lime", -12.4, 33.2, zw - 5.0, 12.4, 34.8, zw - 3.6))
        out.append(box("monster_truck_lime", -12.4, 33.2, zw + 3.6, 12.4, 34.8, zw + 5.0))
        for x in (7.0, -7.0):
            for dz in (-4.3, 4.3):
                out.append(tube("monster_truck_lime", (x, 27.5, zw + dz), (x * 1.6, 33.4, zw + dz), 1.2))
        # two coil-overs per corner, splayed in a V
        for x in (9.6, -9.6):
            for dz in (-1.2, 1.2):
                out += coilover((x, 18.4, zw + dz), (x * 1.06, 33.4, zw + dz * 3.4))
        if zw < 0:   # tie rod and steering ram on the front axle
            out.append(tube("chrome", (-10.5, 15.0, zw - 2.6), (10.5, 15.0, zw - 2.6), 0.8))
            out.append(tube("aluminium", (-3.0, 19.4, zw - 2.4), (6.0, 19.4, zw - 2.4), 1.2))
    # body mounts
    for z in (-26, -6, 10, 26):
        out += mirrored("gunmetal", 6.3, 7.7, 28.0, z - 0.7, B0, z + 0.7)
    # tube bumpers with skid hoops
    for z, sgn in ((NOSE - 3.0, -1), (TAIL + 3.0, 1)):
        out.append(tube("chrome", (-13.0, 30.0, z), (13.0, 30.0, z), 1.4))
        out.append(tube("chrome", (-9.0, 25.6, z - sgn * 0.6), (9.0, 25.6, z - sgn * 0.6), 1.2))
        for x in (9.0, -9.0):
            out.append(tube("chrome", (x, 25.6, z - sgn * 0.6), (x, 30.0, z), 1.2))
            out.append(tube("chrome", (x * 0.75, 27.0, z - sgn * 4.2), (x, 30.0, z), 1.2))
    return out


# --- body (sways) -----------------------------------------------------------------------

def body():
    out, glass = [], []
    # nose with a bevelled top edge
    out.append(box("monster_truck_paint", -BW - 0.4, B0, NOSE, BW + 0.4, 42.8, NOSE + 1.6))
    out.append(slab("monster_truck_paint", -BW - 0.4, BW + 0.4, (NOSE, 42.8), (NOSE + 1.6, BELT)))
    out.append(box("monster_truck_paint", -BW, B0, NOSE + 1.6, BW, BELT, CAB[0],
                   top="monster_truck_hood"))
    # flamed side skins, the full length (each side its own way round)
    out.append(box("monster_truck_paint", BW, B0, NOSE + 1.6, BW + 0.4, BELT, TAIL,
                   sides="monster_truck_flames_l"))
    out.append(box("monster_truck_paint", -BW - 0.4, B0, NOSE + 1.6, -BW, BELT, TAIL,
                   sides="monster_truck_flames_r"))
    # cab tub: floor, doors (inner), dash
    out.append(box("matte_black", -BW, B0, CAB[0], BW, B0 + 1.2, CAB[1]))
    out += mirrored("monster_truck_paint", BW - 1.0, BW, B0 + 1.2, CAB[0], BELT, CAB[1])
    out.append(box("gunmetal", -BW + 1, B0 + 1.2, CAB[0], BW - 1, 43.6, CAB[0] + 3.0,
                   top="matte_black"))
    out.append(box("screen", 2.4, 42.0, CAB[0] + 2.95, 6.4, 43.4, CAB[0] + 3.1))
    out.append(box("gunmetal", 4.0, 41.6, CAB[0] + 3.0, 4.8, 42.4, CAB[0] + 4.4))
    for x0, x1 in ((1.9, 6.9), (-6.9, -1.9)):
        cx = (x0 + x1) / 2
        out.append(box("gunmetal", cx - 1.4, B0 + 1.2, -2.2, cx + 1.4, 36.6, 2.2))
        out += bucket_seat(x0, x1, -2.2, 3.0, 36.6, cushion="dark_leather", trim="monster_truck_lime")
    # greenhouse: A pillars, roof, back wall with a small rear window
    wz0, wz1 = CAB[0], -4.4
    out += [slab("monster_truck_paint", 12.6, 13.8, (wz0, BELT), (wz1, ROOF)),
            slab("monster_truck_paint", -13.8, -12.6, (wz0, BELT), (wz1, ROOF))]
    glass.append(slab("glass", -12.6, 12.6, (wz0 + 0.1, BELT), (wz1 + 0.1, ROOF), t=0.3))
    out.append(box("monster_truck_paint", -13.8, ROOF - 0.4, wz1 - 0.6, 13.8, ROOF + 1.4, CAB[1],
                   top="monster_truck_paint"))
    out.append(box("black", -11.0, ROOF + 1.4, wz1 - 0.6, 11.0, ROOF + 1.6, wz1 + 0.4))
    zb = CAB[1] - 1.4
    out += mirrored("monster_truck_paint", 7.5, 13.8, BELT, zb, ROOF, CAB[1])
    out.append(box("monster_truck_paint", -7.5, BELT, zb, 7.5, 47.2, CAB[1]))
    out.append(box("monster_truck_paint", -7.5, 52.6, zb, 7.5, ROOF, CAB[1]))
    glass.append(box("glass", -7.5, 47.2, zb + 0.6, 7.5, 52.6, zb + 0.9))
    out.append(box("matte_black", -BW, B0 + 1.2, zb, BW, BELT, CAB[1]))
    out += mirrored("black", 13.0, BW + 0.45, BELT, CAB[0], BELT + 0.4, zb)          # window sills
    # roll cage inside the cab
    for x in (11.6, -11.6):
        out.append(tube("monster_truck_lime", (x, B0 + 1.2, zb - 0.9), (x, ROOF - 1.0, zb - 0.9), 0.9))
        out.append(tube("monster_truck_lime", (x, ROOF - 1.0, zb - 0.9), (x, ROOF - 1.0, wz1 + 0.4), 0.9))
        out.append(tube("monster_truck_lime", (x, BELT - 0.4, wz0 + 3.2), (x, ROOF - 1.0, wz1 + 0.4), 0.9))
        out.append(tube("monster_truck_lime", (x, BELT - 0.2, zb - 0.9), (x, ROOF - 1.4, wz1 + 1.0), 0.8))
    out.append(tube("monster_truck_lime", (-11.6, ROOF - 1.0, zb - 0.9), (11.6, ROOF - 1.0, zb - 0.9), 0.9))
    out.append(tube("monster_truck_lime", (-11.6, BELT, zb - 0.9), (11.6, BELT, zb - 0.9), 0.9))
    # window net on the driver's side
    glass.append(box("monster_truck_net", 13.3, BELT + 0.4, wz1 + 0.6, 13.4, ROOF - 1.2, zb - 0.2))
    # roof light pod
    out.append(box("matte_black", -9.5, ROOF + 1.4, wz1 + 0.4, 9.5, ROOF + 2.9, wz1 + 1.8))
    for x in (-7.2, -2.4, 2.4, 7.2):
        out.append(box("headlight", x - 1.6, ROOF + 1.55, wz1 + 0.25, x + 1.6, ROOF + 2.75, wz1 + 0.4))
    # bed: floor, inner walls, tailgate, rail caps
    out.append(box("matte_black", -BW, B0, CAB[1], BW, 38.6, TAIL - 0.8))
    out += mirrored("monster_truck_paint", BW - 1.4, BW, 38.6, CAB[1], BELT, TAIL - 0.8)
    out.append(box("monster_truck_paint", -BW, B0, TAIL - 0.8, BW, BELT, TAIL,
                   aft="monster_truck_paint"))
    out += mirrored("black", BW - 1.6, BW + 0.45, BELT, CAB[1], BELT + 0.45, TAIL)
    out.append(box("black", -BW, BELT, TAIL - 0.9, BW, BELT + 0.45, TAIL))
    out.append(box("plate", -3.4, 37.0, TAIL, 3.4, 40.0, TAIL + 0.15))
    out += mirrored("taillight", 11.2, BW + 0.2, 39.0, TAIL, 43.8, TAIL + 0.3)
    out.append(box("black", -9.0, 42.6, TAIL, 9.0, 43.2, TAIL + 0.2))               # tailgate lip
    # sport bar in the bed with lights, and twin chrome stacks
    for x in (12.0, -12.0):
        out.append(tube("monster_truck_lime", (x, 38.6, 14.0), (x * 0.92, 52.0, 11.0), 1.1))
        out.append(tube("monster_truck_lime", (x * 0.92, 50.0, 11.4), (x, 38.6, 24.0), 0.9))
    out.append(tube("monster_truck_lime", (-11.04, 52.0, 11.0), (11.04, 52.0, 11.0), 1.1))
    for x in (-4.5, 4.5):
        out.append(box("matte_black", x - 1.8, 52.5, 10.2, x + 1.8, 55.0, 11.6))
        out.append(box("amber", x - 1.5, 52.8, 10.05, x + 1.5, 54.7, 10.2))
    for x in (8.0, -8.0):
        out += cylinder("chrome", (x, 45.5, 9.4), 1.2, 14.0, "y", 4)
        out += cylinder("black", (x, 52.6, 9.4), 0.9, 0.2, "y", 4)
    # front: grille, headlights, valance, hood blower
    out.append(box("monster_truck_grille", -9.0, 37.4, NOSE - 0.5, 9.0, 42.0, NOSE))
    out += mirrored("chrome", 9.4, 14.4, 38.8, NOSE - 0.45, 42.2, NOSE)
    out += mirrored("headlight", 9.8, 14.0, 39.2, NOSE - 0.6, 41.8, NOSE - 0.45)
    out += mirrored("amber", 10.4, 14.0, 37.4, NOSE - 0.5, 38.4, NOSE)
    out.append(box("matte_black", -BW - 0.4, B0, NOSE - 0.6, BW + 0.4, 36.6, NOSE + 1))
    out.append(box("gunmetal", -4.6, BELT, -26.0, 4.6, BELT + 1.4, -15.0))
    out.append(box("aluminium", -3.8, BELT + 1.4, -25.0, 3.8, BELT + 3.8, -16.0))
    out.append(box("black", -3.4, BELT + 3.8, -24.6, 3.4, BELT + 7.2, -17.4, fore="chrome"))
    out.append(box("chrome", -3.6, BELT + 7.2, -24.8, 3.6, BELT + 7.6, -17.2))
    # door seams, handles, mirrors, fender flares
    for sgn in (1, -1):
        x0, x1 = sorted((sgn * (BW + 0.38), sgn * (BW + 0.46)))
        for z in (CAB[0] + 0.2, zb):
            out.append(box("black", x0, B0 + 0.6, z - 0.08, x1, BELT - 0.1, z + 0.08))
        xm0, xm1 = sorted((sgn * BW, sgn * (BW + 2.2)))
        out.append(box("chrome", xm0, 45.2, CAB[0] + 1.0, xm1, 48.0, CAB[0] + 1.6))
        out.append(box("black", sorted((sgn * (BW + 0.4), sgn * (BW + 0.6)))[0], 42.6, zb - 3.0,
                       sorted((sgn * (BW + 0.4), sgn * (BW + 0.6)))[1], 43.1, zb - 1.2))
    for zw in (-WZ, WZ):
        out += mirrored("matte_black", BW - 2.0, BW + 1.6, B0 - 1.0, zw - 11.5, B0 + 0.6, zw + 11.5)
    # name boards: LUNA on the doors, INDI on the bed sides
    out += mirrored("black", BW + 0.4, BW + 0.5, 37.2, CAB[0] + 2.2, 42.6, zb - 2.0,
                    sides="monster_truck_luna")
    out += mirrored("black", BW + 0.4, BW + 0.5, 37.2, 12.0, 42.6, 27.0,
                    sides="monster_truck_indi")
    return out, glass


def build():
    shell, glass = body()
    bones = [
        {"name": "root", "pivot": [0, 0, 0]},
        {"name": "chassis", "parent": "root", "pivot": [0, 17, 0], "cubes": chassis()},
        {"name": "body", "parent": "root", "pivot": [0, B0, 0], "cubes": shell},
        {"name": "glass", "parent": "body", "pivot": [0, B0, 0], "cubes": glass},
        steering_wheel("steering", (4.4, 42.6, -4.6), radius=1.9, parent="body"),
    ]
    for side, sgn in (("l", 1), ("r", -1)):
        fc, rc = [sgn * WX, R, -WZ], [sgn * WX, R, WZ]
        bones.append({"name": f"steer_f{side}", "parent": "root", "pivot": fc})
        bones.append(monster_wheel(f"wheel_f{side}", fc, f"steer_f{side}", sgn))
        bones.append(monster_wheel(f"wheel_r{side}", rc, "root", sgn))
    return bones
