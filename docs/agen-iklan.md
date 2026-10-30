# Tab Agen Iklan

Implementasi frontend di `src/pages/iklan/Agen.tsx`, adaptor `src/api/agen.ts`, dan protokol preview `src/lib/agen.ts`. Buka `/iklan?tab=agen`. Tidak ada perubahan backend, bot user, atau konfigurasi job.

## Sumber kontrak

Snapshot backend yang disediakan: `origin/main` **5f86f7ee4d0acccf01dc7adf187494254be1ffb7**, direktori `/opt/data/kanban/workspaces/t_c0f048f0/`. Referensi berikut relatif terhadap snapshot itu, bukan asumsi dari API produksi:

- `tenants/marketplace_erp/adapters/api/v1/agen_guardrail_router.py`: seluruh rute STOP, batas, audit, aksi, rollback, jadwal, dan tren; `ADMIN`, `pastikan_akses_akun`, batas audit 1–100, validasi item 1–32 digit.
- `tenants/marketplace_erp/adapters/api/v1/agen_router.py`: GET ringkasan, Shopee saja (409 untuk platform lain).
- `tenants/marketplace_erp/modules/marketplace_erp/application/agen_guardrail.py`: `BatasIn`, `StopIn`, `batas_bawaan`, `_uang`, `_audit_keluar`, `_sudah`, `tulisan_diblokir`. PUT batas merupakan penggantian penuh; STOP global didahulukan.
- `tenants/marketplace_erp/modules/marketplace_erp/application/agen_aksi.py`: `AksiIn`, `KataPerubahan`, `KembaliIn`, `_susun_kata`, `terapkan`, `kembalikan`. Dry-run tetap membuat audit. Backend membaca keadaan kampanye lagi pada eksekusi; preview bukan reservasi keadaan atau harga.
- `tenants/marketplace_erp/modules/marketplace_erp/application/agen_jadwal.py`: `JadwalIn`, `_jam`, `_keluar`, `daftar`, `simpan`, `interval_seconds`, `sekali`. Loop terpisah dari status baris; UI tidak menyediakan pengaturan interval/job.
- `tenants/marketplace_erp/modules/marketplace_erp/application/agen_ringkasan.py`: `susun`, `ringkasan_toko`, `ringkas_kampanye`, `ringkas_toggle`, `ringkas_jam`. Ringkasan memuat saldo, pengaturan, tarif, kampanye, produk, performa jam, catatan, indikator pemotongan, API usang, hari, identitas toko dan request ID. Batas ringkasan 25 kampanye, 8 kata per kampanye, 30 produk.
- `tenants/marketplace_erp/modules/marketplace_erp/application/agen_produk.py`: `tren` mengembalikan penjualan/kecepatan 7 dan 28 hari, views beserta delta, likes, sold kumulatif, rating, diagnosis, tanggal dan identitas toko/item. Null dipertahankan.
- `tenants/marketplace_erp/modules/marketplace_erp/infrastructure/models_agen.py`: seluruh model batas, STOP, audit, jadwal, snapshot; khususnya `AgenIklanAudit` dan `_audit_keluar` di application untuk bentuk respons publik.

Tes backend yang dibaca: `tests/test_agen_iklan_{guardrail,aksi,kata,jadwal,ringkasan,produk}.py`. Acuan perilaku antara lain `test_dry_run_reads_but_does_not_write`, `test_real_write_needs_approval_and_stays_inside_caps`, `test_rollback_restores_the_audited_budget_and_needs_approval`, `test_negative_keywords_use_delete_and_restore_without_a_bid`, `test_limits_default_then_roundtrip_and_a_repeat_request_does_not_apply_twice`, `test_only_an_enabled_row_pauses_outside_its_hours_and_resumes_inside`, dan `test_summary_reads_each_shop_and_never_calls_a_write`. Tes backend tidak dijalankan: lingkup tugas ini frontend dan snapshot tidak memuat seluruh dependensi backend.

