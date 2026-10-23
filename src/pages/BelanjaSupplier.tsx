import HalamanOperasional from '@/pages/HalamanOperasional'

/**
 * Belanja Supplier: purchases of goods from suppliers (for now the non-wood catalogue products), typed by hand.
 * Later the supplier tab of Pemetaan Order may supply these amounts; that link is not built yet.
 */
export default function BelanjaSupplier() {
  return <HalamanOperasional jenis="supplier" judul="Belanja Supplier" deskripsi="Belanja barang ke supplier (produk katalog non kayu), dicatat manual per tanggal; tulis nama supplier di uraian. Tiap supplier masuk ke baris Arus Kas bernama sama yang berkategori Belanja supplier." />
}
