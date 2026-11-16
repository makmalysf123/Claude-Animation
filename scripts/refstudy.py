"""Reference-video measurements (no PIL needed: tiny PNG reader/writer on zlib + numpy).

usage: .tools/py/bin/python3 scripts/refstudy.py <study dir>   (dir holds tiny/f_XXXX.png from ffmpeg and audio.wav)

Writes into the study dir:
  motion.csv      per frame: mean abs change vs previous frame (0-255), per 3x3 region, and a hold flag
  motion.png      motion timeline (one column per frame, rows = regions), 0.5 s grid
  audio.csv       every 10 ms: RMS dB total + 5 bands (sub/low/mid/himid/air), spectral flux
  onsets.csv      detected hits (time, strength, dominant band)
  spec_<k>.png    spectrograms, 10 s each, 1 px = 10 ms, log frequency 40 Hz-16 kHz, grid every 0.5 s
"""
import sys, os, zlib, struct, wave, glob
import numpy as np

def read_png(path):
    d = open(path, "rb").read(); assert d[:8] == b"\x89PNG\r\n\x1a\n"
    i, idat, w = 8, b"", None
    while i < len(d):
        ln, = struct.unpack(">I", d[i:i + 4]); typ = d[i + 4:i + 8]; body = d[i + 8:i + 8 + ln]; i += 12 + ln
        if typ == b"IHDR": w, h, bd, ct = struct.unpack(">IIBB", body[:10])
        elif typ == b"IDAT": idat += body
    ch = {0: 1, 2: 3, 6: 4, 4: 2}[ct]; raw = zlib.decompress(idat); stride = w * ch
    out = np.zeros((h, stride), np.int32); prev = np.zeros(stride, np.int32); p = 0
    for y in range(h):
        f = raw[p]; line = np.frombuffer(raw[p + 1:p + 1 + stride], np.uint8).astype(np.int32); p += 1 + stride
        cur = np.zeros(stride, np.int32)
        if f == 0: cur = line
        elif f == 2: cur = (line + prev) & 255
        else:
            for x in range(stride):
                a = cur[x - ch] if x >= ch else 0; b = prev[x]; c = prev[x - ch] if x >= ch else 0
                if f == 1: v = a
                elif f == 3: v = (a + b) // 2
                else:
                    pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                    v = a if pa <= pb and pa <= pc else (b if pb <= pc else c)
                cur[x] = (line[x] + v) & 255
        out[y] = cur; prev = cur
    return out.reshape(h, w, ch)[..., 0] if ch in (1, 2) else out.reshape(h, w, ch)

def write_png(path, img):
    img = np.clip(img, 0, 255).astype(np.uint8); h, w = img.shape[:2]; ct = 2 if img.ndim == 3 else 0
    raw = b"".join(b"\x00" + img[y].tobytes() for y in range(h))
    chunk = lambda t, b: struct.pack(">I", len(b)) + t + b + struct.pack(">I", zlib.crc32(t + b) & 0xffffffff)
    open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, ct, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 6)) + chunk(b"IEND", b""))

