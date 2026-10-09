# Penataan ruang kerja ERP

- Dashboard merangkum periode/toko yang dipilih, grafik nilai pesanan, lima produk teratas dan stok kritis. Detail operasional dibuka dari tautan kartu atau daftar.
- Tabel dipertahankan pada HP, dengan petunjuk geser ketika melebar. Daftar lokal dibatasi sepuluh baris; centang semua memilih halaman yang terlihat. Pilihan pesanan tetap ditampilkan di bar aksi di atas navigasi HP.
- Katalog memiliki preset Ringkas, Varian dan Pengiriman. Detail produk, promosi dan pengaturan kampanye memakai halaman tersendiri.
- Publikasi memakai lima langkah dan draf sesi per pengguna. Publikasi tetap memerlukan konfirmasi pengguna.
- Gudang memisahkan stok, riwayat berhalaman/bertanggal dan pengelolaan gudang.
- Settlement memisahkan dana cair, saldo toko, mutasi dan catatan manual. Saldo toko adalah saldo terakhir tercatat pada mutasi dalam 15 hari, bukan jaminan dana siap ditarik. Nilai siap tarik/tertahan yang tidak tersedia tidak diubah menjadi nol. Total dipisahkan per mata uang dan diberi penanda bila data sebagian.
- Penjelasan tambahan/petunjuk dilipat secara default. Peringatan penting, kegagalan dan makna angka tetap terlihat. Tombol utama berwarna tema; aksi sekunder berwarna lebih lembut.
- Form perubahan memiliki konfirmasi sebelum dibuang; input nominal menampilkan pengelompokan ribuan tanpa mengubah nilai API.
- Konteks toko disimpan per pengguna dan divalidasi terhadap toko yang diizinkan. API tetap menjadi batas akses.
- Settlement, Iklan, Kelola Toko dan Kelola Pengguna tetap admin only. Staf tetap memakai toko yang ditugaskan. Detail kampanye juga admin only.
- Pencarian riwayat chat tambahan dilakukan atas permintaan, maksimal sepuluh halaman per toko, dengan penanda hasil sebagian. Batas izin Shopee Chat tetap berlaku; tidak ada pengiriman pesan otomatis atau filter peran yang ditebak.

Validasi rilis: build/lint/unit FE, pengujian BE terarah, pemeriksaan Chromium pada 390/820/1440 px memakai respons API tiruan, termasuk pilihan massal, form belum disimpan, draf, saldo dan pembatasan role. Tidak melakukan tindakan marketplace nyata.
