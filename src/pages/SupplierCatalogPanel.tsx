import InfoTip from '@/components/InfoTip'
import AksiLainnya from '@/components/AksiLainnya'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { connectSupplierCatalog, getSupplierCatalog, getSupplierCatalogConnection, type SupplierCatalogProduct } from '@/api/processing'
import { fmtRp, fmtDateTime, getApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TabelLokal, type KolomTabel } from '@/components/daftar'
import { Field } from './processingShared'
import { cn } from '@/lib/utils'

export default function SupplierCatalogPanel({ selectedId, onPick }: { selectedId?: string; onPick?: (product: SupplierCatalogProduct) => void }) {
  const qc = useQueryClient()
  const connection = useQuery({queryKey: ['supplier-catalog-connection'], queryFn: getSupplierCatalogConnection})
  const catalog = useQuery({queryKey: ['supplier-catalog'], queryFn: getSupplierCatalog, enabled: !!connection.data?.connected, retry: false})
  const [login, setLogin] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const selected = catalog.data?.items.find(p => p.id === selectedId)
  const matches = (catalog.data?.items ?? []).filter(p => [p.sku, p.name, p.category_name].join(' ').toLowerCase().includes(search.trim().toLowerCase()))
  const columns: KolomTabel<SupplierCatalogProduct>[] = [
    { kunci: 'name', judul: 'Produk', tetap: true, nilai: p => p.name, sel: p => p.name },
    { kunci: 'sku', judul: 'SKU', nilai: p => p.sku, sel: p => p.sku },
    { kunci: 'category_name', judul: 'Kategori', nilai: p => p.category_name, sel: p => p.category_name },
    { kunci: 'sell_price', judul: 'Harga beli ERP', nilai: p => Number(p.sell_price), sel: p => fmtRp(p.sell_price) },
    { kunci: 'qty_on_hand', judul: 'Stok', nilai: p => p.qty_on_hand, sel: p => `${p.qty_on_hand} ${p.unit_of_measure}` },
  ]
  return <div className="min-w-0 space-y-3 rounded-xl border p-3 sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-semibold">Katalog Otomatis {connection.data?.unit_name ? `· ${connection.data.unit_name}` : ''}</p>
      <div className="flex gap-2">
        {connection.data?.connected ? <>
          <Button type="button" size="sm" variant="outline" disabled={catalog.isFetching} onClick={() => void catalog.refetch()}>{catalog.isFetching ? 'Memuat…' : 'Refresh'}</Button>
          <AksiLainnya className="size-8"><Button type="button" size="sm" variant="ghost" onClick={() => setLogin(v => !v)}>Hubungkan ulang</Button></AksiLainnya>
        </> : <Button type="button" size="sm" variant="outline" onClick={() => setLogin(v => !v)}>Hubungkan katalog</Button>}
      </div>
    </div>
    {connection.isLoading && <p className="text-sm text-muted-foreground">Memeriksa koneksi…</p>}
    {connection.error && <p role="alert" className="text-sm text-destructive">{getApiError(connection.error)}</p>}
    {login && <div className="space-y-3 rounded-xl bg-muted/30 p-3">
      <InfoTip teks={"Masuk sekali dengan akun admin sumber katalog untuk menghubungkan katalog. Kata sandi tidak disimpan."} />
      <Field title="Username akun katalog"><Input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} /></Field>
      <Field title="Kata sandi akun katalog"><Input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></Field>
      <Button type="button" disabled={busy || !username.trim() || !password} onClick={async () => {
        setBusy(true); setError('')
        try {
          await connectSupplierCatalog(username, password)
          setPassword(''); setLogin(false)
          await qc.invalidateQueries({queryKey: ['supplier-catalog-connection']})
          await qc.invalidateQueries({queryKey: ['supplier-catalog']})
        } catch(e) { setError(getApiError(e)) } finally { setBusy(false) }
      }}>{busy ? 'Menghubungkan…' : 'Hubungkan katalog'}</Button>
    </div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!connection.isLoading && !connection.data?.connected && !login && <p className="text-sm text-muted-foreground">Hubungkan katalog untuk melihat produk, harga jual, dan stok.</p>}
    {catalog.isLoading && connection.data?.connected && <p className="text-sm text-muted-foreground">Memuat katalog…</p>}
    {catalog.error && <p role="alert" className="text-sm text-destructive">{getApiError(catalog.error)}</p>}
    {catalog.data && <>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">Stok {fmtDateTime(catalog.data.read_at)} <InfoTip teks="Harga jual supplier menjadi harga beli ERP." /></p>
      {onPick ? <>
        <div className="space-y-2">
          <Input aria-label="Cari produk katalog" placeholder="Cari nama, SKU, atau kategori" value={search} onChange={e => setSearch(e.target.value)} />
          <div role="listbox" aria-label="Produk katalog" className="max-h-60 space-y-1 overflow-y-auto rounded-2xl border border-input bg-background p-1">
            {matches.map(p => {
              const habis = p.qty_on_hand <= 0
              return <button key={p.id} type="button" role="option" aria-selected={p.id === selectedId} aria-disabled={habis} disabled={habis} title={habis ? 'Stok supplier habis' : undefined}
                className={cn('flex w-full flex-col rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent', p.id === selectedId && 'bg-primary/10 ring-1 ring-primary')}
                onClick={() => onPick(p)}>
                <span className="flex items-start justify-between gap-3">
                  <span className="font-medium">{p.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums">{fmtRp(p.sell_price)}</span>
                </span>
                <span className="flex justify-between gap-3 text-xs text-muted-foreground">
                  <span className="break-all">{[p.sku, p.category_name].filter(Boolean).join(' · ')}</span>
                  <span className={cn('shrink-0 tabular-nums', habis && 'font-medium text-destructive')}>{habis ? 'Habis' : `Stok ${p.qty_on_hand} ${p.unit_of_measure}`}</span>
                </span>
              </button>
            })}
            {!matches.length && <p className="px-3 py-2 text-sm text-muted-foreground">Tidak ada produk yang cocok</p>}
          </div>
          <p className="text-xs text-muted-foreground">{matches.length} dari {catalog.data.items.length} produk.</p>
        </div>
        {selected && <div className="rounded-xl bg-muted/30 p-3 text-sm"><p>{selected.name} · {selected.sku}</p><p className="mt-1 font-medium">Harga terkini {fmtRp(selected.sell_price)} · Stok {selected.qty_on_hand} {selected.unit_of_measure}</p><Button type="button" size="sm" variant="outline" className="mt-2" disabled={selected.qty_on_hand <= 0} onClick={() => onPick(selected)}>Gunakan harga terkini</Button></div>}
      </> : <>
        <Input aria-label="Cari katalog otomatis" placeholder="Cari nama, SKU, atau kategori" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="space-y-2 md:hidden">
          {matches.map(p => <div key={p.id} className="rounded-xl border p-3 text-sm">
            <div className="flex items-start justify-between gap-3"><span className="font-medium">{p.name}</span><span className="shrink-0 font-semibold tabular-nums">{fmtRp(p.sell_price)}</span></div>
            <div className="mt-1 flex justify-between gap-3 text-xs text-muted-foreground"><span className="break-all">{[p.category_name, p.sku].filter(Boolean).join(' · ')}</span><span className={cn('shrink-0 tabular-nums', p.qty_on_hand <= 0 && 'font-medium text-destructive')}>{p.qty_on_hand <= 0 ? 'Habis' : `Stok ${p.qty_on_hand} ${p.unit_of_measure}`}</span></div>
          </div>)}
          {!matches.length && <p className="text-sm text-muted-foreground">Tidak ada produk yang cocok</p>}
        </div>
        <div className="hidden md:block"><TabelLokal label="Katalog Produk Otomatis" items={matches} kolom={columns} idDari={p => p.id} namaDari={p => p.name} minWidth={800} /></div>
      </>}
    </>}
  </div>
}
