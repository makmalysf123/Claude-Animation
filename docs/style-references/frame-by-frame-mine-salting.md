# Studi frame by frame: "How Mine Salting Worked" (YouTube Shorts TRUkQ1wbV2E)

Studi pribadi, 2026-11-14. Video referensi untuk standar video kita berikutnya. Kita meniru **tekniknya**, bukan tokoh atau dunianya.

## Cara studi (supaya bisa diulang)
- **File:** `references/mine-salting.mov`. 1080x1920, 30 fps, 61,13 detik, **1.834 frame**, suara AAC stereo 44,1 kHz.
- **Semua frame diekstrak**: `out/refstudy/mine-salting/full/` (penuh) dan `small/` (270x480).
- **Semua 1.834 frame dibaca berurutan** dalam 46 lembar kontak berisi 40 frame (`sheets/ov_XXXX.jpg`).
- **Momen akting dibaca per frame pada potongan close-up** resolusi penuh (`sheets/cu_*.jpg`):
  - mulut dan mata Buddy (f200-247);
  - topi terbentur (f646-677);
  - tertawa (f1088-1119);
  - ayunan beliung (f778-809);
  - lari (f1344-1359);
  - kedip dan tembakan (f48-63).
- **Gerak diukur per frame** (`motion.csv`, `motion.png`): rata-rata perubahan piksel tiap frame terhadap frame sebelumnya, total dan per 9 area layar.
- **Suara diukur tiap 0,01 detik** (`audio.csv`):
  - keras-pelan total dan 5 pita frekuensi (sub <120 Hz, low, mid, himid, air >6 kHz);
  - 428 titik hentakan (`onsets.csv`);
  - spektrogram per 10 detik (`spec_*.png`).
- **Alat:** `scripts/refstudy.py` (ukur gerak dan suara), `scripts/refsheets.mjs` + komposisi `ContactSheet` (lembar kontak dan crop).
- **Batas yang jujur:**
  - Satuan terkecil video adalah 1 frame = 0,033 detik. Tidak ada informasi di antara dua frame.
  - Claude tidak bisa mendengar. Jenis bunyi ditebak dari bentuk spektrogram dan waktunya terhadap gambar, bukan didengar.

---

## A. Angka-angka kunci (terukur)
1. **Bergerak di setiap frame ("on ones").** Hanya 18 dari 1.834 frame (1%) yang identik dengan frame sebelumnya: f176, 181, 233-234, 318, 398, 541-544, 1000-1001, 1477-1478, 1673, 1825-1827, 1833.
   - Tidak pernah ada gambar yang benar-benar diam.
   - Inilah sumber utama kesan "smooth".
2. **Rata-rata perubahan per frame 8,5** (skala 0-255). Shot paling tenang (f238-275) pun masih 2,0, karena selalu ada drift kamera, debu melayang, lentera berayun, atau napas tokoh.
3. **Sekitar 21 shot dalam 61 detik**, rata-rata 2,9 detik per shot. Tapi hampir tiap shot berisi 2-4 framing berbeda lewat gerak kamera yang menyambung. Yang terasa adalah "framing baru tiap ~1,5 detik", walau potongannya lebih jarang.
4. **Narasi tanpa jeda sama sekali.** Tidak ada celah sunyi di bawah -40 dB sepanjang video.
   - Keras rata-rata -17,9 dBFS (p10 -28, p90 -13,4, puncak -8,5).
   - Artinya suara dikompres kuat, rapat, dan stabil (kira-kira target -14 LUFS).
5. **Subtitle per kata:** 1-3 kata, berganti tepat di kata yang diucapkan, sekitar 2,5 kata per detik.

## B. Peta cerita per frame (apa yang terjadi + teknik kamera)
6. **f0-17 (0,00-0,57 s):**
   - Sheriff berdiri di rel, di bawah **sorot cahaya kerucut volumetrik** dari atas, dengan bintik debu melayang di dalam sorotnya.
   - Kamera hampir diam, hanya drift halus.
7. **f16-29: push-in cepat** ke wajah, lalu kamera **terus turun** ke sungsang senapan tanpa potong.
   - Wajah melewati tepi frame, lalu senapan 3D realistis mengisi layar.
