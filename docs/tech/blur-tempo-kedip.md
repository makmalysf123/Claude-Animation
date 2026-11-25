# Motion blur, pengukur tempo, dan tes kedip

Tiga alat yang diambil dari skill *inkbeat-shorts* (lisensi MIT, lihat [NOTICE-inkbeat-shorts.md](NOTICE-inkbeat-shorts.md)).
Semuanya ditulis ulang dalam Node dan tidak butuh Python. Ditambahkan pada 2026-11-25.

## 1. Motion blur
**Gunanya:** di video 30 fps, gerakan cepat (kamera atau benda) terlihat patah-patah atau "bergetar". Kamera sungguhan membuat benda yang bergerak sedikit kabur. Itu yang kita tiru di sini.

**Cara kerjanya:**
- Setiap frame dirender 4 kali, pada 4 waktu berbeda dalam jendela setengah frame ("rana 180°").
- Keempat gambar itu lalu dirata-rata. Bagian yang diam tetap tajam, bagian yang bergerak jadi kabur.

**Cara pakai:**
1. Buat komposisi versi blur dengan `withBlur(KomponenFilm, 4)` dari `src/lib/scene.tsx`.
   - Daftarkan dengan `fps={120}` dan jumlah frame ×4. Contohnya `RoomCamTestBlur` di `src/Root.tsx`.
   - Ini bekerja untuk semua film yang memakai `Reel`/`SceneDef`.
2. Render dengan kualitas tinggi tanpa suara:
   ```bash
   PROPS='{"speed":1.5}' CRF=12 MUTED=1 node scripts/render.mjs RoomCamTestBlur tmp/blur/x120.mp4
   ```
3. Rata-ratakan menjadi 30 fps:
   ```bash
   node scripts/motion_blur.mjs tmp/blur/x120.mp4 out/<nama>/final_blur.mp4
   ```

**Biaya:** render 4× lebih lama. Uji dulu potongan pendek, misalnya `760-879` (= 30 frame hasil).

**Catatan:**
- Gerakan yang sangat cepat bisa terlihat seperti 4 bayangan terpisah. Kalau begitu, perpanjang gerakannya. Menambah sampel bukan solusinya.
  - Di tes kamar 1,5x, pan dari lemari ke kasur (98°/detik) jadi bergaris.
  - Solusinya `minDur`: sebuah gerakan tidak boleh lebih pendek dari angka ini, walaupun `speed` dinaikkan (`src/lib/camMoves.ts`).
  - `scripts/roomcam_check.mjs` sekarang mencetak kecepatan putar kamera. Usahakan di bawah ~85°/detik.
- Caption dan teks dipasang SETELAH blur (CapCut atau komposisi caption), supaya tetap tajam.
- Hapus `tmp/blur/*.mp4` setelah selesai, tapi tanya user dulu.

## 2. Pengukur tempo
```bash
node scripts/pacing.mjs video.mp4
```
Hasilnya:
- **Beats per menit:** berapa kali gambar berganti atau bergerak jelas.
- **% diam** dan **% cepat**.
- **Jumlah potongan keras.**
- **Kecerahan rata-rata (L\*).**

Patokan skill itu untuk Shorts kartun 3D yang viral: 52–60 beat/menit, diam 5–20%, cepat ≤ 35%, potongan sekitar 0, L\* ≥ 50.

Video kita sendiri, diukur pada 2026-11-25 (versi final dengan caption, jadi pergantian caption ikut terhitung):

| Video | Beat/menit | Diam | Cepat | Potongan | L\* | Views |
|---|---|---|---|---|---|---|
| Ayam | 14 | 75% | 8% | 11 | 53.6 | 85K |
| Ketindihan v3 | 39 | 30% | 17% | 33 | 25.6 (malam) | 3.7K |
| Kopi v2 | 59 | 3% | 30% | 32 | 41 | 72K |
| Emas | 49 | 13% | 18% | 27 | 54.9 | 29K |
| Pilot Banting | 71 | 3% | 46% | 52 | 43 | baru |
| Kamar tes 1x | 33 | 12% | 45% | 0 | 48.9 | (tes) |
| Kamar tes 1,5x (+blur) | 44 | 8% | 50% | 0 | 48.3 | (tes) |

**Kesimpulan sementara:** Ayam paling tenang tapi paling banyak ditonton. Jadi tempo bukan satu-satunya kunci; judul dan detik pertama tetap paling penting.
- Pakai alat ini untuk **membandingkan versi** ("v2 lebih cepat dari v1?") dan untuk melihat bagian yang terlalu lama diam atau terlalu sibuk.
- Jangan memaksakan angka 56.

## 3. Tes kedip (termasuk tes "tab")
```bash
node scripts/flicker_check.mjs video.mp4
```
- Seperti sebelumnya, alat ini mencari lonjakan satu frame, lonjakan terang, dan frame beku.
- **Baru: tes pola tab.**
  - Remotion merender dengan beberapa tab browser sekaligus. Kalau satu tab menggambar beda (angka acak, keadaan yang dibuat sekali per tab, atau GPU kelebihan beban), kedipnya berulang setiap k frame.
  - Kalau polanya ditemukan, alat ini menulis `TAB PATTERN` dan keluar dengan kode 3.
  - Sudah diuji dengan kedip palsu setiap frame ke-8, dan polanya ketemu.
- **Aturan pencegahan:**
  - Setiap frame harus hanya bergantung pada nomor frame: tidak ada `Math.random`, `Date`, atau `performance.now` di gambar.
  - Pakai hash berbiji sebagai ganti angka acak: `h(n) = fract(sin(n*127.1+311.7)*43758.5453)`.
  - Satu `Math.random` di set Ayam (`src/videos/ayam/world.ts`) sudah diganti.
- Lonjakan saat gerakan kamera cepat itu wajar. Yang dicari adalah lonjakan saat kamera tenang, dan pola berulang.
