# Sound for the fighter test (src/test/FightTest.tsx, 3.73 s): dojo room tone, Red's footwork bounce, the load,
# the hook's whoosh, a layered glove-on-jaw impact (rings through the 3-frame hit-stop), Blue's grunt, his stagger
# steps, knee and hand hitting the wooden floor, spit drops, and a faint ear ring after the hit.
# Times copy the picture's constants, so every sound lands on its frame.
# Usage: .tools/py/bin/python3 audio/fight_audio.py out/fight  -> sfx.wav
import sys
import numpy as np
from dsp import SR, ns, tt, rng, lp, hp, bp, phase, modal, colored, fades, place, pan, widen, make_ir, convolve_st, write_wav, integrated, true_peak, dbg
from sfx_gen import whoosh, oof, stroll_step
from ketindihan_audio import thud, limit

DUR = 112 / 30
T_LOAD, T_SWING, T_IMP, HS = 0.95, 1.13, 1.27, 0.1
real = lambda u: T_IMP + HS + u  # Blue's reaction clock (starts after the hit-stop) -> real time


def room(dur, r):
    """quiet dojo: low air hum plus a little hiss"""
    n = ns(dur)
    y = lp(colored(n, r, 1.0), 220, 2) * 0.35 + hp(colored(n, r, 0.2), 3000) * 0.02
    return fades(y, 0.2, 0.3)


def shuffle(r, k=1.0):
    """bare foot / sole squeak-scuff on a polished floor"""
    t = tt(0.16)
    nz = r.standard_normal(len(t))
    scuff = bp(nz, 600, 3500, 1) * np.clip(t / 0.015, 0, 1) * np.exp(-t / 0.04)
    pat = np.sin(phase(r.uniform(110, 150))) * np.exp(-t / 0.02) * 0.6
    return (scuff * 0.5 + pat) * k


def impact(r):
    """glove on jaw: leather slap + meaty low thump + bone knock + a short crack on top"""
    d = 0.9
    t = tt(d)
    nz = r.standard_normal(len(t))
    slap = bp(nz, 900, 5000, 2) * np.exp(-t / 0.012) * 1.6
    crack = hp(nz, 3500) * np.exp(-t / 0.003) * 1.2
    body = np.sin(phase(95 * (1 + 0.8 * np.exp(-t / 0.015)))) * np.exp(-t / 0.09) * 1.5
    sub = np.sin(phase(48 * (1 + 0.5 * np.exp(-t / 0.03)))) * np.exp(-t / 0.18) * 1.2
    knock = modal(d, [(310, 0.7, 0.03), (720, 0.45, 0.02), (1350, 0.25, 0.012)], r)
    return fades(slap + crack + body + sub + knock * 0.8, 0.0, 0.1)


def cloth(r, dur=0.25, k=1.0):
    t = tt(dur)
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return bp(r.standard_normal(len(t)), 1200, 6000, 1) * env * 0.3 * k


def knee_down(r):
    """knee hits the planks: dull wooden thump with a plank resonance"""
    t = tt(0.5)
    plank = modal(0.5, [(140, 1.0, 0.07), (330, 0.6, 0.04), (610, 0.3, 0.02)], r)
    th = np.pad(thud(r, 1.1), (0, len(t)))[: len(t)]
    return th + plank * 0.6 + bp(r.standard_normal(len(t)), 500, 2500, 1) * np.exp(-t / 0.01) * 0.3


def palm_slap(r):
    t = tt(0.2)
    return bp(r.standard_normal(len(t)), 700, 5000, 1) * np.exp(-t / 0.008) * 0.8 + np.sin(phase(160)) * np.exp(-t / 0.03) * 0.4


def drip(r):
    t = tt(0.08)
    return np.sin(phase(r.uniform(1800, 2600) * (1 - 0.3 * t / 0.08))) * np.exp(-t / 0.012) * 0.3


def ring(dur, f=3600):
    t = tt(dur)
    return np.sin(phase(f)) * np.clip(t / 0.05, 0, 1) * np.exp(-t / 0.45) * 0.06


def sfx_track():
    r = rng(1127)
    buf = np.zeros((2, ns(DUR)))
    place(buf, room(DUR, r), 0, 0.35)
    # Red's bounce: the soles touch down where |sin(pi*1.9*t)| = 0 (until the load)
    for k in range(1, 3):
        place(buf, pan(shuffle(r, 0.8), 0.25), k / 1.9, 0.55)
    place(buf, pan(shuffle(r, 0.5), -0.25), 0.33, 0.35)  # Blue shifts his weight
    # the load: cloth + a short breath out, then the swing whoosh into the hit
    place(buf, cloth(r, 0.2, 1.2), T_LOAD - 0.05, 0.6)
    place(buf, pan(shuffle(r, 1.2), 0.2), T_SWING - 0.02, 0.6)  # back foot pivots
    w = whoosh(0.22, r, peak=0.15, f_lo=500, f_hi=3000, tail=0.05)
    place(buf, widen(w, r), T_IMP - 0.16, 0.95)
    # impact (dry + a short room reflection)
    hit = impact(r)
    place(buf, hit, T_IMP, 1.0)
    wet = convolve_st(np.pad(hit, (0, ns(1.0))), make_ir(0.7, 33, pre=0.015))
    place(buf, wet, T_IMP, 0.18)
    place(buf, ring(1.6), T_IMP + 0.05, 1.0)
    # Blue: grunt, drops of spit, stagger steps, knee and hand on the floor
    place(buf, pan(oof(rng(4), "ugh", base=118), -0.15), T_IMP + HS + 0.04, 0.75)
    for i in range(5):
        place(buf, pan(drip(r), -0.3 + 0.1 * i), real(0.45 + 0.06 * i + r.uniform(0, 0.03)), 0.5)
    place(buf, pan(shuffle(r, 1.3), -0.3), real(0.42), 0.8)
    place(buf, pan(shuffle(r, 1.1), -0.3), real(0.5), 0.75)
    place(buf, cloth(r, 0.35, 1.0), real(0.8), 0.6)
    place(buf, pan(knee_down(r), -0.3), real(1.15), 0.9)
    place(buf, pan(palm_slap(r), -0.35), real(1.2), 0.6)
    # Red resets his guard
    place(buf, cloth(r, 0.2, 0.8), 2.1, 0.45)
    place(buf, pan(shuffle(r, 0.6), 0.25), 2.45, 0.4)
    return buf


def main(outdir):
    import os
    os.makedirs(outdir, exist_ok=True)
    sfx = sfx_track()
    sfx *= dbg(-17.0 - integrated(sfx))
    sfx = limit(sfx, 0.79)
    write_wav(f"{outdir}/sfx.wav", sfx)
    print(f"sfx: {integrated(sfx):.1f} LUFS, true peak {true_peak(sfx):.1f} dBTP")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "out/fight")
