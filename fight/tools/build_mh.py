#!/usr/bin/env python3
"""Clay caricature fighters built on the MakeHuman base mesh (CC0).

    python3 -I fight/tools/build_mh.py [ids...]      (needs numpy)

MakeHuman's data (base mesh, ~1,500 anatomical morph targets, a rigged
skeleton with skin weights, facial expression units) is fetched once into
tools/.mh by fetch_makehuman.sh. For each character we:

  1. model the body: age / muscle / weight / height macros plus face and body
     targets chosen for likeness (LOOKS below),
  2. caricature it: a big head, chunky hands and feet,
  3. dress it: clothes, hair, beards and brows are shells offset from the
     skin with crisp clipped hems, so colours never smear,
  4. rig it: MakeHuman's 163 bones fold into the game's 41, and the bind pose
     is solved so the game's rest pose (arms hanging, palms in) holds,
  5. keep ten facial expression morphs (blink, brows, jaw, smile, ...),
     which every shell inherits, so beards follow the jaw.

Output: assets/chars/<id>.mhc, a small binary the game reads directly
(see js/assets.js).
"""
import json, math, os, struct, sys, warnings
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'chars')
MH = os.environ.get('MH_DATA', os.path.join(HERE, '.mh', 'makehuman', 'data'))

warnings.filterwarnings('ignore', 'All-NaN')
HIP_Y = 0.41 + 0.4 + 0.085   # the game's hip height before build scale


def clamp(v, a, b): return np.minimum(np.maximum(v, a), b)
def smooth(a, b, x):
    t = clamp((np.asarray(x, dtype=float) - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)
def norm(v):
    n = np.linalg.norm(v, axis=-1, keepdims=True)
    return v / np.maximum(n, 1e-12)
def srgb(hexstr):
    h = hexstr.lstrip('#')
    if len(h) == 3: h = ''.join(c * 2 for c in h)
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])
def mix(a, b, t): return a + (b - a) * t


# ------------------------------------------------------------------ data
def load_obj(path):
    V, faces = [], []
    g = None
    for line in open(path):
        if line.startswith('v '): V.append([float(x) for x in line.split()[1:4]])
        elif line.startswith('g '): g = line.split()[1]
        elif line.startswith('f '):
            faces.append((g, [int(t.split('/')[0]) - 1 for t in line.split()[1:]]))
    return np.array(V), faces


TPATH = {}
def index_targets():
    root = os.path.join(MH, 'targets')
    for d, _, files in os.walk(root):
        for f in files:
            if not f.endswith('.target'): continue
            rel = os.path.relpath(os.path.join(d, f), root)[:-7].replace(os.sep, '/')
            TPATH[rel] = os.path.join(d, f)
            if not rel.startswith(('macrodetails', 'expression')):
                TPATH.setdefault(f[:-7], os.path.join(d, f))


_tcache = {}
def target(name):
    if name not in _tcache:
        rows = [l.split() for l in open(TPATH[name]) if l[:1].isdigit()]
        _tcache[name] = (np.array([int(r[0]) for r in rows], dtype=np.int64),
                         np.array([[float(x) for x in r[1:4]] for r in rows]).reshape(-1, 3))
    return _tcache[name]


def apply(V, name, w):
    if abs(w) < 1e-6: return
    idx, d = target(name)
    V[idx] += d * w


PAIRS = [('incr', 'decr'), ('up', 'down'), ('out', 'in'), ('forward', 'backward'), ('convex', 'concave'), ('max', 'min')]
def modifier(V, name, w, sided=False):
    """'nose-scale-horiz': +w applies ...-incr, -w applies ...-decr."""
    if name.startswith('l-') and not sided:
        for side in ('l-', 'r-'): modifier(V, side + name[2:], w, True)
        return
    if name in TPATH: return apply(V, name, w)
    for pos, neg in PAIRS:
        if f'{name}-{pos}' in TPATH:
            return apply(V, f'{name}-{pos}' if w > 0 else f'{name}-{neg}', abs(w))
    raise KeyError(name)


def tri(s):
    return {'min': max(0.0, 1 - 2 * s), 'average': 1 - abs(2 * s - 1), 'max': max(0.0, 2 * s - 1)}


def macro(V, age=30, muscle=0.5, weight=0.5, height=0.5, prop=0.5, eth=(0, 0, 1)):
    """MakeHuman's macro modifiers for a man of the given age and build."""
    o = float(clamp((age - 25) / 65, 0, 1))
    for a, aw in (('young', 1 - o), ('old', o)):
        if aw <= 0: continue
        for e, ew in zip(('african', 'asian', 'caucasian'), eth):
            apply(V, f'macrodetails/{e}-male-{a}', aw * ew)
        for m, mw in tri(muscle).items():
            for wk, ww in tri(weight).items():
                k = aw * mw * ww
                if k <= 0: continue
                apply(V, f'macrodetails/universal-male-{a}-{m}muscle-{wk}weight', k)
                hk = f'macrodetails/height/male-{a}-{m}muscle-{wk}weight-' + ('maxheight' if height > 0.5 else 'minheight')
                if hk in TPATH: apply(V, hk, k * abs(height - 0.5) * 2)
                pk = f'macrodetails/proportions/male-{a}-{m}muscle-{wk}weight-' + ('idealproportions' if prop > 0.5 else 'uncommonproportions')
                if pk in TPATH: apply(V, pk, k * abs(prop - 0.5) * 2)


# Facial expression units, kept as morph targets for the game.
EXPR = {
    'blink':    ['eye-left-closure', 'eye-right-closure'],
    'wide':     ['eye-left-opened-up', 'eye-right-opened-up'],
    'squint':   ['eye-left-slit', 'eye-right-slit'],
    'browUp':   ['eyebrows-left-up', 'eyebrows-right-up'],
    'browSad':  ['eyebrows-left-inner-up', 'eyebrows-right-inner-up'],
    'browDown': ['eyebrows-left-down', 'eyebrows-right-down'],
    'jaw':      ['mouth-open'],
    'smile':    ['mouth-corner-puller', 'mouth-upward-retraction'],
    'frown':    ['mouth-depression'],
    'teeth':    ['mouth-retraction', 'mouth-parling'],
}


# ------------------------------------------------------------------ bones
GAME_BONES = ['root', 'spine', 'chest', 'neck', 'head']
for s in 'LR':
    GAME_BONES += [f'clav{s}', f'sh{s}', f'el{s}', f'hand{s}', f'hip{s}', f'kn{s}', f'ft{s}']
    for i in range(4): GAME_BONES += [f'f{s}{i}a', f'f{s}{i}b', f'f{s}{i}c']
    GAME_BONES += [f't{s}a', f't{s}b', f't{s}c']
GI = {n: i for i, n in enumerate(GAME_BONES)}
PARENT = {'root': None, 'spine': 'root', 'chest': 'spine', 'neck': 'chest', 'head': 'neck'}
for s in 'LR':
    PARENT.update({f'clav{s}': 'chest', f'sh{s}': f'clav{s}', f'el{s}': f'sh{s}', f'hand{s}': f'el{s}',
                   f'hip{s}': 'root', f'kn{s}': f'hip{s}', f'ft{s}': f'kn{s}',
                   f't{s}a': f'hand{s}', f't{s}b': f't{s}a', f't{s}c': f't{s}b'})
    for i in range(4):
        PARENT.update({f'f{s}{i}a': f'hand{s}', f'f{s}{i}b': f'f{s}{i}a', f'f{s}{i}c': f'f{s}{i}b'})

FACE_BONES = ('head', 'jaw', 'eye', 'special', 'tongue', 'levator', 'oculi', 'orbicularis', 'oris', 'risorius', 'temporalis')


def fold(mh):
    """MakeHuman bone -> [(game bone, share)]."""
    side = mh[-1] if mh.endswith(('.L', '.R')) else ''
    b = mh[:-2] if side else mh
    if b in ('root', 'pelvis'): return [('root', 1)]
    if b in ('spine05', 'spine04', 'spine03'): return [('spine', 1)]
    if b in ('spine02', 'spine01', 'breast'): return [('chest', 1)]
    if b.startswith('neck'): return [('neck', 1)]
    if b.startswith(FACE_BONES): return [('head', 1)]
    if b == 'clavicle': return [('clav' + side, 1)]
    if b == 'shoulder01': return [('clav' + side, 0.4), ('sh' + side, 0.6)]
    if b.startswith('upperarm'): return [('sh' + side, 1)]
    if b.startswith('lowerarm'): return [('el' + side, 1)]
    if b in ('wrist',) or b.startswith('metacarpal'): return [('hand' + side, 1)]
    if b.startswith('finger'):
        f, k = int(b[6]), int(b[8])
        if f == 1: return [(f't{side}' + 'abc'[k - 1], 1)]
        return [(f'f{side}{f - 2}' + 'abc'[k - 1], 1)]
    if b.startswith('upperleg'): return [('hip' + side, 1)]
    if b.startswith('lowerleg'): return [('kn' + side, 1)]
    if b in ('foot',) or b.startswith('toe'): return [('ft' + side, 1)]
    raise KeyError(mh)