def motion(d):
    files = sorted(glob.glob(os.path.join(d, "tiny", "f_*.png")))
    fr = [read_png(f).astype(np.float32) for f in files]
    H, W = fr[0].shape; rows = []
    for n in range(len(fr)):
        if n == 0: rows.append([0, 0.0] + [0.0] * 9); continue
        a = np.abs(fr[n] - fr[n - 1]); reg = [float(a[i * H // 3:(i + 1) * H // 3, j * W // 3:(j + 1) * W // 3].mean()) for i in range(3) for j in range(3)]
        rows.append([n, float(a.mean())] + reg)
    with open(os.path.join(d, "motion.csv"), "w") as f:
        f.write("frame,time_s,mean,hold," + ",".join(f"r{i}{j}" for i in range(3) for j in range(3)) + "\n")
        for r in rows: f.write(f"{r[0]},{r[0]/30:.3f},{r[1]:.2f},{int(r[0] > 0 and r[1] < 0.35)}," + ",".join(f"{x:.2f}" for x in r[2:]) + "\n")
    # timeline: top strip = mean (bar), then 9 region rows; 2 px per frame
    n = len(rows); img = np.full((140, n * 2, 3), 20, np.float32)
    for k, r in enumerate(rows):
        v = min(1, r[1] / 25); img[60 - int(v * 58):60, k * 2:k * 2 + 2] = [255, 210, 80] if r[1] >= 0.35 else [255, 60, 60]
        for q in range(9): img[64 + q * 8:71 + q * 8, k * 2:k * 2 + 2] = min(255, r[2 + q] * 12)
    for k in range(0, n, 15): img[:, k * 2] = [90, 90, 160] if k % 30 else [160, 160, 255]
    write_png(os.path.join(d, "motion.png"), img)
    holds = sum(1 for r in rows[1:] if r[1] < 0.35)
    print(f"motion: {n} frames, {holds} identical-to-previous, mean change {np.mean([r[1] for r in rows[1:]]):.2f}")

def audio(d):
    w = wave.open(os.path.join(d, "audio.wav")); sr = w.getframerate(); ch = w.getnchannels()
    x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32).reshape(-1, ch).mean(1) / 32768
    hop = sr // 100; win = 2048; nfr = (len(x) - win) // hop; han = np.hanning(win)
    freqs = np.fft.rfftfreq(win, 1 / sr); bands = [(20, 120), (120, 500), (500, 2000), (2000, 6000), (6000, 16000)]
    bidx = [(freqs >= a) & (freqs < b) for a, b in bands]
    spec = np.zeros((nfr, len(freqs)), np.float32)
    for i in range(nfr): spec[i] = np.abs(np.fft.rfft(x[i * hop:i * hop + win] * han))
    p = spec ** 2; rms = np.array([np.sqrt(np.mean(x[i * hop:i * hop + win] ** 2)) for i in range(nfr)])
    db = lambda v: 10 * np.log10(np.maximum(v, 1e-12))
    bandE = np.stack([db(p[:, m].sum(1)) for m in bidx], 1)
    lg = np.log1p(spec * 10); flux = np.maximum(0, lg[1:] - lg[:-1]).sum(1); flux = np.concatenate([[0], flux])
    with open(os.path.join(d, "audio.csv"), "w") as f:
        f.write("time_s,rms_db,sub,low,mid,himid,air,flux\n")
        for i in range(nfr): f.write(f"{(i * hop + win / 2) / sr:.2f},{20 * np.log10(max(rms[i], 1e-6)):.1f}," + ",".join(f"{v:.1f}" for v in bandE[i]) + f",{flux[i]:.1f}\n")
    # onsets: flux peaks above a moving median
    med = np.array([np.median(flux[max(0, i - 50):i + 50]) for i in range(nfr)]); thr = med * 1.6 + 2
    on = []
    for i in range(2, nfr - 2):
        if flux[i] > thr[i] and flux[i] == flux[i - 2:i + 3].max() and (not on or i - on[-1][0] >= 4): on.append((i, flux[i]))
    names = ["sub", "low", "mid", "himid", "air"]
    with open(os.path.join(d, "onsets.csv"), "w") as f:
        f.write("time_s,frame,strength,rise_db_by_band(sub/low/mid/himid/air),top_band\n")
        for i, s in on:
            rise = bandE[min(nfr - 1, i + 2)] - bandE[max(0, i - 3)]
            f.write(f"{(i * hop + win / 2) / sr:.2f},{int((i * hop + win / 2) / sr * 30)},{s:.0f},{'/'.join(f'{v:+.0f}' for v in rise)},{names[int(np.argmax(rise))]}\n")
    # spectrograms, 10 s per image, log-frequency rows
    fr_rows = np.geomspace(40, 16000, 256)[::-1]; col = np.searchsorted(freqs, fr_rows)
    S = db(p[:, col]); S = (S - (S.max() - 80)) / 80; S = np.clip(S, 0, 1)
    for k in range(0, nfr, 1000):
        seg = S[k:k + 1000].T; img = np.stack([seg ** 0.8 * 255, seg ** 1.6 * 230, (seg ** 0.5) * 120 + 30 * (1 - seg)], 2)
        for t in range(0, seg.shape[1], 50): img[:, t] = [80, 80, 140] if (k + t) % 100 else [170, 170, 255]
        for fhz in (100, 1000, 10000): img[int(np.argmin(np.abs(fr_rows - fhz)))] = [60, 160, 60]
        pad = np.full((256, 1000, 3), 0, np.float32); pad[:, :img.shape[1]] = img
        # loudness strip under the spectrogram
        lo = np.full((60, 1000, 3), 15, np.float32); r = 20 * np.log10(np.maximum(rms[k:k + 1000], 1e-6))
        for t, v in enumerate(r): h = int(np.clip((v + 60) / 60, 0, 1) * 58); lo[60 - h:60, t] = [240, 240, 240]
        write_png(os.path.join(d, f"spec_{k // 100:02d}.png"), np.concatenate([pad, lo], 0))
    print(f"audio: {nfr} x 10 ms, {len(on)} onsets, peak {20*np.log10(rms.max()):.1f} dBFS")

if __name__ == "__main__":
    d = sys.argv[1]; motion(d); audio(d)
