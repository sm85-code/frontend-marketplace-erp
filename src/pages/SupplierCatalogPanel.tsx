import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { connectSupplierCatalog, getSupplierCatalog, getSupplierCatalogConnection, type SupplierCatalogProduct } from '@/api/processing'
import { fmtRp, fmtDateTime, getApiError } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TabelLokal, type KolomTabel } from '@/components/daftar'
import { Field, SelectField } from './processingShared'

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
  const columns: KolomTabel<SupplierCatalogProduct>[] = [
    { kunci: 'sku', judul: 'SKU', nilai: p => p.sku, sel: p => p.sku },
    { kunci: 'name', judul: 'Produk', tetap: true, nilai: p => p.name, sel: p => p.name },
    { kunci: 'category_name', judul: 'Kategori', nilai: p => p.category_name, sel: p => p.category_name },
    { kunci: 'sell_price', judul: 'Harga beli ERP', nilai: p => Number(p.sell_price), sel: p => fmtRp(p.sell_price) },
    { kunci: 'qty_on_hand', judul: 'Stok Siabumdes', nilai: p => p.qty_on_hand, sel: p => `${p.qty_on_hand} ${p.unit_of_measure}` },
  ]
  return <div className="min-w-0 space-y-3 rounded-xl border p-3 sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-semibold">Katalog Siabumdes {connection.data?.unit_name ? `· ${connection.data.unit_name}` : ''}</p>
      <div className="flex gap-2">
        {connection.data?.connected && <Button type="button" size="sm" variant="outline" disabled={catalog.isFetching} onClick={() => void catalog.refetch()}>{catalog.isFetching ? 'Memuat…' : 'Perbarui stok'}</Button>}
        <Button type="button" size="sm" variant="outline" onClick={() => setLogin(v => !v)}>{connection.data?.connected ? 'Hubungkan ulang' : 'Hubungkan Siabumdes'}</Button>
      </div>
    </div>
    {connection.isLoading && <p className="text-sm text-muted-foreground">Memeriksa koneksi…</p>}
    {connection.error && <p role="alert" className="text-sm text-destructive">{getApiError(connection.error)}</p>}
    {login && <div className="space-y-3 rounded-xl bg-muted/30 p-3">
      <p className="text-sm text-muted-foreground">Masuk sekali dengan akun admin Siabumdes untuk menghubungkan katalog. Kata sandi tidak disimpan.</p>
      <Field title="Username Siabumdes"><Input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} /></Field>
      <Field title="Kata sandi Siabumdes"><Input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></Field>
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
    {!connection.isLoading && !connection.data?.connected && !login && <p className="text-sm text-muted-foreground">Hubungkan Siabumdes untuk melihat produk, harga jual, dan stok.</p>}
    {catalog.isLoading && connection.data?.connected && <p className="text-sm text-muted-foreground">Memuat katalog…</p>}
    {catalog.error && <p role="alert" className="text-sm text-destructive">{getApiError(catalog.error)}</p>}
    {catalog.data && <>
      <p className="text-xs text-muted-foreground">Harga jual Siabumdes menjadi harga beli ERP. Stok dibaca {fmtDateTime(catalog.data.read_at)}.</p>
      {onPick ? <>
        <Field title="Produk Siabumdes"><SelectField required value={selectedId || ''} onChange={e => { const p = catalog.data.items.find(p => p.id === e.target.value); if(p) onPick(p) }}>
          <option value="">Pilih produk Siabumdes</option>
          {catalog.data.items.map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name} · {fmtRp(p.sell_price)} · stok {p.qty_on_hand} {p.unit_of_measure}</option>)}
        </SelectField></Field>
        {selected && <div className="rounded-xl bg-muted/30 p-3 text-sm"><p>{selected.name} · {selected.sku}</p><p className="mt-1 font-medium">Harga terkini {fmtRp(selected.sell_price)} · Stok {selected.qty_on_hand} {selected.unit_of_measure}</p></div>}
      </> : <>
        <Input aria-label="Cari katalog Siabumdes" placeholder="Cari nama, SKU, atau kategori" value={search} onChange={e => setSearch(e.target.value)} />
        <TabelLokal label="Katalog Produk Siabumdes" items={catalog.data.items.filter(p => [p.sku,p.name,p.category_name].join(' ').toLowerCase().includes(search.toLowerCase()))} kolom={columns} idDari={p => p.id} namaDari={p => p.name} minWidth={800} />
      </>}
    </>}
  </div>
}
