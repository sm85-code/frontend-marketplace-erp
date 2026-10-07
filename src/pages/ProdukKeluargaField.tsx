import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import * as endpoints from '@/api/endpoints'
import { getApiError } from '@/api/client'
import type { KatalogVarianOpsi } from '@/api/types'
import { useConfirm } from '@/components/ConfirmProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function ProdukKeluargaField({ value, options, onChange }: {
  value: string; options: KatalogVarianOpsi[]; onChange: (id: string, options: KatalogVarianOpsi[]) => void
}) {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [renaming, setRenaming] = useState(false)
  const [rename, setRename] = useState('')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [tiers, setTiers] = useState(['Warna'])
  const { data: families, error, refetch } = useQuery({ queryKey: ['produk-keluarga'], queryFn: endpoints.listProdukKeluarga })
  const create = useMutation({
    mutationFn: endpoints.createProdukKeluarga,
    onSuccess: (family) => {
      qc.setQueryData<endpoints.ProdukKeluarga[]>(['produk-keluarga'], (old) => [...(old ?? []), family])
      onChange(family.id, family.tiers.map((tier) => ({ tier, opsi: '' })))
      setAdding(false); setName('')
    },
  })
  const manage = useMutation({
    mutationFn: async (operation: { id: string; nama?: string }) => {
      if (operation.nama !== undefined) await endpoints.renameProdukKeluarga(operation.id, operation.nama)
      else await endpoints.deleteProdukKeluarga(operation.id)
    },
    onSuccess: (_, operation) => {
      setRenaming(false)
      if (operation.nama === undefined) onChange('', [])
      qc.invalidateQueries({ queryKey: ['produk-keluarga'] })
      qc.invalidateQueries({ queryKey: ['produk'] })
    },
  })
  return <fieldset className="space-y-3 rounded-md border p-3">
    <legend className="px-1 text-sm font-medium">Produk induk dan varian ERP</legend>
    <p className="text-xs text-muted-foreground">Produk induk mengelompokkan SKU. Stok, harga, berat, ukuran, dan preorder tetap milik setiap SKU.</p>
    <Select value={value || '__simple__'} onValueChange={(id) => {
      const family = families?.find((family) => family.id === id)
      onChange(family?.id ?? '', family?.tiers.map((tier) => ({ tier, opsi: '' })) ?? [])
    }}>
      <SelectTrigger aria-label="Produk induk"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="__simple__">Produk sederhana / belum dikelompokkan</SelectItem>{families?.map((family) => <SelectItem key={family.id} value={family.id}>{family.nama}</SelectItem>)}</SelectContent>
    </Select>
    {error && <div role="alert" className="text-sm text-destructive">{getApiError(error)} <Button type="button" variant="outline" onClick={() => refetch()}>Coba lagi</Button></div>}
    {value && <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={manage.isPending} onClick={() => { setRename(families?.find((f) => f.id === value)?.nama ?? ''); setRenaming(true) }}>Ubah nama induk</Button>
        <Button type="button" variant="outline" disabled={manage.isPending} onClick={async () => {
          if (await confirm({ title: 'Hapus produk induk?', description: 'Hanya induk tanpa SKU varian yang dapat dihapus. Stok SKU tidak dihapus.' })) manage.mutate({ id: value })
        }}>Hapus induk kosong</Button>
      </div>
      {renaming && <div className="flex gap-2"><Input aria-label="Nama baru produk induk" value={rename} maxLength={255} onChange={(e) => setRename(e.target.value)} /><Button type="button" disabled={manage.isPending || !rename.trim()} onClick={() => manage.mutate({ id: value, nama: rename })}>Simpan nama</Button></div>}
      {manage.error && <p role="alert" className="text-sm text-destructive">{getApiError(manage.error)}</p>}
    </div>}
    {options.map((option, i) => <div key={option.tier} className="space-y-1"><Label htmlFor={`variant-option-${i}`}>{option.tier}</Label><Input id={`variant-option-${i}`} value={option.opsi} maxLength={128} onChange={(e) => onChange(value, options.map((old, n) => n === i ? { ...old, opsi: e.target.value } : old))} placeholder={`Pilihan ${option.tier}, misalnya Merah atau M`} /></div>)}
    <Button type="button" variant="outline" onClick={() => setAdding(!adding)} disabled={create.isPending}>{adding ? 'Batal membuat induk' : 'Buat produk induk'}</Button>
    {adding && <div className="space-y-2 rounded-md border p-2">
      <Label htmlFor="family-name">Nama produk induk</Label><Input id="family-name" value={name} maxLength={255} placeholder="Contoh: Kaos polos" onChange={(e) => setName(e.target.value)} />
      <p className="text-xs text-muted-foreground">Jenis varian adalah pembeda SKU, misalnya Warna dan Ukuran. Pilihannya diisi pada masing-masing SKU.</p>
      {tiers.map((tier, i) => <div key={i} className="flex gap-2"><Input aria-label={`Jenis varian ${i + 1}`} value={tier} maxLength={64} onChange={(e) => setTiers((old) => old.map((t, n) => i === n ? e.target.value : t))} /><Button type="button" variant="outline" disabled={tiers.length === 1 || create.isPending} onClick={() => setTiers((old) => old.filter((_, n) => n !== i))}>Hapus</Button></div>)}
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={tiers.length >= 5 || create.isPending} onClick={() => setTiers((old) => [...old, ''])}>Tambah jenis varian</Button><Button type="button" disabled={create.isPending || !name.trim() || tiers.some((t) => !t.trim())} onClick={() => create.mutate({ nama: name, tiers })}>Simpan induk</Button></div>
      {create.error && <p role="alert" className="text-sm text-destructive">{getApiError(create.error)}</p>}
    </div>}
  </fieldset>
}
