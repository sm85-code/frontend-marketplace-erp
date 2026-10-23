import HalamanOperasional from '@/pages/HalamanOperasional'

/** Belanja Tukang: payments to tukang, typed by hand; same flow as Belanja Supplier. */
export default function BelanjaTukang() {
  return <HalamanOperasional jenis="tukang" judul="Belanja Tukang" deskripsi="Pembayaran ke tukang, dicatat manual per tanggal; tulis nama tukang di uraian. Tiap tukang masuk ke baris Arus Kas bernama sama yang berkategori Belanja Tukang." />
}
