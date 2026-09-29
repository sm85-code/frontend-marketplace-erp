import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { akunApi, produkApi, stokApi } from '@/api/endpoints'
import { qk } from '@/api/keys'
import type { AkunMarketplaceOut, ProdukOut } from '@/api/types'

export function useAkunList(platform?: string) {
  return useQuery({ queryKey: qk.akun(platform), queryFn: () => akunApi.list({ platform }) })
}

export function useProdukList() {
  return useQuery({ queryKey: qk.produk, queryFn: () => produkApi.list() })
}

export function useGudangList() {
  return useQuery({ queryKey: qk.gudang, queryFn: () => stokApi.gudang(), staleTime: 5 * 60_000 })
}

export function useById<T extends { id: string }>(rows: T[] | undefined): Map<string, T> {
  return useMemo(() => new Map((rows ?? []).map((r) => [r.id, r])), [rows])
}

export function akunName(map: Map<string, AkunMarketplaceOut>, id: string | null | undefined): string {
  if (!id) return '-'
  return map.get(id)?.nama_toko ?? id.slice(0, 8)
}

export function produkName(map: Map<string, ProdukOut>, id: string | null | undefined): string {
  if (!id) return '-'
  const p = map.get(id)
  return p ? `${p.sku_induk} · ${p.nama}` : id.slice(0, 8)
}
