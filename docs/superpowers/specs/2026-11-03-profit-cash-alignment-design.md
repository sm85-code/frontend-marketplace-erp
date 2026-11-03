# Saldo Kas Utama setelah pembagian laba

## Tujuan
Samakan saldo akhir Kas Utama di halaman Arus Kas umum dan tab Arus Kas Laporan Keuangan, dengan pembagian laba terbaru setelah bulan sumber berstatus final.

## Perilaku yang disepakati
- Pembagian laba dihitung ulang dari laba bersih terbaru, termasuk rugi bawaan yang harus ditutup terlebih dahulu, lalu dibagi sesuai porsi yang berlaku.
- Perhitungan baru langsung memengaruhi saldo akhir Kas Utama di kedua tampilan tanpa perlu menekan tombol pengisian ulang.
- Rincian penerima dan nominal pembagian tetap tidak ditampilkan di halaman Arus Kas umum; hanya pengaruhnya pada saldo kas yang terlihat.

## Pendekatan
Gunakan nilai turunan di tampilan, bukan penyimpanan otomatis ke lembar keuangan. Ini membuat kedua halaman konsisten tanpa penulisan diam-diam pada data keuangan. Saat rekonstruksi saldo awal dari bulan-bulan historis, terapkan pembagian final tiap bulan secara in-memory agar saldo pembukaan bulan berikutnya tetap sama dengan saldo penutupan bulan sebelumnya. Setelah lembar keuangan disimpan lewat Laporan Keuangan, perbarui juga cache baca Arus Kas agar perubahan laba langsung tampak tanpa menunggu cache kedaluwarsa. Pakai jalur baca Arus Kas yang diizinkan untuk halaman umum; tutup buku, transaksi, dan catatan audit tidak berubah.

## Batasan
Tidak mengubah transaksi sumber, tidak menutup buku otomatis, tidak mengubah persentase pembagian, dan tidak menampilkan rincian pembagian di halaman Arus Kas umum. Jika bulan sumber belum final, jangan menerapkan pembagian otomatis.
