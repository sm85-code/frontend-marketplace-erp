import type { ItemPesanan } from '@/api/types'

/** Shopee serves a shrunk copy under `<hash>_tn`; the same address without the suffix is the original upload. */
export const fotoAsli = (url: string) => url.replace(/_tn(?=$|[?#])/, '')

/** Square product photo; a grey box when the order carries none. With `buka`, a click opens the original in a new tab. */
export function FotoItem({ item, ukuran = 48, buka = false }: { item: Pick<ItemPesanan, 'nama_produk' | 'foto'>; ukuran?: number; buka?: boolean }) {
  const gaya = { width: ukuran, height: ukuran }
  const gambar = <img src={item.foto ?? ''} alt={item.nama_produk} loading="lazy" className="shrink-0 rounded-md border bg-muted object-cover" style={gaya} />
  return item.foto ? (
    buka ? (
      <a href={fotoAsli(item.foto)} target="_blank" rel="noopener noreferrer" title="Buka gambar asli" className="shrink-0" onClick={(e) => e.stopPropagation()}>
        {gambar}
      </a>
    ) : gambar
  ) : (
    <span role="img" aria-label={item.nama_produk} className="grid shrink-0 place-items-center rounded-md border bg-muted text-xs text-muted-foreground" style={gaya}>
      ?
    </span>
  )
}

/** Items of one order, each with photo, name, variant and quantity: similar product names stay tellable apart. */
export function ItemRingkas({ items, maks = items.length }: { items: ItemPesanan[]; maks?: number }) {
  if (!items.length) return <span>—</span>
  const sisa = items.length - maks
  return (
    <div className="space-y-1.5">
      {items.slice(0, maks).map((i) => (
        <div key={i.id} className="flex min-h-16 items-start gap-2">
          <FotoItem item={i} buka />
          <div className="min-w-0">
            <div className="text-sm leading-snug" title={i.nama_produk}>
              {i.nama_produk}
            </div>
            {i.model_name && <div className="text-sm font-medium">Varian: {i.model_name}</div>}
            <div className="teks-kecil text-muted-foreground">Jumlah: {i.qty}</div>
          </div>
        </div>
      ))}
      {sisa > 0 && <div className="teks-kecil text-muted-foreground">+{sisa} produk lainnya</div>}
    </div>
  )
}
