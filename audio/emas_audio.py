# Sound for the "emas kuno" film (src/videos/emas/Film.tsx, 106 s): soft sound effects + room tone only, no music.
# The user adds narration + subtitles, and asked for effects that are NOT loud: the whole track sits around -26 LUFS
# with the peaks limited well below full scale. Every cue is a global second = scene start + the local time in Film.tsx.
# Usage: .tools/py/bin/python3 audio/emas_audio.py out/emas/audio  -> sfx.wav
import sys
import numpy as np
from dsp import (SR, TAU, ns, tt, rng, lp, hp, bp, colored, smooth_noise, phase, pan, place, widen,
                 write_wav, integrated, true_peak, momentary_max, dbg)
from sfx_gen import whoosh, clink, breeze, bird_chirps, crickets, babble, boot, stroll_step, flag_flutter
from ayam_sfx import pop, ding, sting, shimmer, riser, coin
from ketindihan_audio import thud, hum, clap, tick, key_tap, marker, drip, heartbeat, paper_plak, limit
from kopi2_audio import bed, add, crinkle, blow, shutter, laugh, snore

DUR = 106.0


# ---------------- small effects made for this film ----------------
def kleng(r):  # hoe on old metal: bright clang with a long thin ring
    a = clink(r, f0=2350, dur=1.6, bright=1.0); b = clink(r, f0=3720, dur=1.2, bright=0.8) * 0.5
    return add(a, b, thud(r, 0.5) * 0.4)


def dig(r, dur=0.5):  # fingers in soil: soft gritty scrape
    n = ns(dur); return bp(colored(n, r, -0.5), 500, 3500) * (0.4 + 0.6 * smooth_noise(n, r, 12)) * bed(dur, 0.05) * 0.35


def rub(r, dur):  # thumb rubbing a coin: little squeaky strokes, 2.6 per second
    n = ns(dur); t = np.arange(n) / SR; g = np.abs(np.sin(np.pi * 2.6 * t)) ** 2
    return (bp(r.standard_normal(n), 2500, 7000) * 0.25 + np.sin(phase(np.full(n, 3100.0))) * 0.03) * g * bed(dur, 0.05)


def whistle(r, notes, step=0.28):  # a nonchalant two-tone whistle tune
    out = []
    for m in notes:
        tl = tt(step); f = 440 * 2 ** ((m - 69) / 12) * (1 + 0.012 * np.sin(TAU * 6 * tl))
        y = np.sin(phase(f)) * np.sin(np.pi * tl / step) ** 0.6 + 0.08 * hp(r.standard_normal(len(tl)), 4000)
        out.append(y)
    return np.concatenate(out) * 0.25


def lid(r, open_=True):  # small ceramic lid: a light tock + a scrape
    a = clink(r, f0=1300 if open_ else 1050, dur=0.18, bright=0.5) * 0.6
    return add(a, bp(r.standard_normal(ns(0.08)), 1500, 5000) * np.exp(-tt(0.08) / 0.02) * 0.2)


def typing(r, dur, rate=11):
    y = np.zeros(ns(dur)); tm = 0.0
    while tm < dur - 0.04:
        k = key_tap(r) * r.uniform(0.5, 1.0); i = ns(tm); y[i:i + len(k)] += k[: len(y) - i]; tm += r.uniform(0.6, 1.4) / rate
    return y


def cuff_click(r):  # ratchet: 4 quick metal clicks
    y = np.zeros(ns(0.3))
    for k in range(4):
        c = clink(r, f0=r.uniform(2600, 3400), dur=0.06, bright=0.9) * (0.5 + 0.15 * k); i = ns(k * 0.045); y[i:i + len(c)] += c[: len(y) - i]
    return y


def scrape(r, dur=0.35):  # chair leg on a floor
    n = ns(dur); t = np.arange(n) / SR
    return (bp(r.standard_normal(n), 300, 2000) * 0.3 + np.sin(phase(180 + 60 * t / dur)) * 0.1) * bed(dur, 0.04)


