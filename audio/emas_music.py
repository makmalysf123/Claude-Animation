# Music for the "emas kuno" film (106 s), as a separate file the user mixes himself in CapCut.
# One theme in D minor / F major that changes costume with each scene:
#   kleng hit -> sneaky discovery -> excited groove (big hit on "satu miliar") -> panic typing -> night music box ->
#   morning relief -> typing + robber stab -> comic imagined-police march (deflates) -> lush dream -> suspense pulse ->
#   smooth cafe bossa -> hard stop at the arrest -> dark interrogation drone -> rewind swell + flash -> hopeful room motif
#   (stops at the laptop slam) -> wry gold-shop walk ("womp womp") -> villain sting on the owner's evil face ->
#   reflective ending that stays unresolved (the question to the viewer).
# Every cue is a global second of the film (src/videos/emas/Film.tsx), the same clock as audio/emas_audio.py.
# Usage: .tools/py/bin/python3 audio/emas_music.py out/emas/audio  -> music.wav
import sys
import numpy as np
from dsp import SR, ns, rng, pan, place, write_wav, integrated, true_peak, momentary_max, dbg, make_ir, convolve_st
from ketindihan_audio import limit
import instruments as I

DUR = 106.0
Q = 60 / 104  # one beat
CH = {"Dm": [50, 57, 62, 65], "Dm9": [50, 57, 62, 65, 69, 76], "F": [53, 57, 60, 65], "Fmaj7": [53, 57, 64, 69], "Bb": [46, 53, 58, 62],
      "Bbmaj7": [46, 53, 57, 62], "Gm": [43, 55, 58, 62], "Gm7": [43, 53, 58, 62], "A": [45, 52, 57, 61], "A7": [45, 52, 55, 61], "C": [48, 55, 60, 64],
      "C7": [48, 55, 58, 64], "Dm7": [50, 57, 60, 65], "CE": [52, 55, 60, 64], "Bbadd9": [46, 53, 60, 62, 65]}
MIN = [(0, 1, 74), (1, 0.5, 77), (1.5, 0.5, 76), (2, 1, 74), (3, 1, 69), (4, 1, 70), (5, 0.5, 69), (5.5, 0.5, 67), (6, 2, 69),
       (8, 1, 65), (9, 0.5, 67), (9.5, 0.5, 69), (10, 1, 72), (11, 1, 70), (12, 1, 69), (13, 1, 67), (14, 2, 74)]
MAJ = [(b, L, m + 3) for b, L, m in MIN]  # the same tune in F major (relative major)