8. **f29-43: insert tanpa potong.** Bongkah emas dimasukkan ke laras; logam emasnya mengkilap dengan kilau bintang.
9. **f44-49:** kamera meluncur menyusuri laras ("follow the object").
10. **f50-53: kamera mundur** sambil Sheriff **mengedip** (satu mata menjadi lengkung, senyum miring).
11. **f54-57:** laras diputar menghadap kamera (foreshortening 3D); ekspresinya berubah jadi serius.
12. **f58-59:** kilatan moncong senapan putih-kuning memenuhi frame. Inilah **potongan yang disamarkan kilat**.
13. **f60-93:** kamera **mengejar peluru emas** dari belakang.
    - Peluru punya ekor cahaya oranye, dan **cincin gelombang kejut** (distorsi melingkar) muncul berulang.
    - Buddy duduk di kiri frame.
14. **f93-99: tumbukan di dinding.** Ledakan percikan emas, serpihan batu terlempar, lalu awan debu.
    - Kawah kecil dan retakan tertinggal.
    - Debu masih melayang lebih dari 1 detik (sampai f113).
15. **f114-135:** kamera **pan ke kiri tanpa potong** ke Buddy yang duduk sambil makan roti dan minum dari mug.
    - Shot ini menyambung dari f60 sampai f275, jadi lebih dari 7 detik tanpa potong.
16. **f190-236:** kamera mendorong ke tengah, lalu Buddy bicara ("So we're shooting gold into a gold mine?").
17. **f236-241: tembakan kedua menghantam dinding di samping Buddy.**
    - **Retakan emas bercahaya bercabang** (seperti petir) dengan bintang-bintang kilau.
    - Mata Buddy berubah jadi lingkaran putih besar.
    - Retakannya tetap ada di shot-shot berikutnya (kontinuitas).
18. **f249-275:** Buddy bicara, lalu menyeruput mug. Mug menutupi mulutnya (properti di depan wajah).
19. **f276-320:** wide shot Sheriff di rel, dolly-in pelan.
    - Lentera gantung berayun seperti bandul.
    - Butiran emas menetes dari tangannya.
    - Ia mengedip lagi (f313-316).
20. **f321-371: eksterior siang.**
    - Kamera rendah di balik kerikil realistis di latar depan.
    - Sheriff mendorong lori merah "NELLIE" keluar dari tebing batu pasir.
    - Kamera menyamping (truck) ke kanan. Uap mengepul dari kejauhan.
21. **f356-371:** lori terguling, isinya tumpah, debu muncul.
22. **f372-410:** kamera terus ke kanan. Sheriff memegang bongkah batu, merengut, lalu **melempar batunya ke belakang bahu** (busur lemparan).
23. **f408-419:** Buddy masuk dari kanan sambil membawa koran yang **berkibar seperti kain** sebelum direntangkan: "MILLIONAIRE DUE TO-MORROW".
24. **f420-482:** push-in ke keduanya. Ekspresi berganti cepat: mata melotot, lalu seringai gigi lebar (f460-474), lalu kaget (f475-482).
25. **f483-517:** interior kantor penaksir emas (lantai kayu, meja hijau, timbangan kuningan, papan harga kapur "$20.67").
    - Sheriff masuk dengan alis marah dan menyerahkan uang.
26. **f518-540:** kamera **orbit dan turun** melewati tokoh-tokoh ke atas meja: uang 100 dolar dan piring debu emas yang berkilau (spekular, kilau bintang).
27. **f565-572: transisi lingkaran-ke-lingkaran.**
    - Piring emas yang bulat berubah jadi **gelembung/lensa transparan** berisi adegan berikutnya (mobil), lalu membesar mengisi layar.
28. **f572-643: eksterior lembah.**
    - Hutan pinus, uap geiser, tebing.
    - Mobil antik putih datang ke arah kamera, dengan debu dari roda dan jari-jari roda emas yang berputar.
    - Kamera mengikuti mobil saat lewat dekat (f620-639). Orang kaya bertopi tinggi melambai.
29. **f644-675:** di pintu tambang "SURE THING MINE / EST. 1899" (bendera bunting merah-putih-biru), orang kaya **membenturkan topi tingginya ke balok**.
    - Topinya **remuk jadi akordeon** dan miring.
    - Kepala miring 30°, mata ><, lidah menjulur (pusing).
