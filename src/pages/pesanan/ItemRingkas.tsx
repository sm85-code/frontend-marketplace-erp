import type { ItemPesanan } from '@/api/types'

/** Square product photo; a grey box when the order carries none. */
export function FotoItem({ item, ukuran = 48 }: { item: Pick<ItemPesanan, 'nama_produk' | 'foto'>; ukuran?: number }) {
  const gaya = { width: ukuran, height: ukuran }
  return item.foto ? (
    <img src={item.foto} alt={item.nama_produk} loading="lazy" className="shrink-0 rounded-md border bg-muted object-cover" style={gaya} />
  ) : (
    <span role="img" aria-label={item.nama_produk} className="grid shrink-0 place-items-center rounded-md border bg-muted text-xs text-muted-foreground" style={gaya}>
      ?
    </span>
  )
}

/** Items of one order, each with photo, name, variant and quantity: similar product names stay tellable apart. */
export function ItemRingkas({ items, maks = 2 }: { items: ItemPesanan[]; maks?: number }) {
  if (!items.length) return <span>—</span>
  const sisa = items.length - maks
  return (
    <div className="space-y-1.5">
      {items.slice(0, maks).map((i) => (
        <div key={i.id} className="flex items-start gap-2">
          <FotoItem item={i} />
          <div className="min-w-0">
            <div className="line-clamp-2 text-sm leading-snug" title={i.nama_produk}>
              {i.nama_produk}
            </div>
            <div className="teks-kecil text-muted-foreground">
              {i.model_name ? `${i.model_name} · ` : ''}×{i.qty}
            </div>
          </div>
        </div>
      ))}
      {sisa > 0 && <div className="teks-kecil text-muted-foreground">+{sisa} produk lainnya</div>}
    </div>
  )
}
