# Sound for the 3D motion test (src/test/Move3DTest.tsx, 6.6 s): effects only, no voice (the user adds "Lho? Kok aku
# jadi tiga dimensi?!" themself). Footsteps come from the same walk maths as the picture, so each heel lands on its frame.
# Usage: .tools/py/bin/python3 audio/move3d_audio.py out/move3d  -> sfx.wav
import sys
import numpy as np
from dsp import SR, ns, rng, place, write_wav, integrated, true_peak, dbg
from sfx_gen import whoosh, breeze, bird_chirps, stroll_step
from ayam_sfx import pop, ding, sting
from ketindihan_audio import thud, limit
import instruments as I

DUR = 6.6
# --- the same numbers as Move3DTest.tsx ---
X0, X1, T_DEC, D, STEP = -1.0, -0.1, 2.0, 0.32, 0.24
T_STOP = T_DEC + D
V_W = (X1 - X0) / (T_DEC + D / 2)
T_TAKE = 2.86


def dist(t):
    if t < T_DEC: return V_W * t
    if t < T_STOP: x = t - T_DEC; return V_W * T_DEC + V_W * (x - x * x / (2 * D))
    return X1 - X0


def heel_strikes():
    """times where a foot's phase wraps to 0 (start of its stance) while still walking"""
    out, prev = [], [None, None]
    for k in range(int(T_STOP * 1000) + 1):
        t = k / 1000; ph = dist(t) / (2 * STEP)
        for i in range(2):
            p = (ph + i * 0.5) % 1.0
            if prev[i] is not None and p < prev[i] - 0.5: out.append(t)
            prev[i] = p
    return out


def sfx_track():
    r = rng(318); buf = np.zeros((2, ns(DUR)))
    place(buf, breeze(DUR, r, level=0.5), 0, 0.5)
    place(buf, bird_chirps(DUR, r, density=0.35), 0, 0.25)
    for i, t in enumerate(heel_strikes()):
        place(buf, stroll_step(r, scuff=0.35), t, 0.55 if i % 2 else 0.48)
    place(buf, stroll_step(r, scuff=0.8), T_STOP - 0.02, 0.4)  # the closing shuffle
    # a carefree whistle while he strolls; it breaks off at the double take
    notes = [(0.15, 0.22, 79, 0.8), (0.4, 0.22, 83, 0.8), (0.65, 0.42, 81, 0.85), (1.15, 0.2, 79, 0.75), (1.4, 0.2, 76, 0.75),
             (1.65, 0.5, 79, 0.8), (2.2, 0.22, 81, 0.7), (2.45, 0.38, 83, 0.75)]
    t0, y = I.whistle(notes, rng(5), falter=(2.82, -7))
    place(buf, y, t0, 0.32)
    # double take: head snap whoosh, comic sting, peci pops up, two landings
    place(buf, whoosh(0.22, r, peak=0.25, f_lo=600, f_hi=3500), T_TAKE - 0.1, 0.5)
    place(buf, sting(r), T_TAKE - 0.02, 0.8)
    place(buf, pop(r, 1100, 380), T_TAKE + 0.03, 0.55)
    place(buf, thud(r, 0.8), T_TAKE + 0.26, 0.5)
    place(buf, pop(r, 500, 180), T_TAKE + 0.36, 0.4)  # peci lands back on the head
    place(buf, stroll_step(r, scuff=0.2), T_TAKE + 0.52, 0.45)  # turn-hop landing
    # the grin at the end
    place(buf, ding(r, 1568, 1.0), 6.05, 0.22)
    return buf


def main(outdir):
    import os
    os.makedirs(outdir, exist_ok=True)
    sfx = sfx_track(); sfx *= dbg(-20.0 - integrated(sfx)); sfx = limit(sfx, 0.79)
    write_wav(f"{outdir}/sfx.wav", sfx)
    print(f"sfx: {integrated(sfx):.1f} LUFS, true peak {true_peak(sfx):.1f} dBTP; steps at", [round(t, 2) for t in heel_strikes()])


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "out/move3d")
