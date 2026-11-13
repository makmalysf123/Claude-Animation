# Test soundtrack for AyamActTest (3 scenes): the matching pieces of the scratch narration + effects at the same cues.
# Usage (from audio/): ../.tools/py/bin/python ayam_act_sfx.py ../out/acttest/mix.wav
import sys
import numpy as np
from scipy.io import wavfile
from dsp import SR, ns, rng, pan, place, widen, write_wav, norm_to, true_peak
from sfx_gen import whoosh, breeze, crickets, bird_chirps, stroll_step, wood_crack, timber_tear
from ayam_sfx import cluck, sizzle, crunch, pop, plop, coin, sad_trombone, sting
from ayam_short_sfx import fire, storm

SCENES = [(18.0, 198), (32.8, 237), (4.9, 180)]  # (voice start s, frames)
T = lambda t0, s: (s - t0)  # seconds inside a scene


def render(path):
    r = rng(5)
    XF = 8 / 30  # scenes overlap by 8 frames (dissolve through the sky)
    total = sum(n for _, n in SCENES) / 30 - XF * (len(SCENES) - 1)
    out = np.zeros((2, ns(total) + SR))
    sr, v = wavfile.read("../voice/ayam/voice.wav"); v = v.astype(float) / 32768
    a = 0.0
    for k, (t0, n) in enumerate(SCENES):
        d = n / 30
        seg = v[int(t0 * sr): int((t0 + d) * sr)]
        seg = np.interp(np.arange(ns(d)) / SR, np.arange(len(seg)) / sr, seg)
        fx = np.zeros((2, ns(d) + SR))
        if k == 0:  # bonfire
            place(fx, widen(crickets(d, r) * 0.1, r), 0); place(fx, fire(d, r), 0)
            place(fx, sizzle(2.2, r, 0.45), T(t0, 20.3))
            for t in (22.2, 22.45):  # legs torn off
                place(fx, pan(wood_crack(r) * 0.25, 0), t - t0)
            for i in range(10): place(fx, pan(crunch(r) * 0.45, (-0.4, 0.4, 0)[i % 3]), T(t0, 22.5) + i * 0.13)
            place(fx, pan(sad_trombone(r) * 0.7, 0), T(t0, 23.85))
        elif k == 1:  # group 3 comes
            place(fx, breeze(d, r, level=0.1, gust=0.25, bright=800) + widen(bird_chirps(d, r, density=0.6) * 0.08, r), 0)
            for i in range(7): place(fx, pan(stroll_step(r) * 0.35, 0.3 - i * 0.08), T(t0, 34.9) + i * 0.24)
            for t in (33.5, 36.0, 38.6): place(fx, pan(cluck(r) * 0.3, -0.4), t - t0)
            place(fx, pan(pop(r, 1000, 500) * 0.45, 0), T(t0, 38.25))  # egg picked up
            place(fx, pan(coin(r) * 0.4, 0), T(t0, 39.78))  # deal
        else:  # whirlwind
            place(fx, storm(d, r), 0)
            place(fx, pan(sting(r) * 0.5, 0), T(t0, 6.05))
            for i in range(12): place(fx, pan(coin(r) * 0.35, r.uniform(-0.5, 0.5)), T(t0, 8.05) + i * 0.05)
            place(fx, pan(timber_tear(r, 0.9) * 0.6, 0), T(t0, 8.68))
            place(fx, widen(whoosh(1.4, r, peak=0.4, f_lo=200, f_hi=1500, tail=0.4) * 0.7, r), T(t0, 9.85))
        fx = norm_to(fx, -26.0, mode="integrated")
        fade = np.ones(ns(d)); n8 = ns(XF); fade[:n8] = np.linspace(0, 1, n8) if k else 1; fade[-n8:] = np.linspace(1, 0, n8) if k < len(SCENES) - 1 else 1
        place(out, fx[:, : ns(d)] * fade, a)
        place(out, pan(seg * 0.9 * fade, 0), a)
        a += d - XF
    out = out[:, : ns(total)]
    tp = true_peak(out)
    if tp > -1.5: out *= 10 ** ((-1.5 - tp) / 20)
    write_wav(path, out)
    print("wrote", path, round(total, 2), "s, true peak", round(true_peak(out), 2))


if __name__ == "__main__":
    render(sys.argv[1])