def joint_positions(V, J):
    jp = lambda n: V[J[n]].mean(0)
    P = {}
    P['root'] = jp('root____head')
    P['spine'] = jp('spine04____head')
    P['chest'] = jp('spine02____head')
    P['neck'] = jp('neck01____head')
    P['head'] = jp('head____head')
    tips = {}
    for s in 'LR':
        P[f'clav{s}'] = jp(f'clavicle.{s}____head')
        P[f'sh{s}'] = jp(f'upperarm01.{s}____head')
        P[f'el{s}'] = jp(f'lowerarm01.{s}____head')
        P[f'hand{s}'] = jp(f'wrist.{s}____head')
        P[f'hip{s}'] = jp(f'upperleg01.{s}____head')
        P[f'kn{s}'] = jp(f'lowerleg01.{s}____head')
        P[f'ft{s}'] = jp(f'foot.{s}____head')
        for i in range(4):
            for k, c in enumerate('abc'):
                P[f'f{s}{i}{c}'] = jp(f'finger{i + 2}-{k + 1}.{s}____head')
            tips[f'f{s}{i}c'] = jp(f'finger{i + 2}-3.{s}____tail')
        for k, c in enumerate('abc'):
            P[f't{s}{c}'] = jp(f'finger1-{k + 1}.{s}____head')
        tips[f't{s}c'] = jp(f'finger1-3.{s}____tail')
    # The spine sits on the midline; the root is under the hips.
    for n in ('root', 'spine', 'chest', 'neck', 'head'): P[n][0] = 0.0
    P['root'][2] = (P['hipL'][2] + P['hipR'][2]) / 2
    return P, tips


CHAIN = {}   # bone -> the joint its -Y axis points at in the bind pose
for s in 'LR':
    CHAIN.update({f'sh{s}': f'el{s}', f'el{s}': f'hand{s}', f'hip{s}': f'kn{s}', f'kn{s}': f'ft{s}',
                  f't{s}a': f't{s}b', f't{s}b': f't{s}c', f't{s}c': 'tip'})
    for i in range(4):
        CHAIN.update({f'f{s}{i}a': f'f{s}{i}b', f'f{s}{i}b': f'f{s}{i}c', f'f{s}{i}c': 'tip'})
CHAINED = {v for v in CHAIN.values() if v != 'tip'}


def arc(a, b):
    """Shortest rotation taking unit vector a to unit vector b."""
    v = np.cross(a, b); c = float(np.dot(a, b))
    if c < -0.9999: return np.diag([-1.0, -1.0, 1.0])
    K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + K + K @ K / (1 + c)


def quat(R):
    t = np.trace(R)
    if t > 0:
        s = math.sqrt(t + 1) * 2
        return [(R[2, 1] - R[1, 2]) / s, (R[0, 2] - R[2, 0]) / s, (R[1, 0] - R[0, 1]) / s, s / 4]
    i = int(np.argmax(np.diag(R)))
    j, k = (i + 1) % 3, (i + 2) % 3
    s = math.sqrt(1 + R[i, i] - R[j, j] - R[k, k]) * 2
    q = [0, 0, 0, 0]
    q[i] = s / 4; q[j] = (R[j, i] + R[i, j]) / s; q[k] = (R[k, i] + R[i, k]) / s; q[3] = (R[k, j] - R[j, k]) / s
    return q


def solve_bind(P, tips):
    """Local rest offsets in the game's convention (limbs hang along -Y) and
    the local rotations that pose that skeleton onto the mesh."""
    Rw, local, bind = {}, {}, {}
    for n in GAME_BONES:
        p = PARENT[n]
        Rp = Rw[p] if p else np.eye(3)
        off = P[n] - (P[p] if p else 0)
        local[n] = [0.0, -float(np.linalg.norm(off)), 0.0] if n in CHAINED else (Rp.T @ off).tolist()
        if n.startswith('hand'):
            s = n[-1]
            along = norm(P[f'f{s}1a'] - P[n])
            side = norm(P[f'f{s}0a'] - P[f'f{s}3a'])
            Y = -along; Z = norm(side - np.dot(side, Y) * Y); X = np.cross(Y, Z)
            # The game curls fingers toward -sx*X: make that the palm side,
            # judged by the middle finger's natural curl.
            fa, fb = P[f'f{s}1a'], P[f'f{s}1b']
            v = tips[f'f{s}1c'] - fa; fd = norm(fb - fa)
            palm = v - fd * np.dot(v, fd)
            sx = 1 if s == 'L' else -1
            if np.dot(palm, -sx * X) < 0: X, Z = -X, -Z
            W = np.stack([X, Y, Z], axis=1)
        elif n in CHAIN:
            t = CHAIN[n]
            d = norm((tips[n] if t == 'tip' else P[t]) - P[n])
            W = Rp @ arc(np.array([0, -1.0, 0]), Rp.T @ d)
        else:
            W = Rp
        Rw[n] = W
        bind[n] = quat(Rp.T @ W)
    return local, bind


# ------------------------------------------------------------------ surfaces
class Surf:
    """Triangles over an attribute matrix. Columns: pos 0:3, nrm 3:6, colour
    6:9, then named scalar/vector channels (weights, morph deltas, regions)."""
    def __init__(self, A, F, cols):
        self.A, self.F, self.cols = A, np.asarray(F, dtype=np.int64).reshape(-1, 3), cols
    def __getitem__(self, k):
        a, b = self.cols[k]
        return self.A[:, a:b] if b - a > 1 else self.A[:, a]
    def set(self, k, v):
        a, b = self.cols[k]
        if b - a > 1: self.A[:, a:b] = v
        else: self.A[:, a] = v
    def copy(self): return Surf(self.A.copy(), self.F.copy(), self.cols)
    @property
    def P(self): return self.A[:, 0:3]


def vertex_normals(P, F):
    n = np.zeros_like(P)
    fn = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
    for k in range(3): np.add.at(n, F[:, k], fn)
    return norm(n)


def compact(S):
    used = np.unique(S.F)
    remap = -np.ones(len(S.A), dtype=np.int64); remap[used] = np.arange(len(used))
    return Surf(S.A[used], remap[S.F], S.cols)


def clip(S, f):
    """Keep the part of S where the per-vertex field f >= 0, cutting
    triangles along the zero line so edges come out clean."""
    f = np.asarray(f, dtype=float)
    A = [S.A]; n = len(S.A)
    cache = {}
    def cut(i, j):
        key = (min(i, j), max(i, j))
        if key not in cache:
            t = f[i] / (f[i] - f[j])
            A.append((S.A[i] + (S.A[j] - S.A[i]) * t)[None])
            cache[key] = n + len(cache)
        return cache[key]
    out = []
    inside = f >= 0
    for tri_ in S.F:
        ins = inside[tri_]
        c = int(ins.sum())
        if c == 3: out.append(tri_); continue
        if c == 0: continue
        r = int(np.argmax(ins != (c == 2))) if c in (1, 2) else 0
        a, b, d = tri_[r], tri_[(r + 1) % 3], tri_[(r + 2) % 3]
        if c == 1:   # a inside alone
            out.append([a, cut(a, b), cut(a, d)])
        else:        # a outside alone
            ab, ad = cut(a, b), cut(a, d)
            out += [[ab, b, d], [ab, d, ad]]
    S2 = Surf(np.concatenate(A), np.array(out, dtype=np.int64).reshape(-1, 3), S.cols)
    return compact(S2)


def subdivide(S):
    F = S.F
    edges = np.sort(np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]), axis=1)
    uniq, inv = np.unique(edges, axis=0, return_inverse=True)
    mids = (S.A[uniq[:, 0]] + S.A[uniq[:, 1]]) / 2
    n = len(S.A); m = len(F)
    e = inv.reshape(3, m).T + n
    a, b, c = F[:, 0], F[:, 1], F[:, 2]
    ab, bc, ca = e[:, 0], e[:, 1], e[:, 2]
    F2 = np.concatenate([np.stack([a, ab, ca], 1), np.stack([ab, b, bc], 1), np.stack([ca, bc, c], 1), np.stack([ab, bc, ca], 1)])
    return Surf(np.concatenate([S.A, mids]), F2, S.cols)


def neighbours(F, n):
    E = np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]])
    E = np.concatenate([E, E[:, ::-1]])
    deg = np.bincount(E[:, 0], minlength=n).astype(float)
    return E, np.maximum(deg, 1)


def boundary_verts(F, n):
    """Open-edge vertices, and the open edges in their triangle's winding."""
    E = np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]])
    key = E[:, 0] * n + E[:, 1]
    rev = set((E[:, 1] * n + E[:, 0]).tolist())
    be = E[[k not in rev for k in key.tolist()]]
    b = np.zeros(n, bool); b[be.ravel()] = True
    return b, be


def relax(P, F, it=3, lam=0.5, pin=None):
    """Taubin smoothing: a shrink step then an inflate step, so surfaces
    smooth out without sinking into the skin underneath."""
    E, deg = neighbours(F, len(P))
    for _ in range(it):
        for k in (lam, -lam * 1.04):
            avg = np.zeros_like(P); np.add.at(avg, E[:, 0], P[E[:, 1]])
            avg /= deg[:, None]
            d = (avg - P) * k
            if pin is not None: d[pin] = 0
            P = P + d
    return P


