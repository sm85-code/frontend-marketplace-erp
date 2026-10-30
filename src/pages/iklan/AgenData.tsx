import type { ReactNode } from 'react'
import type { Json, Ringkasan } from '@/api/agen'
import { jenisLabel, labelKolom, nilai, uang } from '@/lib/agenTampilan'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function Data({ value }: { value: unknown }) { return <pre className="max-h-80 max-w-full overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">{JSON.stringify(value, null, 2)}</pre> }
export function Rincian({ value }: { value: unknown }) {
  if (!value || typeof value !== 'object') return <span>{nilai(value)}</span>
  if (Array.isArray(value)) return value.length ? <ul className="space-y-2">{value.map((v, i) => <li key={i} className="rounded border p-2"><Rincian value={v} /></li>)}</ul> : <span>Tidak ada</span>
  return <dl className="grid min-w-0 gap-2 text-sm">{Object.entries(value).map(([k,v]) => <div key={k} className="min-w-0"><dt className="font-medium">{labelKolom[k] ?? k.replaceAll('_', ' ').replace(/^./, s => s.toUpperCase())}</dt><dd className="break-words text-muted-foreground">{typeof v === 'object' && v !== null ? <Rincian value={v} /> : ['anggaran', 'anggaran_harian_maks', 'maks_cpc', 'bid'].includes(k) ? uang(v) : k === 'jenis' ? jenisLabel[String(v)] ?? nilai(v) : nilai(v)}</dd></div>)}</dl>
}
export function Perbandingan({ sebelum, sesudah }: { sebelum: unknown; sesudah: unknown }) { return <div className="grid min-w-0 gap-3 sm:grid-cols-2">{[['Sebelum', sebelum], ['Sesudah', sesudah]].map(([label, v]) => <section key={String(label)} className="min-w-0 rounded-md border bg-muted/20 p-3"><h4 className="mb-3 font-semibold">{String(label)}</h4><Rincian value={v} /></section>)}</div> }
export function TabelAgen({ label, heads, children }: { label: string; heads: string[]; children: ReactNode }) { return <div role="region" aria-label={label} tabIndex={0} className="min-w-0 max-w-full overflow-x-auto rounded-md border"><Table className="min-w-[600px]"><caption className="sr-only">{label}</caption><TableHeader><TableRow>{heads.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{children}</TableBody></Table></div> }
export function RingkasanBaca({ data }: { data: Ringkasan }) {
  return <div className="min-w-0 space-y-5">
    <div className="grid gap-3 sm:grid-cols-3">{[['Saldo iklan', uang(data.saldo)], ['Kampanye dalam ringkasan', data.kampanye.length], ['Produk dalam ringkasan', data.produk.length]].map(([label, v]) => <div key={String(label)} className="rounded-md border bg-muted/20 p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{v}</p></div>)}</div>
    <div><h3 className="mb-2 font-semibold">Kampanye</h3>{!data.kampanye.length ? <p className="text-sm text-muted-foreground">Belum ada kampanye dalam ringkasan.</p> : <TabelAgen label="Kampanye toko" heads={['Kampanye', 'Status', 'Anggaran', 'Target ROAS', 'Klik', 'Biaya', 'Pesanan', 'ROAS']}>
      {data.kampanye.map((c,i) => { const p = (c.kinerja ?? {}) as Json; return <TableRow key={String(c.campaign_id ?? i)}><TableCell><p className="font-medium">{nilai(c.nama)}</p><p className="text-xs text-muted-foreground">ID {nilai(c.campaign_id)}</p></TableCell><TableCell><Badge variant="secondary">{nilai(c.status)}</Badge></TableCell><TableCell className="whitespace-nowrap">{uang(c.anggaran)}</TableCell><TableCell>{nilai(c.roas_target)}</TableCell><TableCell>{nilai(p.clicks)}</TableCell><TableCell className="whitespace-nowrap">{uang(p.expense)}</TableCell><TableCell>{nilai(p.direct_order)}</TableCell><TableCell>{nilai(p.roas)}</TableCell></TableRow> })}
    </TabelAgen>}</div>
    <div><h3 className="mb-2 font-semibold">Produk</h3>{!data.produk.length ? <p className="text-sm text-muted-foreground">Belum ada produk dalam ringkasan.</p> : <TabelAgen label="Produk toko" heads={['Produk', 'ID produk', 'Harga']}>{data.produk.map(p => <TableRow key={p.item_id}><TableCell className="font-medium">{nilai(p.nama)}</TableCell><TableCell>{p.item_id}</TableCell><TableCell>{uang(p.harga)}</TableCell></TableRow>)}</TabelAgen>}</div>
    <section className="rounded-md border p-3"><h3 className="font-semibold">Catatan ringkasan</h3>{data.catatan.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{data.catatan.map((c,i) => <li key={i}>{c}</li>)}</ul> : <p className="mt-1 text-sm text-muted-foreground">Tidak ada catatan tambahan.</p>}{data.dipotong && Object.values(data.dipotong as Json).some(Boolean) ? <p className="mt-2 text-sm text-amber-700">Sebagian kampanye, kata kunci, atau produk dibatasi dalam ringkasan ini.</p> : null}</section>
    <details><summary className="cursor-pointer text-sm text-muted-foreground">Detail teknis ringkasan (JSON)</summary><Data value={data} /></details>
  </div>
}
export function TrenBaca({ data }: { data: Json }) {
  const diagnosis = (data.diagnosis ?? {}) as Json
  return <div className="space-y-3"><p className="text-sm text-muted-foreground">Produk {nilai(data.item_id)} · Tanggal {nilai(data.tanggal)}</p><dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
    ['Terjual 7 hari', data.terjual_7], ['Terjual 28 hari', data.terjual_28], ['Kecepatan 7 hari (unit/hari)', data.kecepatan_7], ['Kecepatan 28 hari (unit/hari)', data.kecepatan_28], ['Dilihat', data.views], ['Perubahan dilihat 7 hari', data.views_delta_7], ['Perubahan dilihat 28 hari', data.views_delta_28], ['Disukai', data.likes], ['Terjual kumulatif', data.sold_kumulatif], ['Penilaian', data.rating], ['Tingkat kualitas', diagnosis.tingkat], ['Jumlah masalah', diagnosis.masalah],
  ].map(([label,v]) => <div key={String(label)} className="rounded-md border p-3"><dt className="text-sm text-muted-foreground">{String(label)}</dt><dd className="mt-1 text-lg font-semibold">{nilai(v)}</dd></div>)}</dl><details><summary className="cursor-pointer text-sm">Detail teknis tren (JSON)</summary><Data value={data} /></details></div>
}
