"""Outline thickness around a flood-filled region (face or body): from each boundary pixel march outward (away from
the region centre) through dark ink and count its width. Reported per 30-degree sector, relative to the region's
half-width.  usage: inkwidth.py <gray png> <seed x> <seed y> [min value of the region, default 150]"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__)); import refstudy, numpy as np
from collections import deque
a = refstudy.read_png(sys.argv[1]).astype(np.int32); H, W = a.shape; sx, sy = int(sys.argv[2]), int(sys.argv[3]); lo = int(sys.argv[4]) if len(sys.argv) > 4 else 150
hi = int(sys.argv[5]) if len(sys.argv) > 5 else 256
m = np.zeros_like(a, bool); q = deque([(sx, sy)]); m[sy, sx] = True
while q:
    x, y = q.popleft()
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < W and 0 <= ny < H and not m[ny, nx] and lo <= a[ny, nx] < hi: m[ny, nx] = True; q.append((nx, ny))
ys, xs = np.nonzero(m); cx, cy = xs.mean(), ys.mean(); hw = (xs.max() - xs.min()) / 2
sec = {k: [] for k in range(0, 360, 30)}
for x, y in zip(xs[::2], ys[::2]):
    if m[max(0, y - 1):y + 2, max(0, x - 1):x + 2].all(): continue
    dx, dy = x - cx, y - cy; l = np.hypot(dx, dy) or 1; dx, dy = dx / l, dy / l
    w = 0; started = False
    for r in range(1, 80):
        px, py = int(round(x + dx * r)), int(round(y + dy * r))
        if not (0 <= px < W and 0 <= py < H): break
        if a[py, px] < 75: started = True; w += 1
        elif started: break
        elif r > 6: break
    if started and w > 1:
        ang = (np.degrees(np.arctan2(dy, dx)) + 360) % 360; sec[int(ang // 30) * 30].append(w)
print(f"{os.path.basename(sys.argv[1])}: half-width {hw:.0f}px")
print("  ink width / half-width by direction (0=right, 90=down):", " ".join(f"{k}:{np.median(v)/hw:.3f}" for k, v in sec.items() if len(v) > 5))