30. **f676-677: topi "pop" kembali ke bentuk tinggi dalam 1-2 frame.**
31. **f680-735:** kamera mundur dan tokoh-tokoh lain berjalan masuk: Si Ahli (topi bowler, kacamata, jas ungu) dan Buddy.
32. **f736-776:** di dalam tambang, Si Ahli berdiri di depan dinding; wajan emas biru jadi latar depan.
    - Kamera bergoyang halus seperti dipegang tangan.
    - Matanya menyipit curiga.
33. **f777-809: ayunan beliung.**
    - Beliung muncul di tangan dan diangkat pelan (f780-791). Wajahnya menyeringai gila: satu mata ><, gigi terlihat.
    - **Pukulan dalam 1 frame (f792).**
    - Percikan dan serpihan (f793-799), lalu ekspresi langsung kembali tenang dan puas.
34. **f800-823:** bongkah jatuh ke wajan di latar depan. Kamera push ke close-up wajah puasnya.
35. **f824-865:** Si Ahli mendulang di atas ember kayu berisi air realistis. Air berpendar di wajan.
36. **f866-929: top-down ke wajan.**
    - Air berputar dengan pasir hitam dan serpih emas (simulasi partikel).
    - Kamera turun masuk ke wajan dan riak melingkar terlihat.
    - Ujung pisau masuk dari kiri (f914).
37. **f930-961: Si Ahli memegang kaca pembesar.**
    - Kamera melintas di belakang kepalanya (f944-949, kepala menyapu layar).
    - **Bingkai lensa membesar sampai melewati kamera** (f950-961). Ini transisi lewat lensa.
38. **f960-1003:** dari balik lensa, insert pisau dengan serpih emas yang **pipih**. Kamera meluncur di lorong gelap dengan depth of field.
39. **f1003-1009: dissolve** ke tekstur kerikil makro.
40. **f1017-1036:** ilustrasi: peluru emas menghantam (kilat bintang), lalu emasnya **gepeng** seperti panekuk.
41. **f1037-1042: dissolve** dengan wajah Si Ahli muncul samar, lalu Si Ahli bicara dengan alis marah dan tangan mengibas (f1053-1056).
42. **f1070-1119:** orang kaya di lorong berdinding papan **tertawa terbahak**.
    - Badan condong maju-mundur, kepala miring kiri-kanan bergantian, satu lutut terangkat.
    - Mata ^^, mulut terbuka lebar.
    - Si Ahli di latar belakang bereaksi.
43. **f1120-1209:** orang kaya bicara. Badannya bergoyang halus, tangan menunjuk, dan ia tertawa kecil di tengah kalimat.
44. **f1205-1220: kamera menyamping ke kanan melewati orang kaya** untuk memperlihatkan Buddy dan Sheriff (reveal lewat pan, tanpa potong).
45. **f1220-1294:** Buddy dan Sheriff **meringis gugup dengan gigi rapat** dan mengangguk-angguk. Mata Buddy melirik.
46. **f1295-1346:** orang kaya membayar. Koper penuh gepokan uang; Sheriff menumpuk uang **di atas topinya**.
47. **f1344-1359:** koper ditutup dan keduanya kabur.
    - Badan condong ke depan, kaki seperti mi berputar.
    - Uang berjatuhan, dan **topi Sheriff tertinggal melayang di udara** sebelum jatuh (fisika kartun).
48. **f1360-1386:** di luar tambang keduanya lari sambil tertawa. Uang beterbangan. Kamera ikut lari dengan mereka (tracking).
49. **f1387-1440:** orang kaya sendirian, uang berserakan di lantai.
    - Ia **membuka jasnya dan ternyata isinya deretan dinamit**, lalu menarik satu batang.
50. **f1480-1535:** dinamit dicium seperti cerutu (kepala mendekat dan membesar), lalu diselipkan di saku dada.
51. **f1536-1554: insert.** Korek digores di tiang kayu: api menyala, sumbu disulut, percikan memancar dengan garis-garis cahaya.
52. **f1555-1569:** kamera mundur memperlihatkan orang kaya dengan mata manik. Ia **berbalik (gambar tampak belakang)** lalu melempar dinamitnya.
53. **f1570-1612:** kamera **mengikuti dinamit** terbang menyusuri lorong. Dinamit memantul di lori "NELLIE", lalu jatuh di lantai dekat bongkah emas dengan sumbu yang memercik.
54. **f1613-1641:** close-up orang kaya, gelap dengan cahaya dari belakang.
    - Ia mengedip, lalu mata membelalak dengan gigi rapat.
    - Kamera **menghentak masuk** ke wajah, lalu potong ke lorong kosong (ia sudah kabur).
