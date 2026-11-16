"""Per-frame body + head motion of a reference character from colour frames.
Body = pixels matching a colour box (RGB min/max) inside a search window; head = flood-filled skin from a seed.
For each: centroid, principal-axis angle (lean), height/width (squash). Prints values per frame relative to frame 0.
usage: bodytrack.py <rgb png dir> f0 f1 <win x0 y0 x1 y1> <rmin gmin bmin rmax gmax bmax> <head seed x y>"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__)); import refstudy, numpy as np
from collections import deque
d = sys.argv[1]; f0, f1 = int(sys.argv[2]), int(sys.argv[3]); x0, y0, x1, y1 = map(int, sys.argv[4:8]); lo = np.array(list(map(int, sys.argv[8:11]))); hi = np.array(list(map(int, sys.argv[11:14]))); hx, hy = map(int, sys.argv[14:16])
def axis(xs, ys):
    cx, cy = xs.mean(), ys.mean(); C = np.cov(np.vstack([xs - cx, ys - cy])); ev, v = np.linalg.eigh(C); v = v[:, 1]
    if v[1] < 0: v = -v
    return cx, cy, np.degrees(np.arctan2(v[0], v[1])), np.sqrt(ev[1] / max(ev[0], 1e-6))
base = None; out = []
for f in range(f0, f1 + 1):
    a = refstudy.read_png(os.path.join(d, f"f_{f:04d}.png"))[:, :, :3].astype(np.int32); H, W = a.shape[:2]
    win = a[y0:y1, x0:x1]; m = np.all((win >= lo) & (win <= hi), axis=2); ys, xs = np.nonzero(m)
    if len(xs) < 200: out.append((f, None)); continue
    bx, by, bang, bel = axis(xs + x0, ys + y0); bh = np.percentile(ys, 98) - np.percentile(ys, 2); bw = np.percentile(xs, 98) - np.percentile(xs, 2)
    g = a.mean(2)
    if g[hy, hx] < 170:
        for r in range(2, 30, 2):
            c = [(hx + dx, hy + dy) for dx, dy in ((r, 0), (-r, 0), (0, r), (0, -r)) if 0 <= hx + dx < W and 0 <= hy + dy < H and g[hy + dy, hx + dx] >= 190]
            if c: hx, hy = c[0]; break
    mm = np.zeros((H, W), bool); q = deque([(hx, hy)]); mm[hy, hx] = True; n = 0
    while q and n < 150000:
        x, y = q.popleft(); n += 1
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < W and 0 <= ny < H and not mm[ny, nx] and g[ny, nx] >= 175: mm[ny, nx] = True; q.append((nx, ny))
    hys, hxs = np.nonzero(mm); hcx, hcy = hxs.mean(), hys.mean(); hw = (np.percentile(hxs, 99.5) - np.percentile(hxs, 0.5)) / 2; hh = np.percentile(hys, 99.5) - np.percentile(hys, 0.5); hx, hy = int(hcx), int(hcy)
    r = (bx, by, bang, bh, bw, hcx, hcy, hw, hh, len(hxs), len(xs))
    if base is None: base = r
    out.append((f, r))
U = base[7]
print(f"unit = head half-width {U:.1f}px;  body: dx dy lean(deg) h% w%   head: dx dy (relative to body centre)")
for f, r in out:
    if not r: print(f, "lost"); continue
    print(f"{f:<4} body {(r[0]-base[0])/U:+.3f} {(r[1]-base[1])/U:+.3f} lean {r[2]-base[2]:+5.1f}  h {100*r[3]/base[3]:6.1f} w {100*r[4]/base[4]:6.1f} area {100*r[10]/base[10]:6.1f} | head x {(r[5]-base[5])/U:+.3f} y {(r[6]-base[6])/U:+.3f} rel-y {((r[6]-r[1])-(base[6]-base[1]))/U:+.3f}  w {100*r[7]/base[7]:6.1f} h {100*r[8]/base[8]:6.1f} area {100*r[9]/base[9]:6.1f}")
