# Gerakan kamera halus (satu take, banyak sudut)

Disetujui user pada 2026-11-25 lewat tes `RoomCamTest` (kamar tidur, 27 detik, satu take tanpa potongan).
User ingin gaya kamera ini dipakai lagi di video-video berikutnya:
1. **Di dalam satu adegan:** kamera tidak diam di satu sudut. Ia bergerak mulus dari 1 benda, ke 2–3 benda, lalu ke seluruh ruangan, dan sebaliknya.
2. **Dari adegan ke adegan:** perpindahan tempat bisa dibuat mulus, tidak selalu dengan potongan.
3. **Menjelaskan satu adegan dari banyak sisi:** depan, samping, atas, bawah, supaya penonton tidak bosan.
4. **Kecepatan bisa dinaikkan:** satu angka `speed` untuk seluruh gerakan.

Kode: [`src/lib/camMoves.ts`](../../src/lib/camMoves.ts). Contoh lengkap: [`src/videos/room/cam.ts`](../../src/videos/room/cam.ts).
Hasil tes: `out/room/room_cam_test.mp4` (lokal saja, tidak masuk git).

---

## 1. Cara kerjanya (bahasa sederhana)
- Kamera punya **pose**:
  - `p`: posisi kamera.
  - `l`: titik yang dilihat.
  - `f`: lebar lensa. Angka kecil berarti zoom masuk. 22 = sangat dekat, 40–50 = normal, 70–86 = sangat lebar.
  - `up`: arah atas gambar. Hanya perlu untuk sudut dari atas dan untuk memutar gambar.
- Video adalah **daftar gerakan**. Setiap gerakan punya lama (`dur`, dalam detik) dan pose akhir (`to`). Gerakan berikutnya selalu mulai tepat di pose akhir gerakan sebelumnya, jadi tidak pernah ada lompatan.
- Setiap gerakan di-*ease* dengan *smootherstep*: mulai pelan, cepat di tengah, berhenti pelan. Percepatannya juga nol di kedua ujung, jadi tidak ada sentakan.
- Kamera selalu bergeser sekitar 3 mm sangat pelan (`drift`), jadi tidak ada frame yang benar-benar beku.

## 2. Jenis gerakan
| `kind` | Nama film | Dipakai untuk |
|---|---|---|
| `line` | dolly, push-in, pull-out, crane naik/turun | Maju/mundur/naik/turun lurus. Tambah `via` (titik belok) supaya jalurnya melengkung, misalnya untuk menghindari lemari. |
| `line` + `f` berubah | dolly + zoom | Mendekat sambil mengganti lensa. |
| `hold` + `to: { f }` | zoom lensa (FOV) | Kamera diam, hanya lensa yang zoom in/out. |
| `hold` + `to: { up }` | putar gambar | Dari atas (top-down), gambar diputar di tempat. |
| `orbit` + `c` | orbit | Memutari satu titik `c`. Jarak dan tinggi bisa berubah selama memutar. |
| `pan` | pan / tilt | Kamera menoleh (kiri-kanan, atas-bawah). Arah pandang berputar, tidak memotong lurus. |
| `topDown(x, y, z, f, up)` | sudut atas | Pembantu untuk pose tepat di atas, menghadap ke bawah. |

Sudut yang sudah dicoba dan bagus:
- **Atas serong:** seluruh ruangan.
- **Setinggi mata.**
- **Close-up FOV 22** pada layar laptop.
- **Orbit** sekitar meja.
- **Top-down** di atas kasur, lalu diputar 90°.
- **Low angle** dekat lantai: lemari terlihat menjulang.
- **Pan** dari lemari ke kasur.
- **Pull-out** ke pojok kamar.

## 3. Cara pakai di adegan baru
```ts
import { makeCam, applyCam, topDown, Move, Pose } from "../../lib/camMoves";

const START: Pose = { p: [1.3, 2.5, 2.5], l: [-0.6, 0.6, -1.4], f: 64 };   // seluruh ruangan, atas serong
const MOVES: Move[] = [
  { name: "push-in ke meja", kind: "line", dur: 3, via: [1.2, 1.9, 0], to: { p: [1.5, 1.4, -1.1], l: [0.95, 0.9, -2.4], f: 40 } },
  { name: "zoom ke layar",   kind: "hold", dur: 1.2, to: { f: 22 } },
  { name: "orbit + zoom out", kind: "orbit", dur: 3.4, c: [1, 0.95, -2.35], to: { p: [0.1, 1.3, -1.5], l: [1, 1.2, -2.5], f: 46 } },
  { name: "atas kasur",      kind: "line", dur: 3, to: topDown(-1.1, 2.6, -1.7, 74, [0, 0, -1]) },
];
const CAM = makeCam(START, MOVES, { speed: 1 });   // CAM.seconds = total durasi
// di SceneDef (src/lib/scene.tsx):
//   act: ({ t, cam }) => applyCam(cam, CAM.at(t - from)),  focus: (t) => CAM.at(t - from).l
```
Urutan yang enak ditonton (dari tes):
- Mulai lebar (seluruh ruangan), lalu masuk ke 1 benda, keluar ke 2–3 benda, ganti sudut (atas atau bawah), dan tutup lebar lagi.
- Selang-seling gerakan **pindah tempat** (line/orbit) dengan gerakan **di tempat** (zoom lensa, pan, putar).
- Saat narasi menjelaskan sesuatu, kamera boleh *hold* (diam + drift) sebentar. Jangan meluncur terus tanpa henti.