55. **f1642-1669: eksterior jauh.**
    - Orang kaya lari keluar, **bola api oranye menyembur dari pintu**, papan nama terlempar miring.
    - Ia jatuh tengkurap. Seluruh tubuh dan topinya **jadi abu-abu kena jelaga**.
56. **f1663-1672: awan debu bergulung dan menutup kamera.** Ini **transisi wipe dengan debu**.
57. **f1672-1739:** debu menipis memperlihatkan **urat emas tebal** di dinding.
    - Orang kaya (masih abu-abu jelaga) masuk dan terkejut, lalu menyeringai.
58. **f1740-1799:** push ke wajah dan urat emas, lalu kamera menurun.
59. **f1800-1831: kamera mundur.**
    - Terlihat meteran kuning di lantai dari urat sampai ke topi dan beliung milik Sheriff.
    - Ada **coretan kapur 2D "10 FT↑"** di lantai (perspektif dunia).
    - Punchline-nya: penambang pertama menyerah 10 kaki sebelum emas.
60. **f1832-1833:** 2 frame hitam di akhir.

## C. Kamera
61. **Kamera tidak pernah benar-benar diam.** Shot yang "tenang" pun punya drift atau dolly pelan (memang terukur: tidak ada frame identik di shot tenang).
62. **Satu shot = beberapa framing.** Contoh f0-59: wide → close-up wajah → insert sungsang → menyusuri laras → medium. Semuanya satu gerakan.
63. **"Follow the object" adalah pola utama**: peluru (f60-93), dinamit (f1570-1600), mobil (f600-639), wajan (f866-929).
64. **Transisi selalu bermotivasi**:
    - kilat tembakan (f59);
    - lingkaran piring berubah jadi gelembung (f565-572);
    - lensa kaca pembesar (f950-961);
    - dissolve tekstur (f1003-1009, f1037-1042);
    - awan debu menutup kamera (f1663-1672).
65. **Reveal dengan pan menyamping**: f114-125 (ke Buddy), f1205-1220 (ke Buddy dan Sheriff), f690-735 (kamera mundur, tokoh masuk).
66. **Push-in di punchline atau momen penting:**
    - f16-29;
    - f420-480;
    - **hentakan** ke wajah f1630-1639 (cepat, beberapa frame);
    - f1740-1760.
67. **Kamera rendah di eksterior** dengan latar depan yang tajam dan nyata (kerikil f321-371, rel f644-735). Ini memberi kedalaman 3D.
68. **Depth of field**: latar belakang sedikit kabur di close-up (f22, f216, f960-1003); latar depan kabur di f800-823.
69. **Sedikit getar tangan (handheld)** di shot Si Ahli (f736-776). Sangat halus, tidak menyakitkan mata.
70. **Kamera juga punya akselerasi**: gerak mulai pelan, cepat di tengah, lalu pelan lagi (ease). Tidak ada gerak dengan kecepatan konstan yang kaku.

## D. Struktur tokoh (bentuk badan dan kepala)
71. **Kepala:** lingkaran besar hampir bulat (sedikit telur), sekitar 40-45% tinggi tokoh di close-up. Warnanya putih gading.
    - Ada **bayangan bentuk lembut abu hangat** di sisi bawah/samping, tidak flat.
72. **Garis luar (outline):** tebal, coklat-ungu sangat gelap (bukan hitam murni), ketebalannya seragam seperti vektor.
    - Di 1080p kira-kira 14-18 px saat kepala selebar ~700 px (sekitar 2,3% lebar kepala). Ujungnya bulat.
73. **Wajah tanpa hidung dan tanpa telinga.** Kecuali Si Ahli yang punya telinga bulat abu kecil di sisi kepala.
    - Mata dan mulut diletakkan **rendah** di kepala, sehingga dahi besar.
74. **Badan:** bentuk kacang atau kapsul tanpa leher (kepala menempel di badan).
75. **Isi badan bertekstur nyata**, tidak flat:
    - kotak-kotak kain flanel dengan serat;
    - rajutan beanie berusuk;
    - kain jas bergradasi;
    - plus detail: kancing, suspender dengan jahitan putus-putus, kancing kuningan, kerah, saku, bunga mawar merah di jas.