def loops(bedges):
    """Chain directed open edges into closed loops of vertex indices."""
    nxt = {int(a): int(b) for a, b in bedges}
    seen, out = set(), []
    for a0 in nxt:
        if a0 in seen: continue
        loop, a = [], a0
        while a not in seen and a in nxt:
            seen.add(a); loop.append(a); a = nxt[a]
        if len(loop) > 2: out.append(loop)
    return out


def roll(S, P_top, N, out, idx, radius, color, sides=8, smooth_it=6, step=0.008):
    """A rolled clay edge: a tube following one boundary loop, resampled at
    even spacing so it stays smooth however the cut fell."""
    idx = np.asarray(idx)
    C0 = (S.P[idx] + P_top[idx]) / 2
    seg = np.linalg.norm(np.roll(C0, -1, 0) - C0, axis=1)
    s_ = np.concatenate([[0], np.cumsum(seg)]); L = s_[-1]
    k = max(8, int(L / step))
    q = np.linspace(0, L, k, endpoint=False)
    j = np.clip(np.searchsorted(s_, q, side='right') - 1, 0, len(idx) - 1)
    f = ((q - s_[j]) / np.maximum(seg[j], 1e-12))[:, None]
    j2 = (j + 1) % len(idx)
    lerpA = lambda X: X[idx[j]] * (1 - f) + X[idx[j2]] * f
    A = lerpA(S.A)
    C = C0[j] * (1 - f) + C0[j2] * f
    n_ = lerpA(N); o0 = lerpA(out)
    r = np.broadcast_to(np.asarray(radius, dtype=float), (len(idx),))
    r = r[j] * (1 - f[:, 0]) + r[j2] * f[:, 0]
    sm = lambda X: X + ((np.roll(X, 1, 0) + np.roll(X, -1, 0)) / 2 - X) * 0.5
    for _ in range(smooth_it): n_, o0, r = sm(n_), sm(o0), sm(r)
    for _ in range(smooth_it * 4): C = sm(C)
    T = norm(np.roll(C, -2, 0) - np.roll(C, 2, 0))
    n_ = norm(n_ - T * (n_ * T).sum(1, keepdims=True))
    o_ = np.cross(T, n_)
    if (o_ * o0).sum() < 0: o_ = -o_; T = -T
    verts, F = [], []
    for jj in range(sides):
        a = 2 * math.pi * jj / sides
        R_ = A.copy()
        d = n_ * math.cos(a) + o_ * math.sin(a)
        R_[:, 0:3] = C + d * r[:, None]
        R_[:, 3:6] = d
        R_[:, 6:9] = color[j] if np.ndim(color) == 2 else color
        verts.append(R_)
    for jj in range(sides):
        for i in range(k):
            a, b = jj * k + i, jj * k + (i + 1) % k
            c, d = ((jj + 1) % sides) * k + i, ((jj + 1) % sides) * k + (i + 1) % k
            F += [[a, d, b], [a, c, d]]
    return Surf(np.concatenate(verts), np.array(F), S.cols)


def shell(S, thick, color, base=0.002, rim=True, smooth_it=2, hem=0.0):
    """Clay layer over the surface S: offset outward by thick (per vertex)
    plus base, with a wall down to the skin along every open edge."""
    S = S.copy()
    N = norm(S['nrm'])
    t = np.broadcast_to(np.asarray(thick, dtype=float), (len(S.A),)).copy()
    bnd, bedges = boundary_verts(S.F, len(S.A))
    # Even out the cut line (and the slivers along it) before building on it.
    if len(bedges):
        for _ in range(4):
            acc = np.zeros((len(S.A), 3)); cnt = np.zeros(len(S.A))
            for a_, b_ in ((0, 1), (1, 0)):
                np.add.at(acc, bedges[:, a_], S.P[bedges[:, b_]]); np.add.at(cnt, bedges[:, a_], 1)
            m_ = cnt > 0
            S.A[m_, 0:3] += (acc[m_] / cnt[m_, None] - S.P[m_]) * 0.5
        S.A[:, 0:3] = relax(S.P, S.F, 2, 0.5, pin=bnd)
    O = S.copy()
    P = S.P + N * (base + t)[:, None]
    if smooth_it: P = relax(P, S.F, smooth_it, 0.5, pin=bnd)
    O.A[:, 0:3] = P
    O.A[:, 6:9] = color if np.ndim(color) == 2 else np.asarray(color)[None]
    if not rim or not len(bedges): return O
    if hem:
        # Rolled hems instead of a wall.
        out = np.zeros((len(S.A), 3))
        ed = np.cross(S.P[bedges[:, 1]] - S.P[bedges[:, 0]], N[bedges[:, 0]])
        for k in (0, 1): np.add.at(out, bedges[:, k], ed)
        out = norm(out)
        rolls = [roll(S, P, N, out, lp, (base + t[lp]) * 0.55 + hem, O.A[lp, 6:9]) for lp in loops(bedges)]
        return merge([O] + rolls)
    # A rounded lip from the top surface down to the skin, on its own
    # vertices so the edge stays crisp. Rings run top -> skin.
    bi = np.unique(bedges)
    # Outward along the skin: right of each open edge (interior is on the left).
    out = np.zeros((len(S.A), 3))
    ed = np.cross(S.P[bedges[:, 1]] - S.P[bedges[:, 0]], N[bedges[:, 0]])
    for k in (0, 1): np.add.at(out, bedges[:, k], ed)
    out = norm(out)
    h = (base + t)[bi]
    rings = []
    for k, (up, side) in enumerate(((1.0, 0.0), (0.82, 0.55), (0.45, 0.85), (0.0, 0.7))):
        R_ = S.A[bi].copy()
        R_[:, 0:3] = S.P[bi] + N[bi] * (base + (h - base) * up)[:, None] + out[bi] * (h * 0.45 * side)[:, None]
        R_[:, 6:9] = O.A[bi, 6:9]
        rings.append(R_)
    nb = len(bi)
    m = -np.ones(len(S.A), dtype=np.int64); m[bi] = np.arange(nb)
    walls = []
    off = len(O.A)
    for k in range(len(rings) - 1):
        o0, o1 = off + k * nb, off + (k + 1) * nb
        for a, b in bedges:
            walls += [[o0 + m[a], o0 + m[b], o1 + m[b]], [o0 + m[a], o1 + m[b], o1 + m[a]]]
    return Surf(np.concatenate([O.A] + rings), np.concatenate([O.F, np.array(walls)]), S.cols)


def merge(parts):
    A, F, off = [], [], 0
    for p in parts:
        A.append(p.A); F.append(p.F + off); off += len(p.A)
    return Surf(np.concatenate(A), np.concatenate(F), parts[0].cols)


def uv_sphere(center, r, cols, ncol, color_fn, weights_bone, segs=28, rings=20, axis=(0, 0, 1.0)):
    """Sphere whose +axis pole faces `axis`; color_fn(theta) -> rgb."""
    z = norm(np.asarray(axis, dtype=float))
    x = norm(np.cross([0, 1.0, 0], z)); y = np.cross(z, x)
    verts, F = [], []
    for i in range(rings + 1):
        th = math.pi * i / rings
        for j in range(segs):
            ph = 2 * math.pi * j / segs
            d = math.sin(th) * math.cos(ph) * x + math.sin(th) * math.sin(ph) * y + math.cos(th) * z
            verts.append((d, th))
    for i in range(rings):
        for j in range(segs):
            a = i * segs + j; b = i * segs + (j + 1) % segs
            c = a + segs; d = b + segs
            F += [[a, c, b], [b, c, d]]
    A = np.zeros((len(verts), ncol))
    for k, (d, th) in enumerate(verts):
        A[k, 0:3] = center + d * r; A[k, 3:6] = d; A[k, 6:9] = color_fn(th)
    a, _ = cols['w']; A[:, a + GI[weights_bone]] = 1
    return Surf(A, np.array(F), cols)


