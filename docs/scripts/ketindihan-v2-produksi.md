# Satu Malam Ketindihan: naskah produksi v2 (untuk dicek)

Versi ini menggantikan `ketindihan-elevenlabs.md` sebagai pegangan produksi. Kalimat narasinya hampir sama dengan v1; yang baru adalah rencana **shot, kamera, akting, dan efek suara per detik**, mengikuti gaya referensi RicksClips3000.

**Aturan produksi:**
- **Tanpa subtitle.** Teks ditambahkan sendiri di CapCut. Satu-satunya teks di layar adalah teks yang memang bagian dari dunia: papan pamali, jam, kalender, label saklar.
- **Efek suara ikut dirender** dan ditempatkan tepat di frame kejadiannya (selisih 0–2 frame).
- **Musik** pelan, sekitar 10 dB di bawah narasi. Narasi direkam belakangan dengan ElevenLabs. Setelah suara jadi, semua waktu digeser ke waktu kata yang asli.
- **Narasi hampir tanpa jeda**, seperti referensi. Satu-satunya jeda adalah 0,6 detik setelah "menatap" (sting seram).
- **Kamera selalu bergerak pelan**:
  - framing baru kira-kira tiap 1,5–3 detik;
  - perpindahan adegan memakai transisi yang punya alasan (ikut benda, bentuk yang sama, menembus lubang), bukan potong biasa.
- **Akting** memakai mesin yang sudah disetujui di tes v13:
  - kaki diam saat berdiri;
  - badan tegak;
  - kepala squash di penekanan biasa dan pop di penekanan kuat;
  - kepala membesar saat emosi kuat.
- **Durasi**: sekitar 1:33. Kalimat 18 (ajakan komentar) bisa dibuang kalau perlu lebih pendek.

**Pemeran**, semua gaya yang sudah disetujui (kepala putih, garis tebal-tipis):

| Tokoh | Tampilan | Watak |
|---|---|---|
| Pak Udin | peci beludru, kaos krem, sarung kotak merah | korban ketindihan, ekspresif, gampang kaget |
| Bu Narti | rambut sanggul, daster batik kawung | tetangga, curiga, suka gosip, sumber pamali |
| Pak RT | kemeja batik coklat, kacamata | yang memaku papan pamali, serius |
| 2 tetangga | ibu berkerudung tidak dipakai; bapak berkaos hijau, anak kecil | rantai gosip |
| Sosok | siluet hitam tinggi, mata putih bulat, agak lucu | "penunggu"; di akhir menguap lalu pulang |
| Petugas Otak | tokoh mungil bertopi petugas, rompi oranye | mengatur saklar di ruang kontrol otak, ngantuk |

**Set**, semua dengan gaya dunia teras yang sudah disetujui:
1. Kamar Pak Udin, malam (cahaya bulan dari jendela).
2. Teras rumah, pagi (set yang sudah ada).
3. Pos ronda dan jalan kampung, sore.
4. Kampung dari atas, malam.
5. Ruang kontrol otak (di dalam kepala Pak Udin).
6. Tiga vinyet singkat: loteng, ruang tamu, kamar bayi.

Ikon di kolom SFX: **[ada]** = efek sudah ada di `audio/sfx_gen.py`, **[baru]** = perlu dibuat.

---

## Adegan 1: Hook (0:00–0:05.4)
| Waktu | Narasi | Shot / kamera | Akting | SFX |
|---|---|---|---|---|
| 0:00.0–0:05.0 | Kenapa hampir tiap kampung di Indonesia punya cerita horor sendiri? … Jawabannya… satu malam ketindihan. | **Kampung dari atas, malam.** Jendela-jendela menyala satu per satu. Di atas tiap rumah muncul siluet hantu kecil (pop) pada kata "horor". Kamera turun pelan ke satu jendela yang lampunya padam. Pada "ketindihan", kamera **menembus kaca jendela** masuk ke kamar (transisi menembus lubang). | — | Jangkrik + angin malam **[ada]** sebagai latar. Pop kecil tiap hantu muncul (0:02.2–0:02.9) **[baru]**. Woosh lembut saat menembus jendela (0:04.6) **[ada]**. |

