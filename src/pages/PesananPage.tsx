import { useQuery } from '@tanstack/react-query'
import { Plus, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getApiError } from '@/api/client'
import { pesananApi, type PesananFilter } from '@/api/endpoints'
import { qk } from '@/api/keys'
import { PLATFORMS, STATUS_PESANAN } from '@/api/types'
import { EmptyState, ErrorState, Field, LoadingState, PageHeader, StatusBadge } from '@/components/common'
import PesananActions from '@/components/PesananActions'
import PesananFormDialog from '@/components/PesananFormDialog'
import TableCard from '@/components/TableCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { akunName, useAkunList, useById } from '@/hooks/queries'
import { fmtDateTime, fmtRp } from '@/lib/format'
import { PLATFORM_LABEL, platformLabel, STATUS_PESANAN_LABEL, statusPesananLabel, statusPesananTone } from '@/lib/labels'
import { cn } from '@/lib/utils'

export default function PesananPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const filter: PesananFilter = {
    status: params.get('status') || undefined,
    platform: params.get('platform') || undefined,
    akun_id: params.get('akun_id') || undefined,
  }

  const akunQ = useAkunList()
  const akunMap = useById(akunQ.data)
  const q = useQuery({ queryKey: qk.pesanan(filter), queryFn: () => pesananApi.list(filter) })

  const setFilter = (key: keyof PesananFilter, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key === 'platform') next.delete('akun_id')
    setParams(next, { replace: true })
  }

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return q.data ?? []
    return (q.data ?? []).filter(
      (p) => p.id_eksternal.toLowerCase().includes(s) || p.nama_pembeli.toLowerCase().includes(s),
    )
  }, [q.data, search])

  const akunOptions = (akunQ.data ?? []).filter((a) => !filter.platform || a.platform === filter.platform)
  const statusTabs = [{ value: '', label: 'Semua' }, ...STATUS_PESANAN.map((s) => ({ value: s, label: STATUS_PESANAN_LABEL[s] }))]

  return (
    <>
      <PageHeader
        title="Pesanan"
        description="Inbox pesanan terpadu dari semua toko."
        actions={
          <>
            <Button variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}>
              <RefreshCw className={q.isFetching ? 'animate-spin' : ''} /> Muat ulang
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus /> Pesanan manual
            </Button>
          </>
        }
      />

      <div className="-mx-3 mb-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
        <div className="inline-flex gap-1 rounded-lg border bg-card p-1">
          {statusTabs.map((t) => (
            <button
              key={t.value || 'all'}
              type="button"
              onClick={() => setFilter('status', t.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
                (filter.status ?? '') === t.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <TableCard
        toolbar={
          <>
            <Field label="Platform" htmlFor="o-platform" className="w-40">
              <NativeSelect id="o-platform" value={filter.platform ?? ''} onChange={(e) => setFilter('platform', e.target.value)}>
                <option value="">Semua</option>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {PLATFORM_LABEL[p]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Toko" htmlFor="o-akun" className="min-w-48 flex-1">
              <NativeSelect id="o-akun" value={filter.akun_id ?? ''} onChange={(e) => setFilter('akun_id', e.target.value)}>
                <option value="">Semua toko</option>
                {akunOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nama_toko}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Cari" htmlFor="o-search" className="min-w-48 flex-1">
              <Input id="o-search" placeholder="No. pesanan / pembeli" value={search} onChange={(e) => setSearch(e.target.value)} />
            </Field>
          </>
        }
      >
        {q.isLoading ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState message={getApiError(q.error)} onRetry={() => q.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Tidak ada pesanan"
            hint="Pesanan dari marketplace akan muncul di sini. Untuk uji coba, buat pesanan manual."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. pesanan</TableHead>
                <TableHead>Toko</TableHead>
                <TableHead>Pembeli</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/pesanan/${p.id}`)}>
                  <TableCell>
                    <p className="font-mono text-xs font-medium">{p.id_eksternal}</p>
                    <p className="text-xs text-muted-foreground">
                      {platformLabel(p.platform)} · {p.items.length} item
                    </p>
                  </TableCell>
                  <TableCell>{akunName(akunMap, p.akun_id)}</TableCell>
                  <TableCell>{p.nama_pembeli || '-'}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{fmtRp(p.total)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge tone={statusPesananTone(p.status)}>{statusPesananLabel(p.status)}</StatusBadge>
                      {p.catatan_sinkron && !p.tersinkron_marketplace ? (
                        <StatusBadge tone="warning">Belum sinkron</StatusBadge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{fmtDateTime(p.created_at)}</TableCell>
                  <TableCell>
                    <PesananActions pesanan={p} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableCard>
      <PesananFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