# ------------------------------------------------------------------ looks
# Likeness, per character: MakeHuman macros, then face/body modifiers
# (name: amount, signed; see data/targets for the vocabulary), then the
# caricature (head scale) and dressing.
LOOKS = {
    'dario': dict(age=42, muscle=0.4, weight=0.42, height=0.5, eth=(0, 0.1, 0.9), headK=1.84,
                  mods={'head-round': 0.4, 'head-scale-vert': -0.2, 'l-eye-scale': 0.3, 'nose-scale-vert': 0.2, 'nose-point-width': 0.4,
                        'mouth-scale-horiz': 0.2, 'chin-prominent': -0.2, 'l-ear-scale': 0.2, 'neck-scale-horiz': -0.3, 'mouth-angles': 0.3,
                        'l-eye-height2': 0.3, 'l-cheek-bones': 0.2}),
    'sam': dict(age=38, muscle=0.35, weight=0.3, height=0.25, eth=(0, 0, 1), headK=1.88,
                mods={'head-oval': 0.4, 'l-eye-scale': 0.8, 'l-eye-height2': 0.5, 'l-eye-trans': 0.15, 'nose-scale-horiz': -0.2,
                      'nose-scale-vert': -0.15, 'mouth-scale-horiz': -0.25, 'mouth-lowerlip-volume': -0.2, 'chin-width': -0.3,
                      'chin-prominent': -0.2, 'l-ear-scale': 0.3, 'l-ear-flap': 0.3, 'head-scale-horiz': -0.15, 'neck-scale-horiz': -0.4,
                      'eyebrows-angle': 0.3}),
    'satya': dict(age=58, muscle=0.45, weight=0.55, height=0.45, eth=(0.25, 0.25, 0.5), headK=1.80,
                  mods={'head-oval': 0.6, 'head-scale-vert': 0.25, 'nose-scale-vert': 0.4, 'nose-scale-horiz': 0.25, 'nose-point-width': 0.3,
                        'nose-hump': 0.3, 'l-eye-scale': -0.1, 'mouth-scale-horiz': 0.1, 'chin-height': 0.3, 'forehead-scale-vert': 0.4,
                        'l-ear-scale': 0.4, 'mouth-angles': 0.3}),
    'rauch': dict(age=36, muscle=0.4, weight=0.35, height=0.6, eth=(0, 0, 1), headK=1.80,
                  mods={'head-rectangular': 0.4, 'head-scale-vert': 0.2, 'head-scale-horiz': -0.2, 'nose-scale-vert': 0.35,
                        'nose-hump': 0.3, 'nose-point-width': -0.2, 'l-eye-scale': -0.2, 'l-eye-height2': -0.3,
                        'l-cheek-bones': 0.5, 'chin-prominent': 0.2, 'eyebrows-angle': -0.3}),
    'theo': dict(age=30, muscle=0.4, weight=0.4, height=0.65, eth=(0, 0, 1), headK=1.82,
                 mods={'head-oval': 0.3, 'head-scale-vert': 0.15, 'l-eye-scale': 0.4, 'nose-scale-vert': 0.2, 'nose-point-width': 0.2,
                       'mouth-scale-horiz': 0.3, 'mouth-angles': 0.4, 'chin-prominent': 0.2, 'l-ear-scale': 0.1}),
    'boris': dict(age=36, muscle=0.45, weight=0.45, height=0.55, eth=(0, 0, 1), headK=1.80,
                  mods={'head-square': 0.3, 'l-eye-scale': 0.1, 'nose-scale-vert': 0.2, 'nose-scale-horiz': 0.15, 'mouth-scale-horiz': 0.1,
                        'chin-width': 0.2, 'eyebrows-angle': -0.2, 'l-ear-scale': 0.1}),
    'gates': dict(age=69, muscle=0.35, weight=0.55, height=0.5, eth=(0, 0, 1), headK=1.86,
                  mods={'head-round': 0.4, 'head-fat': 0.3, 'forehead-scale-vert': 0.5, 'nose-scale-horiz': 0.4, 'nose-point-width': 0.6,
                        'nose-scale-vert': 0.25, 'nose-volume': 0.3, 'mouth-scale-horiz': 0.4, 'mouth-angles': 0.5,
                        'mouth-upperlip-volume': -0.2, 'l-eye-scale': -0.15, 'l-eye-height2': -0.3, 'chin-width': 0.3,
                        'l-cheek-volume': 0.4, 'neck-double': 0.4, 'l-ear-scale': 0.3}),
    'zuck': dict(age=41, muscle=0.85, weight=0.55, height=0.4, eth=(0, 0, 1), headK=1.82,
                 mods={'head-round': 0.5, 'head-scale-horiz': 0.1, 'l-eye-scale': 0.7, 'l-eye-height2': 0.4, 'nose-scale-horiz': -0.1,
                       'nose-point-width': 0.2, 'mouth-scale-horiz': -0.1, 'mouth-lowerlip-volume': 0.2, 'chin-width': 0.3,
                       'chin-prominent': -0.1, 'l-ear-scale': 0.6, 'l-ear-flap': 0.5, 'l-cheek-volume': 0.3, 'neck-scale-horiz': 0.4}),
    'jensen': dict(age=62, muscle=0.5, weight=0.55, height=0.45, eth=(0, 0.85, 0.15), headK=1.82,
                   mods={'head-round': 0.5, 'head-scale-horiz': 0.15, 'l-eye-scale': -0.2, 'l-eye-height2': -0.3, 'nose-scale-horiz': 0.2,
                         'nose-point-width': 0.3, 'mouth-scale-horiz': 0.35, 'mouth-angles': 0.5, 'l-cheek-volume': 0.5,
                         'chin-width': 0.2}),
    'elon': dict(age=54, muscle=0.5, weight=0.75, height=0.85, eth=(0, 0, 1), headK=1.82,
                 mods={'head-rectangular': 0.5, 'head-scale-vert': 0.35, 'head-scale-horiz': 0.1, 'chin-height': 0.6, 'chin-width': 0.5,
                       'chin-prominent': 0.4, 'nose-scale-vert': 0.2, 'nose-scale-horiz': 0.2, 'l-eye-scale': -0.15,
                       'mouth-scale-horiz': 0.15, 'mouth-angles': 0.2, 'neck-scale-horiz': 0.4, 'l-cheek-volume': 0.2}),
    'bezos': dict(age=61, muscle=0.95, weight=0.55, height=0.4, eth=(0, 0, 1), headK=1.84,
                  mods={'head-round': 0.4, 'head-scale-horiz': 0.15, 'forehead-scale-vert': 0.3, 'nose-scale-vert': -0.1,
                        'nose-point-width': 0.3, 'l-eye-scale': -0.1, 'mouth-scale-horiz': 0.4, 'mouth-angles': 0.4,
                        'chin-width': 0.4, 'neck-scale-horiz': 0.7, 'l-ear-scale': 0.1}),
    'cook': dict(age=65, muscle=0.35, weight=0.3, height=0.55, eth=(0, 0, 1), headK=1.80,
                 mods={'head-oval': 0.6, 'head-scale-vert': 0.25, 'head-scale-horiz': -0.15, 'nose-scale-vert': 0.4, 'nose-hump': 0.2,
                       'l-eye-scale': -0.2, 'mouth-scale-horiz': -0.1, 'chin-height': 0.3, 'chin-prominent': 0.3, 'l-ear-scale': 0.3}),
    'agi': dict(age=30, muscle=1.0, weight=0.7, height=1.0, eth=(0, 0, 1), headK=1.67,
                mods={'head-square': 0.7, 'chin-width': 0.6, 'l-eye-scale': 0.3, 'neck-scale-horiz': 0.8}),
    'ref': dict(age=55, muscle=0.4, weight=0.45, height=0.5, eth=(0, 0, 1), headK=1.82,
                mods={'head-oval': 0.3, 'nose-scale-vert': 0.3, 'nose-hump': 0.4, 'l-eye-scale': 0.1, 'chin-prominent': -0.2}),
    'vinnie': dict(age=40, muscle=0.5, weight=0.5, height=0.5, eth=(0, 0, 1), headK=1.82,
                   mods={'head-square': 0.4, 'chin-width': 0.4, 'nose-scale-vert': 0.2, 'mouth-scale-horiz': 0.3}),
    'marty': dict(age=50, muscle=0.4, weight=0.8, height=0.4, eth=(0, 0, 1), headK=1.82,
                  mods={'head-round': 0.5, 'head-fat': 0.6, 'nose-scale-horiz': 0.4, 'nose-volume': 0.4, 'neck-double': 0.6}),
}


CARICATURE = 1.7   # how hard each likeness is pushed

# Puppet proportions for everyone: big eyes, a little more nose and mouth.
BASE_MODS = {'l-eye-scale': 1.25, 'l-eye-height2': 0.35, 'l-eye-height1': 0.2, 'nose-scale-vert': 0.15, 'nose-point-width': 0.2,
             'mouth-scale-horiz': 0.1, 'l-ear-scale': 0.2, 'neck-scale-horiz': 0.25, 'l-eye-bag': -0.8}