76. **Lengan:** satu garis gelap tebal (sama tebal dengan outline), lentur seperti mi, ujungnya **bola kecil gelap** sebagai tangan (tanpa jari).
77. **Kaki:** dua garis gelap panjang, tanpa telapak (ujung meruncing atau tumpul). Saat jalan dan lari, kaki melengkung seperti mi.
78. **Proporsi beda per tokoh:**
    - orang kaya sangat jangkung dengan kaki dan badan panjang;
    - Si Ahli pendek;
    - Buddy gemuk bulat;
    - Sheriff sedang.
    Siluet tiap tokoh langsung bisa dibedakan.
79. **Bentuk kepala dan badan berubah-ubah (squash & stretch)**:
    - kepala membesar dan melebar saat kaget (f237-241);
    - badan melengkung saat tertawa (f1090-1110);
    - kepala mendekat dan membesar saat mencium dinamit (f1484-1500).
80. **Gambar tampak belakang ada** (f1560-1569: belakang kepala, punggung jas). Tokoh bukan kartu satu sisi; gambarnya berganti sesuai sudut kamera.
81. **Rambut** sebagai bentuk hitam bergerigi di bawah topi (Buddy f216). Ikut bergeser saat kepala menoleh.
82. **Kacamata Si Ahli**: dua lingkaran bergaris tebal dengan lensa abu transparan. Pupilnya terlihat di dalamnya.

## E. Ekspresi, mata, dan mulut (kenapa terasa halus)
83. **Mulut berganti tiap 1-3 frame saat bicara** (Buddy f200-235). Ini lip-sync per suku kata, bukan buka-tutup sederhana.
84. **Kamus bentuk mulut** yang terlihat:
    - garis datar ("dash");
    - O kecil gelap;
    - O besar dengan isi merah/pink dan lidah;
    - seringai gigi (persegi putih dengan garis gigi vertikal);
    - senyum miring;
    - terbuka dengan gigi atas dan lidah pink;
    - lidah menjulur (pusing);
    - meringis gigi rapat (gugup).
85. **Mata** adalah oval hitam vertikal. Variasinya:
    - **setengah kelopak** (garis datar memotong bagian atas mata, kesan malas/curiga);
    - **tertutup penuh** (garis datar, f210-215);
    - **^^ lengkung** (bahagia/tertawa);
    - **satu lengkung** (kedip);
    - **>< kiri-kanan** (pusing/berusaha);
    - **lingkaran putih besar dengan pupil kecil** (kaget).
86. **Alis** berupa batang pendek tebal, sering **asimetris** (satu lebih tinggi), dan bergerak sendiri lepas dari mata.
87. **Pupil melirik** (kiri-kanan) di tengah ekspresi yang sama; posisi pupil berubah tanpa mengubah bentuk mata (f1243-1294).
88. **Kedip** dipakai sebagai punchline (Sheriff f50-53, f313-316; orang kaya f1625-1628).
89. **Ekspresi besar terjadi dalam 1 frame** (pop): kaget f236→237, topi pop f675→676. Ekspresi kecil (alis, kelopak) berubah bertahap.
90. **Kepala ikut "berakting"**: miring 5-30°, mengangguk (f1228-1294), bergoyang saat tertawa. Wajah tidak pernah diam lebih dari ~0,3 detik.
91. **Ekspresi bereaksi di latar belakang**: Si Ahli bereaksi saat orang kaya tertawa (f1100-1110). Tokoh yang tidak bicara tetap hidup.
92. **Napas atau goyang badan halus** di semua tokoh yang diam (orang kaya f1120-1209).

## F. Topi (hat movement)
93. **Topi ikut miring dan bergeser bersama kepala** di setiap frame, menempel pas tanpa celah.
94. **Topi bisa remuk** (akordeon, f652-675), **pop kembali** (f675-677), **tertinggal di udara** saat tokoh kabur (f1357-1359), dan **jadi tempat menumpuk uang** (f1300-1386).
95. **Topi digambar 2D dengan tekstur dan highlight**:
    - pita gelap;
    - garis kilau di pinggiran;
    - lencana lampu kuningan;
    - usuk rajutan pada beanie;
    - kilau satin pada topi tinggi.
96. **Topi punya bayangan di kepala** (pinggiran topi menggelapkan dahi sedikit).

