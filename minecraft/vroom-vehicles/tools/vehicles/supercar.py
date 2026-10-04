"""Supercar: a low, wide, wedge-shaped mid-engined supercar in bright orange.

Sharp angular body sliced front to back, big side intakes, Y-shaped lights,
carbon splitter, skirts, diffuser and rear wing, a tinted glass canopy.
LUNA is on both number plates.
"""
import math

from artkit import (box, mirrored, cylinder, bar, decal, material, paint, flat,
                    wheel_bone, steering_wheel, bucket_seat, mix, rgb, glint, scale, noise)

INFO = {
    "id": "supercar", "name": "Supercar", "kind": "Mid-engine coupé",
    "group": "Land", "mode": "land", "length": 3,
    "specs": [("Length", "3 blocks"), ("Width", "1½ blocks"), ("Seats", "2"),
              ("Engine", "V12, behind you")],
    "seats": [(4.3, 5.0, 1.6), (-4.3, 5.0, 1.6)],
    "collision": (1.5, 0.9), "health": 10,
    "speed": 0.48, "step": 1.0625,
    "recipe": {"shapeless": ["minecraft:minecart", "minecraft:orange_dye",
                             "minecraft:redstone_block", "minecraft:glass_pane"]},
    "recipe_text": "Minecart + Orange Dye + Block of Redstone + Glass Pane",
    "spawn_egg": ("#FF7A12", "#1C1E22"),
    "anim": [
        {"bone": "wheel_fl", "type": "roll", "radius": 4.2},
        {"bone": "wheel_fr", "type": "roll", "radius": 4.2},
        {"bone": "wheel_rl", "type": "roll", "radius": 4.4},
        {"bone": "wheel_rr", "type": "roll", "radius": 4.4},
        {"bone": "steer_fl", "type": "turn", "axis": "y", "k": 0.25, "max": 25},
        {"bone": "steer_fr", "type": "turn", "axis": "y", "k": 0.25, "max": 25},
        {"bone": "body", "type": "turn", "axis": "z", "k": 0.05, "max": 4},
    ],
    "eggs": "LUNA on both number plates, front and rear",
    "egg_cam": {"eye": [-14, 9, -60], "at": [0, 4, -20]},
}

# --- materials -------------------------------------------------------------------

paint("supercar_orange", "#FF9633", "#E0650F", gloss=0.18)
flat("supercar_orange_top", "#FF9433", 0.025)