## Adegan 2: Malam itu (0:05.4–0:18.4), kamar Pak Udin
| Waktu | Narasi | Shot / kamera | Akting | SFX |
|---|---|---|---|---|
| 0:05.6–0:10.6 | Jam tiga pagi, Pak Udin terbangun. Matanya terbuka… tapi badannya tidak bisa bergerak. | Kamera masuk dari jendela, **mengikuti sinar bulan** turun ke jam dinding (03:00, jarum detik berjalan), lalu menyapu ke ranjang. Pada "terbuka": close-up wajah dari atas. Pada "tidak bisa bergerak": insert tangan di atas selimut. | Udin tidur (mata tertutup). Pada "terbuka" mata langsung membuka **1 frame**, lalu kelopak setengah turun dan mata **melirik kiri-kanan**. Jari mencoba bergerak dan gemetar, tapi tidak terangkat. | Detak jam **[baru]** tiap detik mulai 0:05.6. Mata membuka: "klik" kecil (0:08.0) **[baru]**. Detak jantung pelan mulai 0:09.5 **[baru]**. |
| 0:11.2–0:17.0 | Dadanya berat, seperti ada yang duduk di atasnya. Lalu dari pojok kamar… ada yang menatap. | Close-up wajah dan dada dari atas. Selimut melesak di dada pada "berat". Pada "pojok": **sudut pandang Udin**, mata melirik ke pojok, kamera ikut berputar ke pojok gelap. Sosok **muncul dari bayangan dinding**. Pada "menatap" dua mata putih menyala **dalam 1 frame**. | Wajah Udin menegang, gigi rapat, berkeringat, kepala gemetar 2 frame sekali. | Selimut tertekan "wuff" (0:11.8) **[baru]**. Detak jantung makin cepat **[baru]**. Mata menyala: sting tinggi (0:16.6) **[baru]**. |
| 0:17.0–0:18.4 | *(jeda 0,6 dtk)* | Tahan pada mata yang menatap. Lalu **mata sosok berkedip**, dan kelopak yang menutup menjadi hitam penuh: transisi ke adegan berikutnya (bentuk yang sama). | Sosok memiringkan kepala pelan. | Sting rendah memudar, lalu sunyi 0,3 detik. |

## Adegan 3: Gosip (0:18.4–0:32), teras pagi, lalu pos ronda
| Waktu | Narasi | Shot / kamera | Akting | SFX |
|---|---|---|---|---|
| 0:18.4–0:23.0 | Paginya, Pak Udin cerita ke tetangga. Sorenya… satu kampung yakin: ada penunggu. | Dari hitam, mata terbuka lagi, tapi kali ini **mata Pak Udin di pagi hari** (bentuk yang sama). Kamera mundur memperlihatkan **teras** (set tes v13): Udin bercerita ke Bu Narti dengan tangan terbuka. Pada "Sorenya": **pan cepat** ke jalan kampung sore, warga bergerombol. Pada "penunggu": semua kepala menoleh bersamaan ke pohon besar di belakang rumah. | Udin: suasana cerita, tangan terbuka, pop di "tetangga". Bu Narti: dari curiga ke kaget. Warga menoleh dalam **2 frame**. | Ayam berkokok dan kicau burung (0:18.6) **[ada]**. Woosh pan (0:21.2) **[ada]**. Gumam warga **[ada: babble]**. Semua menoleh: "swish" (0:22.6) **[baru]**. |
| 0:23.6–0:28.4 | Dari mulut ke mulut, sosoknya makin tinggi… matanya makin merah. | **Kamera mengikuti balon kata** berpindah dari mulut ke mulut (Narti → ibu → bapak → anak). Gambar sosok di dalam balon **memanjang** tiap pindah. Pada "merah" matanya menjadi merah. | Tiap tokoh: berbisik, membesarkan mata, kepala pop saat menyerahkan gosip. Anak terakhir ketakutan. | Bisik-bisik bergantian **[baru]**. Balon pindah: "pop" bernada naik tiap kali **[baru]**. Mata merah: "dung" rendah (0:28.0) **[baru]**. |
| 0:29.0–0:32.0 | Lahirlah pamali baru: jangan tidur telentang. | **Pos ronda.** Pak RT memaku papan bertulisan "JANGAN TIDUR TELENTANG". Kamera mendorong pelan ke papan. Insert cepat: gunting diselipkan di bawah bantal. | Pak RT serius, memukul paku 3 kali dengan antisipasi tiap ayunan. | Palu 3 kali tepat di setiap pukulan (0:29.6, 0:30.2, 0:30.8) **[ada: hammer_hit]**. Gunting "kres" (0:31.6) **[baru]**. |