## G. Tangan, kaki, dan aksi
97. **Antisipasi, aksi, follow-through**:
    - beliung diangkat ~12 frame (f780-791), dipukulkan dalam 1 frame (f792), lalu reaksi (f793-799);
    - lempar batu: ayun ke belakang, lalu lempar;
    - lempar dinamit: berbalik, lalu lempar.
98. **Tangan benar-benar memegang benda 3D**: senapan, mug, roti, beliung, koran, uang, korek, dinamit, kaca pembesar.
    - Bola tangan menutupi gagang. Benda menutupi badan (gagang senapan di depan badan, f22).
99. **Lari**: badan condong ke depan, kaki berputar lebar dan kabur. Ada **jejak gerak (smear)** di frame cepat (f1347-1358).
100. **Jalan**: kaki mi berayun, badan sedikit naik-turun. Tokoh masuk frame dari samping sambil berjalan (f408-419, f690-735).
101. **Gestur bicara**: tangan menunjuk, mengibas, memegang dada (f1053-1056, f1120-1209).
102. **Tertawa terbahak** (f1088-1119): lutut naik, badan condong, tangan di perut, kepala miring bergantian.

## H. Warna dan material (kenapa objek terlihat realistis)
103. **Dunia 3D stilistik-realistis** (kemungkinan dirender di mesin game seperti Unreal atau Blender):
    - batu dipahat halus dengan mikro-tekstur dan **bintik kilau** (mika/emas);
    - kayu dengan serat;
    - logam dengan pantulan.
104. **Properti realistis (PBR)**:
    - senapan (laras logam biru-hitam, kayu walnut);
    - teko enamel biru dengan kompor berlubang;
    - cangkir kaleng, toples merica-garam;
    - peti kayu bertulisan stensil ("CANDLES 40 LBS", "TIMBERLINE POWDER CO. 40%");
    - uang kertas berukir "100";
    - koper kulit, ember kayu dengan simpai logam, wajan logam;
    - dinamit berlabel;
    - mobil antik dengan krom dan jok kulit merah.
105. **Tokoh tetap 2D dengan warna murni** (putih, toska, merah) dan tidak diwarnai ulang oleh cahaya hangat. Ini membuat mereka "pop" di atas latar yang kaya.
106. **Palet**:
    - interior tambang oranye-amber hangat;
    - eksterior biru langit dan batu pasir;
    - aksen merah (lori NELLIE, jok mobil, jas dinamit);
    - emas sebagai warna "pahlawan" yang selalu paling terang dan berkilau.
107. **Emas selalu bercahaya**: spekular, kilau bintang, kadang bloom (bongkah f29-43, piring f536-565, urat f1690-1800).
108. **Air**: refraksi, riak melingkar, pendar cahaya (f824-929).
109. **Kertas koran**: tekstur kertas, lipatan, cetakan sepia dengan potret si orang kaya (kontinuitas cerita!).
110. **Teks di dunia** dipakai sebagai alat cerita: papan nama tambang, koran, papan harga, label peti, label dinamit, coretan kapur "10 FT".

## I. Cahaya dan bayangan
111. **Sorot volumetrik (god-ray)** dari atas ke Sheriff (f0-58), dengan debu berkilau di dalamnya.
112. **Lampu praktis di setiap set**: lentera gantung (berayun), lilin dinding dengan api bergerak, lampu meja hijau, korek, sumbu. Semuanya dengan **bloom**.
113. **Interior: cahaya hangat dari satu sisi** (jendela/lampu) dan **bayangan panjang tokoh di lantai** (f1070-1209, bayangan memanjang ke kanan).
114. **Tokoh 2D melempar bayangan ke dunia 3D** (lantai, rel). Bayangannya lembut dan mengikuti pose.
115. **Kabut atau haze tipis** di lorong untuk kedalaman. Debu menggantung setelah tumbukan.
116. **Eksterior**: matahari keras, langit biru, bayangan tajam, lalu ambient occlusion di celah batu.
117. **Cahaya cerita**:
    - kilatan tembakan menerangi wajah (f58-59);
    - percikan sumbu menerangi tangan dan wajah (f1546-1556);
    - bola api menerangi tebing (f1650-1656).
118. **Vignette halus** di tepi frame (terutama di adegan lorong).

