import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Columns3, LayoutGrid, List } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { fmtDate, getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import type { KatalogItem, KirimKatalogHasil } from '@/api/types'
import { useConfirm } from '@/components/ConfirmProvider'
import Spinner from '@/components/Spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  bacaKolom,
  bagiBatch,
  KOLOM_BAWAAN,
  KOLOM_KATALOG,
  rentangHarga,
  ringkasKirim,
  ukuranPaket,
  URUTAN_KATALOG,
  type KolomKatalog,
} from '@/lib/katalog'

const KUNCI_TAMPILAN = 'katalog.tampilan'
const KUNCI_KOLOM = 'katalog.kolom'

function bacaSimpan(kunci: string): string | null {
  try {
    return localStorage.getItem(kunci)
  } catch {
    return null
  }
}

function tulisSimpan(kunci: string, nilai: string) {
  try {
    localStorage.setItem(kunci, nilai)
  } catch {
    /* private mode: the choice just is not remembered */
  }
}

export default function KatalogPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [akunId, setAkunId] = useState<string>('') // '' = Semua
  const [cari, setCari] = useState('')
  const [q, setQ] = useState('')
  const [belumDikirim, setBelumDikirim] = useState(false)
  const [halaman, setHalaman] = useState(1)
  const [tampilan, setTampilan] = useState<'grid' | 'list'>(() => (bacaSimpan(KUNCI_TAMPILAN) === 'list' ? 'list' : 'grid'))
  const [kolom, setKolom] = useState<KolomKatalog[]>(() => bacaKolom(bacaSimpan(KUNCI_KOLOM)))
  const [urut, setUrut] = useState<string>('toko')
  const [perHalaman, setPerHalaman] = useState(48)
  const [dipilih, setDipilih] = useState<Map<string, KatalogItem>>(new Map())
  const [detailId, setDetailId] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(cari.trim())
      setHalaman(1)
    }, 300)
    return () => clearTimeout(t)
  }, [cari])

  function ubahTampilan(t: 'grid' | 'list') {
    setTampilan(t)
    tulisSimpan(KUNCI_TAMPILAN, t)
  }

  function ubahKolom(key: KolomKatalog, aktif: boolean) {
    const next = KOLOM_KATALOG.map((k) => k.key).filter((k) => (k === key ? aktif : kolom.includes(k)))
    if (!next.length) return // at least one column stays on
    setKolom(next)
    tulisSimpan(KUNCI_KOLOM, JSON.stringify(next))
  }

  function pilihToko(id: string) {
    setAkunId(id)
    setHalaman(1)
  }

  const { data: ringkasan } = useQuery({ queryKey: qk.katalogRingkasan(), queryFn: endpoints.ringkasanKatalog })
  const params = { akun_id: akunId || undefined, q: q || undefined, belum_dikirim: belumDikirim, urut, halaman, per_halaman: perHalaman }
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex overflow-hidden rounded-md border" role="group" aria-label="Tampilan">
          <button
            type="button"
            onClick={() => ubahTampilan('grid')}
            aria-pressed={tampilan === 'grid'}
            className={'flex items-center gap-1.5 px-3 py-1.5 text-sm ' + (tampilan === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}
          >
            <LayoutGrid className="size-4" /> Grid
          </button>
          <button
            type="button"
            onClick={() => ubahTampilan('list')}
            aria-pressed={tampilan === 'list'}
            className={'flex items-center gap-1.5 px-3 py-1.5 text-sm ' + (tampilan === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted')}
          >
            <List className="size-4" /> List
          </button>
        </div>
        <Select
          value={urut}
          onValueChange={(v) => {
            setUrut(v)
            setHalaman(1)
          }}
        >
          <SelectTrigger className="w-[260px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {URUTAN_KATALOG.map((u) => (
              <SelectItem key={u.value} value={u.value}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(perHalaman)}
          onValueChange={(v) => {
            setPerHalaman(Number(v))
            setHalaman(1)
          }}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[24, 48, 100].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} / halaman
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {tampilan === 'list' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 className="mr-1.5 size-4" /> Kolom ({kolom.length}/{KOLOM_KATALOG.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 space-y-2">
              <div className="text-sm font-medium">Kolom yang ditampilkan</div>
              <div className="max-h-72 space-y-1.5 overflow-y-auto">
                {KOLOM_KATALOG.map((k) => (
                  <label key={k.key} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={kolom.includes(k.key)} onCheckedChange={(v) => ubahKolom(k.key, v === true)} />
                    {k.label}
                  </label>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setKolom(KOLOM_BAWAAN)
                  tulisSimpan(KUNCI_KOLOM, JSON.stringify(KOLOM_BAWAAN))
                }}
              >
                Kembalikan bawaan
              </Button>
            </PopoverContent>
          </Popover>
        )}
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
        tampilan === 'list' ? (
          <TabelProduk
            items={items}
            kolom={kolom}
            dipilih={dipilih}
            semuaDipilih={semuaHalamanDipilih}
            onToggle={toggle}
            onToggleSemua={pilihHalamanIni}
            onBuka={setDetailId}
          />
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
        )
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
                Berat {detail.berat_gram} g · {ukuranPaket(detail.panjang_cm, detail.lebar_cm, detail.tinggi_cm)}
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

const LABEL_KOLOM = Object.fromEntries(KOLOM_KATALOG.map((k) => [k.key, k.label])) as Record<KolomKatalog, string>

function Gambar({ src, ukuran, onClick }: { src: string; ukuran: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0">
      <img src={src} alt="" loading="lazy" className={`${ukuran} rounded border object-cover`} />
    </button>
  )
}

function TabelProduk({
  items,
  kolom,
  dipilih,
  semuaDipilih,
  onToggle,
  onToggleSemua,
  onBuka,
}: {
  items: KatalogItem[]
  kolom: KolomKatalog[]
  dipilih: Map<string, KatalogItem>
  semuaDipilih: boolean
  onToggle: (item: KatalogItem) => void
  onToggleSemua: () => void
  onBuka: (id: string) => void
}) {
  function sel(k: KolomKatalog, item: KatalogItem) {
    const buka = () => onBuka(item.id)
    switch (k) {
      case 'foto':
        return item.foto[0] ? <Gambar src={item.foto[0]} ukuran="size-16" onClick={buka} /> : <span className="text-xs text-muted-foreground">—</span>
      case 'semuaFoto':
        return item.foto.length ? (
          <div className="flex gap-1">
            {item.foto.map((u) => (
              <Gambar key={u} src={u} ukuran="size-12" onClick={buka} />
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )
      case 'toko':
        return <span className="font-medium">{item.nama_toko}</span>
      case 'nama':
        return (
          <button type="button" onClick={buka} className="text-left hover:underline">
            {item.nama}
          </button>
        )
      case 'sku':
        return <span className="font-mono text-xs">{item.sku || '—'}</span>
      case 'harga':
        return <span className="whitespace-nowrap font-semibold">{rentangHarga(item.harga_min, item.harga_max)}</span>
      case 'stok':
        return item.stok_shopee ?? '—'
      case 'varian':
        return item.jumlah_varian || '—'
      case 'berat':
        return item.berat_gram ? `${item.berat_gram} g` : '—'
      case 'ukuran':
        return <span className="whitespace-nowrap">{ukuranPaket(item.panjang_cm, item.lebar_cm, item.tinggi_cm)}</span>
      case 'deskripsi':
        return <div className="line-clamp-4 text-xs text-muted-foreground">{item.deskripsi_ringkas || '—'}</div>
      case 'status':
        return item.status === 'NORMAL' ? <Badge variant="secondary">Tayang</Badge> : <Badge variant="outline">Tidak tayang</Badge>
      case 'dikirim':
        return item.dikirim_toko_id ? <Badge>Sudah</Badge> : <span className="text-xs text-muted-foreground">Belum</span>
      case 'diambil':
        return <span className="whitespace-nowrap text-xs">{fmtDate(item.diambil_at)}</span>
      case 'itemId':
        return <span className="font-mono text-xs">{item.item_id}</span>
    }
  }

  const lebar: Partial<Record<KolomKatalog, string>> = {
    nama: 'min-w-[220px] max-w-[320px]',
    deskripsi: 'min-w-[260px] max-w-[360px]',
    toko: 'min-w-[140px]',
    semuaFoto: 'min-w-[290px]',
    sku: 'whitespace-nowrap',
    berat: 'whitespace-nowrap',
    stok: 'whitespace-nowrap',
    status: 'whitespace-nowrap',
    dikirim: 'whitespace-nowrap',
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={semuaDipilih} onCheckedChange={onToggleSemua} aria-label="Pilih semua di halaman ini" />
            </TableHead>
            {kolom.map((k) => (
              <TableHead key={k} className="whitespace-nowrap">
                {LABEL_KOLOM[k]}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} data-state={dipilih.has(item.id) ? 'selected' : undefined} className={dipilih.has(item.id) ? 'bg-primary/5' : ''}>
              <TableCell>
                <Checkbox checked={dipilih.has(item.id)} onCheckedChange={() => onToggle(item)} aria-label={`Pilih ${item.nama}`} />
              </TableCell>
              {kolom.map((k) => (
                <TableCell key={k} className={lebar[k] ?? ''}>
                  {sel(k, item)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
