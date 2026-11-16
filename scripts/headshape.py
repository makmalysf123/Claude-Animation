"""Measure a reference character's head silhouette from pixels.

For each (frame, seed) the white face region is flood-filled from a cheek seed; its boundary points where the next
pixels outward are dark ink are the head outline (hair/hat edges are excluded by keeping only the lower part); a
circle is fitted to them and the radius r(theta)/R is sampled every 10 degrees (canvas angles: 0 = right, 90 = down).
usage: .tools/py/bin/python3 scripts/headshape.py <dir with gray PNG frames f_XXXX.png>
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__)); import refstudy, numpy as np
from collections import deque

HEADS = [  # name, frame-file, cheek seed (x, y) in the 1080x1920 frame; frame may be "path.png"
    ("buddy_1250", 1250, (300, 760)), ("sheriff_1250", 1250, (860, 745)), ("expert_1053", 1053, (560, 1010)),
    ("sheriff_461", 461, (300, 760)), ("buddy_461", 461, (980, 860)), ("rich_1636", 1636, (380, 770)), ("buddy_216", 216, (640, 960)),
]
if len(sys.argv) > 2 and sys.argv[2] == "rc":
    HEADS = [("kyle_156", "out/refstudy/rc-cashiers/gray/f_0156.png", (700, 1040)), ("kyle_126", "out/refstudy/rc-cashiers/gray/f_0126.png", (700, 1000)),
             ("spot_30", "out/refstudy/rc-spot/gray/f_0030.png", (650, 640)), ("spot_0", "out/refstudy/rc-spot/gray/f_0000.png", (640, 620)),
             ("waiter_546", "out/refstudy/rc-memory/gray/f_0546.png", (820, 760))]
d = sys.argv[1]; out = {}
for name, f, (sx, sy) in HEADS:
    a = refstudy.read_png(f if isinstance(f, str) else os.path.join(d, f"f_{f:04d}.png")).astype(np.int32); H, W = a.shape
    if a[sy, sx] < 170: print(name, "seed not on skin:", a[sy, sx]); continue
    m = np.zeros_like(a, bool); q = deque([(sx, sy)]); m[sy, sx] = True
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < W and 0 <= ny < H and not m[ny, nx] and a[ny, nx] >= 150: m[ny, nx] = True; q.append((nx, ny))
    ys, xs = np.nonzero(m); top, bot = ys.min(), ys.max()
    # boundary pixels whose outward step (4 px) lands on dark ink
    pts = []
    cx0, cy0 = xs.mean(), ys.mean()
    for x, y in zip(xs[::3], ys[::3]):
        if m[max(0, y - 1):y + 2, max(0, x - 1):x + 2].all(): continue
        dx, dy = x - cx0, y - cy0; l = np.hypot(dx, dy) or 1
        ox, oy = int(round(x + dx / l * 5)), int(round(y + dy / l * 5))
        if 0 <= ox < W and 0 <= oy < H and a[oy, ox] < 80 and y > top + (bot - top) * (0.05 if isinstance(f, str) else 0.35): pts.append((x, y))
    P = np.array(pts, float)
    A = np.c_[2 * P[:, 0], 2 * P[:, 1], np.ones(len(P))]; b = (P ** 2).sum(1); c = np.linalg.lstsq(A, b, rcond=None)[0]
    cx, cy = c[0], c[1]; R = np.sqrt(c[2] + cx * cx + cy * cy)
    ang = np.degrees(np.arctan2(P[:, 1] - cy, P[:, 0] - cx)) % 360; rad = np.hypot(P[:, 0] - cx, P[:, 1] - cy) / R
    prof = {}
    for t in range(0, 360, 10):
        sel = np.abs(((ang - t + 180) % 360) - 180) < 6
        if sel.sum() >= 3: prof[t] = round(float(np.median(rad[sel])), 3)
    out[name] = {"R": round(float(R), 1), "w_over_R": round(float((xs.max() - xs.min()) / 2 / R), 3), "bottom_over_R": round(float((bot - cy) / R), 3), "profile": prof}
    print(name, "R", round(R), "half-width/R", out[name]["w_over_R"], "bottom/R", out[name]["bottom_over_R"])
    print("   r/R by angle:", " ".join(f"{k}:{v}" for k, v in prof.items()))
json.dump(out, open(os.path.join(d, "heads_" + (sys.argv[2] if len(sys.argv) > 2 else "ms") + ".json"), "w"), indent=1)
