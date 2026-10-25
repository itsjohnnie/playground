"""Builds the clay characters in Blender and exports one GLB per character.

    python3 fight/tools/build_characters.py [id ...]

Requires the `bpy` module (pip install bpy). Reads fight/tools/characters.json
(exported from js/characters.js) and writes fight/assets/chars/<id>.glb.

Each GLB holds:
  - "body": one skinned mesh (torso, neck, arms, hands with fingers, legs,
    shoes, collars) modelled with a Skin modifier + subdivision in an A-pose,
    weighted to the game's bone names with Blender's bone-heat weights.
  - "head": one sculpted mesh in head-bone space. Skull, cheekbones, chin,
    nose, ears, lips, hair, curls, strands and beards are voxel-remeshed into
    a single lump of clay, smoothed, then the eye sockets, mouth, nostrils
    and ear canals are carved out.
Eyes, lids, brows, teeth and glasses stay in the game (js/model.js) so faces
can still change expression; every landmark here mirrors that file's math.
"""
import bpy, bmesh, json, math, os, random, sys
from mathutils import Vector, Matrix, noise, kdtree

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'chars')

BUILDS = {
    'slim':    dict(sh=0.195, arm=0.046, leg=0.065, chest=0.165, waist=0.13,  hip=0.15,  depth=0.12,  belly=0,     scale=1,    head=0.31),
    'average': dict(sh=0.22,  arm=0.056, leg=0.076, chest=0.19,  waist=0.158, hip=0.165, depth=0.135, belly=0.012, scale=1.02, head=0.31),
    'muscle':  dict(sh=0.3,   arm=0.088, leg=0.096, chest=0.27,  waist=0.175, hip=0.18,  depth=0.18,  belly=0,     scale=1.06, head=0.3),
    'heavy':   dict(sh=0.25,  arm=0.07,  leg=0.09,  chest=0.235, waist=0.24,  hip=0.21,  depth=0.19,  belly=0.075, scale=1.04, head=0.31),
    'giant':   dict(sh=0.31,  arm=0.092, leg=0.105, chest=0.29,  waist=0.225, hip=0.215, depth=0.2,   belly=0.03,  scale=1.3,  head=0.29),
}
THIGH, SHIN, FOOT = 0.41, 0.4, 0.085
SPINE_Y, CHEST_Y, NECK_Y, HEAD_Y = 0.08, 0.22, 0.22, 0.07
UPPER, FORE = 0.29, 0.26
FL = [[0.034, 0.028], [0.038, 0.03], [0.035, 0.028], [0.028, 0.022]]
A_ARM, A_LEG = 0.75, 0.12   # bind pose: arms and legs spread


def clamp(v, a, b): return a if v < a else b if v > b else v
def lerp(a, b, t): return a + (b - a) * t
def smooth(a, b, x):
    t = clamp((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)
def gauss(x, m, s): return math.exp(-((x - m) ** 2) / (2 * s * s))


# Three.js space (y up, z forward) -> Blender space (z up). The glTF exporter
# maps Blender (x, y, z) to glTF (x, z, -y), so the game gets three coords back.
def B(v): return Vector((v[0], -v[2], v[1]))
def T(v): return Vector((v[0], v[2], -v[1]))


def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def col(hexstr):
    h = hexstr.lstrip('#')
    if len(h) == 3: h = ''.join(ch * 2 for ch in h)
    return tuple(srgb_to_lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4))
def mul(c, k): return tuple(x * k for x in c)


# ------------------------------------------------------------------ rig
def rot_z(a): return Matrix.Rotation(a, 4, 'Z')
def rot_x(a): return Matrix.Rotation(a, 4, 'X')


def rig(defn, b):
    """World matrices (three space) of every game bone in the A-pose."""
    hipY = THIGH + SHIN + FOOT
    hk = clamp(b['arm'] / 0.05, 0.9, 1.6) * 1.15
    J = {}
    def bone(name, parent, off, rot=None):
        m = (J[parent] if parent else Matrix.Identity(4)) @ Matrix.Translation(Vector(off))
        if rot is not None: m = m @ rot
        J[name] = m
    bone('root', None, (0, hipY, 0))
    bone('spine', 'root', (0, SPINE_Y, 0))
    bone('chest', 'spine', (0, CHEST_Y, 0))
    bone('neck', 'chest', (0, NECK_Y, 0))
    bone('head', 'neck', (0, HEAD_Y, 0))
    for s, sx in (('L', 1), ('R', -1)):
        bone('clav' + s, 'chest', (sx * 0.05, 0.15, 0))
        bone('sh' + s, 'clav' + s, (sx * (b['sh'] - 0.05), 0, 0), rot_z(sx * A_ARM))
        bone('el' + s, 'sh' + s, (0, -UPPER, 0))
        bone('hand' + s, 'el' + s, (0, -FORE, 0))
        bone('hip' + s, 'root', (sx * b['hip'] * 0.55, -0.03, 0), rot_z(sx * A_LEG))
        bone('kn' + s, 'hip' + s, (0, -THIGH, 0))
        bone('ft' + s, 'kn' + s, (0, -SHIN, 0))
        for i in range(4):
            bone(f'f{s}{i}a', 'hand' + s, (0, -0.072 * hk, (0.026 - i * 0.017) * hk))
            bone(f'f{s}{i}b', f'f{s}{i}a', (0, -(FL[i][0] + 0.004) * hk, 0))
            bone(f'f{s}{i}c', f'f{s}{i}b', (0, -FL[i][1] * hk, 0))
        bone(f't{s}a', 'hand' + s, (-sx * 0.012 * hk, -0.02 * hk, 0.035 * hk), rot_x(-0.5))
        bone(f't{s}b', f't{s}a', (0, -0.032 * hk, 0))
        bone(f't{s}c', f't{s}b', (0, -0.024 * hk, 0))
    P = {k: m.to_translation() for k, m in J.items()}
    return J, P, hk, hipY