def rustle(r, dur):  # banknotes / envelope paper
    return crinkle(dur, r, 30) * 0.6


def sob(r, dur):  # muffled sobs: low breathy hiccups
    n = ns(dur); t = np.arange(n) / SR; g = np.clip(np.sin(TAU * 2.2 * t), 0, 1) ** 2
    return bp(r.standard_normal(n), 250, 1800) * g * bed(dur, 0.1) * 0.3


def rewind(r, dur):  # tape-rewind: a squeal climbing fast + a whirr
    n = ns(dur); t = np.arange(n) / SR; u = t / dur
    f = 300 + 2400 * u ** 2
    y = np.sin(phase(f)) * 0.12 * (0.6 + 0.4 * np.sin(TAU * 18 * t)) + bp(r.standard_normal(n), 800, 5000) * 0.12 * u
    return y * bed(dur, 0.1)


def sneaky(r):  # villain sting: two low plucked notes sliding down, a little reverb-ish tail
    out = np.zeros(ns(1.2))
    for k, f0 in enumerate((147.0, 139.0)):
        t = tt(0.55); f = f0 * (1 - 0.04 * t / 0.55); y = (np.sin(phase(f)) + 0.5 * np.sin(phase(2 * f)) + 0.25 * np.sin(phase(3 * f))) * np.exp(-t / 0.2) * (1 - np.exp(-t / 0.004))
        i = ns(k * 0.28); out[i:i + len(y)] += lp(y, 1200)[: len(out) - i] * 0.6
    return out


def door_bell(r):  # shop bell: two little bells
    return add(ding(r, 2349, 0.9) * 0.4, np.concatenate([np.zeros(ns(0.09)), ding(r, 2794, 0.8) * 0.3]))


def scale_beep(r):
    t = tt(0.06); return np.sin(phase(np.full(len(t), 2000.0))) * np.clip((0.06 - t) / 0.01, 0, 1) * 0.15


def dusk_amb(dur, r, level=1.0):  # a quiet suburban garden at dusk: breeze, a few birds, far motorbike
    n = ns(dur); y = np.zeros((2, n)); place(y, breeze(dur, r, level=0.07 * level, gust=0.15, bright=700), 0)
    place(y, bird_chirps(dur, r, density=0.35) * 0.05 * level, 0)
    t = np.arange(n) / SR; t0 = r.uniform(0, dur); w = np.exp(-((t - t0) / 1.5) ** 2)
    eng = bp(np.sign(np.sin(phase(np.full(n, 62.0)))) + 0.3 * r.standard_normal(n), 80, 1200) * w * 0.04 * level
    place(y, pan(eng, r.uniform(-1, 1)), 0); return y * bed(dur, 0.4)


def room_amb(dur, r, level=1.0):  # a bedroom by day: AC hum, faint birds through the window
    y = np.zeros((2, ns(dur))); place(y, widen(lp(colored(ns(dur), r, -1.5), 400) * 0.05 * level, r), 0)
    place(y, bird_chirps(dur, r, density=0.2) * 0.025 * level, 0); return y * bed(dur, 0.3)


def night_amb(dur, r):
    y = np.zeros((2, ns(dur))); place(y, crickets(dur, r) * 0.07, 0); place(y, breeze(dur, r, level=0.03, gust=0.1, bright=500), 0); return y * bed(dur, 0.5)


def mall_amb(dur, r, busy=1.0):
    n = ns(dur); y = np.zeros((2, n))
    for _ in range(int(5 * busy) + 2): place(y, pan(babble(dur, r, r.uniform(110, 240), r.uniform(0.95, 1.2)) * 0.035, r.uniform(-0.8, 0.8)), 0)
    for _ in range(int(dur * 1.2 * busy)): place(y, pan(clink(r, f0=r.uniform(2400, 4200), dur=0.2, bright=0.6) * 0.06, r.uniform(-0.7, 0.7)), r.uniform(0, dur - 0.2))
    place(y, widen(lp(colored(n, r, -1.5), 300) * 0.1, r), 0); return y * bed(dur, 0.3)


