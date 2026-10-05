import type { KampanyeProduk } from '@/api/types'

/** Photo of one advertised product; a grey box with the first letters when the item has no photo in the catalogue. */
export function Foto({ produk, ukuran = 40 }: { produk: KampanyeProduk; ukuran?: number }) {
  const nama = produk.nama ?? `Produk ${produk.item_id}`
  return produk.foto ? (
    <img src={produk.foto} alt={nama} width={ukuran} height={ukuran} loading="lazy" className="shrink-0 rounded-md border bg-muted object-cover" style={{ width: ukuran, height: ukuran }} />
  ) : (
    <span role="img" aria-label={nama} className="grid shrink-0 place-items-center rounded-md border bg-muted text-xs text-muted-foreground" style={{ width: ukuran, height: ukuran }}>
      ?
    </span>
  )
}

/** First product photo with a "+N" badge for the rest: tells at a glance which product a campaign advertises. */
export function TumpukanFoto({ produk, jumlah }: { produk: KampanyeProduk[]; jumlah: number }) {
  if (jumlah === 0 || produk.length === 0) return <span className="teks-kecil w-10 shrink-0 text-center leading-tight text-muted-foreground">Dipilih sistem</span>
  const sisa = jumlah - 1
  return (
    <span className="relative shrink-0">
      <Foto produk={produk[0]} ukuran={40} />
      {sisa > 0 && (
        <span className="absolute -right-1.5 -bottom-1.5 rounded-full border bg-background px-1 text-[0.7rem] leading-4 font-semibold text-foreground" title={`${jumlah} produk`}>
          +{sisa}
        </span>
      )}
    </span>
  )
}
