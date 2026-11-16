# Catatan kode: mesin video "Satu Malam Ketindihan"

Cara kerja kode yang dipakai di video ini, supaya video berikutnya bisa langsung memakai ulang mesinnya.
Standar visualnya (yang diminta user) ada di [../style-references/rekap-standar-video.md](../style-references/rekap-standar-video.md).

---

## 1. Stack (dikunci, jangan di-upgrade)
- React 18.3, @react-three/fiber 8.18, three 0.170, postprocessing 6.x, Remotion 4.0.541, n8ao (AO).
- Dengan React 19 / R3F 9, `EffectComposer` menghasilkan frame kosong di Remotion. Penjelasannya ada di `CLAUDE.md`.
- Node portable ada di `.tools/node/bin` dan Python di `.tools/py/bin/python`. Keduanya lokal saja, tidak di-commit.

## 2. Peta file
| File | Isi |
|---|---|
| `src/videos/ketindihan2/Film.tsx` | Comp `KetindihanFilm` (1080x1920, 30 fps, 88.5 s). Semua adegan S1..S8c, kamera, akting, post-processing. |
| `src/videos/ketindihan2/sets.ts` | Bahan bersama: `canvasTex`, material, pembantu `put`/`M`/`rbox`, lampu, kabut. Kontrak set: `root`, `sunDir`, `update(t)`. |
| `src/videos/ketindihan2/kampung.ts` | `KampungSet`: kampung malam (rumah bervariasi, jalan, palem, pisang, tiang dan kabel, lampu jalan, jendela interior). |
| `src/videos/ketindihan2/interior.ts` | `interiorWindow()`: shader *interior mapping* (ruangan palsu di balik kaca, dengan TV berkedip dan pantulan bulan). |
| `src/videos/ketindihan2/kamar.ts` | `KamarSet`: kamar Budi (jam 3D `setClock`, kalender `drawCalendar`, selimut dengan `setChest(lift)`, `pillowHead`). |
| `src/videos/ketindihan2/brainhq.ts` | `BrainHQ`: ruang kontrol otak. Rinciannya di bagian 6. |
| `src/videos/ketindihan2/rooms2.ts` | `Shell` (ruangan dengan lubang pintu dan lorong), `TamuSet`, `DapurSet`, `BayiSet` (kipas rusak berasap, pohon kunti, kunang-kunang). |
| `src/videos/ketindihan2/props2d.ts` | Barang 2D yang digambar ke kartu tokoh: `drawFaceSweat`, `raggedDress`, `drawSheet`, dll. |
| `src/videos/ketindihan2/cast.ts` | Spesifikasi tokoh (`CharSpec`): BUDI, NARTI, PETUGAS, KUNTI, SOSOK, dst. |
| `src/lib/toon2.ts` | Gambar tokoh 2D: bentuk kepala terukur, tinta kuas, kamus mata, alis, dan mulut. Ekspor `handPoint`, `headCenter`. |
| `src/lib/acting.ts` | Mesin akting: mood per mata dan alis, gaya bicara, kedip, pop, gerak pose-ke-pose, LEG (`stand`, `wide`, `bent`, `sit`), ARM (`point`, `hip`, `hug`, `shrug`, `chest`, ...). |
| `src/lib/toonCard.ts` | `ToonCard`: tokoh sebagai kartu di dunia 3D. Rinciannya di bagian 4. |
| `src/lib/world2/textures.ts` | Tekstur prosedural (albedo + height ke normal map), di-cache. |
| `src/lib/world2/teras.ts` | Set teras pagi (dipakai di S4). |
| `audio/ketindihan_audio.py` | Trek efek suara dan musik. Jalankan dari `audio/`: `../.tools/py/bin/python ketindihan_audio.py ../out/film`. |
| `scripts/stills.mjs`, `sheets.mjs`, `refsheets.mjs` | Foto preview dan contact sheet. |
| `scripts/inkcheck.py` | Cek kedipan frame tunggal di video. |
| `scripts/head*.py`, `bodytrack.py`, `inkwidth.py` | Alat ukur dari video referensi. |

## 3. Struktur adegan (`Film.tsx`)
- **Satu adegan = satu `SceneDef`**, dengan field:
  - `from` dan `to` (detik global)
  - `mk()` untuk membuat set
  - `keys` untuk kunci kamera `{t, pos, look, fov}`
  - `act({t, cam, set, card})`
  - `fog`, `dens`, `bg`, `focus(t)` (titik fokus lens blur), `cInf`, `night`, `env`, `ao`
