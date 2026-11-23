"""Calm background score for "Menara Es Dolma" (final cut, 103.4 s).

Original music in the quiet, spacious piano-and-pad mood of sandbox-game ambient music (no borrowed melody).
D major with a Lydian colour, 60 BPM, felt piano with long reverb, a soft pad underneath. The instruments, the
ducking and the levels are reused from garam_music.py, whose mix level the user approved.

Arc: thin intro (stakes) -> melody (mockery, digging, the copy) -> B section (Tashi's ice) -> nearly empty in the
dry April (only bass and pad) -> high "drip" notes when the tower still drips -> the theme returns for the payoff.

    python3 audio/ladakh_music.py <captions.json> <video_audio.wav> <out_dir>
"""
import json
import sys

import numpy as np

from dsp import SR, ns, rng, hp, dbg, place, make_ir, convolve_st, integrated, true_peak, read_wav, write_wav
from ketindihan_audio import limit
from garam_music import piano, pad, duck_curve, ARP, ARP_THIN

DUR = 103.4
BEAT = 1.0  # 60 BPM
SLOT = 8 * BEAT  # one chord = 2 bars

# chords: (bass notes, right-hand voicing, pad notes)
DMAJ9 = ([26, 38], [57, 64, 66, 73], [54, 57, 61])
BM11 = ([23, 35], [57, 62, 64, 69], [50, 54, 57])
GMAJ7S11 = ([31, 43], [59, 61, 66, 69], [50, 54, 59])
ASUS2 = ([33, 45], [57, 59, 64, 69], [52, 57, 59])
EM9 = ([28, 40], [55, 62, 66, 71], [52, 55, 59])
GMAJ7 = ([31, 43], [59, 62, 66, 69], [50, 55, 59])
BM7 = ([23, 35], [57, 62, 66, 69], [50, 54, 57])
ASUS4 = ([33, 45], [57, 62, 64, 69], [52, 57, 62])

# melodies: (beat inside the 8-beat chord, midi, length in beats)
MEL_A = [
    [(1.0, 78, 2.0), (3.0, 76, 1.0), (4.0, 73, 3.5)],
    [(1.0, 74, 1.5), (2.5, 76, 1.0), (3.5, 74, 1.0), (4.5, 69, 3.0)],
    [(1.0, 71, 1.0), (2.0, 73, 1.0), (3.0, 78, 2.5), (5.5, 76, 2.0)],
    [(1.0, 76, 3.0), (4.0, 71, 1.5), (6.0, 69, 2.0)],
]
MEL_B = [
    [(1.0, 71, 2.0), (3.0, 74, 1.0), (4.0, 78, 3.0)],
    [(1.5, 76, 1.5), (3.0, 74, 1.0), (4.0, 71, 3.5)],
]
MEL_A2 = [
    [(1.0, 81, 1.5), (2.5, 78, 1.0), (3.5, 76, 3.5)],
    [(1.0, 74, 1.0), (2.0, 76, 1.0), (3.0, 78, 2.0), (5.0, 73, 3.0)],
]
ARP_BARE = [(0.0, 'b', 0.34)]  # dry April: a low note and the pad, nothing else
DRIPS = [(1.5, 86, 0.14), (3.25, 90, 0.12), (4.5, 85, 0.13), (6.0, 88, 0.12), (7.25, 85, 0.10)]


def score():
    """(chord, melody or None, arp pattern, extra high notes) per 8-s slot; 13 slots = 104 s"""
    return [
        (DMAJ9, None, ARP_THIN, None), (BM11, None, ARP_THIN, None),                 # 0-16 s hook + stakes
        (DMAJ9, MEL_A[0], ARP, None), (BM11, MEL_A[1], ARP, None),                  # 16-32 s offer, mockery
        (GMAJ7S11, MEL_A[2], ARP, None), (ASUS2, MEL_A[3], ARP, None),              # 32-48 s digging, the watcher
        (EM9, MEL_B[0], ARP, None), (GMAJ7, MEL_B[1], ARP_THIN, None),              # 48-64 s the copy, March
        (BM7, None, ARP_BARE, None),                                                # 64-72 s dry April
        (ASUS4, None, ARP_THIN, DRIPS),                                             # 72-80 s the tower still drips
        (DMAJ9, MEL_A2[0], ARP, None), (BM11, MEL_A2[1], ARP, None),                # 80-96 s payoff
        (DMAJ9, None, ARP_THIN, None),                                              # 96-104 s home, fade
    ]


