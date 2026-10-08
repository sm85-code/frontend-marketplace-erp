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