def music():
    r = rng(4251); out = np.zeros((2, ns(DUR) + 3 * SR)); f = I.m2f

    def P(x, t, p=0.0, g=1.0):
        if t < DUR: place(out, pan(x * g, p), t)

    def PD(ch, t, dur, vel=0.05, att=0.6, rel=1.0, warm=900.0, shift=0):
        place(out, I.pad([f(m + shift) for m in (CH[ch] if isinstance(ch, str) else ch)], dur, vel, r, att=att, rel=rel, warm=warm), t)

    def tune(mel, t0, q, fn, vel, until, p=-0.15, tr=0):
        for b, L, m in mel:
            if t0 + b * q < until: P(fn(f(m + tr), vel, r, dur=max(0.5, L * q * 1.8)), t0 + b * q, p)

    def sneak(line, t0, t1, vel=0.35, step=Q / 2, every=2, p=-0.1):
        k = 0
        while t0 + k * step < t1:
            if k % every == 0: P(I.pluck(f(line[(k // every) % len(line)]), vel, r, dur=0.22, bright=0.6), t0 + k * step, p)
            k += 1

    def groove(t0, t1, prog, vel=0.45, brush=True, q=Q):
        k = 0
        while t0 + k * 4 * q < t1 - 0.05:
            b0 = t0 + k * 4 * q; ch = CH[prog[k % len(prog)]]
            for beat, m in ((0, ch[0] - 12), (2, ch[1] - 12)):
                if b0 + beat * q < t1: P(I.pluck(f(m), vel * 0.9, r, dur=q * 1.5, bright=0.2), b0 + beat * q, -0.1)
            for beat in (0, 1.5, 3):
                if b0 + beat * q < t1:
                    for i, m in enumerate(ch): P(I.pluck(f(m + 12), vel * 0.3, r, dur=0.5, bright=0.45), b0 + beat * q + i * 0.008, 0.25)
            if brush:
                for e in range(8):
                    if b0 + e * q / 2 < t1: P(I.brush(vel * (0.3 if e % 2 else 0.18), r, 0.2), b0 + e * q / 2, 0.35)
            k += 1

    # ---- S1 0-3: a swell into the kleng, then a shimmering D minor cloud
    PD("Dm", 0.0, 1.1, 0.025, att=1.0, rel=0.15, warm=600)
    P(I.timpani(f(38), 0.8, r, 2.0), 1.1); P(I.cymbal(0.3, r, 2.4), 1.1, 0.2)
    for i, m in enumerate([74, 77, 81, 86]): P(I.glock(f(m), 0.3, r, 2.0), 1.12 + i * 0.05, -0.15 + 0.1 * i)
    PD("Dm9", 1.1, 1.7, 0.045, att=0.05, rel=1.2)
    # ---- S2 3-11: sneaky pizzicato while you dig and rub; a magic swell when the coin glows (9.0)
    PD("Dm", 3.1, 5.8, 0.035, warm=500); sneak([50, 53, 57, 56, 55, 53, 52, 50], 3.2, 8.85, vel=0.5)
    for t0, m in ((4.4, 81), (5.05, 86), (7.5, 84)): P(I.glock(f(m), 0.18, r, 1.2), t0, 0.2)
    PD("F", 8.9, 2.0, 0.06, att=0.3, rel=1.0)
    for i, m in enumerate([65, 69, 72, 77, 81, 84, 89]): P(I.glock(f(m), 0.25, r, 1.6), 9.0 + i * 0.07, 0.15)
    P(I.triangle(0.3, r, 2.0), 9.05, 0.3)
    # ---- S3 11-20: excited groove in F, the theme on vibes; a big brass hit on "satu miliar" (18.0), held wow chord
    groove(11.0, 17.9, ["F", "Dm", "Bb", "C"], vel=0.42); tune(MAJ, 11.6, Q / 2 * 1.0, I.vibes, 0.28, 17.85)
    P(I.glock(f(88), 0.25, r, 1.0), 12.7, 0.2)
    for m in [65, 69, 72, 77]: P(I.brass(f(m), 0.35, 0.28, r, "stab"), 18.0, 0.0)
    P(I.timpani(f(41), 0.5, r, 1.6), 18.0); P(I.cymbal(0.3, r, 2.0), 18.0, -0.2); PD("F", 18.1, 1.7, 0.055, att=0.1, rel=0.4)
    # ---- S4 20-26: the AI's question (a "?" rise), panic typing (nervous 16ths), tiptoe shuffle, room left for the whistle
    P(I.pluck(f(69), 0.3, r, dur=0.3, bright=0.6), 20.1); P(I.pluck(f(74), 0.3, r, dur=0.5, bright=0.6), 20.35)
    PD("Dm", 20.1, 5.6, 0.045, rel=0.6); sneak([62, 65, 62, 64], 20.9, 22.95, vel=0.5, step=Q / 4, every=1, p=0.1)
    sneak([50, 53, 52, 50, 49, 50], 23.1, 24.8, vel=0.55)
    P(I.pluck(f(48), 0.25, r, dur=0.5, bright=0.3), 25.0); P(I.pluck(f(43), 0.22, r, dur=0.6, bright=0.3), 25.6)
    # ---- S5 26-33: night music box over a soft pad; twinkles when the lid opens; fades into the dip to black
    for i, ch in enumerate(["Dm", "Bb", "Gm", "A"]): PD(ch, 26.2 + i * 1.6, 1.6, 0.04, warm=700)
    tune(MIN, 26.5, 0.36, I.musicbox, 0.3, 32.2, p=0.1)
    for t0, m in ((27.0, 86), (28.6, 88), (29.25, 89), (30.2, 93)): P(I.glock(f(m), 0.12, r, 1.2), t0, 0.3)
    # ---- S6 33-38: quiet while you snore; a comic "bwong" as you jolt awake; sparkle at the open lid; warm relief chord
    P(I.pluck(f(38), 0.5, r, dur=0.6, bright=0.7), 34.25); P(I.brass(f(41), 0.25, 0.4, r, "tuba"), 34.27)
    for i, m in enumerate([62, 65, 69, 72, 74, 77]): P(I.pluck(f(m), 0.22, r, dur=0.2, bright=0.6), 34.6 + i * 0.12, 0.15)
    for i, m in enumerate([81, 84, 88]): P(I.glock(f(m), 0.2, r, 1.4), 35.6 + i * 0.06, 0.2)
    PD("F", 36.0, 2.0, 0.055, att=0.3, rel=0.6)
    for i, m in enumerate([65, 69, 72, 77]): P(I.vibes(f(m), 0.3, r, 1.8), 36.0 + i * 0.12, -0.1)
    # ---- S7 38-45: typing ostinato; a dissonant brass stab when the robber pops up (42.6); sneaky slink away
    PD("Dm", 38.0, 4.4, 0.02, warm=500); sneak([62, 69, 65, 69], 38.0, 42.4, vel=0.26, every=1, p=0.15)
    for e in range(int((42.4 - 38.0) / (Q / 2))): P(I.brush(0.08 if e % 2 else 0.05, r, 0.2), 38.0 + e * Q / 2, 0.35)
    P(I.glock(f(84), 0.15, r, 1.0), 39.6, 0.2)
    for m in [46, 52, 53]: P(I.brass(f(m), 0.6, 0.3, r, "horn"), 42.6, 0.0)
    P(I.timpani(f(38), 0.5, r, 1.8), 42.6); PD([40, 46, 47], 42.6, 1.2, 0.04, att=0.05, rel=0.8, warm=600)
    for m in [58, 64]: P(I.brass(f(m), 0.2, 0.4, r, "stab"), 43.3, 0.1)
    sneak([57, 56, 55, 54, 53, 52], 43.6, 44.9, vel=0.28)
    # ---- S8 45-51: comic march for the imagined officer (tuba oompah, snare, fife); deflating "womp" when the gold is taken
    for k in range(int((49.2 - 45.0) / 0.5)):
        t0 = 45.0 + k * 0.5; P(I.brass(f(41 if k % 2 == 0 else 48), 0.22, 0.45, r, "tuba"), t0, -0.05)
        P(I.snare(0.12, r, 0.2), t0 + 0.25, 0.25)
    for i, m in enumerate([72, 77, 77, 77, 76, 74, 72, 74, 76, 76, 77, 79, 77, 76, 74, 72]): P(I.fife(f(m + 12), 0.2, 0.22, r), 45.0 + i * 0.25, 0.2)
    for i, (m, L) in enumerate([(48, 0.28), (47, 0.28), (46, 0.28), (45, 0.9)]): P(I.brass(f(m), L, 0.45, r, "tuba", fall=(0.6 if i == 3 else 0.0)), 49.25 + i * 0.3, 0.0)
    # ---- S9 51-57: the dream: lush pads, harp-like arpeggios, a glock ping on every pop-in, sparkle runs for ring + hearts
    for ch, t0, d in (("Fmaj7", 51.0, 1.7), ("Dm7", 52.7, 1.2), ("Bbmaj7", 53.9, 0.9), ("C", 54.8, 1.2), ("Fmaj7", 56.0, 1.4)):
        PD(ch, t0, d, 0.05, att=0.25, rel=0.8)
        k = 0
        while k * 0.12 < d - 0.05:
            P(I.pluck(f(CH[ch][k % len(CH[ch])] + 12 + 12 * ((k // len(CH[ch])) % 2)), 0.18, r, dur=0.9, bright=0.75), t0 + k * 0.12, 0.25 * ((-1) ** k)); k += 1
    for t0, m in ((51.15, 84), (52.75, 86), (53.95, 88)): P(I.glock(f(m), 0.3, r, 1.6), t0, 0.0)
    for i, m in enumerate([77, 81, 84, 89, 93]): P(I.glock(f(m), 0.22, r, 1.4), 54.8 + i * 0.08, 0.1); P(I.glock(f(m + 2), 0.18, r, 1.4), 56.0 + i * 0.08, -0.1)
    P(I.triangle(0.25, r, 2.0), 56.0, 0.3)
    # ---- S10 57-64: suspense: a low pulse that grows, minor pads; three plucks on the nods, a resolving chord on the decision
    PD("Fmaj7", 57.0, 0.9, 0.03, rel=0.6)
    for i, ch in enumerate(["Dm", "Bb", "Gm", "A"]): PD(ch, 58.1 + i * 1.5, 1.5, 0.06 + 0.01 * i, warm=700)
    k = 0
    while 58.3 + k * Q / 2 < 62.7:
        P(I.pluck(f(38), 0.35 + 0.3 * k / 16, r, dur=0.25, bright=0.3), 58.3 + k * Q / 2, -0.05); k += 1
    P(I.glock(f(86), 0.25, r, 1.0), 60.5, 0.2)
    for i, m in enumerate([62, 65, 69]): P(I.pluck(f(m), 0.35, r, dur=0.35, bright=0.6), 62.8 + i * 0.33, 0.1)
    for m in CH["Dm"]: P(I.pluck(f(m + 12), 0.35, r, dur=0.8, bright=0.5), 63.8, 0.2)
    # ---- S11 64-69: smooth cafe bossa (the talker is convincing); a little flourish on the handshake (66.95)
    groove(64.0, 69.3, ["Fmaj7", "Gm7", "C7", "Fmaj7"], vel=0.42); tune(MAJ, 64.3, Q / 2, I.vibes, 0.24, 69.25)
    for i, m in enumerate([84, 88, 91]): P(I.glock(f(m), 0.18, r, 1.2), 66.95 + i * 0.07, 0.2)
    # ---- S12 69-72: hard stop; a low brass + timpani hit as your arm is twisted; a cold drone with a rubbing second on top
    for m in [38, 44, 50]: P(I.brass(f(m), 0.7, 0.35, r, "horn"), 69.45, 0.0)
    P(I.timpani(f(38), 0.6, r, 2.4), 69.45); P(I.cymbal(0.18, r, 2.0), 69.45, 0.3)
    PD([38, 45], 69.8, 2.3, 0.045, att=0.4, rel=0.3, warm=500); PD([74, 75], 69.9, 2.2, 0.012, att=0.8, rel=0.3)
    # ---- S13 72-81: interrogation: low drone, soft heartbeat timpani, a hit on the slam (75.0), brass swell under
    #      "tiga puluh hari", then a slow falling line while you shrink
    PD([38, 45, 50], 72.0, 9.0, 0.035, att=0.5, rel=0.8, warm=500)
    for t0 in [72.3, 73.5, 74.7 - 0.5, 76.2, 77.4, 78.6, 79.8]: P(I.timpani(f(38), 0.22, r, 0.8), t0); P(I.timpani(f(38), 0.14, r, 0.8), t0 + 0.2)
    P(I.timpani(f(36), 0.6, r, 2.2), 75.0); P(I.cymbal(0.25, r, 2.0), 75.0, -0.2)
    for m in [38, 41, 44]: P(I.brass(f(m), 0.4, 0.28, r, "stab"), 75.0)
    for m in [50, 53]: P(I.brass(f(m), 1.4, 0.3, r, "soft"), 75.9, 0.0)
    for i, m in enumerate([74, 72, 70, 69, 67, 65, 64, 62]): P(I.pluck(f(m), 0.26, r, dur=1.2, bright=0.35), 77.0 + i * 0.5, 0.15)
    PD("Gm", 77.0, 2.0, 0.035); PD("Dm", 79.0, 2.0, 0.035)
    # ---- S14 81-84.5: sad pad and music box while you sob; the rewind: a rising swell + accelerating glock, bright flash
    PD("Gm", 81.0, 1.4, 0.04); for_mb = [(81.1, 69), (81.5, 67), (81.9, 65), (82.3, 64)]
    for t0, m in for_mb: P(I.musicbox(f(m), 0.25, r, 1.4), t0, 0.1)
    PD("A7", 82.4, 1.9, 0.07, att=1.8, rel=0.2)
    tm, dt, m = 82.6, 0.22, 72
    while tm < 84.25: P(I.glock(f(m), 0.12 + 0.1 * (tm - 82.6) / 1.7, r, 0.8), tm, 0.3 * np.sin(tm * 9)); tm += dt; dt = max(0.04, dt * 0.85); m = min(98, m + 1)
    P(I.cymbal(0.3, r, 2.4), 84.3, 0.0); P(I.triangle(0.35, r, 2.0), 84.3, 0.2)
    for i, m in enumerate([84, 88, 91, 96]): P(I.glock(f(m), 0.25, r, 1.8), 84.3 + i * 0.04, -0.2 + 0.13 * i)
    # ---- S15 84.5-88.5: back in your room: a light hopeful motif; stops dead on the laptop slam (87.45)
    PD("F", 84.6, 2.7, 0.025, rel=0.2)
    for i, m in enumerate([65, 69, 72, 69, 67, 70, 74, 70, 69]): P(I.pluck(f(m + 12), 0.24, r, dur=0.6, bright=0.55), 84.7 + i * 0.29, 0.15)
    P(I.pluck(f(41), 0.5, r, dur=0.5, bright=0.6), 87.45); P(I.timpani(f(41), 0.5, r, 1.0), 87.45)
    # ---- S16 88.5-94.5: the gold shop: a wry tuba walk with offbeat plucks; a ting at 4.25, two notes for the cash,
    #      then "womp womp" for your crooked smile
    walkL = [41, 45, 48, 50, 46, 50, 53, 50, 48, 52, 55, 52, 41, 45, 48]
    for i, m in enumerate(walkL):
        t0 = 88.6 + i * Q
        if t0 > 93.3: break
        P(I.brass(f(m), Q * 0.55, 0.35, r, "soft"), t0, -0.1)
        for j, c in enumerate(CH[["F", "Bb", "C", "F"][(i // 4) % 4]]): P(I.pluck(f(c + 12), 0.14, r, dur=0.3, bright=0.5), t0 + Q / 2 + j * 0.006, 0.25)
    P(I.glock(f(84), 0.25, r, 1.2), 91.8, 0.1); P(I.glock(f(88), 0.2, r, 1.0), 92.3, 0.1); P(I.glock(f(91), 0.2, r, 1.0), 92.45, 0.1)
    for i, (m, L) in enumerate([(46, 0.25), (45, 0.25), (44, 0.25), (43, 0.7)]): P(I.brass(f(m), L, 0.4, r, "tuba", fall=(0.5 if i == 3 else 0.0)), 93.5 + i * 0.24, 0.0)
    # ---- S17 94.5-98.5: quiet low pulse as you leave; a villain sting on the owner's evil face (96.0); a sneaky villain line
    for k in range(3): P(I.pluck(f(38), 0.15, r, dur=0.3, bright=0.3), 94.6 + k * Q, -0.05)
    for m in [50, 53, 58]: P(I.brass(f(m), 0.9, 0.26, r, "horn"), 96.0, 0.0)
    P(I.timpani(f(38), 0.45, r, 1.6), 96.0); PD([38, 44], 96.0, 2.4, 0.04, att=0.1, rel=0.6, warm=500)
    sneak([50, 51, 50, 49, 50, 53, 52, 51], 96.4, 98.4, vel=0.24, every=1, p=-0.1)
    for i in range(3): P(I.brass(f(50), 0.12, 0.25, r, "soft"), 97.1 + i * 0.18, -0.2)
    # ---- S18 98.5-106: the question: soft pads, the theme on music box, ending unresolved on a Bb add9
    for ch, t0, d in (("F", 98.6, 1.75), ("CE", 100.35, 1.75), ("Dm", 102.1, 1.75), ("Bbadd9", 103.85, 2.1)): PD(ch, t0, d, 0.045, att=0.5, rel=1.2)
    tune(MAJ, 98.9, 0.4, I.musicbox, 0.28, 103.7, p=0.1)
    for i, m in enumerate([77, 74, 72, 74]): P(I.musicbox(f(m), 0.22, r, 2.0), 103.9 + i * 0.4, 0.1)

    t = np.arange(out.shape[1]) / SR
    g = np.interp(t, [0, 0.05, 32.3, 33.0, 33.05, 104.9, 106.0], [0, 1, 1, 0, 1, 1, 0])
    out *= g
    out = out + convolve_st(out, make_ir(1.1, 9, hf=1.5)) * 0.18
    return out[:, : ns(DUR)]


def main(outdir):
    import os
    os.makedirs(outdir, exist_ok=True)
    mus = music(); mus *= dbg(-25.0 - integrated(mus)); mus = limit(mus, 0.7)
    write_wav(f"{outdir}/music.wav", mus)
    print(f"music: {integrated(mus):.1f} LUFS, max momentary {momentary_max(mus):.1f}, true peak {true_peak(mus):.1f} dBTP, {mus.shape[1] / SR:.2f}s")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "out/emas/audio")
