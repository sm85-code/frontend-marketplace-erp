import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import * as endpoints from '@/api/endpoints'
import { fmtRp, getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import type { KampanyeIklan } from '@/api/types'
import { BarFilter, FilterPilih, type KolomTabel, TabelLokal } from '@/components/daftar'
import Spinner from '@/components/Spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { angkaDari, anggaranTeks, statusKampanye, totalKampanye } from '@/lib/iklanKampanye'
import BuatIklan from './BuatIklan'
import { TumpukanFoto } from './FotoProduk'
import KelolaKampanye from './KelolaKampanye'
import SaranAi from './SaranAi'
import { kali } from './kolom'

const HARI = [
  { value: '7', label: '7 hari terakhir' },
  { value: '14', label: '14 hari terakhir' },
  { value: '28', label: '28 hari terakhir' },
]
const STATUS = [
  { value: 'hidup', label: 'Aktif (berjalan + dijeda)' },
  { value: 'ongoing', label: 'Berjalan' },
  { value: 'paused', label: 'Dijeda' },
  { value: 'ended', label: 'Berakhir' },
  { value: 'semua', label: 'Semua status' },
]
const HIDUP = new Set(['ongoing', 'paused', 'scheduled'])
const cocokStatus = (pilihan: string, status: string | null) =>
  pilihan === 'semua' ? true : pilihan === 'hidup' ? HIDUP.has(status ?? '') : status === pilihan
const angka = (v: number) => v.toLocaleString('id-ID')

function kolomKampanye(): KolomTabel<KampanyeIklan>[] {
  const a = 'whitespace-nowrap'
  const f = (k: KampanyeIklan) => k.kinerja
  return [
    {
      kunci: 'nama',
      judul: 'Kampanye',
      tetap: true,
      kelas: 'font-medium min-w-[190px] sm:min-w-[215px]',
      sel: (k) => (
        <span className="flex items-center gap-3">
          <TumpukanFoto produk={k.produk} jumlah={k.jumlah_produk} />
          <span className="min-w-[110px] max-w-[130px] flex-1 sm:max-w-[160px]">
            <span className="block">{k.nama}</span>
            {k.produk[0]?.nama && k.produk[0].nama !== k.nama && <span className="teks-kecil block truncate font-normal text-muted-foreground">{k.produk[0].nama}</span>}
          </span>
        </span>
      ),
      nilai: (k) => k.nama,
    },
    {
      kunci: 'status',
      judul: 'Status',
      kelas: a,
      sel: (k) => {
        const s = statusKampanye(k.status)
        return (
          <span className="block">
            <Badge variant={s.varian}>{s.label}</Badge>
            <span className="teks-kecil block text-muted-foreground">{k.bidding === 'auto' ? 'GMV Max' : k.bidding === 'manual' ? 'Manual' : ''}</span>
          </span>
        )
      },
      nilai: (k) => k.status ?? '',
    },
    { kunci: 'anggaran', judul: 'Anggaran/hari', rata: 'kanan', kelas: a, sel: (k) => anggaranTeks(k.anggaran, fmtRp), nilai: (k) => angkaDari(k.anggaran) },
    { kunci: 'biaya', judul: 'Biaya', rata: 'kanan', kelas: a, sel: (k) => (f(k) ? fmtRp(f(k)!.expense) : '—'), nilai: (k) => angkaDari(f(k)?.expense) },
    { kunci: 'klik', judul: 'Klik', rata: 'kanan', kelas: a, sel: (k) => (f(k) ? angka(f(k)!.clicks) : '—'), nilai: (k) => f(k)?.clicks ?? 0 },
    { kunci: 'pesanan', judul: 'Pesanan', rata: 'kanan', kelas: a, sel: (k) => (f(k) ? angka(f(k)!.direct_order) : '—'), nilai: (k) => f(k)?.direct_order ?? 0 },
    { kunci: 'gmv', judul: 'GMV iklan', rata: 'kanan', kelas: a, sel: (k) => (f(k) ? fmtRp(f(k)!.direct_gmv) : '—'), nilai: (k) => angkaDari(f(k)?.direct_gmv) },
    {
      kunci: 'impas',
      judul: 'ROAS impas',
      rata: 'kanan',
      kelas: a,
      sel: (k) =>
        k.margin.roas_impas != null ? (
          <span className={k.kinerja?.roas != null && angkaDari(k.kinerja.roas) < k.margin.roas_impas && k.kinerja.expense ? 'font-semibold text-destructive' : ''}>
            {kali(String(k.margin.roas_impas))}
          </span>
        ) : (
          <span className="teks-kecil text-muted-foreground">{k.margin.terisi === 0 ? 'Isi modal' : 'Tidak untung'}</span>
        ),
      nilai: (k) => k.margin.roas_impas ?? -1,
    },
    { kunci: 'roas', judul: 'ROAS', rata: 'kanan', kelas: `${a} font-semibold`, sel: (k) => kali(f(k)?.roas == null ? null : String(f(k)!.roas)), nilai: (k) => (f(k)?.roas == null ? -1 : angkaDari(f(k)!.roas)) },
  ]
}

/** Shopee Ads campaigns of one shop: totals and ads balance on top, one row per campaign, "Kelola" opens its settings. */
export default function KampanyeShopee() {
  const { data: akunList } = useQuery({ queryKey: qk.akun(), queryFn: () => endpoints.listAkun() })
  const toko = (akunList ?? []).filter((a) => a.platform === 'shopee' && a.id_toko_eksternal)
  const [dipilih, setDipilih] = useState('')
  const akunId = dipilih || toko[0]?.id || ''
  const [hari, setHari] = useState('7')
  const [status, setStatus] = useState('hidup')
  const [kelola, setKelola] = useState<KampanyeIklan | null>(null)
  const [buka, setBuka] = useState(false)

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: qk.kampanyeIklan(akunId, Number(hari)),
    queryFn: () => endpoints.daftarKampanyeIklan(akunId, Number(hari)),
    enabled: Boolean(akunId),
    staleTime: 60_000,
    retry: false,
  })
  const total = totalKampanye(data)
  const tampil = (data?.kampanye ?? []).filter((k) => cocokStatus(status, k.status))
  const aktif = kelola ? (data?.kampanye.find((k) => k.campaign_id === kelola.campaign_id) ?? kelola) : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kampanye di Shopee</CardTitle>
        <p className="teks-data text-muted-foreground">
          Daftar iklan produk yang ada di Shopee Ads toko ini. Jeda, ubah anggaran, kata kunci, atau hapus dari sini. Perubahan langsung berlaku di
          Shopee.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <BarFilter aktif={0}>
          <FilterPilih id="kampanye-toko" label="Toko" nilai={akunId} onUbah={setDipilih} opsi={toko.map((t) => ({ value: t.id, label: t.nama_toko }))} />
          <FilterPilih id="kampanye-status" label="Status" nilai={status} onUbah={setStatus} opsi={STATUS} />
          <FilterPilih id="kampanye-hari" label="Performa" nilai={hari} onUbah={setHari} opsi={HARI} />
        </BarFilter>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setBuka(true)} disabled={!akunId}>
            Buat iklan baru
          </Button>
          <Button variant="outline" onClick={() => refetch()} disabled={!akunId || isFetching}>
            {isFetching ? 'Memuat…' : 'Muat ulang'}
          </Button>
        </div>

        {toko.length === 0 && <p className="rounded-lg border p-6 text-center text-muted-foreground">Belum ada toko Shopee yang terhubung. Hubungkan di menu Kelola Toko.</p>}
        {isLoading && <Spinner column label="Memuat kampanye dari Shopee…" />}
        {error && (
          <div role="alert" className="space-y-2 rounded-lg border border-destructive/40 p-4 text-sm">
            <p className="font-medium">Kampanye tidak bisa dimuat</p>
            <p className="text-muted-foreground">{getApiError(error)}</p>
            <p className="teks-kecil text-muted-foreground">Toko tanpa Shopee Ads atau token tanpa izin Ads akan menolak permintaan ini.</p>
          </div>
        )}
        {data && (
          <>
            {data.catatan.length > 0 && (
              <ul className="space-y-1 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                {data.catatan.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
            <SaranAi akunId={akunId} hari={data.hari} />
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                ['Saldo iklan', data.saldo == null ? '—' : fmtRp(data.saldo)],
                ['Kampanye berjalan', `${total.berjalan} dari ${total.jumlah}`],
                [`Biaya ${data.hari} hari`, fmtRp(total.biaya)],
                ['GMV iklan', fmtRp(total.gmv)],
                ['ROAS', kali(total.roas == null ? null : String(total.roas))],
              ].map(([label, nilai]) => (
                <div key={label} className="rounded-lg border p-3">
                  <dt className="teks-kecil text-muted-foreground">{label}</dt>
                  <dd className="text-lg font-semibold">{nilai}</dd>
                </div>
              ))}
            </dl>
            {data.kampanye.length === 0 ? (
              <p className="rounded-lg border p-6 text-center text-muted-foreground">Toko ini belum punya kampanye iklan produk di Shopee.</p>
            ) : (
              <div className="space-y-2">
                <p className="teks-data text-muted-foreground" aria-live="polite">
                  Menampilkan {tampil.length} dari {data.kampanye.length} kampanye
                </p>
                {tampil.length === 0 ? (
                  <p className="rounded-lg border p-6 text-center text-muted-foreground">Tidak ada kampanye dengan status ini.</p>
                ) : (
                  <TabelLokal
                    label="Kampanye iklan Shopee"
                    items={tampil}
                    kolom={kolomKampanye()}
                    idDari={(k) => k.campaign_id}
                    namaDari={(k) => k.nama}
                    urutAwal={{ kunci: 'biaya', arah: 'desc' }}
                    minWidth={900}
                    aksi={(k) => (
                      <Button size="sm" variant="outline" onClick={() => setKelola(k)}>
                        Kelola
                      </Button>
                    )}
                  />
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
      {aktif && <KelolaKampanye akunId={akunId} kampanye={aktif} hari={data?.hari ?? Number(hari)} biayaShopee={data?.biaya_shopee_persen ?? null} onTutup={() => setKelola(null)} />}
      {buka && <BuatIklan akunId={akunId} onTutup={() => setBuka(false)} />}
    </Card>
  )
}
