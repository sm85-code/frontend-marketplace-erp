import { useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Produk } from '@/api/types'
export default function PilihProduk({
  id,
  value,
  onChange,
  items,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  items: Produk[]
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selected = items.find((p) => p.id === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className="h-auto min-h-11 w-full justify-start whitespace-normal text-left"
        >
          {selected
            ? `${selected.nama} · ${selected.sku_induk}`
            : 'Pilih produk'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(24rem,calc(100vw-2rem))] space-y-2">
        <Input
          aria-label="Cari produk"
          autoFocus
          placeholder="Nama atau SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-64 space-y-1 overflow-auto">
          {items
            .filter((p) =>
              `${p.nama} ${p.sku_induk}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((p) => (
              <Button
                key={p.id}
                variant="ghost"
                className="h-auto w-full justify-start whitespace-normal py-2 text-left"
                onClick={() => {
                  onChange(p.id)
                  setOpen(false)
                }}
              >
                {p.foto_url && (
                  <img
                    src={p.foto_url}
                    alt=""
                    className="size-10 rounded object-cover"
                  />
                )}
                <span>
                  {p.nama}
                  <small className="block">
                    {p.sku_induk} · Stok {p.stok}
                  </small>
                </span>
              </Button>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
