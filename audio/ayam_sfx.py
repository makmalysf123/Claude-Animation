# Sound effects for "Satu Ayam yang Sama" (src/videos/format/AyamStory.tsx), all synthesized (numpy + scipy):
# map bloops / shimmer / dive wind / cloud whoosh, village ambience (birds + breeze), hen clucks, chick peeps,
# frying sizzle, chewing crunches, egg plops + cracks, pops, timeline dings, hammering, stomps, footsteps, coin.
# Frame numbers below mirror the TSX timeline (30 fps). Usage: .tools/py/bin/python audio/ayam_sfx.py out/ayam/sfx.wav
import sys
import numpy as np
from dsp import SR, TAU, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, phase, modal, pan, place, widen, write_wav, norm_to, true_peak
from sfx_gen import whoosh, clink, bird_chirps, breeze, hammer_hit, stroll_step, push_thump

FPS = 30
DUR = 1800 / FPS
F = lambda f: f / FPS  # frame -> seconds


def cluck(r, n=None, big=False):
    """hen: 'bok bok bok' (short pitched bursts) and sometimes a long 'ba-gawk'"""
    n = n or r.integers(2, 5)
    out = np.zeros(ns(1.4))
    t0 = 0.0
    for k in range(n):
        long = big and k == n - 1
        L = 0.32 if long else r.uniform(0.06, 0.1)
        tl = tt(L)
        f0 = (r.uniform(700, 900) if not long else 1000) * (1 - 0.25 * tl / L) * (1 + (0.35 * np.sin(np.pi * tl / L) if long else 0))
        ph = phase(f0)
        src = sum(np.sin(h * ph) / h ** 0.9 for h in range(1, 9))
        src = bp(src + 0.3 * r.standard_normal(len(tl)), 600, 3200, 2)
        env = np.sin(np.pi * np.clip(tl / L, 0, 1)) ** (0.6 if long else 1.5)
        y = src * env / (np.std(src) + 1e-9)
        i = ns(t0); out[i:i + len(y)] += y[: len(out) - i]
        t0 += L + r.uniform(0.05, 0.12)
    return fades(out[: ns(t0 + 0.05)], 0.002, 0.02)


def peep(r):
    L = r.uniform(0.07, 0.12)
    tl = tt(L)
    f = r.uniform(3600, 4600) * (1 - 0.3 * tl / L) * (1 + 0.08 * np.sin(TAU * 30 * tl))
    return np.sin(phase(f)) * np.sin(np.pi * tl / L) ** 1.2


def sizzle(dur, r, level=1.0):
    n = ns(dur)
    y = hp(colored(n, r, 0.2), 2500, 2) * (0.6 + 0.4 * smooth_noise(n, r, 3.0))
    pops = np.zeros(n)
    for _ in range(int(dur * 40)):
        i = r.integers(0, n - 400)
        pops[i:i + 300] += r.standard_normal(300) * np.exp(-np.arange(300) / 40) * r.uniform(0.5, 2.0)
    y = y * 0.35 + hp(pops, 1800) * 0.5
    return widen(fades(y * level, 0.3, 0.4), r, 9, 0.8)


def crunch(r):
    L = r.uniform(0.07, 0.12)
    n = ns(L)
    y = bp(r.standard_normal(n), 900, 5000, 2) * (r.uniform(size=n) < 0.25) * np.exp(-np.arange(n) / ns(0.03))
    return y * 1.4


def pop(r, f0=900, f1=280):
    L = 0.09
    tl = tt(L)
    f = f0 * (f1 / f0) ** (tl / L)
    return np.sin(phase(f)) * np.exp(-tl / 0.035) + hp(r.standard_normal(len(tl)), 3000) * np.exp(-tl / 0.002) * 0.3


def plop(r):
    return pop(r, 520, 180) * 0.8


def egg_crack(r):
    y = np.zeros(ns(0.25))
    for k in range(r.integers(3, 6)):
        c = clink(r, f0=r.uniform(2500, 4500), dur=0.03, bright=0.5) * 0.6
        c += hp(r.standard_normal(len(c)), 2500) * np.exp(-np.arange(len(c)) / 60) * 0.8
        i = ns(k * r.uniform(0.02, 0.05)); y[i:i + len(c)] += c[: len(y) - i]
    return y