# ------------------------------------------------------------------ outfit
def outfit(defn):
    top = defn['top']
    skin = col(defn['skin']); shirt = col(top['color']); inner = col(top.get('inner', top['color']))
    pants = col(defn['bottom']['color']); belt = mul(pants, 0.45)
    t = top['type']
    neck_open = {'tee': 0.505, 'vneck': 0.47, 'sweater': 0.46, 'hoodie': 0.52, 'quarterzip': 0.54, 'blazer': 0.5, 'leather': 0.5, 'vest': 0.5, 'shirtless': -1}.get(t, 0.5)

    def torso(y, x, z):
        if y < 0.035: return belt if abs(y - 0.028) < 0.012 else pants
        if t == 'shirtless': return skin
        front = z > 0
        if t in ('blazer', 'leather', 'vest') and front and abs(x) < 0.015 + (y - 0.05) * (0.3 if t == 'vest' else 0.2) and y > 0.05:
            if y > 0.52: return skin
            if t != 'vest' and abs(x) > 0.015 + (y - 0.05) * 0.2 - 0.012: return mul(shirt, 0.55)
            return inner
        if t == 'vest' and 0.4 < y < neck_open + 0.03: return inner
        if t == 'sweater' and front and abs(x) < (y - 0.3) * 0.45 and y > 0.3: return skin if (y > 0.47 and abs(x) < 0.035) else inner
        if t == 'vneck' and front and abs(x) < (y - 0.38) * 0.55 and y > 0.38: return skin
        if y > neck_open + 0.03: return skin
        if t == 'quarterzip' and front and abs(x) < 0.008 and y > 0.3: return col('#9a9aa2')
        if y < 0.06 and t != 'leather': return mul(shirt, 0.82)
        return shirt

    def arm(tt):
        sleeve = {'tee': 0.32, 'vneck': 0.32, 'shirtless': -1, 'vest': 0.92}.get(t, 0.93)
        sc = inner if t == 'vest' else shirt
        if tt < sleeve: return mul(sc, 0.8) if tt > sleeve - 0.035 else sc
        return skin

    def leg(tt):
        if 0.94 < tt < 0.975: return mul(pants, 0.75)
        return pants if tt < 0.975 else skin
    return torso, arm, leg, skin


# ------------------------------------------------------------------ helpers
def new_obj(name, mesh):
    o = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(o)
    return o


def apply_all(o):
    """Bake an object's modifier stack into a fresh mesh."""
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    o.modifiers.clear()
    old = o.data
    o.data = me
    bpy.data.meshes.remove(old)
    return o


def set_colors(me, fn):
    """fn(vertex_index, co) -> linear rgb."""
    if 'Col' in me.color_attributes: me.color_attributes.remove(me.color_attributes['Col'])
    attr = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    for v in me.vertices:
        c = fn(v.index, v.co)
        attr.data[v.index].color = (c[0], c[1], c[2], 1.0)
    me.color_attributes.active_color = attr


def get_colors(me):
    a = me.color_attributes['Col']
    return [tuple(a.data[i].color[:3]) for i in range(len(me.vertices))]


def uv_sphere(center, radii, color, segs=24, rings=16):
    """Ellipsoid at a Blender-space centre; radii in game axes (x, y up, z fwd)."""
    radii = (radii[0], radii[2], radii[1])
    me = bpy.data.meshes.new('s')
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=1.0)
    for v in bm.verts:
        v.co = Vector((center[0] + v.co.x * radii[0], center[1] + v.co.y * radii[1], center[2] + v.co.z * radii[2]))
    bm.to_mesh(me); bm.free()
    o = new_obj('part', me)
    set_colors(me, lambda i, c: color)
    return o


