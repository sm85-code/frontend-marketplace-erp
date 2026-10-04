import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import type { TemplateResi } from '@/api/endpoints'
import type { Pesanan } from '@/api/types'
import { getApiError } from '@/api/client'
import { qk } from '@/api/keys'
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
import { bisaDicetak, bisaDiproses, kelompokResi, pecahBatch, sudahDicetak, TAHAP_LABELS, TAHAP_ORDER } from '@/lib/pesanan'
import { rentangTanggal, type PresetTanggal } from '@/lib/rentang'
import { useTerpilih } from '@/lib/terpilih'
import { opsiUrutan, teksKeUrut, ubahUrut, urutKeTeks } from '@/lib/urut'
import FormPesananManual from './pesanan/FormPesananManual'
import { AksiPesanan, kolomPesanan } from './pesanan/kolom'

const PER_HALAMAN = 50
const AWAL = { tahap: 'perlu_diproses', toko: '', q: '', tanggal: 'semua', dari: '', sampai: '', resi: '', urut: 'tanggal:desc' }
const PILIHAN_RESI = [
  { value: 'belum', label: 'Belum dicetak' },
  { value: 'sudah', label: 'Sudah dicetak' },
]

export default function PesananPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const f = useFilterDaftar(AWAL)
  const pilih = useTerpilih<Pesanan>()
  const [formBuka, setFormBuka] = useState(false)

  const { data: akunList } = useQuery({ queryKey: qk.akun(), queryFn: () => endpoints.listAkun() })
  const akunMap = new Map((akunList ?? []).map((a) => [a.id, a]))

  const { dari, sampai } = rentangTanggal(f.nilai.tanggal as PresetTanggal, { dari: f.nilai.dari, sampai: f.nilai.sampai })
  const kriteria = { q: f.nilai.q || undefined, dari, sampai, akun_id: f.nilai.toko || undefined, tahap: f.nilai.tahap || undefined }
  const { data: ringkasan } = useQuery({
    queryKey: qk.pesananRingkasan(kriteria),
    queryFn: () => endpoints.ringkasanPesanan(kriteria),
    placeholderData: (prev) => prev,
  })
  const paramDaftar = { ...kriteria, resi: f.nilai.resi || undefined, urut: f.nilai.urut, halaman: f.halaman, per_halaman: PER_HALAMAN }
  const { data: daftar, isLoading, isFetching } = useQuery({
    queryKey: qk.pesananDaftar(paramDaftar),
    queryFn: () => endpoints.daftarPesanan(paramDaftar),
    placeholderData: (prev) => prev,
  })

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
    mutationFn: () => endpoints.sinkronPesananOtomatis(true),
    onSuccess: (data) => {
      if (!data.aktif) toast.info('Sinkron Shopee belum diaktifkan di server.')
      else toast.success(`Disegarkan — ${data.jumlah_baru} baru, ${data.jumlah_diperbarui} diperbarui`)
      qc.invalidateQueries({ queryKey: ['pesanan'] })
      qc.invalidateQueries({ queryKey: ['pesanan-sinkron'] })
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  const prosesMassalMut = useMutation({
    mutationFn: async (ids: string[]) => {
      // The server caps one call at 25 orders and each order costs several Shopee calls: go in small chunks.
      let berhasil = 0
      const gagal: { id_eksternal: string | null; pesan: string | null }[] = []
      for (const batch of pecahBatch(ids, 10)) {
        const res = await endpoints.prosesMassalPesanan(batch)
        berhasil += res.berhasil
        gagal.push(...res.hasil.filter((h) => !h.ok))
      }
      return { berhasil, gagal }
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

  const cetakMut = useMutation({
    mutationFn: async ({ grup, tipe, tab }: { grup: Pesanan[][]; tipe: TemplateResi; tab: (Window | null)[] }) => {
      // The tabs were opened inside the click (popup blockers); each is filled when its PDF arrives.
      let berhasil = 0
      const gagal: string[] = []
      for (const [i, pesanan] of grup.entries()) {
        try {
          const pdf = await endpoints.unduhResiMassal(pesanan.map((p) => p.id), tipe)
          const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }))
          if (tab[i]) tab[i]!.location.href = url
          else window.open(url, '_blank')
          berhasil += pesanan.length
        } catch (e) {
          tab[i]?.close()
          gagal.push(getApiError(e, 'Resi belum siap atau server lambat, coba lagi sebentar.'))
        }
      }
      return { berhasil, gagal }
    },
    onSuccess: ({ berhasil, gagal }) => {
      qc.invalidateQueries({ queryKey: ['pesanan'] })
      if (gagal.length === 0) toast.success(`${berhasil} resi dibuka`)
      else toast.warning(`${berhasil} resi dibuka, ${gagal.length} kelompok gagal`, { description: gagal.slice(0, 2).join('\n') })
    },
    onError: (e) => toast.error(getApiError(e)),
  })

  /** Label of one order from its row button. */
  function cetakSatu(p: Pesanan) {
    cetakMut.mutate({ grup: [[p]], tipe: 'THERMAL_AIR_WAYBILL', tab: [window.open('', '_blank')] })
  }

  const semuaKolom = kolomPesanan({ namaToko: (id) => (id ? (akunMap.get(id)?.nama_toko ?? '—') : '—') })
  const kolom = useKolomTersimpan('pesanan.kolom', semuaKolom)

  // Selectable: orders that still need processing, or are processed and waiting for the courier (label).
  const items = daftar?.items ?? []
  const bisaDipilih = (p: Pesanan) => bisaDiproses(p) || bisaDicetak(p)
  // "Pilih semua" skips labels that were already printed (reprinting is a deliberate, per-order choice).
  const bisaDipilihSemua = items.filter((p) => bisaDipilih(p) && !sudahDicetak(p))
  const dipilih = pilih.daftar.filter(bisaDipilih)
  const idProses = dipilih.filter(bisaDiproses).map((p) => p.id)
  const dicetak = dipilih.filter(bisaDicetak)
  const totalHalaman = daftar ? Math.max(1, Math.ceil(daftar.total / daftar.per_halaman)) : 1
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
    const grup = kelompokResi(dicetak)
    cetakMut.mutate({ grup, tipe, tab: grup.map(() => window.open('', '_blank')) })
  }

  async function prosesTerpilih() {
    const ok = await confirm({
      title: `Proses ${idProses.length} pesanan di Shopee?`,
      description: 'Pengiriman setiap pesanan akan diatur di Shopee (kurir pickup). Ini tidak bisa dibatalkan dari sini.',
    })
    if (ok) prosesMassalMut.mutate(idProses)
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
      <BarHalaman judul="Pesanan" deskripsi={labelSinkron()}>
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
          nilai={f.nilai.tahap}
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
          aksi={(p) => <AksiPesanan p={p} onCetak={cetakSatu} cetakSibuk={cetakMut.isPending} />}
          minWidth={900}
        />
      )}

      {daftar && daftar.total > 0 && (
        <div className="space-y-2">
          <p className="teks-data text-center text-muted-foreground" aria-live="polite">
            {(f.halaman - 1) * PER_HALAMAN + 1}–{Math.min(f.halaman * PER_HALAMAN, daftar.total)} dari {daftar.total} pesanan
            {isFetching && !isLoading ? ' · memuat…' : ''}
          </p>
          <Paginasi halaman={f.halaman} totalHalaman={totalHalaman} onUbah={f.setHalaman} nama="Halaman pesanan" />
        </div>
      )}

      <BarPilihan jumlah={dipilih.length} satuan="pesanan" onBatal={pilih.kosongkan} sibuk={prosesMassalMut.isPending || cetakMut.isPending}>
        {idProses.length > 0 && (
          <Button onClick={prosesTerpilih} disabled={prosesMassalMut.isPending}>
            {prosesMassalMut.isPending ? 'Memproses…' : `Proses (${idProses.length})`}
          </Button>
        )}
        {dicetak.length > 0 && (
          <>
            <Button variant="outline" onClick={() => cetakTerpilih('THERMAL_AIR_WAYBILL')} disabled={cetakMut.isPending}>
              {cetakMut.isPending ? 'Menyiapkan resi…' : `Cetak resi A6 (${dicetak.length})`}
            </Button>
            <Button variant="ghost" onClick={() => cetakTerpilih('NORMAL_AIR_WAYBILL')} disabled={cetakMut.isPending}>
              A4
            </Button>
          </>
        )}
      </BarPilihan>

      <FormPesananManual open={formBuka} onOpenChange={setFormBuka} akunList={akunList ?? []} />
    </div>
  )
}