## Endpoint dan badan permintaan

Semua path relatif terhadap base client yang sudah ada, `/api/marketplace-erp`. ID path di-encode.

| Fitur | Metode dan path | Badan / hasil |
| --- | --- | --- |
| STOP global | GET/PUT `/iklan/agen/stop` | PUT `{aktif, alasan, request_id}`; hasil `{lingkup, aktif, alasan, oleh}` |
| STOP toko | GET/PUT `/akun/{id}/iklan/agen/stop` | Bentuk sama; `aktif=true` berarti blokir |
| Batas toko | GET/PUT `/akun/{id}/iklan/agen/batas` | PUT semua lima kolom batas + `alasan`, `request_id`; tanpa properti respons `akun_id`/`tersimpan` |
| Audit | GET `/iklan/agen/audit` | Query `akun_id` opsional, `limit=100`; `{items:[...]}` |
| Aksi | POST `/akun/{id}/iklan/agen/aksi` | `{jenis,campaign_id,nilai?,kata?,kata_kunci?,alasan,kering,persetujuan?,request_id}` |
| Rollback | POST `/akun/{id}/iklan/agen/audit/{audit_id}/kembalikan` | `{alasan,kering,persetujuan?,request_id}`; nilai lama ditentukan backend dari audit |
| Jadwal | GET/PUT `/akun/{id}/iklan/agen/jadwal` | GET `{items,loop_detik}`; PUT `{campaign_id,jam,aktif}`; hasil satu baris |
| Ringkasan | GET `/akun/{id}/iklan/agen/ringkasan` | Hanya baca; tidak ada mutasi toggle/saldo |
| Tren item | GET `/akun/{id}/iklan/agen/produk/{item_id}/tren` | Hanya baca; tidak memicu snapshot job |

Batas: `anggaran_harian_maks=null` (atau >0 sampai 1.000.000.000), `maks_cpc=null` (atau >0 sampai 100.000), `maks_persen_perubahan=20` (integer 1–100), `min_hari_antar_perubahan=0` (integer 0–90), `otonomi=false`. Kosong pada dua plafon dikirim sebagai null. Menyimpan batas selalu mengirim seluruh kolom. Mengaktifkan otonomi menampilkan peringatan pembelanjaan dan memerlukan ketik `ya` dalam dialog. Alasan maksimal 500 karakter.

Aksi `anggaran`/`roas` memakai `nilai`; `jeda`/`lanjut` tidak mengirim nilai; `bid` memakai `kata` dan `nilai`. Editor kata menyusun array `{aksi,kata,bid?,tipe?}`: `kata_kunci` mendukung add/delete/restore/change_bid_price, bid wajib untuk add/change_bid_price; `kata_negatif` memakai tambah/hapus, yang dipetakan backend ke delete/restore pada kata yang sedang ditawar/terblokir. Tipe broad/exact opsional. Backend tetap menjadi validator plafon, perubahan persen, jarak perubahan dan keadaan kata saat ini.

Jadwal memakai ID kampanye positif, 1–24 jam unik 0–23 WIB, status awal false. UI mengurutkan dan menghapus duplikat jam. `loop_detik=0` secara eksplisit ditampilkan sebagai **Job mati**, termasuk jika ada baris aktif. PUT jadwal memerlukan konfirmasi; tidak mengubah loop backend.

Audit menampilkan seluruh data: id, akun_id, kampanye_id, aksi, pelaku_id/nama, sebelum/sesudah, alasan, request_id, persetujuan, kering, hasil, dibuat_at. Respons sebelum/sesudah dipertahankan utuh dalam rincian. Backend hanya menyediakan daftar terbaru, tanpa pagination/history penuh; UI meminta maksimum 100. Rollback tersedia pada toko terpilih hanya untuk tujuh jenis aksi dengan `hasil=diterapkan` dan `kering=false`; backend memvalidasi kelayakan akhir.

