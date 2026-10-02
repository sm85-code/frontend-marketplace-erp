import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { fmtDate, fmtRp, getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import { useConfirm } from '@/components/ConfirmProvider'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PLATFORM_LABELS } from '@/config/roles'
import { STATUS_LABELS, STATUS_ORDER, bisaDiproses, labelStatus, pecahBatch } from '@/lib/pesanan'

const emptyItem = { nama_produk: '', harga_satuan: '', qty: '1' }

export default function PesananPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [tab, setTab] = useState<string>('all')
  const [terpilih, setTerpilih] = useState<Set<string>>(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ platform: 'shopee', id_eksternal: '', akun_id: '', nama_pembeli: '' })
  const [items, setItems] = useState([{ ...emptyItem }])

  const { data: akunList } = useQuery({ queryKey: qk.akun(), queryFn: () => endpoints.listAkun() })
  const akunMap = new Map((akunList ?? []).map((a) => [a.id, a]))

  const { data: pesananList, isLoading } = useQuery({
    queryKey: qk.pesanan({ status: tab === 'all' ? undefined : tab }),
    queryFn: () => endpoints.listPesanan({ status: tab === 'all' ? undefined : tab }),
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
      setTerpilih(new Set())
      qc.invalidateQueries({ queryKey: ['pesanan'] })
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

  const bisaDipilih = (pesananList ?? []).filter(bisaDiproses)
  const idTerpilih = bisaDipilih.filter((p) => terpilih.has(p.id)).map((p) => p.id)
  const semuaTerpilih = bisaDipilih.length > 0 && idTerpilih.length === bisaDipilih.length

  function togglePilih(id: string, pilih: boolean) {
    setTerpilih((prev) => {
      const next = new Set(prev)
      if (pilih) next.add(id)
      else next.delete(id)
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
          <Button variant="outline" onClick={() => segarkanMut.mutate()} disabled={segarkanMut.isPending}>
            Segarkan
          </Button>
          <Button onClick={() => setDialogOpen(true)}>Pesanan Manual</Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{labelSinkron()}</p>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="tab-strip">
          <TabsTrigger value="all">Semua</TabsTrigger>
          {STATUS_ORDER.map((s) => (
            <TabsTrigger key={s} value={s}>
              {STATUS_LABELS[s]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Inbox Pesanan</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Spinner column label="Memuat pesanan…" />
          ) : (
            <TableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <Checkbox
                        aria-label="Pilih semua yang perlu diproses"
                        checked={semuaTerpilih}
                        disabled={bisaDipilih.length === 0}
                        onCheckedChange={(v) => setTerpilih(v === true ? new Set(bisaDipilih.map((p) => p.id)) : new Set())}
                      />
                    </TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Toko</TableHead>
                    <TableHead>Pembeli</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(pesananList ?? []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {bisaDiproses(p) && (
                          <Checkbox
                            aria-label={`Pilih pesanan ${p.id_eksternal}`}
                            checked={terpilih.has(p.id)}
                            onCheckedChange={(v) => togglePilih(p.id, v === true)}
                          />
                        )}
                      </TableCell>
                      <TableCell>{fmtDate(p.created_at)}</TableCell>
                      <TableCell>{PLATFORM_LABELS[p.platform]}</TableCell>
                      <TableCell>{p.akun_id ? (akunMap.get(p.akun_id)?.nama_toko ?? '—') : '—'}</TableCell>
                      <TableCell>{p.nama_pembeli || '—'}</TableCell>
                      <TableCell>{fmtRp(p.total)}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(p.status)}>{labelStatus(p)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/pesanan/${p.id}`}>Detail</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(pesananList ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        Tidak ada pesanan pada status ini.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableShell>
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