def tube(points, r0, r1, color, segs=10, sides=10):
    """A tapered roll of clay through Blender-space points, capped."""
    pts = [Vector(p) for p in points]
    # Catmull-Rom resample.
    def cr(p0, p1, p2, p3, t):
        return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
    ext = [pts[0] * 2 - pts[1]] + pts + [pts[-1] * 2 - pts[-2]]
    path = []
    for i in range(len(pts) - 1):
        for k in range(segs):
            path.append(cr(ext[i], ext[i + 1], ext[i + 2], ext[i + 3], k / segs))
    path.append(pts[-1])
    n = len(path)
    verts, faces = [], []
    up = Vector((0, 0, 1))
    for i, p in enumerate(path):
        d = (path[min(i + 1, n - 1)] - path[max(i - 1, 0)]).normalized()
        a = up if abs(d.dot(up)) < 0.9 else Vector((1, 0, 0))
        u = d.cross(a).normalized(); w = d.cross(u).normalized()
        t = i / (n - 1)
        r = lerp(r0, r1, t)
        # Pinch the ends like a rolled sausage of clay.
        r *= 0.55 + 0.45 * math.sin(math.pi * clamp(t * 0.85 + 0.075, 0, 1))
        for j in range(sides):
            ang = j / sides * math.tau
            verts.append(p + (u * math.cos(ang) + w * math.sin(ang)) * r)
    for i in range(n - 1):
        for j in range(sides):
            a = i * sides + j; b = i * sides + (j + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    verts.append(path[0]); verts.append(path[-1])
    c0, c1 = len(verts) - 2, len(verts) - 1
    for j in range(sides):
        faces.append((c0, (j + 1) % sides, j))
        faces.append((c1, (n - 1) * sides + j, (n - 1) * sides + (j + 1) % sides))
    me = bpy.data.meshes.new('tube')
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.update()
    o = new_obj('part', me)
    set_colors(me, lambda i, c: color)
    return o


def join(objs, name):
    objs = [o for o in objs if o]
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    o.name = name
    return o


def modifier(o, kind, **kw):
    m = o.modifiers.new(kind.lower(), kind)
    for k, v in kw.items(): setattr(m, k, v)
    return m


def transfer_colors(dst, src_mesh, src_cols, k=4):
    kd = kdtree.KDTree(len(src_mesh.vertices))
    for v in src_mesh.vertices: kd.insert(v.co, v.index)
    kd.balance()
    def f(i, co):
        found = kd.find_n(co, k)
        tw = 0; acc = [0, 0, 0]
        for (_, idx, dist) in found:
            w = 1 / (dist + 1e-4) ** 2
            c = src_cols[idx]
            acc = [acc[j] + c[j] * w for j in range(3)]; tw += w
        return [a / tw for a in acc]
    set_colors(dst.data, f)


# ------------------------------------------------------------------ head
def sculpt_fn(h):
    eg = 0.34 * h.get('eye', {}).get('gap', 1)
    def f(x, y, z):
        X, Y, Z = x * h['W'], y * h['H'], z * h['D']
        front = max(0, z)
        low = smooth(0.08, -0.9, y)
        X *= lerp(1, h['jaw'], low)
        Z *= lerp(1, 0.94, low)
        Z += h['chin'] * gauss(y, -0.72, 0.22) * front * front * 1.6
        Y -= h['chinLen'] * gauss(y, -0.82, 0.25) * front
        X += math.copysign(1, x) * h['cheek'] * gauss(y, -0.1, 0.2) * gauss(z, 0.5, 0.32) if x != 0 else 0
        Z += h['brow'] * gauss(y, 0.24, 0.08) * front ** 3 * gauss(x, 0, 0.5)
        for sx in (1, -1):
            d2 = (x - sx * eg) ** 2 + (y - 0.1) ** 2 * 1.3
            Z -= h['socket'] * math.exp(-d2 / 0.02) * front
        Z += h['muzzle'] * gauss(y, -0.42, 0.18) * gauss(x, 0, 0.32) * front
        if z < 0: Z -= 0.05 * gauss(y, 0.25, 0.35) * -z
        if y > 0: Y *= h['forehead']
        Y *= 1 - 0.05 * smooth(0.7, 1, y)
        if y < 0: Y *= h.get('faceLen', 1)
        dome = h.get('dome', 0)
        if dome:
            Y += dome * 0.4 * smooth(0.05, 1, y); X *= 1 + dome * 0.12 * smooth(0, 0.8, y); Z *= 1 + dome * 0.08 * smooth(0, 0.8, y)
        jowl = h.get('jowl', 0)
        if jowl and x != 0: X += math.copysign(1, x) * jowl * gauss(y, -0.55, 0.2) * smooth(-0.4, 0.3, z)
        return Vector((X, Y + h['H'] * 0.94, Z))
    return f


def face_fn(defn):
    """Facial anatomy as smooth displacement on the unit sphere (in units of
    R), plus a lip mask for colour. Blends by construction, like real clay."""
    h = defn['head']
    n = h.get('nose', {}); mo = h.get('mouth', {})
    eg = 0.34 * h.get('eye', {}).get('gap', 1)
    nl, nw, nt, nb = n.get('len', 1), n.get('w', 1), n.get('tip', 1), n.get('bridge', 1)
    mw = 0.33 * mo.get('w', 1); lip = 0.05 * mo.get('lip', 1); sm = mo.get('smile', 0.3)
    chin = h.get('chin', 0.04)
    def lipline(x, y0, up, k):
        u = clamp(x / (mw * k), -1, 1)
        return -0.45 + y0 + u * u * up
    def f(x, y, z):
        if z <= 0.05: return 0.0, 0.0
        fr = smooth(0.05, 0.5, z)
        d = 0.0
        # Nose: a bridge that thickens down to a bulb, with nostril wings.
        tny = -0.18
        along = smooth(0.12, tny, y)  # 0 at the root, 1 at the tip
        if -0.32 < y < 0.16:
            wid = (0.055 + 0.05 * along) * nw
            d += (0.06 * nb + (0.2 * nl) * along ** 1.4) * math.exp(-(x * x) / (2 * wid * wid)) * smooth(0.18, 0.08, y) * smooth(-0.32, -0.2, y)
        d += 0.16 * nt * math.exp(-((x * x) / (2 * (0.085 * nt) ** 2) + ((y - tny) ** 2) / (2 * (0.07 * nt) ** 2)))
        for sx in (1, -1):
            d += 0.09 * nw * math.exp(-(((x - sx * 0.11 * nw) ** 2) / (2 * 0.045 ** 2) + ((y - (tny - 0.045)) ** 2) / (2 * 0.045 ** 2)))
            # Cheekbones, smile cheeks, under-eye bags, jaw angles.
            d += 0.05 * math.exp(-(((x - sx * 0.47) ** 2) + (y + 0.02) ** 2 * 1.4) / (2 * 0.1 ** 2))
            d += (0.05 + 0.05 * max(0, sm)) * math.exp(-(((x - sx * 0.36) ** 2) + (y + 0.28) ** 2) / (2 * 0.085 ** 2))
            d += 0.014 * math.exp(-(((x - sx * eg) ** 2) / (2 * 0.07 ** 2) + ((y + 0.03) ** 2) / (2 * 0.025 ** 2)))
            # Smile lines: a crease from the nostril to the mouth corner.
            t = clamp((y + 0.2) / -0.32, 0, 1)
            cx = sx * lerp(0.17, 0.33 + 0.1 * mw, t)
            d -= 0.035 * math.exp(-((x - cx) ** 2) / (2 * 0.02 ** 2)) * smooth(-0.15, -0.22, y) * smooth(-0.56, -0.48, y)
        # Lips: two rolls following the mouth curve, a cupid's bow and a philtrum.
        win = smooth(mw * 1.08, mw * 0.85, abs(x))
        yu = lipline(x, lip * 1.55, sm * lip * 1.8, 1) + 0.25 * lip * math.exp(-((abs(x) - 0.06) ** 2) / 0.0012)
        yl = lipline(x, -lip * 1.65, sm * lip * 1.4, 0.92)
        lu = math.exp(-((y - yu) ** 2) / (2 * (lip * 0.95) ** 2)) * win
        ll = math.exp(-((y - yl) ** 2) / (2 * (lip * 1.15) ** 2)) * win
        d += 0.12 * lu + 0.13 * ll
        d -= 0.012 * math.exp(-(x * x) / (2 * 0.018 ** 2)) * smooth(-0.26, -0.3, y) * smooth(-0.4, -0.36, y)
        # Chin: a rounded ball with a soft cleft under the lower lip.
        d += (0.08 + chin * 0.6) * math.exp(-((x * x) / (2 * 0.13 ** 2) + ((y + 0.8) ** 2) / (2 * 0.09 ** 2)))
        d -= 0.018 * math.exp(-((x * x) / (2 * 0.1 ** 2) + ((y + 0.64) ** 2) / (2 * 0.03 ** 2)))
        return d * fr, max(lu, ll) * fr
    return f


def head_landmarks(defn, R):
    h = defn['head']
    f = sculpt_fn(h)
    def at(x, y, z, out=0):
        n = Vector((x, y, z)).normalized()
        return f(n.x, n.y, n.z) * R + n * (out * R)
    ey = h.get('eye', {})
    eR = R * 0.15 * ey.get('size', 1)
    eg = 0.34 * ey.get('gap', 1)
    eyes = [at(sx * eg, 0.1, 0.94) + Vector((0, 0, -eR * 0.42)) for sx in (1, -1)]
    mo = h.get('mouth', {})
    mw = R * 0.33 * mo.get('w', 1); lip = R * 0.05 * mo.get('lip', 1); sm = mo.get('smile', 0.3)
    mc = at(0, -0.45, 1, 0.045)
    return f, at, eyes, eR, eg, mw, lip, sm, mc


def build_head(defn, b):
    R = b['head'] * defn['head'].get('size', 1)
    h = defn['head']
    skin = col(defn['skin'])
    f, at, eyes, eR, eg, mw, lip, sm, mc = head_landmarks(defn, R)
    hair = defn.get('hair', {})
    hc = col(hair.get('color', '#333333')) if hair.get('color') else skin
    hc2 = col(hair['color2']) if hair.get('color2') else mul(hc, 0.75)
    parts = []
    rnd = random.Random(len(defn['id']) * 977 + 3)

    # Skull: a dense quad sphere pushed out by the sculpt function.
    me = bpy.data.meshes.new('skull')
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=2)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=70, use_grid_fill=True)
    units, lipm = [], []
    ff = face_fn(defn)
    lip_c = col(defn['lips']) if defn.get('lips') else (skin[0] * 0.86, skin[1] * 0.6, skin[2] * 0.6)
    for v in bm.verts:
        n = v.co.normalized()
        units.append(n.copy())
        d, lm = ff(n.x, n.y, n.z)
        lipm.append(lm)
        v.co = B(f(n.x, n.y, n.z) * R + n * (d * R))
    bm.to_mesh(me); bm.free()
    skull = new_obj('skull', me)
    set_colors(me, lambda i, c: tuple(lerp(skin[k], lip_c[k], smooth(0.35, 0.6, lipm[i])) for k in range(3)))
    parts.append(skull)
    unit = {i: units[i] for i in range(len(units))}

    def shell(mask, thick, color, lump=0.012):
        """Hair/beard: the skull region where mask > 0, raised by thick*R."""
        m2 = skull.data.copy()
        o = new_obj('shell', m2)
        bm = bmesh.new(); bm.from_mesh(m2)
        bm.verts.ensure_lookup_table()
        kill = []
        for v in bm.verts:
            u = unit[v.index]
            mk = mask(u.x, u.y, u.z)
            if mk < -0.02:
                kill.append(v); continue
            t = (thick(u.x, u.y, u.z) if callable(thick) else thick) + noise.noise(u * 7) * lump
            k = smooth(-0.02, 0.07, mk)
            # Away from the skull centre, roughly along the surface normal.
            nrm = (v.co - B(Vector((0, h['H'] * 0.94 * R, 0)))).normalized()
            v.co = v.co + nrm * (R * (t * k + 0.004))
        bmesh.ops.delete(bm, geom=kill, context='VERTS')
        bm.to_mesh(m2); bm.free()
        modifier(o, 'SOLIDIFY', thickness=R * 0.08, offset=-1.0, use_rim=True)
        apply_all(o)
        set_colors(o.data, lambda i, c: color)
        parts.append(o)

    def line(front, back, side=0.14):
        def m(x, y, z):
            bb = (1 - z) / 2
            lim = lerp(front, back, smooth(0.05, 1, bb))
            lim = max(lim, side * smooth(0.6, 0.85, abs(x)) * smooth(-0.55, -0.3, z) - (1 - smooth(-0.55, -0.3, z)))
            return y - lim
        return m

    def rand_dir(mask, mn=0):
        for _ in range(400):
            u = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1)))
            if u.length > 1 or u.length < 0.2: continue
            u.normalize()
            if mask(u.x, u.y, u.z) > mn: return u
        return None

    def blobs(count, rmin, rmax, out, mask, color):
        for _ in range(count):
            u = rand_dir(mask)
            if not u: break
            r = R * lerp(rmin, rmax, rnd.random())
            parts.append(uv_sphere(B(at(u.x, u.y, u.z, out + rnd.random() * 0.03)), (r, r, r), color, 12, 8))

    def strands(count, mask, out_fn, flow, length, rad, colors):
        for i in range(count):
            u = rand_dir(mask, 0.1)
            if not u: break
            pts, v = [], u.copy()
            L = length * (0.7 + rnd.random() * 0.6)
            for _ in range(4):
                pts.append(B(at(v.x, v.y, v.z, out_fn(v.x, v.y, v.z))))
                v = (v + flow(v) * (L / 3)).normalized()
            r = R * rad * (0.8 + rnd.random() * 0.5)
            parts.append(tube(pts, r, r * 0.55, colors[i % len(colors)], segs=6, sides=8))

    def roll(pts3, r0, r1, color):
        parts.append(tube([B(p) for p in pts3], R * r0, R * r1, color, segs=8, sides=10))

    back = lambda v: Vector((v.x * 0.15, 0.45 if v.z > 0.1 else -0.35, -1))
    style = hair.get('style')
    if style == 'short':
        fr = hair.get('fringe', 0.4)
        th = lambda x, y, z: 0.045 + 0.05 * smooth(0.2, 0.9, y) + 0.03 * fr * smooth(0.4, 0.9, z) * smooth(0.3, 0.6, y)
        shell(line(0.5, -0.35), th, hc)
        strands(70, line(0.5, -0.35), lambda x, y, z: th(x, y, z) + 0.004, back, 0.55, 0.05, [hc, hc2, mul(hc, 0.8)])
        strands(int(8 + fr * 14), lambda x, y, z: line(0.5, -0.35)(x, y, z) - 0.05 if z > 0.55 else -1, lambda x, y, z: th(x, y, z) - 0.01,
                lambda v: Vector((v.x * 0.4, -0.7, 0.8)), 0.18 + fr * 0.15, 0.055, [hc, hc2])
    elif style == 'receding':
        shell(line(0.6, -0.35), 0.035, hc, 0.006)
        strands(40, line(0.6, -0.35), lambda x, y, z: 0.035, back, 0.35, 0.03, [hc, hc2])
    elif style == 'curly':
        shell(line(0.42, -0.4), 0.06, hc)
        blobs(150, 0.085, 0.13, 0.07, line(0.38, -0.35), hc)
        blobs(80, 0.07, 0.11, 0.14, line(0.46, -0.2), hc2)
    elif style == 'tightcurls':
        shell(line(0.46, -0.4), 0.045, hc)
        blobs(170, 0.05, 0.075, 0.04, line(0.44, -0.35), hc)
        blobs(70, 0.045, 0.07, 0.065, line(0.5, -0.1), hc2)
    elif style == 'swept':
        sw = lambda x, y, z: 0.05 + 0.09 * smooth(0.3, 0.95, y) * smooth(-0.2, 0.7, z)
        shell(line(0.5, -0.35), sw, hc)
        strands(60, line(0.5, -0.35), lambda x, y, z: sw(x, y, z) + 0.004, back, 0.7, 0.05, [hc, hc2])
        for i in range(-3, 4):
            xx = i * 0.12
            roll([at(xx, 0.62, 0.75, 0.12), at(xx * 1.05, 0.92, 0.25, 0.13), at(xx * 1.1, 0.75, -0.55, 0.07)], 0.06, 0.04, hc2 if i % 2 else hc)
    elif style == 'sidepart':
        spT = lambda x, y, z: 0.05 + 0.05 * smooth(0.3, 0.9, y)
        shell(line(0.5, -0.35), spT, hc)
        strands(55, line(0.5, -0.35), lambda x, y, z: spT(x, y, z) + 0.004,
                lambda v: Vector((0.6 if v.x > 0.38 else -0.8, -0.15, 0.1 if v.z > 0.3 else -0.6)), 0.5, 0.045, [hc, hc2])
        roll([at(0.35, 0.75, 0.6, 0.09), at(0.05, 0.62, 0.85, 0.07), at(-0.35, 0.55, 0.85, 0.06), at(-0.65, 0.5, 0.55, 0.05)], 0.09, 0.06, hc2)
    elif style == 'long':
        shell(line(0.45, -0.6, 0.0), lambda x, y, z: 0.05 + 0.04 * smooth(0.3, 0.9, y), hc)
        for i in range(11):
            a = math.pi - 0.3 + i * ((math.pi + 0.6) / 10)
            x0, z0 = math.cos(a), math.sin(a)
            top = at(x0 * 0.9, 0.35, z0 * 0.9 - 0.15, 0.04)
            roll([top, at(x0 * 1.05, -0.3, z0 - 0.2, 0.1), Vector((top.x * 1.15, -R * 0.15, top.z * 1.1 - R * 0.1))], 0.12, 0.07, hc if i % 2 else hc2)
        for sx in (1, -1):
            roll([at(sx * 0.3, 0.6, 0.85, 0.07), at(sx * 0.7, 0.4, 0.55, 0.09), at(sx * 0.95, 0.1, 0.05, 0.07)], 0.08, 0.06, hc2)
        strands(40, line(0.45, -0.6, 0.0), lambda x, y, z: 0.06, back, 0.6, 0.04, [hc, hc2])
    elif style == 'balding':
        shell(lambda x, y, z: min(y + 0.35, 0.38 - y, 0.25 - z, (y - 0.15) if (abs(x) > 0.75 and z > -0.45) else 1), 0.035, hc)

    # Facial hair hugs the jawline and leaves the mouth clear.
    fh = defn.get('facial', {})
    def jawline(lim):
        def m(x, y, z):
            if z < -0.2 or (abs(x) > 0.8 and y > -0.35 and z < 0.1): return -1
            hole = min(0.3 - abs(x), y + 0.62, -0.28 - y, z - 0.6)
            return min(lim - 0.18 * (1 - abs(x)) - y, -hole)
        return m
    if fh.get('stubble'): shell(jawline(-0.36), 0.012, col(fh['stubble']), 0.003)
    if fh.get('beardShort'): shell(jawline(-0.34), 0.03, col(fh['beardShort']), 0.01)
    if fh.get('beard'): shell(jawline(-0.3), lambda x, y, z: 0.035 + 0.05 * smooth(-0.4, -0.95, y), col(fh['beard']), 0.018)
    if fh.get('mustache'):
        for sx in (1, -1):
            roll([at(0, -0.33, 1, 0.03), at(sx * 0.18, -0.36, 0.98, 0.035), at(sx * 0.3, -0.47, 0.93, 0.02)], 0.045, 0.03, col(fh['mustache']))

    # Neck stub so the head melts into the body's neck.
    nk = 1.25 if defn['build'] in ('muscle', 'giant') else 1
    parts.append(tube([B((0, -0.1, -0.015)), B((0, R * 0.25, -0.02)), B((0, R * 0.55, -0.03))], 0.068 * nk, 0.064 * nk, skin, segs=4, sides=16))

    n = h.get('nose', {})
    nW, nT = R * 0.12 * n.get('w', 1), R * 0.13 * n.get('tip', 1)
    tip = at(0, -0.18, 1, 0.12 * n.get('len', 1))
    # Ears: a flattened shell with a rolled rim and a lobe.
    es = h.get('ear', 1) * R
    for sx in (1, -1):
        p = at(sx, -0.02, -0.08, -0.04)
        parts.append(uv_sphere(B(p + Vector((sx * es * 0.03, 0, 0))), (es * 0.075, es * 0.2, es * 0.13), skin))
        rim = [p + Vector((sx * es * 0.08, es * (0.16 * math.cos(a) + 0.02), es * 0.11 * math.sin(a) - es * 0.02)) for a in [i * 0.55 - 1.0 for i in range(8)]]
        parts.append(tube([B(q) for q in rim], es * 0.035, es * 0.03, skin, segs=4, sides=8))
        parts.append(uv_sphere(B(p + Vector((sx * es * 0.06, -es * 0.17, es * 0.02))), (es * 0.04, es * 0.05, es * 0.045), skin))

    head = join(parts, 'head')
    src = head.data.copy()
    src_cols = get_colors(src)

    # Melt everything into one surface, then smooth like thumbs on clay.
    modifier(head, 'REMESH', mode='VOXEL', voxel_size=R * 0.0085, adaptivity=0)
    modifier(head, 'LAPLACIANSMOOTH', iterations=3, lambda_factor=0.5, use_volume_preserve=True)
    apply_all(head)
    transfer_colors(head, src, src_cols)
    bpy.data.meshes.remove(src)

    # Carve: eye sockets, mouth, nostrils, ear canals.
    cutters = []
    for e in eyes: cutters.append(uv_sphere(B(e), (eR * 1.06,) * 3, skin, 20, 14))
    cutters.append(uv_sphere(B(mc), (mw * 0.95, lip * 1.25, mw * 0.6), (0.02, 0.003, 0.004), 24, 16))
    for sx in (1, -1):
        nb_ = at(sx * 0.07 * n.get('w', 1), -0.255, 1, 0.07 + 0.06 * n.get('len', 1))
        cutters.append(uv_sphere(B(nb_), (nT * 0.22, nT * 0.17, nT * 0.3), (0.04, 0.01, 0.01), 12, 8))
        p = at(sx, -0.02, -0.08, -0.04)
        cutters.append(uv_sphere(B(p + Vector((sx * es * 0.1, es * 0.01, es * 0.02))), (es * 0.075,) * 3, mul(skin, 0.5), 12, 8))
    cut = join(cutters, 'cut')
    m = modifier(head, 'BOOLEAN', operation='DIFFERENCE', object=cut, solver='EXACT')
    apply_all(head)
    bpy.data.objects.remove(cut)
    modifier(head, 'DECIMATE', ratio=1.0)
    tri = len(head.data.polygons)
    head.modifiers['decimate'].ratio = min(1.0, 26000 / max(1, tri * 2))
    modifier(head, 'TRIANGULATE')
    apply_all(head)
    for p in head.data.polygons: p.use_smooth = True
    return head


