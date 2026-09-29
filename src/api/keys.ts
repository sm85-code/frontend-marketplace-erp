import type { PesananFilter } from '@/api/endpoints'

export const qk = {
  me: ['auth', 'me'] as const,
  akun: (platform?: string) => ['akun', platform ?? 'all'] as const,
  akunAll: ['akun'] as const,
  produk: ['produk'] as const,
  listing: (produkId?: string) => ['listing', produkId ?? 'all'] as const,
  listingAll: ['listing'] as const,
  gudang: ['gudang'] as const,
  ledger: (produkId?: string, limit?: number) => ['stok', 'ledger', produkId ?? 'all', limit ?? 100] as const,
  ledgerAll: ['stok', 'ledger'] as const,
  pesanan: (filter: PesananFilter) => ['pesanan', 'list', filter] as const,
  pesananAll: ['pesanan'] as const,
  pesananDetail: (id: string) => ['pesanan', 'detail', id] as const,
}
