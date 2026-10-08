import Sinkronisasi from '@/components/Sinkronisasi'
import QueryError from '@/components/QueryError'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LayoutGrid, List } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import type { KatalogItem, KirimKatalogHasil } from '@/api/types'
import { useConfirm } from '@/components/ConfirmProvider'
import {
  BarFilter,
  BarHalaman,
  BarPilihan,
  FilterAksi,
  FilterCari,
  FilterPilih,
  FilterSakelar,
  Medan,
  Paginasi,
  PemilihKolom,
  TabelData,
} from '@/components/daftar'
import PilihTampilan from '@/components/daftar/PilihTampilan'
import Spinner from '@/components/Spinner'
import { Button } from '@/components/ui/button'
import { useFilterDaftar } from '@/lib/filterDaftar'
import { useKolomTersimpan } from '@/lib/kolom'
import { bagiBatch, labelVarian, ringkasKirim, STATUS_AWAL_KATALOG, STATUS_SHOPEE } from '@/lib/katalog'
import { bacaSimpan, tulisSimpan } from '@/lib/simpan'
import { useTerpilih } from '@/lib/terpilih'
import { opsiUrutan, teksKeUrut, ubahUrut, urutKeTeks } from '@/lib/urut'
import DetailProduk from './katalog/DetailProduk'
import KartuProduk from './katalog/KartuProduk'
import { kolomKatalog } from './katalog/kolom'

const PER_HALAMAN = 10
// Opens on active products (what is for sale on Shopee); the status filter widens it.
const AWAL = { toko: '', q: '', status: STATUS_AWAL_KATALOG as string, belumDikirim: false, urut: 'toko:asc' }
const KUNCI_TAMPILAN = 'katalog.tampilan'
const KUNCI_RINCI_VARIAN = 'katalog.rinciVarian'
const OPSI_TAMPILAN = [
  { value: 'grid', label: 'Grid', ikon: LayoutGrid },
  { value: 'list', label: 'List', ikon: List },
] as const
type Tampilan = (typeof OPSI_TAMPILAN)[number]['value']