# ------------------------------------------------------------------ body
def build_body(defn, b, P, J, hk, hipY):
    torso_c, arm_c, leg_c, skin = outfit(defn)
    shoes = defn.get('shoes', {'color': '#222222', 'sole': '#eeeeee'})
    shoe_c, sole_c = col(shoes['color']), col(shoes['sole'])
    nk = 1.25 if defn['build'] in ('muscle', 'giant') else 1
    ySpine = hipY + SPINE_Y; yChest = ySpine + CHEST_Y; yNeck = yChest + NECK_Y
    verts, edges, radii, tags = [], [], [], []
    def V(p, r, tag):
        verts.append(B(p)); radii.append(r if isinstance(r, tuple) else (r, r)); tags.append(tag)
        return len(verts) - 1
    def E(a, b_): edges.append((a, b_))
    def chain(ids):
        for i in range(len(ids) - 1): E(ids[i], ids[i + 1])

    # Skin radii are (x, y) in each vertex's local frame; for the vertical
    # spine that's roughly (width, depth).
    pel = V(Vector((0, hipY - 0.03, -0.005)), (b['hip'] * 0.95, b['depth'] * 0.9), 'torso')
    wai = V(Vector((0, hipY + 0.15, b['belly'] * 0.5)), (b['waist'], b['depth'] * 0.86 + b['belly']), 'torso')
    che = V(Vector((0, hipY + 0.33, 0.006)), (b['chest'], b['depth']), 'torso')
    shl = V(Vector((0, yChest + 0.13, -0.006)), (b['sh'] * 0.62, b['depth'] * 0.72), 'torso')
    nb = V(Vector((0, yNeck - 0.01, -0.004)), (0.072 * nk, 0.07 * nk), 'neck')
    nt = V(Vector((0, P['head'].y + 0.05, -0.012)), (0.062 * nk, 0.062 * nk), 'neck')
    chain([pel, wai, che, shl, nb, nt])
    limb = {}
    for s, sx in (('L', 1), ('R', -1)):
        sh, el, wr = P['sh' + s], P['el' + s], P['hand' + s]
        ar = b['arm']
        a0 = V(sh + Vector((-sx * 0.02, 0.005, 0)), ar * 1.35, ('arm', s))
        a1 = V(sh.lerp(el, 0.42) + Vector((0, 0, ar * 0.15)), ar * 1.12, ('arm', s))
        a2 = V(el, ar * 0.88, ('arm', s))
        a3 = V(el.lerp(wr, 0.3), ar * 1.0, ('arm', s))
        a4 = V(wr + (el - wr).normalized() * 0.01, ar * 0.62, ('arm', s))
        E(shl, a0); chain([a0, a1, a2, a3, a4])
        # Hand: palm and jointed fingers.
        hm = J['hand' + s]
        palm = V((hm @ Vector((0, -0.04 * hk, 0.004 * hk, 1))).to_3d(), (0.036 * hk, 0.017 * hk), ('hand', s))
        E(a4, palm)
        for i in range(4):
            fa, fb, fc = P[f'f{s}{i}a'], P[f'f{s}{i}b'], P[f'f{s}{i}c']
            r = 0.0092 * hk
            ids = [V(fa, r, ('hand', s)), V(fb, r * 0.92, ('hand', s)), V(fc, r * 0.78, ('hand', s))]
            E(palm, ids[0]); chain(ids)
        ta, tb, tc = P[f't{s}a'], P[f't{s}b'], P[f't{s}c']
        ids = [V(ta, 0.012 * hk, ('hand', s)), V(tb, 0.011 * hk, ('hand', s)), V(tc, 0.0095 * hk, ('hand', s))]
        E(palm, ids[0]); chain(ids)
        # Leg and shoe.
        hp, kn, ft = P['hip' + s], P['kn' + s], P['ft' + s]
        lr = b['leg']
        l0 = V(hp + Vector((0, 0.03, 0)), lr * 1.45, ('leg', s))
        l1 = V(hp.lerp(kn, 0.45), lr * 1.25, ('leg', s))
        l2 = V(kn, lr * 0.92, ('leg', s))
        l3 = V(kn.lerp(ft, 0.32) + Vector((0, 0, -0.012)), lr * 1.02, ('leg', s))
        l4 = V(ft + Vector((0, 0.03, 0)), lr * 0.64, ('leg', s))
        E(pel, l0); chain([l0, l1, l2, l3, l4])
        f0 = V(ft + Vector((0, -0.035, -0.02)), (lr * 0.9, 0.06), ('shoe', s))
        f1 = V(ft + Vector((0, -0.045, 0.08)), (lr * 1.05, 0.05), ('shoe', s))
        f2 = V(ft + Vector((0, -0.05, 0.16)), (lr * 0.85, 0.042), ('shoe', s))
        E(l4, f0); chain([f0, f1, f2])
        limb[s] = (sh, wr, hp, ft)
    me = bpy.data.meshes.new('body')
    me.from_pydata([tuple(v) for v in verts], edges, [])
    me.update()
    body = new_obj('body', me)
    modifier(body, 'SKIN', branch_smoothing=0.6, use_smooth_shade=True)
    sk = me.skin_vertices[0].data
    for i, r in enumerate(radii):
        sk[i].radius = r
    sk[pel].use_root = True
    modifier(body, 'SUBSURF', levels=2, render_levels=2)
    apply_all(body)
    # Remesh so the skin modifier's branch knots become one smooth surface.
    modifier(body, 'REMESH', mode='VOXEL', voxel_size=0.006, adaptivity=0)
    modifier(body, 'LAPLACIANSMOOTH', iterations=8, lambda_factor=0.7, use_volume_preserve=True)
    apply_all(body)

    # Paint clothes by nearest skeleton segment.
    segs = []
    for (a, b_) in edges:
        ta, tb = tags[a], tags[b_]
        segs.append((verts[a], verts[b_], tb if tb != 'torso' else ta))
    def paint(i, co):
        best, bd, bt = None, 1e9, 0
        for (pa, pb, tag) in segs:
            d = pb - pa
            t = clamp((co - pa).dot(d) / max(d.length_squared, 1e-9), 0, 1)
            dist = (co - (pa + d * t)).length
            if dist < bd: bd, best, bt = dist, tag, t
        p3 = T(co)
        if best == 'torso': return torso_c(p3.y - hipY, p3.x, p3.z)
        if best == 'neck': return skin
        kind, s = best
        sh, wr, hp, ft = limb[s]
        if kind == 'arm':
            d = wr - sh
            return arm_c(clamp((p3 - sh).dot(d) / d.length_squared, 0, 1))
        if kind == 'hand': return skin
        if kind == 'leg':
            d = ft - hp
            return leg_c(clamp((p3 - hp).dot(d) / d.length_squared, 0, 1))
        return sole_c if p3.y < ft.y - 0.075 else shoe_c
    set_colors(body.data, paint)

    # Collars and hoods: rolls of clay around the neck, part of the body mesh.
    top = defn['top']; t = top['type']
    extra = []
    def ring(y, R0, r, color, dz=0.0, tilt=0.0):
        pts = [Vector((math.sin(a) * R0, y + math.cos(a) * tilt, dz + math.cos(a) * R0)) for a in [i / 12 * math.tau for i in range(13)]]
        extra.append(tube([B(p) for p in pts], r, r, color, segs=4, sides=10))
    if t in ('tee', 'vneck'): ring(yNeck - 0.012, 0.072 * nk, 0.014, col(top['color']), 0, 0.01)
    if t == 'hoodie': ring(yNeck - 0.035, 0.11, 0.045, col(top.get('inner', top['color'])), -0.03, 0.03)
    if t == 'quarterzip': ring(yNeck + 0.005, 0.08 * nk, 0.026, col(top['color']), 0, 0.0)
    if t in ('blazer', 'leather'): ring(yNeck - 0.015, 0.088 * nk, 0.024, col('#0a0a0c') if t == 'leather' else mul(col(top['color']), 0.7), -0.012, 0.02)
    if t == 'vest': ring(yNeck - 0.01, 0.078 * nk, 0.02, col(top.get('inner', '#ffffff')), 0, 0.01)
    if extra:
        body = join([body] + extra, 'body')
    # Keep it light for the game.
    modifier(body, 'DECIMATE', ratio=min(1.0, 22000 / max(1, len(body.data.polygons) * 2)))
    modifier(body, 'TRIANGULATE')
    apply_all(body)
    for p in body.data.polygons: p.use_smooth = True
    return body


