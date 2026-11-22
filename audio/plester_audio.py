# Sound for "Pak Jaya dan Plester Tembok" (src/videos/plester/Film.tsx, 94 s): soft sound effects + market ambience, no
# music, no voices that speak words (the user adds narration + subtitles). Every cue is a global second = scene start +
# the local time in Film.tsx. Scene starts: S1 0, S2 5.5, S3 9, S4a 15.5, S4b 19.5, S5 22.5, S6 30, S7a 33, S7b 36,
# S8 39.5, S9a 45.5, S9b 49, S10 52, S11 57, S12 60.5, S13 71, S14 78.5, S15 84, S16 88.5, end 94.
# Usage: .tools/py/bin/python3 audio/plester_audio.py out/plester/audio  -> sfx.wav
import sys
import numpy as np
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, colored, smooth_noise, phase, pan, place, widen,
                 write_wav, integrated, true_peak, momentary_max, dbg)
from sfx_gen import whoosh, clink, bird_chirps, babble, stroll_step, creak, bubbles
from ayam_sfx import pop, ding, sting, shimmer
from ketindihan_audio import thud, tick, paper_plak, clap, limit
from kopi2_audio import bed, add, crinkle, blow, laugh

DUR = 94.0


# ---------------- effects made for this film ----------------
def thumb_rub(r, dur, rate=1.6):  # a thumb smoothing a fabric plaster: soft strokes
    n = ns(dur); t = np.arange(n) / SR; g = np.abs(np.sin(np.pi * rate * t)) ** 1.5
    return bp(r.standard_normal(n), 1200, 6000) * g * bed(dur, 0.05) * 0.14


def peel(r, dur=0.45):  # a sticky plaster peeled off: a crackle train that speeds up, then a little flick
    y = np.zeros(ns(dur + 0.1)); tm = 0.0; dt = 0.03
    while tm < dur:
        k = r.integers(40, 140); i = ns(tm); y[i:i + k] += bp(r.standard_normal(k), 1500, 7000)[: len(y) - i] * np.exp(-np.arange(k) / (k / 3))[: len(y) - i] * r.uniform(0.3, 0.8)
        tm += dt; dt = max(0.004, dt * 0.88)
    return add(y * 0.5, np.concatenate([np.zeros(ns(dur)), paper_plak(r) * 0.25]))


def press(r):  # the plaster pressed on: a soft pat
    return add(paper_plak(r) * 0.3, lp(thud(r, 0.25), 900) * 0.25)


def rip(r):  # the plaster tearing in two: a short ragged rip
    n = ns(0.22); t = np.arange(n) / SR; env = np.clip(t / 0.01, 0, 1) * np.exp(-t / 0.07)
    y = bp(r.standard_normal(n), 900, 7000) * env * (0.6 + 0.4 * np.sign(np.sin(TAU * 180 * t)))
    return add(y * 0.6, crinkle(0.18, r, 120) * 0.4)


def tear_stretch(r, dur):  # fabric stretching: a thin creaky squeal rising
    n = ns(dur); t = np.arange(n) / SR; u = t / dur
    return (np.sin(phase(600 + 900 * u ** 2)) * 0.03 * (0.5 + 0.5 * np.sin(TAU * 23 * t)) + bp(r.standard_normal(n), 2000, 6000) * 0.04 * u) * bed(dur, 0.1)


def glass_shake(r, dur, rate=7.0):  # a little glass bottle wiggled: liquid slosh + tiny clinks
    n = ns(dur); t = np.arange(n) / SR; g = np.abs(np.sin(np.pi * rate * t))
    y = bp(r.standard_normal(n), 400, 2200) * g * 0.08
    for k in range(int(dur * rate)): c = clink(r, f0=r.uniform(3200, 4200), dur=0.05, bright=0.5) * 0.12; i = ns(k / rate + 0.03); y[i:i + len(c)] += c[: len(y) - i]
    return y * bed(dur, 0.05)


def pills(r, dur):  # a medicine box with a few tablets rattling as he walks
    y = np.zeros(ns(dur))
    for _ in range(int(dur * 9)): c = clink(r, f0=r.uniform(1800, 2800), dur=0.04, bright=0.3) * r.uniform(0.04, 0.1); i = r.integers(0, max(1, len(y) - len(c))); y[i:i + len(c)] += c
    return y