# ------------------------------------------------------------------ build
def build(defn):
    look = LOOKS[defn['id']]
    V0, faces = load_obj(os.path.join(MH, '3dobjs', 'base.obj'))
    skel = json.load(open(os.path.join(MH, 'rigs', 'default.mhskel')))
    J = {k: np.array(v) for k, v in skel['joints'].items()}
    WM = json.load(open(os.path.join(MH, 'rigs', 'default_weights.mhw')))['weights']
    n = len(V0)

    # Model.
    V = V0.copy()
    macro(V, look['age'], look['muscle'], look['weight'], look['height'], look.get('prop', 0.6), look['eth'])
    mods = dict(BASE_MODS)
    for k2, w in look['mods'].items(): mods[k2] = mods.get(k2, 0) + w * CARICATURE
    for k2, w in mods.items(): modifier(V, k2, w)

    # Expression deltas (relative, applied in the game).
    eth = 'caucasian'
    D = np.zeros((len(EXPR), n, 3))
    for i, names in enumerate(EXPR.values()):
        for t in names:
            idx, d = target(f'expression/units/{eth}/{t}')
            D[i, idx] += d

    # Skin weights folded into the game's bones.
    W = np.zeros((n, len(GAME_BONES)))
    for b, lst in WM.items():
        a = np.array(lst)
        for g, share in fold(b):
            np.add.at(W[:, GI[g]], a[:, 0].astype(np.int64), a[:, 1] * share)
    W /= np.maximum(W.sum(1, keepdims=True), 1e-9)
    region = lambda names: W[:, [GI[x] for x in names]].sum(1)
    wHead = region(['head'])
    wHand = {s: region([f'hand{s}'] + [f'f{s}{i}{c}' for i in range(4) for c in 'abc'] + [f't{s}{c}' for c in 'abc']) for s in 'LR'}
    wFoot = {s: region([f'ft{s}']) for s in 'LR'}

    # Caricature: grow the head about the chin line, chunky hands and feet.
    jp = lambda nm: V[J[nm]].mean(0)
    hj = jp('head____head')
    eyeIdx = {s: sorted({i for g, f in faces if g == f'helper-{s.lower()}-eye' for i in f}) for s in 'LR'}
    eyes = {s: V[eyeIdx[s]].mean(0) for s in 'LR'}
    chinY = V[(wHead > 0.95) & (V[:, 2] > hj[2])][:, 1].min()
    piv = np.array([0, chinY + (hj[1] - chinY) * 0.15, hj[2]])
    K = np.ones(n)
    k = smooth(0.25, 0.95, wHead)
    K = 1 + (look['headK'] - 1) * k
    for s in 'LR':
        wr = jp(f'wrist.{s}____head')
        kh = 1 + 0.22 * smooth(0.3, 0.9, wHand[s])
        V = np.where((kh > 1)[:, None], wr + (V - wr) * kh[:, None], V); K *= kh
        an = jp(f'foot.{s}____head'); an = np.array([an[0], V[:, 1].min(), an[2]])
        kf = 1 + 0.18 * smooth(0.3, 0.9, wFoot[s])
        V = np.where((kf > 1)[:, None], an + (V - an) * kf[:, None], V); K *= kf
    V = piv + (V - piv) * (1 + (look['headK'] - 1) * k)[:, None]
    D *= K[None, :, None]

    # To game units: hips at HIP_Y, feet on the ground, root on the axis.
    P, tips = joint_positions(V, J)
    ground = V[:, 1].min()
    scale = HIP_Y / (P['root'][1] - ground)
    shift = np.array([0, -ground, -P['root'][2]])
    V = (V + shift) * scale; D *= scale
    P = {k2: (v + shift) * scale for k2, v in P.items()}
    tips = {k2: (v + shift) * scale for k2, v in tips.items()}
    eyes = {s: V[eyeIdx[s]].mean(0) for s in 'LR'}
    eyeR = float(np.mean([np.linalg.norm(V[eyeIdx[s]] - eyes[s], axis=1).mean() for s in 'LR']))

    # Region channels used to cut clothes.
    def along(a, b, ws):
        d = P[b] - P[a]
        t = (V - P[a]) @ d / (d @ d)
        return np.where(ws > 0.5, t, np.nan)
    armW = {s: region([f'sh{s}', f'el{s}']) + wHand[s] for s in 'LR'}
    legW = {s: region([f'hip{s}', f'kn{s}', f'ft{s}']) for s in 'LR'}
    tArm = np.nanmax(np.stack([along(f'sh{s}', f'hand{s}', armW[s]) for s in 'LR']), axis=0)
    tLeg = np.nanmax(np.stack([along(f'hip{s}', f'ft{s}', legW[s]) for s in 'LR']), axis=0)
    isArm = np.maximum(armW['L'], armW['R']) > 0.5
    isLeg = np.maximum(legW['L'], legW['R']) > 0.5
    lipW = np.zeros(n)
    for b, lst in WM.items():
        if b.startswith('oris'):
            a = np.array(lst); np.add.at(lipW, a[:, 0].astype(np.int64), a[:, 1])

    groups = {}
    for g, f in faces:
        groups.setdefault(g, []).append(f)
    def tris(g):
        out = []
        for f in groups[g]:
            out += [[f[0], f[i], f[i + 1]] for i in range(1, len(f) - 1)]
        return np.array(out)
    Fbody = tris('body')
    cols = {'pos': (0, 3), 'nrm': (3, 6), 'col': (6, 9)}
    c = 9
    cols['w'] = (c, c + len(GAME_BONES)); c += len(GAME_BONES)
    cols['d'] = (c, c + 3 * len(EXPR)); c += 3 * len(EXPR)
    for name in ('tArm', 'tLeg', 'arm', 'leg', 'foot', 'head', 'lip', 'x0', 'y0', 'z0'):
        cols[name] = (c, c + 1); c += 1
    A = np.zeros((n, c))
    A[:, 0:3] = V
    A[:, 3:6] = vertex_normals(V, np.concatenate([Fbody, tris('helper-upper-teeth'), tris('helper-lower-teeth')]))
    A[:, cols['w'][0]:cols['w'][1]] = W
    A[:, cols['d'][0]:cols['d'][1]] = D.transpose(1, 0, 2).reshape(n, -1)
    for name, v in (('tArm', np.nan_to_num(tArm, nan=-9)), ('tLeg', np.nan_to_num(tLeg, nan=-9)), ('arm', isArm), ('leg', isLeg), ('foot', np.maximum(wFoot['L'], wFoot['R'])),
                    ('head', wHead), ('lip', lipW), ('x0', V[:, 0]), ('y0', V[:, 1]), ('z0', V[:, 2])):
        A[:, cols[name][0]] = v
    base = Surf(A, Fbody, cols)
    ctx = dict(P=P, tips=tips, eyes=eyes, defn=defn, look=look, scale=scale, cols=cols)

    # Head frame for masks: centre and radii of the skull.
    hv = V[wHead > 0.98]
    hc = (hv.max(0) + hv.min(0)) / 2; hr = (hv.max(0) - hv.min(0)) / 2
    hc[0] = 0
    ctx['hc'], ctx['hr'] = hc, hr
    ctx['eyeR'] = eyeR * 0.97
    band = (np.abs(V[:, 0]) < 0.04) & (np.abs(V[:, 1] - P['chest'][1] - 0.06) < 0.03) & (V[:, 2] > 0)
    ctx['chestFront'] = float(V[band, 2].max() - P['chest'][2]) if band.any() else 0.12

    ctx['tris'] = tris
    parts, body = dress(base, ctx)
    S = merge([body] + parts)

    local, bind = solve_bind(P, tips)
    rig = dict(bones=GAME_BONES, local=local, bind=bind, hipY=float(P['root'][1]),
               head=dict(c=hc.tolist(), r=hr.tolist(), eyes={s: e.tolist() for s, e in eyes.items()},
                         eyeR=ctx['eyeR']),
               chest=dict(front=ctx['chestFront'] + ctx.get('clothT', 0.0), neck=float(P['neck'][1] - P['chest'][1])), morphs=list(EXPR))
    return S, rig


# ------------------------------------------------------------------ dressing
def hair_mask(front, back, side=0.14):
    """Scalp above a hairline: `front` height at the forehead, `back` at the
    nape (unit-sphere coordinates of the skull: y up, z forward)."""
    def m(x, y, z):
        bb = (1 - z) / 2
        lim = mix(front, back, smooth(0.05, 1, bb))
        sideburn = side * smooth(0.6, 0.85, np.abs(x)) * smooth(-0.55, -0.3, z) - (1 - smooth(-0.55, -0.3, z))
        lim = np.maximum(lim, sideburn)
        # Keep the ears clear.
        ear = (np.abs(x) > 0.8) & (y < 0.22) & (y > -0.45) & (np.abs(z) < 0.4)
        return np.where(ear, -1, y - lim)
    return m


def bumps(U, count, rmin, rmax, amp, mask, seed):
    """Lumpy curls: the max of round bumps scattered over the scalp."""
    rng = np.random.default_rng(seed)
    out = np.zeros(len(U))
    c = rng.normal(size=(count * 4, 3)); c /= np.linalg.norm(c, axis=1, keepdims=True)
    c = c[mask(c[:, 0], c[:, 1], c[:, 2]) > -0.05][:count]
    for p in c:
        r = rng.uniform(rmin, rmax)
        d = np.arccos(clamp(U @ p, -1, 1)) / r
        out = np.maximum(out, amp * np.sqrt(clamp(1 - d * d, 0, 1)))
    return out


def locks(U, count, flow, length, width, amp, mask, seed):
    """Sculpted clumps of hair: elongated bumps laid along flow(p)."""
    rng = np.random.default_rng(seed)
    out = np.zeros(len(U))
    c = rng.normal(size=(count * 5, 3)); c /= np.linalg.norm(c, axis=1, keepdims=True)
    c = c[mask(c[:, 0], c[:, 1], c[:, 2]) > 0.03][:count]
    for p in c:
        f = flow(p); f = f - p * (f @ p); f /= max(np.linalg.norm(f), 1e-9)
        q = U - p
        a = q @ f; b = np.linalg.norm(q - np.outer(a, f) - np.outer(q @ p, p), axis=1)
        L = length * rng.uniform(0.7, 1.3)
        d = (a / L) ** 2 + (b / width) ** 2
        prof = amp * rng.uniform(0.7, 1.2) * np.sqrt(clamp(1 - d, 0, 1)) * (0.6 + 0.4 * clamp(0.5 - a / L, 0, 1))
        out = np.maximum(out, prof)
    return out


