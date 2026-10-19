import * as api from '@/api/commerce'
import { daftarPesanan } from '@/api/endpoints'
import type { AkunMarketplace } from '@/api/types'
import { putusan, ringkasanKosong, type Ringkasan } from '@/lib/menungguPencairan'

export interface BarisCair {
  shopId: string
  shopName: string
  number: string
  /** ERP order id, when the Pesanan menu knows the order. */
  erpId: string | null
  /** In Shopee's own pending-income list; otherwise the amount comes from the order's escrow estimate. */
  dariDaftar: boolean
  amount: number | null
  currency?: string
  payoutTime: number | null
  detail: api.IncomeOrderDetail | undefined
}

const wibDate = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date)
const BATCH = 30

/**
 * Orders waiting for their payout: everything Shopee lists as pending income plus the orders the Pesanan menu shows as
 * "Dikirim", checked against Shopee's own order status. Only shipped orders are kept; a shipped order that Shopee's list
 * does not show still has an estimated payout (get_escrow_detail), which is read for it.
 */
export async function muatMenunggu(shops: AkunMarketplace[], semuaToko: boolean) {
  const dari = wibDate(new Date(Date.now() - 13 * 86400000))
  const sampai = wibDate(new Date())
  const daftar = new Map<string, api.IncomeRow>()
  for (const shop of shops) {
    let cursor = ''
    for (let page = 0; page < 40; page++) {
      const result = await api.income(shop.id, { dari, sampai, income_status: 2, cursor, page_size: 100 })
      for (const row of result.items) if (row.order_sn) daftar.set(`${shop.id}:${row.order_sn}`, row)
      if (!result.ada_lagi || !result.next_cursor) break
      cursor = result.next_cursor
    }
  }
  const erp = new Map<string, string>()
  const ids = new Set(shops.map((s) => s.id))
  for (let halaman = 1; halaman <= 20; halaman++) {
    const page = await daftarPesanan({ tahap: 'dikirim', akun_id: semuaToko ? undefined : shops[0]?.id, halaman, per_halaman: 100 })
    for (const o of page.items) if (o.akun_id && ids.has(o.akun_id)) erp.set(`${o.akun_id}:${o.id_eksternal}`, o.id)
    if (halaman * page.per_halaman >= page.total) break
  }
  const kunci = [...new Set([...daftar.keys(), ...erp.keys()])]
  const detail = new Map<string, api.IncomeOrderDetail>()
  for (const shop of shops) {
    const nomor = kunci.filter((k) => k.startsWith(`${shop.id}:`)).map((k) => k.slice(shop.id.length + 1)).filter((n) => /^[A-Za-z0-9]{1,50}$/.test(n))
    for (let i = 0; i < nomor.length; i += BATCH) {
      const batch = await api.incomeOrders(shop.id, nomor.slice(i, i + BATCH))
      for (const item of batch.items) detail.set(`${shop.id}:${item.order_sn}`, item)
    }
  }
  const dikecualikan: Ringkasan = ringkasanKosong()
  const baris: BarisCair[] = []
  const nama = new Map(shops.map((s) => [s.id, s.nama_toko]))
  for (const k of kunci) {
    const shopId = k.slice(0, k.indexOf(':'))
    const number = k.slice(shopId.length + 1)
    const d = detail.get(k)
    const keputusan = putusan({ detail: d, dalamDaftarShopee: daftar.has(k) })
    if (!keputusan.baris) {
      dikecualikan[keputusan.alasan]++
      continue
    }
    const row = daftar.get(k)
    baris.push({
      shopId,
      shopName: nama.get(shopId) ?? shopId,
      number,
      erpId: erp.get(k) ?? null,
      dariDaftar: keputusan.dariDaftar,
      amount: row?.estimated_escrow_amount == null ? null : Number(row.estimated_escrow_amount),
      currency: row?.currency,
      payoutTime: row?.estimated_payout_time ?? null,
      detail: d,
    })
  }
  // Shipped but not in Shopee's list: the estimated payout lives in the order's escrow detail.
  const tanpaDaftar = baris.filter((b) => !b.dariDaftar && b.erpId)
  for (let i = 0; i < tanpaDaftar.length; i += 4) {
    await Promise.all(
      tanpaDaftar.slice(i, i + 4).map(async (b) => {
        try {
          const income = (await api.orderIncome(b.erpId!)).order_income
          const jumlah = Number(income.escrow_amount_after_adjustment ?? income.escrow_amount)
          b.amount = Number.isFinite(jumlah) ? jumlah : null
          b.currency = 'IDR'
        } catch {
          b.amount = null
        }
      }),
    )
  }
  return { baris, dikecualikan }
}
