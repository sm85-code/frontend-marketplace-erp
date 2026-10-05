import { fmtDate } from '@/api/client'
import type { KatalogItem } from '@/api/types'
import type { KolomTabel } from '@/components/daftar'
import { Badge } from '@/components/ui/badge'
import { labelStatusShopee, rentangHarga, ukuranPaket } from '@/lib/katalog'

const Kosong = () => <span className="text-muted-foreground">—</span>

function Gambar({ src, ukuran, nama, onBuka }: { src: string; ukuran: string; nama: string; onBuka: () => void }) {
  return (
    <button
      type="button"
      onClick={onBuka}
      aria-label={`Lihat detail ${nama}`}
      className="shrink-0 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <img src={src} alt="" loading="lazy" className={`${ukuran} rounded border object-cover`} />
    </button>
  )
}

/**
 * Every column of the catalogue list, declared once. The same list feeds the table (desktop), the cards
 * (phone), the column picker and the sort dropdown. `urut.kunci` must be a sort key the API knows.
 */
export function kolomKatalog(onBuka: (id: string) => void): KolomTabel<KatalogItem>[] {
  return [
    {
      kunci: 'foto',
      judul: 'Foto',
      sel: (p) => (p.foto[0] ? <Gambar src={p.foto[0]} ukuran="size-10" nama={p.nama} onBuka={() => onBuka(p.id)} /> : <Kosong />),
    },
    {
      kunci: 'semuaFoto',
      judul: 'Semua foto (maks. 5)',
      bawaan: false,
      kelas: 'min-w-[270px]',
      sel: (p) =>
        p.foto.length ? (
          <div className="flex gap-1">
            {p.foto.map((u) => (
              <Gambar key={u} src={u} ukuran="size-9" nama={p.nama} onBuka={() => onBuka(p.id)} />
            ))}
          </div>
        ) : (
          <Kosong />
        ),
    },
    {
      kunci: 'toko',
      judul: 'Toko',
      kelas: 'min-w-[120px] font-medium',
      urut: { kunci: 'toko' },
      sel: (p) => p.nama_toko,
    },
    {
      kunci: 'nama',
      judul: 'Nama produk',
      kelas: 'min-w-[9rem] max-w-[10rem] md:min-w-[200px] md:max-w-[300px]',
      tetap: true,
      urut: { kunci: 'nama' },
      sel: (p) => (
        <button type="button" onClick={() => onBuka(p.id)} title={p.nama} className="line-clamp-2 text-left hover:underline">
          {p.nama}
        </button>
      ),
    },
    { kunci: 'sku', judul: 'SKU', kelas: 'whitespace-nowrap font-mono', urut: { kunci: 'sku' }, sel: (p) => p.sku || <Kosong /> },
    {
      kunci: 'harga',
      judul: 'Harga',
      kelas: 'whitespace-nowrap font-semibold',
      urut: { kunci: 'harga', label: ['Termurah', 'Termahal'] },
      sel: (p) => rentangHarga(p.harga_min, p.harga_max),
    },
    {
      kunci: 'stok',
      judul: 'Stok',
      kelas: 'whitespace-nowrap',
      urut: { kunci: 'stok', arahAwal: 'desc', label: ['Tersedikit', 'Terbanyak'] },
      sel: (p) => p.stok_shopee ?? <Kosong />,
    },
    { kunci: 'varian', judul: 'Varian', kelas: 'whitespace-nowrap', sel: (p) => p.sumbu || "" },
    { kunci: 'nilai_varian', judul: 'Nilai varian', kelas: 'min-w-[160px] max-w-[240px]', sel: (p) => p.nilai_varian ? <span className="line-clamp-2">{p.nilai_varian}</span> : "" },
    {
      kunci: 'berat',
      judul: 'Berat',
      kelas: 'whitespace-nowrap',
      urut: { kunci: 'berat', label: ['Teringan', 'Terberat'] },
      sel: (p) => (p.berat_gram ? `${p.berat_gram} g` : <Kosong />),
    },
    {
      kunci: 'ukuran',
      judul: 'Ukuran (P×L×T)',
      bawaan: false,
      kelas: 'whitespace-nowrap',
      sel: (p) => ukuranPaket(p.panjang_cm, p.lebar_cm, p.tinggi_cm),
    },
    {
      kunci: 'deskripsi',
      judul: 'Deskripsi (ringkas)',
      bawaan: false,
      kelas: 'min-w-[240px] max-w-[340px]',
      sel: (p) => <div className="teks-kecil line-clamp-4 text-muted-foreground">{p.deskripsi_ringkas || '—'}</div>,
    },
    {
      kunci: 'status',
      judul: 'Status tayang',
      kelas: 'whitespace-nowrap',
      urut: { kunci: 'status', label: ['Aktif dulu', 'Tidak aktif dulu'] },
      sel: (p) => <Badge variant={p.status === 'NORMAL' ? 'secondary' : 'outline'}>{labelStatusShopee(p.status)}</Badge>,
    },
    {
      kunci: 'dikirim',
      judul: 'Di toko web',
      kelas: 'whitespace-nowrap',
      urut: { kunci: 'dikirim', label: ['Belum dulu', 'Sudah dulu'] },
      sel: (p) => (p.dikirim_toko_id ? <Badge>Sudah</Badge> : <span className="text-muted-foreground">Belum</span>),
    },
    {
      kunci: 'diambil',
      judul: 'Terakhir disinkronkan',
      bawaan: false,
      kelas: 'whitespace-nowrap',
      urut: { kunci: 'diambil', arahAwal: 'desc', label: ['Terlama', 'Terbaru'] },
      sel: (p) => fmtDate(p.diambil_at),
    },
    { kunci: 'itemId', judul: 'ID produk Shopee', bawaan: false, kelas: 'font-mono', sel: (p) => p.item_id },
    { kunci: 'kategori', judul: 'Kategori', bawaan: false, sel: (p) => p.category_id || "" },
    { kunci: 'merek', judul: 'Merek', bawaan: false, sel: (p) => p.brand || "" },
    { kunci: 'atribut', judul: 'Atribut', bawaan: false, kelas: 'min-w-[180px]', sel: (p) => p.attribute_list || "" },
    { kunci: 'kondisi', judul: 'Kondisi', bawaan: false, sel: (p) => p.condition || "" },
    { kunci: 'preorder', judul: 'Preorder', bawaan: false, sel: (p) => p.is_pre_order ? `${p.days_to_ship ?? ""} hari` : "" },
    { kunci: 'kurir', judul: 'Kurir', bawaan: false, sel: (p) => p.logistic_info || "" },
    { kunci: 'promo', judul: 'Promo', bawaan: false, sel: (p) => p.has_promotion ? "Ya" : "" },
    { kunci: 'grosir', judul: 'Grosir', bawaan: false, sel: (p) => p.wholesales || "" },
    { kunci: 'video', judul: 'Video', bawaan: false, sel: (p) => p.video_info ? "Ya" : "" },
    { kunci: 'ukuran_chart', judul: 'Bagan ukuran', bawaan: false, sel: (p) => p.size_chart || "" },
    { kunci: 'bahaya', judul: 'Berbahaya', bawaan: false, sel: (p) => p.item_dangerous ? "Ya" : "" },
    { kunci: 'dibuat', judul: 'Dibuat', bawaan: false, sel: (p) => p.create_time ? fmtDate(new Date(p.create_time * 1000).toISOString()) : "" },
    { kunci: 'diubah', judul: 'Diubah', bawaan: false, sel: (p) => p.update_time ? fmtDate(new Date(p.update_time * 1000).toISOString()) : "" },

  ]
}
