import { useQuery } from '@tanstack/react-query'
import * as endpoints from '@/api/endpoints'
import { qk } from '@/api/keys'
import Spinner from '@/components/Spinner'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { rentangHarga, ukuranPaket } from '@/lib/katalog'

/** Dialog with everything about one catalogue product: all photos, full description, variants, size. */
export default function DetailProduk({ id, onTutup }: { id: string | null; onTutup: () => void }) {
  const { data: detail, isLoading } = useQuery({
    queryKey: qk.katalogOne(id ?? ''),
    queryFn: () => endpoints.getKatalog(id as string),
    enabled: !!id,
  })

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onTutup()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{detail?.nama ?? 'Memuat…'}</DialogTitle>
        </DialogHeader>
        {isLoading || !detail ? (
          <Spinner column label="Memuat detail…" />
        ) : (
          <div className="teks-data space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{detail.nama_toko}</Badge>
              <span className="font-medium">{rentangHarga(detail.harga_min, detail.harga_max)}</span>
              <span className="text-muted-foreground">stok Shopee: {detail.stok_shopee ?? '—'}</span>
              {detail.sku && <span className="font-mono">SKU {detail.sku}</span>}
            </div>
            {detail.foto.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {detail.foto.map((u) => (
                  <img key={u} src={u} alt="" loading="lazy" className="size-28 shrink-0 rounded-md border object-cover" />
                ))}
              </div>
            )}
            <p className="whitespace-pre-wrap">{detail.deskripsi || <em className="text-muted-foreground">Tanpa deskripsi</em>}</p>
            {detail.varian.length > 0 && (
              <div>
                <div className="mb-1 font-medium">Varian ({detail.varian.length})</div>
                <ul className="divide-y rounded-md border">
                  {detail.varian.map((v) => (
                    <li key={v.nama} className="flex justify-between gap-3 px-3 py-1.5">
                      <span>{v.nama}</span>
                      <span className="text-muted-foreground">
                        {rentangHarga(v.harga, v.harga)} · stok {v.stok ?? '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="text-muted-foreground">
              Berat {detail.berat_gram} g · {ukuranPaket(detail.panjang_cm, detail.lebar_cm, detail.tinggi_cm)}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