def build_armature(P, J):
    arm = bpy.data.armatures.new('rig')
    ao = new_obj('rig', arm)
    bpy.context.view_layer.objects.active = ao
    for o in bpy.context.selected_objects: o.select_set(False)
    ao.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    def tail_of(name):
        kids = {'root': 'spine', 'spine': 'chest', 'chest': 'neck', 'neck': 'head'}
        if name in kids: return P[kids[name]]
        if name == 'head': return P['head'] + Vector((0, 0.3, 0))
        if name.startswith('clav'): return P['sh' + name[-1]]
        for a, c in (('sh', 'el'), ('el', 'hand'), ('hip', 'kn'), ('kn', 'ft')):
            if name.startswith(a) and len(name) == len(a) + 1: return P[c + name[-1]]
        if name.startswith('hand'):
            return (J[name] @ Vector((0, -0.07, 0, 1))).to_3d()
        if name.startswith('ft'): return P[name] + Vector((0, -0.05, 0.15))
        if name[0] in 'ft' and name[-1] in 'ab':
            return P[name[:-1] + ('b' if name[-1] == 'a' else 'c')]
        return None
    for name, p in P.items():
        t = tail_of(name)
        if t is None: continue
        eb = arm.edit_bones.new(name)
        eb.head = B(p); eb.tail = B(t)
    bpy.ops.object.mode_set(mode='OBJECT')
    return ao


