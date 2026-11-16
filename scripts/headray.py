"""Full head silhouette (hair included) of a reference character, measured by casting rays from the face centre.

Along each ray (every 5 degrees) we walk outward until we enter the dark ink outline and then leave it; the outer edge
of that ink band is the silhouette, the band length is the line weight there. Profiles are normalised by the mean
radius and written as r(angle) plus ink(angle). Canvas angles: 0 = right, 90 = down.
usage: .tools/py/bin/python3 scripts/headray.py  (paths below)
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__)); import refstudy, numpy as np

HEADS = [  # name, gray png, face centre (x, y), angles to skip (hands/props overlapping), max radius px
    ("kyle_156", "out/refstudy/rc-cashiers/gray/f_0156.png", (590, 840), [(150, 215)], 520),
    ("kyle_126", "out/refstudy/rc-cashiers/gray/f_0126.png", (560, 830), [], 520),
    ("spot_30", "out/refstudy/rc-spot/gray/f_0030.png", (550, 540), [], 400),
    ("spot_0", "out/refstudy/rc-spot/gray/f_0000.png", (540, 520), [], 400),
    ("waiter_546", "out/refstudy/rc-memory/gray/f_0546.png", (745, 690), [], 330),
]
out = {}
for name, path, (cx, cy), skip, rmax in HEADS:
    if not os.path.exists(path): print("missing", path); continue
    a = refstudy.read_png(path).astype(np.int32); H, W = a.shape
    rs, inks, angs = [], [], []
    for deg in range(0, 360, 5):
        if any(lo <= deg <= hi for lo, hi in skip): continue
        t = np.radians(deg); dx, dy = np.cos(t), np.sin(t); state = 0; r_in = None; r_out = None
        for r in np.arange(40, rmax, 1.0):
            x, y = int(cx + dx * r), int(cy + dy * r)
            if not (0 <= x < W and 0 <= y < H): break
            v = a[y, x]
            if state == 0 and v < 70: state = 1; r_in = r
            elif state == 1 and v >= 90:
                # require the next 6 px to be non-ink too (avoid gaps inside the brush stroke)
                ok = all(a[int(cy + dy * (r + k)), int(cx + dx * (r + k))] >= 90 for k in range(1, 7) if 0 <= int(cx + dx * (r + k)) < W and 0 <= int(cy + dy * (r + k)) < H)
                if ok: r_out = r; break
        if r_in and r_out: rs.append(r_out); inks.append(r_out - r_in); angs.append(deg)
    rs = np.array(rs); R = rs.mean()
    # bounding box of the silhouette in units of the mean radius
    xs = cx + rs * np.cos(np.radians(angs)); ys = cy + rs * np.sin(np.radians(angs))
    out[name] = {"R": round(float(R), 1), "centre": [cx, cy], "w": round(float((xs.max() - xs.min()) / 2 / R), 3), "h": round(float((ys.max() - ys.min()) / 2 / R), 3),
                 "widest_y": round(float((ys[np.argmax(np.abs(xs - cx))] - cy) / R), 3), "top": round(float((ys.min() - cy) / R), 3), "bottom": round(float((ys.max() - cy) / R), 3),
                 "r": {int(d): round(float(r / R), 3) for d, r in zip(angs, rs)}, "ink": {int(d): round(float(k / R), 3) for d, k in zip(angs, inks)}}
    o = out[name]
    print(f"{name}: R {o['R']}  half-w {o['w']}  half-h {o['h']}  top {o['top']} bottom {o['bottom']}  widest at y {o['widest_y']}")
    print("   r:", " ".join(f"{d}:{v}" for d, v in list(o["r"].items())[::3]))
    print("   ink/R:", " ".join(f"{d}:{v}" for d, v in list(o["ink"].items())[::3]))
json.dump(out, open("out/refstudy/heads_rc.json", "w"), indent=1)
