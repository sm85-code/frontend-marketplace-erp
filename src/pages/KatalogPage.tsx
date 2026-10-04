import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import type { KatalogItem, KirimKatalogHasil } from '@/api/types'
import { useConfirm } from '@/components/ConfirmProvider'
import Spinner from '@/components/Spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { bagiBatch, rentangHarga, ringkasKirim } from '@/lib/katalog'

const PER_HALAMAN = 48

export default function KatalogPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [akunId, setAkunId] = useState<string>('') // '' = Semua
  const [cari, setCari] = useState('')
  const [q, setQ] = useState('')
  const [belumDikirim, setBelumDikirim] = useState(false)
  const [halaman, setHalaman] = useState(1)
  const [dipilih, setDipilih] = useState<Map<string, KatalogItem>>(new Map())
  const [detailId, setDetailId] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(cari.trim())
      setHalaman(1)
    }, 300)
    return () => clearTimeout(t)
  }, [cari])

  function pilihToko(id: string) {
    setAkunId(id)
    setHalaman(1)
  }

  const { data: ringkasan } = useQuery({ queryKey: qk.katalogRingkasan(), queryFn: endpoints.ringkasanKatalog })
  const params = { akun_id: akunId || undefined, q: q || undefined, belum_dikirim: belumDikirim, halaman, per_halaman: PER_HALAMAN }
  const { data, isLoading, isFetching } = useQuery({
    queryKey: qk.katalog(params),
    queryFn: () => endpoints.listKatalog(params),
    placeholderData: (prev) => prev,
  })
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: qk.katalogOne(detailId ?? ''),
    queryFn: () => endpoints.getKatalog(detailId as string),
    enabled: !!detailId,
  })

  const kirimMut = useMutation({
    mutationFn: async (items: KatalogItem[]) => {
      const hasil: KirimKatalogHasil[] = []
      for (const batch of bagiBatch(items)) {
        const r = await endpoints.kirimKatalogKeToko({ ids: batch.map((i) => i.id) })
        hasil.push(...r.hasil)
      }
      return hasil
    },
    onSuccess: (hasil) => {
      toast.success(ringkasKirim(hasil))
      setDipilih(new Map())
      qc.invalidateQueries({ queryKey: ['katalog'] })
    },
    onError: (e) => {
      toast.error(getApiError(e, 'Gagal mengirim ke toko web'))
      qc.invalidateQueries({ queryKey: ['katalog'] })
    },
  })

  function toggle(item: KatalogItem) {
    setDipilih((prev) => {
      const next = new Map(prev)
      if (next.has(item.id)) next.delete(item.id)
      else next.set(item.id, item)
      return next
    })
  }

  async function kirim() {
    const items = [...dipilih.values()]
    const ok = await confirm({
      title: `Kirim ${items.length} produk ke toko web?`,
      description:
        'Produk disalin ke ampelkuning.com sebagai DRAFT (belum tayang) dengan stok 0, lengkap dengan foto dan varian. ' +
        'Atur stok, harga, lalu aktifkan lewat dashboard admin. Tidak ada yang diubah di Shopee, ' +
        'dan perubahan di dashboard admin tidak kembali ke sini.',
    })
    if (ok) kirimMut.mutate(items)
  }

  const items = data?.items ?? []
  const totalHalaman = data ? Math.max(1, Math.ceil(data.total / data.per_halaman)) : 1
  const semuaHalamanDipilih = items.length > 0 && items.every((i) => dipilih.has(i.id))

  function pilihHalamanIni() {
    setDipilih((prev) => {
      const next = new Map(prev)
      if (semuaHalamanDipilih) items.forEach((i) => next.delete(i.id))
      else items.forEach((i) => !i.dikirim_toko_id && next.set(i.id, i))
      return next
    })
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-h1 font-heading text-2xl font-bold">Katalog Shopee</h1>
          <p className="text-sm text-muted-foreground">
            Produk dari semua toko, apa adanya. Pilih yang sesuai, lalu kirim ke toko web.
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter toko">
        <FilterChip aktif={akunId === ''} onClick={() => pilihToko('')}>
          Semua <span className="opacity-70">({ringkasan?.total ?? 0})</span>
        </FilterChip>
        {(ringkasan?.toko ?? []).map((t) => (
          <FilterChip key={t.akun_id} aktif={akunId === t.akun_id} onClick={() => pilihToko(t.akun_id)}>
            {t.nama_toko} <span className="opacity-70">({t.jumlah})</span>
          </FilterChip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="max-w-xs"
          placeholder="Cari nama atau SKU…"
          value={cari}
          onChange={(e) => setCari(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={belumDikirim}
            onCheckedChange={(v) => {
              setBelumDikirim(v === true)
              setHalaman(1)
            }}
          />
          Belum dikirim ke toko web
        </label>
        <Button variant="outline" size="sm" onClick={pilihHalamanIni} disabled={!items.length}>
          {semuaHalamanDipilih ? 'Batal pilih halaman ini' : 'Pilih halaman ini'}
        </Button>
        {isFetching && !isLoading && <Spinner size={18} />}
      </div>

      {isLoading ? (
        <Spinner column label="Memuat katalog…" />
      ) : items.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          {ringkasan?.total
            ? 'Tidak ada produk yang cocok dengan filter ini.'
            : 'Katalog masih kosong. Buka menu Toko, lalu klik "Tarik Produk" pada toko Shopee.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {items.map((item) => (
            <KartuProduk
              key={item.id}
              item={item}
              dipilih={dipilih.has(item.id)}
              onToggle={() => toggle(item)}
              onBuka={() => setDetailId(item.id)}
            />
          ))}
        </div>
      )}

      {data && data.total > data.per_halaman && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Button variant="outline" size="sm" disabled={halaman <= 1} onClick={() => setHalaman((h) => h - 1)}>
            Sebelumnya
          </Button>
          <span>
            Halaman {halaman} / {totalHalaman} · {data.total} produk
          </span>
          <Button variant="outline" size="sm" disabled={halaman >= totalHalaman} onClick={() => setHalaman((h) => h + 1)}>
            Berikutnya
          </Button>
        </div>
      )}

      {dipilih.size > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-30 flex justify-center px-4 md:bottom-4">
          <div className="flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border bg-background p-3 shadow-lg">
            <span className="text-sm font-medium">{dipilih.size} produk dipilih</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDipilih(new Map())} disabled={kirimMut.isPending}>
                Batal
              </Button>
              <Button size="sm" onClick={kirim} disabled={kirimMut.isPending}>
                {kirimMut.isPending ? 'Mengirim…' : 'Kirim ke toko web'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.nama ?? 'Memuat…'}</DialogTitle>
          </DialogHeader>
          {detailLoading || !detail ? (
            <Spinner column label="Memuat detail…" />
          ) : (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{detail.nama_toko}</Badge>
                <span className="font-medium">{rentangHarga(detail.harga_min, detail.harga_max)}</span>
                <span className="text-muted-foreground">stok Shopee: {detail.stok_shopee ?? '—'}</span>
                {detail.sku && <span className="font-mono text-xs">SKU {detail.sku}</span>}
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
                Berat {detail.berat_gram} g · {detail.panjang_cm}×{detail.lebar_cm}×{detail.tinggi_cm} cm
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FilterChip({ aktif, onClick, children }: { aktif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={aktif}
      onClick={onClick}
      className={
        'shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ' +
        (aktif ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')
      }
    >
      {children}
    </button>
  )
}

function KartuProduk({
  item,
  dipilih,
  onToggle,
  onBuka,
}: {
  item: KatalogItem
  dipilih: boolean
  onToggle: () => void
  onBuka: () => void
}) {
  return (
    <div className={'relative overflow-hidden rounded-lg border bg-card ' + (dipilih ? 'ring-2 ring-primary' : '')}>
      <div className="absolute left-2 top-2 z-10 rounded bg-background/90 p-1">
        <Checkbox checked={dipilih} onCheckedChange={onToggle} aria-label={`Pilih ${item.nama}`} />
      </div>
      <button type="button" onClick={onBuka} className="block w-full text-left">
        {item.foto_utama ? (
          <img src={item.foto_utama} alt="" loading="lazy" className="aspect-square w-full object-cover" />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-muted text-xs text-muted-foreground">
            Tanpa foto
          </div>
        )}
        <div className="space-y-1 p-2">
          <Badge variant="secondary" className="h-auto max-w-full whitespace-normal py-0.5 text-left leading-tight">
            {item.nama_toko}
          </Badge>
          <div className="line-clamp-2 min-h-[2.5rem] text-sm">{item.nama}</div>
          <div className="text-sm font-semibold">{rentangHarga(item.harga_min, item.harga_max)}</div>
          <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <span>stok {item.stok_shopee ?? '—'}</span>
            {item.jumlah_varian > 0 && <span>· {item.jumlah_varian} varian</span>}
            {item.status !== 'NORMAL' && <Badge variant="outline">Tidak tayang</Badge>}
            {item.dikirim_toko_id && <Badge>Sudah di toko web</Badge>}
          </div>
        </div>
      </button>
    </div>
  )
}
