import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getProcessingData, importProcessingData, type ProcessingParty } from '@/api/processing'
import { fmtDateTime, getApiError } from '@/api/client'
import { useAuth } from '@/lib/auth'
import { readProcessingCapsule } from '@/lib/processingImport'
import { BarHalaman, TabelLokal, type KolomTabel } from '@/components/daftar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProcessingPrices from './ProcessingPrices'
import ProcessingWorkflow from './ProcessingWorkflow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Spinner from '@/components/Spinner'

const includes = (values: unknown[], search: string) =>
  values.join(' ').toLocaleLowerCase('id-ID').includes(search.trim().toLocaleLowerCase('id-ID'))
const partyColumns: KolomTabel<ProcessingParty>[] = [
  { kunci: 'nama', judul: 'Nama', tetap: true, nilai: (r) => r.nama, sel: (r) => r.nama },
  { kunci: 'catatan', judul: 'Keterangan', sel: (r) => r.catatan || '—' },
  { kunci: 'sumber', judul: 'Baris sumber', sel: (r) => r.sumber },
]
function PartyTable({ title, items }: { title: string; items: ProcessingParty[] }) {
  const [search, setSearch] = useState('')
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>
          {title} <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          aria-label={`Cari ${title}`}
          placeholder="Cari nama atau keterangan"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <TabelLokal
          label={title}
          items={items.filter((r) => includes([r.nama, r.catatan], search))}
          kolom={partyColumns}
          idDari={(r) => r.id}
          namaDari={(r) => r.nama}
          minWidth={560}
        />
      </CardContent>
    </Card>
  )
}
export default function ProcessingPage() {
  const { user } = useAuth()
  const allowed = user?.role === 'admin'
  const location = useLocation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const started = useRef<string | null>(null)
  const privateKey = new URLSearchParams(location.hash.slice(1)).get('import')
  const q = useQuery({ queryKey: ['processing-data'], queryFn: getProcessingData, enabled: allowed })
  const save = useCallback(
    async (payload: unknown) => {
      await importProcessingData(payload)
      await qc.invalidateQueries({ queryKey: ['processing-data'] })
      toast.success('Data Processing dari Drive sudah tersimpan')
      navigate('/processing', { replace: true })
    },
    [qc, navigate],
  )
  useEffect(() => {
    if (!allowed || !privateKey || started.current === privateKey) return
    started.current = privateKey
    setBusy(true)
    void readProcessingCapsule(privateKey)
      .then(save)
      .catch((err) =>
        setError(
          getApiError(err, 'Data Drive belum dapat dimuat. Buka kembali tautan impor yang diberikan.'),
        ),
      )
      .finally(() => setBusy(false))
    // Only an admin opening the explicit private import link triggers this one-time import.
  }, [allowed, privateKey, save])
  if (!allowed) return <p role="alert">Processing hanya dapat diakses admin.</p>
  const data = q.data?.data
  return (
    <div className="min-w-0 space-y-4">
      <BarHalaman judul="Processing" deskripsi="Produksi, pengecatan, dan packing pesanan internal." />
      <Tabs defaultValue="data" className="min-w-0">
        <TabsList className="section-tabs">
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="pemetaan">Pemetaan Order</TabsTrigger>
        </TabsList>
        <TabsContent value="data" className="min-w-0 space-y-4">
          {busy && <Spinner label="Memasukkan data referensi dari Google Drive…" />}
          {error && <p role="alert">{error}</p>}
          {q.isLoading && <Spinner label="Memuat data Processing…" />}
          {q.error && (
            <div role="alert">
              {getApiError(q.error)}
              <Button variant="outline" onClick={() => void q.refetch()}>
                Coba lagi
              </Button>
            </div>
          )}
          {data && (
            <>
              <p className="text-sm text-muted-foreground">
                Sumber:{' '}
                <a className="underline" href={data.source_url} target="_blank" rel="noreferrer">
                  {data.source_title}
                </a>{' '}
                · Dibaca {fmtDateTime(data.read_at)}
              </p>
              <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
                <PartyTable title="Daftar Tukang Kayu" items={data.tukang} />
                <PartyTable title="Supplier" items={data.supplier} />
              </div>
            </>
          )}
          {!q.isLoading && !data && !busy && (
            <Card>
              <CardHeader>
                <CardTitle>Data referensi belum dimuat</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  Buka tautan impor Processing yang sudah disiapkan untuk memuat data Drive tanpa mengetik
                  ulang.
                </p>
              </CardContent>
            </Card>
          )}
          <ProcessingPrices />
          <details>
            <summary className="cursor-pointer text-sm font-medium">Impor berkas data Drive</summary>
            <div className="pt-3">
              <Input
                type="file"
                accept=".json,application/json"
                aria-label="Berkas data Processing"
                disabled={busy}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setBusy(true)
                  setError('')
                  try {
                    if (file.size > 2_000_000) throw new Error('Berkas maksimal 2 MB')
                    await save(JSON.parse(await file.text()))
                  } catch (err) {
                    setError(getApiError(err))
                  } finally {
                    setBusy(false)
                  }
                }}
              />
              <p className="pt-2 text-xs text-muted-foreground">
                Impor tidak menimpa data yang sudah tersimpan.
              </p>
            </div>
          </details>
        </TabsContent>
        <TabsContent value="pemetaan" className="min-w-0">
          <ProcessingWorkflow catalog={data} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
