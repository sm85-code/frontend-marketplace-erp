import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getProcessingData, importProcessingData } from '@/api/processing'
import { getApiError } from '@/api/client'
import { useAuth } from '@/lib/auth'
import { readProcessingCapsule } from '@/lib/processingImport'
import { BarHalaman } from '@/components/daftar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SupplierCatalogPanel from './SupplierCatalogPanel'
import ProcessingPrices from './ProcessingPrices'
import ProcessingParties from './ProcessingParties'
import ProcessingWorkflow from './ProcessingWorkflow'
import { Button } from '@/components/ui/button'
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
      toast.success('Data Processing sudah tersimpan')
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
      .catch((err) => setError(getApiError(err, 'Data Processing belum dapat dimuat. Coba kembali.')))
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
          {busy && <Spinner label="Menyimpan data Processing…" />}
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
          <Tabs defaultValue="kayu" className="min-w-0">
            <div className="max-w-full overflow-x-auto"><TabsList className="section-tabs flex-nowrap">
              <TabsTrigger value="kayu">Produk Kayu</TabsTrigger>
              <TabsTrigger value="non-kayu">Produk Non Kayu</TabsTrigger>
              <TabsTrigger value="cat">Pengecatan</TabsTrigger>
              <TabsTrigger value="packing">Packing</TabsTrigger>
            </TabsList></div>
            <TabsContent value="kayu" className="space-y-4">
              <Tabs defaultValue="katalog-kayu" className="min-w-0">
                <TabsList><TabsTrigger value="katalog-kayu">Katalog Produk</TabsTrigger><TabsTrigger value="tukang">Tukang Kayu</TabsTrigger></TabsList>
                <TabsContent value="katalog-kayu"><ProcessingPrices kind="produksi" /></TabsContent>
                <TabsContent value="tukang"><ProcessingParties kind="tukang" items={data?.tukang || []} /></TabsContent>
              </Tabs>
            </TabsContent>
            <TabsContent value="non-kayu" className="space-y-4">
              <Tabs defaultValue="supplier" className="min-w-0">
                <div className="max-w-full overflow-x-auto"><TabsList><TabsTrigger value="supplier">Supplier</TabsTrigger><TabsTrigger value="otomatis">Katalog Otomatis</TabsTrigger><TabsTrigger value="manual">Katalog Manual</TabsTrigger></TabsList></div>
                <TabsContent value="supplier"><ProcessingParties kind="supplier" items={data?.supplier || []} /></TabsContent>
                <TabsContent value="otomatis"><SupplierCatalogPanel /></TabsContent>
                <TabsContent value="manual"><ProcessingPrices kind="non_kayu" /></TabsContent>
              </Tabs>
            </TabsContent>
            <TabsContent value="cat"><ProcessingPrices kind="pengecatan" /></TabsContent>
            <TabsContent value="packing"><ProcessingPrices kind="packing" /></TabsContent>
          </Tabs>
        </TabsContent>
        <TabsContent value="pemetaan" className="min-w-0">
          <ProcessingWorkflow catalog={data} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
