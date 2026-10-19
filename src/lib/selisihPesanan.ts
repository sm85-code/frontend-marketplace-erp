/** Why a Pesanan "Dikirim" order is not in Menunggu Pencairan (Shopee pending income list). */
export type Alasan = 'toko_lain' | 'tidak_ditemukan' | 'selesai' | 'batal' | 'retur' | 'belum_ada'

export const ALASAN_LABEL: Record<Alasan, string> = {
  toko_lain: 'Toko tidak ada di daftar Menunggu Pencairan',
  tidak_ditemukan: 'Tidak ditemukan di Shopee',
  selesai: 'Sudah selesai di Shopee (sudah cair atau menunggu rilis); status di ERP belum diperbarui',
  batal: 'Dibatalkan di Shopee; status di ERP belum diperbarui',
  retur: 'Dalam retur di Shopee',
  belum_ada: 'Masih berjalan di Shopee tetapi belum ada di daftar Menunggu Pencairan',
}

export const ALASAN_SINGKAT: Record<Alasan, string> = {
  toko_lain: 'Toko lain',
  tidak_ditemukan: 'Tidak ditemukan',
  selesai: 'Sudah selesai',
  batal: 'Dibatalkan',
  retur: 'Retur',
  belum_ada: 'Belum masuk daftar',
}

export function alasanSelisih(input: { tokoDiDaftar: boolean; statusShopee?: string | null }): Alasan {
  if (!input.tokoDiDaftar) return 'toko_lain'
  const status = input.statusShopee
  if (!status) return 'tidak_ditemukan'
  if (status === 'COMPLETED') return 'selesai'
  if (status === 'CANCELLED' || status === 'IN_CANCEL') return 'batal'
  if (status === 'TO_RETURN') return 'retur'
  return 'belum_ada'
}

export const STATUS_SHOPEE_LABEL: Record<string, string> = {
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
  IN_CANCEL: 'Pembatalan diminta',
  TO_RETURN: 'Retur',
  SHIPPED: 'Dalam pengiriman',
  TO_CONFIRM_RECEIVE: 'Menunggu konfirmasi penerimaan',
  READY_TO_SHIP: 'Belum dikirim',
  PROCESSED: 'Belum dikirim',
  UNPAID: 'Belum dibayar',
}

export type BarisSelisih = { nomor: string; akunId: string | null; alasan: Alasan; statusShopee: string | null }

/** Splits Pesanan "Dikirim" orders into those listed as pending income and the rest, and counts the reasons. */
export function bandingkan(
  dikirim: { nomor: string; akunId: string | null }[],
  menunggu: Map<string, Set<string>>,
  statusShopee: Map<string, string | undefined>,
) {
  const adaDiDaftar = (akunId: string | null, nomor: string) => !!akunId && !!menunggu.get(akunId)?.has(nomor)
  const selisih: BarisSelisih[] = dikirim
    .filter((o) => !adaDiDaftar(o.akunId, o.nomor))
    .map((o) => {
      const status = statusShopee.get(`${o.akunId}:${o.nomor}`) ?? null
      return { nomor: o.nomor, akunId: o.akunId, statusShopee: status, alasan: alasanSelisih({ tokoDiDaftar: !!o.akunId && menunggu.has(o.akunId), statusShopee: status }) }
    })
  const nomorDikirim = new Set(dikirim.map((o) => `${o.akunId}:${o.nomor}`))
  let menungguTanpaDikirim = 0
  for (const [akunId, set] of menunggu) for (const nomor of set) if (!nomorDikirim.has(`${akunId}:${nomor}`)) menungguTanpaDikirim++
  const jumlahMenunggu = [...menunggu.values()].reduce((n, s) => n + s.size, 0)
  return { selisih, menungguTanpaDikirim, jumlahMenunggu }
}
