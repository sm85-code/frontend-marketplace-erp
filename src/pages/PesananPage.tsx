import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import type { TemplateResi } from '@/api/endpoints'
import type { Pesanan, TahapPesanan } from '@/api/types'
import { fmtDate, fmtDateTime, fmtRp, fmtTime, getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import { useConfirm } from '@/components/ConfirmProvider'
import Medan from '@/components/Medan'
import Spinner from '@/components/Spinner'
import TableShell from '@/components/TableShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PLATFORM_LABELS } from '@/config/roles'
import { PRESET_LABEL, rentangTanggal, type PresetTanggal } from '@/lib/rentang'
import {
  TAHAP_LABELS,
  TAHAP_ORDER,
  URUTAN_PESANAN,
  bisaDicetak,
  bisaDiproses,
  kelompokResi,
  ringkasItem,
  labelStatus,
  pecahBatch,
  sudahDicetak,
  type FilterResi,
} from '@/lib/pesanan'

const emptyItem = { nama_produk: '', harga_satuan: '', qty: '1' }
const PER_HALAMAN = 50
const SEMUA = 'semua' // a Select item cannot have an empty value

export default function PesananPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [tahap, setTahap] = useState<TahapPesanan | ''>('')
  const [akunId, setAkunId] = useState('')
  const [cari, setCari] = useState('')
  const [q, setQ] = useState('')
  const [preset, setPreset] = useState<PresetTanggal>('semua')
  const [kustom, setKustom] = useState({ dari: '', sampai: '' })
  const [urut, setUrut] = useState('terbaru')
  const [halaman, setHalaman] = useState(1)
  const [terpilih, setTerpilih] = useState<Map<string, Pesanan>>(new Map())
  const [filterResi, setFilterResi] = useState<FilterResi>('semua')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ platform: 'shopee', id_eksternal: '', akun_id: '', nama_pembeli: '' })
  const [items, setItems] = useState([{ ...emptyItem }])

  const { data: akunList } = useQuery({ queryKey: qk.akun(), queryFn: () => endpoints.listAkun() })
  const akunMap = new Map((akunList ?? []).map((a) => [a.id, a]))

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(cari.trim())
      setHalaman(1)
    }, 300)
    return () => clearTimeout(t)
  }, [cari])

  // Every filter change goes back to page 1.
  function ubahFilter(fn: () => void) {
    fn()
    setHalaman(1)
  }

  const { dari, sampai } = rentangTanggal(preset, kustom)
  const kriteria = { q: q || undefined, dari, sampai }
  const { data: ringkasan } = useQuery({
    queryKey: qk.pesananRingkasan({ ...kriteria, akun_id: akunId || undefined, tahap: tahap || undefined }),
    queryFn: () => endpoints.ringkasanPesanan({ ...kriteria, akun_id: akunId || undefined, tahap: tahap || undefined }),
    placeholderData: (prev) => prev,
  })
  const paramDaftar = {
    ...kriteria,
    akun_id: akunId || undefined,
    tahap: tahap || undefined,
    resi: filterResi === 'semua' ? undefined : filterResi,
    urut,
    halaman,
    per_halaman: PER_HALAMAN,
  }
  const { data: pesananList, isLoading, isFetching } = useQuery({
    queryKey: qk.pesananDaftar(paramDaftar),
    queryFn: () => endpoints.daftarPesanan(paramDaftar),
    placeholderData: (prev) => prev,
  })

  // Opening or refreshing this page pulls fresh orders from Shopee in the background (the server
  // throttles each shop to once a minute); the page then keeps asking every minute while visible.
  const sinkron = useQuery({
    queryKey: ['pesanan-sinkron'],
    queryFn: () => endpoints.sinkronPesananOtomatis(false),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 0,
    retry: false,
  })
  const sinkronData = sinkron.data
  useEffect(() => {
    if (sinkronData && sinkronData.jumlah_baru + sinkronData.jumlah_diperbarui > 0) {
      qc.invalidateQueries({ queryKey: ['pesanan'] })
    }
  }, [sinkronData, sinkron.dataUpdatedAt, qc])

  const segarkanMut = useMutation({
    mutationFn: () => endpoints.sinkronPesananOtomatis(true),
    onSuccess: (data) => {
      if (!data.aktif) toast.info('Sinkron Shopee belum diaktifkan di server.')
      else toast.success(`Disegarkan — ${data.jumlah_baru} baru, ${data.jumlah_diperbarui} diperbarui`)
      qc.invalidateQueries({ queryKey: ['pesanan'] })
      qc.invalidateQueries({ queryKey: ['pesanan-sinkron'] })
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const prosesMassalMut = useMutation({
    mutationFn: async (ids: string[]) => {
      // The server caps one call at 25 orders and each order costs several Shopee calls: go in small chunks.
      let berhasil = 0
      const gagal: { id_eksternal: string | null; pesan: string | null }[] = []
      for (const batch of pecahBatch(ids, 10)) {
        const res = await endpoints.prosesMassalPesanan(batch)
        berhasil += res.berhasil
        gagal.push(...res.hasil.filter((h) => !h.ok))
      }
      return { berhasil, gagal }
    },
    onSuccess: ({ berhasil, gagal }) => {
      if (gagal.length === 0) toast.success(`${berhasil} pesanan diproses di Shopee`)
      else
        toast.warning(`${berhasil} diproses, ${gagal.length} gagal`, {
          description: gagal
            .slice(0, 3)
            .map((g) => `#${g.id_eksternal ?? '?'}: ${g.pesan ?? 'gagal'}`)
            .join('\n'),
        })
      setTerpilih(new Map())
      qc.invalidateQueries({ queryKey: ['pesanan'] })
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const cetakMassalMut = useMutation({
    mutationFn: async ({ grup, tipe, tab }: { grup: Pesanan[][]; tipe: TemplateResi; tab: (Window | null)[] }) => {
      // The tabs were opened inside the click (popup blockers); each is filled when its PDF arrives.
      let berhasil = 0
      const gagal: string[] = []
      for (const [i, pesanan] of grup.entries()) {
        try {
          const pdf = await endpoints.unduhResiMassal(pesanan.map((p) => p.id), tipe)
          const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }))
          if (tab[i]) tab[i]!.location.href = url
          else window.open(url, '_blank')
          berhasil += pesanan.length
        } catch (e) {
          tab[i]?.close()
          gagal.push(getApiError(e, 'Resi belum siap atau server lambat, coba lagi sebentar.'))
        }
      }
      return { berhasil, gagal }
    },
    onSuccess: ({ berhasil, gagal }) => {
      qc.invalidateQueries({ queryKey: ['pesanan'] })
      if (gagal.length === 0) toast.success(`${berhasil} resi dibuka`)
      else toast.warning(`${berhasil} resi dibuka, ${gagal.length} kelompok gagal`, { description: gagal.slice(0, 2).join('\n') })
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const createMut = useMutation({
    mutationFn: endpoints.createPesanan,
    onSuccess: () => {
      toast.success('Pesanan manual ditambahkan')
      qc.invalidateQueries({ queryKey: ['pesanan'] })
      setDialogOpen(false)
      setForm({ platform: 'shopee', id_eksternal: '', akun_id: '', nama_pembeli: '' })
      setItems([{ ...emptyItem }])
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  function updateItem(i: number, patch: Partial<(typeof items)[number]>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }

  function onSubmit() {
    createMut.mutate({
      platform: form.platform,
      id_eksternal: form.id_eksternal,
      akun_id: form.akun_id || null,
      nama_pembeli: form.nama_pembeli,
      items: items
        .filter((it) => it.nama_produk && it.harga_satuan)
        .map((it) => ({
          nama_produk: it.nama_produk,
          harga_satuan: it.harga_satuan,
          qty: Number(it.qty || 1),
        })),
    })
  }

  // Selectable: orders that still need processing, or are processed and waiting for the courier (label).
  const tampil = pesananList?.items ?? []
  const totalHalaman = pesananList ? Math.max(1, Math.ceil(pesananList.total / pesananList.per_halaman)) : 1
  const bisaDipilih = tampil.filter((p) => bisaDiproses(p) || bisaDicetak(p))
  // "Pilih semua" skips labels that were already printed (reprinting is a deliberate, per-order choice).
  const bisaDipilihSemua = bisaDipilih.filter((p) => !sudahDicetak(p))
  // The selection survives page and filter changes, so one batch can be built across pages.
  const dipilih = [...terpilih.values()].filter((p) => bisaDiproses(p) || bisaDicetak(p))
  const idTerpilih = dipilih.filter(bisaDiproses).map((p) => p.id)
  const dicetak = dipilih.filter(bisaDicetak)
  const semuaTerpilih = bisaDipilihSemua.length > 0 && bisaDipilihSemua.every((p) => terpilih.has(p.id))

  async function onCetakTerpilih(tipe: TemplateResi) {
    const sudah = dicetak.filter(sudahDicetak)
    if (sudah.length > 0) {
      const ok = await confirm({
        title: 'Cetak ulang resi?',
        description: `${sudah.length} dari ${dicetak.length} pesanan terpilih resinya sudah pernah dicetak (${sudah
          .slice(0, 3)
          .map((p) => `#${p.id_eksternal}`)
          .join(', ')}${sudah.length > 3 ? ', …' : ''}). Tetap cetak semuanya?`,
      })
      if (!ok) return
    }
    const grup = kelompokResi(dicetak)
    const tab = grup.map(() => window.open('', '_blank'))
    cetakMassalMut.mutate({ grup, tipe, tab })
  }

  function togglePilih(p: Pesanan, pilih: boolean) {
    setTerpilih((prev) => {
      const next = new Map(prev)
      if (pilih) next.set(p.id, p)
      else next.delete(p.id)
      return next
    })
  }

  function pilihSemuaHalaman(pilih: boolean) {
    setTerpilih((prev) => {
      const next = new Map(prev)
      for (const p of bisaDipilihSemua) {
        if (pilih) next.set(p.id, p)
        else next.delete(p.id)
      }
      return next
    })
  }

  async function onProsesTerpilih() {
    const ok = await confirm({
      title: `Proses ${idTerpilih.length} pesanan di Shopee?`,
      description: 'Pengiriman setiap pesanan akan diatur di Shopee (kurir pickup). Ini tidak bisa dibatalkan dari sini.',
    })
    if (ok) prosesMassalMut.mutate(idTerpilih)
  }

  function labelSinkron(): string {
    if (sinkron.isPending) return 'Menyinkronkan dari Shopee…'
    if (sinkron.isError) return 'Sinkron Shopee gagal.'
    if (!sinkronData?.aktif) return 'Sinkron otomatis Shopee belum aktif di server.'
    const gagal = sinkronData.toko.filter((t) => t.hasil === 'gagal')
    const jam = new Date(sinkron.dataUpdatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    return gagal.length
      ? `Sinkron ${jam} — ${gagal.length} toko gagal: ${gagal[0].nama_toko} (${gagal[0].pesan ?? 'error'})`
      : `Tersinkron dari Shopee pukul ${jam}`
  }

  function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' {
    if (status === 'completed') return 'default'
    if (status === 'cancelled') return 'destructive'
    return 'secondary'
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-h1 font-heading text-2xl font-bold">Pesanan</h1>
        <div className="flex flex-wrap items-center gap-2">
          {idTerpilih.length > 0 && (
            <Button onClick={onProsesTerpilih} disabled={prosesMassalMut.isPending}>
              {prosesMassalMut.isPending ? 'Memproses…' : `Proses Terpilih (${idTerpilih.length})`}
            </Button>
          )}
          {dicetak.length > 0 && (
            <>
              <Button variant="outline" onClick={() => onCetakTerpilih('THERMAL_AIR_WAYBILL')} disabled={cetakMassalMut.isPending}>
                {cetakMassalMut.isPending ? 'Menyiapkan resi…' : `Cetak Resi A6 (${dicetak.length})`}
              </Button>
              <Button variant="ghost" onClick={() => onCetakTerpilih('NORMAL_AIR_WAYBILL')} disabled={cetakMassalMut.isPending}>
                A4
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => segarkanMut.mutate()} disabled={segarkanMut.isPending}>
            Segarkan
          </Button>
          <Button onClick={() => setDialogOpen(true)}>Pesanan Manual</Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{labelSinkron()}</p>

      <div className="flex flex-wrap items-end gap-3">
        <Medan label="Cari" untuk="pesanan-cari">
          <Input
            id="pesanan-cari"
            className="w-full sm:w-72"
            placeholder="No. pesanan, pembeli, resi, produk"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
          />
        </Medan>
        <Medan label="Status" untuk="pesanan-status">
          <Select value={tahap || SEMUA} onValueChange={(v) => ubahFilter(() => setTahap(v === SEMUA ? '' : (v as TahapPesanan)))}>
            <SelectTrigger id="pesanan-status" className="w-[210px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEMUA}>Semua status ({ringkasan?.tahap.semua ?? '…'})</SelectItem>
              {TAHAP_ORDER.map((t) => (
                <SelectItem key={t} value={t}>
                  {TAHAP_LABELS[t]} ({ringkasan?.tahap[t] ?? '…'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Medan>
        <Medan label="Toko" untuk="pesanan-toko">
          <Select value={akunId || SEMUA} onValueChange={(v) => ubahFilter(() => setAkunId(v === SEMUA ? '' : v))}>
            <SelectTrigger id="pesanan-toko" className="w-[260px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEMUA}>Semua toko ({ringkasan?.total_toko ?? '…'})</SelectItem>
              {(ringkasan?.toko ?? []).map((t) => (
                <SelectItem key={t.akun_id} value={t.akun_id}>
                  {t.nama_toko} ({t.jumlah})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Medan>
        <Medan label="Tanggal pesan" untuk="pesanan-tanggal">
          <Select value={preset} onValueChange={(v) => ubahFilter(() => setPreset(v as PresetTanggal))}>
            <SelectTrigger id="pesanan-tanggal" className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PRESET_LABEL) as PresetTanggal[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {PRESET_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Medan>
        {preset === 'kustom' && (
          <>
            <Medan label="Dari" untuk="pesanan-dari">
              <Input id="pesanan-dari" type="date" className="w-[150px]" value={kustom.dari} onChange={(e) => ubahFilter(() => setKustom((k) => ({ ...k, dari: e.target.value })))} />
            </Medan>
            <Medan label="Sampai" untuk="pesanan-sampai">
              <Input id="pesanan-sampai" type="date" className="w-[150px]" value={kustom.sampai} onChange={(e) => ubahFilter(() => setKustom((k) => ({ ...k, sampai: e.target.value })))} />
            </Medan>
          </>
        )}
        <Medan label="Resi" untuk="pesanan-resi">
          <Select value={filterResi} onValueChange={(v) => ubahFilter(() => setFilterResi(v as FilterResi))}>
            <SelectTrigger id="pesanan-resi" className="w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua</SelectItem>
              <SelectItem value="belum">Belum dicetak</SelectItem>
              <SelectItem value="sudah">Sudah dicetak</SelectItem>
            </SelectContent>
          </Select>
        </Medan>
        <Medan label="Urutan" untuk="pesanan-urut">
          <Select value={urut} onValueChange={(v) => ubahFilter(() => setUrut(v))}>
            <SelectTrigger id="pesanan-urut" className="w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {URUTAN_PESANAN.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Medan>
        {(tahap || akunId || q || preset !== 'semua' || filterResi !== 'semua') && (
          <Button
            variant="ghost"
            onClick={() =>
              ubahFilter(() => {
                setTahap('')
                setAkunId('')
                setCari('')
                setQ('')
                setPreset('semua')
                setFilterResi('semua')
              })
            }
          >
            Reset filter
          </Button>
        )}
        {isFetching && !isLoading && <Spinner size={18} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Inbox Pesanan{' '}
            <span className="text-sm font-normal text-muted-foreground">
              {pesananList ? `${pesananList.total} pesanan` : ''}
              {terpilih.size > 0 ? ` · ${terpilih.size} dipilih` : ''}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Spinner column label="Memuat pesanan…" />
          ) : (
            <TableShell minWidth={1000} label="Daftar pesanan, geser ke samping untuk kolom lain">
              <Table>
                <caption className="sr-only">Daftar pesanan sesuai filter</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <Checkbox
                        aria-label="Pilih semua pesanan yang bisa diproses atau dicetak"
                        checked={semuaTerpilih}
                        disabled={bisaDipilihSemua.length === 0}
                        onCheckedChange={(v) => pilihSemuaHalaman(v === true)}
                      />
                    </TableHead>
                    <TableHead>Tanggal pesan</TableHead>
                    <TableHead>No. Pesanan</TableHead>
                    <TableHead>Toko</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Kurir / Resi</TableHead>
                    <TableHead className="sticky right-0 bg-card text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tampil.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {(bisaDiproses(p) || bisaDicetak(p)) && (
                          <Checkbox
                            aria-label={`Pilih pesanan ${p.id_eksternal}`}
                            checked={terpilih.has(p.id)}
                            onCheckedChange={(v) => togglePilih(p, v === true)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        <div>{fmtDate(p.dipesan_at ?? p.created_at)}</div>
                        <div className="text-muted-foreground">{fmtTime(p.dipesan_at ?? p.created_at)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">{p.id_eksternal}</div>
                        <div className="text-sm text-muted-foreground">
                          {PLATFORM_LABELS[p.platform]}
                          {p.nama_pembeli ? ` · ${p.nama_pembeli}` : ''}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[120px] text-sm">{p.akun_id ? (akunMap.get(p.akun_id)?.nama_toko ?? '—') : '—'}</TableCell>
                      <TableCell className="min-w-[140px]">
                        <Badge variant={statusBadgeVariant(p.status)} className="whitespace-nowrap">{labelStatus(p)}</Badge>
                        {bisaDicetak(p) && (
                          <div className="mt-1 text-sm text-muted-foreground">
                            {sudahDicetak(p)
                              ? `Resi dicetak ${fmtDateTime(p.resi_dicetak_at)}${p.resi_dicetak_oleh ? ` · ${p.resi_dicetak_oleh}` : ''}`
                              : 'Resi belum dicetak'}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="min-w-[190px] max-w-[240px] text-sm">{ringkasItem(p)}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmtRp(p.total)}</TableCell>
                      <TableCell className="text-sm">
                        <div>{p.kurir || '—'}</div>
                        <div className="font-mono text-muted-foreground">{p.nomor_resi || ''}</div>
                      </TableCell>
                      <TableCell className="sticky right-0 bg-card text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/pesanan/${p.id}`}>Detail</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tampil.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                        Tidak ada pesanan yang cocok dengan filter ini.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableShell>
          )}
          {pesananList && pesananList.total > pesananList.per_halaman && (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm">
              <Button variant="outline" size="sm" disabled={halaman <= 1} onClick={() => setHalaman((h) => h - 1)}>
                Sebelumnya
              </Button>
              <span>
                Halaman {halaman} / {totalHalaman}
              </span>
              <Button variant="outline" size="sm" disabled={halaman >= totalHalaman} onClick={() => setHalaman((h) => h + 1)}>
                Berikutnya
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pesanan Manual</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Platform</Label>
                <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORM_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Toko (opsional)</Label>
                <Select value={form.akun_id || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, akun_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tanpa toko" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa toko</SelectItem>
                    {(akunList ?? []).filter((a) => a.platform === form.platform).map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nama_toko}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ID Pesanan Eksternal</Label>
              <Input value={form.id_eksternal} onChange={(e) => setForm((f) => ({ ...f, id_eksternal: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Nama Pembeli</Label>
              <Input value={form.nama_pembeli} onChange={(e) => setForm((f) => ({ ...f, nama_pembeli: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Item</Label>
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-[2fr_1fr_1fr] gap-2">
                  <Input placeholder="Nama produk" value={it.nama_produk} onChange={(e) => updateItem(i, { nama_produk: e.target.value })} />
                  <Input type="number" placeholder="Harga" value={it.harga_satuan} onChange={(e) => updateItem(i, { harga_satuan: e.target.value })} />
                  <Input type="number" placeholder="Qty" value={it.qty} onChange={(e) => updateItem(i, { qty: e.target.value })} />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setItems((prev) => [...prev, { ...emptyItem }])}>
                + Tambah Item
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={onSubmit} disabled={!form.id_eksternal || createMut.isPending}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
