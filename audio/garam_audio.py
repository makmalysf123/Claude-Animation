# Sound for "Garam di Pohon Kelapa" (src/videos/garam/Film.tsx, 68.5 s): sound effects + ambience only, no music, no
# voices, no laughs (the user adds narration + subtitles). Every cue is a global second = scene start + the local time in
# Film.tsx. Scene starts: S1 0, S2 6.5, S3 14.5, S4 21, S5 27, S6 33.5, S7a 39, S7b 44.5, S8a 49, S8b 56, S9 62, end 68.5.
# Usage: .tools/py/bin/python3 audio/garam_audio.py out/garam/audio  -> sfx.wav
import sys
import numpy as np
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, colored, smooth_noise, phase, pan, place, widen,
                 write_wav, integrated, true_peak, momentary_max, dbg)
from sfx_gen import whoosh, clink, bird_chirps, crickets, breeze, stroll_step, bubbles
from ayam_sfx import pop, ding, sting, shimmer
from ketindihan_audio import thud, limit
from kopi2_audio import bed, add, crinkle

DUR = 68.5
SC = [0, 6.5, 14.5, 21, 27, 33.5, 39, 44.5, 49, 56, 62]  # scene starts


# ---------------- effects made for this film ----------------
def grass_step(r, heavy=1.0):  # a bare foot / sandal on soil and grass: soft thump + a little leaf rustle
    s = lp(stroll_step(r, 0.3), 1400) * 0.6 * heavy
    k = ns(0.12); rus = hp(r.standard_normal(k), 2500) * np.exp(-np.arange(k) / (k / 5)) * 0.12
    return add(s, rus)


def salt_throw(r):  # a handful of coarse salt flung out: a tiny hand swish, then grains pattering on soil
    sw = whoosh(0.18, r, peak=0.03, f_lo=1500, f_hi=6000, width=0.6, tail=0.1, air=0.3)
    sw = sw[0] if sw.ndim == 2 else sw
    n = ns(0.55); pat = np.zeros(n)
    for _ in range(70):
        k = r.integers(15, 60); i = ns(0.22) + int(abs(r.normal(0, 0.09)) * SR)
        if i + k >= n: continue
        pat[i:i + k] += hp(r.standard_normal(k), 3500) * np.exp(-np.arange(k) / (k / 4)) * r.uniform(0.05, 0.22)
    return add(sw * 0.5, pat * 0.6)


def sack_shift(r, dur=0.5):  # a full sack shifting on the shoulder: coarse fabric rustle + grains inside
    n = ns(dur); y = bp(r.standard_normal(n), 300, 2500) * 0.08 * (0.5 + 0.5 * smooth_noise(n, r, 6))
    return add(y * bed(dur, 0.08), crinkle(dur, r, 25) * 0.08, lp(thud(r, 0.3), 600) * 0.15)


def hoe_tap(r):  # the hoe blade set down on the soil
    return add(lp(thud(r, 0.4), 900) * 0.4, clink(r, f0=r.uniform(900, 1200), dur=0.08, bright=0.15) * 0.08)


def nut_knock(r):  # knuckles on a coconut husk: hollow and woody
    n = ns(0.25); t = np.arange(n) / SR
    y = (np.sin(TAU * 420 * t) * 0.6 + np.sin(TAU * 980 * t) * 0.25) * np.exp(-t / 0.035) + bp(r.standard_normal(n), 800, 4000) * np.exp(-t / 0.008) * 0.3
    return y * 0.35


def surf(dur, r, close=1.0):  # waves rolling in and breaking: low swell, the crash, a long hiss as it runs up the sand
    n = ns(dur); t = np.arange(n) / SR; out = np.zeros((2, n))
    per = 5.5
    for ch in range(2):
        ph = ((t + ch * 0.35) % per) / per
        crash = np.exp(-((ph - 0.18) / 0.06) ** 2) * 0.9 + np.clip((ph - 0.18) / 0.02, 0, 1) * np.exp(-np.clip(ph - 0.18, 0, None) / 0.35) * 0.7
        body = lp(colored(n, r, 1.2), 500) * (0.4 + 0.6 * crash)
        hiss = bp(colored(n, r, 0.3), 1500, 7000) * crash * 0.35
        swell = lp(colored(n, r, 1.8), 160) * 0.5
        out[ch] = (body + hiss + swell) * close
    return out * bed(dur, 0.4)


