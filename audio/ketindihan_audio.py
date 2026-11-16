# Sound for "Satu Malam Ketindihan" (src/videos/ketindihan2/Film.tsx, 88.5 s): sound effects + music only.
# No voice, no subtitles (the user adds narration and subtitles). Every cue time below is a global second taken from
# the scene timings in Film.tsx (scene start + the local time the picture uses), so effects land on their frame.
# Music sits ~10 dB under where the narration will go.
# Usage: .tools/py/bin/python audio/ketindihan_audio.py out/film   -> sfx.wav, music.wav, audio.wav (the mix)
import sys
import numpy as np
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, phase, modal, pan, place, widen,
                 write_wav, integrated, true_peak, momentary_max, make_ir, convolve_st, dbg)
from sfx_gen import whoosh, clink, crickets, breeze, bird_chirps, creak, push_thump, vox, vowel_track, _track
from ayam_sfx import pop, crunch, ding, sting
import instruments as I

DUR = 88.5
FPS = 30


def bed(dur, fade=0.4):
    n = ns(dur); e = np.ones(n); a = min(n // 2, ns(fade)); e[:a] = np.linspace(0, 1, a); e[-a:] = np.linspace(1, 0, a); return e


# ------------------------------------------------------------------ new effects
def motor(dur, r):
    """small electric crane motor / servo whir"""
    n = ns(dur); t = np.arange(n) / SR
    f = 180 + 60 * np.sin(np.pi * t / dur)
    y = 0.6 * np.sign(np.sin(phase(f))) * 0.3 + bp(colored(n, r, 0.3), 600, 3000) * 0.4
    return lp(y, 2500) * bed(dur, 0.08)


def tick(r, tock=False):
    f0 = 2600 if not tock else 2100
    y = modal(0.06, [(f0, 1.0, 0.012), (f0 * 1.7, 0.5, 0.008), (f0 * 0.45, 0.4, 0.02)], r)
    return y + hp(r.standard_normal(len(y)), 3000) * np.exp(-np.arange(len(y)) / 40) * 0.4


def eye_click(r):
    y = pop(r, 2400, 1400) * 0.5
    return y + hp(r.standard_normal(len(y)), 3000) * np.exp(-np.arange(len(y)) / 30) * 0.3


def heartbeat(r):
    """lub-dub: two low thumps"""
    def thump(f, L, a):
        tl = tt(L); return np.sin(phase(f * (1 - 0.35 * tl / L))) * np.exp(-tl / (L / 4)) * (1 - np.exp(-tl / 0.004)) * a
    y = np.zeros(ns(0.45)); a = thump(62, 0.16, 1.0); b = thump(55, 0.18, 0.75)
    y[: len(a)] += a; i = ns(0.17); y[i:i + len(b)] += b
    return lp(y, 180)


def wuff(r):
    """blanket shuffle: soft low noise puff"""
    n = ns(0.45); t = np.arange(n) / SR
    return lp(colored(n, r, -0.5), 900) * np.sin(np.pi * t / 0.45) ** 1.5 * 0.8


def drone(dur, r, f=55, swell=True):
    n = ns(dur); t = np.arange(n) / SR
    y = sum(np.sin(phase(f * k * (1 + 0.003 * np.sin(TAU * 0.13 * k * t)))) / k for k in (1, 2, 3, 5))
    y += 0.4 * lp(colored(n, r, -1.0), 300)
    return y * (np.clip(t / dur, 0, 1) ** 1.5 if swell else 1)


def stinger(r, high=True, dur=1.4):
    """horror sting: dissonant cluster stab with a fast decay (high) or a low falling groan"""
    t = tt(dur)
    if high:
        y = sum(np.sin(phase(f * (1 + 0.004 * np.sin(TAU * 7 * t)))) for f in (1244, 1318, 1864, 2489)) * np.exp(-t / 0.35)
        y += 0.5 * hp(r.standard_normal(len(t)), 4000) * np.exp(-t / 0.05)
        return y * 0.25
    f = 110 * 0.5 ** (t / dur)
    return sum(np.sin(k * phase(f)) / k for k in (1, 2, 3)) * np.exp(-t / (dur / 2.5)) * 0.5


def rooster(r):
    """'ku-ku-ru-yuuk': four pitched formant syllables, last one long, far away"""
    out = np.zeros(ns(1.6)); tm = 0.0
    for L, p0, p1 in ((0.12, 1.0, 1.15), (0.12, 1.1, 1.2), (0.14, 1.2, 1.4), (0.75, 1.45, 1.1)):
        n = ns(L); t = np.arange(n) / SR
        f0 = 560 * _track(n, [(0, p0), (L * 0.3, p1), (L, p1 * 0.92)], t)
        y = vox(f0, vowel_track(n, [(0, "u"), (L, "a" if L > 0.5 else "U")]), np.sin(np.pi * t / L) ** 0.6, r, 1.6, tilt=0.9, breath=0.25)
        i = ns(tm); out[i:i + n] += y[: len(out) - i]; tm += L + 0.03
    return bp(out, 500, 4500) * 0.5


def key_tap(r):
    return bp(r.standard_normal(ns(0.03)), 1500, 6000) * np.exp(-tt(0.03) / 0.004) * 0.6 + pop(r, 1800, 1200)[: ns(0.03)] * 0.2


def clack(r):
    """big lever: metal clack + low body"""
    y = clink(r, f0=900, dur=0.25, bright=0.8)
    return y + push_thump(r)[: len(y)] * 0.9


def lock_rattle(dur, r):
    y = np.zeros(ns(dur))
    for k in range(int(dur * 22)):
        c = clink(r, f0=r.uniform(1800, 3200), dur=0.05, bright=0.6) * r.uniform(0.3, 0.7)
        i = ns(k / 22 + r.uniform(0, 0.01)); y[i:i + len(c)] += c[: len(y) - i]
    return y


def dung(r):
    """comic low 'dung' stab (timpani-ish)"""
    t = tt(0.8); f = 98 * (1 + 0.15 * np.exp(-t / 0.02))
    return (np.sin(phase(f)) + 0.4 * np.sin(phase(f * 1.5)) + 0.2 * np.sin(phase(f * 2.0))) * np.exp(-t / 0.22) * 0.9


def yawn(r, base=190, dur=0.9):
    n = ns(dur); t = np.arange(n) / SR
    f0 = base * _track(n, [(0, 1.0), (dur * 0.3, 1.35), (dur, 0.75)], t)
    amp = np.clip(t / 0.08, 0, 1) * np.clip((dur - t) / 0.25, 0, 1)
    return vox(f0, vowel_track(n, [(0, "a"), (dur * 0.6, "A"), (dur, "o")]), amp, r, 1.0, tilt=1.3, breath=0.5) * 0.4


def snip(r):
    y = clink(r, f0=3400, dur=0.12, bright=1.0) * 0.8
    return y + hp(r.standard_normal(len(y)), 2500) * np.exp(-np.arange(len(y)) / 120) * 0.7


def paper_plak(r):
    n = ns(0.12); return bp(r.standard_normal(n), 400, 5000) * np.exp(-np.arange(n) / ns(0.012)) * 1.1


def clap(r):
    n = ns(0.1); return bp(r.standard_normal(n), 700, 4000) * np.exp(-np.arange(n) / ns(0.01)) * 1.2


def hum(dur, r, f=120):
    n = ns(dur); t = np.arange(n) / SR
    return (np.sin(TAU * f * t) + 0.5 * np.sin(TAU * 2 * f * t) + 0.25 * np.sin(TAU * 3 * f * t)) * 0.3


def thud(r, big=1.0):
    t = tt(0.35); y = np.sin(phase(80 * (1 - 0.4 * t / 0.35))) * np.exp(-t / 0.07) * big
    return y + bp(r.standard_normal(len(t)), 300, 3000) * np.exp(-t / 0.03) * 0.6


def squeak(r):
    L = r.uniform(0.07, 0.12); t = tt(L)
    f = r.uniform(3200, 4200) * (1 + 0.25 * np.sin(np.pi * t / L))
    return np.sin(phase(f)) * np.sin(np.pi * t / L) ** 1.2 * 0.5


def gated_buzz(dur, r, on_fn):
    n = ns(dur); t = np.arange(n) / SR
    g = lp(on_fn(t).astype(float), 400, 1)
    b = np.sign(np.sin(TAU * 100 * t)) * 0.15 + np.sin(TAU * 200 * t) * 0.2
    return bp(b, 150, 3000) * g * 0.8 + hp(r.standard_normal(n), 3000) * np.clip(np.abs(np.gradient(g)) * SR * 0.0005, 0, 0.6)


def crackle(dur, r):
    y = np.zeros(ns(dur))
    for _ in range(int(dur * 25)):
        k = r.integers(40, 300); i = r.integers(0, len(y) - k)
        y[i:i + k] += hp(r.standard_normal(k), 2000) * np.exp(-np.arange(k) / (k / 5)) * r.uniform(0.2, 1.0)
    return y


def baby_cry(dur, r):
    """'waaa... waaa': high voice phrases, rising then falling, sobbing gasps between"""
    n = ns(dur); y = np.zeros(n); tm = 0.0
    while tm < dur - 0.3:
        L = r.uniform(0.9, 1.4); m = ns(L); t = np.arange(m) / SR
        f0 = r.uniform(420, 500) * _track(m, [(0, 0.85), (0.12, 1.12), (L * 0.6, 1.05), (L, 0.8)], t) * (1 + 0.02 * np.sin(TAU * 9 * t))
        amp = np.clip(t / 0.05, 0, 1) * np.clip((L - t) / 0.15, 0, 1)
        v = vox(f0, vowel_track(m, [(0, "ae"), (0.1, "a"), (L, "A")]), amp, r, 1.55, tilt=0.95, breath=0.3, fmax=7000)
        i = ns(tm); m3 = min(m, n - i); y[i:i + m3] += v[:m3]; tm += L
        for g in range(r.integers(1, 3)):  # little gasps
            gl = 0.08; gm = ns(gl); gv = bp(r.standard_normal(gm), 1200, 5000) * np.sin(np.pi * np.arange(gm) / gm) * 0.35
            i = ns(tm)
            if i < n: m2 = min(gm, n - i); y[i:i + m2] += gv[:m2]
            tm += gl + 0.05
        tm += r.uniform(0.05, 0.2)
    return y * 0.5


def brak(r):
    """door kicked open: wood crack + boom + rattle"""
    t = tt(0.9)
    y = np.sin(phase(70 * (1 - 0.3 * t / 0.9))) * np.exp(-t / 0.12) * 1.2
    y += bp(r.standard_normal(len(t)), 200, 5000) * np.exp(-t / 0.04) * 1.0
    c = creak(0.6, r, rate0=160, rate1=90) * 0.35; i = ns(0.05); m = min(len(c), len(y) - i); y[i:i + m] += c[:m]
    return y


def hm(r):
    """kunti puzzled 'hm?' rising, mouth closed"""
    d = 0.45; n = ns(d); t = np.arange(n) / SR
    f0 = 260 * _track(n, [(0, 1.0), (d * 0.5, 1.0), (d, 1.45)], t)
    amp = np.clip(t / 0.04, 0, 1) * np.clip((d - t) / 0.08, 0, 1)
    return lp(vox(f0, vowel_track(n, [(0, "u"), (d, "u")]), amp, r, 1.25, tilt=1.6, breath=0.05), 1400) * 0.7


def drip(r):
    t = tt(0.08); return np.sin(phase(900 * (1 + 1.2 * t / 0.08))) * np.exp(-t / 0.02) * 0.4


def marker(dur, r):
    """felt-tip squeak drawn in a loop: band noise with a stroke rhythm"""
    n = ns(dur); t = np.arange(n) / SR
    g = (0.55 + 0.45 * np.sin(TAU * 3.2 * t)) * bed(dur, 0.06)
    y = bp(colored(n, r, 0.3), 1800, 5000) * g * 0.35 + np.sin(phase(1400 + 300 * np.sin(TAU * 3.2 * t))) * g * 0.06
    return y


# ------------------------------------------------------------------ the effect track
def sfx_track():
    r = rng(707); out = np.zeros((2, ns(DUR)))
    P = lambda x, t, g=1.0, p=0.0: place(out, pan(x * g, p), t)
    S = lambda x, t, g=1.0: place(out, x * g, t)

    # S1 hook (0-7): night ambience, a pop for each ghost, whoosh through the window
    S(breeze(7.3, r, level=0.07, gust=0.15, bright=600) * bed(7.3), 0.0)
    S(widen(crickets(7.3, r) * 0.1 * bed(7.3), r), 0.0)
    for i in range(12):
        P(pop(r, 1100 + 60 * i, 500), 1.3 + i * 0.13, 0.22, r.uniform(-0.6, 0.6))
    S(widen(whoosh(1.5, r, peak=0.9, f_lo=250, f_hi=2400, width=1.0, tail=0.35, air=0.25) * 0.3, r), 5.3)

    # S2 bedroom 3 a.m. (7-16.4)
    S(widen(crickets(9.4, r) * 0.05 * bed(9.4, 0.6), r), 7.0)
    for k in range(9):
        P(tick(r, k % 2 == 1), 7.0 + k, 0.35 if k < 3 else 0.18)
    P(eye_click(r), 8.0, 0.2)
    beats, tb = [], 9.0
    while tb < 15.8:
        beats.append(tb); bpm = 70 + 60 * (tb - 9.0) / 6.8; tb += 60 / bpm
    for i, b in enumerate(beats):
        P(heartbeat(r), b, 0.55 + 0.45 * i / len(beats))
    P(wuff(r), 12.0, 0.5, -0.2)
    S(drone(2.2, r, 49) * 0.12 * bed(2.2, 0.2), 13.7)
    P(stinger(r, True), 15.2, 0.6)
    P(stinger(r, False, 1.2), 15.6, 0.45)

    # S3a morning phone (16.4-20)
    S(widen(bird_chirps(4.6, r, 0.9) * 0.14, r), 16.4)
    S(breeze(4.6, r, level=0.05) * bed(4.6), 16.4)
    P(rooster(r), 16.5, 0.35, 0.5)
    for k in range(18):
        P(key_tap(r), 16.4 + 0.25 + (k + 1) / 9, 0.35, 0.05)
    P(ding(r, 1760, 0.9), 18.9, 0.18)

    # S3b inside the head (21-27): ALARM (two-tone siren), frantic button clicks, OTOT yanked against the lock, tings
    S(widen(whoosh(1.0, r, peak=0.4, f_lo=300, f_hi=2600) * 0.35, r), 20.65)
    S(widen(hum(6.0, r, 60) * 0.06 * bed(6.0), r), 21.0)
    n = ns(3.4); tt_ = np.arange(n) / SR; siren = np.sin(TAU * np.cumsum(np.where((tt_ * 2.4) % 1 < 0.5, 880, 660)) / SR) * (0.6 + 0.4 * (np.sin(TAU * 9 * tt_) > 0)); P(lp(siren, 3000) * bed(3.4, 0.1), 21.0, 0.09, 0.0)
    for k in range(18):
        P(clink(r, f0=r.uniform(1200, 2400), dur=0.04) * 0.6, 21.0 + k * 0.085 + r.uniform(0, 0.02), 0.5, r.uniform(-0.4, 0.4))
    for tm in (22.9, 23.4, 23.9):
        P(clack(r) * 0.5, tm, 0.6, 0.25)
    P(lock_rattle(1.4, r), 22.9, 0.45, 0.25)
    for i, tm in enumerate((24.8, 25.4, 26.0)):
        P(ding(r, [1568, 1760, 2093][i], 0.8), tm, 0.22, -0.4)

    # S4 the terrace talk (27-38)
    S(widen(bird_chirps(11.0, r, 0.9) * 0.16, r), 27.0)
    S(breeze(11.0, r, level=0.09) * bed(11.0), 27.0)
    P(dung(r), 30.75, 0.55)
    P(yawn(r, 140, 0.75), 34.6, 0.22, -0.2)
    P(ding(r, 1320, 1.2), 36.7, 0.2)

    # S5 + S6 the lazy brain (38-67)
    S(widen(whoosh(1.0, r, peak=0.4, f_lo=300, f_hi=2600) * 0.35, r), 37.65)
    S(widen(hum(29.0, r, 60) * 0.12 * bed(29.0), r), 38.0)
    P(yawn(r, 200, 1.0), 38.3, 0.22)
    S(widen(motor(2.0, r) * 0.22, r), 41.4)
    S(widen(motor(1.6, r) * 0.2, r), 45.4)
    S(widen(motor(0.5, r) * 0.22, r), 48.4)
    P(snip(r), 44.0, 0.3, -0.3)
    for i in range(4):
        P(paper_plak(r), 45.4 + i + 0.22, 0.5, 0.3)
    S(creak(1.6, r, rate0=200, rate1=320) * 0.18, 49.0)
    for k in range(10):
        P(clink(r, f0=r.uniform(2500, 3500), dur=0.05), 49.0 + k * 0.16, 0.12, 0.3)
    S(widen(whoosh(0.8, r, peak=0.25, f_lo=600, f_hi=3000) * 0.4, r), 50.6)
    P(clink(r, f0=2200, dur=0.3), 51.55, 0.4, 0.4)
    P(clap(r), 52.4, 0.6); P(clap(r), 52.55, 0.5)
    S(widen(hum(5.6, r, 180) * 0.1 * bed(5.6, 0.3), r), 52.4)
    for k in range(14):
        P(np.sin(TAU * 880 * tt(0.05)) * np.exp(-tt(0.05) / 0.02), 52.4 + k * 0.4, 0.06)
    P(sting(r), 58.6, 0.3)
    P(stinger(r, False, 0.8) * 0.4, 62.8)
    for tm in (63.0, 64.2, 65.4):
        S(widen(whoosh(0.5, r, peak=0.3, f_lo=500, f_hi=2000) * 0.25, r), tm)
        P(thud(r), tm + 0.45, 0.6, -0.3); P(lock_rattle(0.25, r) * 0.6, tm + 0.47, 1.0, -0.3)

    # S7a kitchen (67-71.8): rattling pot, rat squeaks, kerupuk crunch
    S(widen(whoosh(0.9, r, peak=0.35) * 0.5, r), 66.75)
    S(widen(crickets(4.8, r) * 0.05 * bed(4.8), r), 67.0)
    for k in range(int(2.2 * 12)):
        P(clink(r, f0=r.uniform(1400, 2200), dur=0.08), 67.0 + k / 12 + r.uniform(0, 0.02), 0.18, 0.15)
    P(clink(r, f0=1800, dur=0.04) * 0.5, 69.45, 1.0, 0.2)
    P(squeak(r), 69.4, 0.6, 0.1); P(squeak(r), 69.55, 0.5, 0.1); P(squeak(r), 70.9, 0.55, 0.1)
    for k in range(int(2.3 * 4)):
        P(crunch(r), 69.35 + k / 4, 0.35, 0.05)

    # S7b living room (71.8-75): lamp buzzing exactly with the flicker; sparks at the socket
    on = lambda t: np.sin(t * 31) * np.sin(t * 7.3) > -0.2
    S(widen(gated_buzz(3.2, r, on) * 0.25, r), 71.8)
    P(crackle(0.9, r), 74.1, 0.3, 0.3)
    S(widen(whoosh(0.45, r, peak=0.2, f_lo=300, f_hi=1800, tail=0.12, air=0.3) * 0.55, r), 72.72)
    S(widen(crickets(3.2, r) * 0.04 * bed(3.2), r), 71.8)

    # S7c baby room + the kunti (75-83.2)
    cry = baby_cry(8.2, r); g = np.interp(np.arange(len(cry)) / SR + 75.0, [75, 76.35, 76.45, 78.55, 78.65, 80.35, 80.45, 81.55, 81.65, 83.2], [0.75, 0.75, 0.45, 0.45, 0.2, 0.2, 0.8, 0.8, 0.4, 0.35])
    P(cry * g * bed(8.2, 0.1), 75.0, 0.4, -0.1)
    S(widen(crickets(8.2, r) * 0.07 * bed(8.2), r), 75.0)
    P(brak(r), 76.75, 0.45, 0.3)
    S(widen(whoosh(0.35, r, peak=0.12, f_lo=800, f_hi=3500, tail=0.1) * 0.35, r), 76.95)
    for k in range(3):
        S(widen(whoosh(0.18, r, peak=0.08, f_lo=900, f_hi=2600, tail=0.06) * 0.12, r), 77.3 + k * 0.37)
    P(hm(r), 78.95, 0.22, 0.0)
    P(hm(r), 79.75, 0.15, 0.0)
    S(widen(whoosh(0.5, r, peak=0.25, f_lo=400, f_hi=2600, tail=0.15) * 0.45, r), 80.2)
    for k in range(4):
        P(drip(r), 80.55 + k * 0.28, 0.6, -0.1)
    P(clink(r, f0=900, dur=0.08) * 0.6, 81.65, 1.0, 0.3)
    P(sting(r) * 0.6, 82.35, 0.25, 0.3)

    # S8b the calendar (83.2-88.5): slow clock, the marker circle
    S(widen(crickets(5.3, r) * 0.05 * bed(5.3), r), 83.2)
    for k in range(4):
        P(tick(r, k % 2 == 1), 83.4 + k, 0.2, 0.15)
    S(widen(crickets(1.8, r) * 0.08 * bed(1.8), r), 86.7)
    P(marker(1.8, r), 84.25, 0.55, 0.15)
    P(hm(r), 87.3, 0.2, 0.2)
    P(sting(r) * 0.6, 87.75, 0.25, 0.2)
    return out


# ------------------------------------------------------------------ music: original "curious night" theme, D minor
BPM = 96; Q = 60 / BPM
DM = {"Dm": [50, 53, 57], "Gm": [55, 58, 62], "A7": [52, 55, 57, 61], "Bb": [53, 58, 62], "C": [52, 55, 60], "F": [53, 57, 60]}
PROG = ["Dm", "Dm", "Gm", "A7", "Dm", "Bb", "Gm", "A7"]
MEL = [(0, 1, 74), (1, .5, 77), (1.5, .5, 76), (2, 1, 74), (3, 1, 69),  # bar 1-2 (beats, len, midi)
       (4, 1.5, 70), (5.5, .5, 69), (6, 1, 67), (7, 1, 69),
       (8, 1, 74), (9, .5, 77), (9.5, .5, 79), (10, 1, 81), (11, 1, 77),
       (12, 1, 76), (13, .5, 74), (13.5, .5, 73), (14, 2, 74)]


def music():
    r = rng(3131); out = np.zeros((2, ns(DUR)))
    bar = lambda t0, b: t0 + b * 4 * Q

    def pizz_bass(t0, t1, vel=0.45):  # sneaky staccato tuba: root - fifth, on beats
        k = 0
        while t0 + k * Q < t1:
            b = int(k // 4) % len(PROG); ch = DM[PROG[b]]; m = ch[0] - 12 if k % 2 == 0 else ch[0] - 5
            place(out, pan(I.brass(I.m2f(m), Q * 0.35, vel, r, "tuba", rel=0.05), -0.15), t0 + k * Q); k += 1

    def box_melody(t0, vel=0.35, transpose=0, fn=I.musicbox):
        for b, L, m in MEL:
            place(out, pan(fn(I.m2f(m + transpose), vel, r, dur=max(1.0, L * Q * 2)), 0.2), t0 + b * Q)

    def pad(t0, t1, vel=0.08):
        k = 0
        while t0 + k * 4 * Q < t1:
            ch = DM[PROG[k % len(PROG)]]
            for m in ch:
                place(out, pan(I.vibes(I.m2f(m + 12), vel, r, dur=4 * Q, trem_depth=0.35), r.uniform(-0.4, 0.4)), t0 + k * 4 * Q)
            k += 1

    def ticktock(t0, t1, vel=0.12):  # woodblock on 2 and 4
        k = 1
        while t0 + k * Q < t1:
            place(out, pan(tick(r, k % 4 == 3) * vel, 0.3), t0 + k * Q); k += 2

    # 0-7 hook: music box theme over a soft pad
    pad(0.2, 7.0, 0.06); box_melody(0.6, 0.3)
    # 7-16.4 bedroom: no tune, a low drone that grows (the heartbeat carries it)
    place(out, widen(drone(8.6, r, 36.7, swell=True) * 0.07 * bed(8.6, 0.8), r), 7.2)
    # 16.4-27 morning + the brain: bouncy sneaky groove
    pizz_bass(16.4, 27.0, 0.4); pad(16.4, 27.0, 0.05); ticktock(16.4, 27.0)
    box_melody(20.0, 0.25, 0, I.glock)
    # 27-38 terrace talk: lighter groove, stop for "Dan dia pun... percaya." (36.2), little button
    pizz_bass(27.0, 36.0, 0.35); ticktock(27.0, 36.0, 0.1); pad(27.0, 36.0, 0.04)
    place(out, pan(I.glock(I.m2f(81), 0.25, r, 1.6), 0), 36.7); place(out, pan(I.glock(I.m2f(86), 0.2, r, 1.6), 0), 36.95)
    # 38-58 brain + scissors: groove, melody once, dips at 53.8-58 (handled by the gain curve)
    pizz_bass(38.0, 67.0, 0.4); ticktock(38.0, 67.0); pad(38.0, 67.0, 0.045)
    box_melody(38.0 + 8 * Q, 0.22, 0, I.glock); box_melody(58.6, 0.22, 0, I.glock)
    # 67-83.2 vignettes: same groove, music box on top
    pizz_bass(67.0, 83.0, 0.38); ticktock(67.0, 83.0, 0.1); box_melody(67.0 + 4 * Q, 0.2)
    pad(75.0, 83.0, 0.04)
    # 83.2-88.5 the question: music box alone, ends on the tonic, out by 88.5
    for b, L, m in MEL[:10]:
        place(out, pan(I.musicbox(I.m2f(m), 0.28, r, dur=1.4), 0.1), 83.4 + b * Q * 1.15)
    place(out, pan(I.musicbox(I.m2f(62), 0.3, r, dur=2.0), 0), 83.4 + 12 * Q * 1.15)

    # overall shape: quiet under the hook narration, gone in the bedroom stinger, dip at 53.8-58, fade out
    t = np.arange(out.shape[1]) / SR
    g = np.interp(t, [0, 0.3, 6.6, 7.2, 15.0, 16.4, 16.8, 36.0, 36.3, 37.8, 38.2, 53.6, 54.4, 57.8, 58.4, 86.8, 88.4],
                  [0, 1, 1, 0.8, 0.8, 0.0, 1, 1, 0.6, 0.6, 1, 1, 0.45, 0.45, 1, 1, 0])
    out *= g
    ir = make_ir(1.1, 9, hf=1.6)
    return out + convolve_st(out, ir) * 0.18


def limit(x, ceil=0.79, look=0.004, rel=0.08):
    """peak limiter: gain follows the loudest sample within a short look-ahead window, recovers slowly"""
    from scipy.ndimage import maximum_filter1d
    a = np.abs(x).max(0); k = ns(look)
    pk = maximum_filter1d(a, 2 * k + 1)
    g = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    from scipy.signal import lfilter
    c = np.exp(-1 / (rel * SR)); gs = g.copy()
    for i in range(1, len(gs)):  # instant attack, slow release
        gs[i] = min(g[i], c * gs[i - 1] + (1 - c) * g[i])
    return x * gs


def main(outdir):
    sfx = sfx_track(); mus = music()
    # levels: narration is expected around -16 LUFS; music ~10 dB under -> about -27 LUFS; effects around -20 LUFS
    sfx *= dbg(-20.0 - integrated(sfx)); mus *= dbg(-27.0 - integrated(mus))
    mix = limit(sfx + mus, 0.79)
    peak = np.abs(mix).max()
    if peak > 0.89:
        mix *= 0.89 / peak
    for name, x in (("sfx", sfx), ("music", mus), ("audio", mix)):
        write_wav(f"{outdir}/{name}.wav", x)
        print(f"{name}: {integrated(x):.1f} LUFS, max momentary {momentary_max(x):.1f}, true peak {true_peak(x):.1f} dBTP, {x.shape[1] / SR:.2f}s")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "out/film")