## Tampilan pemilik toko

Ringkasan menampilkan kartu saldo, tabel kampanye beserta status/anggaran/target ROAS/performa, tabel produk dan harga, serta catatan dan indikator data terpotong. Tabel memakai komponen repo dengan gulir horizontal di dalam kontainernya. Tren menampilkan penjualan dan kecepatan 7/28 hari, kunjungan/delta, suka, total terjual, penilaian dan diagnosis dalam label Indonesia. Nilai null ditulis **Belum tersedia** dan angka nol tetap nol.

Jenis aksi dan operasi kata memiliki label Indonesia. Editor kata memakai select operasi Tambah/Hapus/Pulihkan/Ubah bid, input kata dan bid, serta select pencocokan luas/persis. Pemilik tidak perlu mengetik JSON. Preview dan dialog nyata menampilkan Sebelum/Sesudah sebagai rincian berlabel. Audit menampilkan siapa, alasan, ID permintaan, persetujuan, mode kering/nyata, hasil, waktu, dan ID audit; keadaan sebelum/sesudah bisa dibuka. Respons audit yang membungkus hasil aksi dibuka ke keadaan sesudah yang sebenarnya; data lengkap tetap ada dalam detail JSON terlipat. Jadwal memiliki tabel status aktif/dijeda dan tombol edit untuk memuat ID, jam, dan status baris ke formulir.

## Protokol persetujuan dan invalidasi

1. Klik **Simulasikan** mengirim POST `kering:true`, tanpa `persetujuan`.
2. Hanya respons `kering=true`, `diterapkan=false`, bukan replay idempotensi, yang menjadi preview. Sebelum/sesudah ditampilkan.
3. Klik **Tinjau eksekusi nyata** membuka dialog kedua. Tidak ada POST pada langkah ini.
4. Pengguna mengetik `ya` dan mengklik **Ya, konfirmasi**. Barulah POST kedua dikirim dengan payload yang disalin dari simulasi, `kering:false`, `persetujuan:'ya'`.
5. ID UUID dry-run dan eksekusi berbeda: `_sudah` backend mengembalikan hasil pertama untuk ID sama. Preview dikonsumsi sebelum dispatch eksekusi, sehingga klik ulang/error tidak mengirim ulang otomatis.

Semua tujuh jenis aksi dan rollback melalui protokol yang sama, sekalipun otonomi toko aktif. Revisi alur membuang respons simulasi terlambat setelah edit, refresh, pergantian toko atau unmount. Pergantian toko me-remount seluruh lingkup dan menghapus form, dialog dan preview. Permintaan yang sudah diterima backend tidak dapat dibatalkan oleh frontend; audit perlu diperiksa setelah kegagalan jaringan yang ambigu. Tidak ada retry mutasi otomatis.

Toko awal selalu **Semua toko**, termasuk jika hanya satu akun tersedia. GET khusus toko tidak berjalan sebelum pilihan eksplisit. Izin berasal dari `useAuth().bisa('iklan','baca'/'tulis')`: tanpa baca tidak ada permintaan agen; tanpa tulis semua kontrol perubahan nonaktif. STOP/status batas yang gagal dimuat menghalangi aksi. Query STOP global, STOP toko, batas, jadwal, ringkasan, dan audit terpisah: kegagalan ringkasan/batas/jadwal tidak menonaktifkan kontrol STOP. Kegagalan dan pemuatan daftar akun juga ditampilkan. Jadwal dan konfirmasi jadwal diblokir saat STOP aktif atau status STOP belum terverifikasi. Backend tetap memeriksa role, akses akun, STOP dan guardrail pada eksekusi.

## Preview dan screenshot tanpa data live

Jalankan dari worktree:

```sh
node_modules/.bin/vite --config vite.agen-preview.config.ts
```

