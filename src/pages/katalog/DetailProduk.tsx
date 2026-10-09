import Bantuan from '@/components/Bantuan'
import { useAuth } from '@/lib/auth'
import { isOwnerLevel } from '@/config/roles'
import Sinkronisasi from '@/components/Sinkronisasi'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import KelolaProdukShopee from './KelolaProdukShopee'
import QueryError from '@/components/QueryError'
import { useQuery } from '@tanstack/react-query'
import * as endpoints from '@/api/endpoints'
import { qk } from '@/api/keys'
import Spinner from '@/components/Spinner'
import { Badge } from '@/components/ui/badge'

import { fmtRp } from '@/api/client'
import type { KatalogDetail } from '@/api/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { labelStatusVarian, labelVarian, namaTier, nilaiVarian, rentangHarga, teksBerat, ukuranPaket, varianLengkap } from '@/lib/katalog'

/** Dialog with everything about one catalogue product: all photos, full description, variants, size. */
export default function DetailProduk({ id, onTutup }: { id: string | null; onTutup: () => void }) {
  const { user } = useAuth()
  const manage = isOwnerLevel(user?.role)
  const { data: detail, isLoading, error, refetch } = useQuery({
    queryKey: qk.katalogOne(id ?? ''),
    queryFn: () => endpoints.getKatalog(id as string),
    enabled: !!id,
  })

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-semibold">{detail?.nama ?? 'Detail Produk'}</h1><Button variant="outline" onClick={onTutup}>Kembali ke Katalog</Button></div>
        {error ? <QueryError error={error} retry={refetch} /> : isLoading || !detail ? (
          <Spinner column label="Memuat detail…" />
        ) : (
          <div className="teks-data space-y-4">
            {manage && <Button asChild variant="outline"><Link to={`/katalog/publikasi?source=${encodeURIComponent(detail.akun_id)}&item=${encodeURIComponent(detail.item_id)}`}>Salin ke Toko Lain</Link></Button>}
            <Sinkronisasi jenis="katalog" ids={[detail.id]} satu />
            {manage && <Bantuan judul="Kelola produk di Shopee"><KelolaProdukShopee key={detail.id} detail={detail} /></Bantuan>}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{detail.nama_toko}</Badge>
              <span className="font-medium">{rentangHarga(detail.harga_min, detail.harga_max)}</span>
              <span className="text-muted-foreground">stok Shopee: {detail.stok_shopee ?? '—'}</span>
              {detail.sku && <span className="font-mono">SKU {detail.sku}</span>}
            </div>
            {detail.foto.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {detail.foto.map((u) => (
                  <img key={u} src={u} alt="" loading="lazy" className="size-28 shrink-0 rounded-md border object-cover" />
                ))}
              </div>
            )}
            <p className="whitespace-pre-wrap">{detail.deskripsi || <em className="text-muted-foreground">Tanpa deskripsi</em>}</p>
            <div className="flex flex-wrap gap-2 text-sm"><Badge variant="secondary">Preorder: {detail.is_pre_order == null ? '—' : detail.is_pre_order ? 'Ya' : 'Tidak'}</Badge>{detail.days_to_ship != null && <span>Waktu proses: {detail.days_to_ship} hari</span>}</div>
            {detail.size_chart_id != null && <p className="text-sm">Template panduan ukuran: {detail.size_chart_id}</p>}
            {detail.varian.length > 0 && <TabelVarian detail={detail} />}
            <div className="text-muted-foreground">
              {detail.varian.length > 0 ? 'Berat dan ukuran produk (dipakai varian yang tidak mengaturnya sendiri): ' : 'Berat '}
              {teksBerat(detail.berat_gram)} · {ukuranPaket(detail.panjang_cm, detail.lebar_cm, detail.tinggi_cm)}
            </div>
          </div>
        )}
    </div>
  )
}