def drape(P, sel, origin, axis, top=None, nb=40, band=0.02, keep=0.97, cap=0.07):
    """Cloth hangs straight instead of hugging the body: for vertices in
    `sel`, how far out they must move so each angular column around `axis`
    is at least as wide as everything above it (down from `top`)."""
    out = np.zeros(len(P))
    if not sel.any(): return out
    a = axis / np.linalg.norm(axis)
    q = P[sel] - origin
    h = q @ a                                     # along the axis (up is +)
    rad = q - np.outer(h, a)
    r = np.linalg.norm(rad, axis=1)
    ref = np.cross(a, [0, 0, 1.0]); ref = ref / np.linalg.norm(ref) if np.linalg.norm(ref) > 1e-6 else np.array([1.0, 0, 0])
    th = np.arctan2(rad @ np.cross(a, ref), rad @ ref)
    tb = ((th + np.pi) / (2 * np.pi) * nb).astype(int) % nb
    hb = np.floor(h / band).astype(int)
    h0, h1 = hb.min(), hb.max()
    grid = np.zeros((h1 - h0 + 1, nb))
    np.maximum.at(grid, (hb - h0, tb), r)
    # Fill gaps between angular bins, then carry widths downward.
    for _ in range(2): grid = np.maximum(grid, (np.roll(grid, 1, 1) + np.roll(grid, -1, 1)) / 2 * 0.98)
    lim = h1 - h0 if top is None else int(np.floor(top / band)) - h0
    for i in range(min(lim, len(grid) - 1) - 1, -1, -1):
        grid[i] = np.maximum(grid[i], grid[i + 1] * keep)
    tgt = grid[hb - h0, tb]
    out[sel] = clamp(tgt - r, 0, cap)
    return out


def sneaker(base, side, upper, sole, accent=None, boot=False):
    """A sculpted shoe around one foot: flat sole, rounded toe box, a heel
    counter that rises to the ankle, and a tongue. Bound to the foot bone."""
    sx = 1 if side == 'L' else -1
    sel = (base['foot'] > 0.5) & (base['x0'] * sx > 0)
    p = base.P[sel]
    heel, toe = p[:, 2].min() - 0.012, p[:, 2].max() + 0.02
    L = toe - heel
    cx = float(np.median(p[:, 0])); W = (np.percentile(p[:, 0], 98) - np.percentile(p[:, 0], 2)) / 2 + 0.014
    top = float(np.percentile(p[:, 1], 90))
    segs, rings = 40, 32
    verts, F = [], []
    for i in range(rings + 1):
        th = math.pi * i / rings              # 0 at the heel, pi at the toe
        u = (1 - math.cos(th)) / 2           # 0..1 heel -> toe
        r = math.sin(th) ** 0.55             # rounder ends than an ellipsoid
        w = W * (0.82 + 0.25 * math.sin(math.pi * min(1, u * 1.25)) ** 0.8) * r
        h = (top + (0.05 if boot else 0.012)) * (1 - 0.5 * smooth(0.25, 0.9, u)) + 0.008
        if u < 0.12: h *= 0.75 + 0.25 * u / 0.12 if not boot else 1
        for j in range(segs):
            ph = 2 * math.pi * j / segs
            cy, cz = math.cos(ph), math.sin(ph)  # cy: across, cz: up
            x = cx + sx * w * cy * (1 + 0.06 * (cz < 0))
            y = max(0.0, h * (0.5 + 0.5 * cz) * (r ** 0.3 if cz > 0 else 1))
            z = heel + L * u
            verts.append((x, y, z, cz, cy, u))
    for i in range(rings):
        for j in range(segs):
            a = i * segs + j; b = i * segs + (j + 1) % segs
            c = a + segs; d = b + segs
            F += [[a, b, d], [a, d, c]] if sx > 0 else [[a, d, b], [a, c, d]]
    A = np.zeros((len(verts), base.A.shape[1]))
    v = np.array(verts)
    A[:, 0:3] = v[:, :3]
    A[:, 3:6] = norm(v[:, :3] - np.array([cx, 0.03, heel + L / 2]))
    up_c, so_c = srgb(upper), srgb(sole)
    col = np.tile(up_c, (len(v), 1))
    col[v[:, 1] < 0.024] = so_c                                  # sole
    if accent is not None:
        toe_cap = (v[:, 5] > 0.82) & (v[:, 1] < 0.05)
        col[toe_cap] = so_c
        stripe = (np.abs(v[:, 4]) > 0.75) & (v[:, 1] > 0.03) & (v[:, 1] < 0.055) & (v[:, 5] > 0.3) & (v[:, 5] < 0.7)
        col[stripe] = srgb(accent)
    A[:, 6:9] = col
    a0, _ = base.cols['w']; A[:, a0 + GI['ft' + side]] = 1
    for k_, i_ in (('x0', 0), ('y0', 1), ('z0', 2)): A[:, base.cols[k_][0]] = v[:, i_]
    A[:, base.cols['foot'][0]] = 1
    S = Surf(A, np.array(F), base.cols)
    S.A[:, 0:3] = relax(S.P, S.F, 3, 0.4)
    S.A[:, 1] = np.maximum(S.A[:, 1], 0)
    # Tongue and laces: a raised strip over the instep.
    return S