def dream_amb(dur, r):  # soft airy shimmer bed for the dream
    y = np.zeros((2, ns(dur))); place(y, widen(shimmer(dur, r, 6, 2500, 6000) * 0.12, r), 0)
    place(y, widen(lp(colored(ns(dur), r, -1.0), 1200) * 0.03, r), 0); return y * bed(dur, 0.5)


# ---------------- effects track ----------------
def sfx_track():
    r = rng(4250); out = np.zeros((2, ns(DUR) + SR))
    P = lambda x, t, p=0.0, g=1.0: place(out, pan(x * g, p), t)
    # S1 0-3 + S2 3-11 + S3 11-20 + S4 20-26: dusk in the garden
    place(out, dusk_amb(26.0, r), 0)
    P(whoosh(0.35, r, peak=0.15, f_lo=300, f_hi=1500), 0.8, 0.1, 0.5); P(kleng(r), 1.1, 0.1, 0.8)
    P(riser(1.0, r) * 0.4, 1.2, 0.0); P(shimmer(1.4, r, 18, 2500, 6500) * 0.35, 1.3, 0.0)
    # S2: steps over, crouch, dig, pick, rub, glow
    for k in range(4): P(stroll_step(r), 3.15 + k * 0.21, 0.0, 0.35)
    P(whoosh(0.3, r, peak=0.08, f_lo=300, f_hi=1200), 4.0, 0, 0.3); P(dig(r, 0.7), 5.2, 0.0); P(dig(r, 0.4), 5.9, 0.0)
    P(rub(r, 1.9), 7.0, 0.05); P(shimmer(1.2, r, 20, 3000, 7000) * 0.4, 9.0, 0.0); P(coin(r), 9.05, 0.0, 0.35)
    # S3: shutter + flash, the answer pops in, the eye-pop
    P(shutter(r), 12.7, 0.1, 0.7); P(pop(r, 1600, 900) * 0.3, 13.45, 0); P(ding(r, 1760, 0.8), 14.45, 0, 0.25)
    P(sting(r), 18.05, 0, 0.45)
    # S4: panic typing, the sweat drop, shuffle, hide, whistle
    P(pop(r, 1200, 700) * 0.25, 20.05, 0); P(typing(r, 2.0, 12), 20.95, 0.0, 0.7); P(drip(r), 22.3, 0.0, 0.6)
    for k in range(7): P(stroll_step(r, 0.8), 23.1 + k * 0.22, (-1) ** k * 0.2, 0.3)
    P(whoosh(0.25, r, peak=0.06, f_lo=600, f_hi=2500), 24.6, 0, 0.3); P(whistle(r, [79, 76, 79, 76]), 24.95, 0.0)
    # S5 26-33: night, the lid opens and closes, a heartbeat while you stare
    place(out, night_amb(7.0, r), 26.0)
    for t0, op in ((27.0, 1), (27.8, 0), (28.6, 1), (28.95, 0), (29.25, 1), (29.6, 0), (30.2, 1)):
        P(lid(r, bool(op)), t0, 0.1, 0.6)
        if op: P(shimmer(0.5, r, 16, 3000, 7000) * 0.25, t0 + 0.05, 0.1)
    for k in range(3): P(heartbeat(r), 30.8 + k * 0.7, 0, 0.35)
    # S6 33-38: morning, snore, jolt awake, grab, open: still there, relieved sigh
    place(out, room_amb(5.0, r), 33.0); P(bird_chirps(4.0, r, density=0.6) * 0.04, 33.3)
    P(snore(1.2, r), 33.05, 0.1, 0.6); P(sting(r), 34.25, 0.1, 0.4); P(whoosh(0.3, r, peak=0.1), 34.5, 0.1, 0.4)
    P(lid(r, True), 35.6, 0.1, 0.6); P(shimmer(0.8, r, 18, 3000, 7000) * 0.3, 35.65, 0.1); P(blow(r, 0.8), 36.0, 0.1, 0.5)
    # S7 38-45: typing, the imagined robber pops up in purple smoke, you jump, he vanishes
    place(out, room_amb(13.0, r), 38.0)
    P(typing(r, 3.4, 10), 38.2, -0.2, 0.6); P(pop(r, 1100, 600) * 0.25, 39.6, -0.2)
    P(whoosh(0.5, r, peak=0.2, f_lo=200, f_hi=1200), 42.5, -0.2, 0.5); P(pop(r, 500, 200), 42.6, -0.2, 0.5)
    P(sting(r), 43.3, -0.2, 0.4); P(whoosh(0.4, r, peak=0.15, f_lo=300, f_hi=1500), 44.3, -0.2, 0.4)
    # S8 45-51: the imagined officer marches in (boots), salute, the thin envelope, takes the coin, marches out whistling
    for k in range(4): P(boot(r, 0.7), 45.05 + k * 0.33, 0.4, 0.35)
    P(clap(r) * 0.3, 46.45, 0.2); P(rustle(r, 0.5), 47.2, 0.1); P(paper_plak(r) * 0.4, 47.95, 0.0); P(coin(r), 48.2, 0.0, 0.3)
    for k in range(6): P(boot(r, 0.6), 49.0 + k * 0.33, 0.5, 0.3)
    P(whistle(r, [72, 76, 79, 76, 72]), 49.3, 0.5, 0.6)
    # S9 51-57: the dream: house, car, scooter pop out of the clouds; puff, the ring, she gasps and jumps
    place(out, dream_amb(6.0, r), 51.0)
    for t0, f in ((51.15, 1568), (52.75, 1760), (53.95, 2093)): P(pop(r, 900, 400) * 0.4, t0, 0); P(ding(r, f, 0.8), t0 + 0.02, 0, 0.18)
    P(whoosh(0.4, r, peak=0.12, f_lo=400, f_hi=2000), 54.75, 0, 0.4); P(pop(r, 700, 300) * 0.35, 54.85, 0)
    P(ding(r, 2349, 1.0), 55.1, 0, 0.2); P(laugh(0.9, r, 380, 6.5, 1.35) * 0.45, 56.0, 0.2)
    for k in range(4): P(pop(r, 1400 + 150 * k, 800) * 0.2, 56.05 + k * 0.22, 0.2)
    # S10 57-64: the mail ding, a small shock, nods
    place(out, room_amb(7.0, r), 57.0)
    P(ding(r, 1975, 0.9), 58.05, -0.1, 0.35); P(pop(r, 900, 500) * 0.3, 60.5, 0.0)
    for k in range(3): P(whoosh(0.18, r, peak=0.04, f_lo=600, f_hi=2000), 62.8 + k * 0.33, 0, 0.25)
    # S11 64-69: the busy mall cafe, the smooth talk, a handshake
    place(out, mall_amb(5.0, r, 1.0), 64.0); P(clap(r) * 0.25, 66.95, 0.0); P(clap(r) * 0.15, 67.25, 0.0)
    # S12 69-72: he stands (chair), twists your arm (whoosh), cuffs click; the cafe gasps
    place(out, mall_amb(3.0, r, 0.7) * np.linspace(1, 0.4, ns(3.0)), 69.0)
    P(scrape(r), 69.35, 0.2, 0.6); P(sting(r), 69.45, 0.0, 0.4); P(whoosh(0.4, r, peak=0.2, f_lo=300, f_hi=1800), 69.55, 0.2, 0.5)
    P(cuff_click(r), 70.25, 0.2, 0.6)
    # S13 72-81: the room hums, the clock ticks, the slam (not too loud), the marker circle, sobs
    P(hum(9.0, r, 100) * bed(9.0, 0.8) * 0.04, 72.0); P(lp(colored(ns(9.0), r, -1.5), 300) * bed(9.0, 0.6) * 0.04, 72.0)
    for k in range(18): P(tick(r, k % 2 == 1) * 0.25, 72.3 + k * 0.5, -0.3)
    P(thud(r, 1.0), 75.0, -0.2, 0.55); P(clink(r, f0=2800, dur=0.12) * 0.25, 75.03, 0.0); P(marker(0.9, r), 75.9, 0.0, 0.7)
    P(sob(r, 2.0), 79.0, 0.0, 0.8)
    # S14 81-84.5: sobs, then the rewind: ticking speeds up, a squeal climbs, white flash
    P(sob(r, 1.4), 81.0, 0.0, 0.8)
    tm = 82.4; dt = 0.3
    while tm < 84.3: P(tick(r) * 0.3, tm, 0.0); tm += dt; dt = max(0.04, dt * 0.85)
    P(rewind(r, 1.9), 82.4, 0.0, 0.8); P(shimmer(0.8, r, 25, 3000, 7000) * 0.3, 84.0, 0.0)
    # S15 84.5-88.5: back in the room; blink; laptop slammed shut
    place(out, room_amb(4.0, r), 84.5); P(whoosh(0.6, r, peak=0.2, f_lo=400, f_hi=3000, tail=0.3), 84.5, 0, 0.4)
    P(add(clink(r, f0=700, dur=0.15, bright=0.5) * 0.6, thud(r, 0.5) * 0.6), 87.45, -0.2, 0.6)
    # S16 88.5-94.5: the shop: coin on the scale, digits count up, ding; cash slides across, you pick it up
    place(out, room_amb(10.0, r, 0.7), 88.5)
    P(coin(r), 89.9, 0.1, 0.3); tm = 90.4
    while tm < 91.75: P(scale_beep(r), tm, 0.1); tm += 0.12
    P(ding(r, 2093, 0.9), 91.8, 0.1, 0.3); P(rustle(r, 0.6), 92.3, 0.0); P(rustle(r, 0.4), 93.1, 0.2)
    P(blow(r, 0.5) * 0.4, 93.4, 0.2)
    # S17 94.5-98.5: you walk out, the bell; the owner picks up the phone (95.2-95.6), a low sneaky sting as the evil face lands
    #   (96.0-96.6), then a sly shoulder chuckle (97.1-98.0)
    for k in range(5): P(stroll_step(r), 94.55 + k * 0.24, 0.4, 0.3)
    P(door_bell(r), 95.6, 0.5, 0.6); P(whoosh(0.3, r, peak=0.06, f_lo=500, f_hi=2500), 95.2, -0.2, 0.3); P(pop(r, 1500, 1100) * 0.2, 95.6, -0.2)
    P(sneaky(r), 96.0, -0.1, 0.5); P(laugh(0.9, r, 140, 6.4, 0.95) * 0.35, 97.1, -0.2)
    # S18 98.5-106: the crossroads at golden hour: birds, breeze, the flag, a far motorbike; fade out
    place(out, dusk_amb(7.5, r, 1.1), 98.5); P(flag_flutter(7.0, r) * 0.03, 98.6, -0.4)
    P(whoosh(0.5, r, peak=0.06, f_lo=300, f_hi=1500), 100.0, -0.3, 0.3); P(whoosh(0.5, r, peak=0.06, f_lo=300, f_hi=1500), 101.9, 0.3, 0.3)
    t = np.arange(out.shape[1]) / SR; out *= np.interp(t, [0, 0.05, 105.2, 106.0], [0, 1, 1, 0])
    return out[:, : ns(DUR)]


def main(outdir):
    import os
    os.makedirs(outdir, exist_ok=True)
    sfx = sfx_track(); sfx *= dbg(-26.0 - integrated(sfx)); sfx = limit(sfx, 0.5)
    write_wav(f"{outdir}/sfx.wav", sfx)
    print(f"sfx: {integrated(sfx):.1f} LUFS, max momentary {momentary_max(sfx):.1f}, true peak {true_peak(sfx):.1f} dBTP, {sfx.shape[1] / SR:.2f}s")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "out/emas/audio")
