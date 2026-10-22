import EditProdukLanjutan from './EditProdukLanjutan'
import KualitasProduk from './KualitasProduk'
import StatistikProduk from './StatistikProduk'
import SalinMasterProduk from '@/components/SalinMasterProduk'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ShopeeEngagement from './ShopeeEngagement'
import { BarisAksi } from './bagian'
import { useAuth } from '@/lib/auth'
import Sinkronisasi from '@/components/Sinkronisasi'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import KelolaProdukShopee from './KelolaProdukShopee'
import ShopeeProductTools, { PromosiProduk } from './ShopeeProductTools'
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
  const { bisa } = useAuth()
  const manage = bisa('katalog', 'tulis')
  const lanjutan = bisa('katalog_lanjutan', 'tulis')
  const { data: detail, isLoading, error, refetch } = useQuery({
    queryKey: qk.katalogOne(id ?? ''),
    queryFn: () => endpoints.getKatalog(id as string),
    enabled: !!id,
  })

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex items-start gap-3"><Button variant="outline" size="icon" className="size-10 shrink-0" onClick={onTutup} aria-label="Kembali ke Katalog" title="Kembali ke Katalog"><ArrowLeft className="size-5" aria-hidden="true" /></Button><h1 className="min-w-0 flex-1 break-words text-lg leading-snug font-semibold sm:text-xl">{detail?.nama ?? 'Detail Produk'}</h1></div>
        {error ? <QueryError error={error} retry={refetch} /> : isLoading || !detail ? (
          <Spinner column label="Memuat detail…" />
        ) : (
          <div className="teks-data space-y-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Badge variant="secondary">{detail.nama_toko}</Badge>
              <span className="font-semibold">{rentangHarga(detail.harga_min, detail.harga_max)}</span>
              <span className="text-sm text-muted-foreground">Stok {detail.stok_shopee ?? '—'}</span>
              {detail.sku && <span className="font-mono text-sm text-muted-foreground">{detail.sku}</span>}
            </div>
            {/* One segment at a time, so a page of many tools does not pile everything on one screen. */}
            <Tabs defaultValue="ringkasan" className="gap-4">
              <TabsList className="section-tabs">
                <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
                {lanjutan && <TabsTrigger value="statistik">Statistik</TabsTrigger>}
                {lanjutan && <TabsTrigger value="ulasan">Ulasan</TabsTrigger>}
                {lanjutan && <TabsTrigger value="promosi">Promosi</TabsTrigger>}
                {(manage || lanjutan) && <TabsTrigger value="kelola">Kelola</TabsTrigger>}
              </TabsList>
              <TabsContent value="ringkasan" className="space-y-4">
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

              </TabsContent>
              {lanjutan && <TabsContent value="statistik" className="space-y-4"><StatistikProduk id={detail.id} /><KualitasProduk id={detail.id} /></TabsContent>}
              {lanjutan && <TabsContent value="ulasan"><section className="space-y-3 rounded-xl border p-4"><h2 className="font-semibold">Ulasan pembeli dan balasan</h2><ShopeeEngagement key={detail.id} detail={detail} bagian="ulasan" /></section></TabsContent>}
              {lanjutan && <TabsContent value="promosi"><PromosiProduk detail={detail} /></TabsContent>}
              {(manage || lanjutan) && (
                <TabsContent value="kelola" className="space-y-4">
                  <section className="rounded-xl border px-4">
                    <h2 className="pt-4 font-semibold">Tindakan produk</h2>
                    {lanjutan && <BarisAksi judul="Edit informasi dan varian" ket="Ubah nama, deskripsi, foto, SKU, dan pengiriman di Shopee."><EditProdukLanjutan detail={detail} label="Edit" /></BarisAksi>}
                    {manage && <BarisAksi judul="Salin ke toko lain" ket="Buat produk yang sama di toko lain."><Button asChild variant="outline" size="sm"><Link to={`/katalog/publikasi?source=${encodeURIComponent(detail.akun_id)}&item=${encodeURIComponent(detail.item_id)}`}>Salin</Link></Button></BarisAksi>}
                    {manage && <BarisAksi judul="Salin ke Master Produk" ket="Simpan produk dan variannya sebagai SKU master."><SalinMasterProduk ids={[detail.id]} label="Salin" /></BarisAksi>}
                    <BarisAksi judul="Sinkronisasi dari Shopee" ket="Perbarui data produk ini dari Shopee."><Sinkronisasi jenis="katalog" ids={[detail.id]} satu label="Sinkronkan" /></BarisAksi>
                  </section>
                  {manage && <section className="rounded-xl border px-4"><KelolaProdukShopee key={detail.id} detail={detail} /></section>}
                  {lanjutan && <ShopeeProductTools detail={detail} close={onTutup} />}
                </TabsContent>
              )}
            </Tabs>
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
          Berat, ukuran, dan pre-order per varian belum tersimpan untuk produk ini. Gunakan Sinkronisasi di tab Kelola untuk memperbarui produk tanpa menarik seluruh toko.
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