## J. Efek visual (FX)
119. Kilatan moncong dengan bloom (f58-59).
120. Peluru bercahaya dengan ekor cahaya dan cincin gelombang kejut (f60-93).
121. Tumbukan: percikan emas, serpihan batu, awan debu yang bertahan lebih dari 1 detik, kawah dan retakan permanen (f93-113).
122. Retakan emas bercahaya bercabang dengan bintang kilau (f236-275).
123. Uap dan asap tipis di kejauhan (eksterior).
124. Debu dari roda mobil dan dari lori yang tumpah.
125. Kertas koran berkibar (simulasi kain).
126. Uang kertas beterbangan sebagai partikel properti (f1347-1386).
127. Pasir hitam dan serpih emas berputar dalam air (f866-929).
128. Api korek dan **semburan percikan sumbu** dengan garis-garis cahaya (f1538-1612).
129. Ledakan bola api dari pintu, papan nama terlempar (f1650-1656).
130. **Debu yang menutup kamera** sebagai transisi (f1663-1672).
131. **Tokoh kena jelaga**: seluruh warnanya diganti abu-abu (f1655-1831). Kontinuitas status setelah kejadian.
132. Smear atau motion blur pada gerak cepat (ayunan beliung f792, lari f1347-1358).
133. Partikel debu melayang ringan hampir di semua shot interior.
134. Coretan kapur 2D di lantai 3D dalam perspektif (f1800+).

## K. Subtitle
135. **Font sans tebal membulat**, putih dengan garis tepi atau bayangan gelap tipis. Posisinya tengah, sekitar 70% tinggi layar.
136. **1-3 kata per tampilan**, berganti keras tepat di kata yang diucapkan (tidak ada animasi pop).
137. Subtitle tidak pernah menutupi wajah. Tokoh ditata di sepertiga atas sampai tengah.

## L. Suara (terukur, tidak didengar)
138. **Narasi tanpa henti** dari f0 sampai akhir. Tidak ada jeda dramatis yang sunyi.
    - Intonasinya sangat naik-turun: kontur nada di spektrogram melengkung terus, jadi penyampaiannya ekspresif, bukan datar.
139. **Lapisan musik atau bass konstan** di bawah 150 Hz sepanjang video, sekitar 10 dB di bawah suara narator. Musiknya pelan dan tidak bersaing dengan narasi.
140. **Efek suara diletakkan TEPAT di frame kejadian** (selisih 0-2 frame), dan narasi jalan terus di atasnya. Hentakan terkuat:
    - 0,87 s / 1,25 s (f26, f37): bunyi tinggi tajam saat bongkah dimasukkan ke laras (klik logam).
    - **3,11 s (f93): tumbukan peluru di dinding**, pita lebar (hentakan + debu).
    - **7,87 s (f236): tembakan kedua mengenai dinding di samping Buddy**, ada pukulan sub-bass.
    - 10,89 s (f326): dorongan lori (pita rendah).
    - 11,70 s (f351) dan 17,46-18,02 s (f523-540): bunyi tinggi berkilau (kilau emas, uang, piring).
    - **21,69 s (f650): topi terbentur balok**, hentakan pita lebar 2 frame sebelum topi remuk di f652.
    - 25,57 s (f767): pita rendah, langkah atau gerak Si Ahli.
    - 29,1-29,9 s (f873-897): bunyi tinggi berulang, air dan pasir di wajan.
    - **34,27 s (f1028): emas gepeng** (pita rendah).
    - 47,99 s / 50,30 s (f1439, f1509): bunyi tinggi tajam saat dinamit ditarik dan diselipkan.
    - 52,12-52,61 s (f1563-1578): lemparan dan pantulan dinamit.
    - **54,99 s (f1649): ledakan**, pukulan sub-bass ditambah derau lebar sekitar 1 detik.
    - 58,92 s (f1767): kilau urat emas.
141. **Efek suara lebih pelan dari narasi.** Narasi selalu yang paling jelas; efek suara mengisi celah antar suku kata.
142. **Catatan:** jenis bunyi di atas adalah tebakan dari bentuk dan waktunya. Mohon dengarkan sendiri untuk memastikan.

## M. Ritme cerita
143. **Hook di 2 detik pertama**: tembakan emas ke dinding. Aksi dulu, penjelasan belakangan.
144. **Setiap 3-6 detik ada "kejadian" baru**: tembakan, tumbukan, koran, lori tumpah, uang, mobil, topi remuk, beliung, wajan, lensa, tawa, kabur, dinamit, ledakan, urat emas.
145. **Pengulangan dan kontinuitas**:
    - retakan tetap ada;
    - koran memuat foto si orang kaya;
    - topi Sheriff tertinggal lalu muncul lagi di akhir dekat 10 FT;
    - lori NELLIE muncul lagi saat dinamit memantul.
