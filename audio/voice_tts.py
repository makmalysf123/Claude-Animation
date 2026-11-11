# Test narration for "Satu Ayam yang Sama" with an Indonesian neural voice (edge-tts, Microsoft "Ardi").
# TEST ONLY: edge-tts is an unofficial route; for a monetised final use the official Azure Speech service (same voice)
# or a commercially licensed TTS. Writes voice/ayam/voice.mp3 + voice.wav + words.json (word, start, end in seconds)
# + beats.json (each beat's start/end), so the picture can be timed to the words.
# Usage: [VOICE=id-ID-GadisNeural] [OUT=voice/ayam_gadis] .tools/py/bin/python audio/voice_tts.py [rate] [pitch]   e.g. "+18%" "-2Hz"
import asyncio, json, os, subprocess, sys
import edge_tts

BEATS = [
    "Kenapa yang kaya makin kaya, dan yang miskin makin susah? Jawabannya... seekor ayam.",
    "Bayangkan suatu hari, puting beliung menyapu seluruh kampung. Emas, rumah, sawah... semuanya terbang.",
    "Sekarang semua orang sama: tidak punya apa-apa. Dan semuanya lapar.",
    "Tiga hari kemudian, tiap kelompok dapat satu ekor ayam.",
    "Kelompok pertama sudah tidak tahan lapar. Malam itu juga, ayamnya dipanggang. Makan malam paling enak... dan yang terakhir.",
    "Kelompok kedua sama laparnya, tapi ayamnya dibiarkan hidup. Kalau betina, telurnya dimakan. Kalau jantan, dipelihara untuk dikawinkan.",
    "Kelompok ketiga punya rencana lain. Mereka mendatangi kelompok kedua: pinjami kami telurnya. Nanti kalau sudah jadi ayam, telurnya kami bagi.",
    "Kelompok kedua mau telur. Kelompok ketiga... mau ayam.",
    "Tiga minggu kemudian, anak ayam pertama menetas. Beberapa bulan lagi, mereka bertelur sendiri. Lama-lama, ayam kelompok ketiga makin banyak.",
    "Sementara itu, kelompok pertama tidak punya apa-apa. Yang bisa mereka lakukan... cuma protes.",
    "Kelompok kedua punya telur, cukup untuk hidup tenang.",
    "Tapi ayam kelompok ketiga sudah terlalu banyak untuk diurus sendiri.",
    "Jadi mereka mendatangi kelompok pertama, dan menawarkan kerja. Upahnya... telur.",
    "Dan begitulah... kampung yang dimulai dengan ayam yang sama, sekarang terbelah jadi tiga: miskin, menengah, dan kaya.",
    "Nah, kalau kalian tiba-tiba dapat lima ratus juta... mau ditaruh di instrumen investasi... atau langsung beli Fortuner bekas?",
]
VOICE = os.environ.get("VOICE", "id-ID-ArdiNeural")
OUT = os.environ.get("OUT", "voice/ayam")
FF = "node_modules/@remotion/compositor-darwin-arm64/ffmpeg"


async def main(rate: str, pitch: str):
    os.makedirs(OUT, exist_ok=True)
    text = " ".join(BEATS)
    comm = edge_tts.Communicate(text, VOICE, rate=rate, pitch=pitch, boundary="WordBoundary")
    words = []
    with open(f"{OUT}/voice.mp3", "wb") as f:
        async for ch in comm.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                s = ch["offset"] / 1e7
                words.append({"w": ch["text"], "start": round(s, 3), "end": round(s + ch["duration"] / 1e7, 3)})
    json.dump(words, open(f"{OUT}/words.json", "w"), ensure_ascii=False, indent=0)
    # beat boundaries: walk the word list beat by beat (count the words of each beat)
    beats, i = [], 0
    for k, b in enumerate(BEATS):
        n = len([w for w in b.replace("...", " ").split() if any(c.isalnum() for c in w)])
        seg = words[i:i + n]
        if seg:
            beats.append({"beat": k + 1, "start": seg[0]["start"], "end": seg[-1]["end"], "text": b})
        i += n
    json.dump(beats, open(f"{OUT}/beats.json", "w"), ensure_ascii=False, indent=1)
    env = dict(os.environ, DYLD_LIBRARY_PATH=os.path.dirname(FF))
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", f"{OUT}/voice.mp3", "-ar", "48000", "-ac", "1", f"{OUT}/voice.wav"], env=env, check=True)
    total = words[-1]["end"] if words else 0
    print(f"words {len(words)}, length {total:.1f} s, {len(words) / max(total, 1):.2f} words/s")
    for b in beats:
        print(f"  beat {b['beat']:2d}: {b['start']:6.2f} - {b['end']:6.2f}")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else "+15%", sys.argv[2] if len(sys.argv) > 2 else "-2Hz"))
