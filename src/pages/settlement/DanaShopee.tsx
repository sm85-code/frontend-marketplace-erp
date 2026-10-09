import QueryError from '@/components/QueryError'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { fmtRp, getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import {
  BarFilter,
  FilterAksi,
  FilterCari,
  FilterPilih,
  FilterTanggal,
  Medan,
  Paginasi,
  PanelProgres,
  PemilihKolom,
  TabelData,
  TabelLokal,
} from '@/components/daftar'
import Spinner from '@/components/Spinner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TableCell, TableRow } from '@/components/ui/table'
import { useFilterDaftar } from '@/lib/filterDaftar'
import { useKolomTersimpan } from '@/lib/kolom'
import { rentangTanggal, type PresetTanggal } from '@/lib/rentang'
import { opsiUrutan, teksKeUrut, ubahUrut, urutKeTeks } from '@/lib/urut'
import { kolomRingkasanToko, kolomSettlementPesanan } from './kolom'

const PER_HALAMAN = 10
/** A shop with a big backlog is pulled again by itself, up to this many times in one go. */
const MAKS_PUTARAN = 8
const AWAL = { toko: '', q: '', tanggal: '30', dari: '', sampai: '', urut: 'dirilis:desc' }
const PRESET: PresetTanggal[] = ['semua', 'hari_ini', '7', '30', '90', 'bulan_ini', 'kustom']
const HARI_SINKRON = [
  { value: '7', label: '7 hari terakhir' },
  { value: '15', label: '15 hari terakhir' },
  { value: '30', label: '30 hari terakhir' },
  { value: '60', label: '60 hari terakhir' },
  { value: '90', label: '90 hari terakhir' },
]
const potong = (v: string) => fmtRp(-Math.abs(Number(v)))

/** Money Shopee released, pulled by the ERP itself: totals per shop, then one row per order. */
export default function DanaShopee() {
  const qc = useQueryClient()
  const f = useFilterDaftar(AWAL)
  const [hariSinkron, setHariSinkron] = useState('15')

  const { data: akunList, error: akunError, refetch: retryAkun } = useQuery({ queryKey: qk.akun(), queryFn: () => endpoints.listAkun() })
  const tokoShopee = (akunList ?? []).filter((a) => a.platform === 'shopee' && a.id_toko_eksternal)

  const { dari, sampai } = rentangTanggal(f.nilai.tanggal as PresetTanggal, { dari: f.nilai.dari, sampai: f.nilai.sampai })
  const kriteria = { q: f.nilai.q || undefined, dari, sampai }
  const { data: ringkasan, isLoading: ringkasanMuat, error: ringkasanError, refetch: retryRingkasan } = useQuery({
    queryKey: qk.settlementRingkasan(kriteria),
    queryFn: () => endpoints.ringkasanSettlementPesanan(kriteria),
    placeholderData: (prev) => prev,
  })
  const paramDaftar = { ...kriteria, akun_id: f.nilai.toko || undefined, urut: f.nilai.urut, halaman: f.halaman, per_halaman: PER_HALAMAN }
  const { data: daftar, isLoading, isFetching, error: daftarError, refetch: retryDaftar } = useQuery({
    queryKey: qk.settlementPesanan(paramDaftar),
    queryFn: () => endpoints.daftarSettlementPesanan(paramDaftar),
    placeholderData: (prev) => prev,
  })

  // Progress of the pull: one shop after another, each shop repeated while Shopee still has orders waiting.
  const [progres, setProgres] = useState<{ selesai: number; total: number; keterangan: string; mulai: number } | null>(null)
  const berhenti = useRef(false)
  const sinkronMut = useMutation({
    mutationFn: async () => {
      berhenti.current = false
      const mulai = Date.now()
      let baru = 0
      let sisa = 0
      let totalSisa = 0
      const gagal: string[] = []
      for (const [i, t] of tokoShopee.entries()) {
        sisa = 0
        if (berhenti.current) break
        let putaran = 0
        for (;;) {
          putaran += 1
          setProgres({
            selesai: i,
            total: tokoShopee.length,
            mulai,
            keterangan: `Toko ${i + 1} dari ${tokoShopee.length}: ${t.nama_toko}${putaran > 1 ? ` (lanjutan ${putaran})` : ''} · ${baru} pesanan baru sejauh ini`,
          })
          try {
            const h = await endpoints.syncSettlementAkun(t.id, Number(hariSinkron))
            baru += h.baru
            sisa = h.sisa
            qc.invalidateQueries({ queryKey: ['settlement-pesanan'] }) // the tables fill up while it runs
          } catch (e) {
            gagal.push(`${t.nama_toko}: ${getApiError(e)}`)
            sisa = 0
          }
          if (sisa === 0 || berhenti.current || putaran >= MAKS_PUTARAN) break
        }
        totalSisa += sisa
      }
      return { baru, sisa: totalSisa, gagal, dihentikan: berhenti.current }
    },
    onSuccess: ({ baru, sisa, gagal, dihentikan }) => {
      qc.invalidateQueries({ queryKey: ['settlement-pesanan'] })
      const ringkas = `${baru} pesanan baru${dihentikan ? ' (dihentikan)' : ''}${sisa > 0 ? `, masih ada ${sisa} — tekan Sinkronisasi lagi` : ''}`
      if (gagal.length === 0) toast.success(`Sinkronisasi dana cair selesai: ${ringkas}`)
      else toast.warning(`Sinkronisasi dana cair: ${ringkas}; ${gagal.length} toko gagal`, { description: gagal.slice(0, 3).join('\n') })
    },
    onError: (e) => toast.error(getApiError(e)),
    onSettled: () => setProgres(null),
  })

  const semuaKolom = kolomSettlementPesanan()
  const kolom = useKolomTersimpan('settlement.kolom', semuaKolom)
  const urutSekarang = teksKeUrut(f.nilai.urut)
  const totalHalaman = Math.max(1, Math.ceil((daftar?.total ?? 0) / PER_HALAMAN))
  const total = ringkasan?.total

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dana Cair dari Shopee</CardTitle>
        <p className="teks-data text-muted-foreground">
          Dihitung per pesanan dari data Shopee: penjualan, potongan, dan dana yang benar-benar cair. Tanggal mengikuti tanggal dana cair.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <BarFilter
          aktif={f.jumlahAktif - (f.nilai.q ? 1 : 0)}
          utama={<FilterCari id="dana-cari" placeholder="No. pesanan" nilai={f.nilai.q} onUbah={(q) => f.ubah({ q })} />}
        >
          <FilterPilih
            id="dana-toko"
            label="Toko"
            nilai={f.nilai.toko}
            onUbah={(toko) => f.ubah({ toko })}
            semua={`Semua toko (${ringkasan?.toko.length ?? '…'})`}
            opsi={(ringkasan?.toko ?? []).map((t) => ({ value: t.akun_id, label: `${t.nama_toko} (${t.pesanan})` }))}
          />
          <FilterTanggal
            id="dana-tanggal"
            label="Tanggal cair"
            presets={PRESET}
            nilai={{ tanggal: f.nilai.tanggal as PresetTanggal, dari: f.nilai.dari, sampai: f.nilai.sampai }}
            onUbah={f.ubah}
          />
          <FilterPilih id="dana-urut" label="Urutan" nilai={f.nilai.urut} onUbah={(urut) => f.ubah({ urut })} opsi={opsiUrutan(semuaKolom)} />
          <Medan>
            <PemilihKolom semua={semuaKolom} tampil={kolom.tampil} onUbah={kolom.ubah} onReset={kolom.reset} />
          </Medan>
          <FilterPilih id="dana-hari" label="Sinkronisasi dari Shopee" nilai={hariSinkron} onUbah={setHariSinkron} opsi={HARI_SINKRON} />
          <FilterAksi>
            <Button onClick={() => sinkronMut.mutate()} disabled={sinkronMut.isPending || tokoShopee.length === 0}>
              {sinkronMut.isPending ? 'Sedang sinkronisasi…' : 'Sinkronisasi sekarang'}
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

        {progres && (
          <PanelProgres
            judul="Sinkronisasi dana cair dari Shopee"
            selesai={progres.selesai}
            total={progres.total}
            keterangan={progres.keterangan}
            mulai={progres.mulai}
            onBatal={() => {
              berhenti.current = true
            }}
          />
        )}

        {akunError && <QueryError error={akunError} retry={retryAkun} />}
        {ringkasanError ? <QueryError error={ringkasanError} retry={retryRingkasan} /> : akunError ? null : ringkasanMuat ? (
          <Spinner column label="Memuat dana cair…" />
        ) : (ringkasan?.toko.length ?? 0) === 0 ? (
          <div className="space-y-2 rounded-lg border p-8 text-center text-muted-foreground">
            <p>Belum ada dana cair pada periode ini.</p>
            <p className="teks-kecil">
              {tokoShopee.length === 0 ? 'Hubungkan toko Shopee dulu di menu Kelola Toko.' : 'Pilih jumlah hari lalu tekan “Sinkronisasi sekarang”.'}
            </p>
          </div>
        ) : (
          <>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Ringkasan per toko</h3>
              <TabelLokal
                label="Ringkasan dana cair per toko"
                items={ringkasan?.toko}
                kolom={kolomRingkasanToko()}
                idDari={(t) => t.akun_id}
                namaDari={(t) => t.nama_toko}
                urutAwal={{ kunci: 'cair', arah: 'desc' }}
                minWidth={760}
                footer={
                  total && (
                    <TableRow>
                      <TableCell className="font-semibold">Total</TableCell>
                      <TableCell className="text-right font-semibold">{total.pesanan}</TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">{fmtRp(total.penjualan)}</TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">{potong(total.komisi)}</TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">{potong(total.layanan)}</TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">{fmtRp(total.ongkir)}</TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">{fmtRp(total.jumlah_cair)}</TableCell>
                      <TableCell />
                    </TableRow>
                  )
                }
              />
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Rincian per pesanan</h3>
              {daftarError ? <QueryError error={daftarError} retry={retryDaftar} /> : isLoading ? (
                <Spinner column label="Memuat rincian…" />
              ) : (
                <TabelData
                  label="Rincian dana cair per pesanan"
                  items={daftar?.items ?? []}
                  kolom={semuaKolom.filter((k) => kolom.tampil.includes(k.kunci))}
                  idDari={(r) => r.id}
                  namaDari={(r) => `pesanan ${r.order_sn}`}
                  urut={urutSekarang}
                  onUrut={(kunci, arahAwal) => f.ubah({ urut: urutKeTeks(ubahUrut(urutSekarang, kunci, arahAwal)) })}
                  minWidth={900}
                />
              )}
              {daftar && daftar.total > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="teks-data text-center text-muted-foreground" aria-live="polite">
                    {(f.halaman - 1) * PER_HALAMAN + 1}–{Math.min(f.halaman * PER_HALAMAN, daftar.total)} dari {daftar.total} pesanan
                    {isFetching && !isLoading ? ' · memuat…' : ''}
                  </p>
                  <Paginasi halaman={f.halaman} totalHalaman={totalHalaman} onUbah={f.setHalaman} nama="Halaman dana cair" />
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
