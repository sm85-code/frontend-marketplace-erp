import PilihNative from '@/components/PilihNative'
import InfoTip from '@/components/InfoTip'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { getApiError } from '@/api/client'
import {
  buatTokoPenjualan,
  kunciTokoPenjualan,
  NAMA_JENIS,
  PLATFORM_TOKO,
  ubahTokoPenjualan,
  useTokoPenjualan,
  type IsianToko,
  type JenisToko,
  type TokoPenjualan,
} from '@/api/tokoPenjualan'
import { TabelLokal, type KolomTabel } from '@/components/daftar'
import QueryError from '@/components/QueryError'
import Spinner from '@/components/Spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth'

const selectCls = 'h-10 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60'

type Form = { nama: string; jenis: JenisToko; platform: string; kode: string; keterangan: string; aktif: boolean }
const FORM_KOSONG: Form = { nama: '', jenis: 'reseller', platform: 'shopee', kode: '', keterangan: '', aktif: true }
const formDari = (t: TokoPenjualan): Form => ({ nama: t.nama, jenis: t.jenis, platform: t.platform, kode: t.kode, keterangan: t.keterangan, aktif: t.aktif })

/** Why a shop cannot be saved yet (null = it can); the server checks the same and the uniqueness. */
const alasan = (f: Form) =>
  f.nama.trim() === '' ? 'Isi nama toko' : !/^([A-Za-z]{2})?$/.test(f.kode.trim()) ? 'Kode harus 2 huruf' : f.jenis === 'reseller' && f.kode.trim() === '' ? 'Kode penjual wajib untuk reseller' : null

function FormToko({ awal, sibuk, onSimpan }: { awal: TokoPenjualan | null; sibuk: boolean; onSimpan: (f: Form) => void }) {
  const [f, setF] = useState<Form>(awal ? formDari(awal) : FORM_KOSONG)
  const kurang = alasan(f)
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!kurang) onSimpan(f)
      }}
    >
      <DialogHeader>
        <DialogTitle>{awal ? 'Edit toko' : 'Tambah toko'}</DialogTitle>
        <DialogDescription>Toko sendiri atau reseller yang tidak terhubung ke marketplace.</DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="tp-nama">Nama toko</Label>
        <Input id="tp-nama" maxLength={120} value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tp-jenis">Jenis</Label>
          <PilihNative id="tp-jenis" className={selectCls} value={f.jenis} onChange={(e) => setF({ ...f, jenis: e.target.value as JenisToko })}>
            {(Object.keys(NAMA_JENIS) as JenisToko[]).map((j) => <option key={j} value={j}>{NAMA_JENIS[j]}</option>)}
          </PilihNative>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tp-platform">Platform</Label>
          <PilihNative id="tp-platform" className={selectCls} value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })}>
            {PLATFORM_TOKO.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </PilihNative>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="tp-kode">Kode penjual (2 huruf){f.jenis === 'reseller' ? '' : ' · boleh diisi menyusul'}</Label>
        <Input id="tp-kode" maxLength={2} className="w-24 uppercase" value={f.kode} placeholder="AB" onChange={(e) => setF({ ...f, kode: e.target.value.toUpperCase() })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tp-ket">Keterangan</Label>
        <Input id="tp-ket" maxLength={500} value={f.keterangan} onChange={(e) => setF({ ...f, keterangan: e.target.value })} />
      </div>
      {awal && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-primary" checked={f.aktif} onChange={(e) => setF({ ...f, aktif: e.target.checked })} />
          Toko aktif
        </label>
      )}
      <DialogFooter>
        <Button type="submit" disabled={sibuk || !!kurang} title={kurang ?? undefined}>Simpan</Button>
      </DialogFooter>
    </form>
  )
}