## Adegan 4: Pisau cukur Occam (0:32–1:01)
| Waktu | Narasi | Shot / kamera | Akting | SFX |
|---|---|---|---|---|
| 0:32.4–0:36.8 | Sekarang, pakai pisau cukur Occam: pilih penjelasan yang asumsinya paling sedikit. | Kamera menyapu ke samping papan pamali: **pisau cukur raksasa jatuh** dan menancap di tanah di depan pos ronda. Debu mengepul. Di sebelahnya muncul **dua meja**: A (kiri) dan B (kanan). | Pak Udin dan Bu Narti melompat kaget ke belakang (pop), lalu mendekat dengan penasaran. | Pisau jatuh: woosh lalu "BUM" logam, debu (0:34.0) **[baru]**. |
| 0:37.4–0:42.0 | A: ada makhluk… dia memilih Pak Udin… datang malam itu… lalu duduk di dadanya. | Close-up meja A. Bu Narti menumpuk **4 kartu asumsi** satu per satu (bergambar: makhluk, Udin dicentang, bulan, dada). Tumpukan makin tinggi dan bergoyang. Kamera naik mengikuti tumpukan. | Narti: semangat dan bangga, mengangguk tiap menaruh kartu. | Kartu ditaruh "tok" tepat tiap kartu (0:38.0, 0:39.0, 0:40.2, 0:41.6) **[baru]**. Tumpukan berderit **[ada: creak]**. |
| 0:42.6–0:45.8 | B: otaknya bangun duluan… ototnya belum. | **Pan cepat** ke meja B: Pak Udin menaruh **1 kartu** (gambar kepala bersaklar). Pada 0:46.0 pisau cukur **menyabet tumpukan A**, dan kartu-kartu beterbangan berputar. | Udin: datar dan santai. Narti: kaget, kartunya beterbangan di sekitar kepalanya. | Woosh pan (0:42.6) **[ada]**. "SHING" sabetan (0:46.0) **[baru]**. Kartu-kartu kertas berjatuhan **[baru]**. |
| 0:46.6–0:51.2 | Saat mimpi, otot kita dikunci. Kalau kesadaran nyala duluan, mimpinya bocor ke kamar. | **Kartu B terbang ke kamera dan memenuhi layar**, lalu kamera menembus gambar kepala di kartu itu: masuk ke **ruang kontrol otak** (transisi menembus gambar). Dua tuas besar: **SADAR** dan **OTOT**. Petugas Otak menguap dan menarik tuas SADAR ke "ON". Tuas OTOT masih digembok. Sebuah proyektor tua masih menyorot. Pada "bocor": sorotnya menembus dinding otak dan membentuk siluet sosok. | Petugas: mengantuk, mata setengah tertutup, tarikan tuas dengan antisipasi. | Masuk ke otak: woosh (0:46.6) **[ada]**. Tuas "KLAK" berat (0:49.2) **[baru]**. Gembok bergetar "krek" **[baru]**. Proyektor berdengung dan klik-klik film **[baru]**. |
| 0:51.8–0:56.4 | Namanya sleep paralysis. Delapan dari seratus orang pernah mengalaminya, dan tidak berbahaya. | Kamera mundur dari proyektor: **papan skor di ruang kontrol** menyala dengan 100 ikon orang; 8 di antaranya menyala satu per satu. Pada "tidak berbahaya": Petugas memberi jempol, dan lampu hijau di panel menyala. | Petugas: ramah dan menenangkan. | Lampu ikon menyala "ting" berurutan (0:53.4–0:54.2) **[baru]**. Lampu hijau "bip" lembut (0:56.0) **[baru]**. |
| 0:57.0–1:00.6 | Pamali telentang? Ternyata ada benarnya… tapi bukan karena penunggu. | **Kembali ke papan pamali di pos ronda** (dipotong cocok dari papan skor ke papan pamali). Pak RT menempel kertas kecil di bawahnya: "karena otak". Kata "penunggu" dicoret spidol. | Pak RT: terkejut lalu mengangguk paham. Bu Narti cemberut. | Kertas ditempel (0:58.6) **[baru]**. Coretan spidol (0:60.2) **[baru]**. |

## Adegan 5: Otak salah potong (1:01–1:07)
| Waktu | Narasi | Shot / kamera | Akting | SFX |
|---|---|---|---|---|
| 1:01.2–1:06.6 | Lalu kenapa kita pilih A? Karena yang paling cepat muncul di kepala… terasa paling sederhana. | Kembali ke **ruang kontrol otak**. Dua mesin pemanggang roti: kartu A **meloncat keluar seketika**, sedangkan kartu B masih "loading" (asap tipis). Petugas menyambar kartu A. Kamera mendorong ke wajah Petugas yang puas. | Petugas: antisipasi lalu menyambar, ekspresi puas (smug). | Pemanggang "TING!" (1:02.4) **[baru]**. Loading berdengung pelan **[baru]**. Sambar: woosh kecil **[ada]**. |