def dress(base, ctx):
    d = ctx['defn']; cols = ctx['cols']; P = ctx['P']; look = ctx['look']
    skin = srgb(d['skin'])
    hc, hr = ctx['hc'], ctx['hr']
    R = float(hr[0])
    tris = ctx['tris']
    parts = []

    def U(S):
        u = (np.stack([S['x0'], S['y0'], S['z0']], 1) - hc) / hr
        return u / np.maximum(np.linalg.norm(u, axis=1, keepdims=True), 1e-9)

    # --- clothing fields, in metres-ish, >= 0 inside the garment.
    armL = float(np.linalg.norm(P['handL'] - P['shL']))
    legL = float(np.linalg.norm(P['ftL'] - P['hipL']))
    neckY, chestY, rootY = P['neck'][1], P['chest'][1], P['root'][1]
    neckZ = P['neck'][2]

    def F_top(S, sleeve, hem, vdepth=0.0, high=0.0, open_=None):
        x, y, z = S['x0'], S['y0'], S['z0']
        arm = S['arm'] > 0.5
        back = smooth(0.0, -0.06, z - neckZ)
        cut = neckY - 0.012 + high + 0.035 * back
        if vdepth: cut = cut - vdepth * clamp(1 - np.abs(x) / 0.09, 0, 1) * (z > neckZ)
        f = np.minimum(y - hem, cut - y)
        if open_ is not None: f = np.where(z > neckZ - 0.02, np.minimum(f, np.abs(x) - open_(y)), f)
        f = np.where(arm, (sleeve - S['tArm']) * armL, f)
        return np.where(S['head'] > 0.6, -1.0, f)

    def F_pants(S, hemT=0.985):
        y = S['y0']
        f = np.where(S['leg'] > 0.5, (hemT - S['tLeg']) * legL, rootY + 0.09 - y)
        return np.where((S['arm'] > 0.5) | (S['head'] > 0.5), -1.0, f)

    def F_shoe(S):
        f = np.where(S['leg'] > 0.5, np.maximum((S['tLeg'] - 0.955) * legL, (S['foot'] - 0.5) * 0.1), -1.0)
        return f

    def layer(f, color, base_off, thick, cuff=0.6, sub=False, hang=1.0, sleeve=0.006):
        S = clip(base, f(base))
        if sub:
            S = subdivide(S)
            S.A[:, 0:3] = relax(S.P, S.F, 1, 0.4, pin=boundary_verts(S.F, len(S.A))[0])
        S.A[:, 3:6] = norm(S.A[:, 3:6])
        torso = (S['arm'] < 0.5) & (S['y0'] < chestY + 0.08)
        t = thick + hang * drape(S.P, torso, np.array([0, 0, P['chest'][2]]), np.array([0, 1.0, 0]), top=chestY + 0.06, keep=0.997, nb=56, band=0.015)
        t = t + np.where(S['arm'] > 0.5, sleeve, 0)
        for s_ in 'LR':
            sx = 1 if s_ == 'L' else -1
            arm = (S['arm'] > 0.5) & (S['x0'] * sx > 0)
            ax = P['sh' + s_] - P['hand' + s_]
            t = t + 0.85 * drape(S.P, arm, P['hand' + s_], ax, keep=0.992, nb=24, band=0.015, cap=0.025)
        return shell(S, t, color, base=base_off, smooth_it=14, hem=0.004 * cuff / 0.6)

    top = d['top']; tt = top['type']
    shirt = srgb(top['color']); inner = srgb(top.get('inner', top['color']))
    pants = srgb(d['bottom']['color'])
    shoes = d.get('shoes', {'color': '#222222', 'sole': '#eeeeee'})
    covered = []

    # Trousers, with a darker waistband.
    fp = lambda S: F_pants(S)
    Sp = clip(base, fp(base))
    Sp.A[:, 3:6] = norm(Sp.A[:, 3:6])
    # Trouser legs hang loose below the knee.
    loose = np.where(Sp['leg'] > 0.5, 0.012, 0.008)
    for s_ in 'LR':
        sx = 1 if s_ == 'L' else -1
        leg = (Sp['leg'] > 0.5) & (Sp['x0'] * sx > 0) & (Sp['tLeg'] > 0.08)
        ax = P['hip' + s_] - P['ft' + s_]
        loose += drape(Sp.P, leg, P['ft' + s_], ax, top=float((P['hip' + s_] - P['ft' + s_]) @ ax / np.linalg.norm(ax)) - 0.1, keep=0.965, cap=0.05) * 0.9
    Pn = shell(Sp, loose, pants, base=0.006, smooth_it=8, hem=0.003)
    belt = (Pn['y0'] > rootY + 0.065)
    Pn.A[belt, 6:9] = pants * 0.55
    parts.append(Pn); covered.append(fp)

    # Shoes: chunky, flat-soled.
    for s_ in 'LR':
        parts.append(sneaker(base, s_, shoes['color'], shoes['sole'], shoes.get('accent'), boot=shoes.get('boot', False)))
    covered.append(F_shoe)

    hem = rootY + 0.01
    long_ = 0.965
    if tt != 'shirtless':
        if tt in ('tee', 'vneck'):
            f1 = lambda S: F_top(S, 0.4, hem, vdepth=0.06 if tt == 'vneck' else 0.0)
            col1 = shirt
        elif tt == 'sweater':
            f1 = lambda S: F_top(S, long_, hem - 0.01)
            col1 = shirt
        elif tt == 'quarterzip':
            f1 = lambda S: F_top(S, long_, hem - 0.01, high=0.07)
            col1 = shirt
        elif tt == 'hoodie':
            f1 = lambda S: F_top(S, long_, hem - 0.03)
            col1 = shirt
        else:   # blazer / leather / vest / shirt: a shirt underneath
            f1 = lambda S: F_top(S, long_, hem, vdepth=0.03 if tt in ('blazer', 'leather') else 0.0)
            col1 = inner if tt in ('blazer', 'leather', 'vest') else shirt
        thick = 0.012 if tt != 'hoodie' else 0.02
        T1 = layer(f1, col1, 0.014, thick)
        if tt == 'quarterzip':
            z = (np.abs(T1['x0']) < 0.007) & (T1['z0'] > neckZ) & (T1['y0'] > chestY - 0.1)
            T1.A[z, 6:9] = np.array([0.62, 0.62, 0.66])
        if tt == 'sweater':
            rib = (T1['y0'] > neckY - 0.03) & (T1['arm'] < 0.5)
            T1.A[rib, 6:9] = shirt * 0.85
        parts.append(T1); covered.append(f1)
        ctx['clothT'] = 0.026
        if tt in ('blazer', 'leather'):
            opening = lambda y: 0.015 + clamp((y - (chestY - 0.12)) * 0.55, 0, 0.2)
            f2 = lambda S: F_top(S, 0.94, hem - 0.06, high=0.015, open_=opening)
            J2 = layer(f2, shirt, 0.03, 0.013, cuff=0.4)
            fv = f2(J2)
            lapel = (fv < 0.03) & (J2['z0'] > neckZ - 0.02) & (J2['y0'] > chestY - 0.12) & (J2['arm'] < 0.5)
            J2.A[lapel, 6:9] = shirt * 0.72
            parts.append(J2)
            ctx['clothT'] = 0.045
        if tt == 'vest':
            f2 = lambda S: F_top(S, -1, hem - 0.03, high=0.04, open_=lambda y: np.full_like(y, 0.004))
            V2 = clip(base, f2(base))
            V2 = subdivide(V2)
            puff = 0.03 * (0.75 + 0.25 * np.cos(V2['y0'] * 2 * np.pi / 0.075))
            V2 = shell(V2, puff, shirt, base=0.03, smooth_it=1)
            parts.append(V2)
            ctx['clothT'] = 0.06
        if tt == 'hoodie':
            hood = lambda S: np.where(S['arm'] > 0.5, -1.0, np.minimum(np.minimum(S['y0'] - (neckY - 0.06), neckY + 0.1 - S['y0']), neckZ + 0.01 - S['z0']))
            H = clip(base, hood(base))
            H = shell(subdivide(H), 0.05 * smooth(0, 0.04, hood(subdivide(H))) + 0.01, shirt * 0.9, base=0.03, smooth_it=4)
            parts.append(H)

    # --- skin: hidden where clothes cover it, lips and stubble painted.
    keep = lambda S: 0.012 - np.max(np.stack([np.maximum(f(S), -1) for f in covered]), axis=0)
    body = clip(base, keep(base)) if covered else base.copy()
    lips = srgb(d['lips']) if d.get('lips') else skin * np.array([0.84, 0.58, 0.58])
    body.A[:, 6:9] = mix(skin[None], lips[None], smooth(0.45, 0.85, body['lip'])[:, None] * 0.75)
    fh = d.get('facial', {})
    Ub = U(body)

    # --- head: hair, brows, beards.
    def head_layer(mask_fn, thick_fn, color, base_off=0.002, sub=1, smooth_it=2, region=None):
        S = base
        f = np.where(S['head'] > 0.5, mask_fn(*U(S).T), -1.0)
        if region is not None: f = np.minimum(f, region(S))
        S = clip(S, f)
        for _ in range(sub): S = subdivide(S)
        S.A[:, 3:6] = norm(S.A[:, 3:6])
        u = U(S)
        m = mask_fn(*u.T)
        t = thick_fn(u, m)
        col = color(u) if callable(color) else color
        return shell(S, t, col, base=base_off, smooth_it=smooth_it)

    hair = d.get('hair', {}); style = hair.get('style')
    hcol = srgb(hair.get('color', '#333333')); hcol2 = srgb(hair['color2']) if hair.get('color2') else hcol * 0.8
    streak = lambda k: (lambda u: mix(hcol[None], hcol2[None], 0.55 * ((0.5 + 0.5 * np.sin(u[:, 0] * k + u[:, 2] * 3)) * (0.5 + 0.5 * np.sin(u[:, 1] * k * 0.7 + 1)))[:, None]))
    edge = lambda m: 0.35 + 0.65 * smooth(0.0, 0.1, m)
    seed = sum(map(ord, d['id']))
    back_flow = lambda p: np.array([p[0] * 0.25, -0.25, -1.0])
    fringe_flow = lambda p: np.array([p[0] * 0.4 + 0.25, -0.8, 0.6]) if p[2] > 0.25 and p[1] > 0.3 else back_flow(p)
    wobble = lambda u: 0.025 * np.sin(u[:, 0] * 11 + 1.3) + 0.02 * np.sin(u[:, 2] * 7)
    if style in ('short', 'swept', 'sidepart', 'receding', 'curly', 'tightcurls', 'long'):
        fr = hair.get('fringe', 0.4)
        if style == 'short':
            mk0 = hair_mask(0.5 - 0.08 * fr, -0.38)
            mk = lambda x, y, z: mk0(x, y, z) + 0.025 * np.sin(x * 9 + 1) * (z > 0.3)
            th = lambda u, m: R * edge(m) * (0.06 + 0.05 * smooth(0.2, 0.9, u[:, 1])) + R * locks(u, 46, fringe_flow, 0.32, 0.12, 0.05 + 0.04 * fr, mk, seed)
            parts.append(head_layer(mk, th, streak(9), sub=1))
        elif style == 'receding':
            # Short hair, high temples, a thin forelock in the middle.
            mk = lambda x, y, z: hair_mask(0.52, -0.36)(x, y, z) - np.where(z > 0.3, 0.1 * smooth(0.15, 0.4, np.abs(x)) * smooth(0.3, 0.7, z), 0)
            th = lambda u, m: R * edge(m) * 0.04 + R * locks(u, 30, back_flow, 0.3, 0.1, 0.012, mk, seed)
            parts.append(head_layer(mk, th, streak(13), sub=1))
        elif style == 'curly':
            mk = hair_mask(0.4, -0.38)
            th = lambda u, m: R * edge(m) * (0.08 + 0.06 * smooth(0.2, 0.9, u[:, 1])) + R * bumps(u, 150, 0.11, 0.18, 0.1, mk, seed)
            parts.append(head_layer(mk, th, streak(7), sub=2, smooth_it=1))
        elif style == 'tightcurls':
            mk = hair_mask(0.47, -0.38)
            th = lambda u, m: R * edge(m) * (0.05 + 0.02 * smooth(0.2, 0.9, u[:, 1])) + R * bumps(u, 240, 0.065, 0.1, 0.05, mk, seed)
            parts.append(head_layer(mk, th, streak(11), sub=2, smooth_it=1))
        elif style == 'swept':
            mk = hair_mask(0.5, -0.38)
            th = lambda u, m: R * edge(m) * (0.06 + 0.11 * smooth(0.25, 0.95, u[:, 1]) * smooth(-0.3, 0.7, u[:, 2])) + R * locks(u, 40, back_flow, 0.55, 0.13, 0.045, mk, seed)
            parts.append(head_layer(mk, th, streak(22), sub=1))
        elif style == 'sidepart':
            mk = hair_mask(0.5 - 0.05 * fr, -0.38)
            side_flow = lambda p: np.array([-1.0 if p[0] < 0.36 else 1.0, -0.35, 0.15 if p[2] > 0.3 else -0.6])
            part = lambda u: np.exp(-((u[:, 0] - 0.36) ** 2) / 0.002) * smooth(0.0, 0.5, u[:, 2] + 0.3)
            th = lambda u, m: R * edge(m) * (0.06 + 0.05 * smooth(0.3, 0.9, u[:, 1]) + 0.05 * fr * smooth(0.3, 0.9, u[:, 2]) * (u[:, 0] < 0.36)
                                             - 0.03 * part(u)) + R * locks(u, 36, side_flow, 0.45, 0.13, 0.04, mk, seed)
            parts.append(head_layer(mk, th, streak(10), sub=1))
        elif style == 'long':
            mk = hair_mask(0.48, -0.75, 0.3)
            down = lambda p: np.array([p[0] * 0.6, -1.0, -0.3 if p[2] < 0.3 else 0.2])
            th = lambda u, m: R * edge(m) * (0.07 + 0.05 * smooth(0.3, 0.9, u[:, 1])) + R * locks(u, 50, down, 0.5, 0.11, 0.04, mk, seed)
            parts.append(head_layer(mk, th, streak(25), sub=1))
            # Hair falling down the back of the neck to the shoulders.
            cape = lambda S: np.where((S['arm'] > 0.5) | (S['head'] > 0.5), -1.0,
                                      np.minimum(np.minimum(S['y0'] - (neckY - 0.07), neckZ - 0.005 - S['z0']), 0.075 - np.abs(S['x0']) * 0.6))
            C = clip(base, cape(base))
            C = subdivide(C)
            C = shell(C, 0.03 + 0.008 * np.sin(C['x0'] * 90), streak(25)(np.stack([C['x0'] * 3, C['y0'], C['z0']], 1)), base=0.045, smooth_it=3)
            parts.append(C)
    elif style == 'balding':
        mk = lambda x, y, z: np.minimum(np.minimum(y + 0.38, 0.2 - y), np.where(z > -0.35, np.abs(x) - 0.62, 1))
        th = lambda u, m: R * edge(m) * 0.035
        parts.append(head_layer(mk, th, hcol))

    # Brows: a band of clay above each eye; they ride the brow morphs.
    bro = d.get('brows', {})
    bc = srgb(bro.get('color', '#2a2018')); bthick = bro.get('thick', 1.0); arch = bro.get('arch', 0.25)
    eu = {s: (ctx['eyes'][s] - hc) / hr for s in 'LR'}
    def brow_mask(x, y, z):
        best = -np.ones_like(x)
        for s in 'LR':
            e = eu[s]
            xx = (x - e[0]) / 0.3 * (1 if s == 'L' else -1)   # +1 at the temple
            yc = e[1] + 0.2 + arch * 0.06 * (1 - (xx - 0.1) ** 2)
            hw = 0.045 * bthick * (1.1 - 0.35 * clamp(xx, 0, 1))
            m = np.minimum(np.minimum(np.minimum(1.0 - xx, xx + 0.62), hw - np.abs(y - yc)), z - 0.25) * 1.0
            best = np.maximum(best, m)
        return best
    parts.append(head_layer(brow_mask, lambda u, m: R * 0.022 * smooth(0, 0.02, m), bc, sub=1, smooth_it=2))

    # Beards follow the jaw morph.
    lipc = (np.stack([base['x0'], base['y0'], base['z0']], 1)[base['lip'] > 0.5]).mean(0)
    mu = (lipc - hc) / hr; mu /= np.linalg.norm(mu)
    ey = (eu['L'][1] + eu['R'][1]) / 2 / np.linalg.norm(eu['L'])
    def jaw_mask(frac, stache=False):
        # Beard line: under the lower lip at the chin, rising to `frac` of
        # the way from mouth to eyes along the cheeks.
        side = mu[1] + frac * (ey - mu[1])
        def m(x, y, z):
            lim = mix(mu[1] - 0.075, side, smooth(0.12, 0.55, np.abs(x)))
            f = lim - y
            if stache: f = np.maximum(f, np.minimum(mu[1] + 0.11 - y, 0.3 - np.abs(x)))
            mouth = np.minimum(0.2 - np.abs(x - mu[0]), 0.042 - np.abs(y - mu[1] + 0.005))
            f = np.minimum(f, -mouth)
            return np.where(z < -0.25, -1.0, f)
        return m
    if fh.get('stubble'):
        st = smooth(0.0, 0.08, jaw_mask(0.45)(*Ub.T)) * (body['head'] > 0.5)
        body.A[:, 6:9] = mix(body.A[:, 6:9], srgb(fh['stubble'])[None], st[:, None] * 0.55)
    for key, frac, t in (('beardShort', 0.38, 0.014), ('beard', 0.5, 0.026)):
        if fh.get(key):
            mk = jaw_mask(frac, stache=key == 'beard')
            parts.append(head_layer(mk, lambda u, m, t=t: R * (t * edge(m) + 0.006 * np.sin(u[:, 0] * 40) * smooth(0, 0.05, m)), srgb(fh[key]), sub=1))
    if fh.get('mustache'):
        def must(x, y, z):
            return np.minimum(np.minimum(0.34 - np.abs(x - mu[0]) - (y - mu[1]) * 0.8, mu[1] + 0.13 - y), y - (mu[1] + 0.035)) * (z > 0.3) - (z <= 0.3)
        parts.append(head_layer(must, lambda u, m: R * 0.035 * smooth(0, 0.04, m), srgb(fh['mustache']), sub=2))

    # Eyes and teeth.
    for g, c in (('helper-upper-teeth', '#f4f0e6'), ('helper-lower-teeth', '#f4f0e6')):
        T = compact(Surf(base.A.copy(), tris(g), cols))
        T.A[:, 6:9] = srgb(c)
        parts.append(T)
    ey = d['head'].get('eye', {})
    iris = srgb(ey.get('iris', '#4a3524'))
    def eye_col(th):
        if th < 0.22: return np.array([0.02, 0.02, 0.02])
        if th < 0.5: return iris * (0.8 + 0.6 * (th - 0.22))
        if th < 0.55: return iris * 0.35
        return np.array([0.96, 0.95, 0.92])
    for s_ in 'LR':
        e = ctx['eyes'][s_]
        look_dir = norm(np.array([0.0, 0.0, 1.0]) + np.array([(1 if s_ == 'L' else -1) * 0.06, 0, 0]))
        parts.append(uv_sphere(e, ctx['eyeR'], cols, base.A.shape[1], eye_col, 'head', axis=look_dir))
    return parts, body


