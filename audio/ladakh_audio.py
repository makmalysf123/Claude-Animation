# Sound for "Menara Es Dolma" (src/videos/ladakh/Film.tsx, 116 s): sound effects + ambience only.
# There is no music, no voices and no laughs; the user adds narration and subtitles.
# Cues are global seconds (scene start + local time in Film.tsx). Scene starts:
#   S1 0
#   S2a 10, S2b 14.2, S2c 17, S2d 19
#   S3a 22, S3b 27
#   S4a 31 (night), S4b 35.5 (night), S4c 38.5, S4d 41.5
#   S5a 44 (night), S5b 48 (night), S5c 52
#   S6a 56, S6b 59, S6c 61.8
#   S7a 64, S7b 70, S7c 74
#   S8a 77, S8b 80.5, S8c 83.5, S8d 86.5
#   S9a 90, S9b 95, S9c 98.5, S9d 102, S9e 107
#   S10 110, end 116
# Ladakh is a cold high desert: wind and prayer flags, no insects in winter, a few birds in April.
# Usage (from audio/): ../.tools/py/bin/python3 ladakh_audio.py ../out/ladakh/audio  -> sfx.wav
import sys
import numpy as np
from dsp import SR, ns, rng, lp, hp, bp, colored, pan, place, write_wav, integrated, true_peak, momentary_max, dbg
from sfx_gen import whoosh, clink, breeze, bubbles, water_bed, flag_flutter, bird_chirps, swing_squeak, rattle
from ayam_sfx import pop, ding, shimmer
from ketindihan_audio import thud, limit
from kopi2_audio import bed
from emas_audio import rustle, scrape

DUR = 116.0
mono = lambda x: x if x.ndim == 1 else x[0]  # some shared effects return stereo


def mixl(*xs):  # add mono sounds of different lengths
    y = np.zeros(max(len(x) for x in xs))
    for x in xs: y[: len(x)] += x
    return y


# ---------------- beds ----------------
def mountain_wind(dur, r, level=1.0, cold=1.0):
    """thin high-valley wind: a low steady rush with slow gusts, and a far whistle on the gusts"""
    y = np.zeros((2, ns(dur)))
    place(y, breeze(dur, r, 0.07 * level, 0.35, 600 + 300 * cold), 0)
    t = np.arange(ns(dur)) / SR; g = 0.5 + 0.5 * np.sin(2 * np.pi * t / 5.3 + r.uniform(0, 6)) ** 2
    wh = bp(colored(ns(dur), r, 0.3), 1400, 2600) * g * 0.006 * level * cold
    place(y, pan(wh, -0.3), 0)
    return y * bed(dur, 0.4)


def flags(dur, r, level=1.0):  # prayer flags snapping in the wind, a little off to one side
    return pan(flag_flutter(dur, r) * 0.25 * level, 0.35) * bed(dur, 0.3)


def winter_bed(dur, r, level=1.0):
    y = mountain_wind(dur, r, level); place(y, flags(dur, r, 0.6 * level), 0); return y


def night_bed(dur, r, level=1.0):  # night: colder, emptier wind, no flags in close
    y = mountain_wind(dur, r, 0.8 * level, cold=1.4); place(y, lp(flags(dur, r, 0.3 * level), 2500), 0); return y


def spring_bed(dur, r, level=1.0, birds=0.4):  # April: softer wind, a few birds
    y = mountain_wind(dur, r, 0.7 * level, cold=0.6); place(y, flags(dur, r, 0.5 * level), 0)
    place(y, bird_chirps(dur, r, birds, "sparrow") * 0.25 * level, 0); return y


# ---------------- effects ----------------
def spray(dur, r, level=1.0):
    """the fountain at the cone tip: a fine high hiss, with ice beads tinkling down"""
    n = ns(dur); y = np.zeros((2, n))
    for ch in range(2): y[ch] += hp(r.standard_normal(n), 3500) * 0.012 * level
    for _ in range(int(dur * 9)):
        place(y, pan(clink(r, f0=r.uniform(4200, 7600), dur=0.05, bright=0.6) * r.uniform(0.004, 0.012) * level, r.uniform(-0.6, 0.6)), r.uniform(0, dur - 0.1))
    return y * bed(dur, 0.25)