def _headlamp(u, v):
    """Smoked lamp with a bright Y-shaped running light."""
    c = mix(rgb("#3A4048"), rgb("#14171B"), v)
    c = mix(c, (200, 210, 225), glint(v, 0.15, 0.06, 0.4))

    def seg(ax, ay, bx, by, w):
        dx, dy = bx - ax, by - ay
        t = max(0, min(1, ((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy)))
        return math.hypot(u - ax - t * dx, v - ay - t * dy) < w
    if seg(0.06, 0.25, 0.5, 0.5, 0.07) or seg(0.06, 0.75, 0.5, 0.5, 0.07) \
            or seg(0.5, 0.5, 0.94, 0.5, 0.07):
        return rgb("#FFFFFF")
    if math.hypot(u - 0.75, v - 0.24) < 0.12:
        return mix(rgb("#FFFFFF"), rgb("#BFD8F2"), 0.4)
    return c


def _taillamp(u, v):
    """Black lamp with a glowing red Y."""
    c = mix(rgb("#2A2C30"), rgb("#0C0D10"), v)

    def seg(ax, ay, bx, by, w):
        dx, dy = bx - ax, by - ay
        t = max(0, min(1, ((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy)))
        return math.hypot(u - ax - t * dx, v - ay - t * dy) < w
    if seg(0.08, 0.2, 0.45, 0.5, 0.08) or seg(0.08, 0.8, 0.45, 0.5, 0.08) \
            or seg(0.45, 0.5, 0.95, 0.5, 0.08):
        return rgb("#FF4A3A")
    if seg(0.08, 0.2, 0.45, 0.5, 0.15) or seg(0.08, 0.8, 0.45, 0.5, 0.15) \
            or seg(0.45, 0.5, 0.95, 0.5, 0.15):
        return rgb("#8E1410")
    return c


def _mesh(u, v):
    """Black hexagon-ish grille mesh."""
    x, y = u * 16, v * 16
    if int(y) % 2:
        x += 0.5
    edge = min(x % 1, 1 - x % 1, y % 1, 1 - y % 1)
    return rgb("#3A3D42") if edge < 0.16 else rgb("#0E0F12")


def _louver(u, v):
    """Engine cover louvres: dark glass slats over the V12."""
    s = (v * 9) % 1
    if u < 0.04 or u > 0.96 or v < 0.03 or v > 0.97:
        return rgb("#0B0C0E")
    if s < 0.3:
        return rgb("#08090B")
    return mix(rgb("#3B4048"), rgb("#1A1D22"), (s - 0.3) / 0.7)


def _badge(u, v):
    """A made-up badge: a gold shield with a black lightning bolt."""
    dx = abs(u - 0.5)
    inside = dx < 0.42 - max(0, v - 0.55) * 0.9 and 0.05 < v < 0.97
    if not inside:
        return rgb("#14161A")
    bolt = (0.22 < v < 0.55 and abs(u - (0.62 - (v - 0.22) * 0.6)) < 0.08) or \
           (0.45 < v < 0.85 and abs(u - (0.55 - (v - 0.45) * 0.6)) < 0.08)
    if bolt:
        return rgb("#14161A")
    return mix(rgb("#FFE27A"), rgb("#C08A1E"), v)


def _rim(u, v):
    """Dark graphite rim with a bright machined lip."""
    c = mix(rgb("#5E656E"), rgb("#2A2E34"), v)
    if abs(u - 0.5) < 0.05 or abs(v - 0.5) < 0.05:
        c = rgb("#B9C1CA")
    return mix(c, (255, 255, 255), glint(v, 0.2, 0.06, 0.35))


def _caliper(u, v):
    return mix(rgb("#FFE04A"), rgb("#D49A00"), v)


material("supercar_head", _headlamp)
material("supercar_tail", _taillamp)
material("supercar_mesh", _mesh, "tile")
material("supercar_louver", _louver)
material("supercar_badge", _badge)
material("supercar_rim", _rim)
material("supercar_caliper", _caliper)
decal("supercar_luna", "LUNA", "#1F2F5A", "plate", box=(0.1, 0.18, 0.8, 0.64))

P = "supercar_orange"
PT = "supercar_orange_top"
BAND = (0.5, 11.5)

# --- shape ---------------------------------------------------------------------------

ZF, ZR = -24.0, 24.0            # nose and tail
WF, WR = -14.5, 14.5            # axle positions
RF, RR = 4.2, 4.4               # tyre radii
ARCH_F, ARCH_R = 4.75, 5.0
XI = 8.0                        # inside face of the wheel arches / cockpit walls
FLOOR = 3.2
COCKPIT = (-8.5, 5.5)
BELT = 8.6
WS0, WS1, ROOF_END, TAIL_TOP = (-10.0, BELT), (-1.0, 12.4), 5.0, (23.0, 9.8)
LEAN = 0.75                     # canopy tumblehome: inward per unit of height
NOSE_CUT = 3.5                  # the nose corners are cut off this far back
X_BELT = 9.4                    # canopy half-width at the belt line


def half_width(z):
    if z < ZF + NOSE_CUT:
        return 12 - 2.6 * (ZF + NOSE_CUT - z) / NOSE_CUT
    return 12.0


def bottom(z):
    if z < -20:
        return 1.4 + (-20 - z) * 0.1
    if z > 19:
        return 1.4 + (z - 19) * 0.25
    return 1.4


def hood(z):
    """Centre-line height of the body (hood, belt, rear deck)."""
    if z < WS0[0]:
        t = (z - ZF) / (WS0[0] - ZF)
        return 4.4 + (BELT - 0.2 - 4.4) * t ** 0.8
    if z < 6:
        return BELT
    return 9.2


def fender(z):
    f = 9.6 - 0.045 * (z - WF) ** 2
    r = 10.6 - 0.035 * (z - WR) ** 2
    return max(f, r)


def outer_top(z):
    return max(hood(z), fender(z))


def arch(z):
    for wz, r, rr in ((WF, RF, ARCH_F), (WR, RR, ARCH_R)):
        if abs(z - wz) < rr:
            return r + math.sqrt(rr * rr - (z - wz) ** 2)
    return 0


def roofline(z):
    """Height of the canopy / engine cover along the centre line."""
    if z <= WS1[0]:
        return WS0[1] + (z - WS0[0]) * (WS1[1] - WS0[1]) / (WS1[0] - WS0[0])
    if z <= ROOF_END:
        return WS1[1] + 0.12 * math.sin(math.pi * (z - WS1[0]) / (ROOF_END - WS1[0]))
    t = (z - ROOF_END) / (TAIL_TOP[0] - ROOF_END)
    return WS1[1] - (WS1[1] - TAIL_TOP[1]) * t ** 1.1


def canopy_x(y):
    return X_BELT - LEAN * (y - BELT)


# --- body ---------------------------------------------------------------------------

def _pair(mat, x0, x1, y0, y1, z0, z1, **kw):
    if y1 - y0 < 0.05 or x1 - x0 < 0.05:
        return []
    if x0 <= 0:
        return [box(mat, -x1, y0, z0, x1, y1, z1, **kw)]
    return mirrored(mat, x0, x1, y0, z0, y1, z1, **kw)


def slice_edges():
    edges, z = [ZF], ZF
    while z < ZR:                               # half-pixel slices round the arches
        near = any(abs(z + 0.5 - wz) < r + 0.5 for wz, r in ((WF, ARCH_F), (WR, ARCH_R)))
        z = min(ZR, z + (0.5 if near else 1.0))
        edges.append(z)
    return edges


def body_slices():
    """The body, sliced every half pixel; runs of identical slices are merged."""
    rows = []
    edges = slice_edges()
    for z0, z1 in zip(edges, edges[1:]):
        zm = (z0 + z1) / 2
        w, b, t, hi = half_width(zm), bottom(zm), hood(zm), outer_top(zm)
        cockpit = COCKPIT[0] <= zm <= COCKPIT[1]
        skirt = WF + ARCH_F - 0.3 < zm < WR - ARCH_R + 0.3
        spec = []                                   # (material, x0, x1, y0, y1)
        if cockpit:
            spec.append(("matte_black", 0, XI, b, FLOOR))
        else:
            spec.append((P, 0, 6, b, t))
            spec.append((P, 6, XI, b, (t + hi) / 2))
        lo = max(b, arch(zm))
        if skirt:
            spec.append(("carbon", XI, w + 0.25, lo, 3.0))
            lo = max(lo, 3.0)
        if 2.0 <= zm <= WR - ARCH_R:                # the big side intake
            it_top = 6.4 + (zm - 2.0) * 0.22
            spec += [(P, XI, w, lo, 3.5), ("black", XI, w - 2.6, max(lo, 3.5), it_top),
                     (P, XI, w, max(lo, it_top), hi - 0.6)]
        else:
            spec.append((P, XI, w, lo, hi - 0.6))
        spec.append((P, XI, w - 0.8, max(lo, hi - 0.6), hi))
        spec = tuple((m, round(a, 3), round(b_, 3), round(c, 3), round(d, 3))
                     for m, a, b_, c, d in spec)
        if rows and rows[-1][2] == spec:
            rows[-1][1] = z1
        else:
            rows.append([z0, z1, spec])
    out = []
    for z0, z1, spec in rows:
        for m, x0, x1, y0, y1 in spec:
            kw = {"band": BAND, "top": PT, "fore": PT, "aft": PT} if m == P else {}
            if m == "matte_black":
                kw = {"top": "carpet"}
            out += _pair(m, x0, x1, y0, y1, z0, z1, **kw)
    return out


def _skin(f, x0, x1, za, zb, step=1.0, xw=None):
    """Tilted plates over the stepped slice tops of height f(z), so slopes read smooth.

    x0..x1 is the plate's half-width range (x0 = 0 for a centre plate); `xw(z)`
    can narrow x1 where the body tapers.
    """
    out = []
    n = max(1, int(round((zb - za) / step)))
    for i in range(n):
        a, b = za + (zb - za) * i / n, za + (zb - za) * (i + 1) / n
        fa, fb = f(a), f(b)
        if abs(fa - fb) < 0.03 and abs(f((a + b) / 2) - fa) < 0.03:
            continue
        dev, low = 0.0, 0.0                         # slice tops above / below the chord
        for s0, s1 in zip(EDGES, EDGES[1:]):
            if s1 <= a or s0 >= b:
                continue
            top = f((s0 + s1) / 2)
            for zz in (max(s0, a), min(s1, b)):
                d = top - (fa + (fb - fa) * (zz - a) / (b - a))
                dev, low = max(dev, d), min(low, d)
        off = dev + 0.06
        thick = off - low + 0.2
        ang = math.degrees(math.atan2(fb - fa, b - a))
        L = math.hypot(b - a, fb - fa) + 0.06
        zm, ym = (a + b) / 2, (fa + fb) / 2 + off
        hx = (x1 if xw is None else min(x1, xw(a), xw(b))) - 0.04   # just inside the sides
        x0 = x0 + 0.04 if x0 > 0 else x0
        if hx - x0 < 0.1:
            continue
        out += _pair(P, x0, hx, ym - thick, ym, zm - L / 2, zm + L / 2, rotation=(ang, 0, 0),
                     pivot=(0, ym, zm), band=BAND, top=PT, fore=PT, aft=PT)
    return out


EDGES = slice_edges()


def body_skin():
    mid = lambda z: (hood(z) + outer_top(z)) / 2
    out = _skin(hood, 0, 6, ZF + 0.3, WS0[0], xw=lambda z: half_width(z) - 0.3)
    out += _skin(mid, 6, XI, ZF + 0.3, WS0[0], xw=lambda z: half_width(z) - 0.3)
    for za, zb in ((ZF + 0.3, WS0[0]), (WR - 6.5, ZR - 0.3)):
        out += _skin(outer_top, XI, 12 - 0.8, za, zb, xw=lambda z: half_width(z) - 0.8)
        out += _skin(lambda z: outer_top(z) - 0.6, 12 - 0.8, 12, za, zb,
                     xw=lambda z: half_width(z))
    for za, zb in ((WR - 6.5, ZR - 0.3),):
        out += _skin(mid, 6, XI, za, zb)
    return out


def nose_panels():
    """Angled side panels over the cut-off nose corners."""
    out = []
    za, zb = ZF, ZF + NOSE_CUT
    xa, xb = half_width(za), half_width(zb)
    yaw = math.degrees(math.atan2(xb - xa, zb - za))
    L = math.hypot(zb - za, xb - xa) + 0.1
    zm = (za + zb) / 2
    for inset, top_of, lo, push in ((0.0, lambda z: outer_top(z) - 0.6, max(bottom(za), bottom(zb)), 0.0),
                                    (0.0, lambda z: outer_top(z) - 0.6, None, 0.02),
                                    (0.8, outer_top, None, 0.02)):
        ta, tb = top_of(za), top_of(zb)
        xc = (xa + xb) / 2 - inset + 0.04 + push
        if lo is not None:                      # upright lower panel, up to the low end
            out += mirrored(P, xc - 0.4, xc, lo, zm - L / 2, min(ta, tb), zm + L / 2,
                            rotation=(0, yaw, 0), pivot=(xc, lo, zm), band=BAND,
                            top=PT, fore=PT, aft=PT)
            continue
        pitch = math.degrees(math.atan2(tb - ta, zb - za))
        ym = (ta + tb) / 2
        h = 1.4 if inset == 0 else 0.62
        out += mirrored(P, xc - 0.4, xc, ym - h, zm - L / 2, ym, zm + L / 2,
                        rotation=(pitch, yaw, 0), pivot=(xc, ym, zm), band=BAND,
                        top=PT, fore=PT, aft=PT)
    return out


def intake_details():
    out = []
    w = 12.0
    for z in (4.5, 6.6, 8.6):                            # vertical fins in the intakes
        top = 6.4 + (z - 2.0) * 0.22
        out += mirrored("carbon", w - 2.6, w - 0.4, 3.5, z - 0.2, top, z + 0.2)
    # a sharp blade running into the intake, like the door crease
    out += mirrored("carbon", w - 0.05, w + 0.12, 3.3, -6.0, 3.6, 2.2)
    # door shut lines (scissor door outline)
    out += mirrored("black", w, w + 0.06, 3.1, -8.6, BELT, -8.4)
    out += mirrored("black", w, w + 0.06, 3.0, -8.6, 3.2, 2.0)
    out.append(bar("black", (w + 0.03, BELT - 0.2, -8.5), (w + 0.03, 6.4, 2.0), 0.18))
    out.append(bar("black", (-w - 0.03, BELT - 0.2, -8.5), (-w - 0.03, 6.4, 2.0), 0.18))
    return out


def canopy():
    """Roof, engine cover and A-pillars (the glass is in its own bone)."""
    out = []
    z = WS1[0] - 0.5
    while z < ROOF_END + 0.5:                            # roof, in thin slices
        y = roofline(z + 0.25)
        out += _pair(P, 0, canopy_x(y) + 0.25, y - 0.5, y + 0.12, z, z + 0.5, top=PT,
                     sides="black")
        z += 0.5
    z = ROOF_END + 0.5
    while z < TAIL_TOP[0]:                               # engine cover
        y = roofline(z + 0.25)
        cw = 7.0 - 1.4 * (z - ROOF_END) / (TAIL_TOP[0] - ROOF_END)
        out += _pair(P, 0, cw, hood(z), y, z, z + 0.5, band=BAND, top=PT, fore=PT, aft=PT)
        z += 0.5
    for s in (1, -1):                                    # A and C pillars
        out.append(bar("black", (s * (X_BELT - 0.1), BELT, WS0[0] + 0.1),
                       (s * (canopy_x(WS1[1]) + 0.05), WS1[1], WS1[0]), 0.6))
    out += mirrored("black", X_BELT - 0.3, X_BELT + 0.3, BELT - 0.15, WS0[0], BELT + 0.15, 7.0)
    # louvres over the engine
    za, zb = 8.5, 20.0
    ya, yb = roofline(za) + 0.1, roofline(zb) + 0.1
    ang = -math.degrees(math.atan2(ya - yb, zb - za))
    ym, zm = (ya + yb) / 2, (za + zb) / 2
    L = math.hypot(zb - za, ya - yb)
    out.append(box("supercar_louver", -4.6, ym - 0.1, zm - L / 2, 4.6, ym + 0.1, zm + L / 2,
                   rotation=(ang, 0, 0), pivot=(0, ym, zm)))
    return out


def glass_bone():
    cubes = []
    # windshield, in strips so it narrows toward the roof
    n = 9
    (za, ya), (zb, yb) = WS0, WS1
    ang = math.degrees(math.atan2(yb - ya, zb - za))
    L = math.hypot(zb - za, yb - ya) / n
    for i in range(n):
        t = (i + 0.5) / n
        zm, ym = za + (zb - za) * t, ya + (yb - ya) * t + 0.05
        hx = canopy_x(ym) - 0.35
        cubes.append(box("tinted_glass", -hx, ym - 0.12, zm - L / 2, hx, ym + 0.12, zm + L / 2,
                         rotation=(ang, 0, 0), pivot=(0, ym, zm)))
    # side windows, leaning in
    lean = math.degrees(math.atan(LEAN))
    z = WS0[0] + 0.3
    while z < 7.0:
        z1 = min(z + 1.0, 7.0)
        top = roofline(z1 if z1 < WS1[0] else (z + z1) / 2) - 0.25
        if z1 > ROOF_END:
            top = roofline(z1) - 0.25
        h = (top - BELT) / math.cos(math.radians(lean))
        if h > 0.2:
            cubes += mirrored("tinted_glass", X_BELT - 0.15, X_BELT + 0.1, BELT, z, BELT + h, z1,
                              rotation=(0, 0, -lean), pivot=(X_BELT, BELT, (z + z1) / 2))
        z = z1
    return {"name": "glass", "parent": "body", "pivot": [0, BELT, 0], "cubes": cubes}


def front_end():
    out = []
    zf = ZF
    # splitter and lower lip
    out.append(box("carbon", -10.2, 1.0, zf - 0.8, 10.2, 1.5, -17, top="carbon"))
    # big black corner intakes with carbon fins
    out += mirrored("supercar_mesh", 4.2, 8.4, 1.6, zf - 0.08, 4.0, zf + 1.5)
    out += mirrored("carbon", 4.0, 8.6, 3.9, zf - 0.2, 4.3, zf + 1.4)
    for x in (5.6, 7.0):
        out += mirrored("carbon", x - 0.15, x + 0.15, 1.6, zf - 0.2, 3.9, zf + 0.6)
    # number plate (LUNA) and the badge
    out.append(box("plate", -3.3, 1.9, zf - 0.2, 3.3, 3.9, zf + 0.3, fore="supercar_luna"))
    zb = -22.2
    yb = hood(zb) + 0.08
    slope = math.degrees(math.atan((hood(zb + 0.5) - hood(zb - 0.5))))
    out.append(box("supercar_badge", -0.8, yb - 0.08, zb - 0.7, 0.8, yb + 0.08, zb + 0.7,
                   rotation=(slope, 0, 0), top="supercar_badge"))
    # headlights on the front of the fenders, following their slope
    za, zc = -22.4, -18.6
    ya, yc = outer_top(za) + 0.5, outer_top(zc) + 0.5
    ang = math.degrees(math.atan2(yc - ya, zc - za))
    L = math.hypot(zc - za, yc - ya)
    ym, zm = (ya + yc) / 2 + 0.05, (za + zc) / 2
    out += mirrored("black", 8.1, 11.0, ym - 0.5, zm - L / 2, ym + 0.12, zm + L / 2,
                    rotation=(ang, 0, 0), pivot=(9.7, ym, zm), top="supercar_head")
    return out


def rear_end():
    out = []
    zr = ZR
    out.append(box("supercar_mesh", -10.6, 2.6, zr - 0.3, 10.6, 7.1, zr + 0.06))
    out += mirrored("supercar_tail", 5.0, 11.2, 7.3, zr - 0.3, 8.9, zr + 0.1)
    out.append(box("black", -5.0, 7.6, zr - 0.3, 5.0, 8.6, zr + 0.06))
    out.append(box("plate", -3.2, 5.0, zr, 3.2, 7.0, zr + 0.25, aft="supercar_luna"))
    # diffuser and its fins
    out.append(box("carbon", -10.0, 1.6, 18.5, 10.0, 2.6, zr + 0.6))
    for x in (-7.5, -4.5, 4.5, 7.5):
        out.append(box("carbon", x - 0.15, 1.2, 19.5, x + 0.15, 3.0, zr + 0.6))
    # centre exhausts
    for x in (-1.7, 1.7):
        out += cylinder("chrome", (x, 3.6, zr - 0.2), 0.95, 1.4, "z", 4)
        out += cylinder("black", (x, 3.6, zr - 0.1), 0.65, 1.4, "z", 4)
    # the wing
    for s in (1, -1):
        out.append(box("black", s * 4.4, roofline(21.6) - 0.4, 20.8, s * 5.1, 13.0, 22.2,
                       rotation=(-8, 0, 0)))
    out.append(box("carbon", -10.4, 12.9, 19.6, 10.4, 13.4, 23.4, rotation=(5, 0, 0),
                   top="carbon"))
    out += mirrored("carbon", 10.4, 10.75, 11.9, 19.2, 14.2, 23.8)
    out.append(box("supercar_orange", -10.4, 13.3, 23.0, 10.4, 13.9, 23.5, rotation=(5, 0, 0),
                   pivot=(0, 13.15, 21.5)))
    return out


def mirrors():
    out = []
    for s in (1, -1):
        out.append(bar("black", (s * 9.6, 8.9, -8.2), (s * 11.8, 9.7, -8.9), 0.35))
    out += mirrored("supercar_orange", 11.4, 13.4, 9.0, -9.9, 10.5, -8.6, top=PT, aft="chrome")
    out += mirrored("black", 11.4, 13.4, 8.9, -9.9, 9.1, -8.6)
    return out


def cockpit():
    out = []
    f = FLOOR
    for x0, x1 in ((2.2, 6.4), (-6.4, -2.2)):
        out += bucket_seat(x0, x1, 0.0, 3.4, f + 0.2, back=4.2, cushion="dark_leather",
                           trim="supercar_orange", recline=-18)
    out.append(box("carbon", -XI, 6.0, COCKPIT[0], XI, BELT - 0.2, -7.0, top="black"))
    out.append(box("screen", 2.4, 6.4, -7.05, 6.2, 7.8, -6.95))
    out.append(box("carbon", -1.2, f, -7.0, 1.2, 5.6, 2.5, top="black"))
    out.append(box("black", 3.9, 6.8, -7.0, 4.7, 7.6, -5.2))       # steering column
    return out


def build():
    bones = [
        {"name": "root", "pivot": [0, 0, 0]},
        {"name": "body", "parent": "root", "pivot": [0, 2, 0],
         "cubes": body_slices() + body_skin() + nose_panels() + intake_details() + canopy() + front_end() + rear_end()
         + mirrors() + cockpit()},
        steering_wheel("steering", (4.3, 7.6, -5.0), radius=1.5, tilt=-22, parent="body"),
        glass_bone(),
    ]
    for side, s in (("l", 1), ("r", -1)):
        for axle, wz, r, w in (("f", WF, RF, 3.4), ("r", WR, RR, 3.8)):
            cx = s * (11.9 - w / 2)
            center = (cx, r, wz)
            parent = "root"
            if axle == "f":
                bones.append({"name": f"steer_f{side}", "parent": "root", "pivot": list(center),
                              "cubes": [box("supercar_caliper", cx - s * 1.0, r + 0.4, wz + 0.6,
                                            cx - s * 1.4, r + 2.0, wz + 2.0)]})
                parent = f"steer_f{side}"
            wb = wheel_bone(f"wheel_{axle}{side}", center, r, w, parent=parent,
                            rim="supercar_rim", rim_ratio=0.74, n=8)
            bones.append(wb)
    return bones
