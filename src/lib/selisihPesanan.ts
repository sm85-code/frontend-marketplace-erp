/** Why a Pesanan "Dikirim" order is not in Menunggu Pencairan (Shopee pending income list). */
export type Alasan = 'toko_lain' | 'tidak_ditemukan' | 'selesai' | 'batal' | 'retur' | 'ada_estimasi' | 'tanpa_estimasi'

export const ALASAN_LABEL: Record<Alasan, string> = {
  toko_lain: 'Toko tidak ada di daftar Menunggu Pencairan',
  tidak_ditemukan: 'Tidak ditemukan di Shopee',
  selesai: 'Sudah selesai di Shopee (sudah cair atau menunggu rilis); status di ERP belum diperbarui',
  batal: 'Dibatalkan di Shopee; status di ERP belum diperbarui',
  retur: 'Dalam retur di Shopee',
  ada_estimasi: 'Sudah dikirim dan Shopee memberi estimasi pencairan, tetapi pesanan belum tampil di daftar Menunggu Pencairan',
  tanpa_estimasi: 'Shopee belum memberi estimasi pencairan untuk pesanan ini',
}

export const ALASAN_SINGKAT: Record<Alasan, string> = {
  toko_lain: 'Toko lain',
  tidak_ditemukan: 'Tidak ditemukan',
  selesai: 'Sudah selesai',
  batal: 'Dibatalkan',
  retur: 'Retur',
  ada_estimasi: 'Ada estimasi, belum tampil di daftar',
  tanpa_estimasi: 'Belum ada estimasi',
}

/** `estimasi` = the amount Shopee expects to pay out for the order (get_escrow_detail), null when it has none. */
export function alasanSelisih(input: { tokoDiDaftar: boolean; statusShopee?: string | null; estimasi?: number | null }): Alasan {
  if (!input.tokoDiDaftar) return 'toko_lain'
  const status = input.statusShopee
  if (!status) return 'tidak_ditemukan'
  if (status === 'COMPLETED') return 'selesai'
  if (status === 'CANCELLED' || status === 'IN_CANCEL') return 'batal'
  if (status === 'TO_RETURN') return 'retur'
  // Shipped and still running: Shopee shows an estimated payout from the moment the parcel is on its way.
  return input.estimasi != null && input.estimasi > 0 ? 'ada_estimasi' : 'tanpa_estimasi'
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

export type BarisSelisih = { nomor: string; akunId: string | null; alasan: Alasan; statusShopee: string | null; estimasi: number | null }

/** Splits Pesanan "Dikirim" orders into those listed as pending income and the rest, and counts the reasons. */
export function bandingkan(
  dikirim: { nomor: string; akunId: string | null }[],
  menunggu: Map<string, Set<string>>,
  statusShopee: Map<string, string | undefined>,
  estimasi: Map<string, number | null> = new Map(),
) {
  const adaDiDaftar = (akunId: string | null, nomor: string) => !!akunId && !!menunggu.get(akunId)?.has(nomor)
  const selisih: BarisSelisih[] = dikirim
    .filter((o) => !adaDiDaftar(o.akunId, o.nomor))
    .map((o) => {
      const kunci = `${o.akunId}:${o.nomor}`
      const status = statusShopee.get(kunci) ?? null
      const perkiraan = estimasi.get(kunci) ?? null
      return { nomor: o.nomor, akunId: o.akunId, statusShopee: status, estimasi: perkiraan, alasan: alasanSelisih({ tokoDiDaftar: !!o.akunId && menunggu.has(o.akunId), statusShopee: status, estimasi: perkiraan }) }
    })
  const nomorDikirim = new Set(dikirim.map((o) => `${o.akunId}:${o.nomor}`))
  let menungguTanpaDikirim = 0
  for (const [akunId, set] of menunggu) for (const nomor of set) if (!nomorDikirim.has(`${akunId}:${nomor}`)) menungguTanpaDikirim++
  const jumlahMenunggu = [...menunggu.values()].reduce((n, s) => n + s.size, 0)
  const ada = selisih.filter((s) => s.alasan === 'ada_estimasi')
  const estimasiTidakTampil = { jumlah: ada.length, total: ada.reduce((n, s) => n + (s.estimasi ?? 0), 0) }
  return { selisih, menungguTanpaDikirim, jumlahMenunggu, estimasiTidakTampil }
}