def crunch(r, g=1.0):  # one boot on frozen ground and old snow: a short grainy crunch
    n = ns(0.16); t = np.arange(n) / SR
    grains = np.zeros(n)
    for _ in range(40): i = r.integers(0, n - 200); grains[i:i + 60] += r.standard_normal(60) * np.exp(-np.arange(60) / 12)
    return (bp(grains, 900, 6000) * 0.22 + lp(r.standard_normal(n), 400) * np.exp(-t / 0.02) * 0.3) * np.exp(-t / 0.06) * g


def crunch_steps(r, out, t0, t1, every, p=0.0, g=0.3):
    tm = t0; k = 0
    while tm < t1:
        place(out, pan(crunch(r, g * r.uniform(0.85, 1.1)), p + 0.05 * (-1) ** k), tm); tm += every * r.uniform(0.95, 1.05); k += 1


def dig(r, g=1.0):  # the spade bites hard frozen soil: a scrape, a dull chock, crumbs falling
    s = scrape(r, 0.22) * 0.8; th = thud(r, 0.6); th = th if th.ndim == 1 else th[0]
    n = ns(0.7); y = np.zeros(n); y[: len(s)] += s; i = ns(0.12); k = min(len(th), n - i); y[i:i + k] += th[:k] * 0.5
    cr = rattle(0.4, r, 26); cr = cr if cr.ndim == 1 else cr[0]; i = ns(0.25); k = min(len(cr), n - i); y[i:i + k] += cr[:k] * 0.18
    return y * g


def pen(r, dur):  # a ballpoint on paper on a wooden table
    n = ns(dur); t = np.arange(n) / SR
    return bp(r.standard_normal(n), 2500, 8000) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 7 * t))) * 0.025 * bed(dur, 0.03)


def tok(r):  # a stick knocking solid ice: hard, short, a little ringing
    th = thud(r, 0.4); th = th if th.ndim == 1 else th[0]
    y = np.zeros(ns(0.2)); a = hp(th, 250)[: len(y)]; y[: len(a)] += a * 0.6
    c = clink(r, f0=r.uniform(1800, 2200), dur=0.12, bright=0.3)[: len(y)]; y[: len(c)] += c * 0.08; return y


def ice_crack(r):  # the tip snaps: a sharp high crack with a splintering tail
    n = ns(0.6); t = np.arange(n) / SR
    y = hp(r.standard_normal(n), 1500) * np.exp(-t / 0.012) * 0.9
    for _ in range(14): i = r.integers(ns(0.01), ns(0.4)); k = ns(0.02); y[i:i + k] += hp(r.standard_normal(k), 2500) * np.exp(-np.arange(k) / 80) * r.uniform(0.1, 0.35)
    return y * 0.5


def ice_crash(r):  # the tip lands: a heavy thump and ice shards skittering
    th = thud(r, 1.4); th = th if th.ndim == 1 else th[0]
    n = ns(1.2); y = np.zeros(n); y[: len(th)] += th * 0.8
    for _ in range(30):
        c = clink(r, f0=r.uniform(2500, 6500), dur=0.08, bright=0.8); i = r.integers(0, ns(0.7)); k = min(len(c), n - i); y[i:i + k] += c[:k] * r.uniform(0.01, 0.04)
    return y


def drip(r, g=1.0):  # one drop into water
    n = ns(0.12); t = np.arange(n) / SR; f = r.uniform(1100, 1700)
    return np.sin(2 * np.pi * f * (1 + 0.8 * t / 0.12) * t) * np.exp(-t / 0.025) * 0.06 * g


def drips(r, out, t0, t1, rate, p=0.0, g=1.0):
    tm = t0
    while tm < t1:
        place(out, pan(drip(r, g * r.uniform(0.6, 1.1)), p + r.uniform(-0.3, 0.3)), tm); tm += r.exponential(1 / rate)


def trickle(dur, r, level=1.0):  # a small channel of running water
    return bubbles(dur, r, 22, 500, 2600) * 0.05 * level * bed(dur, 0.3)


def bucket(r, g=1.0):  # an empty bucket's handle clanks
    return mixl(clink(r, f0=r.uniform(700, 900), dur=0.25, bright=0.4) * 0.15, clink(r, f0=r.uniform(2100, 2500), dur=0.08, bright=0.5) * 0.05) * g


def seeds(r):  # a handful of barley seed hissing out over soil
    return hp(mono(rattle(0.45, r, 60)), 1800) * 0.12


def click(r):  # a torch switch
    return clink(r, f0=3200, dur=0.02, bright=0.5) * 0.08


