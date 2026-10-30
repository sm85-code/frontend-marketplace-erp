import { cloneElement, isValidElement, useId, useEffect, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { agenApi, BATAS_AWAL, JENIS, type AgenApi, type Batas, type Hasil } from '@/api/agen'
import { listAkun } from '@/api/endpoints'
import { getApiError } from '@/api/client'
import { useAuth } from '@/lib/auth'
import { AKSI_AWAL, AlurAgen, angka, requestId, susunAksi } from '@/lib/agen'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { jenisLabel, nilai } from '@/lib/agenTampilan'
import { TableCell, TableRow } from '@/components/ui/table'
import { Data, Perbandingan, Rincian, RingkasanBaca, TabelAgen, TrenBaca } from './AgenData'

function Panel({ judul, children }: { judul: string; children: ReactNode }) { return <Card className="min-w-0"><CardHeader><CardTitle>{judul}</CardTitle></CardHeader><CardContent className="min-w-0 space-y-3">{children}</CardContent></Card> }
function Medan({ nama, children }: { nama: string; children: ReactNode }) { const id = useId(); return <div className="grid min-w-0 gap-1 text-sm"><label htmlFor={id}>{nama}</label>{isValidElement<{ id?: string }>(children) ? cloneElement(children, { id }) : children}</div> }
const selectClass = 'h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm'

function KataEditor({ value, negatif, onChange }: { value: string; negatif: boolean; onChange: (s: string) => void }) {
  const rows = JSON.parse(value) as { aksi: string; kata: string; bid?: number; tipe?: string }[]
  function edit(i: number, patch: object) { onChange(JSON.stringify(rows.map((row, j) => j === i ? { ...row, ...patch } : row))) }
  return <div className="space-y-3 sm:col-span-2">
    <p className="text-sm">{negatif ? 'Tambah memblokir kata yang sedang ditawar. Hapus memulihkan kata negatif.' : 'Bid wajib untuk menambah kata atau mengubah bid. Pilih pencocokan luas atau persis.'}</p>
    {rows.map((row, i) => <div key={i} className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
      <Medan nama={`Operasi kata ${i + 1}`}><select className={selectClass} value={row.aksi} onChange={e => edit(i, { aksi: e.target.value })}>{(negatif ? [['tambah', 'Tambah (blokir kata)'], ['hapus', 'Hapus (pulihkan kata)']] : [['add', 'Tambah kata'], ['delete', 'Hapus kata'], ['restore', 'Pulihkan kata'], ['change_bid_price', 'Ubah bid kata']]).map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select></Medan>
      <Medan nama={`Kata ${i + 1}`}><Input value={row.kata} maxLength={80} onChange={e => edit(i, { kata: e.target.value })} /></Medan>
      {!negatif && ['add', 'change_bid_price'].includes(row.aksi) && <><Medan nama={`Bid kata ${i + 1} (Rp)`}><Input type="number" value={row.bid ?? ''} onChange={e => edit(i, { bid: e.target.value === '' ? undefined : Number(e.target.value) })} /></Medan><Medan nama={`Pencocokan kata ${i + 1}`}><select className={selectClass} value={row.tipe ?? ''} onChange={e => edit(i, { tipe: e.target.value || undefined })}><option value="">Bawaan</option><option value="broad">Luas (broad)</option><option value="exact">Persis (exact)</option></select></Medan></>}
      <Button type="button" variant="outline" onClick={() => onChange(JSON.stringify(rows.filter((_, j) => i !== j)))}>Hapus baris {i + 1}</Button>
    </div>)}
    <Button type="button" variant="outline" onClick={() => onChange(JSON.stringify([...rows, { aksi: negatif ? 'tambah' : 'add', kata: '' }]))}>Tambah baris kata</Button>
  </div>
}

export default function Agen() {
  const { bisa } = useAuth()
  const baca = bisa('iklan', 'baca'), tulis = bisa('iklan', 'tulis')
  const akun = useQuery({ queryKey: ['akun'], queryFn: () => listAkun(), enabled: baca })
  return <div className="min-w-0 space-y-3">{akun.isLoading && <p role="status">Memuat daftar toko…</p>}{akun.error && <p role="alert" className="text-destructive">Gagal memuat daftar toko: {getApiError(akun.error)}</p>}{baca && !akun.isLoading && !akun.error && !akun.data?.some(a => a.platform === 'shopee') && <p>Belum ada toko Shopee tersedia.</p>}<AgenView api={agenApi} toko={(akun.data ?? []).filter(a => a.platform === 'shopee').map(a => ({ id: a.id, nama: a.nama_toko }))} baca={baca} tulis={tulis} /></div>
}

export function AgenView({ api, toko, baca, tulis }: { api: AgenApi; toko: { id: string; nama: string }[]; baca: boolean; tulis: boolean }) {
  const [id, setId] = useState('')
  // Remount scope immediately: no previous shop form, dialog or response can cross this boundary.
  return <div className="min-w-0 space-y-4">
    <Medan nama="Toko"><select className={selectClass} value={id} onChange={e => setId(e.target.value)}><option value="">Semua toko</option>{toko.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}</select></Medan>
    {!baca ? <p role="alert">Anda tidak memiliki akses baca iklan.</p> : <Lingkup key={id} id={id} api={api} tulis={tulis} nama={toko.find(t => t.id === id)?.nama ?? 'Semua toko'} />}
  </div>
}

function Lingkup({ id, nama, api, tulis }: { id: string; nama: string; api: AgenApi; tulis: boolean }) {
  const [flow] = useState(() => new AlurAgen())
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false; flow.invalidate() } }, [flow])
  const [version, setVersion] = useState(0)
  const global = useQuery({ queryKey: ['agen', 'global', version], queryFn: () => api.stop(), retry: false })
  const stopToko = useQuery({ queryKey: ['agen', id, 'stop', version], enabled: !!id, retry: false, queryFn: () => api.stop(id) })
  const batasQuery = useQuery({ queryKey: ['agen', id, 'batas', version], enabled: !!id, retry: false, queryFn: () => api.batas(id) })
  const jadwal = useQuery({ queryKey: ['agen', id, 'jadwal', version], enabled: !!id, retry: false, queryFn: () => api.jadwal(id) })
  const ringkasan = useQuery({ queryKey: ['agen', id, 'ringkasan', version], enabled: !!id, retry: false, queryFn: () => api.ringkasan(id) })
  const audit = useQuery({ queryKey: ['agen', id, 'audit', version], queryFn: () => api.audit(id || undefined), retry: false })
  const [form, setForm] = useState({ ...AKSI_AWAL, perubahan: '[{"aksi":"add","kata":""}]' })
  const [batasDraft, setBatasDraft] = useState<Batas | null>(null)
  const batas = batasDraft ?? batasQuery.data ?? BATAS_AWAL
  const batasLoaded = !!batasQuery.data && !batasQuery.error && !batasQuery.isFetching
  function setBatas(update: (b: Batas) => Batas) { setBatasDraft(update(batas)) }
  const [alasan, setAlasan] = useState('')
  const [item, setItem] = useState('')
  const tren = useQuery({ queryKey: ['agen', id, 'tren', item], enabled: !!id && /^\d{1,32}$/.test(item), queryFn: () => api.tren(id, item), retry: false })
  const [schedule, setSchedule] = useState({ campaign: '', jam: '', aktif: false })
  const [preview, setPreview] = useState<Hasil>()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState<{ title: string; warning: string; body: unknown; run: () => Promise<unknown>; guarded?: boolean; scheduleGuard?: boolean }>()
  const [confirmText, setConfirmText] = useState('')
  const blocked = global.data?.aktif || stopToko.data?.aktif
  const ready = !!id && !!batasQuery.data && !!stopToko.data && !!global.data && !batasQuery.error && !stopToko.error && !global.error && !batasQuery.isFetching && !stopToko.isFetching && !global.isFetching && !blocked && !busy && tulis
  const scheduleReady = !!id && !!jadwal.data && !jadwal.error && !jadwal.isFetching && !!global.data && !!stopToko.data && !global.error && !stopToko.error && !global.isFetching && !stopToko.isFetching && !blocked && !busy && tulis
  const pendingAllowed = (!pending?.guarded || ready) && (!pending?.scheduleGuard || scheduleReady)
  function invalidate() { flow.invalidate(); setPreview(undefined); setPending(undefined); setConfirmText('') }
  async function run(task: () => Promise<unknown>) {
    if (!tulis || busy) return
    setBusy(true); setMessage('')
    try { await task(); if (alive.current) { setMessage('Permintaan selesai.'); setVersion(v => v + 1) } }
    catch (e) { if (alive.current) setMessage(getApiError(e)) }
    finally { if (alive.current) { setBusy(false); setPending(undefined); setConfirmText('') } }
  }
  function confirm(title: string, warning: string, body: unknown, task: () => Promise<unknown>, guarded = false, scheduleGuard = false) { setConfirmText(''); setPending({ title, warning, body, run: task, guarded, scheduleGuard }) }
  function simulate(auditId?: string) {
    if (!ready) return
    invalidate()
    void run(async () => {
      const body = auditId ? { alasan } : susunAksi(form)
      const result = await flow.kering(id, body, auditId, api.kirim)
      if (alive.current && result) setPreview(result)
    })
  }
  return <div className="min-w-0 space-y-4">
    {!tulis && <p className="rounded-md border p-3">Mode baca saja. Perubahan memerlukan izin tulis iklan.</p>}
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => { invalidate(); setVersion(v => v + 1) }}>Muat ulang</Button><span role="status" className="text-sm">{busy ? 'Memproses…' : message}</span></div>
    {[['STOP global', global.error], ['STOP toko', stopToko.error], ['Batas toko', batasQuery.error], ['Jadwal', jadwal.error], ['Ringkasan', ringkasan.error], ['Audit', audit.error], ['Tren produk', tren.error]].map(([label, error]) => error ? <p key={String(label)} role="alert" className="text-destructive">{String(label)}: {getApiError(error)}</p> : null)}
    {(global.isLoading || (id && (stopToko.isLoading || batasQuery.isLoading || jadwal.isLoading || ringkasan.isLoading)) || audit.isLoading) && <p role="status">Memuat data agen…</p>}
    <Panel judul="STOP agen">
      <p className="text-sm">STOP aktif memblokir aksi agen, termasuk rollback dan jadwal. Melepas STOP tidak melepas STOP pada lingkup lain.</p>
      <Medan nama="Alasan perubahan / rollback"><Input maxLength={500} value={alasan} onChange={e => { invalidate(); setAlasan(e.target.value) }} /></Medan>
      {[{ label: 'Global', scope: undefined, data: global.data }, ...(id ? [{ label: nama, scope: id, data: stopToko.data }] : [])].map(s => <div key={s.label} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"><div><strong>{s.label}: {s.data ? s.data.aktif ? 'STOP aktif' : 'STOP nonaktif' : 'Belum terbaca'}</strong><p className="text-sm">Alasan: {s.data?.alasan || '—'} · Oleh: {s.data?.oleh ?? '—'}</p></div><Button variant="destructive" disabled={!tulis || busy || !s.data} onClick={() => { invalidate(); const body = { aktif: !s.data!.aktif, alasan, request_id: requestId() }; confirm(`Ubah STOP ${s.label}`, body.aktif ? 'Semua penulisan agen pada lingkup ini akan diblokir.' : 'Agen dapat kembali menulis bila batas, persetujuan, dan STOP lain mengizinkan.', body, () => api.simpanStop(s.scope, body)) }}>{s.data?.aktif ? 'Lepas STOP' : 'Aktifkan STOP'}</Button></div>)}
    </Panel>
    {!id && <p className="rounded-md border p-6">Pilih toko secara eksplisit untuk melihat ringkasan, batas, aksi, tren, dan jadwal. Semua toko tetap dipilih sampai Anda mengubahnya.</p>}
    {id && <>
      <Panel judul="Ringkasan — hanya baca">{ringkasan.data && <RingkasanBaca data={ringkasan.data} />}</Panel>
      <Panel judul="Batas toko — penggantian penuh">
        <p className="text-sm">Semua kolom dikirim ulang. Kosong pada plafon berarti tanpa plafon. Otonomi bawaan nonaktif.</p>
        <fieldset disabled={!tulis || busy || !batasLoaded} className="grid gap-3 sm:grid-cols-2" onChange={() => invalidate()}>
          {(['anggaran_harian_maks', 'maks_cpc', 'maks_persen_perubahan', 'min_hari_antar_perubahan'] as const).map((k, i) => <Medan key={k} nama={['Plafon anggaran harian (Rp; opsional)', 'CPC maksimum (Rp; opsional)', 'Perubahan maksimum (%) 1–100', 'Jarak perubahan (hari) 0–90'][i]}><Input type="number" value={batas[k] ?? ''} min={k === 'min_hari_antar_perubahan' ? 0 : 1} max={k === 'maks_cpc' ? 100000 : k === 'anggaran_harian_maks' ? 1000000000 : k === 'maks_persen_perubahan' ? 100 : 90} onChange={e => setBatas(b => ({ ...b, [k]: e.target.value === '' && i < 2 ? null : Number(e.target.value) }))} /></Medan>)}
          <label className="flex items-center gap-2"><input type="checkbox" checked={batas.otonomi} onChange={e => setBatas(b => ({ ...b, otonomi: e.target.checked }))} />Izinkan otonomi</label>
        </fieldset>
        <p className="text-sm font-semibold text-destructive">PERINGATAN: Otonomi mengizinkan backend mengubah iklan tanpa persetujuan per aksi selama dalam batas. Ini dapat membelanjakan saldo iklan.</p>
        <Button disabled={!tulis || busy || !batasLoaded} onClick={() => {
          invalidate()
          try {
            angka(String(batas.maks_persen_perubahan), 'Persen', 1, 100, true); angka(String(batas.min_hari_antar_perubahan), 'Jarak hari', 0, 90, true)
            if (batas.anggaran_harian_maks !== null) angka(String(batas.anggaran_harian_maks), 'Anggaran', Number.MIN_VALUE, 1000000000)
            if (batas.maks_cpc !== null) angka(String(batas.maks_cpc), 'CPC', Number.MIN_VALUE, 100000)
            const body = { ...batas, alasan, request_id: requestId() }
            confirm('Ganti seluruh batas toko', batas.otonomi ? 'BAHAYA: Anda mengaktifkan otonomi. Backend dapat menulis tanpa persetujuan per aksi dan membelanjakan saldo.' : 'Seluruh batas toko akan diganti dengan nilai berikut.', body, () => api.simpanBatas(id, body))
          } catch(e) { setMessage(getApiError(e)) }
        }}>Tinjau penggantian batas</Button>
      </Panel>
      <Panel judul="Aksi agen">
        {blocked && <p role="alert" className="text-destructive">STOP aktif. Simulasi, eksekusi, dan rollback diblokir.</p>}
        <fieldset disabled={!tulis || busy} className="grid gap-3 sm:grid-cols-2" onChange={() => invalidate()}>
          <Medan nama="Jenis aksi"><select className={selectClass} value={form.jenis} onChange={e => setForm(f => ({ ...f, jenis: e.target.value as typeof f.jenis, perubahan: JSON.stringify([{ aksi: e.target.value === 'kata_negatif' ? 'tambah' : 'add', kata: '' }]) }))}>{JENIS.map(j => <option key={j} value={j}>{jenisLabel[j]}</option>)}</select></Medan>
          <Medan nama="ID kampanye"><Input inputMode="numeric" value={form.campaign} onChange={e => setForm(f => ({ ...f, campaign: e.target.value }))} /></Medan>
          {['anggaran', 'roas', 'bid'].includes(form.jenis) && <Medan nama="Nilai baru"><Input type="number" value={form.nilai} onChange={e => setForm(f => ({ ...f, nilai: e.target.value }))} /></Medan>}
          {form.jenis === 'bid' && <Medan nama="Kata kunci aktif"><Input maxLength={80} value={form.kata} onChange={e => setForm(f => ({ ...f, kata: e.target.value }))} /></Medan>}
          {['kata_kunci', 'kata_negatif'].includes(form.jenis) && <KataEditor value={form.perubahan} negatif={form.jenis === 'kata_negatif'} onChange={perubahan => { invalidate(); setForm(f => ({ ...f, perubahan })) }} />}
          <Medan nama="Alasan aksi"><Input maxLength={500} value={form.alasan} onChange={e => setForm(f => ({ ...f, alasan: e.target.value }))} /></Medan>
        </fieldset>
        <Button disabled={!ready} onClick={() => simulate()}>1. Simulasikan aksi</Button>
        {preview && <div className="space-y-3 rounded-md border p-3"><h3 className="font-semibold">Preview {jenisLabel[preview.jenis] ?? preview.jenis} · {nama}</h3><Perbandingan sebelum={preview.sebelum} sesudah={preview.sesudah} /><p className="text-sm">Simulasi kering · belum diterapkan · Audit: {preview.audit_id}</p><Button disabled={!ready} onClick={() => confirm('Konfirmasi kedua: terapkan perubahan nyata', 'Periksa sebelum dan sesudah. Permintaan berikut akan mengubah iklan di Shopee dan dapat membelanjakan saldo. Ketik ya untuk menyetujui.', preview, async () => { if (!ready) throw new Error('Aksi tidak diizinkan'); setPreview(undefined); const result = await flow.terapkan(id, true, api.kirim); if (!result.diterapkan || result.kering) throw new Error('Backend belum menerapkan perubahan. Periksa audit sebelum mencoba ulang.') }, true)}>2. Tinjau eksekusi nyata</Button></div>}
      </Panel>
      <Panel judul="Jadwal WIB">
        <p role="status">{jadwal.data ? jadwal.data.loop_detik === 0 ? 'Job mati (interval 0 detik). Baris aktif pun tidak dijalankan.' : `Pemeriksaan otomatis setiap ${jadwal.data.loop_detik} detik.` : 'Status job belum terbaca.'}</p>
        {jadwal.data && (jadwal.data.items.length ? <TabelAgen label="Jadwal kampanye" heads={['Kampanye', 'Jam diizinkan (WIB)', 'Status baris', 'Status kampanye', 'Edit']}>
          {jadwal.data.items.map(row => <TableRow key={row.campaign_id}><TableCell>{row.campaign_id}</TableCell><TableCell>{row.jam.map(j => `${String(j).padStart(2, '0')}.00`).join(', ')}</TableCell><TableCell>{row.aktif ? 'Aktif' : 'Dijeda'}</TableCell><TableCell>{row.dijeda_jadwal ? 'Dijeda oleh jadwal' : 'Tidak dijeda oleh jadwal'}</TableCell><TableCell><Button variant="outline" disabled={!tulis || busy} onClick={() => { invalidate(); setSchedule({ campaign: row.campaign_id, jam: row.jam.join(','), aktif: row.aktif }) }}>Edit jadwal {row.campaign_id}</Button></TableCell></TableRow>)}
        </TabelAgen> : <p className="text-sm text-muted-foreground">Belum ada jadwal. Isi formulir untuk menambahkan jadwal.</p>)}
        <fieldset disabled={!scheduleReady} className="grid gap-3 sm:grid-cols-2" onChange={invalidate}>
          <Medan nama="ID kampanye jadwal"><Input value={schedule.campaign} onChange={e => setSchedule(s => ({ ...s, campaign: e.target.value }))} /></Medan>
          <Medan nama="Jam diizinkan (0–23, pisahkan koma)"><Input value={schedule.jam} onChange={e => setSchedule(s => ({ ...s, jam: e.target.value }))} /></Medan>
          <label><input type="checkbox" checked={schedule.aktif} onChange={e => setSchedule(s => ({ ...s, aktif: e.target.checked }))} /> Baris jadwal aktif</label>
        </fieldset>
        <Button disabled={!scheduleReady} onClick={() => {
          invalidate()
          try { const body = { campaign_id: angka(schedule.campaign, 'Kampanye', 1, Number.MAX_SAFE_INTEGER, true), jam: [...new Set(schedule.jam.split(',').map(j => angka(j, 'Jam', 0, 23, true)))].sort((a,b) => a-b), aktif: schedule.aktif }; confirm('Simpan jadwal WIB', 'Saat baris dan loop aktif, backend dapat menjeda/melanjutkan kampanye otomatis. STOP tetap berlaku.', body, () => api.simpanJadwal(id, body), false, true) } catch(e) { setMessage(getApiError(e)) }
        }}>Tinjau jadwal</Button>
      </Panel>
      <Panel judul="Tren produk — hanya baca"><p className="text-sm text-muted-foreground">Masukkan ID produk dari ringkasan untuk membandingkan penjualan 7 dan 28 hari.</p><Medan nama="ID item (maksimal 32 digit)"><Input value={item} onChange={e => { invalidate(); setItem(e.target.value) }} /></Medan>{tren.isFetching && <p>Memuat tren…</p>}{item && !/^\d{1,32}$/.test(item) && <p role="alert">ID item harus 1–32 digit.</p>}{tren.data && <TrenBaca data={tren.data} />}</Panel>
    </>}
    <Panel judul="Audit lengkap">
      <p className="text-sm">100 catatan terbaru · {nama}. Rollback hanya untuk perubahan nyata yang diterapkan dari tujuh jenis aksi.</p>
      {!audit.isLoading && !audit.data?.items.length && <p>Belum ada audit.</p>}
      {audit.data?.items.map(row => <article key={row.id} className="space-y-2 rounded-md border p-3"><h3 className="font-semibold">{jenisLabel[row.aksi] ?? nilai(row.aksi)} · {nilai(row.hasil)} · {row.dibuat_at}</h3><p className="text-sm">Pelaku: {row.pelaku_nama || '—'} ({row.pelaku_id ?? '—'}) · Toko: {row.akun_id ?? 'Global'} · Kampanye: {row.kampanye_id ?? '—'}</p><p className="text-sm">Alasan: {row.alasan || '—'} · Persetujuan: {nilai(row.persetujuan)} · Mode: {row.kering ? 'Simulasi kering' : 'Perubahan nyata'}</p><p className="break-all text-sm">ID permintaan: {row.request_id ?? '—'}</p><p className="text-xs text-muted-foreground">ID audit: {row.id}</p><details><summary className="cursor-pointer text-sm">Lihat sebelum dan sesudah</summary><div className="mt-3"><Perbandingan sebelum={row.sebelum} sesudah={row.sesudah.sesudah ?? row.sesudah} /></div><details className="mt-3"><summary className="cursor-pointer text-xs">Detail teknis audit (JSON)</summary><Data value={row} /></details></details>{id && row.akun_id === id && row.hasil === 'diterapkan' && !row.kering && JENIS.includes(row.aksi as typeof JENIS[number]) && <Button variant="outline" disabled={!ready} onClick={() => simulate(row.id)}>1. Simulasikan rollback {row.id}</Button>}</article>)}
    </Panel>
    <Dialog open={!!pending} onOpenChange={open => { if (!open && !busy) { setPending(undefined); setConfirmText('') } }}><DialogContent><DialogHeader><DialogTitle>{pending?.title}</DialogTitle><DialogDescription>{pending?.warning}</DialogDescription></DialogHeader><p className="text-sm">Toko: {nama}</p>{pending?.guarded ? <Perbandingan sebelum={(pending.body as Hasil).sebelum} sesudah={(pending.body as Hasil).sesudah} /> : <Rincian value={pending?.body} />}<Medan nama="Ketik ya untuk konfirmasi"><Input autoComplete="off" value={confirmText} disabled={busy} onChange={e => setConfirmText(e.target.value)} /></Medan><DialogFooter><Button variant="outline" disabled={busy} onClick={() => { setPending(undefined); setConfirmText('') }}>Batal</Button><Button variant="destructive" disabled={confirmText !== 'ya' || busy || !tulis || !pendingAllowed} onClick={() => { if (pending && confirmText === 'ya' && pendingAllowed) void run(pending.run) }}>Ya, konfirmasi</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