const Ikut = ({ children }: { children: React.ReactNode }) => (
  <span className="text-muted-foreground italic" title="Tidak diatur di varian ini: memakai nilai produk">
    {children}
  </span>
)

/**
 * Every variant on its own row: one column per tier (named as the shop named it: Warna, Ukuran…) and, for that exact
 * combination, its price, stock, weight, package size and pre-order. Italic grey = the variant did not set it and uses
 * the product's value.
 */
function TabelVarian({ detail }: { detail: KatalogDetail }) {
  const tier = namaTier(detail.varian)
  const lengkap = varianLengkap(detail.varian)
  return (
    <div className="space-y-2">
      <div className="font-medium">Varian ({detail.varian.length})</div>
      <p className="text-xs text-muted-foreground">Nilai bercetak miring mengikuti produk induk.</p>
      {!lengkap && (
        <p role="note" className="rounded-md border border-dashed p-2 text-muted-foreground">
          Berat, ukuran, dan pre-order per varian belum tersimpan untuk produk ini. Gunakan Sinkronisasi item ini di atas untuk memperbarui produk tanpa menarik seluruh toko.
        </p>
      )}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <caption className="sr-only">Varian {detail.nama}: harga, stok, berat, ukuran, dan pre-order per varian</caption>
          <TableHeader>
            <TableRow>
              {tier.length > 0 ? tier.map((t, i) => <TableHead key={`${t}-${i}`} className="whitespace-nowrap">{t || `Varian ${i + 1}`}</TableHead>) : <TableHead>Varian</TableHead>}
              <TableHead className="whitespace-nowrap">SKU</TableHead>
              <TableHead className="text-right whitespace-nowrap">Harga</TableHead>
              <TableHead className="text-right whitespace-nowrap">Stok</TableHead>
              {lengkap && (
                <>
                  <TableHead className="text-right whitespace-nowrap">Berat</TableHead>
                  <TableHead className="whitespace-nowrap">Ukuran P×L×T</TableHead>
                  <TableHead className="whitespace-nowrap">Pre-order</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.varian.map((v) => {
              const n = nilaiVarian(v, detail)
              const ukuran = ukuranPaket(String(n.panjang.nilai), String(n.lebar.nilai), String(n.tinggi.nilai))
              const ikutUkuran = n.panjang.ikutProduk && n.lebar.ikutProduk && n.tinggi.ikutProduk
              const status = labelStatusVarian(v.status)
              return (
                <TableRow key={v.model_id ?? v.nama}>
                  {tier.length > 0 ? tier.map((t, i) => <TableCell key={`${t}-${i}`} className="whitespace-nowrap">{v.opsi?.[i]?.opsi ?? '—'}</TableCell>) : <TableCell>{labelVarian(v)}</TableCell>}
                  <TableCell className="font-mono whitespace-nowrap">{v.sku || '—'}</TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap">
                    {v.harga ? fmtRp(v.harga) : '—'}
                    {v.harga_asli && <span className="ml-1 font-normal text-muted-foreground line-through">{fmtRp(v.harga_asli)}</span>}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {v.stok ?? '—'}
                    {status && <span className="ml-1 text-muted-foreground">({status})</span>}
                  </TableCell>
                  {lengkap && (
                    <>
                      <TableCell className="text-right whitespace-nowrap">{n.berat.ikutProduk ? <Ikut>{teksBerat(n.berat.nilai)}</Ikut> : teksBerat(n.berat.nilai)}</TableCell>
                      <TableCell className="whitespace-nowrap">{ikutUkuran ? <Ikut>{ukuran}</Ikut> : ukuran}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {n.preorder.aktif ? (
                          <span className={n.preorder.ikutProduk ? 'text-muted-foreground italic' : ''}>Ya{n.preorder.hari ? ` · ${n.preorder.hari} hari` : ''}</span>
                        ) : (
                          <span className="text-muted-foreground">Tidak</span>
                        )}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
