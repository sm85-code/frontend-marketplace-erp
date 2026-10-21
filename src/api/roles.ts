import api from '@/api/client'
import type { AksesSaya, RoleDaftar, RoleIsian } from '@/api/types'

export const aksesSaya = () => api.get<AksesSaya>('/auth/akses').then((r) => r.data)
export const daftarRole = () => api.get<RoleDaftar>('/roles').then((r) => r.data)
export const buatRole = (isian: RoleIsian) => api.post<{ id: string }>('/roles', isian).then((r) => r.data)
export const ubahRole = (id: string, isian: RoleIsian) => api.put<{ id: string }>(`/roles/${id}`, isian).then((r) => r.data)
export const hapusRole = (id: string) => api.delete(`/roles/${id}`).then((r) => r.data)
