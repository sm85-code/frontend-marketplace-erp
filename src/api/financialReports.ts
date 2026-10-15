import api from './client'
export const balanceLabels = {
  kas_utama: 'Kas utama', stok: 'Persediaan (nilai biaya)', kas_operasional: 'Kas operasional',
  iklan_prabayar: 'Iklan dibayar di muka', piutang_pengiriman: 'Piutang dalam pengiriman',
  saldo_toko: 'Saldo tertahan toko', kas_gaji: 'Kas gaji', utang_gaji: 'Utang gaji',
  utang_usaha: 'Utang usaha', modal: 'Modal usaha', saldo_laba: 'Saldo laba/rugi',
} as const
export type BalanceKey = keyof typeof balanceLabels
export type Balances = Record<BalanceKey, string>
export const inputLabels = {
  penarikan_lain: 'Penarikan toko di luar settlement terpilih', pendapatan_produk: 'Penjualan produk kayu',
  jasa_proses: 'Jasa proses pesanan', jasa_cat_packing: 'Jasa pengecatan & packing', jasa_cat: 'Jasa pengecatan saja',
  bayar_tukang: 'Pembayaran tukang kayu', pembelian: 'Pembayaran produk & packing', operasional: 'Biaya operasional',
  langganan: 'Langganan rutin', gaji: 'Beban gaji periode ini', biaya_iklan: 'Pemakaian iklan',
  topup_iklan: 'Top-up iklan dari kas utama', transfer_kas_ops: 'Transfer kas operasional ke kas utama',
  transfer_kas_gaji: 'Penyisihan kas utama ke kas gaji', bayar_gaji: 'Gaji dibayar dari kas gaji', tambahan_modal: 'Tambahan modal masuk kas',
  piutang_pengiriman: 'Saldo akhir piutang pengiriman (bersih)', saldo_toko: 'Saldo akhir tertahan toko',
  stok: 'Saldo akhir persediaan (nilai biaya)', utang_usaha: 'Saldo akhir utang usaha',
} as const
export type InputKey = keyof typeof inputLabels
export type CloseInput = Record<InputKey, string | null> & { tanggal: string; settlement_ids: string[]; tanggal_settlement: Record<string, string>; transaksi: { tanggal: string; jenis: InputKey; nominal: string }[]; catatan: string; sumber_diperiksa: boolean; preview_token?: string }
export type Sources = {
  utama?: 'google_drive' | 'erp'; drive?: { url: string; tab: string }; pembanding_erp?: unknown;
  settlements: { id: string; toko: string; net: string; periode_selesai: string }[]
  iklan: { id: string; toko: string; tanggal: string; expense: string; diambil_at: string }[]
  biaya_iklan: string
  pesanan_pengiriman: { id: string; nomor: string; toko: string; total_bruto: string }[]
  stok: { id: string; nama: string; tersedia: number; fisik: number }[]
  peringatan: string[]
}
export type Result = {
  pemasukan_toko: string; pendapatan_lain: string; perubahan_piutang: string; pemasukan: string;
  hpp: string; penyesuaian_stok: string; penyesuaian_utang: string; biaya_iklan: string;
  pengeluaran: string; laba: string; kas_masuk: string; kas_keluar: string; transfer_antar_kas: string;
  saldo_awal: Balances; saldo_akhir: Balances; neraca: { aset: string; utang: string; ekuitas: string; selisih: string }
}
export type Report = { rincian_toko?: { nama: string; nominal: string }[]; preview_token: string; tanggal: string; mulai: string; jadwal_laporan: string; lengkap?: boolean; calendar_version?: number; imported_historical?: boolean; tutup_bulanan: boolean; input: CloseInput; sumber: Sources; hasil: Result; created_by?: string; created_at?: string }
export type Overview = {
  sumber_utama: 'google_drive' | 'erp'; asal: { url: string; tab: string; read_at: string } | null; akhir_bulan: string; jadwal_bulanan: string; mingguan: { mulai: string; tanggal: string; jadwal_laporan: string; laporan: Report | null }[]; laporan_bulanan: Report | null; legacy: Report[]; saldo_awal: { tanggal: string; saldo: Balances } | null;
  laporan: Report[]; berikutnya: string | null; terakhir: string | null;
  bulanan: { final: boolean; pemasukan: string; pengeluaran: string; laba: string; saldo_akhir: Balances | null }
}
export type Audit = { id: string; tanggal: string; action: string; alasan: string; oleh: string; waktu: string }
export const overview = async (periode: string) => (await api.get<Overview>('/laporan-keuangan', { params: { periode } })).data
export const sources = async (tanggal: string) => (await api.get<{ sumber_utama: 'google_drive' | 'erp'; mulai: string; saldo_sebelumnya: Balances; sumber: Sources }>('/laporan-keuangan/sumber', { params: { tanggal } })).data
export const opening = async (tanggal: string, saldo: Balances) => (await api.post('/laporan-keuangan/saldo-awal', { tanggal, saldo })).data
export const preview = async (data: CloseInput) => (await api.post<Report>('/laporan-keuangan/pratinjau', data)).data
export const close = async (data: CloseInput) => (await api.post<Report>('/laporan-keuangan/tutup', data)).data
export const reopen = async (tanggal: string, alasan: string) => (await api.post(`/laporan-keuangan/${tanggal}/buka-kembali`, { alasan })).data
export const history = async () => (await api.get<Audit[]>('/laporan-keuangan/riwayat')).data

export type Comparison = { periode?: { mulai: string; akhir: string; hari: string }; periode_iklan_laporan?: { mulai: string; akhir: string }; laporan: { piutang_pengiriman: string; saldo_toko: string; piutang_total: string; biaya_iklan: string }; erp: { piutang_pengiriman_bruto: string; saldo_toko: null; piutang_belum_ditarik: null; biaya_iklan: string; pesanan: (Sources['pesanan_pengiriman'][number] & { tanggal_kirim?: string; status?: string })[]; rincian_toko?: { nama: string; akun_ditemukan: boolean; jumlah_pesanan: number; nominal: string }[]; rincian_minggu?: { mulai: string; akhir: string; jumlah_pesanan: number; nominal: string }[] }; dibaca_at: string; catatan: string }
export const comparison = async (tanggal: string) => (await api.get<Comparison>(`/laporan-keuangan/${tanggal}/pembanding`)).data
export const importDrive = async (data: unknown) => (await api.post('/laporan-keuangan/impor-drive', data)).data

export type ShopeeIncomeCell = { estimasi: string | null; riil: string; belum_riil: number; jumlah: string | null }
export type ShopeeIncome = { periode: string; minggu: { mulai: string; akhir: string }[]; toko: { id: string; nama: string; akun_ditemukan?: boolean; minggu: ShopeeIncomeCell[] }[]; catatan: string }
export const shopeeIncome = async (periode: string, jumlah_kolom: number, sampai?: string) => (await api.get<ShopeeIncome>('/laporan-keuangan/pemasukan-shopee', { params: { periode, jumlah_kolom, sampai } })).data

export const shopeeReleasedFunds = async (periode: string, jumlah_kolom: number, sampai?: string) => (await api.get<ShopeeIncome>('/laporan-keuangan/saldo-penjual-shopee', { params: { periode, jumlah_kolom, sampai } })).data