def sfx_track():
    r = rng(2611); out = np.zeros((2, ns(DUR) + SR))
    P = lambda x, t, p=0.0, g=1.0: place(out, pan(x * g, p) if x.ndim == 1 else x * g, t)
    W = lambda d, t, p=0.0, g=0.3: P(whoosh(d, r, peak=0.05, f_lo=350, f_hi=1800), t, p, g)
    # ---- beds (each scene's look: winter day, night, March, April)
    place(out, winter_bed(31.2, r), 0.0); place(out, night_bed(7.8, r), 30.9); place(out, winter_bed(5.8, r, 0.8), 38.4)
    place(out, night_bed(8.2, r), 43.9); place(out, winter_bed(12.1, r), 51.9); place(out, spring_bed(13.2, r, 0.9, 0.15), 63.9)
    place(out, spring_bed(13.3, r, 1.0, 0.3), 76.9); place(out, mountain_wind(5.2, r, 1.2), 89.9); place(out, winter_bed(15.1, r, 0.7), 94.9)
    place(out, spring_bed(6.2, r, 0.9, 0.5), 109.9)
    # S1 hook: the spray hissing at the tip; the ladder creaks; the new pipe section clunks home at ~3 s
    place(out, spray(10.0, r, 1.0), 0.0); P(swing_squeak(r, 0.3), 0.6, -0.3, 0.25); P(clink(r, f0=420, dur=0.35, bright=0.3) * 0.12, 3.0, 0.1)
    P(mono(thud(r, 0.3))[: ns(0.2)], 3.02, 0.1, 0.2); W(1.4, 5.3, 0.0, 0.35)
    # S2 the offer: paper handed over and unfolded; Tashi paces her field with crunching strides
    place(out, spray(12.0, r, 0.4), 10.0); P(rustle(r, 0.5), 14.75, 0.2, 0.5); P(rustle(r, 0.6), 15.5, 0.3, 0.4); P(rustle(r, 0.4), 17.15, 0.0, 0.35)
    crunch_steps(r, out, 19.05, 21.9, 0.5, 0.0, 0.35)
    # S3a the valve wheel squeaks round and round while Tashi talks (his line is added later)
    tm = 22.2
    while tm < 26.8: P(swing_squeak(r, 0.35, True), tm, 0.25, 0.22); tm += 1.2
    place(out, spray(5.0, r, 0.6), 22.0)
    # S3b the tea stall: the kettle on the stove, glass on glass, a sip
    place(out, bubbles(4.0, r, 10, 200, 1200) * 0.05 * bed(4.0, 0.3), 27.0); P(clink(r, f0=2600, dur=0.15, bright=0.5) * 0.05, 27.6, 0.2); P(clink(r, f0=2300, dur=0.15, bright=0.5) * 0.04, 29.9, -0.2)
    # S4a night digging: one bite of the spade every 1.43 s
    tm = 31.0 + 0.45 / 0.7
    while tm < 35.4: P(dig(r), tm, 0.1, 0.55); tm += 1 / 0.7
    # S4b the thermometer: the wind alone, a tiny tick of the frost on the board
    P(clink(r, f0=5200, dur=0.03, bright=0.3) * 0.02, 36.6, 0.0)
    # S4c the pen: strike, write, strike, write
    for a, b in [(38.65, 39.1), (39.2, 39.8), (40.05, 40.5), (40.6, 41.2)]: P(pen(r, b - a), a, 0.0, 1.2)
    # S4d the stall again: kettle, a far glass
    place(out, bubbles(2.5, r, 10, 200, 1200) * 0.05 * bed(2.5, 0.3), 41.5)
    # S5a night: the torch switched on in his hand; S5b nights pass (a soft whoosh each); spray glitter growing
    P(click(r), 44.35, -0.1); P(click(r), 44.42, -0.1)
    for tm in [48.0, 49.0, 50.0, 51.0]: W(0.5, tm - 0.05, 0.0, 0.16)
    P(shimmer(4.0, r, 12, 3500, 8000) * 0.06, 48.0, 0.2)
    # S5c the stick knocks the ice: hard as stone
    for tm in [52.17, 52.87]: P(tok(r), tm, 0.2, 0.6)
    place(out, spray(4.0, r, 0.35), 52.0)
    # S6a the slab grinds up; water gushes through the gate and spreads over the field
    P(scrape(r, 0.6), 56.2, -0.2, 0.7); P(mono(thud(r, 0.4))[: ns(0.25)], 56.85, -0.2, 0.3)
    wb = water_bed(4.4, r, 0.7, 0.6); place(out, wb * 0.35 * bed(4.4, 0.4), 56.6)
    # S6b high view: wind; S6c he poses, slips (whoosh + scuff), flails, catches himself
    W(0.5, 62.6, 0.1, 0.3); P(scrape(r, 0.25), 62.68, 0.1, 0.5); P(pop(r, 800, 380) * 0.22, 62.72, 0.1)
    P(crunch(r, 0.4), 63.35, 0.0); P(crunch(r, 0.3), 63.6, 0.1)
    # S7a March time-lapse: the sheet thaws (trickle growing), drips from the cone; a soft whoosh per day
    place(out, trickle(6.0, r, 1.2), 64.0); drips(r, out, 64.2, 69.8, 3.0, 0.3, 0.8)
    for tm in [64.0, 65.5, 67.0, 68.5]: W(0.6, tm, 0.0, 0.12)
    # S7b CRACK: the tip snaps, falls, lands beside the cone in a burst of ice
    P(ice_crack(r), 70.55, 0.2, 1.0); P(whoosh(0.6, r, peak=0.06, f_lo=600, f_hi=3000), 70.65, 0.3, 0.35); P(ice_crash(r), 71.2, 0.35, 0.9)
    P(pop(r, 900, 400) * 0.2, 70.62, -0.3); drips(r, out, 72.0, 77.0, 1.5, 0.0, 0.7)
    # S8a April: the dry stream bed, the empty bucket swings; S8b Tashi in his dry field (wind only)
    P(bucket(r), 77.8, 0.0, 0.8); P(bucket(r), 79.6, 0.0, 0.5)
    # S8c silence... then one drop. More. The channel runs.
    P(drip(r, 1.8), 84.25, 0.0); drips(r, out, 84.9, 86.5, 3.0, 0.0, 1.0); place(out, trickle(3.0, r, 1.0), 85.0)
    # S8d sowing along the wet channel: one fling of seed every 0.9 s, soft steps
    place(out, trickle(3.5, r, 0.6), 86.5); tm = 86.5 + 0.36
    while tm < 89.9: P(seeds(r), tm, 0.1, 1.0); tm += 0.9
    crunch_steps(r, out, 86.7, 89.8, 0.7, -0.1, 0.12)
    # S9a high wind on the snow range, tilt down to the dry bed
    W(2.0, 91.6, 0.0, 0.25)
    # S9b winter: the stream still runs under the ice into the intake
    place(out, water_bed(3.5, r, 0.5, 0.4) * 0.25 * bed(3.5, 0.3), 95.0); place(out, bubbles(3.5, r, 12, 200, 900) * 0.06 * bed(3.5, 0.3), 95.0)
    # S9c the pit: muffled flow in the buried pipe
    place(out, lp(water_bed(3.5, r, 0.4, 0.3), 700) * 0.35 * bed(3.5, 0.3), 98.5); W(1.0, 98.6, 0.0, 0.15)
    # S9d the two shapes in the sun: a whoosh per day; the slab trickles away, the cone only drips
    for tm in [102.0, 103.25, 104.5, 105.75]: W(0.5, tm, 0.0, 0.12)
    place(out, trickle(4.0, r, 0.9), 102.6); drips(r, out, 102.5, 106.8, 1.2, 0.3, 0.6)
    # S9e back to the spray at the top
    place(out, spray(3.0, r, 1.0), 107.0)
    # S10 the queue at her channel: water running, Dolma walks over, takes his bucket, sets it down at the front
    place(out, trickle(6.0, r, 0.7), 110.0); crunch_steps(r, out, 110.6, 112.9, 0.55, 0.2, 0.13); P(bucket(r), 113.05, -0.2, 0.7)
    crunch_steps(r, out, 113.5, 115.6, 0.55, -0.1, 0.13); P(bucket(r), 115.72, 0.1, 0.8)
    t = np.arange(out.shape[1]) / SR; out *= np.interp(t, [0, 0.03, 115.4, 116.0], [0, 1, 1, 0])
    return out[:, : ns(DUR)]


def main(outdir):
    import os
    os.makedirs(outdir, exist_ok=True)
    sfx = sfx_track(); sfx *= dbg(-24.0 - integrated(sfx)); sfx = limit(sfx, 0.6)
    write_wav(f"{outdir}/sfx.wav", sfx)
    print(f"sfx: {integrated(sfx):.1f} LUFS, max momentary {momentary_max(sfx):.1f}, true peak {true_peak(sfx):.1f} dBTP, {sfx.shape[1] / SR:.2f}s")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "../out/ladakh/audio")