- **Kunci kamera** di-interpolasi halus. **Cut keras** dibuat dengan dua key berjarak 0.03 s, misalnya `t: 3.37` lalu `t: 3.4`.
- **Antar adegan cross-dissolve** selama `XF = 6` frame. `SCENES = [S1,S2,S3a,S3b,S4,S5,S7a,S7b,S7c,S8b,S8c]`.
- **Post chain**: N8AOPostPass → LensBlur → Bloom → ToneMapping NEUTRAL → HueSaturation → BrightnessContrast → Vignette.
- **Pencahayaan dasar**: env map `RoomEnvironment` lewat PMREM (di-cache per renderer), bayangan `PCFSoftShadowMap`.
- **Akting** memakai `actAt(actor, t)`, dengan `Actor = {seed, words, beats:[{t, mood, arms, legs, look, event, sweat}]}`.

## 4. Tokoh: `ToonCard`
- **Cara kerja**: gambar toon2 dilukis ulang ke canvas setiap frame, lalu kartunya menghadap kamera (`billboard()`).
- **Bayangan**: stand-in tak terlihat yang menghadap matahari memberi bayangan jatuh asli. Ada juga bayangan kontak lembut di bawah kaki.
- **Pemanggilan**: `update(spec, pose, x, z, cam, sunDir, scale, y?, custom?)`. Argumen `custom(g, Q)` menggambar barang 2D tambahan di kartu.
- **`lie`** untuk tokoh rebahan. Kepala Budi di bantal adalah kartu kepala saja (`headOnPillow`), jadi tidak mungkin menembus selimut 3D.
- **`shade` / `shadeCol` / `liftCol`**: gradasi cahaya ulang. Tokoh malam memakai `shade = 1` dengan warna (0.86, 0.88, 0.97); tokoh siang `shade = 0.35`.
- **Wajib**: `cam.layers.enable(NOINK)`.
- **BUG yang sudah diperbaiki**:
  - **Masalahnya**: `place()` dulu tidak mengembalikan `mesh.visible = true`. Kartu yang pernah di-`setVisible(false)` hilang selamanya di render penuh.
  - **Kenapa lolos**: di foto preview tidak kelihatan, karena tiap foto dirender dari awal.
  - **Pelajarannya**: **selalu cek frame dari video asli.**
- **Barang di tangan**: posisi tangan dihitung dengan `handPoint` dan `headCenter` (toon2) plus `mesh.localToWorld`, lalu barang 3D ditaruh tepat di titik itu. Contohnya tuas OTOT di S3b:
  1. Titik tangan dan bola tuas diproyeksikan ke layar.
  2. Kartu digeser sampai tangan tepat di bola tuas.

## 5. Trik visual yang dipakai
- **Interior mapping** (`interior.ts`):
  - Bidang datar dengan ShaderMaterial. Ray kamera dipotong dengan kotak ruangan virtual, lalu warnanya diambil dari atlas 1024 (dinding belakang, dinding samping, lantai, langit-langit).
  - Ditambah cahaya lampu dengan falloff, `uTv` untuk kedip biru, tekstur gorden, dan fresnel pantulan langit dan bulan (`uMoonDir`).
- **Malam realistis**: atap mengilap (roughness 0.42), aspal (0.32), cahaya bulan `#b4c6ff` intensitas 4.4, lampu jalan hangat.
- **Pohon**: `leafTex` + `canopy()` membuat mahkota daun dari banyak kartu daun.
- **Detak jantung**: `beatLift(t)` menggerakkan `KamarSet.setChest`, jadi selimut naik-turun.
- **Sosok hitam**: dilukis dengan `sosokPaint` (hitam penuh, mata merah, rim bulan). Muncul pelan lewat opacity dan alphaTest.
- **Keringat**: digambar di wajah lewat `drawFaceSweat`, jadi tidak melayang.
- **Kipas rusak**: kepala menunduk dan motornya gosong. Asap memakai Points (ukuran 0.22). Kepala kipas `castShadow = false` supaya bayangannya tidak berkedip.
- **Pintu ditendang**: engsel di z 1.05. Rotasinya cepat dalam 3 frame, lalu memantul dengan peredam.
- **Lampu kedip**: `flickerOn(t)`. Sosok lewat cepat di pintu lorong dalam beberapa frame (inkcheck menandainya di frame 2168, dan itu disengaja).