## 4. Dari adegan ke adegan (transisi tanpa potongan)
1. **Satu dunia, satu take:**
   - Taruh kedua tempat di satu set, misalnya kamar dan ruang tamu, atau dalam rumah lalu keluar jendela.
   - Buat satu gerakan `line` panjang dengan `via` yang melewati pintu atau jendela.
   - Cek jalurnya dengan skrip pemeriksa.
2. **Match move (dua set berbeda):**
   - Adegan A berakhir dengan push-in ke sebuah benda sampai benda itu memenuhi layar, misalnya layar laptop atau gelap di balik pintu.
   - Adegan B dimulai dari close-up benda yang mirip lalu pull-out.
   - Karena kecepatan di ujung gerakan = 0, sambungannya terasa seperti satu gerakan. Kerjakan potongan di frame yang tepat (lihat catatan *cut frame*).
3. **Whip pan:** gerakan `pan` sangat cepat (dur 0.3–0.5 s) ke samping, potong di tengah, lalu lanjut `pan` cepat di adegan berikut ke arah yang sama.
   - Ini perlu motion blur atau bergaris. Belum dites.

## 5. Kecepatan (`speed`)
- `makeCam(START, MOVES, { speed: 1.5 })` membuat semua gerakan 1.5x lebih cepat, dan durasinya ikut memendek (27 s menjadi 18 s). Bentuk jalurnya tetap sama persis.
- Mau hanya satu gerakan yang lebih cepat? Kecilkan `dur` gerakan itu saja.
- Render versi cepat tanpa mengubah kode:
  ```bash
  npx remotion render src/index.ts RoomCamTest out/room/room_cam_fast.mp4 --props='{"speed":1.5}'
  ```
- Kecepatan puncak kamera di kamar (dari pemeriksa):

  | speed | durasi | kecepatan puncak | catatan |
  |---|---|---|---|
  | 1x | 27 s | 2.4 m/s | yang ditonton user |
  | 1.5x | 18 s | 3.6 m/s | |
  | 2x | 13.5 s | 4.8 m/s | |

  Semua tanpa tabrakan. Di ruangan kecil, di atas ~3.5 m/s mulai terasa terburu-buru. Cek dulu di video.

## 6. Pemeriksaan wajib sebelum render penuh
Gerakan cepat: tambahkan motion blur, dan ukur tempo serta kedip dengan alat di [blur-tempo-kedip.md](blur-tempo-kedip.md).

1. `node scripts/roomcam_check.mjs [speed]` mengecek setiap frame:
   - Kamera tidak menembus dinding, lantai, plafon, atau perabot. Perabot didaftar sebagai kotak di `SOLIDS` (`layout.ts`) dengan jarak aman 18 cm.
   - Arah `up` tidak sejajar arah pandang.
   - Melaporkan kecepatan puncak.

   Untuk set baru, salin pola ini: tulis denahnya sebagai angka (file tanpa three.js).
2. Still dan contact sheet:
   ```bash
   COMP=<id> node scripts/stills.mjs out/<nama>/s_ 100,400 0.5
   ```
   Lalu jalankan `scripts/tilesheet.mjs`.
3. Setelah render, jalankan `node scripts/flicker_check.mjs <video.mp4>`. Skrip ini mencari kedip satu frame, lonjakan terang, dan frame beku, tanpa Python.
   - Di tes kamar, pemeriksaan ini menemukan layar laptop yang sempat reset.

## 7. Pelajaran dari tes kamar
- Lampu gantung menghalangi shot pertama. Untuk set yang dijelajahi kamera, pakai lampu plafon yang menempel.
- Jalur melengkung (`via`) harus dicek terhadap perabot. Jalur B pertama menembus lemari.
- Dari atas, FOV 66 memotong bantal. Naikkan FOV (74–86) daripada menaikkan kamera, karena plafonnya rendah.
- Semua animasi di set (layar, jam, gorden) harus monoton atau berulang mulus. Kalau ada yang reset, hasilnya kedip.