export default function KatalogPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const f = useFilterDaftar(AWAL)
  const pilih = useTerpilih<KatalogItem>()
  const [urlParams] = useSearchParams()
  const [detailId, setDetailId] = useState<string | null>(() => urlParams.get('detail'))
  const [tampilan, setTampilan] = useState<Tampilan>(() => (bacaSimpan(KUNCI_TAMPILAN) === 'grid' ? 'grid' : 'list'))

  // Variants are shown as sub-rows under each product (price, weight, size, pre-order per variant). `rinci` is the
  // default for every product; a click on a product flips just that one.
  const [rinci, setRinci] = useState(() => bacaSimpan(KUNCI_RINCI_VARIAN) !== 'tidak')
  const [dibalik, setDibalik] = useState<ReadonlySet<string>>(new Set())
  const varianTerbuka = useCallback((id: string) => rinci !== dibalik.has(id), [rinci, dibalik])
  const balikVarian = useCallback(
    (id: string) =>
      setDibalik((lama) => {
        const baru = new Set(lama)
        if (!baru.delete(id)) baru.add(id)
        return baru
      }),
    [],
  )
  const semuaKolom = useMemo(() => kolomKatalog(setDetailId, varianTerbuka, balikVarian), [varianTerbuka, balikVarian])
  const kolom = useKolomTersimpan('katalog.kolom', semuaKolom)
  const kolomTampil = semuaKolom.filter((k) => kolom.tampil.includes(k.kunci))

  // Shop counts follow the chosen status and status counts follow the chosen shop, so every option shows what it would list.
  const kriteriaRingkasan = { status: f.nilai.status || undefined, akun_id: f.nilai.toko || undefined }
  const { data: ringkasan } = useQuery({
    queryKey: qk.katalogRingkasan(kriteriaRingkasan),
    queryFn: () => endpoints.ringkasanKatalog(kriteriaRingkasan),
    placeholderData: (prev) => prev,
  })
  const jumlahSemuaStatus = Object.values(ringkasan?.status ?? {}).reduce((a, b) => a + b, 0)
  const params = {
    akun_id: f.nilai.toko || undefined,
    q: f.nilai.q || undefined,
    status: f.nilai.status || undefined,
    belum_dikirim: f.nilai.belumDikirim,
    urut: f.nilai.urut,
    halaman: f.halaman,
    per_halaman: PER_HALAMAN,
  }
  const { data, isLoading, isFetching, error: queryError, refetch: retryQuery } = useQuery({
    queryKey: qk.katalog(params),
    queryFn: () => endpoints.listKatalog(params),
    placeholderData: (prev) => prev,
  })

  const kirimMut = useMutation({
    mutationFn: async (items: KatalogItem[]) => {
      const hasil: KirimKatalogHasil[] = []
      for (const batch of bagiBatch(items)) {
        hasil.push(...(await endpoints.kirimKatalogKeToko({ ids: batch.map((i) => i.id) })).hasil)
      }
      return hasil
    },
    onSuccess: (hasil) => {
      toast.success(ringkasKirim(hasil))
      pilih.kosongkan()
      qc.invalidateQueries({ queryKey: ['katalog'] })
    },
    onError: (e) => {
      toast.error(getApiError(e, 'Gagal mengirim ke toko web'))
      qc.invalidateQueries({ queryKey: ['katalog'] })
    },
  })

  async function kirim() {
    const ok = await confirm({
      title: `Kirim ${pilih.ukuran} produk ke toko web?`,
      description:
        'Produk disalin ke ampelkuning.com sebagai DRAFT (belum tayang) dengan stok 0, lengkap dengan foto dan varian. ' +
        'Atur stok, harga, lalu aktifkan lewat dashboard admin. Tidak ada yang diubah di Shopee, ' +
        'dan perubahan di dashboard admin tidak kembali ke sini.',
    })
    if (ok) kirimMut.mutate(pilih.daftar)
  }

  const items = data?.items ?? []
  const totalHalaman = data ? Math.max(1, Math.ceil(data.total / data.per_halaman)) : 1
  const semuaHalamanDipilih = items.length > 0 && items.every((i) => pilih.ada(i.id))
  const urutSekarang = teksKeUrut(f.nilai.urut)

  return (
    <div className="space-y-4 pb-24">
      {queryError && <QueryError error={queryError} retry={retryQuery} />}
      <BarHalaman judul="Katalog Shopee" deskripsi="Produk dari semua toko, apa adanya. Pilih yang sesuai, lalu kirim ke toko web.">
        <Sinkronisasi jenis="katalog" ids={pilih.daftar.map(p => p.id)} akunId={f.nilai.toko || undefined} />
        <Button asChild variant="outline"><Link to="/katalog/publikasi">Buat / Salin Produk</Link></Button>
        <Button asChild variant="outline"><Link to="/katalog/promosi">Promosi Diskon</Link></Button>
      </BarHalaman>

      <BarFilter
        aktif={f.jumlahAktif - (f.nilai.q ? 1 : 0)}
        utama={<FilterCari id="katalog-cari" placeholder="Nama atau SKU" nilai={f.nilai.q} onUbah={(q) => f.ubah({ q })} />}
      >
        <FilterPilih
          id="katalog-toko"
          label="Toko"
          nilai={f.nilai.toko}
          onUbah={(toko) => f.ubah({ toko })}
          semua={`Semua toko (${ringkasan?.total ?? '…'})`}
          opsi={(ringkasan?.toko ?? []).map((t) => ({ value: t.akun_id, label: `${t.nama_toko} (${t.jumlah})` }))}
        />
        <FilterPilih
          id="katalog-status"
          label="Status tayang"
          nilai={f.nilai.status}
          onUbah={(status) => f.ubah({ status })}
          semua={`Semua status (${ringkasan ? jumlahSemuaStatus : '…'})`}
          opsi={STATUS_SHOPEE.map((s) => ({ value: s.value, label: `${s.label} (${ringkasan?.status?.[s.value] ?? '…'})` }))}
        />
        <FilterPilih id="katalog-urut" label="Urutan" nilai={f.nilai.urut} onUbah={(urut) => f.ubah({ urut })} opsi={opsiUrutan(semuaKolom)} />
        <PilihTampilan
          id="katalog-tampilan"
          nilai={tampilan}
          opsi={[...OPSI_TAMPILAN]}
          onUbah={(t) => {
            setTampilan(t)
            tulisSimpan(KUNCI_TAMPILAN, t)
          }}
        />
        {tampilan === 'list' && (
          <Medan>
            <PemilihKolom
              semua={semuaKolom}
              tampil={kolom.tampil}
              onUbah={kolom.ubah}
              onReset={kolom.reset}
            />
          </Medan>
        )}
        {tampilan === 'list' && (
          <FilterSakelar
            id="katalog-rinci-varian"
            label="Rinci per varian"
            nilai={rinci}
            onUbah={(v) => {
              setRinci(v)
              setDibalik(new Set())
              tulisSimpan(KUNCI_RINCI_VARIAN, v ? 'ya' : 'tidak')
            }}
          />
        )}
        <FilterSakelar id="katalog-belum" label="Belum dikirim ke toko web" nilai={f.nilai.belumDikirim} onUbah={(belumDikirim) => f.ubah({ belumDikirim })} />
        <FilterAksi>
          <Button variant="outline" onClick={() => pilih.ubahBanyak(items.filter((i) => !i.dikirim_toko_id || semuaHalamanDipilih), !semuaHalamanDipilih)} disabled={!items.length}>
            {semuaHalamanDipilih ? 'Batal pilih halaman ini' : 'Pilih halaman ini'}
          </Button>
        </FilterAksi>
        {f.berubah && (
          <FilterAksi>
            <Button variant="ghost" onClick={f.reset}>
              Reset filter
            </Button>
          </FilterAksi>
        )}
      </BarFilter>

      {isLoading ? (
        <Spinner column label="Memuat katalog…" />
      ) : items.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          {jumlahSemuaStatus > 0
            ? 'Tidak ada produk yang cocok dengan filter ini.'
            : 'Katalog masih kosong. Buka menu Toko, lalu klik "Sinkronisasi Produk" pada toko Shopee.'}
        </div>
      ) : tampilan === 'list' ? (
        <TabelData
          label="Produk Shopee dari semua toko"
          items={items}
          kolom={kolomTampil}
          idDari={(p) => p.id}
          namaDari={(p) => p.nama}
          urut={urutSekarang}
          onUrut={(kunci, arahAwal) => f.ubah({ urut: urutKeTeks(ubahUrut(urutSekarang, kunci, arahAwal)) })}
          anak={{ dari: (p) => p.varian ?? [], terbuka: varianTerbuka, label: (v, p) => `Varian ${labelVarian(v)} dari ${p.nama}` }}
          pilihan={{
            terpilih: pilih.ada,
            onUbah: pilih.ubah,
            semuaDipilih: semuaHalamanDipilih,
            adaYangBisaDipilih: items.length > 0,
            onUbahSemua: (p) => pilih.ubahBanyak(items, p),
          }}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item) => (
            <KartuProduk key={item.id} item={item} dipilih={pilih.ada(item.id)} onUbah={(p) => pilih.ubah(item, p)} onBuka={() => setDetailId(item.id)} />
          ))}
        </div>
      )}

      {data && data.total > 0 && (
        <div className="space-y-2">
          <p className="teks-data text-center text-muted-foreground" aria-live="polite">
            {(f.halaman - 1) * PER_HALAMAN + 1}–{Math.min(f.halaman * PER_HALAMAN, data.total)} dari {data.total} produk
            {isFetching && !isLoading ? ' · memuat…' : ''}
          </p>
          <Paginasi halaman={f.halaman} totalHalaman={totalHalaman} onUbah={f.setHalaman} nama="Halaman katalog" />
        </div>
      )}

      <BarPilihan jumlah={pilih.ukuran} satuan="produk" onBatal={pilih.kosongkan} sibuk={kirimMut.isPending}>
        <Button onClick={kirim} disabled={kirimMut.isPending}>
          {kirimMut.isPending ? 'Mengirim…' : 'Kirim ke toko web'}
        </Button>
      </BarPilihan>

      <DetailProduk id={detailId} onTutup={() => setDetailId(null)} />
    </div>
  )
}