def ding(r, f0=1320, dur=1.4):
    modes = [(f0, 1.0, 0.6), (f0 * 2.01, 0.45, 0.35), (f0 * 3.0, 0.2, 0.2), (f0 * 4.2, 0.12, 0.1)]
    return modal(dur, modes, r) * 0.9


def coin(r):
    return ding(r, 2600, 0.6) * 0.6 + ding(r, 3480, 0.6) * 0.35


def riser(dur, r):
    t = tt(dur)
    f = 220 * 4 ** (t / dur)
    y = sum(np.sin(h * phase(f)) / h for h in (1, 2, 3)) * (t / dur) ** 1.5
    y += 0.3 * bp(r.standard_normal(len(t)), 1500, 6000) * (t / dur) ** 2
    return fades(y * 0.35, 0.05, 0.08)


def sad_trombone(r):
    out = []
    for f0, L in ((392, 0.28), (370, 0.28), (349, 0.28), (330, 0.8)):
        tl = tt(L)
        f = f0 * (1 + 0.012 * np.sin(TAU * 6 * tl)) * (1 - (0.06 * tl / L if L > 0.5 else 0))
        y = sum(np.sin(h * phase(f)) * (0.8 ** h) for h in range(1, 10))
        out.append(lp(y, 2200) * np.sin(np.pi * np.clip(tl / L, 0, 1)) ** 0.5)
    return np.concatenate(out) * 0.25


def sting(r):
    """comic surprise: quick rising 'whup' + bright pop"""
    L = 0.22
    tl = tt(L)
    f = 300 * 5 ** (tl / L)
    y = np.sin(phase(f)) * np.sin(np.pi * tl / L) ** 0.7
    return np.concatenate([y * 0.6, pop(r, 1500, 700) * 0.7])


def shimmer(dur, r, density=30, lo=2500, hi=7000):
    n = ns(dur)
    y = np.zeros(n)
    for _ in range(int(dur * density)):
        c = clink(r, f0=r.uniform(lo, hi), dur=0.15, bright=0.4)
        i = r.integers(0, max(1, n - len(c)))
        y[i:i + len(c)] += c * r.uniform(0.2, 0.6)
    return y * np.sin(np.pi * np.linspace(0, 1, n)) ** 0.5