/** Kelola Toko, tab Toko Internal & Reseller: the shops that sell through the business without a marketplace connection. */
export default function TokoPenjualanTab() {
  const qc = useQueryClient()
  const { bisa } = useAuth()
  const bisaTulis = bisa('kelola_toko', 'tulis')
  const { data, isLoading, error, refetch } = useTokoPenjualan()
  const [dialog, setDialog] = useState<{ toko: TokoPenjualan | null } | null>(null)
  const namaPlatform = (id: string) => data?.platform.find((p) => p.id === id)?.label ?? PLATFORM_TOKO.find((p) => p.id === id)?.label ?? id
  const sesudah = () => {
    setDialog(null)
    void qc.invalidateQueries({ queryKey: kunciTokoPenjualan })
  }
  const simpan = useMutation({
    mutationFn: (f: Form) => {
      const isian: IsianToko = { nama: f.nama, jenis: f.jenis, platform: f.platform, kode: f.kode.trim() || null, keterangan: f.keterangan }
      return dialog?.toko ? ubahTokoPenjualan(dialog.toko.id, { ...isian, aktif: f.aktif }) : buatTokoPenjualan(isian)
    },
    onSuccess: () => {
      toast.success('Toko tersimpan')
      sesudah()
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const kolom: KolomTabel<TokoPenjualan>[] = [
    { kunci: 'nama', judul: 'Nama Toko', kelas: 'font-medium', sel: (t) => t.nama, nilai: (t) => t.nama },
    { kunci: 'jenis', judul: 'Jenis', sel: (t) => NAMA_JENIS[t.jenis], nilai: (t) => t.jenis },
    { kunci: 'platform', judul: 'Platform', sel: (t) => namaPlatform(t.platform), nilai: (t) => t.platform },
    { kunci: 'kode', judul: 'Kode', kelas: 'font-mono', sel: (t) => t.kode || '—', nilai: (t) => t.kode },
    { kunci: 'keterangan', judul: 'Keterangan', sel: (t) => t.keterangan || '—' },
    { kunci: 'status', judul: 'Status', sel: (t) => <Badge variant={t.aktif ? 'default' : 'secondary'}>{t.aktif ? 'Aktif' : 'Nonaktif'}</Badge>, nilai: (t) => (t.aktif ? 0 : 1) },
  ]
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Toko Internal &amp; Reseller</CardTitle>
        {bisaTulis && (
          <Button onClick={() => setDialog({ toko: null })}>
            <Plus aria-hidden="true" /> Tambah toko
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <InfoTip teks={"Toko sendiri dan reseller yang tidak terhubung ke marketplace. Kode penjual dipakai di kode pesanan produksi. Toko tidak dihapus, hanya dinonaktifkan."} />
        {isLoading && <Spinner column label="Memuat toko…" />}
        {error && <QueryError error={error} retry={refetch} />}
        {data && (
          <>
            <TabelLokal
              label="Toko internal dan reseller"
              items={data.items}
              kolom={kolom}
              idDari={(t) => t.id}
              namaDari={(t) => t.nama}
              urutAwal={{ kunci: 'status', arah: 'asc' }}
              minWidth={760}
              aksi={bisaTulis ? (t) => <Button size="sm" variant="outline" aria-label={`Edit ${t.nama}`} onClick={() => setDialog({ toko: t })}>Edit</Button> : undefined}
              kartu={(t) => (
                <article key={t.id} className={`min-w-0 space-y-2 rounded-xl border p-4 ${t.aktif ? '' : 'opacity-60'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="break-words font-semibold">{t.nama}</h2>
                    <Badge variant={t.aktif ? 'default' : 'secondary'}>{t.aktif ? 'Aktif' : 'Nonaktif'}</Badge>
                  </div>
                  <p className="teks-kecil text-muted-foreground">{NAMA_JENIS[t.jenis]} · {namaPlatform(t.platform)} · Kode {t.kode || '—'}</p>
                  {t.keterangan && <p className="text-sm">{t.keterangan}</p>}
                  {bisaTulis && <Button size="sm" variant="outline" aria-label={`Edit ${t.nama}`} onClick={() => setDialog({ toko: t })}>Edit</Button>}
                </article>
              )}
            />
            {data.items.length === 0 && <p className="py-6 text-center text-muted-foreground">Belum ada toko internal atau reseller.</p>}
          </>
        )}
      </CardContent>
      <Dialog open={!!dialog} onOpenChange={(buka) => !buka && setDialog(null)}>
        <DialogContent className="max-w-md">
          {dialog && <FormToko key={dialog.toko?.id ?? 'baru'} awal={dialog.toko} sibuk={simpan.isPending} onSimpan={(f) => simpan.mutate(f)} />}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
