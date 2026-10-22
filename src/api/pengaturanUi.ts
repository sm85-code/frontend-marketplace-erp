import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import api from '@/api/client'

export const daftarPengaturanUi = () => api.get<{ items: Record<string, string> }>('/pengaturan-ui').then((r) => r.data.items ?? {})
export const simpanPengaturanUi = (id: string, teks: string) => api.put(`/pengaturan-ui/${encodeURIComponent(id)}`, { teks }).then((r) => r.data)
export const kembalikanPengaturanUi = (id: string) => api.delete(`/pengaturan-ui/${encodeURIComponent(id)}`).then((r) => r.data)

const KUNCI = ['pengaturan-ui']

/** The texts the admin changed, by id. Empty while loading or if they cannot be had: the app then shows its own defaults. */
export function usePengaturanUi() {
  return useQuery({ queryKey: KUNCI, queryFn: daftarPengaturanUi, staleTime: 5 * 60_000, retry: false })
}

/** `t(id, bawaan)`: the text the admin set for this id, else the app's own default. Identity is always the id, never the text. */
export function useLabel() {
  const { data } = usePengaturanUi()
  return useCallback((id: string, bawaan: string) => data?.[id] ?? bawaan, [data])
}

export const ID_APP = { nama: 'app:nama', subjudul: 'app:subjudul', logo: 'app:logo' } as const
export const APP_BAWAAN = { nama: 'Ampel Kuning', subjudul: 'ERP System', logo: '/logo-ampel-bulat.png' }

/** Name, subtitle and logo shown in the sidebar and the phone header. */
export function useIdentitas() {
  const t = useLabel()
  return { nama: t(ID_APP.nama, APP_BAWAAN.nama), subjudul: t(ID_APP.subjudul, APP_BAWAAN.subjudul), logo: t(ID_APP.logo, APP_BAWAAN.logo) }
}

export function useUbahTeks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, teks }: { id: string; teks: string | null }) => (teks === null ? kembalikanPengaturanUi(id) : simpanPengaturanUi(id, teks)),
    onSuccess: () => qc.invalidateQueries({ queryKey: KUNCI }),
  })
}
