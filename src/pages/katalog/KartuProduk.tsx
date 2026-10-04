import type { KatalogItem } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { labelStatusShopee, rentangHarga } from '@/lib/katalog'

/** One product as a photo card (the Grid view). */
export default function KartuProduk({
  item,
  dipilih,
  onUbah,
  onBuka,
}: {
  item: KatalogItem
  dipilih: boolean
  onUbah: (pilih: boolean) => void
  onBuka: () => void
}) {
  return (
    <div className={'relative overflow-hidden rounded-lg border bg-card ' + (dipilih ? 'ring-2 ring-primary' : '')}>
      <div className="absolute left-2 top-2 z-10 rounded bg-background/90 p-1">
        <Checkbox checked={dipilih} onCheckedChange={(v) => onUbah(v === true)} aria-label={`Pilih ${item.nama}`} />
      </div>
      <button type="button" onClick={onBuka} className="block w-full text-left">
        {item.foto_utama ? (
          <img src={item.foto_utama} alt="" loading="lazy" className="aspect-square w-full object-cover" />
        ) : (
          <div className="teks-kecil flex aspect-square w-full items-center justify-center bg-muted text-muted-foreground">Tanpa foto</div>
        )}
        <div className="teks-data space-y-1 p-2">
          <Badge variant="secondary" className="h-auto max-w-full whitespace-normal py-0.5 text-left leading-tight">
            {item.nama_toko}
          </Badge>
          <div className="line-clamp-2 min-h-[2.4em]">{item.nama}</div>
          <div className="font-semibold">{rentangHarga(item.harga_min, item.harga_max)}</div>
          <div className="teks-kecil flex flex-wrap items-center gap-1 text-muted-foreground">
            <span>stok {item.stok_shopee ?? '—'}</span>
            {item.jumlah_varian > 0 && <span>· {item.jumlah_varian} varian</span>}
            {item.status !== 'NORMAL' && <Badge variant="outline">{labelStatusShopee(item.status)}</Badge>}
            {item.dikirim_toko_id && <Badge>Sudah di toko web</Badge>}
          </div>
        </div>
      </button>
    </div>
  )
}
