import { useState } from 'react'
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
        {card.total !== undefined && <div>Total: {fmtMoney(card.total)}</div>}
        {card.harga !== undefined && <div>{card.harga === null ? 'Harga belum tersedia' : fmtMoney(card.harga)}</div>}
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
  const [tab, setTab] = useState<'item' | 'order'>('order')
  return (
    <details className="my-3 rounded-lg border p-3">
      <summary className="cursor-pointer font-medium">Lampirkan produk / pesanan</summary>
      <p className="my-2 text-xs text-muted-foreground">
        Produk berasal dari toko percakapan ini. Pesanan hanya milik pembeli terkait. Pilih kartu, periksa, lalu tekan Kirim lampiran. Teks
        dikirim terpisah.
      </p>
      <div className="mb-3 flex gap-2">
        <Button type="button" variant={tab === 'order' ? 'default' : 'outline'} onClick={() => setTab('order')}>
          Pesanan pembeli
        </Button>
        <Button type="button" variant={tab === 'item' ? 'default' : 'outline'} onClick={() => setTab('item')}>
          Produk toko
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
                className="rounded-lg border p-3 text-left hover:bg-muted disabled:opacity-50"
                onClick={() => choose({ type: tab, card })}
              >
                <ChatCardView card={card} />
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
    </details>
  )
}
