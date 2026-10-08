# Chat pembeli: produk dan pesanan

Daftar percakapan diurutkan terbaru lintas toko dengan timestamp detik/milidetik/nanodetik dinormalisasi. Kota di samping username berasal dari alamat tujuan pesanan tersinkron, bukan lokasi profil Chat.

Dalam percakapan, buka **Lampirkan produk / pesanan**. Pilihan produk hanya dari katalog aktif toko tersebut, dengan pencarian dan halaman berikutnya. Pesanan hanya untuk pembeli terkait. Kartu menampilkan foto, nama, varian/jumlah dan nominal bila tersedia. Pilih kartu dan tekan **Kirim lampiran**; teks dikirim terpisah. Staff dapat memakai pilihan ini untuk toko yang ditugaskan tanpa mendapat akses manajemen katalog global.

**Hubungi Pembeli** di detail pesanan Shopee membuka Chat tanpa mengirim pesan. Backend memperoleh buyer_user_id dari snapshot pesanan atau membaca get_order_detail untuk nomor pesanan yang sama. Percakapan dalam daftar terbaru dibuka bila ditemukan; selain itu pengguna menulis balasan dan identitas percakapan dari hasil send_message digunakan untuk memuat riwayat.

Pengiriman memakai kartu native item/order (item_id/order_sn), bukan tautan ERP yang tidak dapat diakses pembeli. Backend memvalidasi toko/pembeli lagi sebelum pengiriman; receipt operation_id mencegah pengulangan otomatis untuk respons ambigu. Jika izin API ditolak, error ditampilkan.

Verifikasi lokal memakai fixture: desktop1440/HP390, urutan terbaru, lokasi, pilihan bergambar, payload pengiriman produk/pesanan, tombol dari detail, tanpa pengiriman otomatis. Backend memeriksa penolakan lintas toko/pembeli/staff yang tidak ditugaskan, payload native, dan receipt. Tidak ada pesan nyata dikirim. Deployment dan izin Chat produksi belum diverifikasi.

Referensi kontrak: Shopee Seller Chat send_message/get_conversation_list/get_one_conversation/get_message (module109); buyer_user_id pada get_order_detail. Situs Open Platform tidak dapat diakses dari lingkungan ini. Bentuk kontrak dicocokkan dengan sumber SDK EcomPHP/shopee-php Chat.php, easycb/easycb-go model_chat.go, dan JimCurryWang/python-shopee pyshopee2/chat.py. Keberhasilan produksi tetap memerlukan izin aplikasi Shopee yang sesuai.

## Pembaruan daftar percakapan

Sinkronisasi Chat mengembalikan kursor ke halaman terbaru dan mengambil ulang daftar serta percakapan aktif. Permintaan awal memakai timestamp nanodetik saat ini dengan arah older; kursor berikutnya dipertahankan sebagai string tanpa kehilangan presisi. Kontrak arah paging belum diverifikasi terhadap layanan produksi.

Belum dibalas memfilter halaman yang dimuat berdasarkan pengirim pesan terakhir: pembeli, bukan jumlah pesan belum dibaca. Identitas pengirim yang tidak tersedia tidak dianggap otomatis perlu balasan.

Alamat dicocokkan dengan buyer_user_id meski username berubah, tetap dalam toko yang sama. Jika tidak ada alamat tujuan pesanan tersinkron, UI menampilkan Kota belum tersedia; lokasi tidak ditebak.

Pemeriksaan pembaruan: 13 tes workflow backend, 3 tes helper Chat, build/lint frontend, dan alur browser fixture desktop1440/HP390 (urutan, filter, reset kursor sinkronisasi, lokasi). Tidak ada pesan nyata dikirim.

## Konten nonteks dan peran penjual

Percakapan daftar harus memiliki shop_id toko yang diizinkan. Percakapan belanja dari toko lain tidak ditampilkan; akses langsung (riwayat, konteks, balasan dan tandai dibaca) ditolak bila shop_id berbeda. Identitas toko yang tidak diberikan API menghasilkan pesan error, bukan dianggap otomatis milik toko ini. Balasan penjual dan pesan sistem di dalam percakapan pembeli tetap ditampilkan.

Konten teks terstruktur/JSON, teks pada source_content, judul/deskripsi pesan otomatis, produk, nomor pesanan, gambar/stiker, video dan tautan web ditampilkan sebagai data. Produk yang sudah tersinkron tetap memakai kartu katalog; item_id yang belum tersinkron dapat dibuka di Shopee. URL selain HTTP/HTTPS dan URL dengan kredensial ditolak; HTML pesan tidak dieksekusi. Bila API tidak menyediakan konten yang dapat dibaca, UI menyebut keterbatasan tersebut beserta jenis pesan, tanpa mengarang isi.

Verifikasi: regresi backend untuk percakapan penjual versus belanja dan identitas toko hilang; helper frontend untuk payload nonteks dan URL berbahaya; browser fixture desktop1440/HP390 untuk keterbacaan pesan otomatis/produk/gambar dan HTML tetap inert. Tidak ada pesan nyata dikirim. Izin API dan deployment produksi belum diverifikasi.

## Pemulihan daftar Chat

Pemeriksaan from_shop_id/to_shop_id dengan asumsi sisi pembeli selalu 0 terbukti menyembunyikan hampir seluruh chat sah pada produksi. Aturan tersebut dicabut dari inbox, riwayat dan akses langsung; cache peran serta panggilan riwayat tambahan per percakapan juga dihapus. Respons asli inbox, timestamp terbaru, unread_count dan semua pesan dalam percakapan kembali dipertahankan. Scope akses tetap mengikuti akun toko yang diizinkan dan conversation.shop_id. Tidak ada pesan di Shopee yang dihapus.

Pemisahan chat belanja lebih lanjut memerlukan kontrak/payload produksi yang membuktikan peran. Jangan memakai username, status unread, tidak adanya pesanan atau ID toko positif di kedua sisi sebagai dugaan untuk menyembunyikan chat.

Kontrol toko dan sinkronisasi disusun dalam grid. Sinkronisasi tersedia untuk seluruh toko atau pilihan toko. Tombol riwayat per toko berada dalam daftar vertikal dengan nama toko dan Lebih lama, menggunakan warna sekunder agar tidak bersaing dengan tombol sinkronisasi utama. Tidak ada deretan peringatan percakapan tersembunyi. Tombol berwarna dan dukungan nonteks tetap dipertahankan.

Regresi: pesan dengan kedua ID toko positif maupun field peran hilang tetap terbaca. Browser fixture390/1440 memeriksa sinkronisasi per toko/seluruh toko, paginasi vertikal, konten nonteks dan tidak ada overflow. Tidak ada tindakan marketplace nyata; deployment produksi belum terverifikasi.
