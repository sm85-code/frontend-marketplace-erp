import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listKatalog } from '@/api/endpoints'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { rentangHarga } from '@/lib/katalog'
import QueryError from '@/components/QueryError'
export default function PilihanProdukToko({
  akunId,
  onPilih,
}: {
  akunId: string
  onPilih: (itemId: string) => void
}) {
  const [q, setQ] = useState('')
  const data = useQuery({
    queryKey: ['katalog', 'pilih-iklan', akunId, q],
    queryFn: () =>
      listKatalog({
        akun_id: akunId,
        q: q || undefined,
        halaman: 1,
        per_halaman: 10,
      }),
    enabled: !!akunId,
  })
  return (
    <details className="rounded-lg border p-3">
      <summary className="cursor-pointer font-medium">
        Pilih produk dari katalog toko
      </summary>
      <div className="mt-3 space-y-2">
        <Input
          aria-label="Cari produk untuk iklan"
          placeholder="Nama atau SKU…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {data.error && <QueryError error={data.error} retry={data.refetch} />}
        <div className="max-h-72 space-y-2 overflow-auto">
          {data.data?.items.map((p) => (
            <Button
              className="h-auto w-full justify-start whitespace-normal py-2 text-left"
              key={p.id}
              variant="outline"
              onClick={() => onPilih(p.item_id)}
            >
              {p.foto[0] && (
                <img
                  src={p.foto[0]}
                  alt=""
                  className="size-12 rounded object-cover"
                />
              )}
              <span>
                {p.nama}
                <small className="block">
                  {rentangHarga(p.harga_min, p.harga_max)} · {p.jumlah_varian}{' '}
                  varian
                </small>
              </span>
            </Button>
          ))}
        </div>
        {data.data?.items.length === 0 && (
          <p>Produk tidak ditemukan. Sinkronkan katalog bila belum tersedia.</p>
        )}
      </div>
    </details>
  )
}