def rain(dur, r, level=1.0, env=None):  # light tropical rain close up: a soft hiss + individual drops on leaves and soil
    n = ns(dur); y = np.zeros((2, n))
    for ch in range(2):
        y[ch] = bp(colored(n, r, 0.2), 1800, 9000) * 0.06
        for _ in range(int(dur * 70)):
            k = r.integers(40, 160); i = r.integers(0, max(1, n - k)); f = r.uniform(1500, 4500)
            y[ch, i:i + k] += np.sin(TAU * f * np.arange(k) / SR * (1 - 0.3 * np.arange(k) / k)) * np.exp(-np.arange(k) / (k / 6)) * r.uniform(0.02, 0.09)
    if env is not None: y *= env
    return y * level * bed(dur, 0.5)


def fizz(dur, r):  # salt crystals melting in the wet soil: a tiny sparkling fizz
    return bubbles(dur, r, 60, 3000, 9000, tau=(0.002, 0.008)) * 0.05 * bed(dur, 0.4)


def engine_idle(dur, r, level=1.0):  # an old diesel pickup idling a little way off
    n = ns(dur); t = np.arange(n) / SR; f = 28 * (1 + 0.02 * smooth_noise(n, r, 0.5))
    y = np.sign(np.sin(phase(f))) * (0.6 + 0.4 * np.sin(phase(f / 2))) + 0.3 * r.standard_normal(n)
    return lp(bp(y, 40, 900), 700) * 0.05 * level * bed(dur, 0.3)


def steps(r, out, t0, t1, every, p=0.0, g=0.3, heavy=1.0):
    tm = t0; k = 0
    while tm < t1:
        place(out, pan(grass_step(r, heavy) * g * r.uniform(0.85, 1.1), p + 0.05 * (-1) ** k), tm); tm += every * r.uniform(0.96, 1.04); k += 1


def garden_amb(dur, r, level=1.0):  # an inland coconut garden in the morning: breeze in the fronds, birds, far insects
    y = np.zeros((2, ns(dur)))
    place(y, breeze(dur, r, 0.08 * level, 0.15, 1400), 0)
    place(y, bird_chirps(dur, r, density=0.35) * 0.05 * level, 0)
    place(y, bird_chirps(dur, r, density=0.15, kind="sparrow") * 0.03 * level, 0)
    place(y, crickets(dur, r, 2) * 0.012 * level, 0)
    place(y, widen(lp(colored(ns(dur), r, -1.5), 300) * 0.05 * level, r), 0)
    return y * bed(dur, 0.3)


def village_amb(dur, r, level=1.0):  # the village road: birds, a far scooter passing, a gentle breeze
    y = garden_amb(dur, r, 0.7 * level); n = ns(dur); t = np.arange(n) / SR
    t0 = r.uniform(1.0, max(1.5, dur - 1.0)); w = np.exp(-((t - t0) / 1.6) ** 2)
    place(y, pan(lp(bp(np.sign(np.sin(phase(np.full(n, 62.0)))) + 0.3 * r.standard_normal(n), 80, 1400), 900) * w * 0.035 * level, r.uniform(-0.8, 0.8)), 0)
    return y * bed(dur, 0.3)


def beach_amb(dur, r, level=1.0):
    y = np.zeros((2, ns(dur))); place(y, surf(dur, r, 0.045 * level), 0); place(y, breeze(dur, r, 0.1 * level, 0.3, 1800), 0)
    place(y, bird_chirps(dur, r, density=0.12) * 0.02 * level, 0); return y


