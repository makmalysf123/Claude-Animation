# Sound for "Kopi Mahal Itu Cuma Gengsi?" v2 (src/videos/kopi/Film2.tsx, 85 s): sound effects + music only.
# The user adds narration + subtitles in CapCut, so the music sits ~10 dB under where the voice will go.
# Every cue is a global second = scene start + the local time the picture uses in Film2.tsx.
# Usage: .tools/py/bin/python3 audio/kopi2_audio.py out/kopi/v2audio  -> sfx.wav, music.wav, audio.wav (mix)
import sys
import numpy as np
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, phase, pan, place, widen,
                 write_wav, integrated, true_peak, momentary_max, make_ir, convolve_st, dbg)
from sfx_gen import whoosh, clink, breeze, bird_chirps, crickets, babble, boot, stroll_step, vox, vowel_track, _track, bubbles
from ayam_sfx import pop, ding, sting, shimmer, riser, sizzle
from ketindihan_audio import yawn, squeak, thud, hum, gated_buzz, clap, paper_plak, limit
import instruments as I

DUR = 85.0


def bed(dur, fade=0.4):
    n = ns(dur); e = np.ones(n); a = min(n // 2, ns(fade)); e[:a] = np.linspace(0, 1, a); e[-a:] = np.linspace(1, 0, a); return e


def add(*xs):  # sum mono sounds of different lengths
    y = np.zeros(max(len(x) for x in xs))
    for x in xs: y[: len(x)] += x
    return y


# ---------------- small effects made for this film ----------------
def tear(r, dur=0.22):  # sachet / paper tear: dense crackly noise that rises then stops
    n = ns(dur); t = np.arange(n) / SR
    g = (r.uniform(size=n) < 0.35) * (0.4 + 0.6 * t / dur)
    return bp(r.standard_normal(n) * g, 1200, 7000) * np.clip((dur - t) / 0.01, 0, 1) * 0.9


def crinkle(dur, r, density=40):  # plastic: random crackles
    y = np.zeros(ns(dur))
    for _ in range(int(dur * density)):
        k = r.integers(60, 400); i = r.integers(0, max(1, len(y) - k))
        y[i:i + k] += bp(r.standard_normal(k), 1500, 8000) * np.exp(-np.arange(k) / (k / 4)) * r.uniform(0.2, 0.8)
    return y * bed(dur, 0.05)


def pour_powder(dur, r):  # fine powder sliding: soft high hiss
    n = ns(dur); return bp(colored(n, r, -0.5), 2500, 9000) * bed(dur, 0.05) * 0.25


def pour_water(dur, r):  # trickle into a cup: filtered noise + small bubbles, pitch rising as it fills
    n = ns(dur); t = np.arange(n) / SR
    s = bp(colored(n, r, -1.0), 400, 3000) * (0.6 + 0.4 * smooth_noise(n, r, 9)) * 0.5
    b = bubbles(dur, r, 30, 600, 2200) * 0.35
    return (s + b) * bed(dur, 0.06)


def steam(dur, r, level=1.0):  # espresso steam wand / kettle steam: bright hiss with a wobble
    n = ns(dur); return hp(r.standard_normal(n), 3500) * (0.7 + 0.3 * smooth_noise(n, r, 6)) * bed(dur, 0.08) * 0.35 * level


def chalk(dur, r):  # chalk on board: squeaky scratchy strokes ~9 per second
    n = ns(dur); y = np.zeros(n); tm = 0.0
    while tm < dur - 0.05:
        L = r.uniform(0.06, 0.12); k = ns(L); i = ns(tm); tl = np.arange(k) / SR
        s = bp(r.standard_normal(k), 1800, 6000) * np.sin(np.pi * tl / L) * 0.6 + np.sin(phase(np.full(k, r.uniform(2500, 3400)))) * np.sin(np.pi * tl / L) * 0.12
        y[i:i + k] += s[: n - i]; tm += L + r.uniform(0.0, 0.04)
    return y


def blow(r, dur=0.45):  # a puff of breath
    n = ns(dur); t = np.arange(n) / SR
    return bp(r.standard_normal(n), 300, 3000) * np.clip(t / 0.03, 0, 1) * np.exp(-t / 0.18) * 0.6


def shutter(r):  # phone camera: click-clack
    y = np.zeros(ns(0.12)); a = clap(r) * 0.6; y[: len(a)] += a; b = clap(r) * 0.4; i = ns(0.055); y[i:i + len(b)] += b[: len(y) - i]
    return y


def laugh(dur, r, base=260, rate=5.0, scale=1.12):  # "ha-ha-ha" bursts (vowel a), pitch bouncing, breathy
    n = ns(dur); t = np.arange(n) / SR
    syl = 0.5 - 0.5 * np.cos(TAU * rate * t); env = np.clip(syl * 1.6 - 0.35, 0, 1) ** 1.3
    f0 = base * (1 + 0.18 * np.sin(TAU * rate * t) + 0.08 * smooth_noise(n, r, 2)) * _track(n, [(0, 1.1), (dur, 0.9)], t)
    y = vox(f0, vowel_track(n, [(0, "a"), (dur, "a")]), env, r, scale, tilt=1.0, breath=0.45)
    return y * bed(dur, 0.05) * 0.35


def cough(r):
    n = ns(0.18); t = np.arange(n) / SR
    return bp(r.standard_normal(n), 250, 2500) * np.clip(t / 0.004, 0, 1) * np.exp(-t / 0.05) * 0.9


def slurp(dur, r):  # sip: airy hiss with bubbly wet clicks
    n = ns(dur); t = np.arange(n) / SR
    s = bp(r.standard_normal(n), 800, 4000) * (0.5 + 0.5 * np.sin(np.pi * t / dur)) * 0.25
    return (s + bubbles(dur, r, 40, 500, 1800) * 0.3) * bed(dur, 0.04)


def spit(r):  # pfffft spray
    n = ns(0.5); t = np.arange(n) / SR
    bl = bp(r.standard_normal(n), 400, 6000) * np.clip(t / 0.01, 0, 1) * np.exp(-t / 0.15)
    lip = np.sin(phase(np.full(n, 90.0))) * np.exp(-t / 0.05) * 0.5
    return (bl + lip) * 0.9


def stamp(r):  # rubber stamp "TOK"
    return add(thud(r, 0.8) * 0.8, clap(r) * 0.4)


def shh(dur, r):
    n = ns(dur); return hp(r.standard_normal(n), 2500) * bed(dur, 0.06) * 0.35


def glug(dur, r):  # gulping: low bubbly gulps ~4 per second
    n = ns(dur); y = np.zeros(n)
    for k in range(int(dur * 4)):
        g = pop(r, 300, 120) * 0.7; i = ns(k / 4 + r.uniform(0, 0.03)); y[i:i + len(g)] += g[: n - i]
    return y + bubbles(dur, r, 20, 200, 700) * 0.3


def scratch(r):  # record scratch "freeze"
    n = ns(0.45); t = np.arange(n) / SR
    f = 600 * (1 + 0.9 * np.sin(TAU * 3.2 * t)); y = bp(r.standard_normal(n), 200, 5000) * 0.4 + np.sin(phase(f)) * 0.25
    return y * np.clip((0.45 - t) / 0.05, 0, 1) * np.clip(t / 0.005, 0, 1)


def scribble(dur, r):  # pen scratching fast
    n = ns(dur); t = np.arange(n) / SR
    return bp(r.standard_normal(n), 2000, 7000) * (0.5 + 0.5 * np.abs(np.sin(TAU * 7 * t))) * bed(dur, 0.03) * 0.3


def purr(dur, r):
    n = ns(dur); t = np.arange(n) / SR
    return lp(r.standard_normal(n), 250) * (0.5 + 0.5 * np.sin(TAU * 25 * t)) * (0.6 + 0.4 * np.sin(TAU * 0.45 * t)) * 0.4


def fly(dur, r):
    return gated_buzz(dur, r, lambda t: np.ones_like(t)) * (0.6 + 0.4 * smooth_noise(ns(dur), r, 3)) * 0.35


def snore(dur, r):
    n = ns(dur); t = np.arange(n) / SR; ph = (t * 0.55) % 1.0
    inh = bp(r.standard_normal(n), 80, 900) * np.clip(np.sin(np.pi * ph / 0.6), 0, 1) * (ph < 0.6) * (0.5 + 0.5 * np.sin(TAU * 32 * t))
    return inh * 0.5


def cafe_amb(dur, r, busy=1.0):  # rival cafe: soft crowd, cup clinks, espresso machine hum
    n = ns(dur); y = np.zeros((2, n))
    for k in range(int(5 * busy) + 2):
        place(y, pan(babble(dur, r, r.uniform(110, 240), r.uniform(0.95, 1.2)) * 0.05, r.uniform(-0.8, 0.8)), 0)
    for _ in range(int(dur * 1.6 * busy)):
        place(y, pan(clink(r, f0=r.uniform(2400, 4200), dur=0.2, bright=0.6) * 0.1, r.uniform(-0.7, 0.7)), r.uniform(0, dur - 0.2))
    place(y, widen(lp(colored(n, r, -1.5), 300) * 0.15 + hum(dur, r, 100) * 0.03, r), 0)
    return y * bed(dur, 0.3)


def street_amb(dur, r, level=1.0):  # passing motorbikes, far horns, breeze, birds
    n = ns(dur); y = np.zeros((2, n)); place(y, breeze(dur, r, level=0.09 * level, gust=0.2, bright=800), 0); place(y, bird_chirps(dur, r, density=0.5) * 0.06 * level, 0)
    t = np.arange(n) / SR
    for _ in range(max(1, int(dur / 4))):
        t0 = r.uniform(0, dur); w = np.exp(-((t - t0) / 1.2) ** 2)
        eng = bp(np.sign(np.sin(phase(np.full(n, r.uniform(55, 80))))) + 0.3 * r.standard_normal(n), 80, 1500) * w * 0.08 * level
        p = r.uniform(-1, 1); place(y, pan(eng, p), 0)
    return y * bed(dur, 0.3)


def night_amb(dur, r):
    y = np.zeros((2, ns(dur))); place(y, crickets(dur, r) * 0.1, 0); place(y, breeze(dur, r, level=0.05, gust=0.1, bright=500), 0); return y * bed(dur, 0.5)


# ---------------- effects track ----------------
def sfx_track():
    r = rng(2026); out = np.zeros((2, ns(DUR) + SR))
    P = lambda x, t, p=0.0, g=1.0: place(out, pan(x * g, p), t)
    # S1 0-6: sachet wiggle, tear, powder, toss; kettle pour + steam; dash; chalk; blow; wink ting
    place(out, street_amb(13.5, r, 0.7), 0)
    P(crinkle(0.3, r, 60), 0.0, 0.1, 0.5); P(tear(r), 0.32, 0.1); P(pour_powder(0.55, r), 0.75, 0.1)
    P(whoosh(0.4, r, peak=0.12) , 1.4, 0.3, 0.3); P(clink(r, f0=2100, dur=0.3), 1.52, -0.1, 0.3)
    P(pour_water(0.5, r), 1.78, 0.0); P(steam(0.8, r, 0.8), 1.95, 0.0)
    P(whoosh(0.7, r, peak=0.25, f_lo=500, f_hi=2600), 2.55, -0.3, 0.5); P(pop(r, 700, 300), 3.35, -0.3, 0.3)
    P(chalk(1.35, r), 3.5, -0.2, 0.7); P(blow(r), 4.95, -0.2); P(ding(r, 2093, 0.9), 5.35, 0.0, 0.3)
    # S2 6-13.5: polishing squeaks, yawn, cat purr, fly; whip across the street; rival cafe: steam, milk, latte ding, shutter, selfie
    for k in range(6): P(squeak(r), 6.1 + k * 0.17, 0.2, 0.25)
    P(yawn(r, 150, 0.9), 7.1, 0.2, 0.8); P(purr(2.8, r), 6.0, -0.3, 0.6); P(fly(2.8, r), 6.0, 0.4, 0.5)
    P(whoosh(1.4, r, peak=0.7, f_lo=300, f_hi=2400, width=1.0), 8.6, 0.0, 0.9); P(whoosh(0.7, r, peak=0.3), 10.0, 0, 0.7)
    place(out, cafe_amb(3.6, r, 1.2), 9.9)
    P(steam(1.2, r, 1.0), 10.2, 0.4); P(pour_water(1.0, r) * 0.6, 10.85, -0.1); P(widen(shimmer(0.9, r, 20, 3000, 7000), r)[0] * 0.3, 11.5)
    P(shutter(r), 12.35, -0.2, 0.9); P(pop(r, 1600, 900) * 0.4, 12.36, -0.2); P(shutter(r), 12.95, 0.4, 0.7)
    # S3 13.5-18.5: belly laugh + bar slaps, choke, coughs, pats
    place(out, street_amb(5.0, r, 0.5), 13.5)
    P(laugh(3.0, r, 270, 5.2), 13.55, -0.1, 1.0)
    for k in range(7): P(add(thud(r, 0.5), clap(r) * 0.5), 13.5 + (0.25 + k) / 2.4, -0.1, 0.55)
    P(sting(r), 16.6, 0, 0.5)
    for k in range(4): P(cough(r), 16.65 + k / 3.2, -0.1, 0.8)
    for k in range(4): P(thud(r, 0.3), 17.32 + k / 3.0, 0.0, 0.5)
    # S4 18.5-26.5: calendar tear, fly + blow, page wipe, snore + plastic bag, footsteps, flash, HALU stamp, laughing faces
    place(out, street_amb(8.0, r, 0.6), 18.5)
    P(tear(r, 0.3), 19.15, 0.4, 0.8); P(whoosh(0.5, r, peak=0.2), 19.25, 0.3, 0.5)
    P(fly(2.3, r), 19.55, 0.2, 0.6); P(blow(r), 20.85, 0.0)
    P(whoosh(0.5, r, peak=0.2, f_lo=600, f_hi=3000), 21.5, 0, 0.6); P(paper_plak(r), 21.75, 0, 0.5)
    P(snore(1.7, r), 21.8, 0.1, 0.8); P(crinkle(1.7, r, 25), 21.8, -0.4, 0.5)
    for k in range(5): P(stroll_step(r), 23.5 + k * 0.2, 0.2, 0.35)
    P(shutter(r), 24.8, 0, 0.9); P(stamp(r), 25.35, 0, 0.9)
    for k in range(6): P(pop(r, 900 + 120 * k, 400), 25.5 + k * 0.1, (k % 3 - 1) * 0.4, 0.35)
    P(laugh(1.2, r, 420, 7.0, 1.4) * 0.6, 25.55, 0.3)
    # S5 26.5-33.5: queue + sigh, idea ting, crossing steps, hop, land; sip, glow shimmer, two-finger pop, owner's whoop
    place(out, cafe_amb(2.5, r, 0.6), 26.5); place(out, street_amb(4.5, r, 0.8), 28.6)
    P(blow(r, 0.7) * 0.7, 27.5, 0.0); P(ding(r, 1760, 0.8), 28.1, 0.0, 0.35)
    for k in range(7): P(stroll_step(r), 28.95 + k * 0.21, 0.0, 0.4)
    P(whoosh(0.4, r, peak=0.15, f_lo=800, f_hi=3000), 29.85, 0, 0.4); P(thud(r, 0.5), 30.25, 0, 0.5)
    P(clink(r, f0=2600, dur=0.3), 30.7, 0.2, 0.4); P(slurp(0.45, r), 31.05, 0.2)
    P(widen(shimmer(1.0, r, 22, 2500, 6500), r)[0] * 0.35, 31.9); P(pop(r, 1200, 500), 32.6, 0.2, 0.6); P(laugh(0.6, r, 160, 6, 1.0), 32.8, -0.3, 0.6)
    # S6 33.5-38: outside the rival: whispering, the fake-smile squeak, giggles
    place(out, street_amb(4.5, r, 0.7), 33.5); place(out, cafe_amb(4.5, r, 0.6) * 0.6, 33.5)
    P(shh(1.1, r) * 0.6, 33.7, -0.2); P(squeak(r) * 0.8, 35.2, 0.2); P(squeak(r) * 0.6, 35.35, 0.25)
    P(laugh(1.6, r, 300, 6.0) * 0.7, 36.1, -0.2); P(laugh(1.2, r, 240, 5.5) * 0.5, 36.6, 0.3)
    # S7 38-45: pages flurry, group arrives, page wipe, wobbling stack, catch, whip, cap pop
    place(out, street_amb(7.0, r, 0.7), 38.0)
    for k in range(3): P(whoosh(0.4, r, peak=0.15, f_lo=700, f_hi=3200), 38.05 + k * 0.22, (k - 1) * 0.4, 0.5)
    for k in range(10): P(stroll_step(r), 39.0 + k * 0.16, 0.4, 0.3)
    P(whoosh(0.5, r, peak=0.2), 41.05, 0, 0.5)
    for k in range(5): P(clink(r, f0=r.uniform(500, 900), dur=0.12) * 0.4, 41.9 + k * 0.09, -0.3)
    P(whoosh(0.5, r, peak=0.4, f_lo=300, f_hi=1500), 42.25, -0.1, 0.5); P(thud(r, 0.9), 42.75, 0, 0.8); P(laugh(0.4, r, 170, 6, 1.0) * 0.5, 42.9, 0)
    P(whoosh(0.35, r, peak=0.15, f_lo=500, f_hi=3500), 43.6, 0, 0.8); P(sting(r), 44.15, 0, 0.7)
    # S8 45-54.5: heavy stomps + rattling cups, sit, notebook slam, "two" pop; behind the bar: two tears, powder, shh, ting
    place(out, street_amb(9.5, r, 0.5), 45.0)
    for k in range(7):
        P(boot(r, 1.3), 45.0 + k * 0.4, 0.1, 0.9)
        for j in range(3): P(clink(r, f0=r.uniform(2200, 3800), dur=0.12) * 0.12, 45.03 + k * 0.4 + j * 0.03, -0.2)
    P(add(thud(r, 1.2), clap(r)), 48.4, 0.1, 0.9); P(pop(r, 1000, 500), 48.85, 0.1, 0.5)
    P(tear(r), 51.2, -0.2); P(tear(r), 51.3, 0.2); P(pour_powder(0.7, r), 52.2, 0.0); P(shh(0.6, r), 53.3, 0); P(ding(r, 2093, 0.9), 53.7, 0, 0.3)
    # S9 54.5-61.5: glass sip + spit-take; ceramic sip, glow riser + shimmer, frantic scribble, star pings
    place(out, street_amb(7.0, r, 0.4), 54.5)
    P(clink(r, f0=1900, dur=0.25), 54.8, 0.1, 0.4); P(slurp(0.5, r), 55.25, 0.1); P(spit(r), 55.92, 0.1); P(sting(r), 55.95, 0.1, 0.4)
    P(clink(r, f0=2600, dur=0.3), 57.8, 0.1, 0.4); P(slurp(0.6, r), 58.25, 0.1)
    P(riser(1.7, r), 58.8, 0, 0.6); P(widen(shimmer(2.0, r, 25, 2500, 7000), r)[0] * 0.4, 58.9)
    P(scribble(0.8, r), 60.6, 0.1)
    for k in range(5): P(ding(r, [1568, 1760, 1976, 2093, 2349][k], 0.5), 60.62 + k * 0.15, 0.1, 0.25)
    # S10 61.5-73.5: freeze (record scratch, near silence), slow-motion replays, whoosh into the light
    P(scratch(r), 61.5, 0, 0.9)
    P(widen(shimmer(4.0, r, 8, 2000, 5000), r)[0] * 0.25, 64.0); P(widen(shimmer(4.0, r, 10, 2000, 5000), r)[0] * 0.3, 68.8)
    P(riser(2.0, r), 71.4, 0, 0.6); P(whoosh(1.2, r, peak=0.9, f_lo=300, f_hi=4000, width=1.0, tail=0.4), 72.3, 0, 0.8)
    # S11 73.5-84.6: night crickets + bulb hum, sticker pop, sips, glow, sneaky looks, big gulp, head pop
    place(out, night_amb(11.1, r), 73.5); P(hum(11.0, r, 120) * bed(11.0, 1.0) * 0.06, 73.6)
    P(pop(r, 1300, 700), 77.6, 0.1, 0.6); P(slurp(0.4, r), 79.6, -0.1); P(slurp(0.4, r), 81.3, 0.1)
    P(widen(shimmer(1.2, r, 18, 2500, 6000), r)[0] * 0.3, 81.5)
    for k, tm in enumerate((82.5, 82.85, 83.2)): P(whoosh(0.2, r, peak=0.08, f_lo=900, f_hi=4000), tm, (-1) ** k * 0.5, 0.4)
    P(glug(0.5, r), 83.7, 0); P(pop(r, 800, 300), 84.25, 0, 0.8)
    return out[:, : ns(DUR)]


# ---------------- music: a cheeky cafe bossa that stops and turns with the story ----------------
BPM = 112; Q = 60 / BPM
DM = {"C": [60, 64, 67, 71], "Am": [57, 60, 64, 67], "Dm": [62, 65, 69, 72], "G7": [55, 59, 62, 65], "F": [53, 57, 60, 64], "E7": [52, 56, 59, 62], "A7": [57, 61, 64, 67]}
PROG = ["C", "Am", "Dm", "G7"]; SAD = ["Am", "Dm", "E7", "Am"]
MEL = [(0, 1, 76), (1, 0.5, 79), (1.5, 0.5, 77), (2, 1, 76), (3, 1, 72), (4, 1.5, 74), (5.5, 0.5, 72), (6, 2, 69),
       (8, 1, 74), (9, 0.5, 77), (9.5, 0.5, 76), (10, 1, 74), (11, 1, 71), (12, 1.5, 72), (13.5, 0.5, 74), (14, 2, 72)]


def music():
    r = rng(5150); out = np.zeros((2, ns(DUR) + SR))

    def groove(t0, t1, prog=PROG, vel=0.5, brush=True):
        k = 0
        while t0 + k * 4 * Q < t1 - 0.01:
            b0 = t0 + k * 4 * Q; ch = DM[prog[k % len(prog)]]
            for beat, m in ((0, ch[0] - 12), (2, ch[0] - 5)):  # upright-bass pluck on 1 and 3
                if b0 + beat * Q < t1: place(out, pan(I.pluck(I.m2f(m - 12), vel * 0.9, r, dur=Q * 1.6, bright=0.2), -0.1), b0 + beat * Q)
            for beat in (0, 1.5, 3):  # bossa guitar comp
                if b0 + beat * Q < t1:
                    for i, m in enumerate(ch): place(out, pan(I.pluck(I.m2f(m), vel * 0.35, r, dur=0.6, bright=0.45), 0.25), b0 + beat * Q + i * 0.008)
            if brush:
                for e in range(8):
                    if b0 + e * Q / 2 < t1: place(out, pan(I.brush(vel * (0.3 if e % 2 else 0.18), r, 0.2), 0.35), b0 + e * Q / 2)
            k += 1

    def melody(t0, vel=0.4, fn=I.vibes, tr=0, until=1e9):
        for b, L, m in MEL:
            if t0 + b * Q < until: place(out, pan(fn(I.m2f(m + tr), vel, r, dur=max(0.6, L * Q * 1.8)), -0.15), t0 + b * Q)

    def sneak(t0, t1, vel=0.45):  # tiptoe staccato plucks (sneaky) on a minor line
        line = [57, 60, 64, 63, 62, 60, 57, 56]; k = 0
        while t0 + k * Q / 2 < t1:
            if k % 2 == 0 or k % 8 == 5: place(out, pan(I.pluck(I.m2f(line[(k // 2) % 8] - 12), vel, r, dur=0.25, bright=0.6), -0.1), t0 + k * Q / 2)
            k += 1

    def pad(t0, dur, chord, vel=0.06): place(out, I.pad([I.m2f(m) for m in DM[chord]], dur, vel, r, att=0.8, rel=1.2) * 1.0, t0)

    # 0-13.5 hook + context: the bossa, melody on vibes; brighter at the rival (10-13.5) with glock on top
    groove(0.0, 13.5); melody(0.0 + 4 * Q, 0.35); melody(10.0, 0.25, I.glock, 12, until=13.5)
    # 13.5-16.6 the laugh: groove keeps going; hard stop on the choke
    groove(13.5, 16.6, vel=0.45)
    # 16.6-23.5 days with no buyers: slow sad plucks and a pad
    for k, ch in enumerate(SAD * 2):
        tm = 17.0 + k * 1.6
        if tm < 23.4: pad(tm, 1.6, ch, 0.05); place(out, pan(I.pluck(I.m2f(DM[ch][0] - 12), 0.4, r, dur=1.4, bright=0.2), 0), tm)
    # 23.5-26.5 the barista's mischief: sneaky line
    sneak(23.5, 26.4)
    # 26.5-45 the suit man, gossip, the slow rise: groove back, melody, a little busier in month 2
    groove(26.5, 45.0, vel=0.5); melody(28.6, 0.3); melody(36.0, 0.28, I.glock, 12); melody(41.0, 0.3)
    # 45-48.4 the critic stomps: tuba hits on every stomp; 48.4-54.5 tense sneaky line behind the bar
    for k in range(7): place(out, pan(I.brass(I.m2f(36 + (k % 2) * 7), 0.3, 0.7, r, "tuba"), 0), 45.0 + k * 0.4)
    sneak(48.6, 54.4, 0.4)
    # 54.5-58.8 the taste test: held tension; 58.8 the glow: big warm major chord + glock run
    pad(54.6, 4.0, "Am", 0.05)
    pad(58.8, 2.8, "C", 0.09)
    for k, m in enumerate([72, 76, 79, 84, 88]): place(out, pan(I.glock(I.m2f(m), 0.35, r, 1.6), 0.2), 58.85 + k * 0.12)
    # 61.5 freeze: silence 1 s, then a soft reflective music box theme over a pad
    for k, ch in enumerate(["F", "C", "Dm", "G7", "F", "C"]): pad(62.6 + k * 1.75, 1.75, ch, 0.05)
    melody(63.0, 0.3, I.musicbox, 0, until=72.5)
    # 73.5-84.6 night: sneaky tiptoe, then the final button chord on the head pop
    pad(73.8, 6.0, "Am", 0.035); sneak(76.0, 83.6, 0.38)
    for m in DM["C"]: place(out, pan(I.pluck(I.m2f(m), 0.5, r, dur=1.4), 0.1), 84.25)
    place(out, pan(I.glock(I.m2f(84), 0.4, r, 1.4), 0), 84.25)

    t = np.arange(out.shape[1]) / SR
    g = np.interp(t, [0, 0.2, 16.55, 16.65, 16.9, 61.45, 61.55, 62.5, 84.0, 85.0], [0, 1, 1, 0, 1, 1, 0, 1, 1, 0.6])
    out *= g
    out = out + convolve_st(out, make_ir(1.0, 7, hf=1.5)) * 0.16
    return out[:, : ns(DUR)]


def main(outdir):
    import os
    os.makedirs(outdir, exist_ok=True)
    sfx = sfx_track(); mus = music()
    sfx *= dbg(-20.0 - integrated(sfx)); mus *= dbg(-27.0 - integrated(mus))
    mix = limit(sfx + mus, 0.79)
    pk = np.abs(mix).max()
    if pk > 0.89: mix *= 0.89 / pk
    for name, x in (("sfx", sfx), ("music", mus), ("audio", mix)):
        write_wav(f"{outdir}/{name}.wav", x)
        print(f"{name}: {integrated(x):.1f} LUFS, max momentary {momentary_max(x):.1f}, true peak {true_peak(x):.1f} dBTP, {x.shape[1] / SR:.2f}s")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "out/kopi/v2audio")