## Adegan 6: Pelajaran melebar (1:07–1:19)
| Waktu | Narasi | Shot / kamera | Akting | SFX |
|---|---|---|---|---|
| 1:07.2–1:13.2 | Suara di plafon? Tikus. Lampu kedip? Kabel longgar. Bayi nangis tengah malam? Lapar. | Tiga vinyet cepat, masing-masing sekitar 2 detik, disambung **whip pan**: (1) loteng: siluet hantu di plafon ternyata **tikus** membawa kerupuk; (2) ruang tamu: lampu kedip, kamera mengikuti kabel ke **colokan longgar**; (3) kamar bayi: bayangan seram ternyata **ibu membawa botol susu**. | Tiap vinyet ada satu tokoh yang ketakutan, lalu lega (pop dari takut ke datar). | Langkah di plafon **[baru]** lalu cicit tikus **[baru]**. Lampu berdengung dan berkedip **[baru]**, lalu colokan "klik". Tangis bayi **[baru]** lalu bayi mengisap dot. Whip pan woosh di tiap pergantian **[ada]**. |
| 1:13.8–1:19.2 | Tiap jawaban yang tidak dicek jadi cerita horor baru… dan masalah aslinya tidak pernah diperbaiki. | **Kembali ke kampung dari atas** (sama seperti 0:00): hantu-hantu kecil di atas rumah bertambah. Kamera turun sedikit: di bawah tiap hantu, masalah aslinya masih ada (tikus, kabel, bayi lapar). | — | Pop hantu bertambah **[baru]**. Jangkrik **[ada]**. Musik turun. |

## Adegan 7: Ujung (1:19–1:34), kamar Pak Udin, jam 9 malam
| Waktu | Narasi | Shot / kamera | Akting | SFX |
|---|---|---|---|---|
| 1:19.8–1:25.6 | Malam ini, Pak Udin tidur jam sembilan. Sosok di pojok menunggu… menguap… lalu pulang. | Kamera turun ke jendela yang sama seperti di awal, masuk ke kamar. Jam menunjukkan 21:00. Udin tidur **miring**, damai. Pada "menunggu": pojok kamar, sosok mengetuk-ngetuk jari tak sabar. Pada "menguap": sosok menguap lebar (kepala memanjang). Pada "pulang": ia mengambil tas kecil dan berjalan keluar pintu dengan bahu turun. | Udin: tidur damai, sesekali bergumam. Sosok: bosan, lalu menguap dengan squash dan stretch besar, lalu melangkah lesu. | Jam berdetak pelan **[baru]**. Jari mengetuk **[baru]**. Menguap panjang **[baru]**. Langkah pelan **[ada: stroll_step]**. Pintu berderit **[ada: creak]**. |
| 1:26.2–1:29.2 | Ternyata yang paling dia takuti… jadwal tidur. | Dari luar, sosok **menempel kertas "JADWAL TIDUR"** di pintu sambil bergidik, lalu kabur. Kamera mundur ke luar jendela. | Sosok: jijik dan merinding (gemetar 2 frame), lalu lari. | Kertas ditempel **[baru]**. Langkah lari cepat menjauh **[ada: boot]**. |
| 1:30.0–1:33.0 | Cerita horor di kampungmu apa? Tulis di komentar. | Kamera terus mundur ke **kampung dari atas**: satu hantu kecil di atas rumah Udin "pop" menghilang. Tahan pada kampung yang tenang. | — | Pop hilang (1:30.6) **[baru]**. Jangkrik dan musik keluar sampai 1:34.5. |

---

## Ringkasan efek suara

**Sudah ada di `audio/sfx_gen.py`:** jangkrik, angin, burung, woosh, creak, babble warga, palu, langkah (stroll dan boot).

**Perlu dibuat baru (sintesis seperti efek yang lain):**
- suasana: detak jam, detak jantung, sting tinggi dan sting rendah;
- pop dan bisikan: pop kecil, pop bernada naik, swish menoleh, bisik-bisik;
- benda: gunting, pisau cukur jatuh "BUM", "SHING", kartu "tok", kertas berjatuhan;
- ruang kontrol: tuas "KLAK", gembok, proyektor, ting ikon, bip, pemanggang "TING", loading;
- kertas dan spidol: kertas ditempel, spidol;
- vinyet: langkah di plafon, cicit tikus, lampu berdengung, tangis bayi;
- sosok: jari mengetuk, menguap.

## Yang perlu kamu putuskan saat mengecek
1. **Narasi**: kalimatnya masih sama dengan v1. Ada yang mau diubah?
2. **Tokoh baru**: Pak RT, 2 tetangga, anak kecil, dan Petugas Otak. Oke, atau ada tokoh yang mau diganti?
3. **Ruang kontrol otak**: tuas dan proyektor tua. Gaya ini cocok, atau mau yang lain?
4. **Pisau cukur raksasa yang menancap di depan pos ronda**: terlalu absurd, atau justru pas?
5. **Kalimat 18** (ajakan komentar): dipakai atau dibuang?
