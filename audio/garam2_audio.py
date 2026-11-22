# Sound for "Garam di Pohon Kelapa" v2 (src/videos/garam/Film.tsx, 116 s): sound effects + ambience only, no music, no
# voices, no laughs (the user adds narration + subtitles). Cues are global seconds (scene start + local time in Film.tsx).
# Scene starts: S1 0, S2 6, S3 12, S4 28 (night), S5 35.5, S6 44.5, S7 52.5, S8 60, S9 67, S10 79, S11a 87, S11b 94.5,
# S12a 98, S12b 105.5, S13 109, end 116. Effects are shared with garam_audio.py (v1).
# Usage (from audio/): ../.tools/py/bin/python3 garam2_audio.py ../out/garam/audio2  -> sfx.wav
import sys
import numpy as np
from dsp import SR, ns, rng, lp, hp, bp, colored, pan, place, write_wav, integrated, true_peak, momentary_max, dbg
from sfx_gen import whoosh, clink, crickets, breeze
from ayam_sfx import pop, ding, sting, shimmer
from ketindihan_audio import thud, limit
from kopi2_audio import bed
from garam_audio import salt_throw, sack_shift, nut_knock, rain, fizz, engine_idle, steps, garden_amb, village_amb, beach_amb

DUR = 116.0


def night_amb(dur, r, level=1.0):  # a village night: crickets close and far, a low warm breeze, the odd frog
    y = np.zeros((2, ns(dur)))
    place(y, crickets(dur, r, 4) * 0.03 * level, 0); place(y, crickets(dur, r, 2) * 0.015 * level, 0)
    place(y, breeze(dur, r, 0.04 * level, 0.1, 700), 0)
    for _ in range(int(dur * 0.8)):
        n = ns(0.18); t = np.arange(n) / SR; f = r.uniform(260, 380)
        cro = bp(np.sign(np.sin(2 * np.pi * f * t)) * (0.5 + 0.5 * np.sin(2 * np.pi * 38 * t)), 150, 1200) * np.exp(-t / 0.07) * 0.02 * level
        place(y, pan(cro, r.uniform(-0.8, 0.8)), r.uniform(0, dur - 0.3))
    return y * bed(dur, 0.4)


def frond_fall(r, dur=1.3, g=1.0):  # a big dry frond dropping: a dry leafy rush, then the heavy slap on the ground
    n = ns(dur + 0.6); y = np.zeros(n); t = np.arange(n) / SR
    rush = bp(colored(n, r, 0.4), 1200, 6500) * np.clip(t / dur, 0, 1) ** 2 * (t < dur) * 0.12
    y += rush; slap = np.zeros(n); k = ns(0.5); i = ns(dur)
    th = lp(thud(r, 0.5), 700); th = th[0] if th.ndim == 2 else th; k = min(k, len(th), n - i)
    slap[i:i + k] = th[:k] * 0.5 + hp(r.standard_normal(k), 1800) * np.exp(-np.arange(k) / (k / 6)) * 0.2
    return (y + slap) * g


def tap(r):  # a fingertip on a phone screen
    return clink(r, f0=r.uniform(2400, 3000), dur=0.03, bright=0.4) * 0.05


def psst(r):  # a whisper's hiss (no words)
    n = ns(0.35); return bp(r.standard_normal(n), 2500, 7000) * np.sin(np.pi * np.arange(n) / n) ** 2 * 0.05


