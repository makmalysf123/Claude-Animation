"""Flicker check (optional crop x0 y0 x1 y1 in the PNG's pixels as extra args): fraction of near-black (ink) pixels per frame in a region; flags frames that drop or jump vs both
neighbours (an outline vanishing for one frame).  usage: python3 scripts/inkcheck.py <dir with tiny/f_XXXX.png>"""
import sys, glob, os
sys.path.insert(0, os.path.dirname(__file__)); import refstudy, numpy as np
fs = sorted(glob.glob(os.path.join(sys.argv[1], "f_*.png")))
box = [int(v) for v in sys.argv[2:6]] if len(sys.argv) >= 6 else None
ink = []
for f in fs:
    a = refstudy.read_png(f).astype(np.float32)
    if box: a = a[box[1]:box[3], box[0]:box[2]]
    ink.append(float((a < 40).mean()))
ink = np.array(ink); bad = []
for i in range(1, len(ink) - 1):
    m = (ink[i - 1] + ink[i + 1]) / 2
    if m > 0 and abs(ink[i] - m) / m > 0.12 and abs(ink[i - 1] - ink[i + 1]) / m < 0.06: bad.append((i, round(ink[i], 4), round(m, 4)))
print(f"{len(ink)} frames, ink mean {ink.mean():.4f}; suspicious single-frame changes: {len(bad)}")
for b in bad[:40]: print("  frame", b[0], "ink", b[1], "neighbours", b[2])
