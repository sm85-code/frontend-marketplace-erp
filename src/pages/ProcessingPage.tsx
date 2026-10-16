import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getProcessingData, importProcessingData } from '@/api/processing'
import { fmtDateTime, getApiError } from '@/api/client'
import { useAuth } from '@/lib/auth'
import { readProcessingCapsule } from '@/lib/processingImport'
import { BarHalaman } from '@/components/daftar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProcessingPrices from './ProcessingPrices'
import ProcessingParties from './ProcessingParties'
import ProcessingWorkflow from './ProcessingWorkflow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Spinner from '@/components/Spinner'

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
    <div className="processing-page min-w-0 space-y-4 text-left [&_p]:text-left">
      <BarHalaman judul="Processing" deskripsi="Kelola pesanan dari produksi hingga siap kirim." />
      <Tabs defaultValue={privateKey ? 'data' : 'pemetaan'} className="min-w-0">
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
                {data.source_url ? (
                  <a className="underline" href={data.source_url} target="_blank" rel="noreferrer">
                    {data.source_title}
                  </a>
                ) : (
                  <span>{data.source_title}</span>
                )}{' '}
                · Dibaca {fmtDateTime(data.read_at)}
              </p>
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
          <Tabs defaultValue="produksi" className="min-w-0">
            <TabsList className="section-tabs">
              <TabsTrigger value="produksi">Harga Produksi</TabsTrigger>
              <TabsTrigger value="cat">Harga Pengecatan</TabsTrigger>
              <TabsTrigger value="tukang">Tukang Kayu</TabsTrigger>
              <TabsTrigger value="supplier">Supplier</TabsTrigger>
            </TabsList>
            <TabsContent value="produksi">
              <ProcessingPrices kind="produksi" />
            </TabsContent>
            <TabsContent value="cat">
              <ProcessingPrices kind="pengecatan" />
            </TabsContent>
            <TabsContent value="tukang">
              <ProcessingParties kind="tukang" items={data?.tukang || []} />
            </TabsContent>
            <TabsContent value="supplier">
              <ProcessingParties kind="supplier" items={data?.supplier || []} />
            </TabsContent>
          </Tabs>
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
