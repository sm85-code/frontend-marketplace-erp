import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import * as endpoints from '@/api/endpoints'
import { fmtRp, getApiError } from '@/api/client'
import { qk } from '@/api/keys'
import {
  BarFilter,
  FilterAksi,
  FilterPilih,
  FilterTanggal,
  Medan,
  PanelProgres,
  Paginasi,
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
import { keTanggal, rentangTanggal, type PresetTanggal } from '@/lib/rentang'
import { opsiUrutan, teksKeUrut, ubahUrut, urutKeTeks } from '@/lib/urut'
import { kali, kolomIklanHarian, kolomRingkasanIklan, persen } from './kolom'

const PER_HALAMAN = 50
const AWAL = { toko: '', tanggal: '30', dari: '', sampai: '', urut: 'tanggal:desc' }
const PRESET: PresetTanggal[] = ['semua', 'hari_ini', '7', '30', '90', 'bulan_ini', 'kustom']
const HARI_SINKRON = [
  { value: '7', label: '7 hari terakhir' },
  { value: '30', label: '30 hari terakhir' },
  { value: '60', label: '60 hari terakhir' },
  { value: '90', label: '90 hari terakhir' },
  { value: '180', label: '180 hari (batas Shopee)' },
]

/** Shopee Ads performance pulled by the ERP itself: totals per shop with the ads balance, then one row per day. */
export default function PerformaShopee() {
  const qc = useQueryClient()
  const f = useFilterDaftar(AWAL)
  const [hariSinkron, setHariSinkron] = useState('30')

  const { data: akunList } = useQuery({ queryKey: qk.akun(), queryFn: () => endpoints.listAkun() })
  const tokoShopee = (akunList ?? []).filter((a) => a.platform === 'shopee' && a.id_toko_eksternal)

  const { dari, sampai } = rentangTanggal(f.nilai.tanggal as PresetTanggal, { dari: f.nilai.dari, sampai: f.nilai.sampai })
  const kriteria = { dari: keTanggal(dari), sampai: keTanggal(sampai) }
  const { data: ringkasan, isLoading: ringkasanMuat } = useQuery({
    queryKey: qk.iklanRingkasan(kriteria),
    queryFn: () => endpoints.ringkasanIklanToko(kriteria),
    placeholderData: (prev) => prev,
  })
  const paramDaftar = { ...kriteria, akun_id: f.nilai.toko || undefined, urut: f.nilai.urut, halaman: f.halaman, per_halaman: PER_HALAMAN }
  const { data: daftar, isLoading, isFetching } = useQuery({
    queryKey: qk.iklanHarianToko(paramDaftar),
    queryFn: () => endpoints.daftarIklanHarianToko(paramDaftar),
    placeholderData: (prev) => prev,
  })

  const [progres, setProgres] = useState<{ selesai: number; total: number; keterangan: string; mulai: number } | null>(null)
  const berhenti = useRef(false)
  const sinkronMut = useMutation({
    mutationFn: async () => {
      berhenti.current = false
      const mulai = Date.now()
      let hari = 0
      const gagal: string[] = []
      for (const [i, t] of tokoShopee.entries()) {
        if (berhenti.current) break
        setProgres({
          selesai: i,
          total: tokoShopee.length,
          mulai,
          keterangan: `Toko ${i + 1} dari ${tokoShopee.length}: ${t.nama_toko} · ${hari} hari data sejauh ini`,
        })
        try {
          const h = await endpoints.syncIklanAkun(t.id, Number(hariSinkron))
          hari += h.hari
          qc.invalidateQueries({ queryKey: ['iklan-toko'] }) // the tables fill up while it runs
        } catch (e) {
          gagal.push(`${t.nama_toko}: ${getApiError(e)}`)
        }
      }
      return { hari, gagal, dihentikan: berhenti.current }
    },
    onSuccess: ({ hari, gagal, dihentikan }) => {
      qc.invalidateQueries({ queryKey: ['iklan-toko'] })
      const ringkas = `${hari} hari data iklan${dihentikan ? ' (dihentikan)' : ''}`
      if (gagal.length === 0) toast.success(`Sinkronisasi iklan selesai: ${ringkas}`)
      else toast.warning(`Sinkronisasi iklan: ${ringkas}; ${gagal.length} toko gagal`, { description: gagal.slice(0, 3).join('\n') })
    },
    onError: (e) => toast.error(getApiError(e)),
    onSettled: () => setProgres(null),
  })

  const semuaKolom = kolomIklanHarian()
  const kolom = useKolomTersimpan('iklan.kolom', semuaKolom)
  const urutSekarang = teksKeUrut(f.nilai.urut)
  const totalHalaman = Math.max(1, Math.ceil((daftar?.total ?? 0) / PER_HALAMAN))
  const total = ringkasan?.total

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performa Iklan Shopee</CardTitle>
        <p className="teks-data text-muted-foreground">
          Diambil dari Shopee Ads per toko dan per hari. Pesanan, GMV, dan ROAS dihitung dari klik iklan dalam 7 hari (angka terkini bisa
          berubah di hari-hari berikutnya).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <BarFilter aktif={f.jumlahAktif}>
          <FilterPilih
            id="iklan-toko-filter"
            label="Toko"
            nilai={f.nilai.toko}
            onUbah={(toko) => f.ubah({ toko })}
            semua={`Semua toko (${tokoShopee.length})`}
            opsi={tokoShopee.map((t) => ({ value: t.id, label: t.nama_toko }))}
          />
          <FilterTanggal
            id="iklan-tanggal"
            label="Tanggal"
            presets={PRESET}
            nilai={{ tanggal: f.nilai.tanggal as PresetTanggal, dari: f.nilai.dari, sampai: f.nilai.sampai }}
            onUbah={f.ubah}
          />
          <FilterPilih id="iklan-urut" label="Urutan" nilai={f.nilai.urut} onUbah={(urut) => f.ubah({ urut })} opsi={opsiUrutan(semuaKolom)} />
          <Medan>
            <PemilihKolom semua={semuaKolom} tampil={kolom.tampil} onUbah={kolom.ubah} onReset={kolom.reset} />
          </Medan>
          <FilterPilih id="iklan-hari" label="Sinkronisasi dari Shopee" nilai={hariSinkron} onUbah={setHariSinkron} opsi={HARI_SINKRON} />
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
            judul="Sinkronisasi iklan dari Shopee"
            selesai={progres.selesai}
            total={progres.total}
            keterangan={progres.keterangan}
            mulai={progres.mulai}
            onBatal={() => {
              berhenti.current = true
            }}
          />
        )}

        {ringkasanMuat ? (
          <Spinner column label="Memuat performa iklan…" />
        ) : (ringkasan?.toko.length ?? 0) === 0 ? (
          <div className="space-y-2 rounded-lg border p-8 text-center text-muted-foreground">
            <p>Belum ada data iklan Shopee pada periode ini.</p>
            <p className="teks-kecil">
              {tokoShopee.length === 0
                ? 'Hubungkan toko Shopee dulu di menu Toko.'
                : 'Pilih jumlah hari lalu tekan “Sinkronisasi sekarang”. Toko tanpa Shopee Ads tidak akan punya data.'}
            </p>
          </div>
        ) : (
          <>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Ringkasan per toko</h3>
              <TabelLokal
                label="Ringkasan performa iklan per toko"
                items={ringkasan?.toko}
                kolom={kolomRingkasanIklan()}
                idDari={(t) => t.akun_id}
                namaDari={(t) => t.nama_toko}
                urutAwal={{ kunci: 'biaya', arah: 'desc' }}
                minWidth={820}
                footer={
                  total && (
                    <TableRow>
                      <TableCell className="font-semibold">Total</TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">{fmtRp(total.expense)}</TableCell>
                      <TableCell className="text-right font-semibold">{total.impression.toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-right font-semibold">{total.clicks.toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-right font-semibold">{persen(total.ctr)}</TableCell>
                      <TableCell className="text-right font-semibold">{total.direct_order.toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">{fmtRp(total.direct_gmv)}</TableCell>
                      <TableCell className="text-right font-semibold">{kali(total.roas_langsung)}</TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">{fmtRp(total.saldo)}</TableCell>
                    </TableRow>
                  )
                }
              />
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Rincian per hari</h3>
              {isLoading ? (
                <Spinner column label="Memuat rincian…" />
              ) : (
                <TabelData
                  label="Rincian performa iklan per toko per hari"
                  items={daftar?.items ?? []}
                  kolom={semuaKolom.filter((k) => kolom.tampil.includes(k.kunci))}
                  idDari={(r) => r.id}
                  namaDari={(r) => `${r.nama_toko ?? 'toko'} ${r.tanggal}`}
                  urut={urutSekarang}
                  onUrut={(kunci, arahAwal) => f.ubah({ urut: urutKeTeks(ubahUrut(urutSekarang, kunci, arahAwal)) })}
                  minWidth={900}
                />
              )}
              {daftar && daftar.total > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="teks-data text-center text-muted-foreground" aria-live="polite">
                    {(f.halaman - 1) * PER_HALAMAN + 1}–{Math.min(f.halaman * PER_HALAMAN, daftar.total)} dari {daftar.total} baris
                    {isFetching && !isLoading ? ' · memuat…' : ''}
                  </p>
                  <Paginasi halaman={f.halaman} totalHalaman={totalHalaman} onUbah={f.setHalaman} nama="Halaman performa iklan" />
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
