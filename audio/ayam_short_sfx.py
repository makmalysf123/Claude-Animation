# Sound effects for the full short "Satu Ayam yang Sama" (src/videos/ayam/AyamShort.tsx, 2400 f / 80 s).
# Cue times are the same word times the picture uses (scratch voice voice/ayam/words.json); re-time with the final voice.
# Usage: .tools/py/bin/python audio/ayam_short_sfx.py out/ayamshort/sfx.wav
import sys
import numpy as np
from dsp import SR, ns, rng, lp, hp, bp, colored, pan, place, widen, write_wav, norm_to, true_peak
from sfx_gen import whoosh, bird_chirps, breeze, crickets, hammer_hit, stroll_step, push_thump, applause, hurrah
from ayam_sfx import cluck, peep, sizzle, crunch, pop, plop, egg_crack, ding, coin, riser, sad_trombone, sting, shimmer

# pacing: same table as PACE in src/videos/ayam/AyamFull.tsx (each scene slot plays at this speed; < 1 = longer).
# Cue positions below are written in the old 80 s timeline; place() moves them with W(), durations use D().
OLD_AT = [0, 147, 327, 453, 540, 738, 984, 1221, 1326, 1575, 1725, 1806, 2223]
PACE = [0.8, 0.9, 0.85, 0.75, 0.9, 0.92, 0.92, 0.8, 1, 0.85, 0.75, 1, 1]
NEW_AT = [0]
for _k in range(1, len(OLD_AT)):
    NEW_AT.append(NEW_AT[-1] + round((OLD_AT[_k] - OLD_AT[_k - 1]) / PACE[_k - 1]))


def W(f):
    k = 0
    while k + 1 < len(OLD_AT) and f >= OLD_AT[k + 1]:
        k += 1
    return NEW_AT[k] + (f - OLD_AT[k]) / PACE[k]


DUR = round(W(2400)) / 30
F = lambda f: f / 30
D = lambda a, b: (W(b) - W(a)) / 30  # a stretch of the old timeline, in new seconds
_place = place
place = lambda out, x, t: _place(out, x, W(t * 30) / 30)


