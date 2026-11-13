# Satu Ayam yang Sama: narration timing sheet

The video (out/full/ayam_full_1080.mp4, paced version) has no voice. Every action is timed to these moments.
When you record your own voice, start each sentence at the time shown. Faster or slower is fine as long as the **keywords** land close to their times (within about 0.2 s).

| # | Start | End | Narration | Keywords (time) |
|---|---|---|---|---|
| 1 | 0:00.11 | 0:05.42 | Kenapa yang kaya makin kaya, dan yang miskin makin susah? Jawabannya... seekor ayam. | miskin 0:02.09; Jawabannya 0:03.81; ayam 0:04.91 |
| 2 | 0:06.21 | 0:12.21 | Bayangkan suatu hari, puting beliung menyapu seluruh kampung. Emas, rumah, sawah... semuanya terbang. | puting 0:07.48; Emas 0:09.68; rumah 0:10.36; sawah 0:11.01; terbang 0:11.74 |
| 3 | 0:12.91 | 0:17.14 | Sekarang semua orang sama: tidak punya apa-apa. Dan semuanya lapar. | Sekarang 0:12.91; lapar 0:16.66 |
| 4 | 0:17.88 | 0:21.05 | Tiga hari kemudian, tiap kelompok dapat satu ekor ayam. | Tiga 0:17.88; ayam 0:20.53 |
| 5 | 0:21.83 | 0:28.61 | Kelompok pertama sudah tidak tahan lapar. Malam itu juga, ayamnya dipanggang. Makan malam paling enak... dan yang terakhir. | Malam 0:24.16; dipanggang 0:25.54; Makan 0:26.80; terakhir 0:28.13 |
| 6 | 0:29.29 | 0:37.40 | Kelompok kedua sama laparnya, tapi ayamnya dibiarkan hidup. Kalau betina, telurnya dimakan. Kalau jantan, dipelihara untuk dikawinkan. | betina 0:32.90; jantan 0:35.40; dikawinkan 0:36.77 |
| 7 | 0:38.07 | 0:45.83 | Kelompok ketiga punya rencana lain. Mereka mendatangi kelompok kedua: pinjami kami telurnya. Nanti kalau sudah jadi ayam, telurnya kami bagi. | Mereka 0:40.26; pinjami 0:41.81; Nanti 0:43.52; bagi 0:45.42 |
| 8 | 0:46.53 | 0:50.30 | Kelompok kedua mau telur. Kelompok ketiga... mau ayam. | telur 0:47.40; ayam 0:49.80 |
| 9 | 0:51.01 | 0:58.58 | Tiga minggu kemudian, anak ayam pertama menetas. Beberapa bulan lagi, mereka bertelur sendiri. Lama-lama, ayam kelompok ketiga makin banyak. | menetas 0:52.71; Beberapa 0:53.81; bertelur 0:55.15; Lama-lama 0:56.52; banyak 0:58.20 |
| 10 | 0:59.23 | 1:04.41 | Sementara itu, kelompok pertama tidak punya apa-apa. Yang bisa mereka lakukan... cuma protes. | protes 1:03.85 |
| 11 | 1:05.15 | 1:07.91 | Kelompok kedua punya telur, cukup untuk hidup tenang. | tenang 1:07.45 |
| 12 | 1:08.70 | 1:11.07 | Tapi ayam kelompok ketiga sudah terlalu banyak untuk diurus sendiri. | sendiri 1:10.66 |
| 13 | 1:11.70 | 1:15.90 | Jadi mereka mendatangi kelompok pertama, dan menawarkan kerja. Upahnya... telur. | kerja 1:13.95; Upahnya 1:14.99; telur 1:15.50 |
| 14 | 1:16.52 | 1:21.99 | Dan begitulah... kampung yang dimulai dengan ayam yang sama, sekarang terbelah jadi tiga: miskin, menengah, dan kaya. | terbelah 1:19.26; miskin 1:20.22; menengah 1:20.83; kaya 1:21.62 |
| 15 | 1:22.61 | 1:27.29 | Nah, kalau kalian tiba-tiba dapat lima ratus juta... mau ditaruh di instrumen investasi... atau langsung beli Fortuner bekas? | juta 1:24.28; investasi 1:25.55; Fortuner 1:26.63; bekas 1:26.89 |

The video is 88.4 s long (2,651 frames at 30 fps). The slower scenes leave small pauses between sentences; the last sentence ends at about 1:27.29; the closing 'TIN TIN!' and the cheering carry the end.

**Adding your voice with ffmpeg** (voice.wav = your recording, starting at 0:00):

```bash
ffmpeg -i out/full/ayam_full_1080.mp4 -i voice.wav -filter_complex "[0:a]volume=0.6[s];[1:a]volume=1.0[v];[s][v]amix=inputs=2:duration=first:normalize=0[a]" -map 0:v -map "[a]" -c:v copy -c:a aac out/full/ayam_final_1080.mp4
```
