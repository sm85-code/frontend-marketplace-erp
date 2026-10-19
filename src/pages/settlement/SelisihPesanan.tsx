import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as api from '@/api/commerce'
import { daftarPesanan } from '@/api/endpoints'
import { fmtRp, getApiError } from '@/api/client'
import type { AkunMarketplace } from '@/api/types'
import Spinner from '@/components/Spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ALASAN_LABEL, ALASAN_SINGKAT, STATUS_SHOPEE_LABEL, bandingkan, type Alasan } from '@/lib/selisihPesanan'

const wibDate = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date)

async function muat(shops: AkunMarketplace[], semuaToko: boolean) {
  // 1. Every order the Pesanan menu lists as "Dikirim" (all dates, like the menu's default).
  const dikirim: { id: string; nomor: string; akunId: string | null }[] = []
  for (let halaman = 1; halaman <= 20; halaman++) {
    const page = await daftarPesanan({ tahap: 'dikirim', akun_id: semuaToko ? undefined : shops[0]?.id, halaman, per_halaman: 100 })
    dikirim.push(...page.items.map((o) => ({ id: o.id, nomor: o.id_eksternal, akunId: o.akun_id })))
    if (halaman * page.per_halaman >= page.total) break
  }
  // 2. Every pending-income order of the shops in the Menunggu Pencairan table (all pages).
  const dari = wibDate(new Date(Date.now() - 13 * 86400000))
  const sampai = wibDate(new Date())
  const menunggu = new Map<string, Set<string>>()
  for (const shop of shops) {
    const set = new Set<string>()
    let cursor = ''
    for (let page = 0; page < 40; page++) {
      const result = await api.income(shop.id, { dari, sampai, income_status: 2, cursor, page_size: 100 })
      for (const row of result.items) if (row.order_sn) set.add(row.order_sn)
      if (!result.ada_lagi || !result.next_cursor) break
      cursor = result.next_cursor
    }
    menunggu.set(shop.id, set)
  }
  // 3. Shopee's own status of the shipped orders that are not pending.
  const tanpaDaftar = dikirim.filter((o) => !(o.akunId && menunggu.get(o.akunId)?.has(o.nomor)))
  const status = new Map<string, string | undefined>()
  for (const shop of shops) {
    const nomor = tanpaDaftar.filter((o) => o.akunId === shop.id).map((o) => o.nomor)
    for (let i = 0; i < nomor.length; i += 30) {
      const detail = await api.incomeOrders(shop.id, nomor.slice(i, i + 30))
      for (const item of detail.items) status.set(`${shop.id}:${item.order_sn}`, item.order_status)
    }
  }
  // 4. A parcel that is on its way has an estimated payout in Shopee (get_escrow_detail): read it for the running orders.
  const estimasi = new Map<string, number | null>()
  const berjalan = tanpaDaftar.filter((o) => {
    const s = status.get(`${o.akunId}:${o.nomor}`)
    return !!o.akunId && menunggu.has(o.akunId) && !!s && !['COMPLETED', 'CANCELLED', 'IN_CANCEL', 'TO_RETURN'].includes(s)
  })
  for (let i = 0; i < berjalan.length; i += 4) {
    await Promise.all(
      berjalan.slice(i, i + 4).map(async (o) => {
        try {
          const detail = (await api.orderIncome(o.id)).order_income
          const jumlah = Number(detail.escrow_amount_after_adjustment ?? detail.escrow_amount)
          estimasi.set(`${o.akunId}:${o.nomor}`, Number.isFinite(jumlah) ? jumlah : null)
        } catch {
          estimasi.set(`${o.akunId}:${o.nomor}`, null)
        }
      }),
    )
  }
  return { jumlahDikirim: dikirim.length, ...bandingkan(dikirim, menunggu, status, estimasi) }
}

/** Read-only check: which "Dikirim" orders of the Pesanan menu are missing from Menunggu Pencairan, and why. */
export default function SelisihPesanan({ shops, semuaToko }: { shops: AkunMarketplace[]; semuaToko: boolean }) {
  const [buka, setBuka] = useState(false)
  const q = useQuery({
    queryKey: ['selisih-pesanan', shops.map((s) => s.id).join(','), semuaToko],
    queryFn: () => muat(shops, semuaToko),
    enabled: buka,
    staleTime: 60_000,
    retry: false,
  })
  const nama = new Map(shops.map((s) => [s.id, s.nama_toko]))
  const hitung = new Map<Alasan, number>()
  for (const b of q.data?.selisih ?? []) hitung.set(b.alasan, (hitung.get(b.alasan) ?? 0) + 1)
  return (
    <details className="rounded-xl border bg-card p-3 text-sm" onToggle={(e) => setBuka((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="cursor-pointer font-medium">Cek selisih dengan menu Pesanan</summary>
      <div className="mt-3 space-y-3">
        {buka && q.isFetching && <Spinner label="Membandingkan menu Pesanan dengan daftar Shopee…" />}
        {q.error && <p role="alert">{getApiError(q.error)}</p>}
        {q.data && (
          <>
            <p>
              Menu Pesanan (Dikirim): <strong>{q.data.jumlahDikirim}</strong> · Menunggu Pencairan: <strong>{q.data.jumlahMenunggu}</strong> · Dikirim
              tetapi tidak menunggu cair: <strong>{q.data.selisih.length}</strong>
              {q.data.menungguTanpaDikirim > 0 && <> · Menunggu cair tetapi tidak berstatus Dikirim: <strong>{q.data.menungguTanpaDikirim}</strong></>}
            </p>
            {q.data.estimasiTidakTampil.jumlah > 0 && (
              <p>
                Estimasi pencairan yang belum tampil di daftar Menunggu Pencairan: <strong>{fmtRp(q.data.estimasiTidakTampil.total)}</strong> dari{' '}
                <strong>{q.data.estimasiTidakTampil.jumlah}</strong> pesanan.
              </p>
            )}
            {q.data.selisih.length === 0 ? (
              <p className="text-muted-foreground">Semua pesanan Dikirim ada di daftar Menunggu Pencairan.</p>
            ) : (
              <>
                <ul className="list-disc space-y-1 pl-5">
                  {[...hitung].map(([alasan, n]) => (
                    <li key={alasan}>
                      <strong>{n}</strong> · {ALASAN_LABEL[alasan]}
                    </li>
                  ))}
                </ul>
                <div className="max-w-full overflow-x-auto rounded-lg border">
                  <Table aria-label="Pesanan Dikirim yang tidak ada di Menunggu Pencairan">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode pesanan</TableHead>
                        <TableHead>Toko</TableHead>
                        <TableHead>Alasan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {q.data.selisih.map((b) => (
                        <TableRow key={`${b.akunId}:${b.nomor}`}>
                          <TableCell className="whitespace-nowrap font-mono">{b.nomor}</TableCell>
                          <TableCell>{(b.akunId && nama.get(b.akunId)) || '—'}</TableCell>
                          <TableCell className="whitespace-normal" title={b.statusShopee ? `Status di Shopee: ${STATUS_SHOPEE_LABEL[b.statusShopee] ?? b.statusShopee}` : undefined}>
                            {ALASAN_SINGKAT[b.alasan]}
                            {b.alasan === 'ada_estimasi' && b.estimasi != null ? ` · ${fmtRp(b.estimasi)}` : ''}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </details>
  )
}