def ladle(r, dur):  # stirring the pot: soft metal knocks on the rim + liquid
    y = bp(r.standard_normal(ns(dur)), 300, 1500) * 0.05 * bed(dur, 0.1); tm = 0.1
    while tm < dur - 0.1: c = clink(r, f0=r.uniform(1500, 2100), dur=0.12, bright=0.4) * 0.12; i = ns(tm); y[i:i + len(c)] += c[: len(y) - i]; tm += r.uniform(0.25, 0.4)
    return y


def knock(r):  # the torch rapping the wall: a dull knock + a tiny metal tick + grit falling
    return add(lp(thud(r, 0.5), 1500) * 0.6, clink(r, f0=2600, dur=0.06, bright=0.4) * 0.12, np.concatenate([np.zeros(ns(0.05)), bp(r.standard_normal(ns(0.5)), 2000, 8000) * np.exp(-tt(0.5) / 0.15) * 0.05]))


def grit(r, dur):  # dust and sand trickling down
    n = ns(dur); y = np.zeros(n)
    for _ in range(int(dur * 60)): k = r.integers(20, 80); i = r.integers(0, max(1, n - k)); y[i:i + k] += hp(r.standard_normal(k), 3000) * np.exp(-np.arange(k) / (k / 4)) * r.uniform(0.05, 0.2)
    return y * bed(dur, 0.1) * 0.5


def tape_unroll(r, dur):  # barrier tape pulled off the roll: a fast plastic chatter
    n = ns(dur); t = np.arange(n) / SR; g = 0.5 + 0.5 * np.sign(np.sin(TAU * 40 * t))
    return (bp(r.standard_normal(n), 1500, 6000) * g * 0.18 + crinkle(dur, r, 30) * 0.2) * bed(dur, 0.04)


def cone_tock(r):  # a plastic cone set down
    return add(lp(thud(r, 0.35), 700) * 0.5, clink(r, f0=650, dur=0.1, bright=0.2) * 0.2)


def wall_groan(r, dur, k=1.0):  # the crack under strain: a low stone creak with grit
    a = creak(dur, r, rate0=40, rate1=70, rough=0.25, noise=0.08) * 0.35 * k
    return add(lp(a, 1800), grit(r, dur) * 0.5 * k)


def wahwah(r):  # the comedy sad trombone: four notes sliding down, the last one wobbles
    out = []
    for m, d in ((58, 0.32), (57, 0.32), (56, 0.32), (55, 0.95)):
        tl = tt(d); f = 440 * 2 ** ((m - 69) / 12) * (1 - 0.02 * tl / d) * (1 + (0.035 * np.sin(TAU * 6 * tl) if d > 0.5 else 0))
        y = sum(np.sin(phase(f * h)) / h ** 1.1 for h in range(1, 9)) * np.clip(tl / 0.03, 0, 1) * np.clip((d - tl) / 0.08, 0, 1)
        out.append(lp(y, 1600))
    return np.concatenate(out) * 0.18


def steps(r, out, t0, t1, every, p=0.0, g=0.3, scuff=0.5):
    tm = t0; k = 0
    while tm < t1:
        place(out, pan(stroll_step(r, scuff) * g * r.uniform(0.85, 1.1), p + 0.05 * (-1) ** k), tm); tm += every * r.uniform(0.96, 1.04); k += 1


def market_amb(dur, r, level=1.0):  # a busy morning market: babble, far calls, scales and plastic bags, birds, a scooter
    n = ns(dur); y = np.zeros((2, n))
    for _ in range(6): place(y, pan(babble(dur, r, r.uniform(110, 260), r.uniform(0.95, 1.25)) * 0.03 * level, r.uniform(-0.9, 0.9)), 0)
    for _ in range(int(dur * 0.8)): place(y, pan(clink(r, f0=r.uniform(1800, 3800), dur=0.15, bright=0.5) * 0.04 * level, r.uniform(-0.8, 0.8)), r.uniform(0, max(0.1, dur - 0.2)))
    for _ in range(int(dur * 0.4)): place(y, pan(crinkle(r.uniform(0.2, 0.5), r, 30) * 0.05 * level, r.uniform(-0.8, 0.8)), r.uniform(0, max(0.1, dur - 0.6)))
    place(y, bird_chirps(dur, r, density=0.25) * 0.03 * level, 0)
    t = np.arange(n) / SR
    for _ in range(max(1, int(dur / 8))):
        t0 = r.uniform(0, dur); w = np.exp(-((t - t0) / 1.4) ** 2)
        place(y, pan(bp(np.sign(np.sin(phase(np.full(n, 58.0)))) + 0.3 * r.standard_normal(n), 80, 1200) * w * 0.03 * level, r.uniform(-1, 1)), 0)
    place(y, widen(lp(colored(n, r, -1.5), 350) * 0.08 * level, r), 0)
    return y * bed(dur, 0.25)


