"""Calm background score for "Garam di Pohon Kelapa" (final cut, 111.2 s).

Original music in a quiet, sparse piano-and-pad mood (the feel of sandbox-game ambient music), no borrowed melody.
F major / Lydian colour, 64 BPM, felt piano with long reverb, a soft pad underneath.

    python3 audio/garam_music.py <captions.json> <video_audio.wav> <out_dir>

Writes music.wav (unducked), music_ducked.wav and mix.wav (video audio + ducked music, loudness-normalised).
"""
import json
import sys

import numpy as np

from dsp import SR, ns, rng, lp, hp, dbg, place, make_ir, convolve_st, integrated, true_peak, read_wav, write_wav
from ketindihan_audio import limit

DUR = 111.2
BPM = 64.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def piano(m, vel, dur, r):
    """felt-piano note: inharmonic partials, two detuned strings, two-stage decay, soft hammer"""
    f0 = mtof(m)
    n = ns(min(dur + 2.5, 9.0))
    t = np.arange(n) / SR
    B = 0.00035
    x = np.zeros(n)
    t_long = np.interp(m, [30, 60, 90], [9.0, 5.0, 2.2])
    for k in range(1, 12):
        fk = f0 * k * np.sqrt(1 + B * k * k)
        if fk > 7000:
            break
        amp = (1.0 / k ** 1.35) * (0.55 + 0.45 * vel) ** (k * 0.35)
        tau1 = 0.35 / (1 + 0.4 * k)
        tau2 = t_long / (1 + 0.55 * k)
        env = 0.55 * np.exp(-t / tau1) + 0.45 * np.exp(-t / tau2)
        det = 1 + r.uniform(0.0004, 0.0011)
        ph = r.uniform(0, 2 * np.pi)
        x += amp * env * (np.sin(2 * np.pi * fk * t + ph) + 0.8 * np.sin(2 * np.pi * fk * det * t + ph * 1.3))
    att = np.minimum(1, t / 0.006)
    x *= att
    # damper: release after the held time
    rel = np.where(t > dur, np.exp(-(t - dur) / 0.45), 1.0)
    x *= rel
    # hammer felt thump
    th = r.standard_normal(ns(0.03)) * np.exp(-np.arange(ns(0.03)) / ns(0.006))
    x[: len(th)] += 0.05 * lp(th, 900)
    x = lp(x, 1800 + 2600 * vel, 2)
    return x * vel


def pad(notes, t0, t1, r):
    """soft sustained chord: a few slightly detuned sines per note, slow swell"""
    n = ns(t1 - t0 + 3.0)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for m in notes:
        f = mtof(m)
        for d in (-0.0025, 0.0, 0.003):
            vib = 1 + 0.0012 * np.sin(2 * np.pi * r.uniform(0.15, 0.3) * t + r.uniform(0, 6))
            x += np.sin(2 * np.pi * f * (1 + d) * np.cumsum(vib) / SR + r.uniform(0, 6)) / 3
            x += 0.18 * np.sin(2 * np.pi * 2 * f * (1 + d) * t) / 3
    held = t1 - t0
    env = np.clip(t / 2.2, 0, 1) * np.where(t > held, np.exp(-(t - held) / 1.4), 1.0)
    return lp(x * env, 1400, 2) / len(notes)


# ---------------------------------------------------------------- the score
# chords: (bass notes, right-hand voicing, pad notes), each lasts 2 bars
A = [
    ([29, 41], [57, 64, 67, 72], [53, 57, 64]),          # Fmaj9
    ([28, 40], [55, 62, 64, 67], [52, 55, 62]),          # C/E add9
    ([26, 38], [53, 60, 64, 69], [50, 57, 60]),          # Dm9
    ([22, 34], [62, 64, 65, 69], [50, 53, 57]),          # Bbmaj7#11
]
Bsec = [
    ([31, 43], [58, 65, 69, 74], [50, 55, 58]),          # Gm9
    ([22, 34], [62, 65, 69, 72], [50, 53, 57]),          # Bbmaj7 (9)
    ([33, 45], [60, 65, 67, 69], [53, 57, 60]),          # F/A
    ([24, 36], [62, 67, 72, 74], [55, 60, 62]),          # Csus2
]
# melody per chord: (beat offset inside the 8-beat chord, midi, length in beats)
MEL_A = [
    [(1.0, 76, 2.0), (3.0, 72, 4.0)],
    [(1.5, 74, 1.0), (2.5, 72, 1.5), (4.0, 67, 3.5)],
    [(1.0, 69, 1.0), (2.0, 72, 1.0), (3.0, 76, 2.5), (5.5, 74, 2.0)],
    [(1.0, 76, 3.0), (4.0, 74, 1.5), (6.0, 69, 2.0)],
]
MEL_A2 = [
    [(1.0, 79, 1.5), (2.5, 77, 1.0), (3.5, 76, 3.5)],
    [(1.5, 74, 1.0), (2.5, 76, 1.0), (3.5, 74, 1.0), (4.5, 67, 3.0)],
    [(1.0, 72, 1.5), (3.0, 69, 1.0), (4.0, 72, 3.5)],
    [(1.0, 76, 2.0), (3.5, 81, 1.5), (5.0, 79, 1.0), (6.0, 76, 2.0)],
]
MEL_B = [
    [(1.0, 74, 2.0), (3.0, 70, 1.0), (4.0, 69, 3.0)],
    [(1.5, 72, 1.5), (3.0, 74, 1.0), (4.0, 77, 3.5)],
    [(1.0, 76, 1.5), (2.5, 72, 1.0), (4.0, 69, 3.5)],
    [(1.0, 72, 1.0), (2.0, 74, 2.0), (5.0, 67, 3.0)],
]
# broken-chord pattern: (beat, voice index into RH, velocity)
ARP = [(0.0, 'b', 0.42), (0.5, 0, 0.30), (1.5, 1, 0.26), (2.5, 2, 0.28), (3.5, 3, 0.22),
       (4.0, 'b2', 0.30), (5.0, 1, 0.24), (6.0, 2, 0.26), (7.0, 0, 0.20)]
