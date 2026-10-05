import { fmtDate } from '@/api/client'
import type { KatalogItem } from '@/api/types'
import type { KolomTabel } from '@/components/daftar'
import { Badge } from '@/components/ui/badge'
import { labelStatusShopee, rentangHarga } from '@/lib/katalog'

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
      judul: 'item_name',
      kelas: 'min-w-[9rem] max-w-[10rem] md:min-w-[200px] md:max-w-[300px]',
      tetap: true,
      urut: { kunci: 'nama' },
      sel: (p) => (
        <button type="button" onClick={() => onBuka(p.id)} title={p.nama} className="line-clamp-2 text-left hover:underline">
          {p.nama}
        </button>
      ),
    },
    { kunci: 'sku', judul: 'item_sku', kelas: 'whitespace-nowrap font-mono', urut: { kunci: 'sku' }, sel: (p) => p.sku || <Kosong /> },
    {
      kunci: 'harga',
      judul: 'price_info.current_price',
      kelas: 'whitespace-nowrap font-semibold',
      urut: { kunci: 'harga', label: ['Termurah', 'Termahal'] },
      sel: (p) => rentangHarga(p.harga_min, p.harga_max),
    },
    {
      kunci: 'stok',
      judul: 'stock_info_v2',
      kelas: 'whitespace-nowrap',
      urut: { kunci: 'stok', arahAwal: 'desc', label: ['Tersedikit', 'Terbanyak'] },
      sel: (p) => p.stok_shopee ?? <Kosong />,
    },
    { kunci: 'varian', judul: 'tier_variation.name', kelas: 'whitespace-nowrap', sel: (p) => p.sumbu || "" },
    { kunci: 'nilai_varian', judul: 'option_list.option', kelas: 'min-w-[160px] max-w-[240px]', sel: (p) => p.nilai_varian ? <span className="line-clamp-2">{p.nilai_varian}</span> : "" },
    {
      kunci: 'berat',
      judul: 'weight',
      kelas: 'whitespace-nowrap',
      urut: { kunci: 'berat', label: ['Teringan', 'Terberat'] },
      sel: (p) => (p.berat_gram ? `${p.berat_gram / 1000} kg` : <Kosong />),
    },
    { kunci: 'package_length', judul: 'dimension.package_length', kelas: 'whitespace-nowrap', sel: (p) => p.panjang_cm ? `${p.panjang_cm} cm` : "" },
    { kunci: 'package_width', judul: 'dimension.package_width', kelas: 'whitespace-nowrap', sel: (p) => p.lebar_cm ? `${p.lebar_cm} cm` : "" },
    { kunci: 'package_height', judul: 'dimension.package_height', kelas: 'whitespace-nowrap', sel: (p) => p.tinggi_cm ? `${p.tinggi_cm} cm` : "" },
    {
      kunci: 'deskripsi',
      judul: 'description',
      bawaan: false,
      kelas: 'min-w-[240px] max-w-[340px]',
      sel: (p) => <div className="teks-kecil line-clamp-4 text-muted-foreground">{p.deskripsi_ringkas || '—'}</div>,
    },
    {
      kunci: 'status',
      judul: 'item_status',
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
    { kunci: 'itemId', judul: 'item_id', bawaan: false, kelas: 'font-mono', sel: (p) => p.item_id },
    { kunci: 'kategori', judul: 'category_id', bawaan: false, sel: (p) => p.category_id || "" },
    { kunci: 'merek', judul: 'brand.original_brand_name', bawaan: false, sel: (p) => p.brand || "" },
    { kunci: 'atribut', judul: 'attribute_list', bawaan: false, kelas: 'min-w-[180px]', sel: (p) => p.attribute_list || "" },
    { kunci: 'kondisi', judul: 'condition', bawaan: false, sel: (p) => p.condition || "" },
    { kunci: 'preorder', judul: 'pre_order', bawaan: false, sel: (p) => p.is_pre_order ? `${p.days_to_ship ?? ""} hari` : "" },
    { kunci: 'kurir', judul: 'logistic_info', bawaan: false, sel: (p) => p.logistic_info || "" },
    { kunci: 'promo', judul: 'has_promotion', bawaan: false, sel: (p) => p.has_promotion ? "Ya" : "" },
    { kunci: 'grosir', judul: 'wholesales', bawaan: false, sel: (p) => p.wholesales || "" },
    { kunci: 'video', judul: 'video_info', bawaan: false, sel: (p) => p.video_info ? "Ya" : "" },
    { kunci: 'ukuran_chart', judul: 'size_chart', bawaan: false, sel: (p) => p.size_chart || "" },
    { kunci: 'bahaya', judul: 'item_dangerous', bawaan: false, sel: (p) => p.item_dangerous ? "Ya" : "" },
    { kunci: 'dibuat', judul: 'create_time', bawaan: false, sel: (p) => p.create_time ? fmtDate(new Date(p.create_time * 1000).toISOString()) : "" },
    { kunci: 'diubah', judul: 'update_time', bawaan: false, sel: (p) => p.update_time ? fmtDate(new Date(p.update_time * 1000).toISOString()) : "" },

  ]
}