def sfx_track():
    r = rng(7032); out = np.zeros((2, ns(DUR) + SR))
    P = lambda x, t, p=0.0, g=1.0: place(out, pan(x * g, p), t)
    W = lambda d, t, p=0.0, g=0.35: P(whoosh(d, r, peak=0.05, f_lo=350, f_hi=1800), t, p, g)
    def throws(t0, t1, p=0.15, g=0.4, every=0.55):
        tk = t0
        while tk < t1: P(salt_throw(r), tk + 0.05, p, g); tk += every
    # ---- beds
    place(out, garden_amb(28.2, r), 0.0); place(out, night_amb(7.7, r), 27.9); place(out, garden_amb(9.2, r, 0.9), 35.4)
    place(out, village_amb(8.2, r), 44.4); place(out, garden_amb(14.7, r), 52.4); place(out, village_amb(3.0, r, 0.6), 74.4)
    place(out, garden_amb(12.2, r), 66.9); place(out, garden_amb(8.2, r, 0.8), 78.9); place(out, beach_amb(7.7, r, 1.1), 86.9)
    place(out, breeze(3.7, r, 0.09, 0.25, 1100) * bed(3.7, 0.3), 94.4); place(out, lp(garden_amb(7.7, r, 0.7), 900), 97.9)
    place(out, garden_amb(3.7, r), 105.4); place(out, village_amb(7.1, r), 108.9)
    # S1 hook: handfuls of salt every 0.55 s while he walks round the palm
    throws(-0.05, 5.9, 0.15, 0.42); steps(r, out, 0.2, 5.9, 0.75, 0.1, 0.22)
    # S2 the slow tilt up the limp yellow crown; the small nut in his hands
    W(1.2, 6.1); P(nut_knock(r), 10.2, 0.0); P(nut_knock(r) * 0.7, 10.5, 0.0)
    # S3 the watcher: Darman scattering in the background; day 3 counting (soft ticks); day 7 crouch, dab, lick, SALTY
    throws(12.0, 18.9, 0.35, 0.22)
    for i, tk in enumerate([19.0, 20.2, 20.9, 21.6, 22.3, 23.0]): P(clink(r, f0=1700 + 120 * i, dur=0.06, bright=0.2) * 0.05, tk, -0.2)
    P(sack_shift(r, 0.35) * 0.6, 23.6, -0.1); P(salt_throw(r) * 0.25, 24.3, 0.1); P(pop(r, 1500, 900) * 0.15, 25.6, -0.1)
    P(sting(r) * 0.16, 26.4, 0.0); P(pop(r, 700, 300) * 0.22, 26.42, 0.0)
    # S4 night: phone taps; the shock; the insert on the screen
    for tk in [28.7, 29.3, 30.4, 31.0]: P(tap(r), tk, 0.0)
    P(sting(r) * 0.14, 32.4, 0.0); W(0.7, 33.1, 0.0, 0.2); P(tap(r), 34.0, 0.0)
    # S5 dawn: Karto runs in; Darman's last handfuls; the phone pushed up; Darman goes back to it; Karto's jaw drops
    steps(r, out, 35.5, 37.1, 0.26, -0.4, 0.3); throws(35.45, 36.75, 0.3, 0.35); W(0.4, 37.1, -0.1, 0.2)
    throws(41.45, 44.4, 0.3, 0.35); P(pop(r, 900, 400) * 0.2, 42.1, -0.3)
    # S6 warung: Bu Warung's shock, Darman's heavy steps with the sack, the mother hurries in, finds nothing; whispers
    P(pop(r, 900, 400) * 0.25, 44.9, 0.2); P(sack_shift(r, 0.5), 44.6, 0.0); steps(r, out, 44.6, 48.0, 0.42, 0.0, 0.32, 1.3)
    steps(r, out, 46.1, 48.8, 0.3, -0.4, 0.24); P(pop(r, 1200, 700) * 0.2, 48.4, -0.2)
    P(psst(r), 50.6, 0.2); P(psst(r) * 0.8, 51.3, -0.2); steps(r, out, 50.5, 52.4, 0.45, -0.7, 0.12, 1.2)
    # S7 a month later: a dry frond rushes down and slaps the ground; a second one further off
    P(frond_fall(r, 1.25, 1.0), 53.05, 0.1); P(frond_fall(r, 1.25, 0.45), 56.3, 0.4)
    # S8 time-lapse: a soft whoosh at each jump; rain comes and goes; Darman's handfuls quieter
    for tk in [60.0, 61.8, 63.9, 65.5]: W(0.6, tk - 0.1, 0.0, 0.18)
    tr = np.arange(ns(2.8)) / SR; renv = np.clip(tr / 0.4, 0, 1) * np.clip((2.8 - tr) / 0.5, 0, 1); place(out, rain(2.8, r, 1.2, renv), 61.6)
    throws(60.0, 66.8, 0.4, 0.15, 0.55)
    # S9 two years later: rise over the gardens; the full crown (a little shine); the pickup idling, the buyer's wave
    W(1.4, 67.1, 0.0, 0.3); P(shimmer(1.2, r, 12, 3000, 7500) * 0.12, 71.6, 0.0); P(engine_idle(2.8, r), 74.5, -0.4)
    P(ding(r, 1568, 0.8), 74.9, 0.0, 0.1); P(nut_knock(r) * 0.6, 77.8, -0.2)
    # S10 the question (voices added later); Darman turns to look far off
    W(0.6, 86.0, 0.3, 0.12)
    # S11a coast: surf + a gust carrying spray inland
    P(whoosh(1.6, r, peak=0.07, f_lo=500, f_hi=4000, width=1.0, air=0.4), 91.0, 0.0, 0.5)
    # S12a the pit: rain on the surface, crystals fizz away, the water soaks down, the glow climbs
    tr = np.arange(ns(5.8)) / SR; renv = np.clip(tr / 0.5, 0, 1) * np.clip((5.6 - tr) / 1.0, 0, 1); place(out, rain(5.8, r, 1.0, renv), 98.0)
    P(fizz(2.6, r), 98.9, 0.0); P(shimmer(4.2, r, 10, 2500, 6000) * 0.14, 101.0, 0.0)
    # S12b the lush crown down to Darman
    W(1.2, 105.6); P(ding(r, 1980, 0.5), 107.6, 0.1, 0.06)
    # S13 the empty salt rack again; Pak Karto shuffles past with a sack (voice lines added later)
    steps(r, out, 113.5, 116.0, 0.45, 0.3, 0.3, 1.3); P(sack_shift(r, 0.5), 113.6, 0.3, 0.8); P(pop(r, 1300, 800) * 0.2, 114.32, -0.3)
    t = np.arange(out.shape[1]) / SR; out *= np.interp(t, [0, 0.03, 115.4, 116.0], [0, 1, 1, 0])
    return out[:, : ns(DUR)]


def main(outdir):
    import os
    os.makedirs(outdir, exist_ok=True)
    sfx = sfx_track(); sfx *= dbg(-24.0 - integrated(sfx)); sfx = limit(sfx, 0.6)
    write_wav(f"{outdir}/sfx.wav", sfx)
    print(f"sfx: {integrated(sfx):.1f} LUFS, max momentary {momentary_max(sfx):.1f}, true peak {true_peak(sfx):.1f} dBTP, {sfx.shape[1] / SR:.2f}s")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "../out/garam/audio2")