def simmer(dur, r, level=1.0):  # the bakso pots simmering
    return bubbles(dur, r, 14, 200, 1400) * 0.06 * level * bed(dur, 0.3)


def macro_amb(dur, r):  # close on the wall: the market far away and muffled, a low hum
    y = np.zeros((2, ns(dur))); place(y, lp(market_amb(dur, r, 0.6), 700), 0); place(y, widen(lp(colored(ns(dur), r, -1.8), 200) * 0.05, r), 0); return y * bed(dur, 0.3)


def sfx_track():
    r = rng(5150); out = np.zeros((2, ns(DUR) + SR))
    P = lambda x, t, p=0.0, g=1.0: place(out, pan(x * g, p), t)
    # ---- beds: the market everywhere except the two macro scenes; the pots near the cart
    place(out, market_amb(60.6, r), 0.0); place(out, market_amb(15.7, r, 0.8), 78.3)
    place(out, macro_amb(18.0, r), 60.5)
    for a, b, g in ((0, 15.5, 0.7), (19.5, 36, 0.8), (39.5, 60.5, 0.6), (84, 94, 0.7)): P(simmer(b - a, r, g), a, -0.4)
    # 1. thumb smoothing the plaster, a nod, a little sparkle
    P(thumb_rub(r, 1.25), 0.0, 0.1); P(stroll_step(r, 0.2) * 0.25, 1.45, 0.0); P(shimmer(0.8, r, 12, 3000, 7000) * 0.2, 4.2, 0.0)
    # 2. "one!" pop, two pats on the wall, he strolls off
    P(pop(r, 1500, 900) * 0.25, 5.6, 0); P(press(r), 6.55, 0.1); P(press(r) * 0.8, 6.8, 0.1); steps(r, out, 7.15, 9.0, 0.34, 0.0, 0.3)
    # 3. ladle in the pot, his steps, a head scratch, the smile
    P(ladle(r, 1.3), 9.0, -0.4); steps(r, out, 9.0, 12.9, 0.36, 0.2, 0.28); P(crinkle(0.5, r, 50) * 0.15, 11.0, -0.4)
    P(ding(r, 1760, 0.6), 13.35, 0.2, 0.12); steps(r, out, 14.9, 15.5, 0.33, 0.3, 0.25)
    # 4a. torn plaster peeled off, a new one from the pocket, pressed on, smoothed
    P(peel(r, 0.4), 16.0, 0.1, 0.8); P(grit(r, 0.4), 16.3, 0.1, 0.6); P(crinkle(0.25, r, 60) * 0.25, 17.05, 0.0); P(press(r), 17.8, 0.1); P(thumb_rub(r, 0.7), 17.85, 0.1)
    # 4b. he walks up, sees it torn again: a little surprise
    steps(r, out, 19.5, 20.6, 0.33, -0.2, 0.3); P(pop(r, 900, 500) * 0.25, 20.7, 0.0); P(sting(r) * 0.25, 20.75, 0.0)
    # 5. proud bouncy march with the box, the obat-merah bottle wiggled, a cheeky laugh
    steps(r, out, 22.5, 25.2, 0.29, 0.2, 0.32); P(pop(r, 1300, 800) * 0.2, 25.55, -0.3); P(glass_shake(r, 2.6), 25.6, -0.3, 0.8)
    # (no laugh sounds anywhere: the user found them unpleasant, 2026-11-21)
    # 6. the whole market laughs (picture only): a few knee slaps
    for k in range(4): P(clap(r) * 0.22, 30.4 + 0.42 * k, -0.4)
    # 7a. peel, drop into the bag
    P(peel(r, 0.35), 33.5, 0.1, 0.7); P(crinkle(0.45, r, 45) * 0.35, 34.55, -0.2)
    # 7b. three quick days: peel + bag, a soft whoosh at each dip
    for c in (36.0, 37.17, 38.34):
        P(peel(r, 0.25), c + 0.15, 0.1, 0.6); P(crinkle(0.35, r, 45) * 0.35, c + 0.68, -0.2)
    for c in (37.05, 38.22): P(whoosh(0.3, r, peak=0.05, f_lo=400, f_hi=2000), c, 0.0, 0.4)
    # 8. two people walking in from the street, the engineer steps out: a reveal sting
    steps(r, out, 39.5, 42.7, 0.36, 0.0, 0.3); steps(r, out, 39.68, 42.7, 0.33, 0.1, 0.22, 0.2)
    P(whoosh(0.35, r, peak=0.08, f_lo=500, f_hi=2500), 42.85, -0.2, 0.4); P(ding(r, 1568, 0.9), 43.2, -0.2, 0.2); P(ding(r, 2093, 0.9), 43.32, -0.2, 0.16)
    # 9a. torch click, three knocks with grit, a worried sting
    P(tick(r) * 0.4, 45.55, 0.1); for_t = (46.95, 47.35, 47.75)
    for tk in for_t: P(knock(r), tk, -0.1, 0.8)
    P(grit(r, 1.2), 47.0, -0.1, 0.6); P(sting(r) * 0.3, 48.3, 0.0)
    # 9b. barrier tape unrolled, cones set down, the grocer carries his crate out
    P(tape_unroll(r, 0.7), 49.05, -0.3, 0.8); P(cone_tock(r), 49.5, -0.5); P(cone_tock(r), 49.75, 0.4); steps(r, out, 49.0, 52.0, 0.4, -0.4, 0.28)
    # 10. the manager hurries in, out of breath
    steps(r, out, 52.0, 53.9, 0.26, 0.3, 0.34); P(blow(r, 0.4) * 0.35, 54.0, 0.3); P(blow(r, 0.35) * 0.3, 54.5, 0.3); P(blow(r, 0.35) * 0.25, 55.1, 0.3)
    # 11. the bag lifted up, the manager's eyes pop
    P(crinkle(0.9, r, 40) * 0.4, 57.4, -0.2); P(pop(r, 700, 300) * 0.35, 58.5, 0.2); P(sting(r) * 0.4, 58.52, 0.2); P(whoosh(0.3, r, peak=0.1, f_lo=400, f_hi=2500), 58.45, 0.2, 0.4)
    # 12. macro: the crack groans as it opens, the plaster stretches and snaps
    P(whoosh(0.6, r, peak=0.05, f_lo=300, f_hi=1500), 60.6, 0, 0.3); P(wall_groan(r, 3.6, 0.8), 63.7, 0.0); P(tear_stretch(r, 3.4), 63.9, 0.0)
    P(rip(r), 67.3, 0.0, 0.9); P(thud(r, 0.4) * 0.3, 67.3, 0.0); P(grit(r, 0.8), 67.35, 0.0, 0.7); P(wall_groan(r, 3.0, 0.4), 67.6, 0.0)
    # 13. macro: the gauge; a slow creak and a soft tick each time the cross-hair passes a millimetre line
    P(whoosh(0.5, r, peak=0.05, f_lo=300, f_hi=1500), 71.1, 0, 0.3); P(wall_groan(r, 4.2, 0.5), 73.6, 0.0)
    for k in range(7): P(tick(r, k % 2 == 1) * 0.18, 73.9 + 0.6 * k, 0.1)
    # 14. calm at the wall: nothing but the market
    # 15. the bakso seller walks up with the medicine box
    steps(r, out, 84.0, 86.2, 0.34, -0.3, 0.3); P(pills(r, 2.2), 84.0, -0.3)
    # 16. the camera glides to the manager; the sad trombone; fade out
    P(whoosh(0.9, r, peak=0.06, f_lo=300, f_hi=1500), 90.7, 0.3, 0.4); P(wahwah(r), 92.0, 0.2, 0.9)
    t = np.arange(out.shape[1]) / SR; out *= np.interp(t, [0, 0.03, 93.3, 94.0], [0, 1, 1, 0])
    return out[:, : ns(DUR)]


def main(outdir):
    import os
    os.makedirs(outdir, exist_ok=True)
    sfx = sfx_track(); sfx *= dbg(-24.0 - integrated(sfx)); sfx = limit(sfx, 0.6)
    write_wav(f"{outdir}/sfx.wav", sfx)
    print(f"sfx: {integrated(sfx):.1f} LUFS, max momentary {momentary_max(sfx):.1f}, true peak {true_peak(sfx):.1f} dBTP, {sfx.shape[1] / SR:.2f}s")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "out/plester/audio")