def bed(dur, fade=0.4):
    n = ns(dur); e = np.ones(n); a = min(n // 2, ns(fade)); e[:a] = np.linspace(0, 1, a); e[-a:] = np.linspace(1, 0, a); return e


def day_amb(r, a, b, level=1.0):
    d = D(a, b); x = breeze(d, r, level=0.1 * level, gust=0.25, bright=800) + widen(bird_chirps(d, r, density=0.6) * 0.08 * level, r)
    return x * bed(d)


def night_amb(r, a, b):
    d = D(a, b); x = breeze(d, r, level=0.06, gust=0.15, bright=600) + widen(crickets(d, r) * 0.12, r)
    return x * bed(d)


def fire(dur, r):  # crackle: low rumble + random snaps
    n = ns(dur); x = lp(colored(n, r, -1.0), 400) * 0.25
    for _ in range(int(dur * 9)):
        i = r.integers(0, n - 2000); k = r.integers(80, 400); x[i:i + k] += hp(r.normal(0, 1, k), 1500) * np.exp(-np.arange(k) / (k / 5)) * r.uniform(0.2, 0.7)
    return pan(x * bed(dur) * 0.5, 0)


def storm(dur, r):  # rain hiss + roaring wind that peaks while the funnel passes
    n = ns(dur); t = np.linspace(0, 1, n)
    rain = hp(colored(n, r, 0.0), 2500) * 0.18
    roar = lp(colored(n, r, -2.0), 500) * (0.25 + 0.75 * np.exp(-((t - 0.55) / 0.22) ** 2))
    howl = breeze(dur, r, level=0.6, gust=0.9, bright=1200)
    return widen((rain + roar) * bed(dur, 0.6), r) + howl * bed(dur, 0.6)


def render(path):
    r = rng(11)
    out = np.zeros((2, ns(DUR) + SR))
    # 1-3 hook: coins, poor shack, KENAPA board
    place(out, day_amb(r, 0, 147), 0)
    for t in (0.1, 0.35, 0.6, 0.9, 1.2):
        place(out, pan(coin(r) * 0.4, r.uniform(-0.3, 0.3)), t)
    place(out, pan(whoosh(0.5, r, peak=0.15) * 0.4, 0), F(46))
    place(out, pan(whoosh(0.5, r, peak=0.15) * 0.4, 0), F(88))
    place(out, pan(pop(r) * 0.6, 0.1), F(92))
    place(out, pan(cluck(r, 2, big=True) * 0.5, -0.2), 3.85)
    # 4 storm
    place(out, storm(D(140, 326), r), F(140))
    place(out, pan(sting(r) * 0.5, 0), F(147))
    for t in (8.7, 9.0, 9.3, 9.95):
        place(out, widen(whoosh(0.9, r, peak=0.3, f_lo=200, f_hi=1200) * 0.6, r), t)
    # 5 night, hungry
    place(out, night_amb(r, 318, 453), F(318))
    place(out, fire(D(326, 453), r) * 0.6, F(326))
    # 6 chickens fall: whistle down, plop, puff, clucks
    place(out, day_amb(r, 453, 540), F(453))
    for i, x in enumerate((-0.5, 0, 0.5)):
        place(out, pan(whoosh(0.7, r, peak=0.6, f_lo=900, f_hi=2600) * 0.3, x), F(T(17.2) - 22))
        place(out, pan(plop(r) * 0.8, x), F(T(17.2) + i * 2))
        place(out, pan(cluck(r, 3) * 0.4, x), F(T(17.2) + 6 + i * 3))
    # 7 roast at night: fire, sizzle, chewing, then the sad note
    place(out, night_amb(r, 532, 752), F(532))
    place(out, fire(D(540, 744), r), F(540))
    place(out, sizzle(D(T(20.3), T(23.88)), r, 0.5), F(T(20.3)))
    for f in range(T(22.68), T(23.88), 6):
        place(out, pan(crunch(r) * 0.5, r.uniform(-0.3, 0.3)), F(f))
    place(out, pan(sad_trombone(r) * 0.8, 0), F(T(23.88)))
    # 8-9 group 2 eggs, rooster, group 3 walk + deal
    place(out, day_amb(r, 736, 1220), F(736))
    for t in (25.6, 27.4, 29.2):
        place(out, pan(cluck(r) * 0.3, 0.3), t)
    for i in range(4):
        place(out, pan(plop(r) * 0.5, -0.1), F(T(28.25) + i * 5))
    place(out, pan(cluck(r, 4, big=True) * 0.55, 0.3), 30.6)
    for f in range(T(35.03), T(35.03) + 40, 9):
        place(out, pan(stroll_step(r) * 0.35, 0.4), F(f))
    place(out, pan(ding(r, 1320, 1.0) * 0.35, 0), F(T(39.32)))
    # 10 board
    place(out, day_amb(r, 1214, 1325), F(1214))
    place(out, pan(pop(r) * 0.5, 0), F(T(41.47)))
    place(out, pan(pop(r, 1100, 400) * 0.5, 0), F(T(43.39)))
    place(out, pan(cluck(r, 2) * 0.35, -0.2), F(T(43.39) + 3))
    # 11 hatching
    place(out, day_amb(r, 1319, 1575), F(1319))
    for i in range(4):
        place(out, pan(egg_crack(r) * 0.6, 0.1), F(T(46.11) + i * 4 - 2))
        place(out, pan(peep(r) * 0.3, r.uniform(-0.3, 0.3)), F(T(46.11) + i * 4 + 2))
    # 12 timeline: dings, hammering coops, a growing flock
    for i, s in enumerate((47.21, 48.55, 49.92)):
        place(out, pan(ding(r, [1320, 1480, 1760][i]) * 0.45, 0), F(T(s)))
        for k in range(i + 1):
            place(out, pan(hammer_hit(r, 0.8) * 0.3, r.uniform(-0.3, 0.4)), F(T(s) + 3 + k * 5))
    for f in range(1405, 1900, 4):
        dens = 0.1 if f < 1460 else 0.3 if f < 1520 else 0.55
        if r.uniform() < dens:
            place(out, pan((cluck(r) if r.uniform() < 0.8 else peep(r)) * 0.09, r.uniform(-0.8, 0.8)), F(f))
    place(out, pan(sting(r) * 0.4, 0), F(T(51.6)))
    # 13 protest (sunset)
    place(out, breeze(D(1575, 1725), r, level=0.08, gust=0.2, bright=700) * bed(D(1575, 1725)), F(1575))
    for f in (T(56.54), T(56.54) + 12, T(56.54) + 24):
        place(out, pan(push_thump(r) * 1.4, -0.1), F(f))
    # 14-16 middle calm, rich overwhelmed, the job offer paid in eggs
    place(out, day_amb(r, 1719, 2050), F(1719))
    place(out, pan(ding(r, 1046, 1.4) * 0.3, 0), F(T(59.36)))
    place(out, pan(sting(r) * 0.5, 0.1), F(T(61.39)))
    for f in range(T(63.56), T(63.56) + 36, 9):
        place(out, pan(stroll_step(r) * 0.35, 0.3), F(f))
    for i in range(3):
        place(out, pan(plop(r) * 0.55, -0.2), F(T(67.13) + i * 4))
    # 17 crane up through the sky, then the map dots
    place(out, widen(whoosh(D(2040, 2110) + 1.0, r, peak=D(2040, 2100), f_lo=250, f_hi=1800, width=1.0, tail=0.6, air=0.3) * 0.8, r), F(2040))
    place(out, widen(shimmer(2.0, r, density=12, lo=2000, hi=5000) * 0.25, r), F(2110))
    for i, s in enumerate((71.85, 72.46, 73.25)):
        place(out, pan(pop(r, 700 + i * 150, 320) * 0.55, (i - 1) * 0.3), F(T(s)))
    place(out, pan(ding(r, 1760, 1.2) * 0.35, 0.2), F(T(73.25)))
    # 18 joke: cheque, a pause, the smash cut to the SUV with honks and cheering
    place(out, day_amb(r, 2222, 2400), F(2222))
    place(out, widen(shimmer(1.2, r, density=25, lo=3000, hi=7000) * 0.3, r), F(2226))
    for i in range(2):  # honk "tin tin": two square-ish horn blasts
        n = ns(0.22); t = np.arange(n) / SR; h = np.sign(np.sin(2 * np.pi * 400 * t)) * 0.5 + np.sign(np.sin(2 * np.pi * 500 * t)) * 0.5
        place(out, pan(lp(h, 3000) * np.minimum(1, np.minimum(t / 0.01, (0.22 - t) / 0.03)) * 0.35, 0), F(2350) + i * 0.3)
    place(out, applause(1.6, r, people=12) * 0.5, F(2352))
    out = out[:, : ns(DUR)]
    out = norm_to(out, -24.0, mode="integrated")
    tp = true_peak(out)
    if tp > -3:
        out *= 10 ** ((-3 - tp) / 20)
    write_wav(path, out)
    print("wrote", path, "true peak", round(true_peak(out), 2))


def T(sec):
    return round(sec * 30) - 2


if __name__ == "__main__":
    render(sys.argv[1] if len(sys.argv) > 1 else "out/ayamshort/sfx.wav")