def render(path):
    r = rng(7)
    out = np.zeros((2, ns(DUR) + SR))
    # ---------------- map (0-300)
    place(out, pan(whoosh(1.4, r, peak=0.5, f_lo=200, f_hi=900, tail=0.4) * 0.35, 0), F(2))
    for k, t in enumerate([0.45, 0.75, 1.05, 1.4, 1.8, 2.3, 2.8]):
        place(out, pan(plop(r) * 0.6, r.uniform(-0.5, 0.5)), t)
    place(out, pan(whoosh(0.9, r, peak=0.25, f_lo=600, f_hi=2500) * 0.3, 0), F(68))
    for a, b, lo in ((112, 150, 1800), (150, 192, 2600), (196, 226, 4200)):
        place(out, widen(shimmer(F(b - a) + 0.3, r, density=25 if lo < 4000 else 12, lo=lo, hi=lo * 2.2) * 0.5, r), F(a))
        place(out, pan(pop(r, 700, 350) * 0.5, 0), F(a))
    place(out, pan(ding(r, 1760, 1.6) * 0.45, 0.2), F(200))  # the rare green dots
    place(out, breeze(F(120), r, level=0.25, gust=0.6, bright=1400) * np.linspace(0, 1, ns(F(120))) ** 1.5, F(232))
    place(out, widen(whoosh(F(70) + 1.2, r, peak=F(60), f_lo=250, f_hi=1800, width=1.0, tail=0.6, air=0.3) * 0.9, r, 14, 0.9), F(240))
    place(out, widen(whoosh(1.6, r, peak=0.4, f_lo=300, f_hi=1500, tail=0.5) * 0.5, r), F(296))
    # ---------------- village ambience (300-1800)
    amb = breeze(DUR - F(300), r, level=0.12, gust=0.25, bright=800)
    amb += widen(bird_chirps(DUR - F(300), r, density=0.6) * 0.1, r)
    amb *= np.clip(np.linspace(0, (DUR - F(300)) / 1.5, amb.shape[1]), 0, 1)
    place(out, amb, F(300))
    # handout: chicken lands next to each villager
    for i, f in enumerate([405, 428, 451]):
        place(out, pan(pop(r) * 0.7, (i - 1) * 0.4), F(f))
        place(out, pan(cluck(r, 3) * 0.35, (i - 1) * 0.4), F(f + 4))
    for f in (490, 520, 548):
        place(out, pan(cluck(r) * 0.22, r.uniform(-0.6, 0.6)), F(f))
    # Budi frying + eating
    place(out, sizzle(F(90), r, 0.8), F(570))
    place(out, sizzle(F(120), r, 0.35), F(660))
    for f in range(660, 745):
        if f % 50 < 30 and f % 8 == 0:
            place(out, pan(crunch(r) * 0.6, 0), F(f))
    place(out, pan(sad_trombone(r), 0), F(748))
    # Sari: eggs drop into the basket day by day
    prev = 0
    for f in range(780, 960):
        day = int(np.floor(1 + 29 * np.clip((f - 800) / 130, 0, 1)))
        n = min(14, int(day / 2.1))
        if n > prev:
            place(out, pan(plop(r) * 0.55, -0.1), F(f))
        prev = n
    for f in (790, 840, 905, 940):
        place(out, pan(cluck(r) * 0.25, 0.3), F(f))
    # Joko: hatching
    place(out, pan(cluck(r, 4, big=True) * 0.3, 0.3), F(965))
    for i in range(5):
        place(out, pan(egg_crack(r) * 0.6, 0.2), F(1012 + i * 9))
        place(out, pan(peep(r) * 0.25, 0.2 + r.uniform(-0.2, 0.2)), F(1016 + i * 9))
    for f in range(1060, 1200, 7):
        place(out, pan(peep(r) * 0.12, r.uniform(-0.6, 0.6)), F(f) + r.uniform(0, 0.1))
    # growth graph with the reaction
    place(out, widen(riser(F(96), r), r), F(1092))
    place(out, pan(sting(r) * 0.7, -0.2), F(1100))
    place(out, pan(sting(r) * 0.6, -0.4), F(1112))
    # timeline: dings per stage, hammering as coops appear, a growing flock
    for i, f in enumerate([1204, 1280, 1360]):
        place(out, pan(ding(r, [1320, 1480, 1760][i]) * 0.5, 0), F(f))
    for f in [1204, 1284, 1290, 1364, 1369, 1374, 1379]:
        place(out, pan(hammer_hit(r, 0.8) * 0.35, r.uniform(-0.3, 0.5)), F(f))
        place(out, pan(pop(r, 600, 250) * 0.4, 0.2), F(f + 3))
    for f in range(1200, 1800, 5):
        dens = 0.15 if f < 1280 else 0.35 if f < 1360 else 0.6
        if r.uniform() < dens:
            place(out, pan((cluck(r) if r.uniform() < 0.8 else peep(r)) * 0.1 * (0.6 if f > 1440 else 1), r.uniform(-0.8, 0.8)), F(f))
    # protest
    for f in (1472, 1486, 1500, 1520):
        place(out, pan(push_thump(r) * 1.6, -0.1), F(f))
    for f in range(1470, 1600, 16):
        place(out, pan(whoosh(0.25, r, peak=0.08, f_lo=800, f_hi=2500, tail=0.08) * 0.35, -0.1), F(f))
    # Budi carries the eggs, Joko pays him
    for f in range(1626, 1684, 9):
        place(out, pan(stroll_step(r) * 0.4, 0.2), F(f))
    place(out, pan(coin(r), -0.1), F(1694))
    place(out, widen(whoosh(0.8, r, peak=0.2, f_lo=500, f_hi=2200) * 0.35, r), F(1708))
    for i, f in enumerate((1726, 1734, 1742)):
        place(out, pan(pop(r, 800 + i * 200, 400) * 0.5, (i - 1) * 0.5), F(f))
    place(out, pan(ding(r, 1046, 2.0) * 0.45, 0), F(1760))
    out = out[:, : ns(DUR)]
    out = norm_to(out, -22.0, mode="integrated")
    tp = true_peak(out)
    if tp > -1.5:
        out *= 10 ** ((-1.5 - tp) / 20)
    write_wav(path, out)
    print("wrote", path, "true peak", round(true_peak(out), 2))


if __name__ == "__main__":
    render(sys.argv[1] if len(sys.argv) > 1 else "out/ayam/sfx.wav")