def music(seed=23):
    r = rng(seed)
    n = ns(DUR + 8)
    dry = np.zeros((2, n))
    pads = np.zeros((2, n))
    plan = score()
    t0 = 0.0
    for si, (ch, mel, arp, extra) in enumerate(plan):
        bass, rh, pd = ch
        last = si == len(plan) - 1
        p = pad(pd, t0, t0 + SLOT + (4 if last else 0), r)
        place(pads, np.stack([p * 0.9, p]), t0)
        for beat, v, vel in arp:
            tt = t0 + beat * BEAT + r.normal(0, 0.012)
            if v == 'b':
                for k, m in enumerate(bass):
                    place(dry, piano(m, vel * (0.9 if k else 0.6), SLOT, r) * [[0.62], [0.52]], tt)
            elif v == 'b2':
                place(dry, piano(bass[1] + 7, vel * 0.8, 3 * BEAT, r) * [[0.55], [0.5]], tt)
            else:
                m = rh[v]
                pn = (m - 62) / 40.0
                place(dry, piano(m, vel, 2.5 * BEAT, r) * [[0.5 - pn], [0.5 + pn]], tt)
        if mel:
            for beat, m, ln in mel:
                tt = t0 + beat * BEAT + r.normal(0, 0.01)
                place(dry, piano(m, 0.36 + r.uniform(-0.04, 0.04), ln * BEAT, r) * [[0.46], [0.56]], tt)
        if extra:
            for beat, m, vel in extra:
                pn = r.uniform(-0.25, 0.25)
                place(dry, piano(m, vel, 0.6, r) * [[0.5 - pn], [0.5 + pn]], t0 + beat * BEAT + r.normal(0, 0.01))
        t0 += SLOT
    ir = make_ir(3.8, 17, pre=0.02, hf=1.4)
    wet = convolve_st(dry[0] * 0.5 + dry[1] * 0.5, ir)
    x = dry * 0.62 + wet * 0.58 + pads * 0.30
    x = hp(x, 45, 2)[:, : ns(DUR)]
    k = np.ones(x.shape[1])
    fi, fo = ns(2.0), ns(4.5)
    k[:fi] = np.linspace(0, 1, fi) ** 2
    k[-fo:] = np.linspace(1, 0, fo) ** 1.5
    return x * k


def main(cap, vid, out):
    words = json.load(open(cap))
    v, sr = read_wav(vid)
    assert sr == SR, sr
    mus = music()
    n = min(v.shape[1], mus.shape[1])
    v, mus = v[:, :n], mus[:, :n]
    lv = integrated(v)
    # same levels as the approved Garam mix: music ~12 LU under the soundtrack, ducked a further 5 dB under the voice
    mus *= dbg(lv - 12.0 - integrated(mus))
    md = mus * duck_curve(words, n)
    mix = v + md
    mix *= dbg(-15.0 - integrated(mix))
    mix = limit(mix, dbg(-2.2), 0.004, 0.1)
    write_wav(f"{out}/music.wav", mus)
    write_wav(f"{out}/music_ducked.wav", md)
    write_wav(f"{out}/mix.wav", mix)
    print('video audio LUFS %.1f' % lv, '| music %.1f' % integrated(mus), '| ducked music %.1f' % integrated(md),
          '| mix %.1f LUFS, TP %.1f dBTP' % (integrated(mix), true_peak(mix)))


if __name__ == "__main__":
    main(*sys.argv[1:4])
