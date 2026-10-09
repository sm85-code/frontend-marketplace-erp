import { useState } from 'react'
import { Package, ReceiptText, Paperclip, Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { fmtMoney } from '@/api/client'
import type { ChatAttachment, ChatCard, ChatContext } from '@/lib/chat'
import { FotoItem } from '../pesanan/ItemRingkas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ChatCardView({ card }: { card: ChatCard }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <FotoItem item={{ nama_produk: card.nama, foto: card.foto }} />
      <div className="min-w-0 text-sm">
        <div className="break-words font-medium">{card.order_sn ? `Pesanan #${card.order_sn}` : card.nama}</div>
        {card.varian && <div className="mt-1 text-xs font-medium text-muted-foreground">Varian: {card.varian}</div>}
        {card.total !== undefined && <div>Total: {fmtMoney(card.total)}</div>}
        {card.harga !== undefined && <div>{card.harga === null ? 'Harga belum tersedia' : fmtMoney(card.harga, card.currency)}</div>}
        {card.harga_asli && <div className="text-xs text-muted-foreground line-through">{fmtMoney(card.harga_asli, card.currency)}</div>}
        {card.items?.map((item, i) => (
          <div key={i} className="mt-2 flex items-start gap-2">
            <FotoItem ukuran={32} item={{ nama_produk: item.nama, foto: item.foto }} />
            <div className="min-w-0 break-words">
              {item.nama}
              <div className="text-xs text-muted-foreground">
                {item.varian ? `${item.varian} · ` : ''}×{item.qty}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AttachmentPicker({
  data,
  search,
  setSearch,
  offset,
  setOffset,
  choose,
  disabled,
}: {
  data?: ChatContext
  search: string
  setSearch: (value: string) => void
  offset: number
  setOffset: (value: number) => void
  choose: (value: ChatAttachment) => void
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'item' | 'order'>('order')
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="secondary" className="h-auto min-h-16 flex-col gap-1 whitespace-normal rounded-xl px-2 py-2 text-xs" disabled={disabled} onClick={() => setOpen(true)}><Paperclip className="size-5"/>Produk / Pesanan</Button>
      <DialogContent><DialogHeader><DialogTitle>Lampirkan produk atau pesanan</DialogTitle><DialogDescription>Pilih kartu dari toko percakapan, lalu periksa sebelum dikirim.</DialogDescription></DialogHeader>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" className="h-auto min-h-11 whitespace-normal px-2 text-xs sm:text-sm" variant={tab === 'order' ? 'default' : 'outline'} onClick={() => setTab('order')}>
          <ReceiptText className="mr-2 size-4"/>Pesanan pembeli
        </Button>
        <Button type="button" className="h-auto min-h-11 whitespace-normal px-2 text-xs sm:text-sm" variant={tab === 'item' ? 'default' : 'outline'} onClick={() => setTab('item')}>
          <Package className="mr-2 size-4"/>Produk toko
        </Button>
      </div>
      {tab === 'item' && (
        <Input
          aria-label="Cari produk lampiran"
          placeholder="Cari produk toko…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setOffset(0)
          }}
        />
      )}
      {!data ? (
        <p className="text-sm">Memuat pilihan lampiran…</p>
      ) : (
        <>
          <div className="mt-3 grid max-h-80 gap-2 overflow-y-auto">
            {(tab === 'order' ? data.pesanan : data.produk).map((card) => (
              <button
                key={card.id}
                type="button"
                aria-label={`Lampirkan ${tab === 'order' ? 'pesanan' : 'produk'} ${card.nama}`}
                disabled={disabled}
                className="flex items-center gap-3 rounded-xl border bg-card p-3 text-left hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                onClick={() => {choose({ type: tab, card });setOpen(false)}}
              >
                <div className="min-w-0 flex-1"><ChatCardView card={card} /></div><Plus className="size-4 shrink-0 text-primary"/>
              </button>
            ))}
          </div>
          {!(tab === 'order' ? data.pesanan : data.produk).length && (
            <p className="mt-2 text-sm">
              {tab === 'order'
                ? 'Belum ada pesanan pembeli yang tersinkron pada toko ini.'
                : 'Tidak ada produk aktif yang sesuai. Sinkronkan katalog toko bila diperlukan.'}
            </p>
          )}
          {tab === 'item' && (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>
                Sebelumnya
              </Button>
              <Button variant="outline" disabled={!data.produk_ada_lagi} onClick={() => setOffset(offset + 20)}>
                Berikutnya
              </Button>
            </div>
          )}
        </>
      )}
      </DialogContent>
    </Dialog>
  )
}