# ------------------------------------------------------------------ output
def write(path, S, rig):
    """MHC2: gzip of [magic, header length, JSON header, blobs]. Positions
    are 16-bit within the bounding box, morph deltas 16-bit per morph."""
    import gzip
    n = len(S.A)
    W = S['w']
    top = np.argsort(-W, axis=1)[:, :4]
    tw = np.take_along_axis(W, top, 1)
    tw /= np.maximum(tw.sum(1, keepdims=True), 1e-9)
    blobs, meta = [], {}
    def add(name, arr, kind, **extra):
        b = arr.tobytes()
        meta[name] = dict(type=kind, offset=sum(len(x) for x in blobs), count=int(arr.size), **extra)
        blobs.append(b + b'\0' * (-len(b) % 4))
    lo, hi = S.P.min(0), S.P.max(0)
    q = np.round((S.P - lo) / (hi - lo) * 65535).astype(np.uint16)
    add('position', q, 'u16', lo=lo.tolist(), hi=hi.tolist())
    add('color', (clamp(S['col'], 0, 1) * 255 + 0.5).astype(np.uint8), 'u8')
    add('skinIndex', top.astype(np.uint8), 'u8')
    add('skinWeight', (tw * 255 + 0.5).astype(np.uint8), 'u8')
    add('index', S.F.astype(np.uint32 if n > 65535 else np.uint16), 'u32' if n > 65535 else 'u16')
    D = S['d'].reshape(n, len(EXPR), 3)
    for i, name in enumerate(EXPR):
        d = D[:, i]
        idx = np.nonzero(np.abs(d).max(1) > 1e-5)[0]
        sc = float(np.abs(d[idx]).max()) / 32767 if len(idx) else 1.0
        add('morph:' + name + ':idx', idx.astype(np.uint32), 'u32')
        add('morph:' + name + ':d', np.round(d[idx] / sc).astype(np.int16), 'i16', scale=sc)
    head = json.dumps(dict(rig=rig, vertices=n, buffers=meta)).encode()
    head += b' ' * (-len(head) % 4)
    raw = b'MHC2' + struct.pack('<I', len(head)) + head + b''.join(blobs)
    with open(path, 'wb') as f: f.write(gzip.compress(raw, 9))


if __name__ == '__main__':
    index_targets()
    defs = json.load(open(os.path.join(HERE, 'characters.json')))
    want = [a for a in sys.argv[1:] if not a.startswith('-')]
    os.makedirs(OUT, exist_ok=True)
    for d in defs:
        if want and d['id'] not in want: continue
        S, rig = build(d)
        path = os.path.join(OUT, d['id'] + '.mhc')
        write(path, S, rig)
        print(f"{d['id']}: {len(S.A)} verts, {len(S.F)} tris -> {os.path.relpath(path)} ({os.path.getsize(path) // 1024} KB)", flush=True)
