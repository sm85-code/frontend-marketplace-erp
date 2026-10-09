import { fmtDate } from '@/api/client'
import type { KatalogItem, KatalogVarian } from '@/api/types'
import type { KolomTabel } from '@/components/daftar'
import { Badge } from '@/components/ui/badge'
import { fmtRp } from '@/api/client'
import { labelStatusShopee, labelStatusVarian, nilaiVarian, rentangHarga, teksBerat } from '@/lib/katalog'

const Kosong = () => <span className="text-muted-foreground">—</span>

/** A value the variant did not set itself: shown in muted text because Shopee uses the product's value for it. */
const Ikut = ({ children }: { children: React.ReactNode }) => (
  <span className="text-muted-foreground italic" title="Tidak diatur di varian ini: memakai nilai produk">
    {children}
  </span>
)
/** One line per tier, so tier_variation.name and option_list.option line up row by row in a two-tier variant. */
const Tumpuk = ({ baris }: { baris: string[] }) => (
  <span className="block">
    {baris.map((b, i) => (
      <span key={i} className="block whitespace-nowrap">
        {b}
      </span>
    ))}
  </span>
)

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
export function kolomKatalog(
  onBuka: (id: string) => void,
  varianTerbuka: (id: string) => boolean = () => false,
  onToggleVarian: (id: string) => void = () => undefined,
): KolomTabel<KatalogItem>[] {
  // A variant pulled before variants were stored per model has no weight/size/pre-order data at all: leave those cells
  // empty rather than presenting the product's values as the variant's.
  const ukuran = (induk: KatalogItem, v: KatalogVarian, sumbu: 'panjang' | 'lebar' | 'tinggi') => {
    if (v.model_id === undefined) return null
    const n = nilaiVarian(v, induk)[sumbu]
    if (!n.nilai) return <Kosong />
    return n.ikutProduk ? <Ikut>{n.nilai} cm</Ikut> : `${n.nilai} cm`
  }
  return [
    {
      kunci: 'foto',
      judul: 'Foto',
      sel: (p) => (p.foto[0] ? <Gambar src={p.foto[0]} ukuran="size-10" nama={p.nama} onBuka={() => onBuka(p.id)} /> : <Kosong />),
      selAnak: (v: KatalogVarian) => (v.foto ? <img src={v.foto} alt="" loading="lazy" className="ml-2 size-8 rounded border object-cover" /> : null),
    },
    {
      kunci: 'semuaFoto',
      judul: 'Semua Foto (maks. 5)',
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
      kunci: 'toko', bawaan: false,
      judul: 'Toko',
      kelas: 'min-w-[120px] font-medium',
      urut: { kunci: 'toko' },
      sel: (p) => p.nama_toko,
    },
    {
      kunci: 'nama',
      judul: 'Nama Produk',
      kelas: 'min-w-[9rem] max-w-[10rem] md:min-w-[200px] md:max-w-[300px]',
      tetap: true,
      urut: { kunci: 'nama' },
      sel: (p) => (
        <>
          <button type="button" onClick={() => onBuka(p.id)} title={p.nama} className="line-clamp-2 text-left hover:underline">
            {p.nama}
          </button>
          {!!p.varian?.length && (
            <button
              type="button"
              onClick={() => onToggleVarian(p.id)}
              aria-expanded={varianTerbuka(p.id)}
              className="teks-kecil mt-0.5 text-muted-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              {varianTerbuka(p.id) ? '▾ Sembunyikan' : '▸ Tampilkan'} {p.varian.length} varian
            </button>
          )}
        </>
      ),
      selAnak: (v: KatalogVarian) => <span className="teks-data pl-3 font-normal text-muted-foreground">↳ SKU {v.sku || v.model_id || '—'}</span>,
    },
    { kunci: 'sku', bawaan: false, judul: 'SKU', kelas: 'whitespace-nowrap font-mono', urut: { kunci: 'sku' }, sel: (p) => p.sku || <Kosong />, selAnak: (v: KatalogVarian) => v.sku || <Kosong /> },
    {
      kunci: 'harga',
      judul: 'Harga',
      rata: 'kanan',
      kelas: 'whitespace-nowrap font-semibold',
      urut: { kunci: 'harga', label: ['Termurah', 'Termahal'] },
      sel: (p) => rentangHarga(p.harga_min, p.harga_max),
      selAnak: (v: KatalogVarian) =>
        v.harga ? (
          <span>
            {fmtRp(v.harga)}
            {v.harga_asli && <span className="teks-kecil ml-1 font-normal text-muted-foreground line-through">{fmtRp(v.harga_asli)}</span>}
          </span>
        ) : (
          <Kosong />
        ),
    },
    {
      kunci: 'stok',
      judul: 'Stok',
      rata: 'kanan',
      kelas: 'whitespace-nowrap',
      urut: { kunci: 'stok', arahAwal: 'desc', label: ['Tersedikit', 'Terbanyak'] },
      sel: (p) => p.stok_shopee ?? <Kosong />,
      selAnak: (v: KatalogVarian) => v.stok ?? <Kosong />,
    },
    {
      kunci: 'varian', bawaan: false,
      judul: 'Jenis Varian',
      kelas: 'whitespace-nowrap',
      sel: (p) => p.sumbu || '',
      selAnak: (v: KatalogVarian) => (v.opsi?.length ? <Tumpuk baris={v.opsi.map((o) => o.tier)} /> : v.sumbu || ''),
    },
    {
      kunci: 'nilai_varian',
      judul: 'Pilihan Varian',
      kelas: 'min-w-[160px] max-w-[240px]',
      sel: (p) => (p.nilai_varian ? <span className="line-clamp-2">{p.nilai_varian}</span> : ''),
      selAnak: (v: KatalogVarian) => (v.opsi?.length ? <Tumpuk baris={v.opsi.map((o) => o.opsi)} /> : v.nama),
    },
    {
      kunci: 'berat', bawaan: false,
      judul: 'Berat',
      kelas: 'whitespace-nowrap',
      urut: { kunci: 'berat', label: ['Teringan', 'Terberat'] },
      sel: (p) => (p.berat_gram ? `${p.berat_gram / 1000} kg` : <Kosong />),
      selAnak: (v: KatalogVarian, p: KatalogItem) => {
        if (v.model_id === undefined) return null
        const b = nilaiVarian(v, p).berat
        return b.nilai ? (b.ikutProduk ? <Ikut>{teksBerat(b.nilai)}</Ikut> : teksBerat(b.nilai)) : <Kosong />
      },
    },
    { kunci: 'package_length', bawaan: false, judul: 'Panjang Paket', kelas: 'whitespace-nowrap', sel: (p) => p.panjang_cm ? `${p.panjang_cm} cm` : "", selAnak: (v: KatalogVarian, p: KatalogItem) => ukuran(p, v, 'panjang') },
    { kunci: 'package_width', bawaan: false, judul: 'Lebar Paket', kelas: 'whitespace-nowrap', sel: (p) => p.lebar_cm ? `${p.lebar_cm} cm` : "", selAnak: (v: KatalogVarian, p: KatalogItem) => ukuran(p, v, 'lebar') },
    { kunci: 'package_height', bawaan: false, judul: 'Tinggi Paket', kelas: 'whitespace-nowrap', sel: (p) => p.tinggi_cm ? `${p.tinggi_cm} cm` : "", selAnak: (v: KatalogVarian, p: KatalogItem) => ukuran(p, v, 'tinggi') },
    {
      kunci: 'deskripsi',
      judul: 'Deskripsi',
      bawaan: false,
      kelas: 'min-w-[240px] max-w-[340px]',
      sel: (p) => <div className="teks-kecil line-clamp-4 text-muted-foreground">{p.deskripsi_ringkas || '—'}</div>,
    },
    {
      kunci: 'status',
      judul: 'Status',
      kelas: 'whitespace-nowrap',
      urut: { kunci: 'status', label: ['Aktif dulu', 'Tidak aktif dulu'] },
      sel: (p) => <Badge variant={p.status === 'NORMAL' ? 'secondary' : 'outline'}>{labelStatusShopee(p.status)}</Badge>,
      selAnak: (v: KatalogVarian) => (labelStatusVarian(v.status) ? <Badge variant="outline">{labelStatusVarian(v.status)}</Badge> : null),
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
    { kunci: 'itemId', judul: 'ID Produk', bawaan: false, kelas: 'font-mono', sel: (p) => p.item_id },
    { kunci: 'kategori', judul: 'ID Kategori', bawaan: false, sel: (p) => p.category_id || "" },
    { kunci: 'merek', judul: 'Merek', bawaan: false, sel: (p) => p.brand || "" },
    { kunci: 'atribut', judul: 'Atribut', bawaan: false, kelas: 'min-w-[180px]', sel: (p) => p.attribute_list || "" },
    { kunci: 'kondisi', judul: 'Kondisi', bawaan: false, sel: (p) => p.condition || "" },
    {
      kunci: 'preorder',
      judul: 'Pre-Order',
      sel: (p) => (p.is_pre_order ? `${p.days_to_ship ?? ''} hari` : ''),
      selAnak: (v: KatalogVarian, p: KatalogItem) => {
        if (v.model_id === undefined) return null
        const po = nilaiVarian(v, p).preorder
        if (!po.aktif) return po.ikutProduk ? null : <span className="text-muted-foreground">Tidak</span>
        const teks = `Ya${po.hari ? ` · ${po.hari} hari` : ''}`
        return po.ikutProduk ? <Ikut>{teks}</Ikut> : teks
      },
    },
    { kunci: 'kurir', judul: 'Pengiriman', bawaan: false, sel: (p) => p.logistic_info || "" },
    { kunci: 'promo', judul: 'Sedang Promo', bawaan: false, sel: (p) => p.has_promotion ? "Ya" : "" },
    { kunci: 'grosir', judul: 'Harga Grosir', bawaan: false, sel: (p) => p.wholesales || "" },
    { kunci: 'video', judul: 'Ada Video', bawaan: false, sel: (p) => p.video_info ? "Ya" : "" },
    { kunci: 'ukuran_chart', judul: 'Panduan Ukuran', bawaan: false, sel: (p) => p.size_chart || "" },
    { kunci: 'bahaya', judul: 'Barang Berbahaya', bawaan: false, sel: (p) => p.item_dangerous ? "Ya" : "" },
    { kunci: 'dibuat', judul: 'Dibuat di Shopee', bawaan: false, sel: (p) => p.create_time ? fmtDate(new Date(p.create_time * 1000).toISOString()) : "" },
    { kunci: 'diubah', judul: 'Diubah di Shopee', bawaan: false, sel: (p) => p.update_time ? fmtDate(new Date(p.update_time * 1000).toISOString()) : "" },

  ]
}
