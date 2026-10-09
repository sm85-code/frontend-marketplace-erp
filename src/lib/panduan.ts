export interface Panduan {
  path: string
  judul: string
  tujuan: string
  langkah: string[]
  dampak: string
}
export const panduan: Panduan[] = [
  {path: '/asisten', judul: 'Asisten AI', tujuan: 'Tanyakan data ERP atau jalankan perintah khusus admin.',
   langkah: ['Pilih toko, lalu gunakan mode Tanya untuk membaca data.', 'Gunakan Jalankan perintah untuk perubahan; sebutkan produk, tindakan dan nilainya.', 'Periksa jawaban dan catatan tindakan. Hasil belum pasti tidak dikirim ulang otomatis.'],
   dampak: 'Mode perintah dapat mengubah produk, iklan dan promosi di Shopee. Penggunaan AI dikenai biaya token.'},
  {
    path: '/performa-toko', judul: 'Performa Toko',
    tujuan: 'Periksa indikator kesehatan dan riwayat penalti toko dari Shopee.',
    langkah: ['Pilih toko Shopee untuk membaca indikator terbaru.', 'Bandingkan periode saat ini dengan periode sebelumnya dan target yang tersedia.', 'Periksa riwayat poin penalti kuartal berjalan; gunakan halaman berikutnya untuk catatan lain.'],
    dampak: 'Halaman khusus admin ini hanya membaca data. Data yang belum tersedia tidak dianggap nol.',
  },
  {
    path: '/chat', judul: 'Chat Pembeli',
    tujuan: 'Baca dan balas pesan pembeli tanpa berpindah ke toko lain.',
    langkah: [
      'Percakapan diurutkan terbaru. Pilih toko; lokasi di samping username berasal dari alamat tujuan pesanan tersinkron.',
      'Buka percakapan, baca pesan lalu ketik balasan. Klik Kirim balasan sekali; tunggu konfirmasi terkirim.',
      'Gunakan Sinkronisasi seluruh toko untuk daftar terbaru semua toko. Pilih satu toko lalu Sinkronisasi toko ini untuk memperbarui toko tersebut. Pesan lebih lama membuka riwayat; Tandai sudah dibaca mencatat pesan telah dibaca.',
      'Buka Lampirkan produk / pesanan, pilih kartu bergambar, lalu Kirim lampiran. Produk sesuai toko; pesanan sesuai pembeli. Teks dikirim terpisah.',
      'Dari detail pesanan, Hubungi Pembeli membuka balasan tanpa mengirim otomatis. Jika hasil kirim belum pasti, periksa riwayat dahulu.',
    ],
    dampak: 'Kirim balasan mengirim pesan nyata ke pembeli; Tandai sudah dibaca memperbarui status baca. Izin API yang ditolak ditampilkan sebagai error toko terkait.',
  },
  {
    path: '/pesanan/retur',
    judul: 'Retur & Refund',
    tujuan: 'Tangani pengembalian berdasarkan status, solusi dan tenggat dari marketplace.',
    langkah: [
      'Pilih toko dan tanggal pengajuan (maksimal 15 hari WIB), lalu Tampilkan. Buka Detail untuk membaca alasan dan barang.',
      'Setujui Retur / Refund jika menerima solusi. Jika tidak sesuai, buka Ajukan Sengketa, pilih alasan yang tersedia dan unggah foto tiap bagian wajib.',
      'Segarkan detail setelah keputusan. Periksa barang fisik sebelum mencatat stok masuk; proses video/negosiasi lanjutan melalui Seller Centre.',
    ],
    dampak: 'Persetujuan dan sengketa dikirim ke Shopee. Stok dan settlement ERP tidak otomatis berubah.',
  },
  {
    path: '/pesanan/',
    judul: 'Detail Pesanan',
    tujuan: 'Periksa barang, pembayaran dan pengiriman sebelum memproses satu pesanan.',
    langkah: [
      'Periksa toko, nomor pesanan dan pilihan varian setiap barang.',
      'Pilih metode pengiriman: Langsung Shopee, Drop Off (serahkan ke gerai), atau Pickup (jemput kurir). Isi lokasi/jadwal jika diminta Shopee.',
      'Cetak resi setelah pengiriman terkonfirmasi. Pembatalan pembeli ditangani dengan Terima/Tolak; lihat hasil status sebelum tindakan berikutnya.',
    ],
    dampak: 'Memproses atau membatalkan mengubah pesanan di marketplace dan memengaruhi reservasi stok sesuai status yang dikonfirmasi.',
  },
  {
    path: '/pesanan',
    judul: 'Pesanan',
    tujuan: 'Kelola pesanan lintas toko berdasarkan status dan prioritas pengiriman.',
    langkah: [
      'Pilih toko/status, sinkronkan bila perlu, lalu periksa tanggal dan resi.',
      'Segarkan memperbarui tabel ERP. Gunakan Sinkronisasi untuk satu item/pilihan, satu toko, atau seluruh toko; antrean bisa dijeda dan dilanjutkan.',
      'Centang pesanan yang siap, pilih Proses dan tentukan metode pengiriman. Periksa hasil per pesanan; jangan mengulang pesanan yang sudah berhasil.',
      'Gunakan Cetak Resi untuk pengiriman terkonfirmasi. Retur & Refund mempunyai halaman penanganan tersendiri.',
    ],
    dampak:
      'Sinkronisasi membaca marketplace. Proses, keputusan pembatalan dan pengiriman mengirim perubahan; cetak ulang tidak memproses ulang pesanan.',
  },
  {
    path: '/katalog/publikasi',
    judul: 'Buat / Salin Produk',
    tujuan: 'Buat listing baru dengan data induk dan varian yang dipetakan terpisah.',
    langkah: [
      'Pilih toko tujuan. Jika menyalin, pilih toko/produk sumber dan Ambil Salinan; stok tujuan dimulai 0.',
      'Periksa nama, deskripsi, kategori tujuan, atribut, merek, foto, harga asli dan jasa kirim. Isi berat kg, dimensi cm dan preorder/DTS.',
      'Atur jenis/pilihan variasi dahulu, lalu isi setiap baris SKU, harga, stok dan fisik. Periksa ringkasan sebelum membuat produk.',
      'Produk disembunyikan secara default. Jika koneksi terputus, gunakan Periksa Hasil Operasi; jangan membuat produk duplikat.',
    ],
    dampak: 'Membuat produk baru di toko tujuan. Aktivasi hanya setelah varian dikonfirmasi. Tidak mengubah stok atau riwayat produk ERP.',
  },
  {
    path: '/katalog/promosi',
    judul: 'Promosi Diskon',
    tujuan: 'Atur periode dan harga diskon pada produk/varian toko.',
    langkah: [
      'Pilih toko dan status promosi, lalu buka Detail atau Buat Promosi.',
      'Isi periode (mulai minimal satu jam ke depan). Pilih produk dan model yang tepat sebelum menambah/mengubah harga diskon.',
      'Saat menambahkan produk/varian, stok khusus promosi boleh diisi atau dikosongkan untuk pengaturan bawaan Shopee. Stok promo tidak bisa diubah langsung lewat Ubah harga.',
      'Periksa hasil setiap barang. Akhiri promosi hanya setelah memeriksa dampaknya; hapus mengikuti syarat Shopee.',
    ],
    dampak: 'Perubahan dikirim ke Shopee. Harga diskon bukan harga asli produk dan tidak mengubah stok ERP.',
  },
  {
    path: '/katalog',
    judul: 'Katalog Marketplace',
    tujuan: 'Lihat listing toko, termasuk pilihan varian, harga, berat, dimensi dan preorder.',
    langkah: [
      'Pilih toko/status dan cari produk. Tabel dapat digeser ke samping, termasuk pada HP.',
      'Buka Detail untuk foto, deskripsi dan tabel setiap pilihan varian. Nama produk dan pilihan varian ditampilkan terpisah.',
      'Gunakan kelola produk untuk nama/SKU/deskripsi dan tampil/sembunyikan; Buat / Salin Produk untuk listing baru; Promosi Diskon untuk diskon.',
    ],
    dampak:
      'Membaca katalog tidak mengubah stok. Edit, aktivasi dan promosi mengubah listing Shopee; kirim ke toko web mempunyai tujuan tersendiri.',
  },
  {
    path: '/produk',
    judul: 'Produk & Varian ERP',
    tujuan: 'Atur SKU persediaan dan keluarga produk untuk semua marketplace.',
    langkah: [
      'Buat SKU yang unik untuk setiap barang/varian yang stoknya berbeda.',
      'Kelompokkan SKU dalam keluarga produk dengan jenis dan pilihan variasi; lengkapi harga, berat, dimensi dan preorder per varian.',
      'Hubungkan SKU ERP dengan listing marketplace yang sesuai; verifikasi model dan toko sebelum mengirim stok/harga.',
    ],
    dampak: 'Master ERP terpisah dari listing toko. Mengubah master tidak langsung membuat listing atau mengirim stok/harga ke Shopee.',
  },
  {
    path: '/listing',
    judul: 'Pemetaan Listing',
    tujuan: 'Hubungkan produk marketplace dengan SKU ERP yang benar.',
    langkah: [
      'Pilih SKU ERP, toko, item dan model marketplace yang tepat.',
      'Pastikan setiap pilihan varian mengarah ke SKU persediaan yang sesuai; model satu toko tidak digunakan sebagai identitas toko lain.',
      'Periksa pemetaan sebelum mengirim pembaruan stok/harga.',
    ],
    dampak: 'Pemetaan menentukan SKU untuk reservasi dan pembaruan marketplace; salah pemetaan dapat memengaruhi persediaan.',
  },
  {
    path: '/gudang',
    judul: 'Gudang & Persediaan',
    tujuan: 'Catat lokasi, stok fisik, transfer dan riwayat perubahan stok.',
    langkah: [
      'Pilih gudang dan SKU, lalu periksa stok tersedia serta stok yang direservasi pesanan.',
      'Catat stok masuk/penyesuaian sesuai pemeriksaan barang; transfer memindahkan antar gudang.',
      'Periksa ledger setelah perubahan. Reservasi pesanan bukan barang fisik yang hilang.',
    ],
    dampak:
      'Pencatatan dan transfer mengubah persediaan ERP. Kirim stok ke marketplace hanya melalui tindakan pengiriman stok yang tersedia.',
  },
  {
    path: '/settlement',
    judul: 'Settlement & Dana',
    tujuan: 'Bedakan dana bersih pesanan, mutasi saldo penjual dan catatan pembayaran ERP.',
    langkah: [
      'Pilih toko/periode untuk melihat dana Shopee dan rincian potongan per pesanan.',
      'Transaksi Saldo Penjual menampilkan arus masuk/keluar, biaya dan penarikan dalam rentang maksimal 15 hari WIB.',
      'Cocokkan bukti pembayaran sebelum Catat Settlement / Tandai Dibayar. Jangan menjumlahkan penarikan dan pendapatan sebagai dua pendapatan.',
    ],
    dampak: 'Data Shopee dibaca saja. Catatan manual/tanda dibayar mengubah catatan ERP, tidak menarik saldo atau mengirim uang.',
  },
  {
    path: '/iklan/',
    judul: 'Detail Iklan',
    tujuan: 'Periksa pengaturan dan metrik kampanye sebelum mengubahnya.',
    langkah: [
      'Baca periode metrik, biaya dan hasil; data yang belum tersedia tidak sama dengan nol.',
      'Periksa anggaran, target ROAS dan status sebelum menyimpan perubahan.',
      'Sesudah pengiriman, segarkan kampanye. Jika respons belum pasti, periksa Shopee sebelum mengirim ulang.',
    ],
    dampak: 'Perubahan kampanye Shopee dapat memakai saldo iklan. Pencatatan kampanye ERP/manual mengikuti form yang sedang dibuka.',
  },
  {
    path: '/iklan',
    judul: 'Iklan & Strategi',
    tujuan: 'Lihat kinerja dan kelola kampanye yang tersedia untuk toko.',
    langkah: [
      'Pilih toko dan periode; periksa saldo, biaya, omzet dan kelengkapan data.',
      'Buat/kelola kampanye dengan anggaran dan target yang sesuai. Fitur otomatis/GMV mengikuti ketersediaan toko dan izin dari Shopee.',
      'Saran AI tetap berupa saran; tinjau sendiri sebelum mengambil tindakan. Error Shopee beserta request ID membantu menelusuri masalah.',
    ],
    dampak: 'Buat/ubah kampanye dikirim ke Shopee dan dapat menghabiskan saldo. Meminta saran AI tidak menjalankan perubahan iklan.',
  },
  {
    path: '/toko',
    judul: 'Kelola Toko',
    tujuan: 'Daftarkan akun toko dan hubungkan akses API.',
    langkah: [
      'Pilih marketplace, isi identitas toko, kemudian Hubungkan akun yang sesuai.',
      'Selesaikan otorisasi dan pastikan ID toko/status koneksi benar sebelum sinkronisasi.',
      'Shopee adalah integrasi API yang tersedia saat ini; struktur ERP tetap mendukung marketplace lain.',
    ],
    dampak: 'Otorisasi memberi ERP akses API toko. Sinkronisasi membaca data; perubahan marketplace hanya lewat tindakan fitur terkait.',
  },
  {
    path: '/staff',
    judul: 'Kelola Pengguna',
    tujuan: 'Atur pengguna dan batas toko yang dapat diakses.',
    langkah: [
      'Buat pengguna dengan peran yang sesuai tanggung jawab.',
      'Klik Tugaskan ke Toko, pilih staf, centang beberapa toko, lalu Tugaskan sekali. Satu toko boleh ditugaskan ke beberapa staf.',
      'Gunakan akun pribadi masing-masing untuk menelusuri tindakan pengguna.',
    ],
    dampak: 'Penugasan membatasi dashboard, pesanan, chat dan katalog staf ke toko yang dipilih. Penugasan lama tetap berlaku; gunakan Hapus untuk mencabut satu penugasan.',
  },
  {
    path: '/profile',
    judul: 'Profil',
    tujuan: 'Perbarui nama dan kontak akun pribadi.',
    langkah: [
      'Periksa identitas akun yang masuk.',
      'Ubah nama/email yang diperlukan, lalu simpan.',
      'Gunakan Ganti Password untuk mengganti sandi.',
    ],
    dampak: 'Perubahan profil hanya memengaruhi akun ERP Anda.',
  },
  {
    path: '/ganti-password',
    judul: 'Ganti Password',
    tujuan: 'Jaga akses akun pribadi.',
    langkah: [
      'Isi password saat ini dan password baru.',
      'Periksa konfirmasi sebelum menyimpan.',
      'Gunakan password berbeda dari akun marketplace.',
    ],
    dampak: 'Mengubah sandi ERP; tidak mengubah sandi Shopee.',
  },
  {
    path: '/dashboard',
    judul: 'Dashboard',
    tujuan: 'Ringkasan aktivitas ERP berdasarkan data yang sudah tersinkron.',
    langkah: [
      'Periksa waktu pembaruan dan toko yang dapat diakses.',
      'Buka menu Pesanan, Katalog, Settlement atau Iklan untuk melihat rincian.',
      'Sinkronkan fitur terkait jika data belum terbaru.',
    ],
    dampak: 'Membaca ringkasan tidak menjalankan perubahan marketplace.',
  },
  {
    path: '/shopee/callback',
    judul: 'Hubungkan Shopee',
    tujuan: 'Selesaikan otorisasi toko yang sedang dihubungkan.',
    langkah: [
      'Tunggu hasil otorisasi.',
      'Periksa status toko setelah kembali ke menu Kelola Toko.',
      'Jika gagal, baca pesan lalu mulai ulang Hubungkan dari toko yang sama.',
    ],
    dampak: 'Callback menyimpan koneksi API toko yang terverifikasi.',
  },
]
export function panduanUntuk(path: string): Panduan | undefined {
  return [...panduan]
    .sort((a, b) => b.path.length - a.path.length)
    .find((p) => path === p.path || path.startsWith(p.path.endsWith('/') ? p.path : p.path + '/'))
}