ARP_THIN = [(0.0, 'b', 0.40), (1.5, 1, 0.24), (3.0, 2, 0.24), (5.0, 3, 0.20), (6.5, 1, 0.18)]


def score():
    """list of (section chords, melody or None, arp pattern) per 8-beat slot; 15 slots of 2 bars ~ 112.5 s"""
    plan = []
    plan += [(c, None, ARP_THIN) for c in A]                        # 0-30 s: intro, thin
    plan += [(c, MEL_A[i], ARP) for i, c in enumerate(A)]            # 30-60 s: melody enters
    plan += [(c, MEL_B[i], ARP) for i, c in enumerate(Bsec)]         # 60-90 s: B section
    plan += [(A[0], MEL_A2[0], ARP), (A[1], MEL_A2[1], ARP_THIN)]   # 90-105 s: return
    plan += [(A[0], None, ARP_THIN)]                                 # 105-112 s: home chord, fade
    return plan


def music(seed=7):
    r = rng(seed)
    n = ns(DUR + 6)
    dry = np.zeros((2, n))
    pads = np.zeros((2, n))
    slot = 2 * BAR
    plan = score()
    for si, (ch, mel, arp) in enumerate(plan):
        t0 = si * slot
        bass, rh, pd = ch
        last = si == len(plan) - 1
        p = pad(pd, t0, t0 + slot + (4 if last else 0), r)
        place(pads, np.stack([p * 0.9, p]), t0)
        for beat, v, vel in arp:
            tt = t0 + beat * BEAT + r.normal(0, 0.012)
            if v == 'b':
                for k, m in enumerate(bass):
                    place(dry, piano(m, vel * (0.9 if k else 0.6), slot, r) * [[0.62], [0.52]], tt)
            elif v == 'b2':
                place(dry, piano(bass[1] + 7, vel * 0.8, 3 * BEAT, r) * [[0.55], [0.5]], tt)
            else:
                m = rh[v]
                pn = (m - 62) / 40.0
                place(dry, piano(m, vel, 2.5 * BEAT, r) * [[0.5 - pn], [0.5 + pn]], tt)
        if mel:
            for beat, m, ln in mel:
                tt = t0 + beat * BEAT + r.normal(0, 0.01)
                vel = 0.36 + r.uniform(-0.04, 0.04)
                place(dry, piano(m, vel, ln * BEAT, r) * [[0.46], [0.56]], tt)
        # a rare, very soft high "sparkle" note
        if si % 3 == 2:
            m = [84, 88, 86][(si // 3) % 3]
            place(dry, piano(m, 0.16, BEAT, r) * [[0.6], [0.4]], t0 + 6.5 * BEAT)
    ir = make_ir(3.6, 11, pre=0.02, hf=1.4)
    wet = convolve_st(dry[0] * 0.5 + dry[1] * 0.5, ir)
    x = dry * 0.62 + wet * 0.55 + pads * 0.30
    x = hp(x, 45, 2)
    x = x[:, : ns(DUR)]
    # fades
    k = np.ones(x.shape[1])
    fi, fo = ns(2.5), ns(5.0)
    k[:fi] = np.linspace(0, 1, fi) ** 2
    k[-fo:] = np.linspace(1, 0, fo) ** 1.5
    return x * k


def duck_curve(words, n, depth_db=-5.0, att=0.25, rel=0.9):
    """1.0 between phrases, depth_db while the narrator speaks; smooth attack/release"""
    on = np.zeros(n)
    phrase = []
    for w in words:
        phrase.append(w)
        if w.get('brk'):
            a, b = ns(phrase[0]['s'] - 0.12), ns(phrase[-1]['e'] + 0.2)
            on[max(0, a):min(n, b)] = 1.0
            phrase = []
    g = np.zeros(n)
    ca, cr = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR))
    # one-pole smoothing at a reduced rate (fast enough, cheap)
    step = 48
    s = 0.0
    vals = []
    for i in range(0, n, step):
        tgt = on[i]
        c = ca ** step if tgt > s else cr ** step
        s = c * s + (1 - c) * tgt
        vals.append(s)
    g = np.repeat(np.array(vals), step)[:n]
    return dbg(depth_db * g)


def main(cap, vid, out):
    words = json.load(open(cap))
    v, sr = read_wav(vid)
    assert sr == SR, sr
    mus = music()
    n = min(v.shape[1], mus.shape[1])
    v, mus = v[:, :n], mus[:, :n]
    lv = integrated(v)
    # music about 12 LU under the soundtrack, then ducked a further 5 dB under the voice
    mus *= dbg(lv - 12.0 - integrated(mus))
    duck = duck_curve(words, n)
    md = mus * duck
    mix = v + md
    target = -15.0
    mix *= dbg(target - integrated(mix))
    mix = limit(mix, dbg(-2.2), 0.004, 0.1)
    write_wav(f"{out}/music.wav", mus)
    write_wav(f"{out}/music_ducked.wav", md)
    write_wav(f"{out}/mix.wav", mix)
    print('video audio LUFS %.1f' % lv, '| music %.1f' % integrated(mus), '| ducked music %.1f' % integrated(md),
          '| mix %.1f LUFS, TP %.1f dBTP' % (integrated(mix), true_peak(mix)))


if __name__ == "__main__":
    main(*sys.argv[1:4])
