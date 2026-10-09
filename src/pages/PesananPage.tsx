import { tahapDariTautan } from '@/lib/tautanPesanan'
import UkuranHalaman from '@/components/UkuranHalaman'
import Sinkronisasi from '@/components/Sinkronisasi'
import QueryError from '@/components/QueryError'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import type { TemplateResi } from '@/api/endpoints'
import type { Pesanan, ResiGabunganHasil } from '@/api/types'
import { getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import { mulaiProgres, type Progres } from '@/lib/progres'
import { useConfirm } from '@/components/ConfirmProvider'
import {
  BarFilter,
  BarHalaman,
  BarPilihan,
  FilterAksi,
  FilterCari,
  FilterPilih,
  FilterTanggal,
  Medan,
  Paginasi,
  PemilihKolom,
  TabelData,
} from '@/components/daftar'
import Spinner from '@/components/Spinner'
import { Button } from '@/components/ui/button'
import { useFilterDaftar } from '@/lib/filterDaftar'
import { useKolomTersimpan } from '@/lib/kolom'
import { bisaDicetak, bisaDiproses, bukaDokumenResi, pdfDariBase64, sudahDicetak, TAHAP_LABELS, TAHAP_ORDER } from '@/lib/pesanan'
import { rentangTanggal, type PresetTanggal } from '@/lib/rentang'
import { useTerpilih } from '@/lib/terpilih'
import { opsiUrutan, teksKeUrut, ubahUrut, urutKeTeks } from '@/lib/urut'
import FormPesananManual from './pesanan/FormPesananManual'
import DialogPengiriman from './pesanan/DialogPengiriman'
import { prosesBatchPengiriman } from '@/lib/pengiriman'
import type { PengaturanPengiriman } from '@/api/types'
import { AksiPesanan, kolomPesanan } from './pesanan/kolom'

const DEFAULT_PER_HALAMAN = 25
const AWAL = { tahap: 'perlu_diproses', toko: '', q: '', tanggal: 'semua', dari: '', sampai: '', resi: '', urut: 'tanggal:desc' }
const PILIHAN_RESI = [
  { value: 'belum', label: 'Belum dicetak' },
  { value: 'sudah', label: 'Sudah dicetak' },
]

export default function PesananPage() {
  const qc = useQueryClient()
  const [perHalaman,setPerHalaman]=useState(DEFAULT_PER_HALAMAN)
  const confirm = useConfirm()
  const f = useFilterDaftar(AWAL)
  const [formBuka, setFormBuka] = useState(false)
  const [pengiriman, setPengiriman] = useState<{ pesanan: Pesanan[]; cetak: boolean } | null>(null)

  const { data: akunList } = useQuery({ queryKey: qk.akun(), queryFn: () => endpoints.listAkun() })
  const akunMap = new Map((akunList ?? []).map((a) => [a.id, a]))

  const { dari, sampai } = rentangTanggal(f.nilai.tanggal as PresetTanggal, { dari: f.nilai.dari, sampai: f.nilai.sampai })
  const kriteria = { q: f.nilai.q || undefined, dari, sampai, akun_id: f.nilai.toko || undefined, tahap: tahapDariTautan(f.nilai.tahap) || undefined }
  const { data: ringkasan } = useQuery({
    queryKey: qk.pesananRingkasan(kriteria),
    queryFn: () => endpoints.ringkasanPesanan(kriteria),
    placeholderData: (prev) => prev,
  })
  const paramDaftar = { ...kriteria, resi: f.nilai.resi || undefined, urut: f.nilai.urut, halaman: f.halaman, per_halaman: perHalaman }
  const { data: daftar, isLoading, isFetching, error: queryError, refetch: retryQuery } = useQuery({
    queryKey: qk.pesananDaftar(paramDaftar),
    queryFn: () => endpoints.daftarPesanan(paramDaftar),
    placeholderData: (prev) => prev,
  })

  const pilih = useTerpilih<Pesanan>(daftar?.items ?? [])

  // Opening or refreshing this page pulls fresh orders from Shopee in the background (the server
  // throttles each shop to once a minute); the page then keeps asking every minute while visible.
  const sinkron = useQuery({
    queryKey: ['pesanan-sinkron'],
    queryFn: () => endpoints.sinkronPesananOtomatis(false),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 0,
    retry: false,
  })
  const sinkronData = sinkron.data
  useEffect(() => {
    if (sinkronData && sinkronData.jumlah_baru + sinkronData.jumlah_diperbarui > 0) {
      qc.invalidateQueries({ queryKey: ['pesanan'] })
    }
  }, [sinkronData, sinkron.dataUpdatedAt, qc])

  const segarkanMut = useMutation({
    mutationFn: () => qc.invalidateQueries({ queryKey: ['pesanan'] }),
    onError: (e) => toast.error(getApiError(e)),
  })

  const prosesMassalMut = useMutation({
    mutationFn: async ({ ids, pengaturan }: { ids: string[]; pengaturan: Record<string, PengaturanPengiriman> }) => {
      const res = await prosesBatchPengiriman(ids, pengaturan, endpoints.prosesMassalPesanan)
      return { berhasil: res.berhasil, gagal: res.hasil.filter((h) => !h.ok) }
    },
    onSuccess: ({ berhasil, gagal }) => {
      if (gagal.length === 0) toast.success(`${berhasil} pesanan diproses di Shopee`)
      else
        toast.warning(`${berhasil} diproses, ${gagal.length} gagal`, {
          description: gagal
            .slice(0, 3)
            .map((g) => `#${g.id_eksternal ?? '?'}: ${g.pesan ?? 'gagal'}`)
            .join('\n'),
        })
      pilih.kosongkan()
      qc.invalidateQueries({ queryKey: ['pesanan'] })
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  /** Opens the joined label file in the tab that the click already opened (pop-up blockers allow only that one). */
  function bukaResi(h: ResiGabunganHasil, tab: Window | null) {
    bukaDokumenResi(pdfDariBase64(h.pdf, h.mime_type), h.nama_file, tab)
  }
  const pesanGagalResi = (gagal: ResiGabunganHasil['gagal']) => gagal.slice(0, 3).map((g) => `#${g.id_eksternal ?? '?'}: ${g.pesan}`).join('\n')

  // Any selection (several shops and couriers) becomes ONE file in ONE tab; orders Shopee refuses are listed, not fatal.
  const cetakMut = useMutation({
    mutationFn: async ({ ids, tipe, tab }: { ids: string[]; tipe: TemplateResi; tab: Window | null }) => {
      try {
        const h = await endpoints.cetakResiGabungan(ids, tipe)
        bukaResi(h, tab)
        return h
      } catch (e) {
        tab?.close()
        throw e
      }
    },
    onMutate: (): Progres => mulaiProgres('Menyiapkan resi dari Shopee'),
    onSuccess: (h, _v, progres) => {
      qc.invalidateQueries({ queryKey: ['pesanan'] })
      if (h.gagal.length === 0) progres.selesai(`${h.berhasil} resi dibuka dalam satu file`)
      else progres.sebagian(`${h.berhasil} resi dibuka, ${h.gagal.length} pesanan gagal`, pesanGagalResi(h.gagal))
    },
    onError: (e, _v, progres) => progres?.gagal(getApiError(e, 'Resi belum siap atau server lambat, coba lagi sebentar.')),
  })

  // For orders that still need processing: arrange shipment, then print the labels of the ones that worked.
  const prosesCetakMut = useMutation({
    mutationFn: async ({ ids, tipe, tab, pengaturan }: { ids: string[]; tipe: TemplateResi; tab: Window | null; pengaturan: Record<string, PengaturanPengiriman> }) => {
      const sukses: string[] = []
      const gagalProses: { id_eksternal: string | null; pesan: string | null }[] = []
      const res = await prosesBatchPengiriman(ids, pengaturan, endpoints.prosesMassalPesanan)
      for (const h of res.hasil) {
        if (h.ok) sukses.push(h.id)
        else gagalProses.push(h)
      }
      if (sukses.length === 0) {
        tab?.close()
        return { sukses, gagalProses, resi: null as ResiGabunganHasil | null, galatResi: null as string | null }
      }
      try {
        const resi = await endpoints.cetakResiGabungan(sukses, tipe)
        bukaResi(resi, tab)
        return { sukses, gagalProses, resi, galatResi: null }
      } catch (e) {
        tab?.close()
        return { sukses, gagalProses, resi: null, galatResi: getApiError(e, 'Resi belum siap di Shopee.') }
      }
    },
    onMutate: (): Progres => mulaiProgres('Memproses pesanan lalu menyiapkan resi'),
    onSuccess: ({ sukses, gagalProses, resi, galatResi }, _v, progres) => {
      pilih.kosongkan()
      qc.invalidateQueries({ queryKey: ['pesanan'] })
      const bagianGagalProses = gagalProses.map((g) => `#${g.id_eksternal ?? '?'}: ${g.pesan ?? 'gagal'}`)
      if (galatResi) {
        progres.sebagian(`${sukses.length} pesanan diproses, tapi resi belum bisa dicetak`, `${galatResi}\nCetak dari tab Menunggu Penyerahan beberapa saat lagi.`)
      } else if (sukses.length === 0) {
        progres.gagal(`Tidak ada pesanan yang berhasil diproses. ${bagianGagalProses.slice(0, 2).join('; ')}`)
      } else if (gagalProses.length > 0 || (resi && resi.gagal.length > 0)) {
        progres.sebagian(
          `${sukses.length} diproses, ${resi?.berhasil ?? 0} resi dibuka`,
          [...bagianGagalProses.slice(0, 2), ...(resi ? pesanGagalResi(resi.gagal).split('\n') : [])].filter(Boolean).join('\n'),
        )
      } else progres.selesai(`${sukses.length} pesanan diproses, ${resi?.berhasil ?? 0} resi dibuka dalam satu file`)
    },
    onError: (e, _v, progres) => progres?.gagal(getApiError(e)),
  })

  /** Label of one order from its row button. */
  function cetakSatu(p: Pesanan) {
    cetakMut.mutate({ ids: [p.id], tipe: 'THERMAL_AIR_WAYBILL', tab: window.open('', '_blank') })
  }

  const semuaKolom = kolomPesanan({ namaToko: (id) => (id ? (akunMap.get(id)?.nama_toko ?? '—') : '—') })
  const kolom = useKolomTersimpan('pesanan.kolom.v2', semuaKolom)

  // Selectable: orders that still need processing, or are processed and waiting for the courier (label).
  const items = daftar?.items ?? []
  const bisaDipilih = (_p: Pesanan) => true
  // Printed labels remain selectable; the batch action confirms reprinting.
  const bisaDipilihSemua = items.filter((p) => bisaDipilih(p))
  const dipilih = pilih.daftar.filter(bisaDipilih)
  const idProses = dipilih.filter(bisaDiproses).map((p) => p.id)
  const dicetak = dipilih.filter(bisaDicetak)
  const totalHalaman = daftar ? Math.max(1, Math.ceil(daftar.total / daftar.per_halaman)) : 1
  const sedangBekerja = prosesMassalMut.isPending || cetakMut.isPending || prosesCetakMut.isPending
  const urutSekarang = teksKeUrut(f.nilai.urut)

  async function cetakTerpilih(tipe: TemplateResi) {
    const sudah = dicetak.filter(sudahDicetak)
    if (sudah.length > 0) {
      const ok = await confirm({
        title: 'Cetak ulang resi?',
        description: `${sudah.length} dari ${dicetak.length} pesanan terpilih resinya sudah pernah dicetak (${sudah
          .slice(0, 3)
          .map((p) => `#${p.id_eksternal}`)
          .join(', ')}${sudah.length > 3 ? ', …' : ''}). Tetap cetak semuanya?`,
      })
      if (!ok) return
    }
    cetakMut.mutate({ ids: dicetak.map((p) => p.id), tipe, tab: window.open('', '_blank') })
  }

  function prosesLaluCetak() {
    setPengiriman({ pesanan: dipilih.filter(bisaDiproses), cetak: true })
  }

  function prosesTerpilih() {
    setPengiriman({ pesanan: dipilih.filter(bisaDiproses), cetak: false })
  }

  function konfirmasiPengiriman(ids: string[], pengaturan: Record<string, PengaturanPengiriman>) {
    if (pengiriman?.cetak) {
      prosesCetakMut.mutate({ ids, pengaturan, tipe: 'THERMAL_AIR_WAYBILL', tab: window.open('', '_blank') })
    } else prosesMassalMut.mutate({ ids, pengaturan })
    setPengiriman(null)
  }

  function labelSinkron(): string {
    if (sinkron.isPending) return 'Menyinkronkan dari Shopee…'
    if (sinkron.isError) return 'Sinkron Shopee gagal.'
    if (!sinkronData?.aktif) return 'Sinkron otomatis Shopee belum aktif di server.'
    const gagal = sinkronData.toko.filter((t) => t.hasil === 'gagal')
    const jam = new Date(sinkron.dataUpdatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    return gagal.length
      ? `Sinkron ${jam} — ${gagal.length} toko gagal: ${gagal[0].nama_toko} (${gagal[0].pesan ?? 'error'})`
      : `Tersinkron dari Shopee pukul ${jam}`
  }

  return (
    <div className="space-y-4 pb-24">
      {queryError && <QueryError error={queryError} retry={retryQuery} />}
      <BarHalaman judul="Pesanan" deskripsi={labelSinkron()}>
        <Sinkronisasi jenis="pesanan" ids={pilih.daftar.map(p => p.id)} akunId={f.nilai.toko || undefined} />
        <Button asChild variant="outline"><Link to="/pesanan/retur">Retur & Refund</Link></Button>
        <Button variant="outline" onClick={() => segarkanMut.mutate()} disabled={segarkanMut.isPending}>
          Segarkan
        </Button>
        <Button onClick={() => setFormBuka(true)}>Pesanan Manual</Button>
      </BarHalaman>

      <BarFilter
        aktif={f.jumlahAktif - (f.nilai.q ? 1 : 0)}
        utama={<FilterCari id="pesanan-cari" placeholder="No. pesanan, pembeli, resi, produk" nilai={f.nilai.q} onUbah={(q) => f.ubah({ q })} />}
      >
        <FilterPilih
          id="pesanan-status"
          label="Status"
          nilai={tahapDariTautan(f.nilai.tahap)}
          onUbah={(tahap) => f.ubah({ tahap })}
          semua={`Semua status (${ringkasan?.tahap.semua ?? '…'})`}
          opsi={TAHAP_ORDER.map((t) => ({ value: t, label: `${TAHAP_LABELS[t]} (${ringkasan?.tahap[t] ?? '…'})` }))}
        />
        <FilterPilih
          id="pesanan-toko"
          label="Toko"
          nilai={f.nilai.toko}
          onUbah={(toko) => f.ubah({ toko })}
          semua={`Semua toko (${ringkasan?.total_toko ?? '…'})`}
          opsi={(ringkasan?.toko ?? []).map((t) => ({ value: t.akun_id, label: `${t.nama_toko} (${t.jumlah})` }))}
        />
        <FilterTanggal
          id="pesanan-tanggal"
          nilai={{ tanggal: f.nilai.tanggal as PresetTanggal, dari: f.nilai.dari, sampai: f.nilai.sampai }}
          onUbah={f.ubah}
        />
        <FilterPilih id="pesanan-resi" label="Resi" nilai={f.nilai.resi} onUbah={(resi) => f.ubah({ resi })} semua="Semua" opsi={PILIHAN_RESI} />
        <FilterPilih id="pesanan-urut" label="Urutan" nilai={f.nilai.urut} onUbah={(urut) => f.ubah({ urut })} opsi={opsiUrutan(semuaKolom)} />
        <UkuranHalaman value={perHalaman} onChange={n=>{setPerHalaman(n);f.setHalaman(1)}} />
        <Medan>
          <PemilihKolom semua={semuaKolom} tampil={kolom.tampil} onUbah={kolom.ubah} onReset={kolom.reset} />
        </Medan>
        {f.berubah && (
          <FilterAksi>
            <Button variant="ghost" onClick={f.reset}>
              Reset filter
            </Button>
          </FilterAksi>
        )}
      </BarFilter>

      {isLoading ? (
        <Spinner column label="Memuat pesanan…" />
      ) : items.length === 0 ? (
        <div className="space-y-3 rounded-lg border p-8 text-center text-muted-foreground">
          <p>Tidak ada pesanan yang cocok dengan filter ini.</p>
          {f.berubah && (
            <Button variant="outline" onClick={f.reset}>
              Reset filter
            </Button>
          )}
        </div>
      ) : (
        <TabelData
          label="Daftar pesanan"
          items={items}
          kolom={semuaKolom.filter((k) => kolom.tampil.includes(k.kunci))}
          idDari={(p) => p.id}
          namaDari={(p) => `pesanan ${p.id_eksternal}`}
          urut={urutSekarang}
          onUrut={(kunci, arahAwal) => f.ubah({ urut: urutKeTeks(ubahUrut(urutSekarang, kunci, arahAwal)) })}
          pilihan={{
            terpilih: pilih.ada,
            bisaDipilih,
            onUbah: pilih.ubah,
            semuaDipilih: bisaDipilihSemua.length > 0 && bisaDipilihSemua.every((p) => pilih.ada(p.id)),
            adaYangBisaDipilih: bisaDipilihSemua.length > 0,
            onUbahSemua: (p) => pilih.ubahBanyak(bisaDipilihSemua, p),
          }}
          aksi={(p) => <AksiPesanan p={p} onCetak={cetakSatu} cetakSibuk={sedangBekerja} />}
          minWidth={820}
        />
      )}

      {daftar && daftar.total > 0 && (
        <div className="space-y-2">
          <p className="teks-data text-center text-muted-foreground" aria-live="polite">
            {(f.halaman - 1) * perHalaman + 1}–{Math.min(f.halaman * perHalaman, daftar.total)} dari {daftar.total} pesanan
            {isFetching && !isLoading ? ' · memuat…' : ''}
          </p>
          <Paginasi halaman={f.halaman} totalHalaman={totalHalaman} onUbah={f.setHalaman} nama="Halaman pesanan" />
        </div>
      )}

      <BarPilihan terlihat={items.filter(p=>pilih.ada(p.id)).length} ringkasan={dipilih.map(p=><div key={p.id}>{p.id_eksternal} · {p.nama_pembeli}</div>)} jumlah={dipilih.length} satuan="pesanan" onBatal={pilih.kosongkan} sibuk={sedangBekerja}>
        {idProses.length > 0 && (
          <>
            <Button onClick={prosesLaluCetak} disabled={sedangBekerja}>
              {prosesCetakMut.isPending ? 'Memproses…' : `Proses & cetak resi (${idProses.length})`}
            </Button>
            <Button variant="outline" onClick={prosesTerpilih} disabled={sedangBekerja}>
              {prosesMassalMut.isPending ? 'Memproses…' : `Proses saja (${idProses.length})`}
            </Button>
          </>
        )}
        {dicetak.length > 0 && (
          <>
            <Button variant="outline" onClick={() => cetakTerpilih('THERMAL_AIR_WAYBILL')} disabled={sedangBekerja}>
              {cetakMut.isPending ? 'Menyiapkan resi…' : `Cetak resi A6 (${dicetak.length})`}
            </Button>
            <Button variant="ghost" onClick={() => cetakTerpilih('NORMAL_AIR_WAYBILL')} disabled={sedangBekerja}>
              A4
            </Button>
          </>
        )}
      </BarPilihan>

      {pengiriman && <DialogPengiriman pesanan={pengiriman.pesanan} cetak={pengiriman.cetak}
        onClose={() => setPengiriman(null)} onConfirm={konfirmasiPengiriman} />}
      <FormPesananManual open={formBuka} onOpenChange={setFormBuka} akunList={akunList ?? []} />
    </div>
  )
}
