# Dashboard, katalog dan penugasan staf

Navigasi bawah semua role: Dashboard, Katalog, Chat, Pesanan, Lainnya. Produk/SKU tetap tersedia di menu Lainnya untuk owner/admin.

Staf mendapat komponen dashboard yang sama, tetapi seluruh ringkasan, hitungan status, penjualan harian, produk terlaris dan tanggal awal data dibatasi ke toko penugasannya. Stok kritis hanya SKU yang mempunyai listing pada toko tersebut; stok SKU ERP merupakan persediaan bersama. Tanpa penugasan, hasil kosong dan tidak membuka data toko lain.

Katalog staf menampilkan daftar, ringkasan filter, varian dan detail toko yang ditugaskan. Filter toko dan akses ID produk langsung divalidasi backend. Staf dapat sinkronisasi snapshot melalui antrean dengan batas toko yang sama. Publikasi, perubahan produk/promosi dan pengiriman katalog ke toko web tetap memerlukan owner/admin. Iklan dan Settlement tetap admin-only.

Untuk menugaskan: pilih staf, centang beberapa toko, lalu Tugaskan sekali. Toko yang sudah ditugaskan ke staf tersebut ditandai. Toko yang dimiliki staf lain tetap dapat dipilih: satu toko bisa mempunyai beberapa staf. Penugasan lama tidak dicabut. Gunakan Hapus pada satu baris untuk mencabut akses. Backend memvalidasi semua toko sebelum menambah penugasan; permintaan berulang tidak membuat duplikasi.

Verifikasi: browser HP390px untuk ketiga role (urutan nav, dashboard, katalog, detail staf), dialog penugasan multi-toko dengan checkbox kotak dan satu request; backend menguji scope daftar/detail/ringkasan/dashboard, staf tanpa penugasan, penolakan toko lain, multi-staf pada toko yang sama, pengulangan dan validasi sebelum penulisan. CI juga menjaga admin-only finance. Tidak ada tindakan marketplace nyata dilakukan.