146. **Punchline visual di akhir** (10 FT↑), bukan dijelaskan panjang.

---

## N. Bandingkan dengan sistem kita sekarang (jujur)
Tes kamar Ketindihan kita (`src/videos/ketindihan/Kamar.tsx`) masih jauh di bawah standar ini.

| Aspek | Referensi | Kita sekarang |
|---|---|---|
| Gerak | Bergerak tiap frame, kamera selalu drift | Kamera diam, tokoh hampir diam |
| Shot | Satu shot = 2-4 framing via gerak kamera | 1 framing per shot dengan potong keras |
| Transisi | Bermotivasi (kilat, lensa, debu, lingkaran) | Potong biasa dan fade hitam |
| Mulut | Ganti tiap 1-3 frame, ~8 bentuk | Mulut hanya berganti di beberapa titik |
| Mata | Melirik, kedip, setengah kelopak, pop | Sudah ada lirik dan pop, tapi jarang |
| Kepala | Squash & stretch, miring, angguk terus-menerus | Hanya getar kecil |
| Badan | Tekstur kain nyata di dalam bentuk 2D | Warna flat |
| Properti | 3D realistis, benar-benar dipegang | Primitif sederhana |
| Cahaya | Volumetrik, lampu praktis, bloom, bayangan panjang | Satu cahaya bulan dan bloom |
| FX | Partikel di hampir setiap shot | Hampir tidak ada |
| Suara | Narasi rapat, efek suara di frame tepat | Belum ada |

## O. Yang wajib kita bangun supaya video berikutnya setara (urutan kerja)
1. **Mesin akting "on ones"**:
   - napas dan goyang halus untuk semua tokoh;
   - kepala miring dan angguk;
   - kedip acak;
   - pupil melirik.
   Tidak ada frame yang diam.
2. **Kamus mulut 8 bentuk + lip-sync per suku kata** dari `voice/words.json` (waktu kata ElevenLabs). Mulut berganti tiap 2-3 frame selama bicara.
3. **Kamus mata**: oval, setengah kelopak, tertutup, ^^, kedip satu, ><, kaget lingkaran besar. Alis dan pupil dibuat terpisah.
4. **Squash & stretch kepala dan badan** pada aksi besar (kaget, tawa, dorong, ledakan).
5. **Topi sebagai objek hidup**: miring bersama kepala, remuk, pop, terbang.
6. **Tekstur di dalam bentuk 2D**: kain, rajutan, kotak-kotak. Kita sudah punya `TEX` di `src/videos/ayam/dress.ts`; tinggal dipakai di gambar tokoh.
7. **Gambar tampak belakang** untuk tokoh utama.
8. **Kamera "satu shot banyak framing"**:
   - jalur kamera dengan ease;
   - follow-the-object;
   - reveal dengan pan;
   - punch-in di punchline;
   - drift halus di shot tenang.
9. **Transisi bermotivasi**: kilat, lensa/lingkaran, dissolve tekstur, debu atau asap menutup kamera.
10. **FX**: partikel debu melayang, percikan, awan debu yang bertahan, retakan bercahaya, kilau bintang, bloom lampu praktis.
11. **Cahaya**: sorot volumetrik, lampu praktis berayun, bayangan panjang tokoh, haze.
12. **Suara**:
    - narasi rapat dan ekspresif tanpa jeda panjang;
    - musik bass sekitar 10 dB di bawah narasi;
    - efek suara tepat di frame kejadian (0-2 frame).
    `audio/sfx_gen.py` sudah punya sekitar 40 efek sebagai titik awal.
13. **Subtitle per kata**, 1-3 kata, tebal putih bergaris, di 70% tinggi layar.

**Untuk "Satu Malam Ketindihan"**, contoh penerapannya:
- adegan kamar dibuka dengan sorot bulan volumetrik dan debu melayang;
- kamera follow-the-object dari jam dinding turun ke wajah Pak Udin;
- transisi lewat mata yang membelalak (lingkaran) ke ruang kontrol otak;
- "proyektor mimpi" sebagai sumber cahaya volumetrik;
- sosok di pojok menguap (squash & stretch) lalu topi atau sarungnya terlepas.

Ini perlu diputuskan bersama sebelum dibangun.
