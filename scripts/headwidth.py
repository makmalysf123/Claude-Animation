"""Face width profile: for each row of the flood-filled face (skin, enclosed features filled), the half-width
relative to the widest row; rows measured from the widest row down to the chin and up to the hairline, in units of
the max half-width. Also the left/right centre drift (jaw asymmetry). usage: .tools/py/bin/python3 scripts/headwidth.py"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__)); import refstudy, numpy as np
from collections import deque
HEADS = [("kyle_156", "out/refstudy/rc-cashiers/gray/f_0156.png", (700, 1040)), ("spot_30", "out/refstudy/rc-spot/gray/f_0030.png", (650, 640)),
         ("spot_0", "out/refstudy/rc-spot/gray/f_0000.png", (640, 620)), ("waiter_546", "out/refstudy/rc-memory/gray/f_0546.png", (820, 760))]
for name, path, (sx, sy) in HEADS:
    a = refstudy.read_png(path).astype(np.int32); H, W = a.shape
    m = np.zeros_like(a, bool); q = deque([(sx, sy)]); m[sy, sx] = True
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < W and 0 <= ny < H and not m[ny, nx] and a[ny, nx] >= 150: m[ny, nx] = True; q.append((nx, ny))
    rows = {}
    for y in range(H):
        xs = np.nonzero(m[y])[0]
        if len(xs) > 20: rows[y] = (xs.min(), xs.max())
    ys = sorted(rows); hw = {y: (rows[y][1] - rows[y][0]) / 2 for y in ys}; ymax = max(ys, key=lambda y: hw[y]); A = hw[ymax]; cx = sum(rows[ymax]) / 2
    top, bot = ys[0], ys[-1]
    print(f"{name}: max half-width {A:.0f}px at row {ymax}; face spans {(ymax-top)/A:.2f} up (hairline) and {(bot-ymax)/A:.2f} down (chin)")
    line = []
    for k in [-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95]:
        y = int(ymax + k * A)
        if y in rows: l, r = rows[y]; line.append(f"{k:+.2f}:{(r-l)/2/A:.3f}(c{((l+r)/2-cx)/A:+.2f})")
    print("   half-width by depth:", " ".join(line))