## 6. Ruang kontrol otak (`brainhq.ts`)
- **Jendela mata**:
  - Dibuat dengan ShapeGeometry berlubang elips, plus kelopak.
  - Jangan pakai RingGeometry: lubangnya tertutup dan hasilnya abu-abu.
  - `setEyes("night"|"teras"|"split")`. Mode `split` = mata kiri melihat kamar, mata kanan masih mimpi.
- **Konsol**:
  - Meja lengkung: ExtrudeGeometry dari busur, radius dalam 2.2 dan luar 3.0, berpusat di z -1.0.
  - Puluhan tombol menyala, ditambah dua layar mini (EKG dan gelombang otak).
- **Tuas OTAK (hijau) dan OTOT (merah, dirantai dan digembok)**:
  - Papan namanya mengikuti lengkung meja: `th = asin(px/2.2)`, posisi radius 2.13, `rotation.y = -th`.
  - Papan digeser 0.12 ke luar supaya tidak tertutup petugas.
  - Jangan menaruh papan datar di busur, karena ujungnya tenggelam ke meja.
- **Monitor potret** (`LiveTex` 512x704): `setMonitor(n, t)` menampilkan STATUS TUBUH, OTAK : BANGUN, OTOT : TERKUNCI (mode mimpi), lalu PEMICU.
- **Papan JAWABAN**:
  - Bohlam marquee, beacon, dan spot asli. Tidak ada kerucut cahaya palsu (yang aditif sudah dibuang).
  - `setScreen(text)` (teks otomatis dikecilkan supaya muat), `setFocus`, `setAlarm`, `pressButtons`.
- **Gunting raksasa** (class `Scissors`) dan derek: kertas KETINDIHAN dipotong dua.
- **`setStack(n, drop[])`**: empat kertas dijatuhkan dengan urutan KURANG TIDUR, STRES, JADWAL KACAU, SLEEP PARALYSIS (paling depan), lalu tertutup debu.
- **Rak bola memori**: bola glow plus cakram. Bola memori utama berisi diorama 3D Budi nonton horor (`heroCard`).

## 7. Perintah
```
export PATH=$PWD/.tools/node/bin:$PATH; export TMPDIR=$PWD/tmp

# foto preview (frame, skala)
COMP=KetindihanFilm node scripts/stills.mjs out/rev/x_ 640,1620 0.5

# contact sheet dari folder f_0000.jpg...
node scripts/refsheets.mjs <dir> <outDir> '[{"name":"sheet","from":0,"to":9,"cols":5,"cellW":432,"cellH":768}]'

# render penuh (sekitar 1.5 jam di M4; frame pertama berat, jadi timeout harus panjang)
npx remotion render src/index.ts KetindihanFilm out/film/video.mp4 --timeout=300000 --concurrency=3 --log=error

# render sebagian (contoh: adegan otak)
npx remotion render src/index.ts KetindihanFilm out/film/otak/v.mp4 --frames=1140-2009 --timeout=300000 --concurrency=3

# gabung audio
F=node_modules/@remotion/compositor-darwin-arm64
DYLD_LIBRARY_PATH=$F $F/ffmpeg -y -i video.mp4 -i out/film/audio.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -shortest out.mp4

# cek kedip (frame abu-abu kecil, lalu inkcheck)
DYLD_LIBRARY_PATH=$F $F/ffmpeg -i out.mp4 -vf scale=180:320,format=gray out/film/fcp/f_%04d.png
.tools/py/bin/python scripts/inkcheck.py out/film/fcp
```
- ffmpeg bawaan Remotion **tidak punya filter `tile`**. Untuk contact sheet pakai `refsheets.mjs`.
- `rm -rf` dengan glob diblok. Buat folder baru saja, dan tanya user sebelum menghapus.
- Audio:
  - `sfx.wav` di -20 LUFS dan `music.wav` di -27 LUFS, lalu digabung jadi `audio.wav`.
  - Claude tidak bisa mendengar audio, jadi user yang mengecek.

## 8. Urutan kerja yang terbukti
1. Bangun atau ubah adegan.
2. Buat foto preview di frame-frame penting.
3. Lihat contact sheet di ukuran penuh. Cek benda tembus, barang melayang, tulisan terpotong, dan kamera di dalam dinding.
4. Kirim preview ke user dan tunggu OK.
5. Render penuh atau sebagian.
6. Ambil frame dari video asli (bukan preview) dan jalankan inkcheck.
7. Gabung audio, lalu kirim.