Buka hanya `http://127.0.0.1:4178/preview/agen.html`. Entry ini menggunakan `AgenView` dengan adaptor memori sintetis; tidak merender AuthProvider atau IklanPage, tidak mengakses akun live. CSP `connect-src 'none'` memblokir seluruh koneksi API/WebSocket dan font eksternal. Konfigurasi server khusus tidak memiliki proxy; middleware menolak `/api/` dan semua metode selain GET. Mengaktifkan kontrol demo hanya memodifikasi memori dan hilang saat reload.

Screenshot otomatis (Playwright tersedia secara lokal; tidak ditambahkan ke dependensi aplikasi):

```sh
TMPDIR="$PWD/artifacts/tmp" \
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
PLAYWRIGHT_BROWSERS_PATH=/path/to/browsers \
node scripts/agen-screenshots.mjs
```

Script menyimpan log/profil sementara di `TMPDIR` dalam worktree. Instalasi browser tugas lain hanya dipakai baca saja; tidak ada instalasi atau perubahan di direktori tugas lain. Script memblokir seluruh origin lain, metode non-GET, API, dan service worker. Membuat **14 screenshot**: semua toko, toko terpilih, tren, editor kata kunci, jadwal yang dimuat, audit terbuka, dan dialog konfirmasi kedua pada 1440×1000 dan 390×844; memeriksa overflow horizontal dan menjalankan persetujuan aksi pada adaptor memori saja. Bukti mesin: [agen-screenshots/evidence.json](agen-screenshots/evidence.json). Hasil desktop/mobile: `networkWrites=0`, `apiRequests=0`, `horizontalOverflow=false`, `mockActionConfirmed=true`, `tableOverflowContained=true`, `browserErrors=0`, `nullTrendPreserved=true`, `scheduleRowLoaded=true`, `structuredKeywordEditor=true`.

## Bukti pengujian frontend

- `src/__tests__/agen.test.ts`: endpoint/badan persis, seluruh tujuh aksi serta rollback dry-run→persetujuan, ID terpisah, invalidasi/revisi, respons tidak aman, kegagalan, validasi angka/kata.
- `src/__tests__/agen-ui.test.tsx`: izin baca/tulis, tidak memilih toko otomatis, STOP dengan ketik ya, tujuh aksi melalui UI dan konfirmasi kedua, rollback, batas penggantian penuh dengan otonomi false, jadwal/jam dan job mati, invalidasi saat edit/pindah toko termasuk respons terlambat, peringatan/persetujuan otonomi aktif, pemuatan baris jadwal, editor empat operasi kata, null tren, kegagalan daftar akun, STOP independen saat pembacaan gagal, dan STOP yang berubah ketika konfirmasi jadwal terbuka.
- Seluruh adaptor HTTP pada tes fitur dimock. Tidak ada endpoint produksi dipanggil.
- `yarn test`: **77 file, 406 tes lulus** (termasuk regresi penghapusan field respons `akun_id`/`tersimpan` sebelum PUT batas dengan `extra=forbid`).
- `yarn lint`: exit 0; 68 warning yang tersisa berasal dari file lama, tidak ada warning pada file fitur Agen.
- `yarn build`: exit 0, TypeScript dan Vite produksi berhasil menggunakan `.env.production` yang sudah tersedia di worktree, tanpa mencetak isinya. Tidak ada perubahan file env dalam diff.
- Screenshot Chromium lokal berhasil pada kedua ukuran; tidak ada jaringan API/penulisan.

Tidak ada perubahan backend, merge, deployment, bot user, aktivasi jadwal, atau aktivasi otonomi nyata. Integrasi backend produksi tidak diuji sesuai larangan panggilan live. Status PR dan CI exact-head dilaporkan di kartu Kanban.

Log validasi lokal: `artifacts/agen-test.log`, `artifacts/agen-lint.log`, `artifacts/agen-build.log`, dan `artifacts/agen-screenshots.log`. Semua disimpan di worktree ini.