def skin_to(body, ao):
    for o in bpy.context.selected_objects: o.select_set(False)
    body.select_set(True); ao.select_set(True)
    bpy.context.view_layer.objects.active = ao
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    # Islands bone-heat couldn't reach get the nearest bone.
    groups = {g.index: g.name for g in body.vertex_groups}
    missing = [v for v in body.data.vertices if sum(g.weight for g in v.groups) < 1e-4]
    if missing:
        heads = [(bn.name, bn.head_local, bn.tail_local) for bn in ao.data.bones]
        for v in missing:
            best, bd = None, 1e9
            for name, h_, t_ in heads:
                d = t_ - h_
                t = clamp((v.co - h_).dot(d) / max(d.length_squared, 1e-9), 0, 1)
                dist = (v.co - (h_ + d * t)).length
                if dist < bd: bd, best = dist, name
            vg = body.vertex_groups.get(best) or body.vertex_groups.new(name=best)
            vg.add([v.index], 1.0, 'REPLACE')
    return len(missing)


def build(defn):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    b = BUILDS.get(defn['build'], BUILDS['slim'])
    J, P, hk, hipY = rig(defn, b)
    head = build_head(defn, b)
    head.name = 'head'
    body = build_body(defn, b, P, J, hk, hipY)
    body.name = 'body'
    ao = build_armature(P, J)
    missing = skin_to(body, ao)
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in (ao, body, head): o.select_set(True)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, defn['id'] + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_skins=True, export_animations=False,
                              export_vertex_color='ACTIVE', export_all_vertex_colors=False, export_materials='NONE',
                              export_texcoords=False, export_normals=True, export_yup=True, export_apply=False)
    return path, len(body.data.polygons), len(head.data.polygons), missing


if __name__ == '__main__':
    defs = json.load(open(os.path.join(HERE, 'characters.json')))
    want = [a for a in sys.argv[1:] if not a.startswith('-')]
    for d in defs:
        if want and d['id'] not in want: continue
        path, bt, ht, miss = build(d)
        print(f"{d['id']}: body {bt} tris, head {ht} tris, unweighted {miss} -> {os.path.relpath(path)}", flush=True)
