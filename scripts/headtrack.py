"""Track a face (flood-filled skin) frame by frame: centre x/y, half-width (scale), tilt (from the face mask's
principal axis), and the body box below it. Prints per-frame motion in units of the face half-width.
usage: .tools/py/bin/python3 scripts/headtrack.py <gray dir 540x960> <f0> <f1> <seed x> <seed y>"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__)); import refstudy, numpy as np
from collections import deque
d, f0, f1, sx, sy = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
rows = []
for f in range(f0, f1 + 1):
    a = refstudy.read_png(os.path.join(d, f"f_{f:04d}.png")).astype(np.int32); H, W = a.shape
    if a[sy, sx] < 150:  # seed lost: search nearby for skin
        ok = False
        for r in range(2, 40, 2):
            for dx, dy in ((r, 0), (-r, 0), (0, r), (0, -r)):
                if 0 <= sx + dx < W and 0 <= sy + dy < H and a[sy + dy, sx + dx] >= 170: sx, sy = sx + dx, sy + dy; ok = True; break
            if ok: break
        if not ok: rows.append((f, None)); continue
    m = np.zeros_like(a, bool); q = deque([(sx, sy)]); m[sy, sx] = True; n = 0
    while q and n < 200000:
        x, y = q.popleft(); n += 1
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < W and 0 <= ny < H and not m[ny, nx] and a[ny, nx] >= 150: m[ny, nx] = True; q.append((nx, ny))
    ys, xs = np.nonzero(m)
    if n >= 200000 or len(xs) < 500: rows.append((f, None)); continue
    cx, cy = xs.mean(), ys.mean(); hw = (np.percentile(xs, 99) - np.percentile(xs, 1)) / 2
    C = np.cov(np.vstack([xs - cx, ys - cy])); ev, evec = np.linalg.eigh(C); v = evec[:, np.argmax(ev)]
    tilt = np.degrees(np.arctan2(v[0], v[1])) if abs(v[1]) > abs(v[0]) else np.degrees(np.arctan2(v[1], v[0]))
    rows.append((f, (cx, cy, hw, tilt, len(xs))))
    sx, sy = int(cx), int(cy)
ok = [r for r in rows if r[1]]
hw0 = np.median([r[1][2] for r in ok])
print(f"frames {f0}-{f1}: tracked {len(ok)}/{len(rows)}, face half-width median {hw0:.1f}px")
print("f    dx/hw   dy/hw   scale   tilt(deg)  area")
base = ok[0][1]
for f, r in rows:
    if not r: print(f, "  lost"); continue
    print(f"{f:<4} {(r[0]-base[0])/hw0:+.3f}  {(r[1]-base[1])/hw0:+.3f}  {r[2]/hw0:.3f}   {r[3]:+6.1f}   {r[4]}")