def sfx_track():
    r = rng(7031); out = np.zeros((2, ns(DUR) + SR))
    P = lambda x, t, p=0.0, g=1.0: place(out, pan(x * g, p), t)
    W = lambda d, t, p=0.0, g=0.35: P(whoosh(d, r, peak=0.05, f_lo=350, f_hi=1800), t, p, g)
    # ---- beds
    place(out, garden_amb(14.7, r), 0.0); place(out, village_amb(6.7, r), 14.4); place(out, garden_amb(6.2, r), 20.9)
    place(out, beach_amb(6.7, r), 26.9); place(out, village_amb(5.7, r), 33.4); place(out, beach_amb(5.7, r, 1.1), 38.9)
    place(out, breeze(4.7, r, 0.09, 0.25, 1100) * bed(4.7, 0.3), 44.4); place(out, garden_amb(4.7, r, 0.6), 44.4)
    place(out, lp(garden_amb(7.2, r, 0.7), 900), 48.9); place(out, garden_amb(6.2, r), 55.9); place(out, village_amb(6.6, r), 61.9)
    # 1. salt thrown in handfuls every 0.55 s while he walks slowly round the palm
    tk = -0.05
    while tk < 6.4:
        if tk + 0.05 > 0: P(salt_throw(r), tk + 0.05, 0.15, 0.42)
        tk += 0.55
    steps(r, out, 0.2, 6.4, 0.75, 0.1, 0.22)
    # 2. throws go on; Pak Karto walks in with the hoe, sets it down; his line (voice added later); the smile
    tk = 6.45
    while tk < 9.0: P(salt_throw(r), tk + 0.05, 0.2, 0.38); tk += 0.55
    steps(r, out, 6.5, 8.25, 0.36, -0.4, 0.28); P(hoe_tap(r), 8.3, -0.3)
    P(ding(r, 1760, 0.6), 12.7, 0.2, 0.08)
    # 3. warung: Bu Warung's shock, Pak Darman's heavy steps with the sack, the young mother hurries in and stops
    P(pop(r, 900, 400) * 0.25, 14.9, 0.2); P(sack_shift(r, 0.5), 14.6, 0.0); steps(r, out, 14.6, 18.0, 0.42, 0.0, 0.32, 1.3); P(sack_shift(r, 0.4), 16.4, 0.0, 0.7)
    steps(r, out, 16.1, 18.8, 0.3, -0.4, 0.24); P(pop(r, 1200, 700) * 0.2, 18.45, -0.2); P(sting(r) * 0.15, 18.5, -0.2)
    # 4. the slow tilt up the sick palm; the small nut turned in his hands, a knock on it
    W(1.2, 21.1); P(nut_knock(r), 24.9, 0.0); P(nut_knock(r) * 0.7, 25.2, 0.0)
    # 5. the coast: the big nut lifted (a little shine), Pak Darman's surprise
    P(pop(r, 800, 380) * 0.2, 27.3, 0.2); P(shimmer(0.7, r, 14, 3000, 7500) * 0.18, 28.0, -0.2); P(nut_knock(r) * 0.6, 28.1, -0.2)
    # 6. two years later: a whoosh up the lush crown, the pickup idling, the buyer's happy wave
    W(1.0, 33.6); P(engine_idle(5.4, r), 35.6, -0.4); P(ding(r, 1568, 0.8), 35.9, 0.0, 0.12); P(ding(r, 2093, 0.8), 36.05, 0.0, 0.1)
    # 7a. surf breaking, salty spray carried inland on the wind (a gust and a soft hiss)
    P(whoosh(1.6, r, peak=0.07, f_lo=500, f_hi=4000, width=1.0, air=0.4), 41.6, 0.0, 0.5)
    # 7b. high over the hills: only the wind (bed above)
    # 8a. the pit: rain starts, the crystals melt with a fizz, the glow sinks to the roots and climbs the trunk
    tr = np.arange(ns(6.4)) / SR; renv = np.clip(tr / 0.6, 0, 1) * np.clip((6.2 - tr) / 1.0, 0, 1)
    place(out, rain(6.4, r, 1.0, renv), 49.1); P(fizz(2.8, r), 50.6, 0.0); P(shimmer(3.6, r, 10, 2500, 6000) * 0.14, 51.4, 0.0)
    # 8b. tilt down the heavy crown; his wink
    W(1.2, 56.1); P(ding(r, 1980, 0.5), 59.6, 0.1, 0.07)
    # 9. the empty salt rack again; Pak Karto shuffles past with a sack (voice lines added later)
    steps(r, out, 66.4, 68.4, 0.45, 0.3, 0.3, 1.3); P(sack_shift(r, 0.5), 66.5, 0.3, 0.8); P(pop(r, 1300, 800) * 0.2, 67.35, -0.3)
    t = np.arange(out.shape[1]) / SR; out *= np.interp(t, [0, 0.03, 67.9, 68.5], [0, 1, 1, 0])
    return out[:, : ns(DUR)]


def main(outdir):
    import os
    os.makedirs(outdir, exist_ok=True)
    sfx = sfx_track(); sfx *= dbg(-24.0 - integrated(sfx)); sfx = limit(sfx, 0.6)
    write_wav(f"{outdir}/sfx.wav", sfx)
    print(f"sfx: {integrated(sfx):.1f} LUFS, max momentary {momentary_max(sfx):.1f}, true peak {true_peak(sfx):.1f} dBTP, {sfx.shape[1] / SR:.2f}s")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "out/garam/audio")
